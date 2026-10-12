#!/usr/bin/env python3
"""Génère le pack visuel de QuentMovie, créations originales sans droits :
- luts/*.cube     : looks d'étalonnage (LUT 3D, format standard .cube)
- calques/*.mp4   : calques animés à superposer en mode « écran » (fuites de lumière, neige, poussière…)
- cadres/*-h.png et *-v.png : cadres plein écran (horizontal et vertical)
Usage : python3 scripts/generer-pack.py   (numpy, Pillow et ffmpeg requis)
Met à jour les listes « luts », « calques » et « cadres » de bibliotheque/index.json."""
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bibliotheque')
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
POLICES = {
    'gras': ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'],
    'mono': ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/System/Library/Fonts/Supplemental/Courier New Bold.ttf'],
}


def police(nom, taille):
    for p in POLICES[nom]:
        if os.path.exists(p):
            return ImageFont.truetype(p, taille)
    return ImageFont.load_default()


# ====================== LUT (looks d'étalonnage) ======================
N = 25  # taille de la grille : interpolée par FFmpeg, suffisante pour des looks doux


def lum(x):
    return (x[:, 0] * 0.2126 + x[:, 1] * 0.7152 + x[:, 2] * 0.0722)[:, None]


def sat(x, s):
    l = lum(x)
    return l + (x - l) * s


def courbe(x, k):  # courbe en S (k > 0 : plus de contraste ; k < 0 : moins)
    if abs(k) < 1e-3:
        return x
    if k < 0:
        return x + (0.5 - x) * (-k / 10) * (1 - np.abs(2 * x - 1))
    sg = lambda v: 1 / (1 + np.exp(-v))
    a, b = sg(-k / 2), sg(k / 2)
    return (sg(k * (x - 0.5)) - a) / (b - a)


def lgg(x, lift=(0, 0, 0), gamma=(1, 1, 1), gain=(1, 1, 1)):
    x = np.asarray(gain) * (x + np.asarray(lift) * (1 - x))
    return np.clip(x, 0, 1) ** (1 / np.asarray(gamma))


def split(x, ombres=(0, 0, 0), lumieres=(0, 0, 0)):
    l = lum(x)
    return x + np.asarray(ombres) * (1 - l) ** 2 + np.asarray(lumieres) * l ** 2


def delave(x, noir=0.0, blanc=1.0):
    return noir + x * (blanc - noir)


def mono(x, teinte=(1, 1, 1)):
    return np.repeat(lum(x), 3, axis=1) * np.asarray(teinte)


def mix(x, m):
    return x @ np.asarray(m).T


def chaine(*etapes):
    def f(x):
        for e in etapes:
            x = np.clip(e(x), 0, 1)
        return x
    return f


