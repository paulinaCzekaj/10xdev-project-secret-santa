#!/usr/bin/env python3
from PIL import Image, ImageDraw
import os

# Create image
size = 128
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Colors (matching the theme)
primary_red = (220, 38, 38, 255)  # #DC2626
white = (255, 255, 255, 255)

# Background circle (red)
draw.ellipse([0, 0, size, size], fill=primary_red)

# Gift box main body (white)
box_x, box_y, box_w, box_h = 36, 54, 56, 48
draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h], radius=3, fill=white, outline=white, width=2)

# Gift ribbon vertical (red)
draw.rectangle([61, 54, 67, 102], fill=primary_red)

# Gift ribbon horizontal (red)
draw.rectangle([36, 76, 92, 82], fill=primary_red)

# Gift bow - vertical line from box to top
draw.rectangle([61, 26, 67, 54], fill=white)

# Bow loops (circles)
draw.ellipse([42, 32, 58, 48], fill=white)  # Left loop
draw.ellipse([70, 32, 86, 48], fill=white)  # Right loop

# Bow center vertical line (refined)
draw.rectangle([62, 30, 66, 54], fill=white)

# Save as PNG
output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'favicon.png')
img.save(output_path, 'PNG', optimize=True)
print(f'✓ Favicon PNG generated successfully at {output_path}')
