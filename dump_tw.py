import yt_dlp
import json

ydl_opts = {"quiet": True}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info("https://x.com/gurlsclouds/status/2064005708656570596", download=False)
    
with open("dump.json", "w") as f:
    json.dump(info.get("formats", []), f, indent=2)