LUTS = [
    # id, nom, catégorie, transformation
    ('cine-teal-orange', 'Cinéma teal et orange', 'Cinéma', chaine(lambda x: split(x, (-0.08, 0.02, 0.1), (0.1, 0.02, -0.1)), lambda x: courbe(x, 5), lambda x: sat(x, 1.15))),
    ('blockbuster', 'Blockbuster', 'Cinéma', chaine(lambda x: split(x, (-0.06, 0.04, 0.12), (0.12, 0.04, -0.06)), lambda x: courbe(x, 7), lambda x: sat(x, 0.95))),
    ('thriller', 'Thriller (vert froid)', 'Cinéma', chaine(lambda x: lgg(x, (0, 0.02, 0.02), (0.95, 1.02, 1), (0.95, 1, 0.98)), lambda x: courbe(x, 5), lambda x: sat(x, 0.7))),
    ('bleach-bypass', 'Bleach bypass', 'Cinéma', chaine(lambda x: x * 0.5 + np.repeat(courbe(lum(x), 8), 3, axis=1) * 0.5, lambda x: sat(x, 0.6))),
    ('nuit-americaine', 'Nuit américaine', 'Cinéma', chaine(lambda x: lgg(x, (0, 0, 0.03), (0.8, 0.85, 1), (0.6, 0.7, 0.95)), lambda x: sat(x, 0.6))),
    ('argentique-chaud', 'Film argentique chaud', 'Argentique', chaine(lambda x: delave(x, 0.04, 0.97), lambda x: split(x, (0.03, 0.01, -0.02), (0.06, 0.02, -0.06)), lambda x: courbe(x, 3), lambda x: sat(x, 0.92))),
    ('argentique-portrait', 'Film argentique doux (portrait)', 'Argentique', chaine(lambda x: delave(x, 0.05, 0.98), lambda x: split(x, (0, 0.02, 0.03), (0.05, 0.02, -0.02)), lambda x: courbe(x, 2), lambda x: sat(x, 0.85))),
    ('diapositive', 'Film diapositive (couleurs vives)', 'Argentique', chaine(lambda x: courbe(x, 6), lambda x: sat(x, 1.35), lambda x: split(x, (0, 0, 0.04), (0.03, 0.01, -0.02)))),
    ('annees-70', 'Années 70 délavé', 'Argentique', chaine(lambda x: delave(x, 0.08, 0.93), lambda x: lgg(x, (0.02, 0.01, 0), (1.05, 1, 0.92), (1.02, 1, 0.9)), lambda x: sat(x, 0.75))),
    ('polaroid', 'Instantané (polaroid)', 'Argentique', chaine(lambda x: delave(x, 0.07, 0.95), lambda x: split(x, (0, 0.04, 0.06), (0.06, 0.03, -0.04)), lambda x: courbe(x, 2), lambda x: sat(x, 0.8))),
    ('retro-90', 'Rétro années 90 (ombres vertes)', 'Argentique', chaine(lambda x: split(x, (-0.02, 0.06, 0.01), (0.05, 0.03, -0.03)), lambda x: delave(x, 0.05, 0.96), lambda x: sat(x, 0.9))),
    ('ete-dore', 'Été doré', 'Saisons et lieux', chaine(lambda x: lgg(x, (0.02, 0.01, 0), (1.05, 1.02, 0.95), (1.06, 1.02, 0.9)), lambda x: courbe(x, 3), lambda x: sat(x, 1.12))),
    ('coucher-soleil', 'Coucher de soleil', 'Saisons et lieux', chaine(lambda x: split(x, (0.04, -0.01, 0.06), (0.14, 0.04, -0.1)), lambda x: courbe(x, 3), lambda x: sat(x, 1.15))),
    ('hiver-bleu', 'Hiver bleu', 'Saisons et lieux', chaine(lambda x: lgg(x, (0, 0.01, 0.03), (0.95, 1, 1.06), (0.94, 0.99, 1.05)), lambda x: sat(x, 0.8), lambda x: courbe(x, 2))),
    ('nordique', 'Nordique (froid et doux)', 'Saisons et lieux', chaine(lambda x: delave(x, 0.04, 0.97), lambda x: split(x, (-0.01, 0.01, 0.04), (0, 0.01, 0.03)), lambda x: sat(x, 0.65))),
    ('foret', 'Forêt (verts profonds)', 'Saisons et lieux', chaine(lambda x: mix(x, [[0.95, 0.05, 0], [0.02, 0.92, 0.06], [0, 0.08, 0.92]]), lambda x: split(x, (-0.02, 0.03, 0.01), (0.04, 0.03, -0.03)), lambda x: courbe(x, 4))),
    ('tropical', 'Tropical (turquoise vif)', 'Saisons et lieux', chaine(lambda x: split(x, (-0.03, 0.04, 0.06), (0.05, 0.03, -0.02)), lambda x: sat(x, 1.3), lambda x: courbe(x, 3))),
    ('desert', 'Désert (sable chaud)', 'Saisons et lieux', chaine(lambda x: lgg(x, (0.03, 0.02, 0), (1.04, 1, 0.9), (1.05, 1, 0.86)), lambda x: sat(x, 0.85), lambda x: courbe(x, 3))),
    ('western', 'Western', 'Saisons et lieux', chaine(lambda x: lgg(x, (0.02, 0.01, 0), (1.03, 0.98, 0.85), (1.04, 0.98, 0.8)), lambda x: courbe(x, 6), lambda x: sat(x, 0.7))),
    ('moody-sombre', 'Moody sombre', 'Ambiances', chaine(lambda x: lgg(x, (0.02, 0.02, 0.03), (0.85, 0.85, 0.88), (0.95, 0.95, 0.97)), lambda x: courbe(x, 4), lambda x: sat(x, 0.7))),
    ('moody-cafe', 'Moody café (bruns)', 'Ambiances', chaine(lambda x: split(x, (0.03, 0.01, -0.02), (0.05, 0.02, -0.04)), lambda x: lgg(x, (0.03, 0.02, 0.01), (0.9, 0.9, 0.88), (1, 0.97, 0.92)), lambda x: sat(x, 0.65))),
    ('pastel-reveur', 'Pastel rêveur', 'Ambiances', chaine(lambda x: delave(x, 0.1, 1.0), lambda x: split(x, (0.03, 0, 0.05), (0.03, 0.02, 0.02)), lambda x: sat(x, 0.8), lambda x: courbe(x, -3))),
    ('mat', 'Mat (noirs levés)', 'Ambiances', chaine(lambda x: delave(x, 0.09, 0.95), lambda x: courbe(x, 2), lambda x: sat(x, 0.9))),
    ('clair-lumineux', 'Clair et lumineux (réseaux)', 'Ambiances', chaine(lambda x: lgg(x, (0.02, 0.02, 0.02), (1.12, 1.12, 1.12)), lambda x: split(x, (0, 0, 0.02), (0.01, 0.01, 0)), lambda x: sat(x, 1.05))),
    ('editorial', 'Éditorial mode (désaturé)', 'Ambiances', chaine(lambda x: courbe(x, 4), lambda x: sat(x, 0.6), lambda x: split(x, (0, 0, 0.02), (0.02, 0.01, 0)))),
    ('gourmand', 'Gourmand (cuisine)', 'Ambiances', chaine(lambda x: lgg(x, (0.01, 0, 0), (1.06, 1.03, 0.98), (1.04, 1.01, 0.95)), lambda x: sat(x, 1.25), lambda x: courbe(x, 3))),
    ('neon-nuit', 'Nuit néon (magenta et cyan)', 'Stylisés', chaine(lambda x: split(x, (0.06, -0.04, 0.12), (-0.04, 0.06, 0.08)), lambda x: courbe(x, 5), lambda x: sat(x, 1.35))),
    ('cyberpunk', 'Cyberpunk', 'Stylisés', chaine(lambda x: mix(x, [[1.0, 0, 0.06], [0, 0.9, 0.08], [0.06, 0.08, 1.06]]), lambda x: split(x, (0.03, -0.03, 0.1), (0.02, 0.03, 0.05)), lambda x: courbe(x, 6))),
    ('horreur', 'Horreur (vert maladif)', 'Stylisés', chaine(lambda x: lgg(x, (0, 0.02, 0), (0.85, 0.95, 0.85), (0.9, 1, 0.85)), lambda x: sat(x, 0.45), lambda x: courbe(x, 6))),
    ('annees-60', 'Années 60 (jaune et vert)', 'Stylisés', chaine(lambda x: mix(x, [[0.9, 0.12, 0], [0.05, 0.95, 0], [0, 0.15, 0.75]]), lambda x: delave(x, 0.05, 0.95), lambda x: sat(x, 0.85))),
    ('nb-doux', 'Noir et blanc doux', 'Noir et blanc', chaine(lambda x: mono(x), lambda x: delave(x, 0.05, 0.97), lambda x: courbe(x, 2))),
    ('nb-contraste', 'Noir et blanc contrasté', 'Noir et blanc', chaine(lambda x: mono(x), lambda x: courbe(x, 9))),
    ('nb-chaud', 'Noir et blanc chaud', 'Noir et blanc', chaine(lambda x: mono(x, (1.04, 1, 0.9)), lambda x: courbe(x, 3))),
    ('cyanotype', 'Cyanotype (bleu)', 'Noir et blanc', chaine(lambda x: mono(x), lambda x: courbe(x, 3), lambda x: x * np.asarray([0.55, 0.78, 1.0]) + np.asarray([0.02, 0.06, 0.15]))),
]


def ecrire_lut(dest, nom, f):
    v = np.linspace(0, 1, N)
    b, g, r = np.meshgrid(v, v, v, indexing='ij')  # rouge varie le plus vite (norme .cube)
    x = np.stack([r.ravel(), g.ravel(), b.ravel()], axis=1)
    y = np.clip(f(x), 0, 1)
    with open(dest, 'w') as fh:
        fh.write(f'TITLE "{nom}"\n# QuentMovie, libre de droits\nLUT_3D_SIZE {N}\n')
        fh.write('\n'.join(f'{a:.4f} {c:.4f} {d:.4f}' for a, c, d in y))
        fh.write('\n')


# ====================== Calques animés ======================
TAILLE, IPS = 960, 30


def encoder(dest, images, duree, dim=None):
    p = subprocess.Popen([FFMPEG, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{dim[0]}x{dim[1]}' if dim else f'{TAILLE}x{TAILLE}', '-r', str(IPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dest], stdin=subprocess.PIPE)
    for k in range(int(duree * IPS)):
        im = images(k / IPS)
        p.stdin.write(np.asarray(im.convert('RGB'), dtype=np.uint8).tobytes())
    p.stdin.close()
    if p.wait():
        sys.exit('Échec de l’encodage de ' + dest)


def taches(couleurs, duree, base=96):
    """Fuites de lumière : taches colorées floues qui dérivent (boucle parfaite)."""
    rng = np.random.default_rng(len(couleurs) * 7 + int(duree))
    yy, xx = np.mgrid[0:base, 0:base] / base
    blobs = [(rng.uniform(0.1, 0.9), rng.uniform(0.1, 0.9), rng.uniform(0.15, 0.32), rng.integers(1, 3), rng.uniform(0, 6.28), c) for c in couleurs]

    def img(t):
        ph = 2 * math.pi * t / duree
        acc = np.zeros((base, base, 3))
        for cx, cy, r, m, p0, col in blobs:
            x = cx + 0.25 * math.sin(m * ph + p0)
            y = cy + 0.2 * math.cos(m * ph + p0 * 1.3)
            e = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * r * r)) * (0.75 + 0.25 * math.sin(ph * m + p0))
            acc += e[..., None] * np.asarray(col)
        acc = np.clip(acc, 0, 255).astype(np.uint8)
        return Image.fromarray(acc).resize((TAILLE, TAILLE), Image.BICUBIC)
    return img


