#!/usr/bin/env python3
"""Génère le pack « fond vert » de QuentMovie, créations originales sans droits :
- fonds/*-h.jpg, *-v.jpg : décors à mettre derrière une personne filmée sur fond vert (horizontal et vertical)
- fonds/*.mp4            : décors animés en boucle
- fondvert/*.mp4         : animations sur fond vert (bouton s'abonner, cloche, flèche…), le vert est retiré par QuentMovie
Usage : python3 scripts/generer-fonds.py   (numpy, Pillow et ffmpeg requis)
Met à jour les listes « fonds » et « fondvert » de bibliotheque/index.json."""
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bibliotheque')
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
GRAS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf']
VERT = (0, 255, 0)
IPS = 30


def police(taille):
    for p in GRAS:
        if os.path.exists(p):
            return ImageFont.truetype(p, int(taille))
    return ImageFont.load_default()


def degrade(w, h, haut, bas, axe='v'):
    t = np.linspace(0, 1, h if axe == 'v' else w)
    t = t[:, None] if axe == 'v' else t[None, :]
    a = np.asarray(haut, float)[None, None, :] * (1 - t[..., None]) + np.asarray(bas, float)[None, None, :] * t[..., None]
    return np.broadcast_to(a, (h, w, 3)).copy()


def img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def lueur(im, dessin, flou, force=1.0):
    """Ajoute une forme lumineuse floue (addition)."""
    c = Image.new('RGB', im.size); dessin(ImageDraw.Draw(c))
    c = c.filter(ImageFilter.GaussianBlur(flou))
    return img(np.asarray(im, float) + np.asarray(c, float) * force)


def bruit_doux(n, graine, pente=1.1):
    rng = np.random.default_rng(graine)
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing='ij')
    t = np.real(np.fft.ifft2(np.fft.fft2(rng.normal(size=(n, n))) / (1e-3 + (fx ** 2 + fy ** 2) ** pente)))
    return (t - t.min()) / (t.max() - t.min())


# ====================== Décors fixes ======================
def d_plateau(w, h):
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w * 0.5) / w) ** 2 + ((yy - h * 0.4) / h) ** 2)
    a = np.asarray([8, 20, 60], float) + np.asarray([30, 70, 160], float) * np.clip(1 - r * 1.6, 0, 1)[..., None]
    im = img(a); u = min(w, h)
    cx, cy = w * (0.72 if w > h else 0.5), h * (0.42 if w > h else 0.3)
    def globe(d):
        for k in range(1, 9):
            r = u * 0.05 * k; d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(40, 110, 220), width=2)
        for k in range(-3, 4):
            d.ellipse([cx - u * 0.4 * abs(math.cos(k * 0.4)), cy - u * 0.4, cx + u * 0.4 * abs(math.cos(k * 0.4)), cy + u * 0.4], outline=(30, 90, 200), width=2)
    im = lueur(im, globe, 2, 0.9)
    def raies(d):
        for k in range(7):
            y = h * (0.15 + 0.1 * k); d.line([0, y, w, y + h * 0.05], fill=(60, 140, 255), width=3)
    im = lueur(im, raies, 12, 0.5)
    def bureau(d):
        d.rectangle([0, h * 0.78, w, h], fill=(10, 30, 80)); d.line([0, h * 0.78, w, h * 0.78], fill=(120, 200, 255), width=6)
    return lueur(im, bureau, 3, 1)


def d_podcast(w, h):
    a = degrade(w, h, (34, 26, 24), (16, 12, 12)); im = img(a); d = ImageDraw.Draw(im); u = min(w, h)
    n = 7 if w > h else 4; pw = w / n
    for k in range(n):
        x = k * pw + pw * 0.1
        d.rectangle([x, h * 0.08, x + pw * 0.8, h * 0.72], fill=(44, 34, 30) if k % 2 else (52, 40, 34))
        for j in range(10):
            y = h * 0.08 + j * (h * 0.64 / 10); d.line([x, y, x + pw * 0.8, y], fill=(36, 28, 24), width=2)
    im = lueur(im, lambda d: d.ellipse([w * 0.3, -h * 0.2, w * 0.7, h * 0.5], fill=(150, 100, 60)), u * 0.12, 0.6)
    nx, ny, nr = (w * 0.8, h * 0.3, u * 0.09) if w > h else (w * 0.5, h * 0.22, u * 0.14)
    im = lueur(im, lambda d: d.ellipse([nx - nr, ny - nr, nx + nr, ny + nr], outline=(255, 60, 160), width=int(u * 0.012)), 14, 1.4)
    im = lueur(im, lambda d: d.ellipse([nx - nr, ny - nr, nx + nr, ny + nr], outline=(255, 180, 230), width=int(u * 0.004)), 2, 1)
    d = ImageDraw.Draw(im); d.rectangle([0, h * 0.8, w, h], fill=(30, 22, 18)); d.line([0, h * 0.8, w, h * 0.8], fill=(70, 50, 40), width=4)
    return im


