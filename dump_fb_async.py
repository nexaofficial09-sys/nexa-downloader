import httpx
import asyncio
import re

headers = {
    "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Mode": "navigate",
    "Upgrade-Insecure-Requests": "1"
}

async def main():
    try:
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            resp = await client.get('https://web.facebook.com/share/p/18ksb3CgHo/', headers=headers, timeout=15.0)
            html = resp.text
            images = re.findall(r'<meta property="og:image" content="([^"]+)"', html)
            print("Images async:", images)
            print("HTML length:", len(html))
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
