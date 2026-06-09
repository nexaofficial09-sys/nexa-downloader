import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('103.30.195.243', username='Nexa', password='Dimsgg123')
cmd = """python3 -c "
import requests
headers = {
    'origin': 'https://snapinsta.app',
    'referer': 'https://snapinsta.app/',
    'user-agent': 'Mozilla/5.0'
}
data = {'url': 'https://www.instagram.com/p/DZXcPrTN35C/', 'action': 'post'}
try:
    r = requests.post('https://app.snapinsta.app/action.php', headers=headers, data=data, timeout=10)
    print(r.status_code)
    print(r.text[:500])
except Exception as e:
    print('Error:', e)
" """
stdin, stdout, stderr = ssh.exec_command(cmd)
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
