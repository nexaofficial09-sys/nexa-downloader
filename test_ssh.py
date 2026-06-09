import paramiko
import sys

def check_ssh(ip, user, password):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"Trying user '{user}' with password...")
        ssh.connect(ip, username=user, password=password, timeout=10)
        print(f"Success with user '{user}'!")
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False
    finally:
        ssh.close()

if __name__ == "__main__":
    ip = "103.37.124.10"
    pwd = "Nexaserver12345"
    
    users = ["ubuntu", "root", "idcloudhost", "admin"]
    passwords = [pwd]
    
    for u in users:
        for p in passwords:
            if check_ssh(ip, u, p):
                print(f"BINGO! Valid credentials: {u} : {p}")
                sys.exit(0)
    print("All attempts failed.")
