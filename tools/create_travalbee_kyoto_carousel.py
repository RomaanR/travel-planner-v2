from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(r"D:/travel-plannner-v2")
SOCIAL = ROOT / "output/social"
SOURCES = SOCIAL / "kyoto-sources"
CROPS = SOURCES / "crops"
EXACT = SOURCES / "exact"

COVER_BASE = SOCIAL / "travalbee-kyoto-carousel-cover-base.png"
SLIDE_1 = SOCIAL / "travalbee-kyoto-carousel-slide-1.png"
SLIDE_2 = SOCIAL / "travalbee-kyoto-carousel-slide-2.png"
LOGO = ROOT / "public/bee_compass_512_transparent.png"

SERIF = Path(r"C:/Windows/Fonts/georgia.ttf")
SERIF_BOLD = Path(r"C:/Windows/Fonts/georgiab.ttf")
SANS = Path(r"C:/Windows/Fonts/arial.ttf")
SANS_BOLD = Path(r"C:/Windows/Fonts/arialbd.ttf")

WIDTH, HEIGHT = 1080, 1350
CREAM = (245, 240, 232)
PAPER = (251, 248, 241)
INK = (18, 30, 35)
INK_LIGHT = (87, 92, 86)
ORANGE = (194, 65, 12)
ORANGE_LIGHT = (224, 91, 24)
SAGE = (105, 121, 82)
WHITE = (255, 255, 255)
BORDER = (218, 207, 189)


PLACE_SOURCES = [
    {
        "number": "01",
        "source": EXACT / "01-tenryu-ji-garden.png",
        "crop": None,
        "file": "01-tenryu-ji-garden.png",
        "title": ["TENRYU-JI", "GARDEN"],
        "descriptor": ["ZEN STILLNESS", "IN ARASHIYAMA"],
        "detail": "A UNESCO-listed Zen garden framed by Arashiyama’s forested hills.",
        "centering": (0.5, 0.5),
    },
    {
        "number": "02",
        "source": EXACT / "02-sagano-bamboo-grove.png",
        "crop": None,
        "file": "02-sagano-bamboo-grove.png",
        "title": ["SAGANO BAMBOO", "GROVE"],
        "descriptor": ["A CATHEDRAL", "OF GREEN"],
        "detail": "Walk beneath towering bamboo as sunlight filters through the emerald canopy.",
        "centering": (0.5, 0.52),
    },
    {
        "number": "03",
        "source": EXACT / "03-kitcho-arashiyama.png",
        "crop": None,
        "file": "03-kitcho-arashiyama.png",
        "title": ["KITCHŌ", "ARASHIYAMA"],
        "descriptor": ["RIVERSIDE", "KAISEKI DINING"],
        "detail": "Seasonal Kyoto ingredients become an artful riverside kaiseki experience.",
        "centering": (0.5, 0.48),
    },
    {
        "number": "04",
        "source": EXACT / "04-nishiki-market.png",
        "crop": None,
        "file": "04-nishiki-market.png",
        "title": ["NISHIKI MARKET"],
        "descriptor": ["KYOTO’S KITCHEN,", "STALL BY STALL"],
        "detail": "Sample pickles, sweets, seafood and local specialties inside Kyoto’s beloved food market.",
        "centering": (0.5, 0.48),
    },
    {
        "number": "05",
        "source": EXACT / "05-ninen-zaka-sannen-zaka.png",
        "crop": None,
        "file": "05-ninen-zaka-sannen-zaka.png",
        "title": ["NINEN-ZAKA &", "SANNEN-ZAKA"],
        "descriptor": ["HISTORIC LANES BELOW", "YASAKA PAGODA"],
        "detail": "Follow stone-paved lanes and traditional shops toward the iconic Yasaka Pagoda.",
        "centering": (0.5, 0.46),
    },
]


def tracked_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, tracking: int) -> int:
    return round(
        sum(draw.textlength(char, font=font) for char in text)
        + tracking * max(0, len(text) - 1)
    )


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: int,
) -> int:
    cursor, y = float(xy[0]), xy[1]
    for char in text:
        draw.text((cursor, y), char, font=font, fill=fill)
        cursor += draw.textlength(char, font=font) + tracking
    return round(cursor)


