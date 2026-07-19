#!/usr/bin/env python3
"""
Generates the README hero graphic for the Embra 5D Framework.

Outputs (written next to this script, in assets/):
  embra-5d.svg  — vector source, hand-composed with computed helix/cone geometry
  embra-5d.png  — 2400x1520 raster (via rsvg-convert, if available)

Run:
  python3 assets/generate_graphic.py

Pure standard library (math, os, subprocess, shutil); no third-party deps. The PNG
step uses `rsvg-convert` (from librsvg, e.g. `brew install librsvg`); if it is not
found, the script prints the one-liner to rasterize the SVG yourself.

The picture: the worldline helix (gold `now` fading to the cool past) spiraling up
the conical constraint surface M from the null-rest apex (rho = 0, where rest is
lightlike, sigma = 24c), through the light cylinder (rho = 1/omega), inside the flat
five-dimensional bulk. See README section 15.
"""
import math
import os
import shutil
import subprocess

W, H = 1200, 760
CX = 600
APEX_Y, TOP_Y = 652, 208
HEIGHT = APEX_Y - TOP_Y
R_TOP = 250
SLOPE = R_TOP / HEIGHT
EK = 0.30            # ellipse foreshortening
TURNS = 3.25
R_LC = 140          # light-cylinder screen radius
FONT = 'font-family="Helvetica Neue,Helvetica,Arial,sans-serif"'


def coneR(y):
    return SLOPE * (APEX_Y - y)


def helix(t):
    y = APEX_Y - HEIGHT * t
    R = R_TOP * t
    th = 2 * math.pi * TURNS * t
    return CX + R * math.cos(th), y + R * EK * math.sin(th), math.sin(th)


# --- helix split into front (sin>=0) / back segments for depth ---
N = 480
P = [helix(i / N) for i in range(N + 1)]
segs = []
cur = [(P[0][0], P[0][1])]
cf = P[0][2] >= 0
for i in range(1, len(P)):
    x, y, s = P[i]
    f = s >= 0
    cur.append((x, y))
    if f != cf:
        segs.append((cf, cur))
        cur = [(x, y)]
        cf = f
segs.append((cf, cur))


def d_of(pts):
    return "M " + " L ".join("%.1f %.1f" % (x, y) for x, y in pts)


hx, hy, _ = helix(0.72)      # leader anchor on the helix (front)
nx, ny, _ = helix(1.0)       # now-point

e = []
e.append(f'''<defs>
 <radialGradient id="bg" cx="50%" cy="40%" r="78%">
  <stop offset="0%" stop-color="#161f3d"/><stop offset="55%" stop-color="#0b1124"/><stop offset="100%" stop-color="#05070f"/>
 </radialGradient>
 <radialGradient id="halo" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#3f52a0" stop-opacity="0.42"/><stop offset="100%" stop-color="#3f52a0" stop-opacity="0"/>
 </radialGradient>
 <linearGradient id="cone" x1="0" y1="{TOP_Y}" x2="0" y2="{APEX_Y}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#2fbfae" stop-opacity="0.20"/><stop offset="100%" stop-color="#2fbfae" stop-opacity="0.015"/>
 </linearGradient>
 <linearGradient id="wl" x1="0" y1="{TOP_Y}" x2="0" y2="{APEX_Y}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#ffd27a"/><stop offset="46%" stop-color="#63e6ff"/><stop offset="100%" stop-color="#7aa2ff"/>
 </linearGradient>
</defs>''')

