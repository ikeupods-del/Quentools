#!/usr/bin/env python3
"""Animations « Me filmer » de QuentMovie sur fond vert : réseaux, infos (breaking news), humeurs, argent, divers.
Créations originales sans droits ; le vert (0,255,0) est retiré par QuentMovie. Aucune couleur dessinée ne doit tirer sur le vert
(l'argent « positif » est donc turquoise, jamais vert).
Usage : python3 scripts/generer-animations.py [id…]   (numpy, Pillow et ffmpeg requis ; réutilise les outils de generer-fonds.py)
Ajoute les entrées à la liste « fondvert » de bibliotheque/index.json (id, nom, cat, durée, taille, son associé)."""
import importlib.util
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ici = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('fonds', os.path.join(ici, 'generer-fonds.py'))
F = importlib.util.module_from_spec(spec); spec.loader.exec_module(F)
SS, VERT, ease, rebond, encoder = F.SS, F.VERT, F.ease, F.rebond, F.encoder
police = lambda taille: F.police(max(4, taille))  # une animation commence à taille nulle : jamais de police de taille 0


def _sur(m):
    """Boîtes inversées ou vides (début d'animation) : on les remet dans l'ordre au lieu de planter."""
    def f(self, xy, *a, **k):
        if isinstance(xy, (list, tuple)) and len(xy) == 4 and not isinstance(xy[0], (list, tuple)):
            x0, y0, x1, y1 = xy; xy = [min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)]
        return m(self, xy, *a, **k)
    return f


for _n in ('rectangle', 'rounded_rectangle', 'ellipse', 'arc', 'chord', 'pieslice'):
    setattr(ImageDraw.ImageDraw, _n, _sur(getattr(ImageDraw.ImageDraw, _n)))
E = 1080
JAUNE, JAUNE_BORD, ROUGE, BLEU, TURQ, OR, BLANC, NOIR = (255, 205, 45), (170, 105, 0), (235, 30, 45), (50, 130, 255), (0, 205, 200), (255, 190, 30), (255, 255, 255), (20, 20, 30)


def sq():
    im = Image.new('RGB', (E * SS, E * SS), VERT); return im, ImageDraw.Draw(im), E * SS / 2


def large(w=1920, h=540):
    im = Image.new('RGB', (w * SS, h * SS), VERT); return im, ImageDraw.Draw(im)


