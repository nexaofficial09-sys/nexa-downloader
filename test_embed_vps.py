import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('103.30.195.243', username='Nexa', password='Dimsgg123')
cmd = """python3 -c "
import urllib.request
import re
try:
    req = urllib.request.Request('https://www.instagram.com/p/DZXcPrTN35C/embed/', headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
    r = urllib.request.urlopen(req)
    print(r.status)
    html = r.read().decode('utf-8')
    img = re.search(r'class=\\"EmbeddedMediaImage\\"[^>]*src=\\"([^\\"]+)\\"', html)
    if not img:
        img = re.search(r'<img[^>]+src=\\"([^\\"]+)\\"[^>]*class=\\"EmbeddedMediaImage', html)
    if img: print('Found Image')
    else: print('No image found')
except Exception as e:
    print('Error:', e)
" """
stdin, stdout, stderr = ssh.exec_command(cmd)
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
