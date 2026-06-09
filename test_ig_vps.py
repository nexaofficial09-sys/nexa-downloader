import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('103.30.195.243', username='Nexa', password='Dimsgg123')
cmd = """sudo /root/nexa-downloader/backend/venv/bin/python -c "
import yt_dlp
import re
ydl_opts = {'quiet': True}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        html = ydl.urlopen('https://www.instagram.com/p/DZXcPrTN35C/').read().decode('utf-8')
        img = re.search(r'<meta property=\\"og:image\\" content=\\"([^\\"]+)\\"', html)
        if img:
            print('Found OG Image:', img.group(1))
        else:
            print('No OG image found.')
    except Exception as e:
        print('Error:', e)
" """
stdin, stdout, stderr = ssh.exec_command(cmd)
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