def out(im, w=E, h=E, ombre=True):
    """Réduction (anti-crénelage), contour blanc façon autocollant puis ombre portée franche (jamais de flou vers le vert : le détourage resterait verdâtre)."""
    r = im.resize((w, h), Image.LANCZOS)
    if not ombre:
        return r
    a = np.asarray(r).astype(np.int16); plein = (np.abs(a - np.array(VERT)).sum(-1) > 120)
    if w == h:  # icônes carrées : liseré blanc de 7 px autour de la forme
        rayon = max(3, w // 150)
        petit = Image.fromarray((plein * 255).astype(np.uint8)).resize((w // 2, h // 2), Image.BILINEAR).filter(ImageFilter.GaussianBlur(rayon * 0.31))  # dilatation arrondie, calculée à demi-taille (rapide)
        gros = np.asarray(petit.resize((w, h), Image.BILINEAR)) > 22
        anneau = gros & ~plein
        a[anneau] = (252, 252, 255)
        plein = gros
    dx, dy = max(4, w // 150), max(6, h // 100)
    ombre_m = np.zeros_like(plein); ombre_m[dy:, dx:] = plein[:-dy, :-dx]
    libre = np.abs(a - np.array(VERT)).sum(-1) <= 60
    a[ombre_m & libre] = (14, 16, 34)
    return Image.fromarray(a.astype(np.uint8), 'RGB')


def disque(d, x, y, r, fill, outline=None, w=0):
    if r > 0.5:
        d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=outline, width=int(w))


def etoile(d, x, y, r, fill, rot=0.0):
    pts = []
    for k in range(10):
        a = rot + math.pi * k / 5 - math.pi / 2; rr = r if k % 2 == 0 else r * 0.45
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    d.polygon(pts, fill=fill)


def texte(d, x, y, t, taille, fill, ancre='mm', contour=None):
    f = police(taille)
    if contour:
        for dx in (-3 * SS, 0, 3 * SS):
            for dy in (-3 * SS, 0, 3 * SS):
                d.text((x + dx, y + dy), t, font=f, fill=contour, anchor=ancre)
    d.text((x, y), t, font=f, fill=fill, anchor=ancre)


def etiquette(d, cx, cy, s, t, fond, fg=BLANC, taille=64):
    if s <= 0.02:
        return
    f = police(taille * SS * s); b = d.textbbox((0, 0), t, font=f); tw, th = b[2] - b[0], b[3] - b[1]; pw, ph = tw + 80 * SS * s, th + 60 * SS * s
    d.rounded_rectangle([cx - pw / 2 + 8 * SS * s, cy - ph / 2 + 12 * SS * s, cx + pw / 2 + 8 * SS * s, cy + ph / 2 + 12 * SS * s], radius=ph * 0.3, fill=NOIR)
    d.rounded_rectangle([cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2], radius=ph * 0.3, fill=fond)
    d.text((cx, cy), t, font=f, fill=fg, anchor='mm')


# ---------- Visages ----------
def visage(d, cx, cy, r, fond=JAUNE, bord=JAUNE_BORD):
    disque(d, cx, cy, r, fond, bord, 8 * SS)


def yeux(d, cx, cy, r, ecart=0.38, haut=-0.12, taille=0.11, fill=NOIR):
    for sgn in (-1, 1):
        disque(d, cx + sgn * r * ecart, cy + r * haut, r * taille, fill)


def bouche_sourire(d, cx, cy, r, ouverte=0.0, largeur=0.5, epais=0.05):
    box = [cx - r * largeur, cy + r * (0.05 - 0.2), cx + r * largeur, cy + r * (0.05 + 0.55 + ouverte)]
    d.arc(box, 20, 160, fill=NOIR, width=int(r * epais * 2))






def coeur(d, x, y, r, fill):
    pts = [(x + r * math.sin(a) ** 3, y - r * (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)) / 16) for a in [2 * math.pi * k / 50 for k in range(50)]]
    d.polygon(pts, fill=fill)






def v_reflechi(t):
    im, d, c = sq(); r = 300 * SS * rebond(t / 0.45); cy = c + 90 * SS
    visage(d, c, cy, r)
    for sgn in (-1, 1):
        disque(d, c + sgn * r * 0.38, cy - r * 0.1, r * 0.1, NOIR)
    d.line([(c - r * 0.62, cy - r * 0.42), (c - r * 0.14, cy - r * 0.34)], fill=NOIR, width=int(r * 0.06)); d.line([(c + r * 0.14, cy - r * 0.42), (c + r * 0.62, cy - r * 0.52)], fill=NOIR, width=int(r * 0.06))
    d.line([(c - r * 0.3, cy + r * 0.42), (c + r * 0.3, cy + r * 0.38)], fill=NOIR, width=int(r * 0.06))
    d.rounded_rectangle([c + r * 0.05, cy + r * 0.45, c + r * 0.34, cy + r * 0.85], radius=int(r * 0.1), fill=JAUNE, outline=JAUNE_BORD, width=int(r * 0.03))  # main au menton
    for k, (dx, dy, s) in enumerate(((330, -380, 50), (430, -500, 75), (560, -660, 110))):
        tt = t - 0.35 - k * 0.2
        if tt > 0:
            sc = rebond(tt / 0.3); disque(d, c + dx * SS * 0.7, cy + dy * SS * 0.7, s * SS * sc, BLANC, NOIR, 4 * SS)
            if k == 2:
                texte(d, c + dx * SS * 0.7, cy + dy * SS * 0.7, '?', 130 * SS * sc, ROUGE)
    return out(im)


def v_cool(t):
    im, d, c = sq(); r = 320 * SS * rebond(t / 0.45)
    visage(d, c, c, r)
    descente = ease((t - 0.3) / 0.35); ly = c - r * 0.75 + (r * 0.65) * descente
    for sgn in (-1, 1):
        d.rounded_rectangle([c + sgn * r * 0.4 - r * 0.3, ly - r * 0.16, c + sgn * r * 0.4 + r * 0.3, ly + r * 0.2], radius=int(r * 0.1), fill=NOIR)
    d.line([(c - r * 0.1, ly - r * 0.02), (c + r * 0.1, ly - r * 0.02)], fill=NOIR, width=int(r * 0.05))
    d.arc([c - r * 0.45, c + r * 0.05, c + r * 0.45, c + r * 0.68], 20, 160, fill=NOIR, width=int(r * 0.06))
    if t > 0.7:
        p = ((t - 0.7) * 1.4) % 1; etoile(d, c - r * 0.55 + p * r * 0.8, ly - r * 0.05, 40 * SS * math.sin(math.pi * p), BLANC)
    return out(im)


# ---------- Réseaux ----------
def v_commenter(t):
    im, d, c = sq(); s = rebond(t / 0.45)
    w, h = 640 * SS * s, 380 * SS * s
    if s > 0.03:
        d.rounded_rectangle([c - w / 2, c - 120 * SS - h / 2, c + w / 2, c - 120 * SS + h / 2], radius=80 * SS * s, fill=BLANC, outline=NOIR, width=int(6 * SS))
        d.polygon([(c - 120 * SS * s, c - 120 * SS + h / 2 - 3), (c - 40 * SS * s, c - 120 * SS + h / 2 - 3), (c - 150 * SS * s, c - 120 * SS + h / 2 + 90 * SS * s)], fill=BLANC)
        for k in range(3):
            disque(d, c + (k - 1) * 120 * SS * s, c - 120 * SS - 10 * SS * math.sin(t * 8 - k * 0.9), 36 * SS * s, (110, 120, 140))
    if t > 0.6:
        etiquette(d, c, c + 250 * SS, rebond((t - 0.6) / 0.4), 'COMMENTE !', BLEU)
    return out(im)


def v_partager(t):
    im, d, c = sq(); s = rebond(t / 0.45)
    if s > 0.03:
        pts = [(c - 260 * SS * s, c + 120 * SS * s), (c - 260 * SS * s, c - 40 * SS * s), (c + 20 * SS * s, c - 40 * SS * s), (c + 20 * SS * s, c - 170 * SS * s), (c + 330 * SS * s, c + 20 * SS * s), (c + 20 * SS * s, c + 200 * SS * s), (c + 20 * SS * s, c + 80 * SS * s), (c - 260 * SS * s, c + 80 * SS * s)]
        d.polygon([(x, y - 90 * SS * s) for x, y in pts], fill=BLANC, outline=NOIR)
        d.line([(x, y - 90 * SS * s) for x, y in pts + [pts[0]]], fill=NOIR, width=int(6 * SS))
    if t > 0.5:
        etiquette(d, c, c + 250 * SS, rebond((t - 0.5) / 0.4) * (1 + 0.04 * math.sin(t * 9)), 'PARTAGE !', (255, 120, 40))
    return out(im)


def v_enregistrer(t):
    im, d, c = sq(); y = c - 80 * SS - (1 - ease(t / 0.5)) * 600 * SS
    w, h = 300 * SS, 420 * SS
    d.polygon([(c - w / 2, y - h / 2), (c + w / 2, y - h / 2), (c + w / 2, y + h / 2), (c, y + h / 3), (c - w / 2, y + h / 2)], fill=(255, 205, 40), outline=NOIR)
    d.line([(c - w / 2, y - h / 2), (c + w / 2, y - h / 2), (c + w / 2, y + h / 2), (c, y + h / 3), (c - w / 2, y + h / 2), (c - w / 2, y - h / 2)], fill=NOIR, width=int(7 * SS))
    if t > 0.7:
        etoile(d, c, y - h * 0.1, 70 * SS * rebond((t - 0.7) / 0.4), (255, 255, 255))
        etiquette(d, c, c + 270 * SS, rebond((t - 0.7) / 0.4), 'ENREGISTRE !', (110, 70, 230))
    return out(im)


def v_suivre(t):
    im, d, c = sq(); clic = 1.5
    if t < clic:
        etiquette(d, c, c, rebond(t / 0.45), '+  SUIS-MOI', ROUGE, taille=90)
    else:
        p = ease((t - clic) / 0.15); etiquette(d, c, c, 1 - 0.08 * math.sin(math.pi * p), 'SUIVI ✓', (110, 110, 120), taille=90)
    if 0.5 < t < 3.2:
        p = ease((t - 0.5) / 0.8); F.curseur(d, c + 380 * SS * (1 - p) + 60 * SS, c + 340 * SS * (1 - p) + 20 * SS, 1 - 0.15 * (clic < t < clic + 0.15))
    return out(im)






# ---------- Infos ----------
# Générique d'édition spéciale, dans l'esprit des journaux télévisés (fond bleu profond, globe filaire, bandeau rouge, bas d'écran) :
# création originale, sans logo, jingle ni charte d'une chaîne. 0 à 3,6 s plein écran, puis le bas d'écran reste jusqu'à 7 s.
_FOND = {}


def _fond_info():
    if 'f' not in _FOND:
        W, H = 1920 * SS, 1080 * SS
        y = np.linspace(0, 1, H)[:, None]; x = np.linspace(0, 1, W)[None, :]
        r = np.sqrt(((x - 0.33) * 1.6) ** 2 + (y - 0.5) ** 2)
        g = np.clip(1 - r * 1.25, 0, 1) ** 1.6
        base = np.stack([4 + 18 * g + 6 * y * np.ones_like(x), 12 + 62 * g + 6 * y, 44 + 150 * g + 14 * y], -1)
        _FOND['f'] = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), 'RGB')
    return _FOND['f'].copy()