def d_neon(w, h):
    yy, xx = np.mgrid[0:h, 0:w]
    t = (xx / w + yy / h) / 2
    cols = [np.array(c, float) for c in [(255, 60, 150), (130, 50, 230), (30, 90, 255)]]
    a = np.where(t[..., None] < 0.5, cols[0] * (1 - t[..., None] * 2) + cols[1] * t[..., None] * 2, cols[1] * (2 - t[..., None] * 2) + cols[2] * (t[..., None] * 2 - 1))
    n = np.asarray(Image.fromarray((bruit_doux(64, 3) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), float) / 255
    return img(a * (0.75 + 0.4 * n[..., None]))


def soleil_retro(im, w, h, cx, cy, r):
    m = Image.new('L', im.size, 0); dm = ImageDraw.Draw(m); dm.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    for k in range(6):  # bandes horizontales découpées dans le bas du soleil
        y = cy + r * (0.1 + 0.16 * k); dm.rectangle([cx - r, y, cx + r, y + r * 0.03 * (k + 1)], fill=0)
    s = img(degrade(w, h, (255, 230, 90), (255, 50, 140)))
    im.paste(s, (0, 0), m); return im


def grille(d, w, h, horizon, decalage=0.0, couleur=(255, 60, 200)):
    for k in range(-20, 21):
        d.line([w / 2 + k * w * 0.02, horizon, w / 2 + k * w * 0.25, h], fill=couleur, width=3)
    for k in range(18):
        p = ((k + decalage) / 18) ** 2.2; y = horizon + (h - horizon) * p
        d.line([0, y, w, y], fill=couleur, width=max(2, int(4 * p)))


def d_synthwave(w, h, decalage=0.0):
    horizon = h * (0.62 if w > h else 0.58)
    a = degrade(w, int(horizon), (20, 8, 60), (255, 80, 120)); ciel = img(a)
    im = Image.new('RGB', (w, h), (10, 0, 30)); im.paste(ciel, (0, 0))
    u = min(w, h); im = soleil_retro(im, w, h, w / 2, horizon - u * 0.18, u * 0.28)
    sol = Image.new('RGB', (w, h)); grille(ImageDraw.Draw(sol), w, h, horizon, decalage)
    sol = img(np.asarray(sol.filter(ImageFilter.GaussianBlur(3)), float) * 1.2 + np.asarray(sol, float))
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rectangle([0, horizon, w, h], fill=255)
    fond = img(degrade(w, h, (10, 0, 30), (40, 0, 70)))
    fond = img(np.asarray(fond, float) + np.asarray(sol, float)); im.paste(fond, (0, 0), m)
    ImageDraw.Draw(im).line([0, horizon, w, horizon], fill=(255, 150, 230), width=3)
    return im


def d_espace(w, h):
    n = max(w, h); b = bruit_doux(128, 9, 1.0)
    neb = np.asarray(Image.fromarray((b * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC), float)[:h, :w] / 255
    b2 = np.asarray(Image.fromarray((bruit_doux(128, 10, 1.0) * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC), float)[:h, :w] / 255
    a = np.zeros((h, w, 3)) + [4, 4, 14]
    a += (np.clip(neb - 0.45, 0, 1) ** 1.5 * 3)[..., None] * [180, 60, 200] + (np.clip(b2 - 0.5, 0, 1) ** 1.5 * 3)[..., None] * [40, 120, 255]
    im = img(a); d = ImageDraw.Draw(im); rng = np.random.default_rng(4)
    for _ in range(int(w * h / 2500)):
        x, y, r = rng.uniform(0, w), rng.uniform(0, h), rng.uniform(0.4, 1.8); v = int(rng.uniform(120, 255))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(v, v, min(255, v + 20)))
    return lueur(im, lambda d: [d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(255, 255, 255)) for x, y in rng.uniform(0, 1, (12, 2)) * [w, h]], 4, 1.2)


def d_studio_blanc(w, h):
    a = degrade(w, h, (250, 250, 252), (205, 206, 212)); im = img(a)
    return lueur(im, lambda d: d.ellipse([w * 0.25, h * 0.8, w * 0.75, h * 0.95], fill=(40, 40, 40)), 40, -0.6)


def bokeh_fond(w, h, fond_haut, fond_bas, couleurs, n, graine, flou):
    im = img(degrade(w, h, fond_haut, fond_bas)).convert('RGBA'); rng = np.random.default_rng(graine); u = min(w, h)
    for _ in range(n):
        x, y, r = rng.uniform(0, w), rng.uniform(0, h * 0.85), rng.uniform(0.03, 0.09) * u
        c = couleurs[int(rng.integers(0, len(couleurs)))]
        l = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(l).ellipse([x - r, y - r, x + r, y + r], fill=c + (int(rng.uniform(60, 150)),))
        im = Image.alpha_composite(im, l)
    return im.convert('RGB').filter(ImageFilter.GaussianBlur(flou))


def d_bureau(w, h):
    im = bokeh_fond(w, h, (70, 50, 36), (40, 30, 24), [(255, 200, 120), (255, 170, 90), (255, 235, 190)], 40, 2, 10)
    d = ImageDraw.Draw(im); d.rectangle([0, h * 0.82, w, h], fill=(60, 42, 30))
    return im.filter(ImageFilter.GaussianBlur(4))


def d_ville(w, h):
    im = img(degrade(w, h, (8, 12, 40), (40, 20, 70))); d = ImageDraw.Draw(im); rng = np.random.default_rng(8); x = 0
    while x < w:
        bw, bh = rng.uniform(0.05, 0.12) * w, rng.uniform(0.25, 0.6) * h
        d.rectangle([x, h - bh, x + bw, h], fill=(12, 12, 28))
        for yy in np.arange(h - bh + 10, h - 10, 18):
            for xx in np.arange(x + 6, x + bw - 8, 14):
                if rng.uniform() < 0.35:
                    d.rectangle([xx, yy, xx + 6, yy + 9], fill=(255, 210, 120) if rng.uniform() < 0.7 else (140, 200, 255))
        x += bw + rng.uniform(0, 0.01) * w
    im = im.filter(ImageFilter.GaussianBlur(5))
    b = bokeh_fond(w, h, (0, 0, 0), (0, 0, 0), [(255, 120, 60), (255, 220, 120), (80, 160, 255), (255, 60, 120)], 30, 3, 8)
    return img(np.asarray(im, float) + np.asarray(b, float) * 0.8)


def d_plage(w, h):
    hz = h * 0.55
    a = degrade(w, h, (90, 160, 230), (250, 200, 160)); im = img(a); d = ImageDraw.Draw(im); u = min(w, h)
    im = lueur(im, lambda d: d.ellipse([w * 0.62 - u * 0.08, hz - u * 0.22, w * 0.62 + u * 0.08, hz - u * 0.06], fill=(255, 240, 200)), 25, 0.9)
    d = ImageDraw.Draw(im); mer = img(degrade(w, int(h * 0.2), (40, 130, 190), (70, 180, 200))); im.paste(mer, (0, int(hz)))
    for k in range(14):
        y = hz + k * h * 0.014; d.line([0, y, w, y], fill=(120, 200, 220), width=1)
    sable = img(degrade(w, int(h - hz - h * 0.2) + 1, (235, 210, 160), (215, 185, 130))); im.paste(sable, (0, int(hz + h * 0.2)))
    d.line([0, hz + h * 0.2, w, hz + h * 0.2], fill=(245, 245, 240), width=6)
    return im.filter(ImageFilter.GaussianBlur(1.5))


def d_briques(w, h):
    im = Image.new('RGB', (w, h), (70, 60, 55)); d = ImageDraw.Draw(im); rng = np.random.default_rng(6)
    bh, bw = h / (18 if w > h else 30), w / (10 if w > h else 6)
    for j in range(int(h / bh) + 1):
        dx = (bw / 2) * (j % 2)
        for i in range(-1, int(w / bw) + 2):
            x, y = i * bw + dx, j * bh; v = rng.uniform(0.75, 1.1)
            d.rectangle([x + 3, y + 3, x + bw - 3, y + bh - 3], fill=(int(150 * v), int(70 * v), int(50 * v)))
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / w) ** 2 + ((yy - h / 2) / h) ** 2)
    return img(np.asarray(im, float) * np.clip(1.15 - r * 1.3, 0.25, 1)[..., None])


