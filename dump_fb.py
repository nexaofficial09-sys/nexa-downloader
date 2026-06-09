import httpx
import re

url = "https://web.facebook.com/share/p/18yR2ARasz/"
fb_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}
r = httpx.get(url, headers=fb_headers)
open('fb_dump.html', 'w', encoding='utf-8').write(r.text)
print("Saved fb_dump.html")