def _globe(d, cx, cy, r, t, a=(120, 190, 255)):
    for k in (1.0, 1.1, 1.2):
        d.ellipse([cx - r * k, cy - r * k, cx + r * k, cy + r * k], outline=tuple(int(c * (0.35 if k > 1 else 0.9)) for c in a) if k == 1.0 else (40, 90, 170), width=int((6 if k == 1.0 else 2) * SS))
    for k in range(6):
        ph = (t * 0.9 + k * math.pi / 6) % math.pi; w = abs(math.cos(ph)) * r
        d.ellipse([cx - w, cy - r, cx + w, cy + r], outline=a, width=3 * SS)
    for k in range(-3, 4):
        yy = cy + k * r / 3.6; ww = math.sqrt(max(0, r * r - (yy - cy) ** 2))
        d.line([(cx - ww, yy), (cx + ww, yy)], fill=(70, 130, 220), width=2 * SS)
    for k in range(8):  # points lumineux qui tournent autour
        an = t * 1.3 + k * math.pi / 4; disque(d, cx + (r * 1.1) * math.cos(an), cy + (r * 1.1) * math.sin(an) * 0.35, 6 * SS, BLANC)


def _faisceaux(im, t, alpha=46):
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    for k in range(4):
        bx = (((t * 260 + k * 560) % 2600) - 400) * SS
        ld.polygon([(bx, 0), (bx + 150 * SS, 0), (bx - 250 * SS, 1080 * SS), (bx - 400 * SS, 1080 * SS)], fill=(150, 200, 255, alpha))
    im.paste(Image.alpha_composite(im.convert('RGBA'), lay).convert('RGB'))


