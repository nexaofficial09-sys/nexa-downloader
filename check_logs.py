import paramiko

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("103.30.195.243", username="Nexa", password="Dimsgg123", timeout=10)
        stdin, stdout, stderr = ssh.exec_command("sudo journalctl -u nexa -n 50 --no-pager")
        stdin.write("Dimsgg123\n")
        stdin.flush()
        print(stdout.read().decode())
        print(stderr.read().decode())
    finally:
        ssh.close()

check()
