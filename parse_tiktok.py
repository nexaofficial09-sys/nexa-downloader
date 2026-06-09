import json

with open('tiktok_dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# __UNIVERSAL_DATA_FOR_REHYDRATION__ usually has "__DEFAULT_SCOPE__"
scope = data.get("__DEFAULT_SCOPE__", {})
video_detail = scope.get("webapp.video-detail", {})
item_info = video_detail.get("itemInfo", {}).get("itemStruct", {})

images = []
# Check for image post
if "imagePost" in item_info:
    images = item_info["imagePost"].get("images", [])

print(f"Found {len(images)} images in imagePost")
if images:
    for i, img in enumerate(images):
        print(f"Image {i+1}: {img.get('imageURL', {}).get('urlList', [''])[0]}")
