import httpx
import re
import json

r = httpx.get('https://www.tiktok.com/@wanitaaaa10/video/7628123945824292104')
match = re.search(r'id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', r.text)
if match:
    open('tiktok_dump.json', 'w', encoding='utf-8').write(match.group(1))
    print("Found!")
else:
    match2 = re.search(r'id="SIGI_STATE"[^>]*>(.*?)</script>', r.text)
    if match2:
        open('tiktok_dump.json', 'w', encoding='utf-8').write(match2.group(1))
        print("Found SIGI!")
    else:
        print("Not found")
