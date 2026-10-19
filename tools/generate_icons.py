from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"
FONT = Path(r"C:\Windows\Fonts\COOPBL.TTF")

PINK = "#F8C8D1"
ROSE = "#C9183A"
MASTER_SIZE = 4096


def render_master(maskable: bool = False) -> Image.Image:
    """Render once at 4096 px so every exported size has the same smooth edges."""
    image = Image.new("RGB", (MASTER_SIZE, MASTER_SIZE), PINK)
    draw = ImageDraw.Draw(image)
    font_size = int(MASTER_SIZE * (0.58 if maskable else 0.70))
    font = ImageFont.truetype(str(FONT), font_size)
    box = draw.textbbox((0, 0), "C", font=font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    x = (MASTER_SIZE - width) / 2 - box[0] - MASTER_SIZE * 0.015
    y = (MASTER_SIZE - height) / 2 - box[1] - MASTER_SIZE * 0.015
    draw.text((x, y), "C", font=font, fill=ROSE)
    return image


def save_icon(master: Image.Image, size: int, filename: str) -> None:
    icon = master.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(ICONS / filename, optimize=True, compress_level=9)


ICONS.mkdir(parents=True, exist_ok=True)
regular = render_master()
maskable = render_master(maskable=True)

save_icon(regular, 64, "favicon-pink-hd-64.png")
save_icon(regular, 180, "apple-touch-icon-pink-hd.png")
save_icon(regular, 192, "icon-pink-hd-192.png")
save_icon(regular, 512, "icon-pink-hd-512.png")
save_icon(regular, 1024, "icon-pink-hd-1024.png")
save_icon(maskable, 512, "icon-pink-hd-maskable-512.png")
