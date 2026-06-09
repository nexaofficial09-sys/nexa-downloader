import paramiko
import sys
import time

def check_ssh(ip, user, password):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"Trying user '{user}'...")
        ssh.connect(ip, username=user, password=password, timeout=10)
        print(f"Success with user '{user}'!")
        
        print("Executing deployment script remotely...")
        stdin, stdout, stderr = ssh.exec_command("wget -qO- https://raw.githubusercontent.com/nexaofficial09-sys/nexa-downloader/main/deploy_server.sh | sudo bash")
        
        while True:
            line = stdout.readline()
            if not line:
                break
            # Use ascii to ignore weird chars like pip progress bars
            safe_line = line.encode('ascii', errors='replace').decode('ascii')
            print(safe_line, end="")
            sys.stdout.flush()
            
        print("Done executing!")
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False
    finally:
        ssh.close()

if __name__ == "__main__":
    ip = "103.30.195.243"
    pwd = "Dimsgg123"
    
    users = ["Nexa"]
    for u in users:
        if check_ssh(ip, u, pwd):
            sys.exit(0)
    print("All attempts failed.")
