#!/bin/bash
set -e

echo "Starting NEXA Backend Deployment..."

# 1. Prevent interactive prompts
export DEBIAN_FRONTEND=noninteractive

# 2. Update and Install Dependencies
echo "Installing dependencies..."
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv ffmpeg git

# 3. Setup Virtual Environment
echo "Setting up Python environment..."
cd /home/ubuntu/nexa-downloader/backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

# 4. Create Systemd Service
echo "Configuring background service..."
cat << 'EOF' | sudo tee /etc/systemd/system/nexa.service
[Unit]
Description=Nexa Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/nexa-downloader/backend
ExecStart=/home/ubuntu/nexa-downloader/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 5. Start the Service
sudo systemctl daemon-reload
sudo systemctl enable nexa
sudo systemctl restart nexa

echo "====================================="
echo "SUCCESS! NEXA Backend is now running."
echo "====================================="
sudo systemctl status nexa --no-pager