e.append(f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')
e.append(f'<ellipse cx="{CX}" cy="405" rx="480" ry="340" fill="url(#halo)"/>')

# cone body + rings + edges
rt = R_TOP
e.append(f'<polygon points="{CX},{APEX_Y} {CX-rt},{TOP_Y} {CX+rt},{TOP_Y}" fill="url(#cone)"/>')
e.append(f'<line x1="{CX}" y1="{APEX_Y}" x2="{CX-rt}" y2="{TOP_Y}" stroke="#4fd6c8" stroke-opacity="0.30" stroke-width="1.4"/>')
e.append(f'<line x1="{CX}" y1="{APEX_Y}" x2="{CX+rt}" y2="{TOP_Y}" stroke="#4fd6c8" stroke-opacity="0.30" stroke-width="1.4"/>')
for tt in (0.34, 0.55, 0.76, 1.0):
    yy = APEX_Y - HEIGHT * tt
    RR = R_TOP * tt
    e.append(f'<ellipse cx="{CX}" cy="{yy:.1f}" rx="{RR:.1f}" ry="{RR*EK:.1f}" fill="none" stroke="#4fd6c8" stroke-opacity="0.22" stroke-width="1.2"/>')

# light cylinder (fixed radius rho = 1/omega)
lct, lcb = 252, 596
e.append(f'<rect x="{CX-R_LC}" y="{lct}" width="{2*R_LC}" height="{lcb-lct}" fill="#ffb454" fill-opacity="0.030"/>')
e.append(f'<line x1="{CX-R_LC}" y1="{lct}" x2="{CX-R_LC}" y2="{lcb}" stroke="#ffb454" stroke-opacity="0.38" stroke-width="1.2" stroke-dasharray="5 5"/>')
e.append(f'<line x1="{CX+R_LC}" y1="{lct}" x2="{CX+R_LC}" y2="{lcb}" stroke="#ffb454" stroke-opacity="0.38" stroke-width="1.2" stroke-dasharray="5 5"/>')
e.append(f'<ellipse cx="{CX}" cy="{lct}" rx="{R_LC}" ry="{R_LC*EK}" fill="none" stroke="#ffb454" stroke-opacity="0.44" stroke-width="1.2" stroke-dasharray="5 5"/>')
e.append(f'<ellipse cx="{CX}" cy="{lcb}" rx="{R_LC}" ry="{R_LC*EK}" fill="none" stroke="#ffb454" stroke-opacity="0.24" stroke-width="1.1" stroke-dasharray="5 5"/>')

# central axis (rho = 0), behind helix
axt = TOP_Y - 4
e.append(f'<line x1="{CX}" y1="{axt}" x2="{CX}" y2="{APEX_Y}" stroke="#9fb4ff" stroke-opacity="0.10" stroke-width="7"/>')
e.append(f'<line x1="{CX}" y1="{axt}" x2="{CX}" y2="{APEX_Y}" stroke="#cdd8ff" stroke-opacity="0.50" stroke-width="1.5"/>')
e.append(f'<path d="M {CX} {axt} l -5 11 M {CX} {axt} l 5 11" stroke="#cdd8ff" stroke-opacity="0.50" stroke-width="1.5" fill="none"/>')

# helix: back segments then front segments (so the front reads on top)
for is_front, pts in segs:
    if len(pts) < 2:
        continue
    dd = d_of(pts)
    if is_front:
        e.append(f'<path d="{dd}" fill="none" stroke="url(#wl)" stroke-opacity="0.16" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>')
        e.append(f'<path d="{dd}" fill="none" stroke="url(#wl)" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round"/>')
    else:
        e.append(f'<path d="{dd}" fill="none" stroke="url(#wl)" stroke-opacity="0.30" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2.5 4.5"/>')

# apex node (null rest) and now-point
e.append(f'<circle cx="{CX}" cy="{APEX_Y}" r="9" fill="#9fb4ff" fill-opacity="0.18"/>')
e.append(f'<circle cx="{CX}" cy="{APEX_Y}" r="4.2" fill="#e9eeff"/>')
e.append(f'<circle cx="{nx:.1f}" cy="{ny:.1f}" r="17" fill="#ffe8b0" fill-opacity="0.12"/>')
e.append(f'<circle cx="{nx:.1f}" cy="{ny:.1f}" r="9" fill="#ffd27a" fill-opacity="0.32"/>')
e.append(f'<circle cx="{nx:.1f}" cy="{ny:.1f}" r="4.5" fill="#fff4de"/>')

# title
e.append(f'<text x="{CX}" y="64" text-anchor="middle" {FONT} font-size="34" font-weight="700" letter-spacing="3" fill="#eaf0ff">THE EMBRA 5D FRAMEWORK</text>')
e.append(f'<text x="{CX}" y="93" text-anchor="middle" {FONT} font-size="15.5" fill="#8fa0c4">4D spacetime as a constraint surface in a flat five-dimensional bulk</text>')


def leader(x1, y1, x2, y2):
    e.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#6b7ba3" stroke-opacity="0.7" stroke-width="1"/>')
    e.append(f'<circle cx="{x2:.1f}" cy="{y2:.1f}" r="2.1" fill="#9fb0d6"/>')


def txt(x, y, s, size=15, fill="#c7d2ea", anchor="start", weight="400"):
    e.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" {FONT} font-size="{size}" font-weight="{weight}" fill="{fill}">{s}</text>')


# worldline helix (right)
leader(892, 250, hx, hy)
txt(900, 246, "worldline helix", 16, "#e6ecfb", weight="600")
txt(900, 267, "cycle + helix constraints", 12.5, "#8493b6")
# constraint surface M (left)
leader(322, 372, 470, 396)
txt(314, 368, "constraint surface M", 16, "#e6ecfb", anchor="end", weight="600")
txt(314, 389, "the cone / spiral", 12.5, "#8493b6", anchor="end")
# light cylinder (right)
leader(892, 470, CX + R_LC, 470)
txt(900, 466, "light cylinder", 16, "#ffd8a0", weight="600")
txt(900, 487, "ρ = 1/ω ≈ 3.82", 12.5, "#c2a878")
# null rest (below apex)
leader(CX, 690, CX, APEX_Y + 7)
txt(CX, 712, "null rest · ρ = 0", 16, "#dfe6f7", anchor="middle", weight="600")
txt(CX, 732, "rest is lightlike  (σ = 24c)", 12.5, "#8493b6", anchor="middle")
# now-point label
txt(nx, ny - 22, "now", 14, "#ffe9c2", anchor="middle", weight="600")
# faint bulk tag
txt(74, 726, "flat 5D bulk", 13, "#55618a")

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
       f'role="img" aria-label="The Embra 5D Framework: a worldline helix on the conical constraint surface M, '
       f'emanating from the null-rest axis inside the light cylinder of a flat 5D bulk">'
       + "".join(e) + "</svg>")

HERE = os.path.dirname(os.path.abspath(__file__))
svg_path = os.path.join(HERE, "embra-5d.svg")
png_path = os.path.join(HERE, "embra-5d.png")
with open(svg_path, "w") as f:
    f.write(svg)
print("wrote", svg_path, f"({len(svg)} bytes)")

if shutil.which("rsvg-convert"):
    subprocess.run(["rsvg-convert", "-w", "2400", "-h", "1520", svg_path, "-o", png_path], check=True)
    print("wrote", png_path)
else:
    print("rsvg-convert not found — to rasterize the PNG:")
    print(f"  rsvg-convert -w 2400 -h 1520 {svg_path} -o {png_path}")
