#!/usr/bin/env python3
"""
Generate all app icons for TripApp.

Usage:
    python3 tools/make_icons.py                 # draws the default tropical icon
    python3 tools/make_icons.py assets/icon-source.jpg   # builds icons from YOUR photo

Drop the cats photo at assets/icon-source.jpg and re-run to use it as the icon.
Output goes to assets/icons/.
"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "icons")
os.makedirs(OUT, exist_ok=True)

BASE = 1024  # master render size


def load_font(size, bold=True):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def vgradient(size, top, bottom):
    img = Image.new("RGB", (size, size), top)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b))
    return img


def cat(draw, cx, cy, s, color):
    """A simple sitting-cat silhouette centred at (cx, cy), body height ~s."""
    # body: a rounded trapezoid (narrow at shoulders, wide at base)
    top = cy - s*0.02
    base = cy + s*0.52
    draw.polygon([(cx - s*0.20, top), (cx + s*0.20, top),
                  (cx + s*0.34, base), (cx - s*0.34, base)], fill=color)
    draw.ellipse([cx - s*0.20, top - s*0.10, cx + s*0.20, top + s*0.10], fill=color)  # shoulders round
    draw.ellipse([cx - s*0.34, base - s*0.12, cx + s*0.34, base + s*0.05], fill=color)  # base round
    # curved tail sweeping up the right side
    tail_pts = [(cx + s*0.30, base - s*0.02),
                (cx + s*0.52, cy + s*0.30),
                (cx + s*0.52, cy - s*0.02),
                (cx + s*0.40, cy - s*0.18)]
    draw.line(tail_pts, fill=color, width=int(s*0.13), joint="curve")
    draw.ellipse([cx + s*0.40 - s*0.065, cy - s*0.18 - s*0.065,
                  cx + s*0.40 + s*0.065, cy - s*0.18 + s*0.065], fill=color)  # tail tip
    # head
    head_r = s * 0.25
    hy = cy - s*0.30
    draw.ellipse([cx - head_r, hy - head_r, cx + head_r, hy + head_r], fill=color)
    # tall pointed ears
    draw.polygon([(cx - head_r*0.95, hy - head_r*0.35),
                  (cx - head_r*0.55, hy - head_r*1.55),
                  (cx - head_r*0.05, hy - head_r*0.55)], fill=color)
    draw.polygon([(cx + head_r*0.95, hy - head_r*0.35),
                  (cx + head_r*0.55, hy - head_r*1.55),
                  (cx + head_r*0.05, hy - head_r*0.55)], fill=color)


def draw_default(size):
    img = vgradient(size, (255, 176, 102), (14, 90, 99))  # sunset gold -> ocean teal
    d = ImageDraw.Draw(img, "RGBA")
    S = size / 1024.0

    # sun
    sun = size * 0.16
    scx, scy = size * 0.5, size * 0.30
    d.ellipse([scx - sun, scy - sun, scx + sun, scy + sun], fill=(255, 224, 130, 255))

    # subtle water shimmer lines
    for i, y in enumerate([0.62, 0.70, 0.78]):
        yy = size * y
        d.line([(size*0.15, yy), (size*0.85, yy)], fill=(255, 255, 255, 40), width=int(6*S))

    # two cats (Nick & Kelli's) sitting on the "beach", with a heart between
    white = (255, 255, 255, 235)
    cat(d, size*0.36, size*0.66, size*0.30, white)
    cat(d, size*0.64, size*0.66, size*0.30, white)
    # heart
    hx, hy, hr = size*0.5, size*0.52, size*0.045
    d.ellipse([hx - hr*1.4, hy - hr, hx - hr*0.2, hy + hr*0.4], fill=(255, 107, 107, 255))
    d.ellipse([hx + hr*0.2, hy - hr, hx + hr*1.4, hy + hr*0.4], fill=(255, 107, 107, 255))
    d.polygon([(hx - hr*1.5, hy), (hx + hr*1.5, hy), (hx, hy + hr*1.8)], fill=(255, 107, 107, 255))

    # names
    f = load_font(int(size*0.075))
    text = "NICK & KELLI"
    tw = d.textlength(text, font=f)
    d.text(((size - tw)/2, size*0.855), text, font=f, fill=(255, 255, 255, 240))
    return img


def from_photo(path, size):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    m = min(w, h)
    im = im.crop(((w - m)//2, (h - m)//2, (w - m)//2 + m, (h - m)//2 + m)).resize((size, size), Image.LANCZOS)
    return im


def maskable(base_img, size):
    """Maskable icon: content within the safe centre ~80%, on a themed backdrop."""
    bg = vgradient(size, (18, 112, 122), (11, 61, 71))
    inner = int(size * 0.78)
    content = base_img.resize((inner, inner), Image.LANCZOS)
    off = (size - inner)//2
    bg.paste(content, (off, off))
    return bg


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if src and os.path.exists(src):
        print(f"Building icons from photo: {src}")
        master = from_photo(src, BASE)
    else:
        if src:
            print(f"(!) {src} not found — drawing default icon instead.")
        else:
            print("Drawing default tropical icon.")
        master = draw_default(BASE)

    jobs = {
        "icon-192.png": 192,
        "icon-512.png": 512,
        "apple-touch-icon.png": 180,
        "favicon.png": 64,
    }
    for name, sz in jobs.items():
        master.resize((sz, sz), Image.LANCZOS).save(os.path.join(OUT, name))
        print("  wrote", name)

    for name, sz in {"icon-192-maskable.png": 192, "icon-512-maskable.png": 512}.items():
        maskable(master, sz).save(os.path.join(OUT, name))
        print("  wrote", name)

    print("Done ->", OUT)


if __name__ == "__main__":
    main()