def _plein(t):
    im = _fond_info(); _faisceaux(im, t); d = ImageDraw.Draw(im)
    pa = ease(t / 0.9); _globe(d, (560 - 300 * (1 - pa)) * SS, 540 * SS, 290 * SS * (0.6 + 0.4 * pa), t)
    # liseré supérieur et inférieur
    e = ease(t / 0.5)
    d.rectangle([0, 0, 1920 * SS * e, 18 * SS], fill=(235, 30, 45)); d.rectangle([1920 * SS * (1 - e), 1062 * SS, 1920 * SS, 1080 * SS], fill=(235, 30, 45))
    # étiquette « ÉDITION SPÉCIALE » puis titre qui entre depuis la droite
    p1 = ease((t - 0.45) / 0.45); p2 = ease((t - 0.7) / 0.5)
    ox1, ox2 = 1500 * SS * (1 - p1), 1700 * SS * (1 - p2)
    d.rectangle([980 * SS + ox1, 330 * SS, 1620 * SS + ox1, 400 * SS], fill=(255, 205, 45))
    texte(d, 1010 * SS + ox1, 365 * SS, 'ÉDITION SPÉCIALE', 46 * SS, NOIR, ancre='lm')
    d.rectangle([980 * SS + ox2, 400 * SS, 1880 * SS + ox2, 700 * SS], fill=(205, 15, 32))
    d.rectangle([980 * SS + ox2, 400 * SS, 1000 * SS + ox2, 700 * SS], fill=BLANC)
    texte(d, 1040 * SS + ox2, 485 * SS, 'BREAKING', 118 * SS, BLANC, ancre='lm'); texte(d, 1040 * SS + ox2, 617 * SS, 'NEWS', 118 * SS, BLANC, ancre='lm')
    # reflet qui balaie le titre
    sh = (t - 1.5) / 0.7
    if 0 <= sh <= 1:
        lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay); bx = (900 + 1100 * sh) * SS
        ld.polygon([(bx, 400 * SS), (bx + 90 * SS, 400 * SS), (bx + 20 * SS, 700 * SS), (bx - 70 * SS, 700 * SS)], fill=(255, 255, 255, 120))
        m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rectangle([980 * SS, 400 * SS, 1880 * SS, 700 * SS], fill=255)
        lay.putalpha(Image.composite(lay.getchannel('A'), Image.new('L', im.size, 0), m)); im.paste(Image.alpha_composite(im.convert('RGBA'), lay).convert('RGB'))
        d = ImageDraw.Draw(im)
    p3 = ease((t - 1.9) / 0.5)
    texte(d, 1000 * SS, 780 * SS, 'L’INFORMATION EN CONTINU', 54 * SS, (255, 255, 255) if p3 > 0.5 else (60, 100, 170), ancre='lm')
    d.rectangle([1000 * SS, 820 * SS, (1000 + 760 * p3) * SS, 828 * SS], fill=(255, 205, 45))
    return im


def _bas(t, y0=780):
    """Bas d'écran : globe, bandeau rouge, direct clignotant et texte qui défile."""
    im, d = large(1920, 1080)
    d.rectangle([60 * SS, y0 * SS, 1860 * SS, (y0 + 130) * SS], fill=(205, 15, 32))
    for k in range(6):
        bx = (60 + ((t * 700 + k * 320) % 2000) - 140) * SS
        d.polygon([(bx, y0 * SS), (bx + 80 * SS, y0 * SS), (bx + 30 * SS, (y0 + 130) * SS), (bx - 50 * SS, (y0 + 130) * SS)], fill=(225, 45, 55))
    d.rectangle([60 * SS, y0 * SS, 330 * SS, (y0 + 220) * SS], fill=(10, 28, 90))
    _globe(d, 195 * SS, (y0 + 110) * SS, 70 * SS, t)
    n = max(1, int(13 * min(1, max(0, (t - 0.3) / 0.6)))); texte(d, 370 * SS, (y0 + 65) * SS, 'BREAKING NEWS'[:n], 100 * SS, BLANC, ancre='lm')
    bande = Image.new('RGB', (1530 * SS, 90 * SS), (10, 14, 30)); bd = ImageDraw.Draw(bande); ox = -((t * 340) % 1700) * SS
    for k in range(3):
        texte(bd, 290 * SS + k * 1700 * SS + ox, 45 * SS, 'INFORMATION IMPORTANTE  •  RESTEZ CONNECTÉS  •  À SUIVRE', 46 * SS, BLANC, ancre='lm')
    im.paste(bande, (330 * SS, (y0 + 130) * SS))
    d.rectangle([330 * SS, (y0 + 130) * SS, 600 * SS, (y0 + 220) * SS], fill=(255, 205, 45))
    if int(t * 2.5) % 2 == 0:
        disque(d, 375 * SS, (y0 + 175) * SS, 13 * SS, ROUGE)
    texte(d, 410 * SS, (y0 + 175) * SS, 'EN DIRECT', 48 * SS, NOIR, ancre='lm')
    return im


