import paramiko

def curl_smtp():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("103.30.195.243", username="Nexa", password="Dimsgg123", timeout=10)
        stdin, stdout, stderr = ssh.exec_command("curl -v -4 smtp.gmail.com:587")
        print("CURL 587:", stderr.read().decode())
    finally:
        ssh.close()

curl_smtp()