def d_tableau(w, h):
    u = min(w, h); im = Image.new('RGB', (w, h), (120, 80, 45)); d = ImageDraw.Draw(im); m = u * 0.05
    n = bruit_doux(64, 12); n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), float) / 255
    a = np.zeros((h, w, 3)) + [32, 60, 44]; a += (n[..., None] - 0.5) * [30, 40, 30]
    planche = img(a); im.paste(planche.crop((int(m), int(m), int(w - m), int(h - m))), (int(m), int(m)))
    d = ImageDraw.Draw(im); d.rectangle([m, m, w - m, h - m], outline=(80, 50, 25), width=int(u * 0.012))
    d.rectangle([w * 0.2, h - m - u * 0.02, w * 0.3, h - m - u * 0.005], fill=(240, 240, 235))
    return im


def d_pastel(w, h):
    yy, xx = np.mgrid[0:h, 0:w]; a = np.zeros((h, w, 3))
    for cx, cy, c in [(0.2, 0.2, (255, 200, 220)), (0.85, 0.3, (200, 220, 255)), (0.5, 0.9, (220, 255, 230)), (0.9, 0.9, (255, 235, 200))]:
        e = np.exp(-(((xx / w - cx) ** 2) + ((yy / h - cy) ** 2)) / 0.12)
        a += e[..., None] * np.asarray(c)
    return img(a / np.maximum(1, a.max(axis=2, keepdims=True) / 255) * 0.6 + 100)



# ---------- Marque QuenTools (logo, enseignes) ----------
POLICE_QT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'fonts', 'bricolage.woff2')
QT = {'violet': (91, 61, 245), 'lime': (215, 242, 74), 'corail': (255, 107, 74), 'encre': (18, 16, 25), 'creme': (246, 244, 238)}


def police_qt(taille):
    try:
        return ImageFont.truetype(POLICE_QT, int(taille))
    except OSError:
        return police(taille)


def logo_qt(d, x, y, t):
    """Logo QuenTools : carré violet arrondi, loupe blanche, manche vert citron (repris de assets/logo.svg)."""
    k = t / 64
    d.rounded_rectangle([x, y, x + t, y + t], radius=18 * k, fill=QT['violet'])
    d.ellipse([x + 16 * k, y + 16 * k, x + 44 * k, y + 44 * k], outline=(255, 255, 255), width=max(2, int(7 * k)))
    d.line([x + 37 * k, y + 37 * k, x + 49 * k, y + 49 * k], fill=QT['lime'], width=max(2, int(8 * k)))
    r = 4 * k
    for cx, cy in [(x + 37 * k, y + 37 * k), (x + 49 * k, y + 49 * k)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=QT['lime'])


