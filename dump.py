import yt_dlp
import sys
import json

url = sys.argv[1] if len(sys.argv) > 1 else "https://www.instagram.com/p/C-000000000/" # placeholder
ydl_opts = {
    "quiet": True,
    "skip_download": True,
    "extract_flat": False,
}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        info = ydl.extract_info(url, download=False)
        # remove formats to make it concise
        if "formats" in info:
            info["formats"] = f"<list of {len(info['formats'])} formats>"
        if "entries" in info:
            for entry in info["entries"]:
                if "formats" in entry:
                    entry["formats"] = f"<list of {len(entry['formats'])} formats>"
        
        print(json.dumps(info, indent=2, default=str)[:2000])
    except Exception as e:
        print(f"Error: {e}")
