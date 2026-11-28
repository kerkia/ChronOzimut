# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
# distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
"""Chronoz's icons: Ozimut's compass in a stopwatch's case (a trademark, see TRADEMARK.md).

Ozimut's mark is a compass bezel whose needle is the control flag's two quarters, orange to the north-east and ink to
the south-west. Chronoz keeps it as it is and gives it a stopwatch's case: a crown on top and a pusher at 45°. Drawn on a
32-unit box: the dial's centre (16, 17.6) — lower than Ozimut's 16, to make room for the crown —, the ring of radius
12.4 and stroke 1.8, four ticks, the needle's quarters 7.6 units a side. Below 32 px (`small`) the ticks go and the
ring thickens to 2.5, as Ozimut's small icons would.

    py tools/make_icons.py

writes
- src/img/favicon.svg (the app's pages; ink and paper swap in dark mode)
- src/img/icon-512.png, icon-192.png, apple-touch-icon.png (the window, Linux, macOS — electron-builder makes the .icns)
- app/build/icon.ico (Windows: the installer, the shortcuts, the taskbar; 16 and 24 px in the small drawing)
Needs Pillow.
"""
import math
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORANGE = "#e8641c"        # the control flag's orange
INK = "#1b1a17"
PAPER = "#f4f2ec"

CX, CY = 16.0, 17.6       # the dial's centre
R, RW = 12.4, 1.8         # the ring's radius (its stroke's middle) and stroke
RW_SMALL = 2.5
TICK_OUT, TICK_IN, TICK_W = R - 1.1, 9.2, 1.8
Q = 7.6                   # a side of the needle's quarters
STEM = (14.9, CY - R - 3.2, 2.2, 3.4)            # x, y, w, h
BUTTON = (12.5, CY - R - 5.0, 7.0, 2.3, 0.9)     # x, y, w, h, corner radius
PUSHER = 45               # degrees, clockwise from 12 o'clock
# the mark's extent in the box, strokes included: from the button's top to the ring's bottom
TOP, BOTTOM = BUTTON[1], CY + R + RW / 2


def f(v):
    return f"{round(v, 2):g}"


def rot(points, a):
    """Points of a shape drawn pointing up from the centre, turned to `a` degrees clockwise from 12 o'clock."""
    t = math.radians(a)
    s, c = math.sin(t), math.cos(t)
    return [(CX + x * c - y * s, CY + x * s + y * c) for x, y in points]


def pusher():
    return rot([(-1, -(R + 0.4)), (1, -(R + 0.4)), (1, -(R + 2.5)), (-1, -(R + 2.5))], PUSHER)


def ticks():
    out = []
    for a in (0, 90, 180, 270):
        t = math.radians(a)
        out.append(((CX + TICK_OUT * math.sin(t), CY - TICK_OUT * math.cos(t)),
                    (CX + TICK_IN * math.sin(t), CY - TICK_IN * math.cos(t))))
    return out


def svg():
    """The mark as the app's favicon: ink on a transparent ground, paper in dark mode."""
    tk = " ".join(f"M{f(a[0])} {f(a[1])} L{f(b[0])} {f(b[1])}" for a, b in ticks())
    pu = " L".join(f"{f(x)} {f(y)}" for x, y in pusher())
    sx, sy, sw, sh = STEM
    bx, by, bw, bh, br = BUTTON
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>.f {{ fill: {INK}; }} .o {{ fill: none; stroke: {INK}; }}
    @media (prefers-color-scheme: dark) {{ .f {{ fill: {PAPER}; }} .o {{ stroke: {PAPER}; }} }}</style>
  <!-- Chronoz: Ozimut's compass (the control flag's two quarters as its needle, bearing 45°) in a stopwatch's case.
       Drawn by tools/make_icons.py. -->
  <path d="M{f(CX)} {f(CY - Q)} L{f(CX + Q)} {f(CY)} L{f(CX)} {f(CY)} Z" fill="{ORANGE}"/>
  <path class="f" d="M{f(CX - Q)} {f(CY)} L{f(CX)} {f(CY + Q)} L{f(CX)} {f(CY)} Z"/>
  <!-- the case last, over everything: the crown, the pusher, the ring and its ticks -->
  <rect class="f" x="{f(sx)}" y="{f(sy)}" width="{f(sw)}" height="{f(sh)}"/>
  <rect class="f" x="{f(bx)}" y="{f(by)}" width="{f(bw)}" height="{f(bh)}" rx="{f(br)}"/>
  <path class="f" d="M{pu} Z"/>
  <circle class="o" cx="{f(CX)}" cy="{f(CY)}" r="{f(R)}" stroke-width="{f(RW)}"/>
  <path class="o" d="{tk}" stroke-width="{f(TICK_W)}" stroke-linecap="round"/>
</svg>
"""


def tile(size, *, small=False, fill=0.9, ss=8):
    """A square picture of the mark on paper, supersampled `ss` times; `fill` = the mark's height over the picture's."""
    big = size * ss
    im = Image.new("RGB", (big, big), PAPER)
    g = ImageDraw.Draw(im)
    s = fill * big / (BOTTOM - TOP)
    ox = big / 2 - CX * s
    oy = big / 2 - (TOP + BOTTOM) / 2 * s

    def p(x, y):
        return (ox + x * s, oy + y * s)

    g.polygon([p(CX, CY - Q), p(CX + Q, CY), p(CX, CY)], fill=ORANGE)
    g.polygon([p(CX - Q, CY), p(CX, CY + Q), p(CX, CY)], fill=INK)
    sx, sy, sw, sh = STEM
    g.rectangle([p(sx, sy), p(sx + sw, sy + sh)], fill=INK)
    bx, by, bw, bh, br = BUTTON
    g.rounded_rectangle([p(bx, by), p(bx + bw, by + bh)], radius=br * s, fill=INK)
    g.polygon([p(x, y) for x, y in pusher()], fill=INK)
    w = (RW_SMALL if small else RW) * s
    c = p(CX, CY)
    out = R * s + w / 2
    g.ellipse([c[0] - out, c[1] - out, c[0] + out, c[1] + out], outline=INK, width=round(w))
    if not small:
        tw = TICK_W * s
        for a, b in ticks():
            A, B = p(*a), p(*b)
            g.line([A, B], fill=INK, width=round(tw))
            for X, Y in (A, B):
                g.ellipse([X - tw / 2, Y - tw / 2, X + tw / 2, Y + tw / 2], fill=INK)
    return im.resize((size, size), Image.LANCZOS)


def main():
    img = ROOT / "src" / "img"
    (img / "favicon.svg").write_bytes(svg().encode("utf-8"))
    tile(512).save(img / "icon-512.png", optimize=True)
    tile(192).save(img / "icon-192.png", optimize=True)
    tile(180).save(img / "apple-touch-icon.png", optimize=True)
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = [tile(n, small=n < 32, fill=0.94 if n < 32 else 0.9, ss=16 if n < 64 else 8) for n in sizes]
    build = ROOT / "app" / "build"
    build.mkdir(parents=True, exist_ok=True)
    frames[-1].save(build / "icon.ico", sizes=[(n, n) for n in sizes], append_images=frames[:-1])
    print("written: src/img/favicon.svg, icon-512.png, icon-192.png, apple-touch-icon.png, app/build/icon.ico")


if __name__ == "__main__":
    main()
