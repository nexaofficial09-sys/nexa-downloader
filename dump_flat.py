import yt_dlp
import json

url = "https://www.instagram.com/p/DBh8wN6SMtQ/" # Example image post
ydl_opts = {
    "quiet": True,
    "skip_download": True,
    "extract_flat": True, # This might prevent "No video in this post" error
}
try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        print("Success!")
        print("Entries:", len(info.get("entries", [])))
        print("Thumbnails:", len(info.get("thumbnails", [])))
except Exception as e:
    print(f"Error: {e}")
