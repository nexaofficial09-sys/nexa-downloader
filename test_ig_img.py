import yt_dlp
import re
ydl_opts = {'quiet': True}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        html = ydl.urlopen('https://www.instagram.com/p/DZXcPrTN35C/').read().decode('utf-8')
        img = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        if img:
            print('Found OG Image:', img.group(1))
        else:
            print('No OG image found. Login required?')
            if 'Login • Instagram' in html: print('Blocked by login wall')
    except Exception as e:
        print('Error:', e)
