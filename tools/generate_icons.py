from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"
FONT = Path(r"C:\Windows\Fonts\COOPBL.TTF")

COLORS = {
    "cream": "#FFF9F8",
    "pink": "#F8C8D1",
    "rose": "#C9183A",
    "outline": "#6B3045",
}


def make_icon(size: int, filename: str, maskable: bool = False) -> None:
    scale = 4
    canvas = size * scale
    image = Image.new("RGB", (canvas, canvas), COLORS["cream"])
    draw = ImageDraw.Draw(image)

    margin_ratio = 0.14 if maskable else 0.055
    margin = int(canvas * margin_ratio)
    outline = max(scale * 2, int(canvas * 0.015))
    bounds = (margin, margin, canvas - margin, canvas - margin)
    draw.ellipse(bounds, fill=COLORS["pink"], outline=COLORS["outline"], width=outline)

    font_size = int(canvas * (0.61 if maskable else 0.70))
    font = ImageFont.truetype(str(FONT), font_size)
    letter = "C"
    box = draw.textbbox((0, 0), letter, font=font, stroke_width=0)
    width = box[2] - box[0]
    height = box[3] - box[1]
    x = (canvas - width) / 2 - box[0] - canvas * 0.015
    y = (canvas - height) / 2 - box[1] - canvas * 0.015
    draw.text((x, y), letter, font=font, fill=COLORS["rose"])

    image = image.resize((size, size), Image.Resampling.LANCZOS)
    image.save(ICONS / filename, optimize=True)


ICONS.mkdir(parents=True, exist_ok=True)
make_icon(32, "favicon-32.png")
make_icon(180, "apple-touch-icon.png")
make_icon(192, "icon-192.png")
make_icon(512, "icon-512.png")
make_icon(512, "icon-maskable-512.png", maskable=True)

