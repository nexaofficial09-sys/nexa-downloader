import requests
import json

try:
    headers = {'Accept': 'application/dns-json'}
    r = requests.get('https://1.1.1.1/dns-query?name=api.cobalt.tools&type=A', headers=headers)
    print("Cloudflare DoH Response:", r.json())
except Exception as e:
    print("Error:", e)
