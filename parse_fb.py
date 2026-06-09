import re

with open('fb_dump.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Facebook often embeds data in <script type="application/json"> or similar.
# Let's just find all large images in the text! 
# Look for "image": {"uri": "..."} or similar patterns
# Facebook uses "uri" often in JSON
matches = re.findall(r'"uri"\s*:\s*"([^"]+scontent[^"]+)"', text)
# Decodes unicode escapes
import codecs
urls = set()
for m in matches:
    try:
        decoded = codecs.decode(m.replace('\\/', '/'), 'unicode_escape')
        urls.add(decoded)
    except:
        pass

for i, u in enumerate(urls):
    print(f"{i+1}: {u}")
