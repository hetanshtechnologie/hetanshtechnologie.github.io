"""Generate simple PNG icons for the Chrome extension.
Run: python generate_icons.py
Requires: Pillow (pip install Pillow)
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    padding = max(1, size // 16)
    radius = max(2, size // 6)

    draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=radius,
        fill=(37, 99, 235, 255)
    )

    font_size = max(8, size // 3)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "JT"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2
    y = (size - th) // 2 - bbox[1]
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)

    img.save(output_path, 'PNG')
    print(f"Created {output_path} ({size}x{size})")

if __name__ == '__main__':
    icon_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icon_dir, exist_ok=True)

    create_icon(16, os.path.join(icon_dir, 'icon16.png'))
    create_icon(48, os.path.join(icon_dir, 'icon48.png'))
    create_icon(128, os.path.join(icon_dir, 'icon128.png'))
    print("Done! Icons created in chrome-extension/icons/")
