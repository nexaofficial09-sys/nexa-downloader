import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('103.30.195.243', username='Nexa', password='Dimsgg123')
stdin, stdout, stderr = ssh.exec_command('sudo journalctl -u nexa.service -n 100 --no-pager')
print('STDOUT:', stdout.read().decode())