def centered_tracked(
    draw: ImageDraw.ImageDraw,
    center_x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: int,
) -> None:
    width = tracked_width(draw, text, font, tracking)
    draw_tracked(draw, (center_x - width // 2, y), text, font, fill, tracking)


def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = word if not current else f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def orange_gradient(size: tuple[int, int]) -> Image.Image:
    gradient = Image.new("RGB", size)
    draw = ImageDraw.Draw(gradient)
    for x in range(size[0]):
        t = x / max(1, size[0] - 1)
        color = tuple(round(ORANGE[i] * (1 - t) + ORANGE_LIGHT[i] * t) for i in range(3))
        draw.line((x, 0, x, size[1]), fill=color)
    return gradient


def place_brand(canvas: Image.Image, mark_xy: tuple[int, int], mark_size: int = 88) -> None:
    mark = Image.open(LOGO).convert("RGBA").resize((mark_size, mark_size), Image.Resampling.LANCZOS)
    canvas.paste(mark, mark_xy, mark)
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(SANS_BOLD), 17)
    center_x = mark_xy[0] + mark_size // 2
    centered_tracked(draw, center_x, mark_xy[1] + mark_size + 10, "TRAVALBEE", font, INK, 3)


def make_cta(canvas: Image.Image, y1: int, y2: int, text: str) -> None:
    font = ImageFont.truetype(str(SANS_BOLD), 21)
    measure = ImageDraw.Draw(canvas)
    text_width = tracked_width(measure, text, font, 2)
    button_width = min(WIDTH - 212, text_width + 138)
    x1 = (WIDTH - button_width) // 2
    x2 = x1 + button_width
    gradient = orange_gradient((x2 - x1, y2 - y1))
    canvas.paste(gradient, (x1, y1))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((x1, y1, x2, y2), outline=(238, 213, 192), width=2)
    centered_tracked(draw, WIDTH // 2, y1 + 34, text, font, WHITE, 2)


def crop_place_photos() -> list[Image.Image]:
    CROPS.mkdir(parents=True, exist_ok=True)
    photos: list[Image.Image] = []
    for place in PLACE_SOURCES:
        source = Image.open(place["source"]).convert("RGB")
        crop = source if place["crop"] is None else source.crop(place["crop"])
        crop = crop.filter(ImageFilter.UnsharpMask(radius=1.1, percent=118, threshold=3))
        crop.save(CROPS / place["file"], "PNG", optimize=True)
        photos.append(crop)
    return photos


def paper_canvas(base: Image.Image) -> Image.Image:
    bw, bh = base.size
    texture = base.crop((round(bw * 0.25), round(bh * 0.05), round(bw * 0.88), round(bh * 0.28)))
    texture = texture.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    return Image.blend(texture.convert("RGB"), Image.new("RGB", (WIDTH, HEIGHT), CREAM), 0.78)


def draw_dotted_route(draw: ImageDraw.ImageDraw) -> None:
    for y in range(240, 1140, 24):
        draw.ellipse((30, y, 36, y + 6), fill=(210, 90, 35))
    draw.ellipse((22, 1124, 44, 1146), fill=ORANGE)
    draw.ellipse((28, 1130, 38, 1140), fill=CREAM)


def paste_rounded_photo(canvas: Image.Image, photo: Image.Image, box: tuple[int, int, int, int], centering: tuple[float, float]) -> None:
    width, height = box[2] - box[0], box[3] - box[1]
    fitted = ImageOps.fit(photo, (width, height), Image.Resampling.LANCZOS, centering=centering)
    fitted = fitted.filter(ImageFilter.UnsharpMask(radius=0.8, percent=105, threshold=2))
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, height - 1), radius=10, fill=255)
    canvas.paste(fitted, (box[0], box[1]), mask)


def draw_card(
    canvas: Image.Image,
    place: dict,
    photo: Image.Image,
    box: tuple[int, int, int, int],
    image_height: int,
    title_size: int,
) -> None:
    x1, y1, x2, y2 = box
    width, height = x2 - x1, y2 - y1

    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((x1 + 3, y1 + 9, x2 + 3, y2 + 9), radius=18, fill=(43, 37, 26, 42))
    shadow = shadow.filter(ImageFilter.GaussianBlur(11))
    canvas.paste(shadow, (0, 0), shadow)

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(box, radius=18, fill=PAPER, outline=BORDER, width=2)

    image_box = (x1 + 12, y1 + 12, x2 - 12, y1 + image_height)
    paste_rounded_photo(canvas, photo, image_box, place["centering"])

    badge_x, badge_y = x1 + 39, y1 + image_height - 2
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((badge_x - 27, badge_y - 27, badge_x + 27, badge_y + 27), fill=ORANGE, outline=CREAM, width=3)
    number_font = ImageFont.truetype(str(SERIF_BOLD), 19)
    number_box = draw.textbbox((0, 0), place["number"], font=number_font)
    draw.text(
        (badge_x - (number_box[2] - number_box[0]) / 2, badge_y - 13),
        place["number"],
        font=number_font,
        fill=WHITE,
    )

    title_font = ImageFont.truetype(str(SERIF_BOLD), title_size)
    title_y = y1 + image_height + 31
    for line in place["title"]:
        draw.text((x1 + 22, title_y), line, font=title_font, fill=INK)
        title_y += title_size + 4

    descriptor_font = ImageFont.truetype(str(SANS_BOLD), 10)
    descriptor_y = title_y + 6
    for line in place["descriptor"]:
        draw_tracked(draw, (x1 + 22, descriptor_y), line, descriptor_font, SAGE, 1)
        descriptor_y += 16

    detail_font = ImageFont.truetype(str(SANS), 14)
    detail_y = descriptor_y + 5
    for line in wrap_text(draw, place["detail"], detail_font, width - 44):
        draw.text((x1 + 22, detail_y), line, font=detail_font, fill=INK_LIGHT)
        detail_y += 18