def film_burn(duree):
    base = 96
    yy, xx = np.mgrid[0:base, 0:base] / base

    def img(t):
        p = t / duree
        env = math.sin(math.pi * min(1, p * 1.1)) ** 1.5
        r = 0.15 + 0.9 * p
        d = np.sqrt((xx - 0.25 - 0.3 * p) ** 2 + (yy - 0.6) ** 2 * 1.4)
        e = np.clip(1.3 - d / r, 0, 1) ** 1.6 * env * 1.4
        col = np.stack([255 * np.clip(e * 1.5, 0, 1), 255 * np.clip(e * 1.05 - 0.1, 0, 1), 255 * np.clip(e * 0.8 - 0.35, 0, 1)], -1)
        return Image.fromarray(col.astype(np.uint8)).resize((TAILLE, TAILLE), Image.BICUBIC)
    return img


def flare(duree):
    def img(t):
        p = (t / duree) % 1
        im = Image.new('RGB', (TAILLE, TAILLE))
        cx, cy = -0.2 * TAILLE + 1.4 * TAILLE * p, TAILLE * 0.35
        couche = Image.new('RGB', (TAILLE, TAILLE)); d = ImageDraw.Draw(couche)
        d.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=(255, 220, 170))
        d.rectangle([0, cy - 3, TAILLE, cy + 3], fill=(170, 140, 255))
        for k, (f, r, c) in enumerate([(0.4, 26, (90, 160, 255)), (0.7, 14, (120, 255, 170)), (1.2, 40, (255, 120, 90)), (1.6, 18, (180, 120, 255))]):
            gx, gy = TAILLE / 2 + (TAILLE / 2 - cx) * f, TAILLE / 2 + (TAILLE / 2 - cy) * f
            d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=tuple(int(v * 0.45) for v in c))
        im = couche.filter(ImageFilter.GaussianBlur(10))
        coeur = Image.new('RGB', (TAILLE, TAILLE)); ImageDraw.Draw(coeur).ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=(255, 250, 240))
        return Image.fromarray(np.clip(np.asarray(im, dtype=np.int32) + np.asarray(coeur.filter(ImageFilter.GaussianBlur(4)), dtype=np.int32), 0, 255).astype(np.uint8))
    return img


def particules(n, graine, duree, dessin, flou=0):
    """Particules en boucle parfaite : chaque particule fait un nombre entier de tours pendant la durée."""
    rng = np.random.default_rng(graine)
    P = [dict(x=rng.uniform(0, 1), y=rng.uniform(0, 1), k=int(rng.integers(1, 4)), a=rng.uniform(0.005, 0.04), m=int(rng.integers(1, 3)),
              ph=rng.uniform(0, 6.28), s=rng.uniform(0, 1), c=int(rng.integers(0, 1000))) for _ in range(n)]

    def img(t):
        u = t / duree
        im = Image.new('RGB', (TAILLE, TAILLE)); d = ImageDraw.Draw(im)
        for q in P:
            dessin(d, q, u)
        return im.filter(ImageFilter.GaussianBlur(flou)) if flou else im
    return img


def neige(d, q, u):
    y = ((q['y'] + q['k'] * u) % 1.1 - 0.05) * TAILLE
    x = (q['x'] + q['a'] * math.sin(2 * math.pi * q['m'] * u + q['ph'])) * TAILLE
    r = 1.5 + 4 * q['s'] ** 2; v = int(140 + 115 * q['s'])
    d.ellipse([x - r, y - r, x + r, y + r], fill=(v, v, v))


def pluie(d, q, u):
    y = ((q['y'] + (q['k'] + 3) * u) % 1.2 - 0.1) * TAILLE
    x = ((q['x'] - 0.15 * (q['k'] + 3) * u) % 1.2 - 0.1) * TAILLE
    l = 18 + 30 * q['s']; v = int(80 + 110 * q['s'])
    d.line([x, y, x - l * 0.15, y + l], fill=(v, v, int(v * 1.1)), width=1 + int(q['s'] > 0.7))


def etincelle(d, q, u):
    y = (1.05 - (q['y'] + q['k'] * u) % 1.1) * TAILLE
    x = (q['x'] + 2 * q['a'] * math.sin(2 * math.pi * q['m'] * u * 2 + q['ph'])) * TAILLE
    f = 0.5 + 0.5 * math.sin(2 * math.pi * (q['m'] * 6) * u + q['ph'])
    r = 2 + 3.5 * q['s']; c = (255, int(170 + 80 * q['s']), int(60 + 80 * q['s']))
    d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(int(v * (0.35 + 0.65 * f)) for v in c))


def poussiere(d, q, u):
    x = ((q['x'] + q['a'] * math.sin(2 * math.pi * q['m'] * u + q['ph'])) % 1) * TAILLE
    y = ((q['y'] + q['a'] * math.cos(2 * math.pi * q['m'] * u + q['ph'] * 1.7)) % 1) * TAILLE
    f = 0.5 + 0.5 * math.sin(2 * math.pi * 3 * q['m'] * u + q['ph'])
    r = 1 + 2 * q['s']; v = int((90 + 150 * q['s']) * (0.4 + 0.6 * f))
    d.ellipse([x - r, y - r, x + r, y + r], fill=(v, int(v * 0.95), int(v * 0.85)))


CONF = [(255, 70, 90), (255, 200, 40), (60, 200, 255), (120, 230, 110), (200, 110, 255), (255, 140, 60)]


def confetti(d, q, u):
    y = ((q['y'] + q['k'] * u) % 1.15 - 0.08) * TAILLE
    x = (q['x'] + 1.5 * q['a'] * math.sin(2 * math.pi * q['m'] * u + q['ph'])) * TAILLE
    ang = 2 * math.pi * (q['m'] * 2 * u) + q['ph']; w, h = 9 + 6 * q['s'], 5 + 3 * q['s'] * abs(math.cos(ang * 1.3))
    ca, sa = math.cos(ang), math.sin(ang)
    pts = [(x + ca * px - sa * py, y + sa * px + ca * py) for px, py in [(-w, -h), (w, -h), (w, h), (-w, h)]]
    d.polygon(pts, fill=CONF[q['c'] % len(CONF)])


def coeur_forme(cx, cy, r):
    pts = []
    for k in range(40):
        a = 2 * math.pi * k / 40
        pts.append((cx + r * 16 * math.sin(a) ** 3 / 16, cy - r * (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)) / 16))
    return pts


def coeur(d, q, u):
    y = (1.1 - (q['y'] + q['k'] * u) % 1.2) * TAILLE
    x = (q['x'] + 1.5 * q['a'] * math.sin(2 * math.pi * q['m'] * u + q['ph'])) * TAILLE
    r = 10 + 22 * q['s']
    d.polygon(coeur_forme(x, y, r), fill=[(255, 80, 120), (255, 140, 170), (230, 40, 80)][q['c'] % 3])


