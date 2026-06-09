import paramiko

def test_smtp():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("103.30.195.243", username="Nexa", password="Dimsgg123", timeout=10)
        # Test port 587 IPv4
        cmd = "python3 -c \"import smtplib; smtplib.SMTP('smtp.gmail.com', 587)\""
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print("Port 587:", stderr.read().decode())
        
        # Test port 465 IPv4
        cmd = "python3 -c \"import smtplib; smtplib.SMTP_SSL('smtp.gmail.com', 465)\""
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print("Port 465:", stderr.read().decode())
    finally:
        ssh.close()

test_smtp()
