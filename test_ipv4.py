import paramiko

def test_ipv4():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("103.30.195.243", username="Nexa", password="Dimsgg123", timeout=10)
        cmd = """python3 -c "
import smtplib
import socket
ip = socket.gethostbyname('smtp.gmail.com')
print('IPv4:', ip)
try:
    s = smtplib.SMTP(ip, 587, timeout=5)
    s.ehlo()
    print('587 OK')
except Exception as e:
    print('587 ERROR:', e)
"
"""
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print("STDOUT:", stdout.read().decode())
        print("STDERR:", stderr.read().decode())
    finally:
        ssh.close()

test_ipv4()