def etoile(d, q, u):
    x, y = q['x'] * TAILLE, q['y'] * TAILLE
    f = max(0, math.sin(2 * math.pi * (q['m'] * 2) * u + q['ph'])) ** 3
    r = (6 + 18 * q['s']) * f
    if r < 0.5:
        return
    v = (255, 245, 210)
    d.polygon([(x, y - r), (x + r * 0.18, y - r * 0.18), (x + r, y), (x + r * 0.18, y + r * 0.18), (x, y + r), (x - r * 0.18, y + r * 0.18), (x - r, y), (x - r * 0.18, y - r * 0.18)], fill=v)


def bokeh(duree):
    rng = np.random.default_rng(5)
    B = [(rng.uniform(0, 1), rng.uniform(0, 1), rng.uniform(25, 75), int(rng.integers(1, 3)), rng.uniform(0, 6.28), [(255, 200, 110), (255, 240, 210), (255, 160, 90), (200, 220, 255)][int(rng.integers(0, 4))]) for _ in range(26)]
    base = TAILLE // 2

    def img(t):
        u = t / duree
        acc = Image.new('RGBA', (base, base), (0, 0, 0, 255))
        for x, y, r, m, ph, c in B:
            cx = (x + 0.05 * math.sin(2 * math.pi * m * u + ph)) * base; cy = (y + 0.05 * math.cos(2 * math.pi * m * u + ph)) * base
            a = int(60 + 60 * (0.5 + 0.5 * math.sin(2 * math.pi * m * u + ph * 2)))
            l = Image.new('RGBA', (base, base), (0, 0, 0, 0)); dl = ImageDraw.Draw(l)
            rr = r / 2; dl.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=c + (a,), outline=c + (min(255, a + 60),), width=2)
            acc = Image.alpha_composite(acc, l)
        return acc.convert('RGB').filter(ImageFilter.GaussianBlur(2.5)).resize((TAILLE, TAILLE), Image.BICUBIC)
    return img


def vieux_film(duree):
    rng = np.random.default_rng(12)

    def img(t):
        im = Image.new('RGB', (TAILLE, TAILLE)); d = ImageDraw.Draw(im)
        for _ in range(int(rng.integers(6, 22))):
            x, y, r = rng.uniform(0, TAILLE), rng.uniform(0, TAILLE), rng.uniform(0.8, 3.5)
            v = int(rng.uniform(120, 255)); d.ellipse([x - r, y - r, x + r, y + r], fill=(v, v, v))
        if rng.uniform() < 0.35:  # poil ou fibre
            x, y = rng.uniform(0, TAILLE), rng.uniform(0, TAILLE)
            pts = [(x + 25 * math.sin(k * 0.6 + x), y + k * 6) for k in range(int(rng.integers(5, 14)))]
            d.line(pts, fill=(200, 200, 200), width=2)
        for _ in range(int(rng.integers(0, 3))):  # rayures verticales
            x = rng.uniform(0, TAILLE); v = int(rng.uniform(90, 200))
            d.line([x, 0, x + rng.uniform(-4, 4), TAILLE], fill=(v, v, v), width=1)
        f = int(rng.uniform(0, 14))  # scintillement de la lumière du projecteur
        a = np.asarray(im, dtype=np.int32) + f
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return img


def vhs(duree):
    rng = np.random.default_rng(31)
    lignes = np.zeros((TAILLE, TAILLE, 3), dtype=np.int32)
    lignes[::4] = 18

    def img(t):
        u = t / duree
        a = lignes.copy()
        yb = int(((u * 2) % 1) * TAILLE * 1.3 - TAILLE * 0.15)  # bande de défilement
        for y in range(max(0, yb), min(TAILLE, yb + 36)):
            a[y] += (rng.uniform(20, 90, (TAILLE, 1)) * (rng.uniform(size=(TAILLE, 1)) < 0.5)).astype(np.int32)
        for _ in range(int(rng.integers(2, 9))):
            y, x, l = int(rng.uniform(0, TAILLE)), int(rng.uniform(0, TAILLE)), int(rng.uniform(20, 160))
            a[y:y + 2, x:x + l] += int(rng.uniform(80, 200))
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return img


def fumee(duree, couleur=(235, 235, 240)):
    rng = np.random.default_rng(44)
    b = 128
    spec = np.fft.fft2(rng.normal(size=(b, b)))
    fy, fx = np.meshgrid(np.fft.fftfreq(b), np.fft.fftfreq(b), indexing='ij')
    tex = np.real(np.fft.ifft2(spec / (1e-3 + (fx ** 2 + fy ** 2) ** 1.1)))  # bruit doux qui se répète (boucle parfaite)
    tex = (tex - tex.min()) / (tex.max() - tex.min())

    def img(t):
        u = t / duree
        s = np.roll(np.roll(tex, int(u * b), axis=1), int(u * b * 0), axis=0) * 0.6 + np.roll(tex.T, -int(u * b * 2), axis=1) * 0.4
        v = np.clip((s - 0.35) * 1.6, 0, 1) ** 1.4 * 0.75
        rgb = (v[..., None] * np.asarray(couleur)).astype(np.uint8)
        return Image.fromarray(rgb).resize((TAILLE, TAILLE), Image.BICUBIC)
    return img


# ---- Calques de transition (à poser sur une coupe, mode écran : le noir disparaît, le pic cache le raccord au milieu) ----
# Images 16:9 en 1280×720 (jamais étirées), dégradés de couleur « pellicule », grain fin ; chaque calque est symétrique autour de son milieu.
LW, LH = 1280, 720


def _env(p, largeur=0.16):
    return math.exp(-((p - 0.5) / largeur) ** 2)


def _rampe(i, pts):
    """Intensité (0..1) → couleur, par interpolation entre points (intensité, (r,g,b))."""
    i = np.clip(i, 0, 1)[..., None]
    out = np.zeros(i.shape[:-1] + (3,))
    for (x0, c0), (x1, c1) in zip(pts[:-1], pts[1:]):
        m = ((i >= x0) & (i <= x1))[..., 0]
        t = np.clip((i[..., 0] - x0) / (x1 - x0), 0, 1)[..., None]
        out[m] = (np.asarray(c0) * (1 - t) + np.asarray(c1) * t)[m]
    return out


def _grain(a, graine, force=7):
    r = np.random.default_rng(graine)
    g = r.normal(0, force, a.shape[:2])[..., None]
    return a + g * np.clip(a.max(-1, keepdims=True) / 255 * 1.6, 0, 1)


def _img(a, graine=0):
    return Image.fromarray(np.clip(_grain(a, graine), 0, 255).astype(np.uint8))


def _fond16():
    yy, xx = np.mgrid[0:LH, 0:LW].astype(np.float32)
    return xx / LW, yy / LH


