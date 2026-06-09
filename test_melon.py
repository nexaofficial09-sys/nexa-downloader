import httpx
import re

r = httpx.get('https://ticket.melon.com/performance/index.htm?prodId=213025', follow_redirects=True)
open('melon.html', 'w', encoding='utf-8').write(r.text)
print("Title:", re.search(r'<title>(.*?)</title>', r.text).group(1))

# Find big images
print("\nImages:")
for m in re.findall(r'<img[^>]+src="([^"]+)"', r.text):
    if "poster" in m.lower() or "prod" in m.lower() or "image" in m.lower() or ".jpg" in m:
        print(m)
