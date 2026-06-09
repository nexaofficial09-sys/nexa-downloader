#!/bin/bash
set -e

echo "Starting NEXA Backend Deployment via Cloud-Init..."

# 1. Prevent interactive prompts
export DEBIAN_FRONTEND=noninteractive

# 2. Update and Install Dependencies
sudo apt-get update -y
sudo apt-get install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt-get update -y
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip ffmpeg git

# 3. Setup Virtual Environment in /root
cd /root
if [ ! -d 'nexa-downloader' ]; then
    git clone https://github.com/nexaofficial09-sys/nexa-downloader.git
else
    cd nexa-downloader && git pull && cd ..
fi

cd /root/nexa-downloader/backend
python3.11 -m venv venv
./venv/bin/pip install -r requirements.txt

# 4. Create Systemd Service as Root
cat << 'EOF' | sudo tee /etc/systemd/system/nexa.service
[Unit]
Description=Nexa Backend
After=network.target

[Service]
User=root
WorkingDirectory=/root/nexa-downloader/backend
ExecStart=/root/nexa-downloader/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 5. Start the Service
sudo systemctl daemon-reload
sudo systemctl enable nexa
sudo systemctl restart nexa

echo "SUCCESS! NEXA Backend is now running."
