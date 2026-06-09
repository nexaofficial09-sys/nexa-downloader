import socket
import ssl
import json
import urllib.request

def resolve(hostname):
    import subprocess
    out = subprocess.check_output(['nslookup', hostname, '8.8.8.8']).decode()
    for line in out.splitlines():
        if 'Address: ' in line:
            ip = line.split('Address: ')[1].strip()
            if '.' in ip: return ip
    return None

ip = resolve('instances.cobalt.tools')
print('IP:', ip)
if ip:
    req = urllib.request.Request('https://instances.cobalt.tools/instances.json', headers={'Host': 'instances.cobalt.tools', 'User-Agent': 'curl'})
    ctx = ssl._create_unverified_context()
    # Replace URL with IP
    req.full_url = f'https://{ip}/instances.json'
    resp = urllib.request.urlopen(req, context=ctx).read().decode()
    data = json.loads(resp)
    for inst in data:
        if inst.get('api_online'):
            print('Found instance:', inst.get('domain'))
