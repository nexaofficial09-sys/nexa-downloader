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
import collections
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Request
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
# Rate Limiting & Analytics
# ---------------------------------------------------------------------------
import time

RATE_LIMIT_STORE = collections.defaultdict(list)
def check_rate_limit(request: Request, limit: int = 10, window_sec: int = 60):
    ip = getattr(request.client, "host", "127.0.0.1") if request.client else "127.0.0.1"
    now = time.time()
    RATE_LIMIT_STORE[ip] = [t for t in RATE_LIMIT_STORE[ip] if t > now - window_sec]
    if len(RATE_LIMIT_STORE[ip]) >= limit:
        raise HTTPException(status_code=429, detail="Terlalu banyak permintaan. Harap tunggu sebentar.")
    RATE_LIMIT_STORE[ip].append(now)

STATS_FILE = os.path.join(os.path.dirname(__file__), "Statistik.json")

def load_stats():
    if not os.path.exists(STATS_FILE):
        return {"total": 0, "today": 0, "last_date": "", "platforms": {}}
    try:
        import json
        with open(STATS_FILE, "r") as f:
            return json.load(f)
    except:
        return {"total": 0, "today": 0, "last_date": "", "platforms": {}}

def save_stats(stats):
    import json
    with open(STATS_FILE, "w") as f:
        json.dump(stats, f)

def record_download(platform: str):
    from datetime import datetime
    stats = load_stats()
    today = datetime.now().strftime("%Y-%m-%d")
    if stats.get("last_date") != today:
        stats["today"] = 0
        stats["last_date"] = today
    
    stats["total"] += 1
    stats["today"] += 1
    if "platforms" not in stats: stats["platforms"] = {}
    stats["platforms"][platform] = stats["platforms"].get(platform, 0) + 1
    save_stats(stats)

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

_PROXY_LIST = []
_PROXY_LIST_UPDATED = 0

