from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


IMAGE_1 = Path(r"C:/Users/User/AppData/Local/Temp/codex-clipboard-94198b8b-b55e-4e2c-a577-50ff35dd78ad.png")
IMAGE_2 = Path(r"C:/Users/User/AppData/Local/Temp/codex-clipboard-c2d6f58c-9f8f-4b82-b53c-7ba4e0dfa4ee.png")
OUT_DIR = Path(r"D:/travel-plannner-v2/output/social")
FONT_BOLD = Path(r"C:/Windows/Fonts/arialbd.ttf")


def orange_mask(img: Image.Image, min_y_ratio: float) -> np.ndarray:
    arr = np.asarray(img.convert("RGB"))
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    mask = (r > 135) & (g > 35) & (g < 115) & (b < 85) & ((r - g) > 55) & ((r - b) > 80)
    mask[: int(img.height * min_y_ratio), :] = False
    return mask


def largest_component_bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best_area = 0
    best_bbox = None

    ys, xs = np.nonzero(mask)
    for start_y, start_x in zip(ys, xs):
        if seen[start_y, start_x] or not mask[start_y, start_x]:
            continue

        stack = [(int(start_y), int(start_x))]
        seen[start_y, start_x] = True
        area = 0
        min_x = max_x = int(start_x)
        min_y = max_y = int(start_y)

        while stack:
            y, x = stack.pop()
            area += 1
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)

            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and mask[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))

        if area > best_area:
            best_area = area
            best_bbox = (min_x, min_y, max_x + 1, max_y + 1)

    if best_bbox is None:
        raise RuntimeError("No orange CTA component found")

    return best_bbox


def draw_centered_tracking(
    draw: ImageDraw.ImageDraw,
    text: str,
    box: tuple[int, int, int, int],
    font_path: Path,
    fill: tuple[int, int, int],
    max_size: int,
    min_size: int,
    tracking_ratio: float = 0.18,
) -> None:
    x1, y1, x2, y2 = box
    max_width = (x2 - x1) * 0.84
    max_height = (y2 - y1) * 0.56

    chosen = None
    for size in range(max_size, min_size - 1, -1):
        font = ImageFont.truetype(str(font_path), size=size)
        tracking = max(1, round(size * tracking_ratio))
        width = 0
        height = 0
        for ch in text:
            bbox = draw.textbbox((0, 0), ch, font=font)
            width += bbox[2] - bbox[0]
            height = max(height, bbox[3] - bbox[1])
        width += tracking * (len(text) - 1)
        if width <= max_width and height <= max_height:
            chosen = (font, tracking, width, height)
            break

    if chosen is None:
        font = ImageFont.truetype(str(font_path), size=min_size)
        tracking = max(1, round(min_size * tracking_ratio))
        width = sum(draw.textbbox((0, 0), ch, font=font)[2] for ch in text) + tracking * (len(text) - 1)
        height = draw.textbbox((0, 0), text, font=font)[3]
        chosen = (font, tracking, width, height)

    font, tracking, width, height = chosen
    start_x = x1 + ((x2 - x1) - width) / 2
    baseline_box = draw.textbbox((0, 0), text, font=font)
    start_y = y1 + ((y2 - y1) - (baseline_box[3] - baseline_box[1])) / 2 - baseline_box[1]

    cursor = start_x
    for ch in text:
        draw.text((cursor, start_y), ch, font=font, fill=fill)
        cb = draw.textbbox((0, 0), ch, font=font)
        cursor += (cb[2] - cb[0]) + tracking


def repaint_button_text(img: Image.Image, text: str, min_y_ratio: float, max_size: int) -> Image.Image:
    out = img.convert("RGB").copy()
    draw = ImageDraw.Draw(out)
    button = largest_component_bbox(orange_mask(out, min_y_ratio))

    # Repaint the inner button surface only, preserving the border, radius, and shadows.
    x1, y1, x2, y2 = button
    pad_x = int((x2 - x1) * 0.055)
    pad_y = int((y2 - y1) * 0.17)
    inner = (x1 + pad_x, y1 + pad_y, x2 - pad_x, y2 - pad_y)

    left_sample = out.crop((x1 + pad_x, y1 + pad_y, x1 + pad_x + 2, y2 - pad_y)).resize((1, 1))
    right_sample = out.crop((x2 - pad_x - 2, y1 + pad_y, x2 - pad_x, y2 - pad_y)).resize((1, 1))
    left = left_sample.getpixel((0, 0))
    right = right_sample.getpixel((0, 0))

    ix1, iy1, ix2, iy2 = inner
    gradient = Image.new("RGB", (ix2 - ix1, iy2 - iy1))
    grad_draw = ImageDraw.Draw(gradient)
    for x in range(gradient.width):
        t = x / max(1, gradient.width - 1)
        color = tuple(round(left[i] * (1 - t) + right[i] * t) for i in range(3))
        grad_draw.line([(x, 0), (x, gradient.height)], fill=color)
    out.paste(gradient, (ix1, iy1))

    draw_centered_tracking(
        draw,
        text,
        inner,
        FONT_BOLD,
        (255, 255, 255),
        max_size=max_size,
        min_size=max(20, int(max_size * 0.58)),
    )
    return out


def fit_on_canvas(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    cover_scale = max(target_w / img.width, target_h / img.height)
    cover = img.resize((round(img.width * cover_scale), round(img.height * cover_scale)), Image.Resampling.LANCZOS)
    left = (cover.width - target_w) // 2
    top = (cover.height - target_h) // 2
    background = cover.crop((left, top, left + target_w, top + target_h)).filter(ImageFilter.GaussianBlur(32))
    overlay = Image.new("RGB", size, (246, 232, 206))
    background = Image.blend(background, overlay, 0.45)

    contain_scale = min(target_w / img.width, target_h / img.height)
    contained = img.resize((round(img.width * contain_scale), round(img.height * contain_scale)), Image.Resampling.LANCZOS)
    x = (target_w - contained.width) // 2
    y = (target_h - contained.height) // 2
    background.paste(contained, (x, y))
    return background


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img1 = Image.open(IMAGE_1)
    img2 = Image.open(IMAGE_2)

    out1 = repaint_button_text(img1, "NEXT SLIDE: PLACES TO VISIT ->", min_y_ratio=0.82, max_size=35)

    img2_text = repaint_button_text(img2, "VISIT TRAVALBEE.COM ->", min_y_ratio=0.90, max_size=43)
    out2 = fit_on_canvas(img2_text, out1.size)

    out1_path = OUT_DIR / "travalbee-carousel-slide-1-edited.png"
    out2_path = OUT_DIR / "travalbee-carousel-slide-2-edited.png"
    out1.save(out1_path, "PNG")
    out2.save(out2_path, "PNG")
    print(out1_path)
    print(out2_path)
    print(f"{out1.size[0]}x{out1.size[1]}")
    print(f"{out2.size[0]}x{out2.size[1]}")


if __name__ == "__main__":
    main()