def v_breaking(t):
    if t < 3.6:
        im = Image.new('RGB', (1920 * SS, 1080 * SS), VERT); A = _plein(t); q = ease((t - 3.0) / 0.6) if t > 3.0 else 0.0
        box = (int(60 * q * SS), int(780 * q * SS), int((1920 - 60 * q) * SS), int((1080 - 80 * q) * SS))
        im.paste(A.crop(box), box[:2])
    else:
        im = _bas(t - 3.6 + 1.0, 780 + int(330 * ease((t - 7.0) / 0.55)))
    return out(im, 1920, 1080, ombre=False)


def v_exclusif(t):
    im, d, c = sq(); s = rebond(t / 0.35); ang = -0.28 + 0.04 * math.sin(t * 20) * max(0, 0.7 - t)
    if s > 0.03:
        txt = Image.new('RGBA', (E * SS, E * SS), (0, 0, 0, 0)); td = ImageDraw.Draw(txt)
        w, h = 840 * SS * s, 260 * SS * s
        td.rounded_rectangle([E * SS / 2 - w / 2, E * SS / 2 - h / 2, E * SS / 2 + w / 2, E * SS / 2 + h / 2], radius=int(24 * SS * s), outline=ROUGE, width=int(18 * SS * s))
        td.text((E * SS / 2, E * SS / 2), 'EXCLUSIF', font=police(140 * SS * s), fill=ROUGE, anchor='mm')
        txt = txt.rotate(math.degrees(ang) * -1, resample=Image.BICUBIC); im.paste(txt, (0, 0), txt)
    return out(im)


def v_a_suivre(t):
    im, d = large(1920, 540); p = ease(t / 0.4); q = ease((t - 2.8) / 0.4); x = -1700 * SS * (1 - p) + 1700 * SS * q
    d.rounded_rectangle([x + 160 * SS, 150 * SS, x + 1600 * SS, 390 * SS], radius=40 * SS, fill=(15, 35, 95), outline=BLANC, width=8 * SS)
    texte(d, x + 880 * SS, 270 * SS, 'À SUIVRE…', 150 * SS, BLANC)
    for k in range(3):
        disque(d, x + 1500 * SS - k * 70 * SS, 270 * SS, 18 * SS * (1 + 0.5 * math.sin(t * 8 - k)), (255, 205, 45))
    return out(im, 1920, 540)


def v_alerte(t):
    im, d, c = sq(); s = rebond(t / 0.35) * (1 + 0.05 * math.sin(t * 12))
    if s > 0.03:
        r = 330 * SS * s; pts = [(c, c - r), (c + r * 0.98, c + r * 0.72), (c - r * 0.98, c + r * 0.72)]
        d.polygon(pts, fill=(255, 205, 45), outline=NOIR); d.line(pts + [pts[0]], fill=NOIR, width=int(14 * SS), joint='curve')
        d.rounded_rectangle([c - 28 * SS * s, c - r * 0.42, c + 28 * SS * s, c + r * 0.12], radius=int(18 * SS * s), fill=NOIR); disque(d, c, c + r * 0.38, 32 * SS * s, NOIR)
    if t > 0.5:
        etiquette(d, c, c + 380 * SS, rebond((t - 0.5) / 0.4), 'ATTENTION', ROUGE)
    return out(im)


# ---------- Argent ----------
def piece(d, x, y, r, rot=0.0):
    ell = abs(math.cos(rot)) * r; d.ellipse([x - ell, y - r, x + ell, y + r], fill=OR, outline=(150, 100, 0), width=int(6 * SS))
    if ell > r * 0.25:
        d.text((x, y), '$', font=police(r * 1.2), fill=(150, 100, 0), anchor='mm')


def v_riche(t):
    im, d, c = sq(); rng = np.random.default_rng(4)
    for k in range(34):
        t0 = rng.uniform(0, 1.8); x = rng.uniform(80, 1000) * SS; v = rng.uniform(0.7, 1.15); tt = t - t0
        if tt > 0:
            y = -80 * SS + tt * 560 * SS * v
            if y < E * SS + 100 * SS:
                if k % 3 == 0:  # billets rose/bleu (jamais verts)
                    d.rounded_rectangle([x - 70 * SS, y - 36 * SS, x + 70 * SS, y + 36 * SS], radius=8 * SS, fill=(250, 150, 190) if k % 2 else (120, 170, 255), outline=NOIR, width=4 * SS)
                    d.text((x, y), '$', font=police(46 * SS), fill=NOIR, anchor='mm')
                else:
                    piece(d, x, y, 40 * SS, tt * 5 + k)
    s = rebond(t / 0.5)
    if s > 0.03:  # couronne
        cx, cy, w, h = c, c - 40 * SS, 420 * SS * s, 230 * SS * s
        d.polygon([(cx - w / 2, cy + h / 2), (cx - w / 2, cy - h / 3), (cx - w / 4, cy), (cx, cy - h / 2), (cx + w / 4, cy), (cx + w / 2, cy - h / 3), (cx + w / 2, cy + h / 2)], fill=OR, outline=(150, 100, 0))
        for dx, col in ((-w / 4, (230, 40, 70)), (0, (60, 130, 255)), (w / 4, (230, 40, 70))):
            disque(d, cx + dx, cy + h / 5, 22 * SS * s, col)
        etiquette(d, c, c + 330 * SS, rebond((t - 0.4) / 0.4), 'RICHE !', (30, 30, 45), OR, 100)
    return out(im)


