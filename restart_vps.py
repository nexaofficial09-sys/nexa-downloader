import paramiko

def restart():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("103.30.195.243", username="Nexa", password="Dimsgg123", timeout=10)
        stdin, stdout, stderr = ssh.exec_command("sudo systemctl restart nexa")
        stdin.write("Dimsgg123\n")
        stdin.flush()
        print(stdout.read().decode())
        print(stderr.read().decode())
    finally:
        ssh.close()

restart()