RAMPE_CHAUDE = [(0, (0, 0, 0)), (0.25, (150, 20, 10)), (0.5, (255, 90, 20)), (0.75, (255, 190, 80)), (1, (255, 250, 225))]
RAMPE_ROSE = [(0, (0, 0, 0)), (0.3, (120, 20, 110)), (0.55, (255, 60, 150)), (0.8, (255, 170, 190)), (1, (255, 245, 245))]
RAMPE_BLEUE = [(0, (0, 0, 0)), (0.3, (10, 40, 140)), (0.55, (40, 130, 255)), (0.8, (150, 210, 255)), (1, (240, 250, 255))]
RAMPE_DOREE = [(0, (0, 0, 0)), (0.3, (140, 70, 0)), (0.55, (255, 170, 30)), (0.8, (255, 225, 140)), (1, (255, 250, 230))]


def t_fuite(rampe, graine, derive=1.0):
    """Fuite de lumière : grosses taches floues qui dérivent, colorées par une rampe chaud-clair, plus un voile vertical."""
    rng = np.random.default_rng(graine)
    xx, yy = _fond16()
    blobs = [(rng.uniform(0.0, 1.0), rng.uniform(0.1, 0.9), rng.uniform(0.18, 0.34), rng.uniform(-1, 1), rng.uniform(0.6, 1.0)) for _ in range(4)]

    def img(t, duree):
        p = t / duree
        env = _env(p, 0.2)
        i = np.zeros((LH, LW), dtype=np.float32)
        for cx, cy, r, v, w in blobs:
            x = cx + derive * v * 0.25 * (p - 0.5)
            i += w * np.exp(-(((xx - x) * 1.3) ** 2 + ((yy - cy) * 0.9) ** 2) / (2 * r * r))
        i += 0.35 * np.exp(-((xx - (0.2 + 0.6 * p)) ** 2) / 0.02)  # voile vertical qui traverse
        i = i * env * 0.95
        return _img(_rampe(i, rampe), int(t * 30) + graine)
    return lambda duree: (lambda t: img(t, duree))


def _fbm(base, graine, octaves=4):
    r = np.random.default_rng(graine)
    tot = np.zeros((LH, LW), dtype=np.float32); amp = 1.0; n = 0
    for o in range(octaves):
        g = r.random((base * 2 ** o, int(base * 2 ** o * LW / LH)))
        tot += amp * np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((LW, LH), Image.BICUBIC), dtype=np.float32) / 255
        n += amp; amp *= 0.5
    return tot / n


def t_brulure(duree):
    """Brûlure de pellicule : bord organique (bruit fractal) qui avance depuis un coin, centre blanc, orange, rouge, noir."""
    xx, yy = _fond16()
    bruit = _fbm(4, 21)
    d = np.sqrt((xx - 0.18) ** 2 + ((yy - 0.75) * 0.75) ** 2)

    def img(t):
        p = t / duree
        env = _env(p, 0.2)
        front = 0.05 + 0.85 * math.sin(math.pi * p) ** 1.1
        i = np.clip((front - d + (bruit - 0.5) * 0.8) * 2.2, 0, 1) * (0.55 + 0.45 * env)
        flick = 0.9 + 0.1 * math.sin(t * 90) * math.sin(t * 37)
        return _img(_rampe(i * flick * (0.4 + 0.6 * env), RAMPE_CHAUDE), int(t * 30) + 5)
    return img


def t_flash_pro(couleur, halo=0.5):
    """Flash : montée rapide jusqu'au pic exactement au milieu, retombée plus lente, halo central et fine ligne horizontale (anamorphique)."""
    xx, yy = _fond16()
    d = np.sqrt(((xx - 0.5) * 1.25) ** 2 + (yy - 0.5) ** 2)
    ligne = np.exp(-((yy - 0.5) ** 2) / 0.00035) * np.exp(-((xx - 0.5) ** 2) / 0.18)

    def img(t, duree):
        p = t / duree
        e = math.exp(-((p - 0.5) / (0.1 if p < 0.5 else 0.17)) ** 2)
        i = e * (0.7 + 0.5 * np.clip(1 - d * (1.1 - halo * 0.4), 0, 1)) + ligne * e * 0.9
        col = np.clip(i, 0, 1)[..., None] * np.asarray(couleur)
        return _img(col + np.clip(i - 1, 0, 1)[..., None] * 60, int(t * 30) + 9)
    return lambda duree: (lambda t: img(t, duree))


def t_ana(rampe):
    return lambda duree: t_anamorphique(duree, rampe)


def t_anamorphique(duree, rampe=None):
    """Reflet anamorphique : longue traînée bleue horizontale qui traverse l'image, avec un cœur blanc et quelques reflets d'objectif."""
    xx, yy = _fond16()

    def img(t):
        p = t / duree
        cx = -0.15 + 1.3 * (p * p * (3 - 2 * p))
        env = _env(p, 0.28)
        trace = np.exp(-((yy - 0.45) ** 2) / 0.0006) * np.exp(-((xx - cx) ** 2) / 0.05)
        halo = np.exp(-(((xx - cx) * 1.3) ** 2 + (yy - 0.45) ** 2) / 0.012)
        orbes = 0.0
        for f, r, w in ((0.35, 0.05, 0.25), (0.7, 0.03, 0.2), (-0.4, 0.08, 0.12)):
            ox = 0.5 + (0.5 - cx) * f; oy = 0.45 + (0.5 - 0.45) * f * 0.3
            orbes = orbes + w * np.exp(-(((xx - ox) * 1.4) ** 2 + (yy - oy) ** 2) / (2 * r * r))
        i = (trace * 1.0 + halo * 0.8 + orbes) * (0.35 + 0.65 * env)
        return _img(_rampe(np.clip(i, 0, 1.4) / 1.4, rampe or RAMPE_BLEUE), int(t * 30) + 2)
    return img


def t_onde(duree):
    """Onde de choc : anneau fin lumineux qui s'élargit en s'estompant, deuxième anneau plus faible, éclair au départ."""
    xx, yy = _fond16()
    d = np.sqrt(((xx - 0.5) * 1.78) ** 2 + (yy - 0.5) ** 2)

    def img(t):
        p = t / duree
        r1 = 0.04 + 1.15 * p ** 0.75; r2 = max(0, 0.04 + 1.15 * (p - 0.12) ** 0.75) if p > 0.12 else 0
        a = np.exp(-((d - r1) ** 2) / (2 * (0.012 + 0.04 * p) ** 2)) * (1 - p) ** 1.2
        b = np.exp(-((d - r2) ** 2) / (2 * (0.01 + 0.03 * p) ** 2)) * (1 - p) ** 1.6 * 0.5 if r2 else 0
        eclair = math.exp(-p * 9) * np.clip(1 - d * 1.2, 0, 1) * 0.8
        i = np.clip(a * 1.1 + b + eclair, 0, 1)
        return _img(_rampe(i, [(0, (0, 0, 0)), (0.4, (60, 80, 140)), (0.75, (200, 220, 255)), (1, (255, 255, 255))]), int(t * 30) + 4)
    return img


