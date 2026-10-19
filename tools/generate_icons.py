from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"
FONT = Path(r"C:\Windows\Fonts\COOPBL.TTF")

PINK = "#F8C8D1"
ROSE = "#C9183A"


def render_icon(size: int, maskable: bool = False, compact: bool = False) -> Image.Image:
    """Render each target natively; compact icons use a larger optical letter."""
    image = Image.new("RGB", (size, size), PINK)
    draw = ImageDraw.Draw(image)
    font_ratio = 0.58 if maskable else (0.88 if compact else 0.70)
    font_size = int(size * font_ratio)
    font = ImageFont.truetype(str(FONT), font_size)
    box = draw.textbbox((0, 0), "C", font=font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    x = (size - width) / 2 - box[0] - size * 0.015
    y = (size - height) / 2 - box[1] - size * 0.015
    draw.text((x, y), "C", font=font, fill=ROSE)
    return image


def save_icon(size: int, filename: str, maskable: bool = False, compact: bool = False) -> None:
    icon = render_icon(size, maskable=maskable, compact=compact)
    icon.save(ICONS / filename, optimize=True, compress_level=9)


ICONS.mkdir(parents=True, exist_ok=True)
save_icon(64, "favicon-pink-crisp-64.png", compact=True)
save_icon(180, "apple-touch-icon-pink-hd.png")
save_icon(192, "icon-pink-crisp-192.png", compact=True)
save_icon(512, "icon-pink-hd-512.png")
save_icon(1024, "icon-pink-hd-1024.png")
save_icon(512, "icon-pink-hd-maskable-512.png", maskable=True)
