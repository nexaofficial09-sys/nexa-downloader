import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('103.30.195.243', username='Nexa', password='Dimsgg123')
cmd = "python3 -c \"import urllib.request; print(urllib.request.urlopen('https://aemt.me/instagram?url=https://www.instagram.com/p/DZXcPrTN35C/').read().decode()[:500])\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
