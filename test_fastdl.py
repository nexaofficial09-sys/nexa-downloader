import requests
import json
try:
    headers = {
        'origin': 'https://snapinsta.app',
        'referer': 'https://snapinsta.app/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    data = {'url': 'https://www.instagram.com/p/DZXcPrTN35C/', 'action': 'post'}
    r = requests.post('https://snapinsta.app/action.php', headers=headers, data=data, timeout=10)
    print(r.status_code)
    print(r.text[:500])
except Exception as e:
    print('Error:', e)