def build_slide_1(base: Image.Image) -> None:
    crop_height = round(base.width * HEIGHT / WIDTH)
    crop_top = min(70, max(0, base.height - crop_height))
    canvas = base.crop((0, crop_top, base.width, crop_top + crop_height))
    canvas = canvas.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(canvas)

    eyebrow = ImageFont.truetype(str(SANS_BOLD), 18)
    headline = ImageFont.truetype(str(SERIF_BOLD), 77)
    subhead = ImageFont.truetype(str(SANS_BOLD), 17)
    draw_tracked(draw, (75, 65), "KYOTO / JAPAN", eyebrow, ORANGE, 4)
    draw.text((71, 121), "KYOTO IS", font=headline, fill=INK)
    draw.text((71, 202), "CALLING.", font=headline, fill=ORANGE)
    draw_tracked(draw, (76, 316), "5 PLACES WORTH SAVING.", subhead, INK, 3)
    draw.line((76, 364, 414, 364), fill=ORANGE, width=2)
    draw.ellipse((427, 359, 437, 369), fill=ORANGE)
    draw.line((450, 364, 618, 364), fill=ORANGE, width=2)

    place_brand(canvas, (884, 58), 88)

    # Keep the Kyoto artwork continuous to the bottom edge; the orange CTA
    # provides its own contrast without a separate footer panel.
    make_cta(canvas, 1216, 1318, "SWIPE → 5 PLACES TO VISIT IN KYOTO")
    canvas.save(SLIDE_1, "PNG", optimize=True)


def build_slide_2(base: Image.Image, photos: list[Image.Image]) -> None:
    canvas = paper_canvas(base)
    draw = ImageDraw.Draw(canvas)
    draw_dotted_route(draw)

    eyebrow = ImageFont.truetype(str(SANS_BOLD), 17)
    headline = ImageFont.truetype(str(SERIF_BOLD), 58)
    draw_tracked(draw, (68, 52), "KYOTO / JAPAN", eyebrow, ORANGE, 4)
    draw.text((66, 97), "5 PLACES", font=headline, fill=INK)
    draw.text((66, 159), "WORTH SAVING", font=headline, fill=ORANGE)
    draw.line((68, 231, 596, 231), fill=ORANGE, width=2)
    place_brand(canvas, (900, 51), 78)

    top_boxes = [
        (57, 258, 347, 652),
        (395, 258, 685, 652),
        (733, 258, 1023, 652),
    ]
    bottom_boxes = [
        (88, 691, 512, 1138),
        (568, 691, 992, 1138),
    ]
    for index, box in enumerate(top_boxes):
        draw_card(canvas, PLACE_SOURCES[index], photos[index], box, image_height=207, title_size=23)
    for index, box in enumerate(bottom_boxes, start=3):
        draw_card(canvas, PLACE_SOURCES[index], photos[index], box, image_height=254, title_size=26)

    make_cta(canvas, 1212, 1315, "MAKE YOUR OWN AT TRAVALBEE.COM →")
    canvas.save(SLIDE_2, "PNG", optimize=True)


def validate() -> None:
    for path in (SLIDE_1, SLIDE_2):
        image = Image.open(path)
        if image.size != (WIDTH, HEIGHT):
            raise ValueError(f"Wrong dimensions for {path.name}: {image.size}")
        if image.mode != "RGB":
            raise ValueError(f"Wrong color mode for {path.name}: {image.mode}")
        image.verify()
    for place in PLACE_SOURCES:
        if not (CROPS / place["file"]).exists():
            raise FileNotFoundError(CROPS / place["file"])


def main() -> None:
    base = Image.open(COVER_BASE).convert("RGB")
    if base.width < 900 or base.height < round(base.width * HEIGHT / WIDTH):
        raise ValueError(f"Unexpected cover base size: {base.size}")
    photos = crop_place_photos()
    build_slide_1(base)
    build_slide_2(base, photos)
    validate()
    print(SLIDE_1)
    print(SLIDE_2)
    print("VALID=1080x1350 RGB PNG x2")


if __name__ == "__main__":
    main()
