import requests
import json
import ssl
import urllib.request

try:
    headers = {'Accept': 'application/dns-json'}
    r = requests.get('https://1.1.1.1/dns-query?name=instances.cobalt.tools&type=A', headers=headers)
    ip = None
    for ans in r.json().get('Answer', []):
        if ans['type'] == 1:
            ip = ans['data']
            break
            
    if not ip:
        print("Failed to get IP")
        exit()
        
    req = urllib.request.Request(f'https://{ip}/instances.json', headers={'Host': 'instances.cobalt.tools', 'User-Agent': 'curl'})
    ctx = ssl._create_unverified_context()
    resp = urllib.request.urlopen(req, context=ctx).read().decode()
    data = json.loads(resp)
    online = [d['api'] for d in data if d.get('api_online') and d.get('trust') > 0]
    print("Online instances:", online)
except Exception as e:
    print("Error:", e)