def get_random_proxy():
    """Fetch and return a random free HTTP proxy to bypass Instagram 429 errors."""
    global _PROXY_LIST, _PROXY_LIST_UPDATED
    now = time.time()
    if not _PROXY_LIST or now - _PROXY_LIST_UPDATED > 900:  # Refresh every 15 mins
        try:
            import httpx
            with httpx.Client(timeout=10.0) as client:
                # Use a reliable list of 2000+ free HTTP proxies
                r = client.get("https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt")
                if r.status_code == 200:
                    lines = [p.strip() for p in r.text.split("\n") if p.strip()]
                    if lines:
                        _PROXY_LIST = lines
                        _PROXY_LIST_UPDATED = now
                        logger.info(f"Refreshed free proxy list: {len(_PROXY_LIST)} proxies found.")
        except Exception as e:
            logger.error(f"Failed to refresh proxy list: {e}")
    
    if _PROXY_LIST:
        import random
        return f"http://{random.choice(_PROXY_LIST)}"
    return None

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
        if f.get("vcodec", "none") == "none" and (f.get("acodec", "none") != "none" or f.get("audio_ext", "none") != "none")
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
        
        if vcodec == "none" and f.get("audio_ext", "none") != "none" and acodec == "none":
            acodec = "unknown"
            
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
            if not ex or (ext == "mp4" and ex["ext"] != "mp4") or (f.get("tbr", 0) > ex.get("tbr", 0)):
                video_only_map[height] = fmt_data
                
        # VIDEO + AUDIO (Native)
        if vcodec != "none" and acodec != "none":
            key = f"{height}_{lang}"
            ex = video_audio_map.get(key)
            if not ex or (ext == "mp4" and ex["ext"] != "mp4") or (f.get("tbr", 0) > ex.get("tbr", 0)):
                if lang_label:
                    fmt_data["resolution"] += lang_label
                video_audio_map[key] = fmt_data

    # Now, generate virtual Video+Audio formats for heights that only have Video-Only
    if best_audio_id:
        # Find best audio per language
        best_audio_by_lang = {}
        for a in audio_only_list:
            l = a.get("language") or a.get("format_note") or a.get("format_id", "")
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
    
    # Single image fallback or Video Cover
    if info.get("thumbnails"):
        # Thumbnails are usually sorted by quality in yt-dlp
        best_thumb = info["thumbnails"][-1]
        images.append({
            "id": "cover_image",
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
        srt_format = next((f for f in formats if f.get("ext") == "srt"), None)
        if not srt_format:
            srt_format = next((f for f in formats if f.get("ext") == "vtt"), None)
        if not srt_format and formats:
            srt_format = formats[0]
            
        if srt_format and srt_format.get("url"):
            subs.append({
                "language": lang.upper(),
                "url": srt_format["url"],
                "ext": srt_format.get("ext", "srt"),
                "is_auto": False
            })
            
    # Process auto captions
    auto_subs = info.get("automatic_captions") or {}
    for lang, formats in auto_subs.items():
        # Avoid duplicate languages
        if any(s["language"] == lang.upper() for s in subs):
            continue
            
        srt_format = next((f for f in formats if f.get("ext") == "srt"), None)
        if not srt_format:
            srt_format = next((f for f in formats if f.get("ext") == "vtt"), None)
        if not srt_format and formats:
            srt_format = formats[0]
            
        if srt_format and srt_format.get("url"):
            subs.append({
                "language": f"{lang.upper()} (Auto)",
                "url": srt_format["url"],
                "ext": srt_format.get("ext", "srt"),
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

async def _fallback_rapidapi_instagram(url: str) -> JSONResponse:
    """Fallback using RapidAPI 'Instagram Downloader - Scraper' API."""
    try:
        import httpx
        
        api_url = "https://instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com/scraper"
        headers = {
            "x-rapidapi-key": "612fa09e1emsh99939f18d8db811p155d6djsn9305c94d6c30",
            "x-rapidapi-host": "instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com"
        }
        querystring = {"url": url}

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(api_url, headers=headers, params=querystring, timeout=30.0)
            
        if resp.status_code != 200:
            raise Exception(f"RapidAPI error {resp.status_code}: {resp.text}")
            
        data = resp.json().get("data", [])
        if not data:
            raise Exception("No data returned from RapidAPI")
            
        images = []
        video_audio = []
        
        for idx, item in enumerate(data):
            media_url = item.get("media")
            is_video = item.get("isVideo", False)
            
            if not media_url:
                continue
                
            if is_video:
                video_audio.append({
                    "format_id": f"insta_vid_{idx}",
                    "url": media_url,
                    "ext": "mp4",
                    "height": 1080,
                    "resolution": "HD",
                    "filesize": 0,
                    "vcodec": "unknown",
                    "acodec": "unknown"
                })
            else:
                images.append({
                    "id": f"slide_{idx+1}",
                    "url": media_url,
                    "thumb": item.get("thumb", media_url),
                    "ext": "jpg"
                })
                
        if not images and not video_audio:
            raise Exception("No valid media found in RapidAPI response")
            
        # Determine thumbnail and title
        thumbnail = ""
        if data and data[0].get("thumb"):
            thumbnail = data[0].get("thumb")
        elif images:
            thumbnail = images[0]["url"]
            
        if not images and thumbnail:
            images.append({
                "id": "cover_image",
                "url": thumbnail,
                "ext": "jpg"
            })
            
        is_image_only = len(video_audio) == 0
        
        record_download('instagram')
        
        return JSONResponse(content={
            "success": True,
            "title": "Instagram Post",
            "thumbnail": thumbnail,
            "duration": None,
            "platform": "instagram",
            "original_url": url,
            "needs_proxy": True,
            "is_image_only": is_image_only,
            "formats": {
                "video_audio": video_audio,
                "video_only": [],
                "audio_only": []
            },
            "images": images,
            "subtitles": []
        })

    except Exception as e:
        logger.error("RapidAPI fallback error: %s", e)
        return None


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
        record_download('twitter')

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
            "images": images,
            "subtitles": []
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
        record_download('twitter')

        return JSONResponse(content={
            "success": True,
            "title": title.replace('\n', ' ')[:80],
            "thumbnail": thumbnail or "",
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
            "images": images,
            "subtitles": []
        })
    except Exception as e:
        logger.error("Twitter fallback failed: %s", e)
        return None

async def _fallback_tiktok(url: str):
    """Fallback for TikTok slides when yt-dlp raises No video formats found."""
    try:
        import re, json
        import httpx
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}, timeout=15.0)
            
            tk_images = []
            title = "TikTok Post"
            
            match = re.search(r'id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', resp.text)
            if match:
                data = json.loads(match.group(1))
                scope = data.get("__DEFAULT_SCOPE__", {})
                video_detail = scope.get("webapp.video-detail", {})
                item_info = video_detail.get("itemInfo", {}).get("itemStruct", {})
                title = item_info.get("desc", title)
                if "imagePost" in item_info:
                    tk_images = item_info["imagePost"].get("images", [])
                    
            if not tk_images:
                match2 = re.search(r'id="SIGI_STATE"[^>]*>(.*?)</script>', resp.text)
                if match2:
                    data = json.loads(match2.group(1))
                    if "ItemModule" in data:
                        for item_id, item_data in data["ItemModule"].items():
                            title = item_data.get("desc", title)
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
                
                record_download('tiktok')
                
                return JSONResponse(content={
                    "success": True,
                    "title": title.replace('\n', ' ')[:80],
                    "thumbnail": images[0]["url"] if images else "",
                    "duration": None,
                    "platform": "tiktok",
                    "original_url": url,
                    "needs_proxy": True,
                    "is_image_only": True,
                    "formats": {
                        "video_audio": [],
                        "video_only": [],
                        "audio_only": []
                    },
                    "images": images,
                    "subtitles": []
                })
    except Exception as e:
        logger.error("TikTok manual fallback error: %s", e)
    return None

async def _fallback_instagram_image(url: str) -> Optional[JSONResponse]:
    """Fallback for Instagram image posts using the /embed/ endpoint to bypass 429 and login blocks."""
    try:
        import yt_dlp
        import re
        import html as html_lib
        
        # Ensure url ends with / if it doesn't have query params, or we can just extract the shortcode
        shortcode_match = re.search(r"/(?:p|reel|tv)/([^/?#&]+)", url)
        if not shortcode_match:
            return None
        shortcode = shortcode_match.group(1)
        embed_url = f"https://www.instagram.com/p/{shortcode}/embed/"
        
        def fetch_html():
            ydl_opts = {
                "quiet": True,
                "skip_download": True,
                "no_warnings": True,
                "source_address": "0.0.0.0",
                "js_runtimes": {"deno": {"path": "d:/Web/NEXA Downloader/backend/deno.exe"}},
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    return ydl.urlopen(embed_url).read().decode('utf-8')
                except Exception:
                    # Fallback to standard url if embed fails
                    return ydl.urlopen(url).read().decode('utf-8')
                
        html_content = await asyncio.to_thread(fetch_html)
        
        if "Login • Instagram" in html_content or "login_required" in html_content:
            return None # Blocked by login wall
            
        # Extract image from embed HTML
        img_match = re.search(r'class="EmbeddedMediaImage"[^>]*src="([^"]+)"', html_content)
        if not img_match:
            img_match = re.search(r'<img[^>]+src="([^"]+)"[^>]*class="EmbeddedMediaImage', html_content)
            
        # If embed parsing fails, try standard OpenGraph parsing just in case we fell back to the main URL
        if not img_match:
            img_match = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html_content)
        if not img_match:
            img_match = re.search(r'<meta[^>]*content="([^"]+)"[^>]*property="og:image"', html_content)
            
        if not img_match:
            return None
            
        img_url = html_lib.unescape(img_match.group(1)).replace('&amp;', '&').replace('\\/', '/')
        
        # Extract title (prefer description for captions)
        desc_match = re.search(r'<meta[^>]*property="og:description"[^>]*content="([^"]+)"', html_content)
        title_match = re.search(r'<meta[^>]*property="og:title"[^>]*content="([^"]+)"', html_content)
        
        if desc_match:
            title = html_lib.unescape(desc_match.group(1))
            # Remove "Name on Instagram: " prefix if exists
            title = re.sub(r'^.*?on Instagram: "(.*?)"$', r'\1', title)
        elif title_match:
            title = html_lib.unescape(title_match.group(1))
        else:
            title = "Instagram Post"
            
        title = title.replace('\n', ' ').replace('\r', '')[:80]
        
        images = [{
            "id": "slide_1",
            "url": img_url,
            "ext": "jpg"
        }]

        record_download('instagram')

        return JSONResponse(content={
            "success": True,
            "title": title,
            "thumbnail": img_url,
            "duration": None,
            "platform": "instagram",
            "original_url": url,
            "needs_proxy": True,
            "is_image_only": True,
            "formats": {
                "video_audio": [],
                "video_only": [],
                "audio_only": []
            },
            "images": images,
            "subtitles": []
        })
    except Exception as e:
        logger.error("Instagram OpenGraph fallback error: %s", e)
        return None

async def _fallback_facebook(url: str) -> JSONResponse:
    try:
        # Resolve redirect first
        fb_headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            resp = await client.get(url, headers=fb_headers, timeout=30.0)
            final_url = str(resp.url)
            html_content = resp.text

        # First attempt: Use gallery-dl for high quality photos and carousels
        import subprocess, json, sys
        def run_gdl():
            cmd = [sys.executable, '-m', 'gallery_dl', '-j', final_url]
            if os.path.exists('cookies.txt'):
                cmd.extend(['--cookies', 'cookies.txt'])
            try:
                return subprocess.run(cmd, capture_output=True, text=True)
            except Exception as e:
                logger.warning(f"gallery-dl execution failed: {e}")
                return None
            
        p = await asyncio.to_thread(run_gdl)
        if p and p.returncode == 0 and p.stdout.strip():
            try:
                data = json.loads(p.stdout)
                valid_images = []
                title = "Facebook Post"
                for item in data:
                    if isinstance(item, list) and len(item) >= 3 and item[0] == 3:
                        valid_images.append({
                            "id": f"image_{len(valid_images)+1}",
                            "url": item[1],
                            "ext": "jpg"
                        })
                        if isinstance(item[2], dict) and item[2].get("caption"):
                            title = item[2].get("caption").replace('\n', ' ').strip()[:50]
                
                if valid_images:
                    record_download('facebook')
                    return JSONResponse(content={
                        "success": True,
                        "title": title,
                        "thumbnail": valid_images[0]["url"],
                        "duration": None,
                        "platform": "facebook",
                        "original_url": url,
                        "needs_proxy": True,
                        "is_image_only": True,
                        "formats": {"video_audio": [], "video_only": [], "audio_only": []},
                        "images": valid_images,
                        "subtitles": []
                    })
            except Exception as e:
                logger.error(f"Gallery-dl parsing failed: {e}")

        # Second attempt: Async HTTP GET to extract OpenGraph tags (Fallback)
        def _fetch_og():
            import urllib.request
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Accept-Language": "en-US,en;q=0.5"
            })
            return urllib.request.urlopen(req, timeout=30.0).read().decode(errors='ignore')
            
        html_content = await asyncio.to_thread(_fetch_og)
        
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
        record_download('facebook')

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
            "images": images,
            "subtitles": []
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
async def download(request: Request, url: str = Query(default=None)):
    """Extract metadata, formats, and images."""
    check_rate_limit(request, limit=10, window_sec=60)
    
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="URL is required.")
    url = url.strip()
    
    # yt-dlp doesn't support TikTok /photo/ URLs natively yet, but treating them as /video/ works perfectly
    if "tiktok.com" in url.lower() and "/photo/" in url.lower():
        url = url.replace("/photo/", "/video/")
        
    # Resolve Facebook share links before feeding to yt-dlp
    if "facebook.com/share/" in url.lower() or "fb.watch" in url.lower():
        import httpx
        try:
            with httpx.Client(follow_redirects=True, verify=False, timeout=10.0) as client:
                fb_headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                }
                resp = client.get(url, headers=fb_headers)
                url = str(resp.url)
        except Exception as e:
            logger.warning(f"Failed to resolve FB redirect: {e}")

    # Use proxy for TikTok to bypass IP blocks
    is_tiktok = "tiktok.com" in url.lower()

    # Use fast vxtwitter API for Twitter URLs to bypass yt-dlp blocks and extract multi-image tweets
    if any(domain in url.lower() for domain in ["twitter.com", "x.com", "t.co"]) and "/status/" in url.lower():
        tw_resp = await _fallback_twitter(url)
        if tw_resp:
            return tw_resp

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "socket_timeout": 15,
        "source_address": "0.0.0.0",  # Force IPv4 to prevent severe IPv6 timeout hangs
        "concurrent_fragment_downloads": 10,
        "http_chunk_size": 10485760,

    }
    
    if os.path.exists(os.path.join(os.path.dirname(__file__), "cookies.txt")):
        ydl_opts["cookiefile"] = os.path.join(os.path.dirname(__file__), "cookies.txt")
        logger.info("Using cookies.txt for authentication")

    try:
        def _extract():
            is_ig = "instagram.com" in url.lower()
            max_retries = 3 if is_ig else 1
            last_exc = None
            
            for attempt in range(max_retries):
                opts = dict(ydl_opts)
                # if is_ig:
                #    opts["socket_timeout"] = 5
                #    proxy = get_random_proxy()
                #    if proxy:
                #        opts["proxy"] = proxy
                #        logger.info(f"Using proxy {proxy} for Instagram")
                
                try:
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        return ydl.extract_info(url, download=False)
                except Exception as e:
                    last_exc = e
                    msg = _strip_ansi(str(e)).lower()
                    if is_ig and any(ind in msg for ind in ["429", "too many requests", "unable to download webpage"]):
                        logger.warning(f"Proxy failed or rate limited (Attempt {attempt+1}): {msg}")
                        continue
                    raise # Non-rate-limit error or not IG, so stop retrying
            
            # If all retries failed
            raise last_exc

        info = await asyncio.to_thread(_extract)
    
    except Exception as exc:
        msg = _strip_ansi(str(exc))
        
        if "DRM protected" in msg or "This video is DRM protected" in msg or "This video is not available" in msg or "UNPLAYABLE" in msg:
            raise HTTPException(status_code=400, detail="Video ini dilindungi oleh sistem anti-bot YouTube (BotGuard/SABR) atau hak cipta (DRM), sehingga tidak dapat didownload saat ini.")

        ig_error_indicators = ["no video", "empty media", "not granting access", "429", "too many requests", "unable to download webpage", "login", "requires authentication"]
        if "instagram.com" in url.lower() and any(ind in msg.lower() for ind in ig_error_indicators):
            # Coba jalur fallback (RapidAPI lalu embed) jika semua proxy Gagal
            rap_resp = await _fallback_rapidapi_instagram(url)
            if rap_resp:
                return rap_resp
            
            ig_resp = await _fallback_instagram_image(url)
            if ig_resp:
                return ig_resp
                
            raise HTTPException(
                status_code=422, 
                detail="Gagal mengunduh dari Instagram. (Mungkin link salah atau server API sedang penuh)"
            )
            
        if "tiktok.com" in url.lower() and ("no video" in msg.lower() or "empty media" in msg.lower() or "unsupported url" in msg.lower()):
            tk_resp = await _fallback_tiktok(url)
            if tk_resp:
                return tk_resp
            
        elif any(domain in url.lower() for domain in ["facebook.com", "fb.watch", "fb.com"]):
            fb_resp = await _fallback_facebook(url)
            if fb_resp:
                return fb_resp
            raise HTTPException(
                status_code=422, 
                detail="Konten Facebook ini memerlukan login atau format tidak didukung."
            )
        elif "registered users" in msg.lower() or "login" in msg.lower() or "empty media response" in msg.lower():
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
        if "tiktok" in platform and url and len(images) <= 1:
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    resp = await client.post("https://www.tikwm.com/api/", data={"url": url}, timeout=10.0)
                    js = resp.json()
                    if js.get("code") == 0:
                        tk_images = js.get("data", {}).get("images", [])
                        if tk_images:
                            images = []
                            for idx, img_url in enumerate(tk_images):
                                images.append({
                                    "id": f"slide_{idx+1}",
                                    "url": img_url,
                                    "ext": "jpg"
                                })
            except Exception as e:
                logger.error("TikTok slide fallback error via tikwm: %s", e)

        is_image_only = len(grouped["video_audio"]) == 0 and len(grouped["video_only"]) == 0
        
        # If yt-dlp returned an empty playlist for Instagram, fallback to instaloader
        if is_image_only and not images and "instagram.com" in url.lower():
            rap_resp = await _fallback_rapidapi_instagram(url)
            if rap_resp: return rap_resp
            
            ig_resp = await _fallback_instagram_image(url)
            if ig_resp:
                return ig_resp
            
            raise HTTPException(
                status_code=422,
                detail="Post tidak valid atau format tidak didukung."
            )

        record_download(platform)

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

    task_id = hashlib.md5(f"{url}_{format_id}_{direct_url or ''}_{ext}".encode()).hexdigest()
    
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
            if direct_url and any(x in format_id for x in ["vxtwitter_", "insta_vid", "rapidapi_", "facebook_"]):
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
                    "concurrent_fragment_downloads": 10,
                    "http_chunk_size": 10485760,

                    "progress_hooks": [_progress_hook],
                }
                
                if os.path.exists(os.path.join(os.path.dirname(__file__), "cookies.txt")):
                    ydl_opts["cookiefile"] = os.path.join(os.path.dirname(__file__), "cookies.txt")
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
    preview: bool = Query(default=False),
    crop_portrait: bool = Query(default=False)
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
                resp = await client.get(url, headers=headers, timeout=30.0)
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                from fastapi.responses import JSONResponse
                return JSONResponse(status_code=e.response.status_code, content={"detail": str(e)})
            except Exception as e:
                from fastapi.responses import JSONResponse
                return JSONResponse(status_code=500, content={"detail": str(e)})
            
            content_type = resp.headers.get("Content-Type", "image/jpeg").lower()
            img_data = resp.content
            
            # Convert WebP to JPG/PNG to ensure universal compatibility and handle cropping
            ext = ".jpg"
            if has_pil and ("webp" in content_type or crop_portrait):
                try:
                    img = Image.open(io.BytesIO(img_data))
                    
                    if crop_portrait:
                        w, h = img.size
                        target_ratio = 9 / 16
                        current_ratio = w / h
                        if current_ratio > target_ratio:
                            # Too wide, crop horizontally
                            new_w = int(h * target_ratio)
                            left = (w - new_w) // 2
                            img = img.crop((left, 0, left + new_w, h))
                        elif current_ratio < target_ratio:
                            # Too tall, crop vertically
                            new_h = int(w / target_ratio)
                            top = (h - new_h) // 2
                            img = img.crop((0, top, w, top + new_h))

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
                    logger.error("Failed to process image: %s", e)
                    if "webp" in content_type: ext = ".webp"
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
from dotenv import load_dotenv

