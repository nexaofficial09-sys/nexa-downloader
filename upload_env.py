import paramiko
import sys

def upload_env():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("103.30.195.243", username="Nexa", password="Dimsgg123", timeout=10)
        sftp = ssh.open_sftp()
        try:
            # We must put it in /root/nexa-downloader/backend/ but Nexa might not have permission to write to /root directly.
            # We can put it in /home/Nexa/.env and then run a sudo command to move it.
            sftp.put("backend/.env", "/home/Nexa/.env")
        finally:
            sftp.close()
            
        # Move it to /root/nexa-downloader/backend/ and restart service
        stdin, stdout, stderr = ssh.exec_command("sudo mv /home/Nexa/.env /root/nexa-downloader/backend/.env && sudo chown root:root /root/nexa-downloader/backend/.env && sudo systemctl restart nexa-backend")
        stdin.write("Dimsgg123\n")
        stdin.flush()
        
        print("Stdout:", stdout.read().decode())
        print("Stderr:", stderr.read().decode())
        print("Upload successful!")
    except Exception as e:
        print(f"Failed: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    upload_env()
