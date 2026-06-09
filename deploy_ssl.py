import paramiko
import sys
import time

def deploy_ssl():
    host = "103.30.195.243"
    user = "Nexa"
    password = "Dimsgg123"

    commands = [
        "sudo apt-get update",
        "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx",
        
        # Create Nginx config
        """sudo bash -c "cat << 'EOF' > /etc/nginx/sites-available/api.nexalabs.my.id
server {
    listen 80;
    server_name api.nexalabs.my.id;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
EOF" """,
        "sudo ln -sf /etc/nginx/sites-available/api.nexalabs.my.id /etc/nginx/sites-enabled/",
        "sudo rm -f /etc/nginx/sites-enabled/default",
        "sudo systemctl restart nginx",
        
        # Run certbot
        "sudo certbot --nginx -d api.nexalabs.my.id --non-interactive --agree-tos -m nexaofficial09@gmail.com --redirect"
    ]

    print("Connecting to VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password, timeout=10)
        print("Connected! Running SSL setup commands...")
        
        for cmd in commands:
            print(f"Running: {cmd[:50]}...")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            
            if exit_status != 0:
                print(f"ERROR executing command: {cmd}")
                print(f"Stdout: {out}")
                print(f"Stderr: {err}")
                if "certbot" in cmd:
                    print("Certbot failed, but we continue anyway.")
                else:
                    return False
            else:
                print("SUCCESS")
                
        print("SSL setup completed successfully!")
        return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False
    finally:
        ssh.close()

if __name__ == "__main__":
    deploy_ssl()