load_dotenv()

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

def send_telegram_notification(user_email: str, message: str):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return
        
    text = (
        f"🚨 <b>Laporan Kendala Baru!</b>\n\n"
        f"<b>Dari:</b> {user_email}\n"
        f"<b>Waktu:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        f"<b>Isi Pesan:</b>\n"
        f"{message}\n\n"
        f"<a href='https://api.nexalabs.my.id/api/reports?key=nexaadmin123'>Cek Dashboard Admin</a>"
    )
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.post(url, json=payload)
            res.raise_for_status()
            logger.info("Telegram notification sent successfully.")
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")

@app.post("/api/report")
async def submit_report(req: ReportRequest, background_tasks: BackgroundTasks):
    """Save user report to JSON and send email."""
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
        
        # Kirim notifikasi telegram secara asinkron di belakang layar
        background_tasks.add_task(send_telegram_notification, req.email, req.message)
        
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
    stats = load_stats()
    platform_stats = stats.get('platforms', {})
    tiktok_downloads = platform_stats.get('tiktok', 0)
    ig_downloads = platform_stats.get('instagram', 0)
    yt_downloads = platform_stats.get('youtube', 0)
    tw_downloads = platform_stats.get('twitter', 0)
    fb_downloads = platform_stats.get('facebook', 0)
    
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
        <div class="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-20 bg-white/[0.02] rounded-3xl border border-white/5 glass-dark relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent"></div>
            <div class="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-white/10 relative z-10">
                <svg class="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
            </div>
            <h3 class="text-2xl font-bold text-white mb-2 relative z-10 text-glow">Belum Ada Laporan</h3>
            <p class="text-slate-400 relative z-10">Sistem berjalan dengan baik. Tidak ada keluhan yang masuk.</p>
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
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
            <div id="nav-content" class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    {logo_html}
                    <div>
                        <h1 class="text-2xl font-black text-white tracking-tight text-glow">NEXA ADMIN</h1>
                        <p class="text-xs font-bold text-blue-400 tracking-wider uppercase mt-0.5">Pusat Laporan & Kendala <span id="sync-status" class="ml-2 text-[10px] text-green-400 animate-pulse">(● Live Sync)</span></p>
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

        <div class="max-w-6xl mx-auto px-6 relative z-10 mb-10" id="stats-section">
            <h2 class="text-xl font-bold text-white mb-4">Statistik Penggunaan Platform</h2>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" id="stats-grid">
                
                <!-- Chart Section -->
                <div class="col-span-1 lg:col-span-1 glass-dark border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                    <div class="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-[50px] rounded-full"></div>
                    <h3 class="text-slate-300 font-bold mb-4 text-sm tracking-widest uppercase">Distribusi Unduhan</h3>
                    <div class="relative w-[220px] h-[220px]">
                        <canvas id="platformChart"></canvas>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="col-span-1 lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div class="col-span-2 glass-dark border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="p-1.5 bg-blue-500/20 rounded-md text-blue-400"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></span>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Keseluruhan</p>
                        </div>
                        <p class="text-4xl font-black text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">{stats.get('total', 0)}</p>
                    </div>
                    <div class="col-span-2 sm:col-span-1 glass-dark border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="p-1.5 bg-green-500/20 rounded-md text-green-400"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hari Ini</p>
                        </div>
                        <p class="text-4xl font-black text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">{stats.get('today', 0)}</p>
                    </div>
                    <div class="glass-dark border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:border-pink-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p class="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-pink-400"></span> TikTok</p>
                        <p class="text-3xl font-black text-pink-400 drop-shadow-[0_0_15px_rgba(244,114,182,0.3)]">{tiktok_downloads}</p>
                    </div>
                    <div class="glass-dark border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p class="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-purple-400"></span> Instagram</p>
                        <p class="text-3xl font-black text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">{ig_downloads}</p>
                    </div>
                    <div class="glass-dark border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:border-red-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p class="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span> YouTube</p>
                        <p class="text-3xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">{yt_downloads}</p>
                    </div>
                    <div class="glass-dark border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:border-blue-600/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p class="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-blue-500"></span> Facebook</p>
                        <p class="text-3xl font-black text-blue-500 drop-shadow-[0_0_15px_rgba(37,99,235,0.3)]">{fb_downloads}</p>
                    </div>
                    <div class="glass-dark border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:border-slate-300/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gradient-to-br from-slate-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p class="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-widest flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-300"></span> Twitter/X</p>
                        <p class="text-3xl font-black text-slate-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{tw_downloads}</p>
                    </div>
                </div>
            </div>
        </div>


        <div class="max-w-6xl mx-auto px-6 relative z-10">
            <div id="reports-header" class="mb-8 flex items-center justify-between">
                <h2 class="text-xl font-bold text-white">Daftar Laporan Pengaduan ({len(reports)})</h2>
            </div>
            <div id="reports-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards_html}
            </div>
        </div>

        <script>
            const urlParams = new URLSearchParams(window.location.search);
            const key = urlParams.get('key');

            async function toggleRead(id) {{
                try {{
                    const res = await fetch(`/api/report/${{id}}/read?key=${{key}}`, {{ method: 'PATCH' }});
                    if(res.ok) fetchUpdate();
                }} catch(e) {{
                    alert('Terjadi kesalahan koneksi');
                }}
            }}

            async function deleteReport(id) {{
                if(confirm('Yakin ingin menghapus laporan ini secara permanen?')) {{
                    try {{
                        const res = await fetch(`/api/report/${{id}}?key=${{key}}`, {{ method: 'DELETE' }});
                        if(res.ok) fetchUpdate();
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
                        if(res.ok) fetchUpdate();
                        else alert('Gagal menghapus semua laporan');
                    }} catch(e) {{
                        alert('Terjadi kesalahan koneksi');
                    }}
                }}
            }}

            async function syncData() {{
                try {{
                    const response = await fetch('/api/reports?key=' + key + '&view=true');
                    const text = await response.text();
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, 'text/html');
                    
                    const newReports = doc.getElementById('reports-grid');
                    if (newReports) {{
                        document.getElementById('reports-grid').innerHTML = newReports.innerHTML;
                        
                        document.getElementById('reports-header').innerHTML = doc.getElementById('reports-header').innerHTML;
                        document.getElementById('nav-content').innerHTML = doc.getElementById('nav-content').innerHTML;
                    }}
                    
                    const newStats = doc.getElementById('stats-section');
                    if (newStats) {{
                        document.getElementById('stats-section').innerHTML = newStats.innerHTML;
                        initChart();
                    }}
                    
                }} catch (e) {{
                    console.error('Failed to sync:', e);
                }}
            }}
            
            let myChart = null;
            function initChart() {{
                const ctx = document.getElementById('platformChart');
                if (!ctx) return;
                
                if (myChart) {{
                    myChart.destroy();
                }}
                
                const data = {{
                    labels: ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Twitter/X'],
                    datasets: [{{
                        data: [{tiktok_downloads}, {ig_downloads}, {yt_downloads}, {fb_downloads}, {tw_downloads}],
                        backgroundColor: [
                            'rgba(244, 114, 182, 0.8)',
                            'rgba(168, 85, 247, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(255, 255, 255, 0.8)'
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }}]
                }};

                myChart = new Chart(ctx, {{
                    type: 'doughnut',
                    data: data,
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '75%',
                        plugins: {{
                            legend: {{ 
                                display: true, 
                                position: 'right',
                                labels: {{
                                    color: '#94a3b8',
                                    font: {{ family: 'Inter', size: 10, weight: 'bold' }},
                                    usePointStyle: true,
                                    padding: 15
                                }}
                            }},
                            tooltip: {{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                titleColor: '#fff',
                                bodyColor: '#cbd5e1',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderWidth: 1,
                                padding: 12,
                                cornerRadius: 8,
                                displayColors: true,
                                callbacks: {{
                                    label: function(context) {{
                                        let label = context.label || '';
                                        if (label) label += ': ';
                                        if (context.parsed !== null) label += context.parsed;
                                        return label;
                                    }}
                                }}
                            }}
                        }}
                    }}
                }});
            }}
            
            document.addEventListener('DOMContentLoaded', initChart);
            setInterval(syncData, 5000);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