def v_pauvre(t):
    im, d, c = sq(); s = rebond(t / 0.45)
    if s > 0.03:  # portefeuille vide
        w, h = 520 * SS * s, 340 * SS * s
        d.rounded_rectangle([c - w / 2, c - h / 2, c + w / 2, c + h / 2], radius=int(40 * SS * s), fill=(150, 100, 70), outline=NOIR, width=int(8 * SS))
        d.rounded_rectangle([c + w * 0.18, c - h * 0.16, c + w * 0.62, c + h * 0.16], radius=int(30 * SS * s), fill=(110, 70, 50), outline=NOIR, width=int(6 * SS))
        disque(d, c + w * 0.3, c, 14 * SS * s, NOIR)
        for sgn in (-1, 1):  # poches retournées
            d.polygon([(c + sgn * (w / 2 + 10 * SS), c - 60 * SS), (c + sgn * (w / 2 + 130 * SS * s), c - 20 * SS), (c + sgn * (w / 2 + 110 * SS * s), c + 100 * SS * s), (c + sgn * (w / 2 + 10 * SS), c + 70 * SS)], fill=BLANC, outline=NOIR)
    if t > 0.5:
        a = ease((t - 0.5) / 0.4); piece(d, c - 40 * SS, c - 260 * SS + 220 * SS * a - 40 * SS * (1 if t > 1.2 else 0), 24 * SS * 1.2)
        for k in range(4):  # toile d'araignée / mites
            ang = k * 0.6; d.line([(c + 220 * SS, c - 170 * SS), (c + (220 + 130 * math.cos(ang)) * SS, c - 170 * SS + 130 * SS * math.sin(ang + 0.6))], fill=(230, 230, 235), width=3 * SS)
        etiquette(d, c, c + 330 * SS, rebond((t - 0.7) / 0.4), 'FAUCHÉ…', (90, 90, 110), BLANC, 100)
    return out(im)


def v_hausse(t):
    im, d, c = sq(); p = ease(t / 1.0)
    base = c + 330 * SS
    for k in range(6):  # bougies qui montent
        h = (70 + k * 85) * SS * min(1, max(0, (t - k * 0.12) / 0.4)); x = c - 330 * SS + k * 130 * SS
        d.rectangle([x - 36 * SS, base - h, x + 36 * SS, base], fill=TURQ, outline=NOIR, width=4 * SS)
    pts = [(c - 330 * SS + k * 130 * SS, base - (110 + k * 85) * SS * min(1, max(0, (t - k * 0.12) / 0.4)) - 50 * SS) for k in range(6)]
    if p > 0.05:
        d.line(pts[:max(2, int(1 + p * 5))], fill=BLANC, width=12 * SS, joint='curve')
        x, y = pts[min(5, int(p * 5))]
        d.polygon([(x + 70 * SS, y - 70 * SS), (x - 5 * SS, y - 60 * SS), (x + 60 * SS, y + 5 * SS)], fill=TURQ, outline=NOIR)
    if t > 0.9:
        etiquette(d, c, c - 330 * SS, rebond((t - 0.9) / 0.4), 'HAUSSE  ▲', TURQ, NOIR, 100)
    return out(im)


def v_baisse(t):
    im, d, c = sq(); p = ease(t / 1.0)
    base = c + 330 * SS
    for k in range(6):
        h = (560 - k * 85) * SS * min(1, max(0, (t - k * 0.12) / 0.4)); x = c - 330 * SS + k * 130 * SS
        d.rectangle([x - 36 * SS, base - h, x + 36 * SS, base], fill=ROUGE, outline=NOIR, width=4 * SS)
    pts = [(c - 330 * SS + k * 130 * SS, base - (610 - k * 85) * SS * min(1, max(0, (t - k * 0.12) / 0.4)) - 50 * SS) for k in range(6)]
    if p > 0.05:
        d.line(pts[:max(2, int(1 + p * 5))], fill=BLANC, width=12 * SS, joint='curve')
        x, y = pts[min(5, int(p * 5))]
        d.polygon([(x + 70 * SS, y + 70 * SS), (x - 5 * SS, y + 60 * SS), (x + 60 * SS, y - 5 * SS)], fill=ROUGE, outline=NOIR)
    if t > 0.9:
        etiquette(d, c, c - 330 * SS, rebond((t - 0.9) / 0.4), 'BAISSE  ▼', ROUGE, BLANC, 100)
    return out(im)