def enseigne_qt(w, h, cx, cy, taille, soir):
    """Logo + « QuenTools » sur un calque transparent (avec halo néon le soir)."""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = police_qt(taille); tw = d.textlength('QuenTools', font=f); lg = taille * 1.15; gap = taille * 0.35
    x0 = cx - (lg + gap + tw) / 2; y0 = cy - lg / 2
    if soir:
        halo = Image.new('RGBA', (w, h), (130, 110, 255, 0)); dh = ImageDraw.Draw(halo)
        dh.rounded_rectangle([x0, y0, x0 + lg, y0 + lg], radius=lg * 0.28, fill=QT['violet'] + (255,))
        dh.text((x0 + lg + gap, cy), 'QuenTools', font=f, fill=(170, 150, 255, 255), anchor='lm')
        halo = halo.filter(ImageFilter.GaussianBlur(taille * 0.35))
        im = Image.alpha_composite(im, halo); im = Image.alpha_composite(im, halo); d = ImageDraw.Draw(im)
        couleur = (250, 248, 255)
    else:
        ombre = Image.new('RGBA', (w, h), (0, 0, 0, 0)); do = ImageDraw.Draw(ombre)
        do.rounded_rectangle([x0 + 6, y0 + 10, x0 + lg + 6, y0 + lg + 10], radius=lg * 0.28, fill=(0, 0, 0, 70))
        do.text((x0 + lg + gap + 5, cy + 8), 'QuenTools', font=f, fill=(0, 0, 0, 60), anchor='lm')
        im = Image.alpha_composite(im, ombre.filter(ImageFilter.GaussianBlur(taille * 0.12))); d = ImageDraw.Draw(im)
        couleur = QT['encre']
    logo_qt(d, x0, y0, lg)
    d.text((x0 + lg + gap, cy), 'QuenTools', font=f, fill=couleur, anchor='lm')
    return im



# ---------- Mur noir avec le logo QuenTools en néon LED ----------
def flou(a, sigma):
    """Flou gaussien précis (calcul en nombres décimaux, sans paliers), via la transformée de Fourier."""
    h, w = a.shape
    fy, fx = np.fft.fftfreq(h)[:, None], np.fft.fftfreq(w)[None, :]
    return np.real(np.fft.ifft2(np.fft.fft2(a) * np.exp(-2 * (math.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))))