def t_rayons(duree):
    """Rayons lumineux : faisceaux fondus qui jaillissent du centre, comme un halo de projecteur."""
    xx, yy = _fond16()
    ang = np.arctan2((yy - 0.5), (xx - 0.5) * 1.78)
    d = np.sqrt(((xx - 0.5) * 1.78) ** 2 + (yy - 0.5) ** 2)
    rays = (0.5 + 0.5 * np.sin(ang * 9 + 0.7)) ** 3 * 0.8 + (0.5 + 0.5 * np.sin(ang * 23)) ** 5 * 0.5

    def img(t):
        p = t / duree
        e = _env(p, 0.22)
        i = np.clip((rays * np.clip(d * 1.6 - 0.1, 0, 1) * (1.1 - np.clip(d - 0.2, 0, 1) * 0.5) + 0.5 * np.exp(-d * d * 7)) * e, 0, 1)
        return _img(_rampe(i, RAMPE_DOREE), int(t * 30) + 6)
    return img


def t_tracking(duree):
    """Déformation VHS : quelques bandes de bruit qui montent et un voile de lignes, pic au milieu."""
    xx, yy = _fond16()

    def img(t):
        p = t / duree
        e = _env(p, 0.25)
        r = np.random.default_rng(int(t * 30) * 17 + 3)
        a = np.zeros((LH, LW, 3))
        for k in range(3):
            y0 = (0.9 - 0.8 * ((p * (0.7 + 0.3 * k) + 0.3 * k) % 1.0)); h = 0.015 + 0.025 * r.random()
            m = np.exp(-((yy - y0) ** 2) / (2 * h * h))[..., None]
            a += m * (r.random((LH, LW, 1)) * 200 + 25) * e
        lignes = (0.5 + 0.5 * np.sin(yy * LH * 1.6))[..., None] * 18 * e
        a += lignes + np.exp(-((yy - 0.5) ** 2) / 0.02)[..., None] * 12 * e
        return _img(np.clip(a, 0, 255), int(t * 30) + 8)
    return img


RAMPE_CYAN = [(0, (0, 0, 0)), (0.3, (0, 60, 90)), (0.55, (20, 190, 255)), (0.8, (170, 240, 255)), (1, (245, 255, 255))]


def t_grille(duree):
    """Grille numérique : lignes en perspective qui s'allument avec un balayage lumineux, pic au milieu."""
    xx, yy = _fond16()

    def img(t):
        p = t / duree
        e = _env(p, 0.25)
        h = np.clip((yy - 0.38) / 0.62, 0.001, 1)
        persp = (xx - 0.5) / h * 0.9
        vert = np.exp(-((np.abs(((persp * 6) % 1) - 0.5) - 0.5) ** 2) / 0.0009) * (yy > 0.38)
        horiz = np.exp(-((((1 / h) * 0.9 + p * 2) % 1) - 0.5) ** 2 / 0.002) * (yy > 0.38)
        balayage = np.exp(-((yy - (0.38 + 0.62 * p)) ** 2) / 0.0006) * 0.9
        i = np.clip((0.55 * (vert + horiz) * (0.35 + h) + balayage) * e * 1.4, 0, 1)
        i += 0.25 * e * np.exp(-((yy - 0.38) ** 2) / 0.002)
        return _img(_rampe(i, RAMPE_CYAN), int(t * 30) + 14)
    return img


def t_donnees(duree):
    """Flux de données : colonnes de points qui tombent à des vitesses différentes, cyan et blanc."""
    xx, yy = _fond16()
    r = np.random.default_rng(31)
    cols = 70
    vit = r.uniform(0.6, 1.8, cols); dec = r.uniform(0, 1, cols); lon = r.uniform(0.08, 0.3, cols)

    def img(t):
        p = t / duree
        e = _env(p, 0.3)
        i = np.zeros((LH, LW), dtype=np.float32)
        ci = np.clip((xx * cols).astype(int), 0, cols - 1)
        tete = (dec[ci] + p * vit[ci]) % 1.2 - 0.1
        d = tete - yy
        i = np.where((d >= 0) & (d < lon[ci]), (1 - d / lon[ci]) ** 1.5, 0.0)
        gap = np.abs(((xx * cols) % 1) - 0.5) < 0.3
        i = i * gap * e * 1.2
        return _img(_rampe(np.clip(i, 0, 1), RAMPE_CYAN), int(t * 30) + 15)
    return img


