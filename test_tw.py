import httpx
import asyncio

async def main():
    r = await httpx.AsyncClient().get('https://api.vxtwitter.com/Twitter/status/1765042857418932402')
    print(r.json())

asyncio.run(main())