def halo(masque, sigma, reduc=8):
    """Grand halo calculé en petit puis agrandi (rapide et parfaitement lisse)."""
    w, h = masque.size
    petit = np.asarray(masque.resize((w // reduc, h // reduc), Image.BILINEAR), float) / 255
    g = flou(np.pad(petit, ((h // reduc // 2,) * 2, (w // reduc // 2,) * 2)), sigma / reduc)[h // reduc // 2: h // reduc // 2 + h // reduc, w // reduc // 2: w // reduc // 2 + w // reduc]
    return np.asarray(Image.fromarray(g.astype(np.float32), 'F').resize((w, h), Image.BICUBIC), float)


def masque_enseigne(w, h, cx, cy, taille):
    """Enseigne LED : carré du logo (violet), loupe et lettres (blanc), manche (vert citron). Trois masques."""
    mv, mb, ml = (Image.new('L', (w, h), 0) for _ in range(3))
    dv, db, dl = ImageDraw.Draw(mv), ImageDraw.Draw(mb), ImageDraw.Draw(ml)
    f = police_qt(taille); tw = db.textlength('QuenTools', font=f); lg = taille * 1.2; gap = taille * 0.45
    x0 = cx - (lg + gap + tw) / 2; y0 = cy - lg / 2; k = lg / 64
    dv.rounded_rectangle([x0, y0, x0 + lg, y0 + lg], radius=18 * k, fill=255)
    db.ellipse([x0 + 16 * k, y0 + 16 * k, x0 + 44 * k, y0 + 44 * k], outline=255, width=max(2, int(7 * k)))
    dl.line([x0 + 37 * k, y0 + 37 * k, x0 + 49 * k, y0 + 49 * k], fill=255, width=max(2, int(8 * k)))
    for cxy in [(x0 + 37 * k, y0 + 37 * k), (x0 + 49 * k, y0 + 49 * k)]:
        dl.ellipse([cxy[0] - 4 * k, cxy[1] - 4 * k, cxy[0] + 4 * k, cxy[1] + 4 * k], fill=255)
    db.text((x0 + lg + gap, cy), 'QuenTools', font=f, fill=255, anchor='lm')
    return mv, mb, ml


def mur_sombre(w, h, graine=5):
    n = max(w, h); b = bruit_doux(256, graine, 0.6)
    t = np.asarray(Image.fromarray((b * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC), float)[:h, :w] / 255
    grain = np.random.default_rng(graine).normal(0, 1, (h, w))
    v = 13 + 7 * t + 1.6 * grain  # béton sombre
    yy = np.linspace(0, 1, h)[:, None]
    v = v * (1.05 - 0.25 * yy)
    return np.repeat(v[..., None], 3, axis=2) * np.asarray([1.0, 0.98, 1.04])


def neon(w, h, cx, cy, taille, eclat=1.0):
    masques = masque_enseigne(w, h, cx, cy, taille)
    a = mur_sombre(w, h)
    teintes = [(np.asarray([110, 80, 255]), np.asarray([92, 60, 245])),     # carré violet
               (np.asarray([140, 110, 255]), np.asarray([250, 248, 255])),  # loupe et lettres : blanc, halo violet
               (np.asarray([190, 240, 60]), np.asarray([235, 255, 160]))]   # manche vert citron
    lum = np.zeros((h, w, 3))
    for m, (halo_c, coeur) in zip(masques, teintes):
        mm = np.asarray(m, float) / 255
        lum += halo(m, taille * 2.8)[..., None] * halo_c * 3.4 * eclat       # lumière projetée sur le mur
        lum += halo(m, taille * 0.5, 4)[..., None] * halo_c * 1.1 * eclat     # halo
        lum += flou(mm, taille * 0.06)[..., None] * halo_c * 1.2 * eclat      # diffusion autour du tube
        lum = lum * (1 - mm[..., None]) + mm[..., None] * coeur * (0.8 + 0.2 * eclat)
    a = a + lum
    yy, xx = np.mgrid[0:h, 0:w]
    a *= np.clip(1.15 - np.sqrt(((xx - w / 2) / w) ** 2 + ((yy - h * 0.45) / h) ** 2) * 1.1, 0.4, 1)[..., None]
    a = 255 * (1 - np.exp(-np.clip(a, 0, None) / 255 * 1.1)) / (1 - math.exp(-1.1))  # saturation douce, comme une caméra
    return img(a)


def d_led(w, h):
    return neon(w, h, w / 2, h * (0.2 if w > h else 0.13), min(w, h) * (0.085 if w > h else 0.1))


def d_led_cote(w, h):
    return neon(w, h, w * (0.74 if w > h else 0.5), h * (0.3 if w > h else 0.13), min(w, h) * (0.07 if w > h else 0.1))


def a_led(duree):
    """Néon qui respire doucement, avec un léger grésillement (boucle parfaite)."""
    def f(t):
        ph = 2 * math.pi * t / duree
        e = 0.9 + 0.1 * math.sin(ph) - (0.25 if (int(t * IPS) % 97) in (3, 4) else 0)
        return neon(A, A, A / 2, A * 0.28, A * 0.075, e)
    return f


FONDS = [
    ('quentools-led', 'Mur noir, logo QuenTools en LED', 'QuenTools', d_led),
    ('quentools-led-cote', 'Mur noir, logo LED sur le côté', 'QuenTools', d_led_cote),
    ('plateau-info', 'Plateau télé (info)', 'Studio et télé', d_plateau),
    ('studio-podcast', 'Studio podcast (néon)', 'Studio et télé', d_podcast),
    ('studio-blanc', 'Studio blanc', 'Studio et télé', d_studio_blanc),
    ('tableau', 'Tableau d’école', 'Studio et télé', d_tableau),
    ('bureau-flou', 'Bureau flou (lumières chaudes)', 'Lieux', d_bureau),
    ('ville-nuit', 'Ville de nuit floue', 'Lieux', d_ville),
    ('plage', 'Plage', 'Lieux', d_plage),
    ('briques', 'Mur de briques', 'Lieux', d_briques),
    ('espace', 'Espace (étoiles et nébuleuse)', 'Ambiances', d_espace),
    ('synthwave', 'Coucher de soleil rétro (années 80)', 'Ambiances', d_synthwave),
    ('degrade-neon', 'Dégradé néon', 'Ambiances', d_neon),
    ('pastel', 'Dégradé pastel', 'Ambiances', d_pastel),
]


# ====================== Vidéos ======================
def encoder(dest, taille, images, duree, crf=22):
    w, h = taille
    p = subprocess.Popen([FFMPEG, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(IPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dest], stdin=subprocess.PIPE)
    for k in range(int(round(duree * IPS))):
        p.stdin.write(np.asarray(images(k / IPS).convert('RGB'), dtype=np.uint8).tobytes())
    p.stdin.close()
    if p.wait():
        sys.exit('Échec de l’encodage de ' + dest)


A = 1080  # décors animés : carré, recadré automatiquement au format du projet


def a_degrade(duree):
    b = 48
    yy, xx = np.mgrid[0:b, 0:b] / b

    def f(t):
        ph = 2 * math.pi * t / duree
        r = 128 + 110 * np.sin(xx * 3 + ph) * np.cos(yy * 2 - ph)
        g = 70 + 60 * np.sin(yy * 3 + ph * 2 + 1)
        bl = 170 + 80 * np.cos(xx * 2 - yy * 2 + ph)
        return img(np.stack([r, g, bl], -1)).resize((A, A), Image.BICUBIC)
    return f


def a_plexus(duree):
    rng = np.random.default_rng(3); n = 60
    P = rng.uniform(0, 1, (n, 2)); K = rng.integers(1, 3, (n, 2)); PH = rng.uniform(0, 6.28, (n, 2))
    fond = img(degrade(A, A, (6, 14, 40), (10, 30, 70)))

    def f(t):
        u = 2 * math.pi * t / duree
        pos = (P + 0.06 * np.sin(K * u + PH)) * A
        im = fond.copy(); d = ImageDraw.Draw(im)
        for i in range(n):
            for j in range(i + 1, n):
                dist = np.hypot(*(pos[i] - pos[j]))
                if dist < A * 0.16:
                    v = int(140 * (1 - dist / (A * 0.16))); d.line([*pos[i], *pos[j]], fill=(40, 90 + v // 2, 120 + v), width=2)
        for x, y in pos:
            d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(120, 200, 255))
        return im
    return f


def a_grille(duree):
    return lambda t: d_synthwave(A, A, (t / duree) % 1)


def a_rayons(duree):
    yy, xx = np.mgrid[0:A, 0:A]
    ang = np.arctan2(yy - A * 0.45, xx - A / 2); r = np.hypot(yy - A * 0.45, xx - A / 2) / A

    def f(t):
        a = ang + 2 * math.pi * t / duree / 6  # 12 rayons : un sixième de tour = boucle parfaite
        s = (np.sin(a * 12) > 0).astype(float)
        base = np.asarray([30, 20, 90], float) + s[..., None] * np.asarray([60, 40, 120], float)
        base *= np.clip(1.2 - r * 1.2, 0.2, 1)[..., None]
        base += np.clip(0.3 - r, 0, 1)[..., None] * 600 * np.asarray([1, 0.8, 0.5])
        return img(base)
    return f


FONDS_ANIMES = [
    ('anime-quentools-led', 'Logo QuenTools LED animé', 4, a_led),
    ('anime-degrade', 'Dégradé animé', 8, a_degrade),
    ('anime-reseau', 'Réseau de points (tech)', 8, a_plexus),
    ('anime-grille', 'Grille rétro qui défile', 3, a_grille),
    ('anime-rayons', 'Rayons de lumière (jeu télé)', 6, a_rayons),
]


# ====================== Animations sur fond vert ======================
E = 1080; SS = 2  # dessin en double résolution puis réduction : bords nets


def ease(x):
    x = min(1, max(0, x)); return 1 - (1 - x) ** 3


def rebond(x):
    x = min(1, max(0, x)); return 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2 if x < 1 else 1


def toile():
    im = Image.new('RGB', (E * SS, E * SS), VERT); return im, ImageDraw.Draw(im)


def fin(im):
    return im.resize((E, E), Image.LANCZOS)


def bouton(d, cx, cy, s, texte, couleur, texte_couleur=(255, 255, 255)):
    if s <= 0.02:
        return
    f = police(70 * SS * s); b = d.textbbox((0, 0), texte, font=f)
    tw, th = b[2] - b[0], b[3] - b[1]; pw, ph = tw + 90 * SS * s, th + 70 * SS * s
    d.rounded_rectangle([cx - pw / 2 + 8 * SS * s, cy - ph / 2 + 12 * SS * s, cx + pw / 2 + 8 * SS * s, cy + ph / 2 + 12 * SS * s], radius=ph * 0.3, fill=(25, 25, 25))
    d.rounded_rectangle([cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2], radius=ph * 0.3, fill=couleur)
    d.text((cx, cy), texte, font=f, fill=texte_couleur, anchor='mm')


def curseur(d, x, y, s=1.0):
    k = 60 * SS * s
    pts = [(x, y), (x, y + k), (x + k * 0.28, y + k * 0.74), (x + k * 0.48, y + k * 1.12), (x + k * 0.62, y + k * 1.05), (x + k * 0.43, y + k * 0.68), (x + k * 0.78, y + k * 0.68)]
    d.polygon(pts, fill=(255, 255, 255), outline=(0, 0, 0)); d.line(pts + [pts[0]], fill=(0, 0, 0), width=3 * SS)


def cloche_forme(d, cx, cy, r, ang, couleur=(255, 205, 40)):
    ca, sa = math.cos(ang), math.sin(ang)
    rot = lambda x, y: (cx + x * ca - y * sa, cy + x * sa + y * ca)
    pts = [rot(r * math.sin(a) * (0.55 + 0.45 * (1 + math.cos(a)) / 2 if False else 1) * 0.0, 0) for a in []]
    corps = [(-0.55, 0.55), (-0.5, -0.1), (-0.35, -0.5), (0, -0.62), (0.35, -0.5), (0.5, -0.1), (0.55, 0.55), (0.7, 0.68), (-0.7, 0.68)]
    d.polygon([rot(x * r, y * r) for x, y in corps], fill=couleur, outline=(160, 110, 0))
    bx, by = rot(0, 0.8 * r); d.ellipse([bx - 0.14 * r, by - 0.14 * r, bx + 0.14 * r, by + 0.14 * r], fill=couleur)
    tx, ty = rot(0, -0.7 * r); d.ellipse([tx - 0.1 * r, ty - 0.1 * r, tx + 0.1 * r, ty + 0.1 * r], fill=couleur)
    del pts


def v_abonner(t):
    im, d = toile(); c = E * SS / 2
    s = rebond(t / 0.5)
    clic = 1.5
    if t < clic:
        bouton(d, c - 70 * SS, c, s, 'S’ABONNER', (230, 20, 30))
    else:
        p = ease((t - clic) / 0.15); bouton(d, c - 70 * SS, c, 1 - 0.08 * math.sin(math.pi * p), 'ABONNÉ ✓', (110, 110, 110))
    if t > 0.4:  # cloche à droite
        sc = rebond((t - 0.4) / 0.5); ang = 0.5 * math.sin((t - clic) * 18) * math.exp(-(t - clic) * 2.5) if t > clic else 0
        cloche_forme(d, c + 330 * SS, c, 70 * SS * sc, ang)
    x0, y0, x1, y1 = c + 420 * SS, c + 380 * SS, c, c + 20 * SS  # le curseur arrive et clique
    p = ease((t - 0.6) / 0.8); cx, cy = x0 + (x1 - x0) * p, y0 + (y1 - y0) * p
    if t > 0.6 and t < 3.4:
        curseur(d, cx, cy, 1 - 0.15 * (clic < t < clic + 0.15))
    return fin(im)


def v_jaime(t):
    im, d = toile(); c = E * SS / 2; s = rebond(t / 0.45) * (1 + 0.06 * math.sin(t * 8) * (t > 0.6))
    r = 150 * SS * s
    pts = []
    for k in range(60):
        a = 2 * math.pi * k / 60
        pts.append((c + r * math.sin(a) ** 3, c - 40 * SS - r * (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)) / 16))
    if s > 0.02:
        d.polygon(pts, fill=(240, 30, 70))
    rng = np.random.default_rng(1)
    for k in range(12):  # petits cœurs qui s'envolent
        tt = t - 0.3 - k * 0.07
        if tt > 0:
            a = rng.uniform(0, 2 * math.pi); dist = 330 * SS * ease(tt / 1.2); rr = 22 * SS * max(0, 1 - tt / 2)
            x, y = c + math.cos(a) * dist, c - 40 * SS + math.sin(a) * dist
            if rr > 1:
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(255, 120, 160))
    if t > 0.5:
        bouton(d, c, c + 260 * SS, rebond((t - 0.5) / 0.5) * 0.9, 'J’AIME', (255, 255, 255), (230, 20, 60))
    return fin(im)


def v_cloche(t):
    im, d = toile(); c = E * SS / 2; s = rebond(t / 0.45)
    ang = 0.55 * math.sin(t * 16) * math.exp(-max(0, t - 0.5) * 1.2) if t > 0.4 else 0
    cloche_forme(d, c, c, 220 * SS * s, ang)
    if t > 0.5:
        for k in range(3):  # ondes de son
            r = (220 + 70 * k) * SS * (1 + 0.05 * math.sin(t * 10 - k)); w = int(16 * SS)
            al = 0.5 + 0.5 * math.sin(t * 10 - k)
            if al > 0.3:
                d.arc([c - r, c - r, c + r, c + r], 300, 340, fill=(255, 255, 255), width=w); d.arc([c - r, c - r, c + r, c + r], 200, 240, fill=(255, 255, 255), width=w)
    if t > 0.3:
        b = rebond((t - 0.3) / 0.4); r = 55 * SS * b; x, y = c + 150 * SS, c - 150 * SS
        if r > 1:
            d.ellipse([x - r, y - r, x + r, y + r], fill=(230, 20, 30)); d.text((x, y), '1', font=police(70 * SS * b), fill='white', anchor='mm')
    return fin(im)


def fleche_forme(d, x, y, l, ep, couleur, ang=0.0):
    ca, sa = math.cos(ang), math.sin(ang); rot = lambda px, py: (x + px * ca - py * sa, y + px * sa + py * ca)
    pts = [(0, 0), (-ep * 1.6, -ep * 1.4), (-ep * 1.6, -ep * 0.5), (-l, -ep * 0.5), (-l, ep * 0.5), (-ep * 1.6, ep * 0.5), (-ep * 1.6, ep * 1.4)]
    d.polygon([rot(*p) for p in pts], fill=couleur, outline=(0, 0, 0)); d.line([rot(*p) for p in pts + [pts[0]]], fill=(0, 0, 0), width=6 * SS)


def v_fleche(t):
    im, d = toile(); c = E * SS / 2
    entree = ease(t / 0.5); osc = math.sin(t * 9) * 40 * SS * (t > 0.5)
    fleche_forme(d, c + 300 * SS - (1 - entree) * 900 * SS + osc, c, 600 * SS, 90 * SS, (255, 215, 0))
    return fin(im)


def v_cercle(t):
    im, d = toile(); c = E * SS / 2; p = ease(t / 1.0)
    r1, r2 = 390 * SS, 300 * SS
    pts = []
    for k in range(int(220 * p) + 1):
        a = -2.2 + 2 * math.pi * 1.08 * k / 220
        pts.append((c + r1 * math.cos(a) * (1 + 0.03 * math.sin(a * 3)), c + r2 * math.sin(a) * (1 + 0.04 * math.cos(a * 2))))
    if len(pts) > 1:
        d.line(pts, fill=(235, 20, 30), width=26 * SS, joint='curve')
    return fin(im)


def v_compte(t):
    im, d = toile(); c = E * SS / 2; n = 3 - int(t); p = t % 1
    if n < 1:
        s = rebond(p / 0.4); bouton(d, c, c, s * 1.4, 'GO !', (255, 200, 0), (20, 20, 20)); return fin(im)
    r = 330 * SS
    d.ellipse([c - r, c - r, c + r, c + r], fill=(20, 20, 30))
    d.arc([c - r, c - r, c + r, c + r], -90, -90 + 360 * p, fill=(255, 200, 0), width=30 * SS)
    s = rebond(p / 0.35); d.text((c, c), str(n), font=police(380 * SS * max(0.05, s)), fill='white', anchor='mm')
    return fin(im)


def v_lien_bio(t):
    im, d = toile(); c = E * SS / 2; s = rebond(t / 0.45)
    if s > 0.02:
        w, h = 760 * SS * s, 230 * SS * s
        d.rounded_rectangle([c - w / 2, c - 120 * SS - h / 2, c + w / 2, c - 120 * SS + h / 2], radius=60 * SS * s, fill=(255, 255, 255))
        d.polygon([(c - 40 * SS * s, c - 120 * SS + h / 2 - 2), (c + 40 * SS * s, c - 120 * SS + h / 2 - 2), (c, c - 120 * SS + h / 2 + 60 * SS * s)], fill=(255, 255, 255))
        d.text((c, c - 120 * SS), 'LIEN EN BIO', font=police(110 * SS * s), fill=(20, 20, 30), anchor='mm')
    if t > 0.5:
        y = c + 230 * SS + math.sin(t * 8) * 30 * SS
        fleche_forme(d, c, y + 120 * SS, 200 * SS, 50 * SS, (255, 215, 0), ang=math.pi / 2)
    return fin(im)


def v_glisse_haut(t):
    im, d = toile(); c = E * SS / 2
    for k in range(3):
        p = ((t * 1.2 + k / 3) % 1); y = c + 250 * SS - p * 400 * SS; a = math.sin(math.pi * p)
        if a > 0.05:
            col = tuple(int(255 * a + VERT[i] * (1 - a)) for i in range(3))
            d.line([(c - 160 * SS, y + 90 * SS), (c, y - 40 * SS), (c + 160 * SS, y + 90 * SS)], fill=col, width=40 * SS, joint='curve')
    d.text((c, c + 380 * SS), 'GLISSE VERS LE HAUT', font=police(70 * SS), fill='white', anchor='mm')
    return fin(im)


def v_explosion(t):
    im, d = toile(); c = E * SS / 2; rng = np.random.default_rng(2); cols = [(255, 60, 90), (255, 200, 40), (60, 170, 255), (190, 90, 255), (255, 140, 40), (255, 255, 255)]
    for k in range(120):
        a, v, sz = rng.uniform(0, 2 * math.pi), rng.uniform(0.4, 1), rng.uniform(10, 26) * SS
        dist = 520 * SS * v * ease(t / 0.9); x = c + math.cos(a) * dist; y = c + math.sin(a) * dist + 260 * SS * max(0, t - 0.5) ** 2
        s = sz * max(0, 1 - t / 2.0)
        if s > 1:
            col = cols[k % len(cols)]
            d.rectangle([x - s, y - s * 0.5, x + s, y + s * 0.5], fill=col) if k % 2 else d.ellipse([x - s * 0.6, y - s * 0.6, x + s * 0.6, y + s * 0.6], fill=col)
    if t < 0.25:
        r = 300 * SS * t / 0.25; d.ellipse([c - r, c - r, c + r, c + r], outline=(255, 255, 255), width=int(30 * SS * (1 - t / 0.25)) + 1)
    return fin(im)


FONDVERT = [
    ('abonner', 'Bouton S’abonner avec clic et cloche', 3.6, v_abonner),
    ('jaime', 'J’aime (cœur qui éclate)', 2.5, v_jaime),
    ('cloche', 'Cloche de notification', 2.5, v_cloche),
    ('fleche', 'Flèche qui pointe', 2.5, v_fleche),
    ('cercle', 'Cercle rouge qui entoure', 2, v_cercle),
    ('compte', 'Compte à rebours 3, 2, 1, GO', 4, v_compte),
    ('lien-bio', 'Lien en bio', 2.5, v_lien_bio),
    ('glisse-haut', 'Glisse vers le haut', 2.5, v_glisse_haut),
    ('explosion', 'Explosion de confettis', 2, v_explosion),
]


def main():
    seul = set(sys.argv[1:])
    idx_f = os.path.join(RACINE, 'index.json')
    index = json.load(open(idx_f, encoding='utf8')) if os.path.exists(idx_f) else {}
    if not seul or 'fonds' in seul:
        os.makedirs(os.path.join(RACINE, 'fonds'), exist_ok=True)
        index['fonds'] = []
        for id_, nom, cat, f in FONDS:
            f(1920, 1080).save(os.path.join(RACINE, 'fonds', id_ + '-h.jpg'), quality=88)
            f(1080, 1920).save(os.path.join(RACINE, 'fonds', id_ + '-v.jpg'), quality=88)
            index['fonds'].append({'id': id_, 'nom': nom, 'cat': cat, 'file': f'fonds/{id_}-h.jpg', 'kind': 'image'})
            print(' ', nom)
        for id_, nom, duree, gen in FONDS_ANIMES:
            encoder(os.path.join(RACINE, 'fonds', id_ + '.mp4'), (A, A), gen(duree), duree, crf=23)
            index['fonds'].append({'id': id_, 'nom': nom, 'cat': 'Décors animés', 'file': f'fonds/{id_}.mp4', 'kind': 'video', 'duree': duree})
            print(' ', nom)
    if not seul or 'marque' in seul:  # enseignes QuenTools à poser sur n'importe quel décor ou photo
        index['marque'] = []
        for id_, nom, soir in [('quentools-mur', 'Enseigne QuenTools (murale)', False), ('quentools-neon', 'Enseigne QuenTools (néon)', True)]:
            im = enseigne_qt(1400, 420, 700, 210, 150, soir)
            im = im.crop(im.getbbox())
            im.save(os.path.join(RACINE, 'stickers', id_ + '.png'), optimize=True)
            index['marque'].append({'id': id_, 'nom': nom, 'cat': 'QuenTools', 'file': f'stickers/{id_}.png'})
    if not seul or 'fondvert' in seul:
        os.makedirs(os.path.join(RACINE, 'fondvert'), exist_ok=True)
        index['fondvert'] = []
        for id_, nom, duree, gen in FONDVERT:
            encoder(os.path.join(RACINE, 'fondvert', id_ + '.mp4'), (E, E), gen, duree, crf=20)
            index['fondvert'].append({'id': id_, 'nom': nom, 'cat': 'Animations sur fond vert', 'file': f'fondvert/{id_}.mp4', 'duree': duree})
            print(' ', nom)
    json.dump(index, open(idx_f, 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