def t_grain16(duree):
    """Grain de pellicule 16 mm : bruit fin changeant à chaque image, léger flottement de lumière, boucle (mode écran, faible opacité)."""
    def img(t):
        r = np.random.default_rng(int(t * 24) % 96 * 7 + 1)
        g = r.normal(0.0, 1.0, (LH // 2, LW // 2)).astype(np.float32)
        g = np.asarray(Image.fromarray(np.clip(128 + g * 38, 0, 255).astype(np.uint8)).resize((LW, LH), Image.BILINEAR), dtype=np.float32)
        lum = 0.92 + 0.08 * math.sin(t * 9) * math.sin(t * 3.1)
        v = np.clip((g - 90) * 0.9, 0, 255) * lum
        return Image.fromarray(np.stack([v * 1.0, v * 0.97, v * 0.9], -1).astype(np.uint8))
    return img


def t_fenetre(duree):
    """Rayons de fenêtre : faisceaux chauds et doux en diagonale qui dérivent lentement, boucle parfaite."""
    xx, yy = _fond16()

    def img(t):
        p = (t / duree) * 2 * math.pi
        i = np.zeros((LH, LW), dtype=np.float32)
        for k, (cx, w, ph) in enumerate(((0.25, 0.05, 0.0), (0.45, 0.035, 1.7), (0.62, 0.06, 3.1), (0.8, 0.03, 4.4))):
            x = cx + 0.03 * math.sin(p + ph)
            i += (0.55 + 0.45 * math.sin(p * 1 + ph * 0.7)) * np.exp(-(((xx - 0.35 * yy) - x) ** 2) / (2 * w * w))
        i *= np.clip(1.15 - yy * 0.8, 0, 1)
        return _img(_rampe(np.clip(i * 0.8, 0, 1), RAMPE_CHAUDE), int(t * 24) % 120 + 3)
    return img


CALQUES = [
    # id, nom, catégorie, durée, générateur
    ('fuite-chaude', 'Fuite de lumière chaude', 'Lumière', 6, lambda d: taches([(255, 120, 30), (255, 60, 20), (255, 200, 80)], d)),
    ('fuite-rose', 'Fuite de lumière rose', 'Lumière', 6, lambda d: taches([(255, 60, 140), (200, 60, 255), (255, 150, 120)], d)),
    ('fuite-bleue', 'Fuite de lumière bleue', 'Lumière', 6, lambda d: taches([(40, 120, 255), (60, 220, 255), (150, 80, 255)], d)),
    ('fuite-doree', 'Fuite de lumière dorée', 'Lumière', 6, lambda d: taches([(255, 190, 60), (255, 230, 150), (255, 150, 40)], d)),
    ('brulure-film', 'Brûlure de pellicule (transition)', 'Lumière', 3, film_burn),
    ('flare', 'Reflet d’objectif (flare)', 'Lumière', 4, flare),
    ('bokeh', 'Bokeh doré', 'Lumière', 6, bokeh),
    ('neige', 'Neige', 'Météo et particules', 6, lambda d: particules(260, 1, d, neige, 0.6)),
    ('pluie', 'Pluie', 'Météo et particules', 3, lambda d: particules(220, 2, d, pluie)),
    ('etincelles', 'Étincelles qui montent', 'Météo et particules', 6, lambda d: particules(160, 3, d, etincelle, 0.5)),
    ('poussiere', 'Poussière dans la lumière', 'Météo et particules', 6, lambda d: particules(160, 4, d, poussiere, 1.2)),
    ('confettis', 'Confettis', 'Fête et vlog', 4, lambda d: particules(140, 5, d, confetti)),
    ('coeurs', 'Cœurs qui montent', 'Fête et vlog', 6, lambda d: particules(28, 6, d, coeur, 0.6)),
    ('etoiles', 'Étoiles scintillantes', 'Fête et vlog', 4, lambda d: particules(45, 7, d, etoile, 0.7)),
    ('vieux-film', 'Vieux film (poussière et rayures)', 'Rétro', 4, vieux_film),
    ('vhs', 'Parasites VHS', 'Rétro', 4, vhs),
    ('fumee', 'Fumée et brouillard', 'Rétro', 8, fumee),
    ('tr-fuite-chaude', 'Fuite de lumière chaude (coupe)', 'Transitions (sur la coupe)', 1.4, t_fuite(RAMPE_CHAUDE, 3)),
    ('tr-fuite-rose', 'Fuite de lumière rose (coupe)', 'Transitions (sur la coupe)', 1.4, t_fuite(RAMPE_ROSE, 8)),
    ('tr-fuite-doree', 'Fuite de lumière dorée (coupe)', 'Transitions (sur la coupe)', 1.4, t_fuite(RAMPE_DOREE, 5)),
    ('tr-brulure', 'Brûlure de pellicule (coupe)', 'Transitions (sur la coupe)', 1.4, t_brulure),
    ('tr-flash', 'Flash blanc', 'Transitions (sur la coupe)', 0.8, t_flash_pro((255, 255, 255))),
    ('tr-flash-chaud', 'Flash chaud', 'Transitions (sur la coupe)', 0.8, t_flash_pro((255, 205, 140), 0.8)),
    ('tr-flash-bleu', 'Flash bleu glacé', 'Transitions (sur la coupe)', 0.8, t_flash_pro((150, 195, 255), 0.8)),
    ('tr-anamorphique', 'Reflet anamorphique bleu', 'Transitions (sur la coupe)', 1.2, t_anamorphique),
    ('tr-soleil', 'Reflet de soleil doré', 'Transitions (sur la coupe)', 1.2, t_ana(RAMPE_DOREE)),
    ('tr-fuite-bleue', 'Fuite de lumière bleue (coupe)', 'Transitions (sur la coupe)', 1.4, t_fuite(RAMPE_BLEUE, 12)),
    ('tr-grille', 'Grille numérique', 'Transitions (sur la coupe)', 1.2, t_grille),
    ('tr-donnees', 'Flux de données', 'Transitions (sur la coupe)', 1.2, t_donnees),
    ('grain-16mm', 'Grain de pellicule 16 mm', 'Rétro', 4, t_grain16),
    ('rayons-fenetre', 'Rayons de fenêtre (lumière douce)', 'Lumière', 8, t_fenetre),
    ('tr-onde', 'Onde de choc', 'Transitions (sur la coupe)', 1.0, t_onde),
    ('tr-rayons', 'Rayons lumineux', 'Transitions (sur la coupe)', 1.0, t_rayons),
    ('tr-tracking', 'Déformation VHS', 'Transitions (sur la coupe)', 1.0, t_tracking),
]


# ====================== Cadres ======================
def cadre(w, h, dessin):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    dessin(im, ImageDraw.Draw(im), w, h)
    return im


def texte(d, xy, txt, taille, couleur=(255, 255, 255, 255), nom='mono', ombre=True, ancre='la'):
    f = police(nom, taille)
    if ombre:
        d.text((xy[0] + 3, xy[1] + 3), txt, font=f, fill=(0, 0, 0, 160), anchor=ancre)
    d.text(xy, txt, font=f, fill=couleur, anchor=ancre)


def c_vhs(im, d, w, h):
    u = min(w, h) / 100
    for y in range(0, h, 4):
        d.line([0, y, w, y], fill=(0, 0, 0, 28))
    texte(d, (6 * u, 6 * u), 'PLAY ▶', int(6 * u))
    texte(d, (w - 6 * u, 6 * u), 'SP', int(6 * u), ancre='ra')
    texte(d, (6 * u, h - 6 * u), 'CH 03', int(4.5 * u), ancre='ld')
    texte(d, (w - 6 * u, h - 6 * u), '00:00:00', int(4.5 * u), ancre='rd')


def c_viseur(im, d, w, h):
    u = min(w, h) / 100; m, l, e = 5 * u, 9 * u, max(3, int(0.6 * u))
    for (x, y, sx, sy) in [(m, m, 1, 1), (w - m, m, -1, 1), (m, h - m, 1, -1), (w - m, h - m, -1, -1)]:
        d.line([x, y, x + sx * l, y], fill='white', width=e); d.line([x, y, x, y + sy * l], fill='white', width=e)
    d.ellipse([m + 3 * u, m + 3 * u, m + 6.5 * u, m + 6.5 * u], fill=(235, 30, 40, 255))
    texte(d, (m + 8 * u, m + 2.6 * u), 'REC', int(4.5 * u), nom='gras')
    bx, by = w - m - 17 * u, m + 3 * u
    d.rectangle([bx, by, bx + 10 * u, by + 4.5 * u], outline='white', width=max(2, int(0.4 * u)))
    d.rectangle([bx + 10 * u, by + 1.3 * u, bx + 11 * u, by + 3.2 * u], fill='white')
    d.rectangle([bx + 1 * u, by + 1 * u, bx + 7 * u, by + 3.5 * u], fill='white')
    c = (w / 2, h / 2); k = 2.5 * u
    d.line([c[0] - k, c[1], c[0] + k, c[1]], fill=(255, 255, 255, 200), width=max(2, int(0.3 * u)))
    d.line([c[0], c[1] - k, c[0], c[1] + k], fill=(255, 255, 255, 200), width=max(2, int(0.3 * u)))
    texte(d, (w - m - 3 * u, h - m - 3 * u), '4K · 30', int(3.6 * u), ancre='rd')
    texte(d, (m + 3 * u, h - m - 3 * u), '00:00:00:00', int(3.6 * u), ancre='ld')


def c_cinema(im, d, w, h):
    b = (h - w / 2.39) / 2 if w > h else h * 0.12
    d.rectangle([0, 0, w, b], fill=(0, 0, 0, 255)); d.rectangle([0, h - b, w, h], fill=(0, 0, 0, 255))


def c_polaroid(im, d, w, h):
    u = min(w, h) / 100; c = (250, 248, 240, 255)
    l, t, r, bas = 6 * u, 6 * u, 6 * u, 20 * u
    d.rectangle([0, 0, w, t], fill=c); d.rectangle([0, h - bas, w, h], fill=c); d.rectangle([0, 0, l, h], fill=c); d.rectangle([w - r, 0, w, h], fill=c)
    d.rectangle([l, t, w - r, h - bas], outline=(0, 0, 0, 40), width=2)


def c_pellicule(im, d, w, h):
    horiz = w > h; u = min(w, h) / 100; e = 9 * u; c = (14, 12, 10, 255)
    if horiz:
        d.rectangle([0, 0, w, e], fill=c); d.rectangle([0, h - e, w, h], fill=c)
        for x in np.arange(2 * u, w, 7 * u):
            for y in (2.5 * u, h - e + 2.5 * u):
                d.rounded_rectangle([x, y, x + 4 * u, y + 4 * u], radius=u, fill=(235, 230, 215, 230))
    else:
        d.rectangle([0, 0, e, h], fill=c); d.rectangle([w - e, 0, w, h], fill=c)
        for y in np.arange(2 * u, h, 7 * u):
            for x in (2.5 * u, w - e + 2.5 * u):
                d.rounded_rectangle([x, y, x + 4 * u, y + 4 * u], radius=u, fill=(235, 230, 215, 230))


def c_arrondi(im, d, w, h):
    u = min(w, h) / 100
    masque = Image.new('L', (w, h), 255); ImageDraw.Draw(masque).rounded_rectangle([3 * u, 3 * u, w - 3 * u, h - 3 * u], radius=7 * u, fill=0)
    im.paste((0, 0, 0, 255), (0, 0), masque)


def c_vignette(im, d, w, h):
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a = (np.clip((r - 0.55) / 0.85, 0, 1) ** 1.6 * 235).astype(np.uint8)
    im.putalpha(Image.fromarray(a))


def c_tv(im, d, w, h):
    u = min(w, h) / 100
    masque = Image.new('L', (w, h), 255); ImageDraw.Draw(masque).rounded_rectangle([7 * u, 7 * u, w - 7 * u, h - 7 * u], radius=9 * u, fill=0)
    im.paste((38, 34, 30, 255), (0, 0), masque)
    d.rounded_rectangle([7 * u, 7 * u, w - 7 * u, h - 7 * u], radius=9 * u, outline=(10, 10, 10, 255), width=int(1.2 * u))
    d.rounded_rectangle([2 * u, 2 * u, w - 2 * u, h - 2 * u], radius=4 * u, outline=(70, 64, 58, 255), width=int(0.6 * u))


def c_direct(im, d, w, h):
    u = min(w, h) / 100; e = max(4, int(0.8 * u))
    d.rectangle([0, 0, w - 1, h - 1], outline=(220, 20, 40, 255), width=e)
    f = police('gras', int(4.2 * u)); txt = 'EN DIRECT'; b = d.textbbox((0, 0), txt, font=f)
    x0, y0 = 5 * u, 5 * u; pw, ph = b[2] - b[0] + 9 * u, b[3] - b[1] + 3 * u
    d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], radius=u, fill=(220, 20, 40, 255))
    d.ellipse([x0 + 1.6 * u, y0 + ph / 2 - 1.1 * u, x0 + 3.8 * u, y0 + ph / 2 + 1.1 * u], fill='white')
    d.text((x0 + 5.5 * u, y0 + ph / 2), txt, font=f, fill='white', anchor='lm')


