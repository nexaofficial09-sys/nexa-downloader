import requests
import json

try:
    headers = {'Accept': 'application/dns-json'}
    r = requests.get('https://1.1.1.1/dns-query?name=ddinstagram.com&type=A', headers=headers)
    print("DoH:", r.json())
except Exception as e:
    print("Error:", e)
