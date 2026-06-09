import yt_dlp
import json

url = "https://www.instagram.com/p/C-DXTAJyd1K/" # Note: might fail with empty media. let's find an IG post with image. Or just use a generic config.
ydl_opts = {
    "quiet": True,
    "skip_download": True,
    "ignoreerrors": True,
    "dump_single_json": True,
    "extract_flat": "in_playlist"
}
try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info("https://www.tiktok.com/@example/photo/123", download=False)
        print(info.get('thumbnails', []))
except Exception as e:
    print(f"Error: {e}")
