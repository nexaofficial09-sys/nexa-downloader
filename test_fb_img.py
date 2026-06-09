import re

try:
    with open('fb_dump.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    print("Total img tags:", len(re.findall(r'<img[^>]+>', html)))
    srcs = re.findall(r'<img[^>]+src="([^"]+)"', html)
    for i, s in enumerate(srcs[:15]):
        print(f"IMG {i+1}: {s}")
except Exception as e:
    print(e)
