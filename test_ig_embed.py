import yt_dlp
import re
ydl_opts = {'quiet': True}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        html = ydl.urlopen('https://www.instagram.com/p/DZXcPrTN35C/embed/').read().decode('utf-8')
        img = re.search(r'"display_url"\s*:\s*"([^"]+)"', html)
        if img:
            print('Found Embed Image:', img.group(1).replace('\\/', '/'))
        else:
            print('No embed image found.')
            print(html[:500])
    except Exception as e:
        print('Error:', e)
