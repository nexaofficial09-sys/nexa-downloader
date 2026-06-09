import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('103.30.195.243', username='Nexa', password='Dimsgg123')
cmd = "python3 -c \"import requests; headers={'User-Agent':'Mozilla/5.0'}; data={'q':'https://www.instagram.com/p/DZXcPrTN35C/','t':'media','lang':'en'}; resp=requests.post('https://v3.igdownloader.app/api/ajaxSearch', headers=headers, data=data, timeout=10); print(resp.status_code); print(resp.text[:500])\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
