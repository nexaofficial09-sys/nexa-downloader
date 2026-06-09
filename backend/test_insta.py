import instaloader
import sys

L = instaloader.Instaloader(quiet=True)
url = sys.argv[1] if len(sys.argv) > 1 else "https://www.instagram.com/p/DYWUOsUzTTj/"

try:
    # extract shortcode from URL
    shortcode = url.split("/p/")[1].split("/")[0]
    post = instaloader.Post.from_shortcode(L.context, shortcode)
    print("Is Video?", post.is_video)
    print("Caption:", post.caption)
    
    images = []
    if post.typename == 'GraphSidecar':
        for idx, node in enumerate(post.get_sidecar_nodes()):
            images.append(node.display_url)
    else:
        images.append(post.url)
        
    for i, img in enumerate(images):
        print(f"Image {i+1}: {img}")

except Exception as e:
    print(f"Error: {e}")
