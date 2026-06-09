"""
NEXA Downloader — Backend API (v3 - Perfection)
FastAPI server that extracts direct video/audio/image download links.
Supports FFmpeg merging for 4K video + audio, and image carousel extraction.
"""

import os
import re
import uuid
import hashlib
import asyncio
import logging
from typing import Optional

import httpx
import yt_dlp
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="NEXA Downloader API",
    description="Ultimate media extractor with server-side FFmpeg merging.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("nexa-downloader")

# Temp directory for downloading and merging 4K videos
TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_downloads")
os.makedirs(TEMP_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Background Auto-Cleanup
# ---------------------------------------------------------------------------
import time
import glob
import threading

def cleanup_temp_files_loop():
    while True:
        try:
            now = time.time()
            # Clean files older than 2 hours (7200 seconds)
            for f in glob.glob(os.path.join(TEMP_DIR, "*")):
                if os.path.isfile(f) and os.stat(f).st_mtime < now - 7200:
                    try:
                        os.remove(f)
                        logger.info("Cleaned up old temp file: %s", f)
                    except Exception as e:
                        logger.error("Failed to clean up %s: %s", f, e)
        except Exception as e:
            logger.error("Cleanup loop error: %s", e)
        time.sleep(3600)  # Check every hour

cleanup_thread = threading.Thread(target=cleanup_temp_files_loop, daemon=True)
cleanup_thread.start()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def _strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", str(text)).strip()


def _human_size(nbytes: int | float) -> str:
    if not nbytes: return ""
    for unit in ("B", "KB", "MB", "GB"):
        if abs(nbytes) < 1024:
            return f"{nbytes:.1f} {unit}" if unit != "B" else f"{int(nbytes)} B"
        nbytes /= 1024
    return f"{nbytes:.1f} TB"


def _cleanup_file(path: str):
    """Background task to delete temporary files after streaming."""
    try:
        if os.path.exists(path):
            os.remove(path)
            logger.info("Deleted temp file: %s", path)
    except Exception as e:
        logger.error("Failed to delete temp file %s: %s", path, e)


def _get_best_audio_id(formats: list[dict]) -> str | None:
    """Find the best audio-only format ID."""
    audio_only = [
        f for f in formats 
        if f.get("vcodec", "none") == "none" and f.get("acodec", "none") != "none"
    ]
    if not audio_only:
        return None
    # Sort by quality/abr
    audio_only.sort(key=lambda x: x.get("abr") or 0, reverse=True)
    return audio_only[0].get("format_id")


def _extract_grouped_formats(info: dict) -> dict:
    """
    Group formats into: video_audio, video_only, audio_only.
    Creates "virtual" merge formats for high-res video-only streams with multiple audio languages.
    """
    raw = info.get("formats") or []
    
    video_audio_map = {}
    video_only_map = {}
    audio_only_list = []
    
    best_audio_id = _get_best_audio_id(raw)

    for f in raw:
        if not f.get("url"): continue
        if "manifest" in f.get("protocol", ""): continue # Skip manifests like DASH/HLS if possible, though yt-dlp usually handles them.

        vcodec = f.get("vcodec", "none")
        acodec = f.get("acodec", "none")
        height = f.get("height") or 0
        ext = f.get("ext", "mp4")
        filesize = f.get("filesize") or f.get("filesize_approx") or 0
        lang = f.get("language") or ""
        format_note = f.get("format_note", "") or ""
        
        # Full language mapping
        lang_name = ""
        if lang:
            code = lang.split("-")[0].lower()
            lang_name = {
                "id": "Indonesia", "en": "English", "es": "Spanyol", "fr": "Prancis",
                "ja": "Jepang", "ko": "Korea", "pt": "Portugis", "ru": "Rusia",
                "de": "Jerman", "hi": "Hindi", "ar": "Arab", "zh": "Mandarin",
                "th": "Thailand", "vi": "Vietnam", "it": "Italia", "tr": "Turki",
                "ms": "Melayu", "tl": "Filipina"
            }.get(code, lang.upper())
            
        lang_label = f" ({lang_name})" if lang_name else ""
        if "original" in format_note.lower() or "default" in format_note.lower():
            lang_label = f" ({lang_name} - Original)" if lang_name else " (Original)"
        elif "dubbed" in format_note.lower():
            lang_label = f" ({lang_name} - Dub)" if lang_name else " (Dub)"
            
        resolution = f"{height}p" if height else "Original"
        
        fmt_data = {
            "format_id": f.get("format_id", ""),
            "url": f["url"],
            "ext": ext,
            "height": height,
            "resolution": resolution,
            "filesize": filesize,
            "filesize_label": _human_size(filesize),
            "vcodec": vcodec,
            "acodec": acodec,
            "language": lang,
            "lang_label": lang_label,
            "needs_merge": False
        }
        
        platform = (info.get("extractor") or info.get("extractor_key") or "").lower()
        
        # X / Twitter Fix: The native .mp4 formats always contain audio, but yt-dlp sometimes tags them as acodec="none"
        if "twitter" in platform and ext == "mp4" and vcodec != "none" and acodec == "none":
            acodec = "mp4a"
            fmt_data["acodec"] = acodec

        # AUDIO ONLY
        if vcodec == "none" and acodec != "none":
            if not height:
                fmt_data["resolution"] = f"Audio{lang_label}"
            audio_only_list.append(fmt_data)
            continue
            
        # VIDEO ONLY
        if vcodec != "none" and acodec == "none":
            # Store best video-only for this height
            ex = video_only_map.get(height)
            if not ex or (ext == "mp4" and ex["ext"] != "mp4") or (f.get("tbr", 0) > f.get("tbr", 0)):
                video_only_map[height] = fmt_data
                
        # VIDEO + AUDIO (Native)
        if vcodec != "none" and acodec != "none":
            key = f"{height}_{lang}"
            ex = video_audio_map.get(key)
            if not ex or (ext == "mp4" and ex["ext"] != "mp4") or (f.get("tbr", 0) > f.get("tbr", 0)):
                if lang_label:
                    fmt_data["resolution"] += lang_label
                video_audio_map[key] = fmt_data

    # Now, generate virtual Video+Audio formats for heights that only have Video-Only
    if best_audio_id:
        # Find best audio per language
        best_audio_by_lang = {}
        for a in audio_only_list:
            l = a["language"]
            if l not in best_audio_by_lang or a["filesize"] > best_audio_by_lang[l]["filesize"]:
                best_audio_by_lang[l] = a
                
        for height, v_fmt in video_only_map.items():
            for l, a_fmt in best_audio_by_lang.items():
                key = f"{height}_{l}"
                if key not in video_audio_map:
                    # Create a virtual format that tells the frontend it needs merging
                    virtual_fmt = dict(v_fmt)
                    virtual_fmt["format_id"] = f"{v_fmt['format_id']}+{a_fmt['format_id']}"
                    virtual_fmt["needs_merge"] = True
                    virtual_fmt["acodec"] = "merged"
                    
                    ll = a_fmt["lang_label"]
                    if not ll and len(best_audio_by_lang) > 1 and l == "en":
                        ll = " (English - Original)"
                        
                    virtual_fmt["resolution"] = f"{height}p{ll}"
                    video_audio_map[key] = virtual_fmt

        # Inject MP3 virtual format for all languages if audio exists!
        for l, a_fmt in best_audio_by_lang.items():
            ll = a_fmt["lang_label"]
            if not ll and len(best_audio_by_lang) > 1 and l == "en":
                ll = " (English - Original)"
                
            audio_only_list.insert(0, {
                "format_id": a_fmt["format_id"],
                "url": "",
                "ext": "mp3",
                "height": 0,
                "resolution": f"Audio MP3{ll}",
                "filesize": 0,
                "filesize_label": "Converted",
                "vcodec": "none",
                "acodec": "mp3",
                "needs_merge": True
            })

    # Sort everything
    def sort_by_height(lst):
        return sorted(lst, key=lambda x: x["height"], reverse=True)
        
    audio_only_list.sort(key=lambda x: x["filesize"], reverse=True)
    
    # Filter unique languages for audio, keep top 2 qualities per language
    final_audio_list = []
    lang_count = {}
    for a in audio_only_list:
        if a["ext"] == "mp3":
            final_audio_list.append(a)
            continue
        l = a["language"]
        lang_count[l] = lang_count.get(l, 0) + 1
        if lang_count[l] <= 2: # Max 2 qualities per language
            final_audio_list.append(a)

    return {
        "video_audio": sort_by_height(list(video_audio_map.values())),
        "video_only": sort_by_height(list(video_only_map.values())),
        "audio_only": final_audio_list[:20]
    }


def _extract_images(info: dict) -> list[dict]:
    """Extract full-res images from carousels or image posts."""
    images = []
    
    # Instagram/TikTok carousels
    if "entries" in info:
        for idx, entry in enumerate(info["entries"]):
            url = entry.get("url")
            if not url and entry.get("thumbnails"):
                # fallback to largest thumbnail
                url = entry["thumbnails"][-1]["url"]
            if url:
                images.append({
                    "id": f"slide_{idx+1}",
                    "url": url,
                    "ext": "jpg"
                })
        return images
    
    # Single image fallback
    if info.get("thumbnails"):
        # Thumbnails are usually sorted by quality in yt-dlp
        best_thumb = info["thumbnails"][-1]
        images.append({
            "id": "image_1",
            "url": best_thumb["url"],
            "ext": "jpg"
        })
        
    return images

def _extract_subtitles(info: dict) -> list[dict]:
    """Extract subtitles and automatic captions into a unified list."""
    subs = []
    
    # Process manual subtitles first
    manual_subs = info.get("subtitles") or {}
    for lang, formats in manual_subs.items():
        vtt_format = next((f for f in formats if f.get("ext") == "vtt"), None)
        if not vtt_format and formats:
            vtt_format = formats[0]
            
        if vtt_format and vtt_format.get("url"):
            subs.append({
                "language": lang.upper(),
                "url": vtt_format["url"],
                "ext": vtt_format.get("ext", "vtt"),
                "is_auto": False
            })
            
    # Process auto captions
    auto_subs = info.get("automatic_captions") or {}
    for lang, formats in auto_subs.items():
        # Avoid duplicate languages
        if any(s["language"] == lang.upper() for s in subs):
            continue
            
        vtt_format = next((f for f in formats if f.get("ext") == "vtt"), None)
        if not vtt_format and formats:
            vtt_format = formats[0]
            
        if vtt_format and vtt_format.get("url"):
            subs.append({
                "language": f"{lang.upper()} (Auto)",
                "url": vtt_format["url"],
                "ext": vtt_format.get("ext", "vtt"),
                "is_auto": True
            })
            
    return subs

# ---------------------------------------------------------------------------
# Subtitle Download Endpoint
# ---------------------------------------------------------------------------
@app.get("/api/start-subtitle")
async def start_subtitle_task(url: str = Query(...), lang: str = Query(...)):
    import glob
    import threading
    
    # We use a unique task ID for subtitles
    task_id = hashlib.md5(f"sub_{url}_{lang}".encode()).hexdigest()
    
    existing_files = [f for f in glob.glob(os.path.join(TEMP_DIR, f"{task_id}*.*")) 
                      if not f.endswith(".part") and not f.endswith(".ytdl")]
                      
    if existing_files:
        merge_tasks_progress[task_id] = {"status": "done", "percent": 100.0}
        return {"task_id": task_id, "status": "done"}

    if task_id in merge_tasks_progress and merge_tasks_progress[task_id]["status"] in ["processing_subtitle"]:
        return {"task_id": task_id, "status": merge_tasks_progress[task_id]["status"]}

    merge_tasks_progress[task_id] = {"status": "processing_subtitle", "percent": 0.0}

    def _download():
        try:
            ydl_opts = {
                'outtmpl': os.path.join(TEMP_DIR, f"{task_id}.%(ext)s"),
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': [lang],
                'subtitlesformat': 'srt/vtt/best',
                'quiet': True,
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            merge_tasks_progress[task_id] = {"status": "done", "percent": 100.0}
        except Exception as e:
            logger.error(f"Subtitle download error: {e}")
            merge_tasks_progress[task_id] = {"status": "error", "percent": 0.0, "error": str(e)}

    threading.Thread(target=_download, daemon=True).start()
    return {"task_id": task_id, "status": "processing_subtitle"}

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

merge_tasks_progress: dict[str, dict] = {}

@app.get("/api/progress/{task_id}")
async def get_progress(task_id: str):
    return merge_tasks_progress.get(task_id, {"status": "not_found"})

@app.get("/")
async def root():
    return {"status": "ok", "service": "NEXA Downloader API v3"}


def _fallback_instaloader(url: str) -> JSONResponse:
    try:
        import instaloader
        L = instaloader.Instaloader(quiet=True)
        
        shortcode_match = re.search(r"/(?:p|reel|tv)/([^/?#&]+)", url)
        if not shortcode_match:
            raise Exception("Shortcode not found")
        
        shortcode = shortcode_match.group(1)
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        
        images = []
        if post.typename == 'GraphSidecar':
            for idx, node in enumerate(post.get_sidecar_nodes()):
                images.append({
                    "id": f"slide_{idx+1}",
                    "url": node.display_url,
                    "ext": "jpg"
                })
        else:
            images.append({
                "id": "image_1",
                "url": post.url,
                "ext": "jpg"
            })

        grouped = {
            "video_audio": [],
            "video_only": [],
            "audio_only": []
        }
        
        if post.is_video and post.video_url:
            grouped["video_audio"].append({
                "format_id": "insta_vid",
                "url": post.video_url,
                "ext": "mp4",
                "height": 1080,
                "resolution": "HD",
                "filesize": 0,
                "filesize_label": "",
                "vcodec": "avc1",
                "acodec": "mp4a",
                "needs_merge": False
            })
        
        is_image_only = len(grouped["video_audio"]) == 0
        
        safe_title = "Instagram Post"
        if post.caption:
            safe_title = post.caption.replace('\n', ' ').replace('\r', '')[:50] + "..."
        
        return JSONResponse(content={
            "success": True,
            "title": safe_title,
            "thumbnail": images[0]["url"] if images else "",
            "duration": None,
            "platform": "instagram",
            "original_url": url,
            "needs_proxy": True,
            "is_image_only": is_image_only,
            "formats": grouped,
            "images": images
        })
    
    except Exception as insta_exc:
        logger.error("Instaloader fallback failed: %s", insta_exc)
        if "login" in str(insta_exc).lower() or "401" in str(insta_exc) or "403" in str(insta_exc) or "login_required" in str(insta_exc).lower():
            raise HTTPException(
                status_code=422, 
                detail="Konten ini memerlukan login / bersifat privat. Akses publik diblokir oleh Instagram."
            )
        raise HTTPException(
            status_code=422, 
            detail="Mohon maaf, postingan ini gagal diproses. URL tidak valid atau diblokir oleh Instagram."
        )

import html as html_lib

async def _fallback_generic_opengraph(url: str, platform: str = "generic") -> JSONResponse:
    """Fallback for any unsupported URL to at least extract the main image via OpenGraph tags."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            resp = await client.get(url, headers=headers, timeout=15.0)
            html_content = resp.text
        
        # Extract title
        title_match = re.search(r'<meta[^>]*property="og:title"[^>]*content="([^"]+)"', html_content)
        if not title_match:
            title_match = re.search(r'<meta[^>]*content="([^"]+)"[^>]*property="og:title"', html_content)
        if not title_match:
            title_match = re.search(r'<title>(.*?)</title>', html_content)
            
        title = title_match.group(1) if title_match else "Extracted Media"
        title = html_lib.unescape(title).replace('\n', ' ').replace('\r', '')[:80]
        
        # Extract image
        img_match = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html_content)
        if not img_match:
            img_match = re.search(r'<meta[^>]*content="([^"]+)"[^>]*property="og:image"', html_content)
            
        if not img_match:
            raise Exception("No og:image found")
            
        img_url = html_lib.unescape(img_match.group(1)).replace('&amp;', '&')
        
        images = [{
            "id": "image_1",
            "url": img_url,
            "ext": "jpg"
        }]

        return JSONResponse(content={
            "success": True,
            "title": title,
            "thumbnail": img_url,
            "duration": None,
            "platform": platform,
            "original_url": url,
            "needs_proxy": True,
            "is_image_only": True,
            "formats": {
                "video_audio": [],
                "video_only": [],
                "audio_only": []
            },
            "images": images
        })
    except Exception as e:
        logger.error("Generic fallback failed: %s", e)
        return None

async def _fallback_twitter(url: str):
    """Fallback for Twitter using vxtwitter API to handle multi-image tweets and bypass yt-dlp blocks."""
    try:
        import re
        match = re.search(r'status/(\d+)', url)
        if not match:
            return None
        tweet_id = match.group(1)
        
        api_url = f"https://api.vxtwitter.com/Twitter/status/{tweet_id}"
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            resp = await client.get(api_url, timeout=15.0)
            if resp.status_code != 200:
                return None
            data = resp.json()
            
        title = data.get("text", "Twitter Post")
        if not title: title = "Twitter Post"
        
        media_extended = data.get("media_extended", [])
        if not media_extended:
            return None
            
        images = []
        video_formats = []
        thumbnail = None
        
        for idx, media in enumerate(media_extended):
            if media.get("type") == "image":
                img_url = media.get("url")
                if img_url:
                    if not thumbnail: thumbnail = img_url
                    images.append({
                        "id": f"image_{idx+1}",
                        "url": img_url,
                        "ext": "jpg"
                    })
            elif media.get("type") in ["video", "gif"]:
                vid_url = media.get("url")
                if vid_url:
                    if not thumbnail: thumbnail = media.get("thumbnail_url") or vid_url
                    video_formats.append({
                        "format_id": f"vxtwitter_{idx+1}",
                        "url": vid_url,
                        "ext": "mp4",
                        "resolution": "Original",
                        "filesize": 0,
                        "filesize_label": "Unknown",
                        "vcodec": "avc",
                        "acodec": "mp4a" if media.get("type") == "video" else "none",
                        "needs_merge": False
                    })
                    
        is_image_only = len(video_formats) == 0
        
        return JSONResponse(content={
            "success": True,
            "title": title,
            "thumbnail": thumbnail,
            "duration": None,
            "platform": "twitter",
            "original_url": url,
            "needs_proxy": True,
            "is_image_only": is_image_only,
            "formats": {
                "video_audio": video_formats,
                "video_only": [],
                "audio_only": []
            },
            "images": images
        })
    except Exception as e:
        logger.error("Twitter fallback failed: %s", e)
        return None

async def _fallback_facebook(url: str) -> JSONResponse:
    try:
        # Async HTTP GET to extract OpenGraph tags without blocking the event loop
        fb_headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            resp = await client.get(url, headers=fb_headers, timeout=60.0)
            html_content = resp.text
        
        # Extract title
        title_match = re.search(r'<meta[^>]*property="og:title"[^>]*content="([^"]+)"', html_content)
        if not title_match:
            title_match = re.search(r'<meta[^>]*content="([^"]+)"[^>]*property="og:title"', html_content)
            
        title = title_match.group(1) if title_match else "Facebook Post"
        title = html_lib.unescape(title).replace('\n', ' ').replace('\r', '')[:50]
        
        # Extract image
        img_match = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html_content)
        if not img_match:
            img_match = re.search(r'<meta[^>]*content="([^"]+)"[^>]*property="og:image"', html_content)
            
        if not img_match:
            logger.error("No og:image found. HTML snippet: %s", html_content[:500])
            raise Exception("No image found in OpenGraph tags")
            
        img_url = html_lib.unescape(img_match.group(1)).replace('&amp;', '&')
        
        images = [{
            "id": "image_1",
            "url": img_url,
            "ext": "jpg"
        }]

        return JSONResponse(content={
            "success": True,
            "title": title,
            "thumbnail": img_url,
            "duration": None,
            "platform": "facebook",
            "original_url": url,
            "needs_proxy": True,
            "is_image_only": True,
            "formats": {
                "video_audio": [],
                "video_only": [],
                "audio_only": []
            },
            "images": images
        })
    except Exception as fb_exc:
        import traceback
        err_msg = str(fb_exc)
        logger.error("Facebook fallback failed: %s\n%s", fb_exc, traceback.format_exc())
        raise HTTPException(
            status_code=422, 
            detail=f"Konten ini benar-benar privat atau diatur 'hanya teman' oleh pemiliknya di Facebook. (Error: {err_msg})"
        )

import tempfile



@app.get("/api/download")
async def download(url: str = Query(default=None)):
    """Extract metadata, formats, and images."""
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="URL is required.")
    url = url.strip()
    
    # yt-dlp doesn't support TikTok /photo/ URLs natively yet, but treating them as /video/ works perfectly
    if "tiktok.com" in url.lower() and "/photo/" in url.lower():
        url = url.replace("/photo/", "/video/")

    # Use fast vxtwitter API for Twitter URLs to bypass yt-dlp blocks and extract multi-image tweets
    if any(domain in url.lower() for domain in ["twitter.com", "x.com", "t.co"]) and "/status/" in url.lower():
        tw_resp = await _fallback_twitter(url)
        if tw_resp:
            return tw_resp

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "socket_timeout": 15,
        "source_address": "0.0.0.0",  # Force IPv4 to prevent severe IPv6 timeout hangs
        "js_runtimes": {"deno": {"path": "d:/Web/NEXA Downloader/backend/deno.exe"}},
    }

    try:
        def _extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
                
        info = await asyncio.to_thread(_extract)
    
    except Exception as exc:
        msg = _strip_ansi(str(exc))
        
        if "DRM protected" in msg or "This video is DRM protected" in msg or "This video is not available" in msg or "UNPLAYABLE" in msg:
            raise HTTPException(status_code=400, detail="Video ini dilindungi oleh sistem anti-bot YouTube (BotGuard/SABR) atau hak cipta (DRM), sehingga tidak dapat didownload saat ini.")

        if "instagram.com" in url.lower() and ("no video" in msg.lower() or "empty media" in msg.lower() or "not granting access" in msg.lower()):
            return _fallback_instaloader(url)
            
        elif "registered users" in msg.lower() or "login" in msg.lower() or "empty media response" in msg.lower():
            if any(domain in url.lower() for domain in ["facebook.com", "fb.watch", "fb.com"]):
                return await _fallback_facebook(url)
            
            raise HTTPException(
                status_code=422, 
                detail="Konten ini memerlukan login / bersifat privat."
            )
            
        else:
            # If yt-dlp completely fails, try a generic OpenGraph fallback
            if "unsupported url" in msg.lower() or "melon" in url.lower():
                platform_name = "ticket" if "ticket" in url else "generic"
                generic_resp = await _fallback_generic_opengraph(url, platform_name)
                if generic_resp:
                    return generic_resp
                    
            logger.exception("Error extracting %s", url)
            raise HTTPException(status_code=500, detail=f"Terjadi kesalahan: {msg}")

    if not info:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan atau akses diblokir oleh platform.")

    try:
        platform = (info.get("extractor") or info.get("extractor_key") or "unknown").lower()
        needs_proxy = any(p in platform for p in ("tiktok", "instagram"))

        grouped = _extract_grouped_formats(info)
        images = _extract_images(info)
        subtitles = _extract_subtitles(info)
        
        # --- CUSTOM TIKTOK SLIDE FALLBACK ---
        if "tiktok" in platform and url:
            try:
                import re, json
                async with httpx.AsyncClient(follow_redirects=True) as client:
                    resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"})
                    
                    tk_images = []
                    
                    # Method 1: UNIVERSAL_DATA
                    match = re.search(r'id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', resp.text)
                    if match:
                        data = json.loads(match.group(1))
                        scope = data.get("__DEFAULT_SCOPE__", {})
                        video_detail = scope.get("webapp.video-detail", {})
                        item_info = video_detail.get("itemInfo", {}).get("itemStruct", {})
                        if "imagePost" in item_info:
                            tk_images = item_info["imagePost"].get("images", [])
                            
                    # Method 2: SIGI_STATE
                    if not tk_images:
                        match2 = re.search(r'id="SIGI_STATE"[^>]*>(.*?)</script>', resp.text)
                        if match2:
                            data = json.loads(match2.group(1))
                            if "ItemModule" in data:
                                for item_id, item_data in data["ItemModule"].items():
                                    if "imagePost" in item_data:
                                        tk_images = item_data["imagePost"].get("images", [])
                                        break

                    if tk_images:
                        images = []
                        for idx, img in enumerate(tk_images):
                            img_url = img.get("imageURL", {}).get("urlList", [""])[0]
                            if img_url:
                                images.append({
                                    "id": f"slide_{idx+1}",
                                    "url": img_url,
                                    "ext": "jpg"
                                })
            except Exception as e:
                logger.error("TikTok fallback error: %s", e)

        is_image_only = len(grouped["video_audio"]) == 0 and len(grouped["video_only"]) == 0
        
        # If yt-dlp returned an empty playlist for Instagram, fallback to instaloader
        if is_image_only and not images and "instagram.com" in url.lower():
            return _fallback_instaloader(url)
            
        if is_image_only and not images:
            raise HTTPException(
                status_code=422,
                detail="Post tidak valid atau format tidak didukung."
            )

        return JSONResponse(content={
            "success": True,
            "title": info.get("title", "Untitled Post"),
            "thumbnail": images[0]["url"] if images else info.get("thumbnail", ""),
            "duration": info.get("duration"),
            "platform": platform,
            "original_url": url,
            "needs_proxy": needs_proxy,
            "is_image_only": is_image_only,
            "formats": grouped,
            "images": images,
            "subtitles": subtitles
        })

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing info for %s", url)
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat memproses data: {str(exc)}")


@app.get("/api/start-merge")
async def start_merge_task(url: str = Query(...), format_id: str = Query(...), direct_url: str = Query(None), ext: str = Query("mp4")):
    """Starts a background task to download and optionally merge formats, or directly download fallbacks."""
    import glob

    task_id = hashlib.md5(f"{url}_{format_id}_{direct_url or ''}".encode()).hexdigest()
    
    # Check if a completed file already exists
    existing_files = [f for f in glob.glob(os.path.join(TEMP_DIR, f"{task_id}.*")) 
                      if not f.endswith(".part") and not f.endswith(".ytdl") and ".temp." not in f]
    
    if existing_files:
        merge_tasks_progress[task_id] = {"status": "done", "percent": 100.0}
        return {"task_id": task_id, "status": "done"}

    # If task is already running
    if task_id in merge_tasks_progress and merge_tasks_progress[task_id]["status"] in ["downloading", "merging"]:
        return {"task_id": task_id, "status": merge_tasks_progress[task_id]["status"]}

    merge_tasks_progress[task_id] = {"status": "downloading", "percent": 0.0}

    def _progress_hook(d):
        if d['status'] == 'downloading':
            p_str = _strip_ansi(d.get('_percent_str', '0%')).replace('%', '').strip()
            try:
                # yt-dlp might download video and audio separately, meaning progress goes 0-100 twice.
                # Here we just reflect whatever it says, or average it if we want, but simple is fine.
                merge_tasks_progress[task_id]["percent"] = float(p_str)
            except ValueError:
                pass
        elif d['status'] == 'finished':
            merge_tasks_progress[task_id]["status"] = "merging"

    def _download():
        try:
            if direct_url and "vxtwitter_" in format_id:
                import httpx
                target_file = os.path.join(TEMP_DIR, f"{task_id}.{ext}")
                with httpx.stream("GET", direct_url, follow_redirects=True, verify=False) as r:
                    r.raise_for_status()
                    total = int(r.headers.get("content-length", 0))
                    downloaded = 0
                    with open(target_file, "wb") as f:
                        for chunk in r.iter_bytes(chunk_size=8192):
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total:
                                merge_tasks_progress[task_id]["percent"] = (downloaded / total) * 100
                merge_tasks_progress[task_id]["status"] = "done"
                merge_tasks_progress[task_id]["percent"] = 100.0
            else:
                out_tmpl = os.path.join(TEMP_DIR, f"{task_id}.%(ext)s")
                ydl_opts = {
                    "quiet": True,
                    "format": format_id,
                    "outtmpl": out_tmpl,
                    "socket_timeout": 15,
                    "source_address": "0.0.0.0",
                    "js_runtimes": {"deno": {"path": "d:/Web/NEXA Downloader/backend/deno.exe"}},
                    "progress_hooks": [_progress_hook],
                }
                if ext == "mp3":
                    ydl_opts["postprocessors"] = [{
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }]
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])
                    
                merge_tasks_progress[task_id]["status"] = "done"
                merge_tasks_progress[task_id]["percent"] = 100.0
        except Exception as e:
            err_msg = str(e)
            logger.error("Background merge error for %s: %s", task_id, err_msg)
            merge_tasks_progress[task_id]["status"] = "error"
            merge_tasks_progress[task_id]["error"] = err_msg

    # Run in background without blocking the HTTP request
    asyncio.create_task(asyncio.to_thread(_download))
    
    return {"task_id": task_id, "status": "downloading"}

@app.get("/api/progress")
async def get_progress(task_id: str = Query(...)):
    """Returns the current progress of a merge task."""
    import glob
    if task_id not in merge_tasks_progress:
        # Check if file exists in case server restarted
        existing_files = [f for f in glob.glob(os.path.join(TEMP_DIR, f"{task_id}.*")) 
                          if not f.endswith(".part") and not f.endswith(".ytdl") and ".temp." not in f]
        if existing_files:
            return {"status": "done", "percent": 100.0}
        raise HTTPException(status_code=404, detail="Task not found")
        
    return merge_tasks_progress[task_id]

@app.get("/api/serve-file")
async def serve_file(
    task_id: str = Query(...),
    filename: str = Query(...)
):
    """Serves the final downloaded/merged file."""
    import glob
    import mimetypes
    safe_name = re.sub(r'[^\w\s\-\.]', '', filename)[:100]
    
    # Find the actual file on disk
    existing_files = [f for f in glob.glob(os.path.join(TEMP_DIR, f"{task_id}.*")) 
                      if not f.endswith(".part") and not f.endswith(".ytdl") and ".temp." not in f]
    
    if not existing_files:
        raise HTTPException(status_code=404, detail="File not ready or not found.")
        
    final_path = existing_files[0]
    
    # Fix the extension dynamically based on the final merged file
    actual_ext = os.path.splitext(final_path)[1]
    base_name = os.path.splitext(safe_name)[0]
    safe_name = f"{base_name}{actual_ext}"
    
    # Guess mime type based on the filename the user wants
    mime_type, _ = mimetypes.guess_type(safe_name)
    if not mime_type:
        mime_type = "video/mp4"

    return FileResponse(
        path=final_path,
        filename=safe_name,
        media_type=mime_type
    )



# ---------------------------------------------------------------------------
# Proxy endpoint — streams media through server for restrictive CDNs
# ---------------------------------------------------------------------------

_PROXY_HEADERS = {
    "User-Agent": yt_dlp.utils.std_headers.get("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
    "Accept": "*/*",
}

_REFERERS: dict[str, str] = {
    "tiktok": "https://www.tiktok.com/",
    "instagram": "https://www.instagram.com/",
}

@app.get("/api/proxy")
async def proxy_download(
    url: str = Query(...),
    filename: str = Query(default="media"),
    platform: str = Query(default=""),
    is_image: bool = Query(default=False),
    preview: bool = Query(default=False)
):
    """Proxy-stream a media file through the server."""
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL.")

    headers = dict(_PROXY_HEADERS)
    referer = _REFERERS.get(platform.lower(), "")
    if referer:
        headers["Referer"] = referer
        headers["Origin"] = referer.rstrip("/")
        
    if platform.lower() == "facebook" or "lookaside.fbsbx.com" in url:
        headers["User-Agent"] = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

    # Remove any newlines or carriage returns that would crash HTTP headers
    clean_filename = filename.replace('\n', ' ').replace('\r', '')
    safe_name = re.sub(r'[^\w\ \-\.]', '', clean_filename)[:120].strip() or "media"
    
    if is_image:
        from fastapi import Response
        import io
        try:
            from PIL import Image
            has_pil = True
        except ImportError:
            has_pil = False
            
        async with httpx.AsyncClient(follow_redirects=True) as client:
            try:
                resp = await client.get(url, headers=headers)
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                from fastapi.responses import JSONResponse
                return JSONResponse(status_code=e.response.status_code, content={"detail": str(e)})
            except Exception as e:
                from fastapi.responses import JSONResponse
                return JSONResponse(status_code=500, content={"detail": str(e)})
            
            content_type = resp.headers.get("Content-Type", "image/jpeg").lower()
            img_data = resp.content
            
            # Convert WebP to JPG/PNG to ensure universal compatibility
            ext = ".jpg"
            if "webp" in content_type and has_pil:
                try:
                    img = Image.open(io.BytesIO(img_data))
                    out_io = io.BytesIO()
                    if img.mode in ("RGBA", "P"):
                        img.save(out_io, format="PNG")
                        content_type = "image/png"
                        ext = ".png"
                    else:
                        img = img.convert("RGB")
                        img.save(out_io, format="JPEG", quality=95)
                        content_type = "image/jpeg"
                        ext = ".jpg"
                    img_data = out_io.getvalue()
                except Exception as e:
                    logger.error("Failed to convert WebP: %s", e)
                    ext = ".webp"
            else:
                if "webp" in content_type: ext = ".webp"
                elif "png" in content_type: ext = ".png"
                elif "gif" in content_type: ext = ".gif"
                else: ext = ".jpg"
            
            # Ensure safe_name has correct extension
            base_name = os.path.splitext(safe_name)[0]
            final_name = f"{base_name}{ext}"
            
            disposition = "inline" if preview else "attachment"
            return Response(
                content=img_data,
                media_type=content_type,
                headers={"Content-Disposition": f'{disposition}; filename="{final_name}"'}
            )

    # For videos/audio, stream it
    async def _stream():
        async with httpx.AsyncClient(follow_redirects=True) as client:
            async with client.stream("GET", url, headers=headers) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=65_536):
                    yield chunk

    disposition = "inline" if preview else "attachment"
    return StreamingResponse(
        _stream(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'{disposition}; filename="{safe_name}"',
            "Cache-Control": "no-cache",
        },
    )

# ---------------------------------------------------------------------------
# Contact Form / Reports Endpoint (Admin Dashboard)
# ---------------------------------------------------------------------------
from pydantic import BaseModel
from datetime import datetime
from fastapi.responses import HTMLResponse
import json
import uuid

class ReportRequest(BaseModel):
    email: str
    message: str

REPORTS_FILE = os.path.join(os.path.dirname(__file__), "Laporan_Kendala.json")

def _load_reports():
    if not os.path.exists(REPORTS_FILE):
        return []
    try:
        with open(REPORTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def _save_reports(reports):
    with open(REPORTS_FILE, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=4)

@app.post("/api/report")
async def submit_report(req: ReportRequest):
    """Save user report to JSON."""
    try:
        reports = _load_reports()
        new_report = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "email": req.email,
            "message": req.message,
            "read": False
        }
        # insert at the beginning
        reports.insert(0, new_report)
        _save_reports(reports)
        return {"status": "success", "message": "Pesan berhasil disimpan"}
    except Exception as e:
        logger.error(f"Failed to save report: {e}")
        raise HTTPException(status_code=500, detail="Gagal menyimpan pesan")

@app.delete("/api/report/{report_id}")
async def delete_report(report_id: str, key: str = Query("")):
    if key != "nexaadmin123":
        raise HTTPException(status_code=403, detail="Akses ditolak")
    reports = _load_reports()
    filtered = [r for r in reports if r.get("id") != report_id]
    _save_reports(filtered)
    return {"status": "success"}

@app.patch("/api/report/{report_id}/read")
async def mark_report_read(report_id: str, key: str = Query("")):
    if key != "nexaadmin123":
        raise HTTPException(status_code=403, detail="Akses ditolak")
    reports = _load_reports()
    for r in reports:
        if r.get("id") == report_id:
            r["read"] = not r.get("read", False)
            break
    _save_reports(reports)
    return {"status": "success"}

@app.delete("/api/reports")
async def delete_all_reports(key: str = Query("")):
    if key != "nexaadmin123":
        raise HTTPException(status_code=403, detail="Akses ditolak")
    _save_reports([])
    return {"status": "success"}

@app.get("/api/reports", response_class=HTMLResponse)
async def view_reports(key: str = Query("")):
    """Beautiful Admin Dashboard for Reports."""
    if key != "nexaadmin123":
        return HTMLResponse(content="<h1 style='color:white; font-family:sans-serif;'>403 Forbidden - Kunci Salah</h1>", status_code=403)
    
    reports = _load_reports()
    
    # Load Logo dynamically
    import base64
    logo_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "logo.png")
    logo_src = ""
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            logo_src = "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")
    
    logo_html = f'<img src="{logo_src}" alt="NEXA Logo" class="w-10 h-10 lg:w-12 lg:h-12 rounded-xl object-cover" />' if logo_src else '<div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">N</div>'
    
    # Generate HTML cards for each report
    cards_html = ""
    unread_count = sum(1 for r in reports if not r.get("read", False))
    
    if not reports:
        cards_html = '''
        <div class="col-span-1 md:col-span-2 text-center py-16 bg-white/[0.03] rounded-3xl border border-white/10 glass-dark">
            <svg class="mx-auto h-16 w-16 text-slate-500 mb-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 class="text-xl font-bold text-white mb-2">Belum Ada Laporan</h3>
            <p class="text-slate-400">Saat ini belum ada pengguna yang mengirimkan kendala.</p>
        </div>
        '''
    else:
        for i, r in enumerate(reports):
            is_read = r.get("read", False)
            read_badge = "" if is_read else '<span class="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse border border-red-400">Baru</span>'
            border_class = "border-white/10" if is_read else "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
            
            # URUTAN label
            urutan = len(reports) - i
            
            import urllib.parse
            body_text = f"Halo Admin NEXA,\\n\\nMenanggapi laporan Anda pada {r.get('timestamp')}:\\n\\n\"{r.get('message')}\"\\n\\nBalasan Kami:\\n"
            mailto_link = f"mailto:{r.get('email')}?subject=Tanggapan Kendala - NEXA Downloader&body={urllib.parse.quote(body_text)}"
            
            cards_html += f'''
            <div class="bg-white/[0.03] rounded-2xl p-6 {border_class} hover:border-blue-500/30 transition-all duration-300 group relative glass-dark hover:-translate-y-1">
                {read_badge}
                <div class="flex justify-between items-start mb-5">
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                <span class="font-black text-sm">#{urutan}</span>
                            </div>
                            <span class="font-bold text-white text-lg">{r.get('email')}</span>
                        </div>
                        <span class="text-xs font-semibold text-slate-400 bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-lg w-max flex items-center gap-2">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {r.get('timestamp')}
                        </span>
                    </div>
                </div>
                
                <div class="bg-black/40 p-5 rounded-xl text-slate-300 text-sm whitespace-pre-wrap leading-relaxed border border-white/[0.05] font-medium mb-5">{r.get('message')}</div>
                
                <div class="flex items-center gap-3 border-t border-white/[0.06] pt-4">
                    <button onclick="toggleRead('{r.get('id')}')" class="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all {'bg-slate-800 text-slate-400 hover:bg-slate-700' if is_read else 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'}">
                        { 
                          '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg> Tandai Belum Dibaca' if is_read else 
                          '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Tandai Sudah Dibaca'
                        }
                    </button>
                    <a href="{mailto_link}" class="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl text-xs font-bold transition-all">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        Balas Email
                    </a>
                    <button onclick="deleteReport('{r.get('id')}')" class="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all" title="Hapus Laporan Ini">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
            '''

    html = f"""
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Dashboard - NEXA</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
            body {{ font-family: 'Inter', sans-serif; background-color: #070b14; color: #f8fafc; }}
            .glass {{ background: rgba(11, 17, 33, 0.7); backdrop-filter: blur(16px); }}
            .glass-dark {{ background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(8px); }}
            .text-glow {{ text-shadow: 0 0 20px rgba(59,130,246,0.5); }}
            .bg-glow {{ position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%); top: -200px; left: 50%; transform: translateX(-50%); z-index: -1; pointer-events: none; }}
        </style>
    </head>
    <body class="min-h-screen pb-20 relative overflow-x-hidden">
        <div class="bg-glow"></div>
        
        <nav class="sticky top-0 z-50 glass border-b border-white/[0.06] px-6 py-4 mb-10 shadow-lg">
            <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    {logo_html}
                    <div>
                        <h1 class="text-2xl font-black text-white tracking-tight text-glow">NEXA ADMIN</h1>
                        <p class="text-xs font-bold text-blue-400 tracking-wider uppercase mt-0.5">Pusat Laporan & Kendala</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl font-bold text-sm text-slate-300">
                        Total: <span class="text-white">{len(reports)}</span> | 
                        Baru: <span class="text-red-400">{unread_count}</span>
                    </div>
                    {f'<button onclick="deleteAll()" class="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:-translate-y-0.5"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Kosongkan Semua Laporan</button>' if reports else ''}
                </div>
            </div>
        </nav>

        <div class="max-w-6xl mx-auto px-6 relative z-10">
            <div class="mb-8 flex items-center justify-between">
                <h2 class="text-xl font-bold text-white">Daftar Laporan ({len(reports)})</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards_html}
            </div>
        </div>

        <script>
            const urlParams = new URLSearchParams(window.location.search);
            const key = urlParams.get('key');

            async function toggleRead(id) {{
                try {{
                    const res = await fetch(`/api/report/${{id}}/read?key=${{key}}`, {{ method: 'PATCH' }});
                    if(res.ok) window.location.reload();
                }} catch(e) {{
                    alert('Terjadi kesalahan koneksi');
                }}
            }}

            async function deleteReport(id) {{
                if(confirm('Yakin ingin menghapus laporan ini secara permanen?')) {{
                    try {{
                        const res = await fetch(`/api/report/${{id}}?key=${{key}}`, {{ method: 'DELETE' }});
                        if(res.ok) window.location.reload();
                        else alert('Gagal menghapus laporan');
                    }} catch(e) {{
                        alert('Terjadi kesalahan koneksi');
                    }}
                }}
            }}

            async function deleteAll() {{
                if(confirm('PERINGATAN KERAS: Yakin ingin menghapus SEMUA laporan? Tindakan ini tidak bisa dibatalkan.')) {{
                    try {{
                        const res = await fetch(`/api/reports?key=${{key}}`, {{ method: 'DELETE' }});
                        if(res.ok) window.location.reload();
                        else alert('Gagal menghapus semua laporan');
                    }} catch(e) {{
                        alert('Terjadi kesalahan koneksi');
                    }}
                }}
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

