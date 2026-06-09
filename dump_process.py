import yt_dlp
import json
import sys

url = sys.argv[1] if len(sys.argv) > 1 else "https://www.instagram.com/p/DYWUOsUzTTj/"
ydl_opts = {
    "quiet": True,
}
try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False, process=False)
        print("Success! Title:", info.get("title"))
        print("Thumbnails count:", len(info.get("thumbnails", [])))
        print("Entries count:", len(info.get("entries", [])))
except Exception as e:
    print(f"Error: {e}")