def c_dore(im, d, w, h):
    u = min(w, h) / 100; or_ = (214, 175, 80, 255)
    d.rectangle([3 * u, 3 * u, w - 3 * u, h - 3 * u], outline=or_, width=max(3, int(0.5 * u)))
    d.rectangle([4.4 * u, 4.4 * u, w - 4.4 * u, h - 4.4 * u], outline=or_, width=max(2, int(0.2 * u)))
    for (x, y) in [(3 * u, 3 * u), (w - 3 * u, 3 * u), (3 * u, h - 3 * u), (w - 3 * u, h - 3 * u)]:
        d.regular_polygon((x, y, 1.6 * u), 4, rotation=45, fill=or_)


CADRES = [
    ('vhs', 'Cassette VHS', c_vhs), ('viseur', 'Viseur de caméra (REC)', c_viseur), ('cinema', 'Bandes cinéma', c_cinema),
    ('polaroid', 'Photo instantanée', c_polaroid), ('pellicule', 'Pellicule photo', c_pellicule), ('arrondi', 'Coins arrondis', c_arrondi),
    ('vignette', 'Vignettage sombre', c_vignette), ('tv', 'Vieux téléviseur', c_tv), ('direct', 'En direct', c_direct), ('dore', 'Cadre doré', c_dore),
]


def main():
    seul = set(sys.argv[1:])  # ex. : « luts cadres » pour ne regénérer qu'une partie
    idx_f = os.path.join(RACINE, 'index.json')
    index = json.load(open(idx_f, encoding='utf8')) if os.path.exists(idx_f) else {}

    if not seul or 'luts' in seul:
        os.makedirs(os.path.join(RACINE, 'luts'), exist_ok=True)
        index['luts'] = []
        for id_, nom, cat, f in LUTS:
            ecrire_lut(os.path.join(RACINE, 'luts', id_ + '.cube'), nom, f)
            index['luts'].append({'id': id_, 'nom': nom, 'cat': cat, 'file': f'luts/{id_}.cube'})
        print(len(LUTS), 'looks')

    if not seul or 'cadres' in seul:
        os.makedirs(os.path.join(RACINE, 'cadres'), exist_ok=True)
        index['cadres'] = []
        for id_, nom, f in CADRES:
            cadre(1920, 1080, f).save(os.path.join(RACINE, 'cadres', id_ + '-h.png'), optimize=True)
            cadre(1080, 1920, f).save(os.path.join(RACINE, 'cadres', id_ + '-v.png'), optimize=True)
            index['cadres'].append({'id': id_, 'nom': nom, 'cat': 'Cadres', 'file': f'cadres/{id_}-h.png'})
        print(len(CADRES), 'cadres')

    if not seul or 'calques' in seul:
        os.makedirs(os.path.join(RACINE, 'calques'), exist_ok=True)
        seuls = [x for x in os.environ.get('CALQUES_SEUL', '').split(',') if x]  # CALQUES_SEUL=id1,id2 : ne régénère que ceux-là, garde les autres
        index['calques'] = [x for x in index.get('calques', []) if seuls and x['id'] not in seuls] if seuls else []
        for id_, nom, cat, duree, gen in CALQUES:
            if seuls and id_ not in seuls:
                continue
            encoder(os.path.join(RACINE, 'calques', id_ + '.mp4'), gen(duree), duree, (LW, LH) if id_.startswith('tr-') or id_ in ('grain-16mm', 'rayons-fenetre') else None)
            index['calques'].append({'id': id_, 'nom': nom, 'cat': cat, 'file': f'calques/{id_}.mp4', 'duree': duree, 'mode': 'ecran'})
            print(' ', nom)
        print(len(CALQUES), 'calques animés')

    json.dump(index, open(idx_f, 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
