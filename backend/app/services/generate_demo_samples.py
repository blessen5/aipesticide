"""
Demo Image Generator for AgriPrescribe.
Generates realistic demonstration leaf images representing:
- Healthy Leaf (clean chlorophyll green)
- Leaf Blight (dark concentric necrosis lesions)
- Leaf Spot (scattered necrotic spots)
- Powdery Mildew (white fungal mycelium patches)
- Rust (reddish-brown/orange spore pustules)

Images are saved to backend/uploads/sample_leaves/ for SIH 2026 presentations.
"""

import os
from PIL import Image, ImageDraw, ImageFilter
from app.config import settings

def generate_sample_images(output_dir: str = settings.SAMPLE_IMAGES_DIR):
    os.makedirs(output_dir, exist_ok=True)

    # Base leaf dimensions
    w, h = 400, 400

    # 1. Healthy Leaf
    img_healthy = Image.new("RGB", (w, h), color=(34, 150, 40))
    draw = ImageDraw.Draw(img_healthy)
    # Add leaf vein structures
    draw.line([(w // 2, 20), (w // 2, h - 20)], fill=(46, 180, 50), width=4)
    for y in range(60, h - 60, 40):
        draw.line([(w // 2, y), (w // 2 - 120, y - 30)], fill=(40, 165, 45), width=2)
        draw.line([(w // 2, y), (w // 2 + 120, y - 30)], fill=(40, 165, 45), width=2)
    img_healthy.save(os.path.join(output_dir, "healthy_leaf.jpg"), quality=95)

    # 2. Leaf Blight (Concentric dark necrosis lesions)
    img_blight = img_healthy.copy()
    draw = ImageDraw.Draw(img_blight)
    # Draw dark necrotic patches with concentric rings
    for offset_y, offset_x in [(120, 150), (240, 260)]:
        for r in range(45, 10, -8):
            color = (80 - r, 50 - r // 2, 20)
            draw.ellipse([offset_x - r, offset_y - r, offset_x + r, offset_y + r], fill=color)
    img_blight = img_blight.filter(ImageFilter.GaussianBlur(1))
    img_blight.save(os.path.join(output_dir, "leaf_blight.jpg"), quality=95)

    # 3. Leaf Spot (Multiple scattered circular spots)
    img_spot = img_healthy.copy()
    draw = ImageDraw.Draw(img_spot)
    spots = [(100, 120), (140, 220), (220, 140), (280, 200), (180, 300), (260, 310), (310, 110)]
    for x, y in spots:
        draw.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(110, 60, 30))
        draw.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(50, 25, 10))
    img_spot.save(os.path.join(output_dir, "leaf_spot.jpg"), quality=95)

    # 4. Powdery Mildew (White / pale fungal patches)
    img_mildew = img_healthy.copy()
    draw = ImageDraw.Draw(img_mildew)
    # Pale powdery overlay
    for center_x, center_y in [(160, 150), (260, 250), (180, 290)]:
        draw.ellipse([center_x - 50, center_y - 40, center_x + 50, center_y + 40], fill=(225, 235, 225))
    img_mildew = img_mildew.filter(ImageFilter.GaussianBlur(3))
    img_mildew.save(os.path.join(output_dir, "powdery_mildew.jpg"), quality=95)

    # 5. Rust (Reddish-orange / yellow-brown pustules)
    img_rust = img_healthy.copy()
    draw = ImageDraw.Draw(img_rust)
    for y in range(70, 330, 20):
        for x in [140, 160, 230, 250]:
            draw.ellipse([x - 8, y - 5, x + 8, y + 5], fill=(205, 85, 20))
            draw.ellipse([x - 4, y - 2, x + 4, y + 2], fill=(230, 130, 30))
    img_rust = img_rust.filter(ImageFilter.GaussianBlur(1))
    img_rust.save(os.path.join(output_dir, "rust_leaf.jpg"), quality=95)

    return {
        "healthy": os.path.join(output_dir, "healthy_leaf.jpg"),
        "leaf_blight": os.path.join(output_dir, "leaf_blight.jpg"),
        "leaf_spot": os.path.join(output_dir, "leaf_spot.jpg"),
        "powdery_mildew": os.path.join(output_dir, "powdery_mildew.jpg"),
        "rust": os.path.join(output_dir, "rust_leaf.jpg")
    }

if __name__ == "__main__":
    paths = generate_sample_images()
    print("Demo sample images generated successfully:", paths)