def v_jackpot(t):
    im, d, c = sq(); s = rebond(t / 0.4)
    if s > 0.03:
        w, h = 760 * SS * s, 360 * SS * s
        d.rounded_rectangle([c - w / 2, c - h / 2, c + w / 2, c + h / 2], radius=int(50 * SS * s), fill=(230, 40, 70), outline=OR, width=int(16 * SS))
        for k in range(3):
            x = c + (k - 1) * 230 * SS * s
            d.rounded_rectangle([x - 95 * SS * s, c - 120 * SS * s, x + 95 * SS * s, c + 120 * SS * s], radius=int(16 * SS), fill=BLANC)
            stop = 1.0 + k * 0.35
            sym = '7' if t > stop else str((int(t * 20) + k * 3) % 9 + 1)
            texte(d, x, c, sym, 190 * SS * s, ROUGE if t > stop else NOIR)
    if t > 1.9:
        etiquette(d, c, c + 330 * SS, rebond((t - 1.9) / 0.4) * (1 + 0.05 * math.sin(t * 14)), 'JACKPOT !', OR, NOIR, 110)
        for k in range(10):
            tt = (t - 1.9) * 1.2 + k * 0.1; piece(d, c + math.cos(k * 0.63) * 380 * SS, c - 220 * SS - 120 * SS * math.sin(tt * 3 + k), 36 * SS, tt * 6)
    return out(im)


# ---------- Divers ----------
def v_valide(t):
    im, d, c = sq(); s = rebond(t / 0.4)
    disque(d, c, c, 300 * SS * s, BLEU, BLANC, 14 * SS)
    if t > 0.3:
        p = ease((t - 0.3) / 0.35); a, b, m = (c - 140 * SS, c + 10 * SS), (c - 40 * SS, c + 120 * SS), (c + 160 * SS, c - 110 * SS)
        pts = [a, (a[0] + (b[0] - a[0]) * min(1, p * 2), a[1] + (b[1] - a[1]) * min(1, p * 2))]
        if p > 0.5:
            q = (p - 0.5) * 2; pts.append((b[0] + (m[0] - b[0]) * q, b[1] + (m[1] - b[1]) * q))
        d.line(pts, fill=BLANC, width=int(46 * SS), joint='curve')
    return out(im)


def v_erreur(t):
    im, d, c = sq(); s = rebond(t / 0.4); tr = math.sin(t * 40) * 10 * SS * (0.4 < t < 0.9)
    disque(d, c + tr, c, 300 * SS * s, ROUGE, BLANC, 14 * SS)
    if t > 0.25:
        p = ease((t - 0.25) / 0.3); k = 130 * SS * p
        d.line([(c + tr - k, c - k), (c + tr + k, c + k)], fill=BLANC, width=int(46 * SS)); d.line([(c + tr + k, c - k), (c + tr - k, c + k)], fill=BLANC, width=int(46 * SS))
    return out(im)




def flamme(d, cx, base, h, larg, col, t, graine):
    pts = [(cx - larg / 2, base)]
    n = 24
    for k in range(n + 1):
        u = k / n; ang = u * math.pi
        x = cx - math.cos(ang) * larg / 2 * (1 - 0.25 * math.sin(ang))
        y = base - math.sin(ang) * h * (1 + 0.08 * math.sin(t * 14 + graine + u * 9))
        pts.append((x + 14 * SS * math.sin(t * 11 + u * 7 + graine) * math.sin(ang), y))
    pts.append((cx + larg / 2, base))
    d.polygon(pts, fill=col)




def v_question(t):
    im, d, c = sq(); s = rebond(t / 0.4); rot = 0.18 * math.sin(t * 7)
    txt = Image.new('RGBA', (E * SS, E * SS), (0, 0, 0, 0)); td = ImageDraw.Draw(txt)
    td.text((E * SS / 2, E * SS / 2), '?', font=police(700 * SS * s), fill=(255, 205, 45), anchor='mm', stroke_width=int(14 * SS), stroke_fill=NOIR)
    txt = txt.rotate(math.degrees(rot), resample=Image.BICUBIC); im.paste(txt, (0, 0), txt)
    return out(im)


def v_top1(t):
    im, d, c = sq(); s = rebond(t / 0.5)
    if s > 0.03:
        d.polygon([(c - 150 * SS * s, c - 380 * SS * s), (c - 20 * SS * s, c - 380 * SS * s), (c + 40 * SS * s, c - 60 * SS * s), (c - 90 * SS * s, c - 60 * SS * s)], fill=ROUGE)
        d.polygon([(c + 150 * SS * s, c - 380 * SS * s), (c + 20 * SS * s, c - 380 * SS * s), (c - 40 * SS * s, c - 60 * SS * s), (c + 90 * SS * s, c - 60 * SS * s)], fill=BLEU)
        disque(d, c, c + 60 * SS, 230 * SS * s, OR, (150, 100, 0), 12 * SS)
        disque(d, c, c + 60 * SS, 180 * SS * s, (255, 220, 100), (200, 140, 20), 6 * SS)
        texte(d, c, c + 60 * SS, '1', 270 * SS * s, (150, 100, 0))
        if t > 0.6:
            etoile(d, c + 190 * SS, c - 100 * SS, 55 * SS * (0.5 + 0.5 * math.sin(t * 8)), BLANC, t)
    return out(im)


