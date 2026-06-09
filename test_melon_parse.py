import re
import html as html_lib

with open('melon.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract title
title_match = re.search(r'<meta[^>]*property="og:title"[^>]*content="([^"]+)"', text)
if not title_match:
    title_match = re.search(r'<title>(.*?)</title>', text)
print("Title:", title_match.group(1).encode('ascii', 'ignore').decode('ascii') if title_match else "No title")

# Extract og:image
img_match = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', text)
if img_match:
    print("og:image:", img_match.group(1))
else:
    # Look for any large jpg
    jpgs = set(re.findall(r'https://[^"\'>\s]+\.jpg', text))
    for j in list(jpgs)[:5]:
        print("JPG:", j)
