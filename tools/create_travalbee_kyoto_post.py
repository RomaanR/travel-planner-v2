from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(r"D:/travel-plannner-v2")
BASE = ROOT / "output/social/travalbee-kyoto-after-dark-base.png"
LOGO = ROOT / "public/bee_compass_512_transparent.png"
OUTPUT = ROOT / "output/social/travalbee-kyoto-after-dark.png"

SERIF = Path(r"C:/Windows/Fonts/GARA.TTF")
SANS_BOLD = Path(r"C:/Windows/Fonts/arialbd.ttf")

WIDTH, HEIGHT = 1080, 1350
INK = (7, 27, 42)
CREAM = (245, 240, 232)
ORANGE = (194, 65, 12)
ORANGE_LIGHT = (220, 83, 20)
WHITE = (255, 255, 255)


def tracked_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, tracking: int) -> int:
    widths = [draw.textlength(char, font=font) for char in text]
    return round(sum(widths) + tracking * max(0, len(text) - 1))


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: int,
) -> int:
    x, y = xy
    cursor = float(x)
    for char in text:
        draw.text((cursor, y), char, font=font, fill=fill)
        cursor += draw.textlength(char, font=font) + tracking
    return round(cursor)


def feathered_paper_patch(canvas: Image.Image) -> None:
    """Cover the model-created reference mark with nearby paper texture."""
    patch = canvas.crop((380, 10, 700, 250))
    patch = ImageOps.mirror(patch)
    target_w, target_h = 320, 240
    patch = patch.resize((target_w, target_h), Image.Resampling.LANCZOS)

    mask = Image.new("L", (target_w, target_h), 255)
    px = mask.load()
    for y in range(target_h):
        for x in range(target_w):
            left_alpha = min(255, round(255 * x / 42))
            bottom_alpha = min(255, round(255 * (target_h - 1 - y) / 42))
            px[x, y] = min(left_alpha, bottom_alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(5))
    canvas.paste(patch, (760, 0), mask)


def orange_gradient(size: tuple[int, int]) -> Image.Image:
    w, h = size
    gradient = Image.new("RGB", size)
    draw = ImageDraw.Draw(gradient)
    for x in range(w):
        t = x / max(1, w - 1)
        color = tuple(round(ORANGE[i] * (1 - t) + ORANGE_LIGHT[i] * t) for i in range(3))
        draw.line((x, 0, x, h), fill=color)
    return gradient


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    source = Image.open(BASE).convert("RGB")
    if source.size != (1024, 1536):
        raise ValueError(f"Unexpected generated base size: {source.size}")

    # The built-in generator returned 2:3. This exact crop preserves the quiet
    # paper header and the Kyoto collage while converting cleanly to 4:5.
    canvas = source.crop((0, 100, 1024, 1380)).resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    feathered_paper_patch(canvas)
    draw = ImageDraw.Draw(canvas)

    # Header typography.
    eyebrow_font = ImageFont.truetype(str(SANS_BOLD), 18)
    headline_font = ImageFont.truetype(str(SERIF), 72)
    subhead_font = ImageFont.truetype(str(SANS_BOLD), 15)

    draw_tracked(draw, (76, 67), "KYOTO / JAPAN", eyebrow_font, ORANGE, 4)
    draw.text((72, 120), "THE CITY WHISPERS", font=headline_font, fill=INK)
    draw.text((72, 194), "AFTER DARK.", font=headline_font, fill=ORANGE)
    first_phrase = "LANTERN-LIT LANES."
    second_phrase = " QUIET TEMPLES. MIDNIGHT RAMEN."
    phrase_end = draw_tracked(draw, (76, 310), first_phrase, subhead_font, ORANGE, 2)
    draw_tracked(draw, (phrase_end + 1, 310), second_phrase, subhead_font, INK, 2)
    draw.line((76, 357, 430, 357), fill=ORANGE, width=2)
    draw.ellipse((442, 352, 452, 362), fill=ORANGE)
    draw.line((464, 357, 640, 357), fill=ORANGE, width=2)

    # Deterministic brand mark, replacing any generated approximation.
    compass = Image.open(LOGO).convert("RGBA").resize((100, 100), Image.Resampling.LANCZOS)
    canvas.paste(compass, (878, 65), compass)
    draw = ImageDraw.Draw(canvas)
    brand_font = ImageFont.truetype(str(SANS_BOLD), 18)
    brand = "TRAVALBEE"
    brand_tracking = 3
    brand_w = tracked_width(draw, brand, brand_font, brand_tracking)
    draw_tracked(draw, ((928 - brand_w // 2), 178), brand, brand_font, INK, brand_tracking)

    # Dark footer and high-contrast CTA.
    footer_top = 1188
    draw.rectangle((0, footer_top, WIDTH, HEIGHT), fill=INK)
    button = (110, 1223, 970, 1322)
    gradient = orange_gradient((button[2] - button[0], button[3] - button[1]))
    canvas.paste(gradient, (button[0], button[1]))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle(button, outline=(238, 213, 192), width=2)

    cta_font = ImageFont.truetype(str(SANS_BOLD), 24)
    cta = "PLAN KYOTO WITH TRAVALBEE →"
    cta_tracking = 3
    cta_w = tracked_width(draw, cta, cta_font, cta_tracking)
    cta_x = (WIDTH - cta_w) // 2
    draw_tracked(draw, (cta_x, 1257), cta, cta_font, WHITE, cta_tracking)

    canvas.save(OUTPUT, "PNG", optimize=True)
    print(OUTPUT)
    print(f"{canvas.size[0]}x{canvas.size[1]}")
    print("COPY_OK=KYOTO / JAPAN | THE CITY WHISPERS AFTER DARK. | LANTERN-LIT LANES. QUIET TEMPLES. MIDNIGHT RAMEN. | PLAN KYOTO WITH TRAVALBEE ->")


if __name__ == "__main__":
    main()
