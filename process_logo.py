import sys
import os
try:
    from PIL import Image
except ImportError:
    print("PIL not found")
    sys.exit(1)

input_path = r'c:\Users\OSCURIDAD\Desktop\facturacion\public\logo-original.jpg'
output_path = r'c:\Users\OSCURIDAD\Desktop\facturacion\public\logo.png'

if not os.path.exists(input_path):
    print(f"File not found: {input_path}")
    sys.exit(1)

img = Image.open(input_path)
img = img.convert("RGBA")
datas = img.getdata()

newData = []
for item in datas:
    # Remove white background (soft threshold)
    if item[0] > 245 and item[1] > 245 and item[2] > 245:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

# Crop image to logo content
# Find bounding box
def get_bbox(img):
    alpha = img.split()[-1]
    return alpha.getbbox()

img.putdata(newData)
bbox = get_bbox(img)
if bbox:
    img = img.crop(bbox)

img.save(output_path, "PNG")
print(f"Logo saved to {output_path}")
