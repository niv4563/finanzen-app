#!/usr/bin/env python3
"""Erstellt App-Symbol und Startbild der iPhone-App aus dem gleichen «Fr.»-Symbol wie auf Android.
(Bilddateien liegen nicht im Projekt, sie werden beim Build erzeugt.)  Braucht: pip install pillow"""
import re, pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = (ROOT / 'android/app/src/main/res/drawable/ic_launcher_foreground.xml').read_text(encoding='utf-8')
BG = (0x17, 0x32, 0x5A)
paths = re.findall(r'fillColor="#([0-9A-Fa-f]{6})"\s+android:pathData="([^"]+)"', SRC)

def flatten(d):
    """Pfad (M, H, V, L, C, A, Z) in Polygone umwandeln – reicht für dieses Symbol."""
    toks = re.findall(r'[MHVLCAZmhvlcaz]|-?\d*\.?\d+', d)
    polys, cur, x, y, i, cmd = [], [], 0.0, 0.0, 0, None
    num = lambda: float(toks[i])
    while i < len(toks):
        t = toks[i]
        if re.fullmatch(r'[A-Za-z]', t): cmd = t; i += 1
        if cmd in 'Zz':
            if cur: polys.append(cur); cur = []
            continue
        if cmd == 'M': x, y = float(toks[i]), float(toks[i+1]); i += 2; cur = [(x, y)]; cmd = 'L'
        elif cmd == 'L': x, y = float(toks[i]), float(toks[i+1]); i += 2; cur.append((x, y))
        elif cmd == 'H': x = float(toks[i]); i += 1; cur.append((x, y))
        elif cmd == 'V': y = float(toks[i]); i += 1; cur.append((x, y))
        elif cmd == 'C':
            x1, y1, x2, y2, x3, y3 = map(float, toks[i:i+6]); i += 6
            for k in range(1, 17):
                s = k / 16; a = (1-s)**3; b = 3*(1-s)**2*s; c = 3*(1-s)*s**2; e = s**3
                cur.append((a*x+b*x1+c*x2+e*x3, a*y+b*y1+c*y2+e*y3))
            x, y = x3, y3
        elif cmd == 'A':   # nur Halbkreise an den Enden des Strichs: als Gerade genügt
            x, y = float(toks[i+5]), float(toks[i+6]); i += 7; cur.append((x, y))
        else: i += 1
    if cur: polys.append(cur)
    return polys

def draw(size, scale_symbol):
    ss = 4; W = size * ss
    im = Image.new('RGB', (W, W), BG); dr = ImageDraw.Draw(im)
    k = W / 512 * scale_symbol; off = W * (1 - scale_symbol) / 2
    for n, (col, d) in enumerate(paths):
        rgb = tuple(int(col[j:j+2], 16) for j in (0, 2, 4))
        # erste Gruppe im Android-Symbol: um 0.78 skaliert und 12 nach oben verschoben
        g = (0.78, -12) if n == 0 else (1.0, 0)
        for poly in flatten(d):
            pts = [(((px-256)*g[0]+256)*k+off, ((py-256)*g[0]+256+g[1])*k+off) for px, py in poly]
            if len(pts) > 2: dr.polygon(pts, fill=rgb)
    return im.resize((size, size), Image.LANCZOS)

assets = ROOT / 'ios/App/App/Assets.xcassets'
draw(1024, 1.25).save(assets / 'AppIcon.appiconset/AppIcon-512@2x.png')
splash = draw(2732, 0.35)
for n in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
    splash.save(assets / 'Splash.imageset' / n)
print('iPhone-Symbol und Startbild erstellt')
