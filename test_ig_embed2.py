import yt_dlp
import re
ydl_opts = {'quiet': True}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        html = ydl.urlopen('https://www.instagram.com/p/DZXcPrTN35C/embed/').read().decode('utf-8')
        img = re.search(r'class="EmbeddedMediaImage"[^>]*src="([^"]+)"', html)
        if not img:
            img = re.search(r'<img[^>]+src="([^"]+)"[^>]*class="EmbeddedMediaImage', html)
        if img:
            print('Found Image:', img.group(1).replace('&amp;', '&'))
        else:
            print('No Image found in embed. Here is part of it:')
            print(html[3000:4000])
    except Exception as e:
        print('Error:', e)