def v_applaudir(t):
    im, d, c = sq(); s = rebond(t / 0.4)
    for sgn in (-1, 1):
        ang = sgn * (0.25 - 0.22 * abs(math.sin(t * 9))) if t > 0.4 else sgn * 0.25
        mx = c + sgn * 80 * SS * (0.2 + abs(math.sin(t * 9)) * 0.0)
        d.rounded_rectangle([mx - 90 * SS * s + sgn * 70 * SS * abs(math.cos(t * 9)) * 0.4, c - 180 * SS * s, mx + 90 * SS * s + sgn * 70 * SS * abs(math.cos(t * 9)) * 0.4, c + 230 * SS * s], radius=int(80 * SS), fill=JAUNE, outline=JAUNE_BORD, width=int(8 * SS))
    for k in range(8):
        if t > 0.4 and int(t * 9 + k) % 2 == 0:
            a = k * math.pi / 4; d.line([(c + math.cos(a) * 330 * SS, c + math.sin(a) * 330 * SS), (c + math.cos(a) * 420 * SS, c + math.sin(a) * 420 * SS)], fill=(255, 235, 120), width=14 * SS)
    return out(im)


# (id, nom, catégorie, durée, générateur, largeur, hauteur, touche, position x, y, taille %, bruit, nom du bruit)
ANIMS = [
    ('commenter', 'Commenter', 'Réseaux', 2.8, v_commenter, E, E, 'c', 50, 55, 50, 'message'),
    ('partager', 'Partager', 'Réseaux', 2.6, v_partager, E, E, 's', 50, 55, 48, 'tr-pop'),
    ('enregistrer', 'Enregistrer', 'Réseaux', 2.8, v_enregistrer, E, E, 'z', 50, 55, 48, 'vl-clic'),
    ('suivre', 'Suis-moi', 'Réseaux', 3.4, v_suivre, E, E, 'v', 50, 78, 50, 'souris-clic'),
    ('breaking', 'BREAKING NEWS (générique)', 'Infos', 7.6, v_breaking, 1920, 1080, 'b', 50, 50, 100, 'generique-info'),
    ('exclusif', 'Exclusif', 'Infos', 2.8, v_exclusif, E, E, 'x', 50, 45, 48, 'tada'),
    ('a-suivre', 'À suivre…', 'Infos', 3.2, v_a_suivre, 1920, 540, 'q', 50, 80, 80, 'tr-whoosh-long'),
    ('alerte', 'Attention', 'Infos', 3.0, v_alerte, E, E, 'a', 50, 50, 48, 'fin-alerte'),
    ('reflechi', 'Réfléchi', 'Humeurs', 3.0, v_reflechi, E, E, 'g', 50, 50, 46, 'bloup'),
    ('cool', 'Cool', 'Humeurs', 2.8, v_cool, E, E, 'd', 50, 50, 46, 'swish-rapide'),
    ('riche', 'Riche', 'Argent', 3.4, v_riche, E, E, 'Maj+h', 50, 50, 70, 'riche'),
    ('pauvre', 'Pauvre', 'Argent', 3.2, v_pauvre, E, E, 'Maj+j', 50, 50, 55, 'trombone-triste'),
    ('hausse', 'Hausse', 'Argent', 3.0, v_hausse, E, E, 'Maj+k', 50, 50, 62, 'hausse'),
    ('baisse', 'Baisse', 'Argent', 3.0, v_baisse, E, E, 'Maj+u', 50, 50, 62, 'baisse'),
    ('jackpot', 'Jackpot', 'Argent', 3.8, v_jackpot, E, E, 'Maj+i', 50, 50, 62, 'jackpot'),
    ('valide', 'Validé ✓', 'Divers', 2.2, v_valide, E, E, 'Maj+v', 50, 50, 36, 'bonne-reponse'),
    ('erreur', 'Faux ✗', 'Divers', 2.2, v_erreur, E, E, 'Maj+x', 50, 50, 36, 'mauvaise-reponse'),
    ('question', 'Question', 'Divers', 2.6, v_question, E, E, 'Maj+z', 50, 50, 40, 'pod-ping'),
    ('top1', 'N°1', 'Divers', 3.0, v_top1, E, E, 'Maj+w', 50, 50, 42, 'fanfare'),
    ('applaudir', 'Applaudir', 'Divers', 3.0, v_applaudir, E, E, 'Maj+s', 50, 55, 40, 'applaudissements-courts'),
]


def main():
    seul = set(a for a in sys.argv[1:] if a != '--index')
    idx_f = os.path.join(F.RACINE, 'index.json')
    index = json.load(open(idx_f, encoding='utf8'))
    os.makedirs(os.path.join(F.RACINE, 'fondvert'), exist_ok=True)
    existants = {x['id']: x for x in index.get('fondvert', [])}
    for id_, nom, cat, duree, gen, w, h, touche, x, y, s, bruit in ANIMS:
        if seul and id_ not in seul:
            continue
        if '--index' not in sys.argv:
                encoder(os.path.join(F.RACINE, 'fondvert', id_ + '.mp4'), (w, h), gen, duree, crf=20)
        existants[id_] = {'id': id_, 'nom': nom, 'cat': 'Animations sur fond vert', 'groupe': cat, 'file': f'fondvert/{id_}.mp4', 'duree': duree, 'w': w, 'h': h, 'touche': touche, 'x': x, 'y': y, 's': s, 'son': f'sons/{bruit}.mp3'}
        print(' ', nom)
    if os.environ.get('ANIM_SANS_INDEX'):  # lots en parallèle : l'index est écrit à la fin par un dernier passage sans filtre (--index)
        return
    index['fondvert'] = list(existants.values())
    json.dump(index, open(idx_f, 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
