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
from PIL import Image, ImageDraw

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


def out(im, w=E, h=E):
    return im.resize((w, h), Image.LANCZOS)


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


def v_content(t):
    im, d, c = sq(); r = 330 * SS * rebond(t / 0.45) * (1 + 0.03 * math.sin(t * 9))
    visage(d, c, c, r)
    for sgn in (-1, 1):  # yeux rieurs (arcs vers le haut)
        d.arc([c + sgn * r * 0.38 - r * 0.16, c - r * 0.3, c + sgn * r * 0.38 + r * 0.16, c - r * 0.0], 200, 340, fill=NOIR, width=int(r * 0.07))
    d.chord([c - r * 0.52, c - r * 0.05, c + r * 0.52, c + r * 0.62], 0, 180, fill=(110, 30, 30), outline=NOIR, width=int(r * 0.04))
    d.chord([c - r * 0.38, c - r * 0.05, c + r * 0.38, c + r * 0.14], 0, 180, fill=BLANC)
    for k in range(8):
        tt = t - 0.2 - k * 0.08
        if tt > 0:
            a = k * math.pi / 4 + 0.3; dist = (360 + 140 * ease(tt / 1.0)) * SS; etoile(d, c + math.cos(a) * dist, c + math.sin(a) * dist, 26 * SS * max(0, 1 - tt / 1.6), (255, 240, 120), tt * 3)
    return out(im)


def v_enerve(t):
    im, d, c = sq(); r = 330 * SS * rebond(t / 0.4); tr = (math.sin(t * 40) * 9 * SS) if t > 0.5 else 0
    rouge = min(1, max(0, (t - 0.1) / 0.6)); fond = tuple(int(JAUNE[i] * (1 - rouge) + (240, 60, 40)[i] * rouge) for i in range(3))
    cx = c + tr; visage(d, cx, c, r, fond, (130, 20, 10))
    for sgn in (-1, 1):  # sourcils en colère
        d.line([(cx + sgn * r * 0.68, c - r * 0.52), (cx + sgn * r * 0.14, c - r * 0.2)], fill=NOIR, width=int(r * 0.1))
        disque(d, cx + sgn * r * 0.38, c - r * 0.04, r * 0.09, NOIR)
    d.arc([cx - r * 0.42, c + r * 0.28, cx + r * 0.42, c + r * 0.78], 200, 340, fill=NOIR, width=int(r * 0.07))
    for k in range(3):  # vapeur
        for sgn in (-1, 1):
            tt = (t * 1.3 + k * 0.33) % 1
            if t > 0.5:
                disque(d, cx + sgn * (r * 0.95 + 30 * SS * tt), c - r * 0.35 - 260 * SS * tt, (28 + 50 * tt) * SS, (235, 235, 245))
    if 0.7 < t < 1.6 and int(t * 10) % 2 == 0:  # éclair
        pts = [(c + 40 * SS, c - 520 * SS), (c - 70 * SS, c - 380 * SS), (c, c - 400 * SS), (c - 90 * SS, c - 250 * SS), (c + 70 * SS, c - 390 * SS), (c, c - 370 * SS)]
        d.polygon(pts, fill=(255, 225, 40), outline=NOIR)
    return out(im)


def v_triste(t):
    im, d, c = sq(); r = 300 * SS * rebond(t / 0.45); cy = c + 60 * SS
    visage(d, c, cy, r, (140, 185, 255), (40, 70, 150))
    for sgn in (-1, 1):
        disque(d, c + sgn * r * 0.38, cy - r * 0.08, r * 0.09, NOIR)
        d.line([(c + sgn * r * 0.62, cy - r * 0.34), (c + sgn * r * 0.16, cy - r * 0.26 - sgn * r * 0.1)], fill=NOIR, width=int(r * 0.06))
    d.arc([c - r * 0.38, cy + r * 0.34, c + r * 0.38, cy + r * 0.84], 200, 340, fill=NOIR, width=int(r * 0.06))
    for k in range(4):  # larmes
        for sgn in (-1, 1):
            tt = (t * 0.9 + k * 0.25 + (0.1 if sgn > 0 else 0)) % 1
            if t > 0.5:
                disque(d, c + sgn * r * 0.4, cy + r * 0.0 + tt * r * 0.9, 14 * SS * (1 - 0.4 * tt), (170, 215, 255))
    if t > 0.3:  # nuage et pluie
        nx = c; ny = cy - r - 90 * SS; s = ease((t - 0.3) / 0.4)
        for dx, dr in ((-110, 80), (0, 105), (110, 80)):
            disque(d, nx + dx * SS * s, ny, dr * SS * s, (120, 130, 160))
        for k in range(7):
            tt = (t * 1.6 + k * 0.17) % 1; d.line([(nx - 150 * SS + k * 50 * SS, ny + 90 * SS + tt * 150 * SS), (nx - 158 * SS + k * 50 * SS, ny + 120 * SS + tt * 150 * SS)], fill=(120, 170, 255), width=8 * SS)
    return out(im)


def v_choque(t):
    im, d, c = sq(); r = 320 * SS * rebond(t / 0.3) * (1 + 0.04 * math.sin(t * 25) * (t > 0.3))
    visage(d, c, c + 20 * SS, r)
    for sgn in (-1, 1):
        disque(d, c + sgn * r * 0.38, c - r * 0.08, r * 0.2, BLANC, NOIR, 5 * SS); disque(d, c + sgn * r * 0.38, c - r * 0.08, r * 0.08, NOIR)
        d.line([(c + sgn * r * 0.6, c - r * 0.52), (c + sgn * r * 0.2, c - r * 0.5 - 12 * SS)], fill=NOIR, width=int(r * 0.05))
    d.ellipse([c - r * 0.16, c + r * 0.3, c + r * 0.16, c + r * 0.72], fill=(90, 20, 30), outline=NOIR, width=int(r * 0.04))
    for k, tx in enumerate(('!', '?', '!')):
        tt = t - 0.3 - k * 0.12
        if tt > 0:
            texte(d, c + (-1 + k) * 190 * SS, c - r - 60 * SS - 20 * SS * math.sin(tt * 8), tx, 150 * SS * rebond(tt / 0.3), ROUGE, contour=NOIR)
    return out(im)


def coeur(d, x, y, r, fill):
    pts = [(x + r * math.sin(a) ** 3, y - r * (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)) / 16) for a in [2 * math.pi * k / 50 for k in range(50)]]
    d.polygon(pts, fill=fill)


def v_amoureux(t):
    im, d, c = sq(); r = 320 * SS * rebond(t / 0.45)
    visage(d, c, c + 30 * SS, r)
    for sgn in (-1, 1):
        coeur(d, c + sgn * r * 0.4, c - r * 0.05 + 30 * SS, r * (0.2 + 0.03 * math.sin(t * 10)), (235, 30, 80))
    d.arc([c - r * 0.4, c + r * 0.15, c + r * 0.4, c + r * 0.7], 20, 160, fill=NOIR, width=int(r * 0.06))
    for k in range(9):
        tt = (t * 0.8 + k * 0.11) % 1
        if t > 0.4:
            coeur(d, c + math.sin(k * 2.1 + tt * 4) * 300 * SS, c - 120 * SS - tt * 520 * SS, 30 * SS * (1 - tt * 0.5), (255, 110, 150))
    return out(im)


def v_mdr(t):
    im, d, c = sq(); r = 320 * SS * rebond(t / 0.4); dx = math.sin(t * 22) * 12 * SS * (t > 0.4); dy = math.sin(t * 17) * 8 * SS * (t > 0.4)
    visage(d, c + dx, c + dy, r)
    for sgn in (-1, 1):
        d.arc([c + dx + sgn * r * 0.4 - r * 0.18, c + dy - r * 0.28, c + dx + sgn * r * 0.4 + r * 0.18, c + dy + r * 0.04], 200, 340, fill=NOIR, width=int(r * 0.07))
    d.chord([c + dx - r * 0.55, c + dy - r * 0.02, c + dx + r * 0.55, c + dy + r * 0.62], 0, 180, fill=(110, 30, 30), outline=NOIR, width=int(r * 0.04))
    for k in range(6):
        for sgn in (-1, 1):
            tt = (t * 1.2 + k * 0.17) % 1
            if t > 0.4:
                disque(d, c + sgn * (r * 0.75 + 220 * SS * tt), c - r * 0.1 - 90 * SS * math.sin(tt * math.pi) + 120 * SS * tt, 24 * SS * (1 - tt * 0.5), (130, 190, 255))
    return out(im)


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


def v_live(t):
    im, d, c = sq(); s = rebond(t / 0.4)
    if s > 0.03:
        w, h = 520 * SS * s, 190 * SS * s
        d.rounded_rectangle([c - w / 2, c - h / 2, c + w / 2, c + h / 2], radius=int(h * 0.3), fill=ROUGE, outline=BLANC, width=int(8 * SS))
        if int(t * 2) % 2 == 0:
            disque(d, c - w * 0.3, c, 28 * SS * s, BLANC)
        texte(d, c + w * 0.08, c, 'LIVE', 120 * SS * s, BLANC)
    return out(im)


def v_nouvelle_video(t):
    im, d = large(1920, 540); p = ease(t / 0.45); q = ease((t - 3.4) / 0.4)
    x0 = -1900 * SS * (1 - p) + 1900 * SS * q
    d.rounded_rectangle([x0 + 120 * SS, 130 * SS, x0 + 1800 * SS, 410 * SS], radius=60 * SS, fill=ROUGE, outline=BLANC, width=8 * SS)
    d.polygon([(x0 + 200 * SS, 190 * SS), (x0 + 200 * SS, 350 * SS), (x0 + 340 * SS, 270 * SS)], fill=BLANC)
    texte(d, x0 + 1050 * SS, 270 * SS, 'NOUVELLE VIDÉO', 150 * SS, BLANC)
    return out(im, 1920, 540)


# ---------- Infos ----------
def v_breaking(t):
    im, d = large(1920, 540); p = ease(t / 0.5); q = ease((t - 4.0) / 0.45); sh = -1950 * SS * (1 - p) + 1950 * SS * q
    # bandeau rouge, barres claires qui balaient, pastille du monde qui tourne
    d.rectangle([sh + 60 * SS, 110 * SS, sh + 1860 * SS, 330 * SS], fill=(200, 15, 30))
    for k in range(6):
        bx = sh + (60 + ((t * 700 + k * 320) % 2000) - 140) * SS
        d.polygon([(bx, 110 * SS), (bx + 90 * SS, 110 * SS), (bx + 40 * SS, 330 * SS), (bx - 50 * SS, 330 * SS)], fill=(225, 45, 55))
    d.rectangle([sh + 60 * SS, 110 * SS, sh + 400 * SS, 330 * SS], fill=(15, 35, 95))
    gx, gy, gr = sh + 230 * SS, 220 * SS, 78 * SS
    disque(d, gx, gy, gr, (40, 90, 200), BLANC, 6 * SS)
    for k in range(3):
        a = (t * 1.6 + k * math.pi / 3) % math.pi; d.ellipse([gx - gr * abs(math.cos(a)), gy - gr, gx + gr * abs(math.cos(a)), gy + gr], outline=BLANC, width=4 * SS)
    d.line([(gx - gr, gy), (gx + gr, gy)], fill=BLANC, width=4 * SS)
    reveal = min(1, max(0, (t - 0.3) / 0.6)); n = int(reveal * 13)
    texte(d, sh + 440 * SS, 220 * SS, 'BREAKING NEWS'[:max(1, n)], 150 * SS, BLANC, ancre='lm')
    # bande du bas : « EN DIRECT » qui clignote et texte qui défile
    d.rectangle([sh + 60 * SS, 330 * SS, sh + 1860 * SS, 420 * SS], fill=(15, 15, 25))
    ox = -((t * 360) % 1400) * SS
    for k in range(3):
        texte(d, sh + (430 + k * 1400) * SS + ox, 375 * SS, 'INFO IMPORTANTE  •  À SUIVRE', 52 * SS, BLANC, ancre='lm')
    # le texte qui défile passe sous l'étiquette « EN DIRECT » (redessinée par-dessus)
    d.rectangle([sh + 60 * SS, 330 * SS, sh + 400 * SS, 420 * SS], fill=(255, 205, 45))
    if int(t * 2.5) % 2 == 0:
        disque(d, sh + 110 * SS, 375 * SS, 14 * SS, ROUGE)
    texte(d, sh + 150 * SS, 375 * SS, 'EN DIRECT', 56 * SS, NOIR, ancre='lm')
    return out(im, 1920, 540)


def v_flash_info(t):
    im, d = large(1920, 540); p = ease(t / 0.35); q = ease((t - 3.0) / 0.35); y = 540 * SS * (1 - p) + 400 * SS * q
    clignote = (int(t * 4) % 2 == 0)
    d.rectangle([60 * SS, 150 * SS + y, 1860 * SS, 330 * SS + y], fill=(255, 205, 45) if clignote else (255, 235, 140))
    for k in range(18):
        d.polygon([(60 * SS + k * 100 * SS, 150 * SS + y), (110 * SS + k * 100 * SS, 150 * SS + y), (60 * SS + k * 100 * SS, 190 * SS + y), (10 * SS + k * 100 * SS, 190 * SS + y)], fill=NOIR) if 60 + k * 100 < 1860 else None
    texte(d, 960 * SS, 250 * SS + y, 'FLASH INFO', 150 * SS, NOIR)
    return out(im, 1920, 540)


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


def v_bravo(t):
    im, d, c = sq(); s = rebond(t / 0.5)
    if s > 0.03:
        cx, cy = c, c - 40 * SS; w = 330 * SS * s
        d.polygon([(cx - w / 2, cy - 220 * SS * s), (cx + w / 2, cy - 220 * SS * s), (cx + w * 0.38, cy + 40 * SS * s), (cx + w * 0.15, cy + 130 * SS * s), (cx - w * 0.15, cy + 130 * SS * s), (cx - w * 0.38, cy + 40 * SS * s)], fill=OR, outline=(150, 100, 0))
        for sgn in (-1, 1):
            d.arc([cx + sgn * w * 0.7 - w * 0.28, cy - 200 * SS * s, cx + sgn * w * 0.7 + w * 0.28, cy - 20 * SS * s], 0 if sgn > 0 else 180, 360 if sgn > 0 else 540, fill=OR, width=int(26 * SS * s))
        d.rectangle([cx - 40 * SS * s, cy + 130 * SS * s, cx + 40 * SS * s, cy + 230 * SS * s], fill=OR); d.rounded_rectangle([cx - 150 * SS * s, cy + 230 * SS * s, cx + 150 * SS * s, cy + 300 * SS * s], radius=int(14 * SS), fill=(190, 130, 20))
        etoile(d, cx, cy - 60 * SS * s, 70 * SS * s, BLANC, t * 2)
    for k in range(10):
        tt = t - 0.3 - k * 0.07
        if tt > 0:
            a = k * 0.63; dist = (300 + 220 * ease(tt / 0.9)) * SS; etoile(d, c + math.cos(a) * dist, c - 40 * SS + math.sin(a) * dist, 28 * SS * max(0, 1 - tt / 1.5), (255, 240, 130), tt * 4)
    if t > 0.8:
        etiquette(d, c, c + 380 * SS, rebond((t - 0.8) / 0.4), 'BRAVO !', ROUGE, BLANC, 100)
    return out(im)


def v_idee(t):
    im, d, c = sq(); s = rebond(t / 0.45)
    if t > 0.4:
        for k in range(12):
            a = k * math.pi / 6; r1, r2 = 300 * SS, (380 + 30 * math.sin(t * 14 + k)) * SS; d.line([(c + math.cos(a) * r1, c - 60 * SS + math.sin(a) * r1), (c + math.cos(a) * r2, c - 60 * SS + math.sin(a) * r2)], fill=(255, 235, 120), width=14 * SS)
    disque(d, c, c - 60 * SS, 230 * SS * s, (255, 235, 120) if t > 0.4 else (225, 225, 235), NOIR, 10 * SS)
    d.rounded_rectangle([c - 110 * SS * s, c + 150 * SS * s, c + 110 * SS * s, c + 290 * SS * s], radius=int(20 * SS), fill=(150, 150, 165), outline=NOIR, width=int(8 * SS))
    for k in range(3):
        d.line([(c - 110 * SS * s, c + (190 + k * 35) * SS * s), (c + 110 * SS * s, c + (190 + k * 35) * SS * s)], fill=NOIR, width=int(6 * SS))
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


def v_feu(t):
    im, d, c = sq(); s = rebond(t / 0.45)
    base = c + 300 * SS
    for k, (dx, h, larg) in enumerate(((-150, 380, 220), (150, 330, 200), (0, 520, 330))):
        flamme(d, c + dx * SS, base, h * SS * s, larg * SS * s, (255, 80, 30), t, k)
    for k, (dx, h, larg) in enumerate(((-120, 250, 130), (130, 220, 120), (0, 360, 210))):
        flamme(d, c + dx * SS, base, h * SS * s, larg * SS * s, (255, 160, 30), t + 0.1, k + 3)
    flamme(d, c, base, 200 * SS * s, 110 * SS * s, (255, 240, 130), t + 0.2, 7)
    return out(im)


def v_cent(t):
    im, d, c = sq(); s = rebond(t / 0.4) * (1 + 0.03 * math.sin(t * 10))
    texte(d, c, c - 20 * SS, '100', 520 * SS * s, ROUGE, contour=NOIR)
    if t > 0.3:
        p = ease((t - 0.3) / 0.4)
        for dy in (0, 40):
            d.line([(c - 330 * SS, c + (230 + dy) * SS), (c - 330 * SS + 660 * SS * p, c + (210 + dy) * SS)], fill=ROUGE, width=int(30 * SS))
    return out(im)


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
    ('commenter', 'Commenter', 'Réseaux', 2.8, v_commenter, E, E, 'c', 50, 55, 50, 'pop'),
    ('partager', 'Partager', 'Réseaux', 2.6, v_partager, E, E, 's', 50, 55, 48, 'swish-rapide'),
    ('enregistrer', 'Enregistrer', 'Réseaux', 2.8, v_enregistrer, E, E, 'z', 50, 55, 48, 'pop'),
    ('suivre', 'Suis-moi', 'Réseaux', 3.4, v_suivre, E, E, 'v', 50, 78, 50, 'souris-clic'),
    ('live', 'Live', 'Réseaux', 3.0, v_live, E, E, '0', 82, 20, 30, 'notification'),
    ('nouvelle-video', 'Nouvelle vidéo', 'Réseaux', 3.8, v_nouvelle_video, 1920, 540, 'w', 50, 82, 85, 'whoosh-court'),
    ('breaking', 'BREAKING NEWS (mini générique)', 'Infos', 4.6, v_breaking, 1920, 540, 'b', 50, 80, 96, 'impact-cinema'),
    ('flash-info', 'Flash info', 'Infos', 3.4, v_flash_info, 1920, 540, 'f', 50, 80, 90, 'message'),
    ('exclusif', 'Exclusif', 'Infos', 2.8, v_exclusif, E, E, 'x', 50, 45, 48, 'boom-transition'),
    ('a-suivre', 'À suivre…', 'Infos', 3.2, v_a_suivre, 1920, 540, 'q', 50, 80, 80, 'whoosh-court'),
    ('alerte', 'Attention', 'Infos', 3.0, v_alerte, E, E, 'a', 50, 50, 48, 'erreur'),
    ('content', 'Content', 'Humeurs', 3.0, v_content, E, E, 'h', 50, 50, 46, 'succes'),
    ('enerve', 'Énervé', 'Humeurs', 3.0, v_enerve, E, E, 'j', 50, 50, 46, 'tonnerre'),
    ('triste', 'Triste', 'Humeurs', 3.4, v_triste, E, E, 'k', 50, 50, 46, 'mauvaise-reponse'),
    ('choque', 'Choqué', 'Humeurs', 2.6, v_choque, E, E, 'u', 50, 50, 46, 'impact-leger'),
    ('amoureux', 'Amoureux', 'Humeurs', 3.2, v_amoureux, E, E, 'i', 50, 50, 46, 'magie'),
    ('mdr', 'Mort de rire', 'Humeurs', 3.0, v_mdr, E, E, 'y', 50, 50, 46, 'ba-dum-tss'),
    ('reflechi', 'Réfléchi', 'Humeurs', 3.0, v_reflechi, E, E, 'g', 50, 50, 46, 'bloup'),
    ('cool', 'Cool', 'Humeurs', 2.8, v_cool, E, E, 'd', 50, 50, 46, 'swish-rapide'),
    ('riche', 'Riche', 'Argent', 3.4, v_riche, E, E, 'Maj+h', 50, 50, 70, 'pieces'),
    ('pauvre', 'Pauvre', 'Argent', 3.2, v_pauvre, E, E, 'Maj+j', 50, 50, 55, 'grillons'),
    ('hausse', 'Hausse', 'Argent', 3.0, v_hausse, E, E, 'Maj+k', 50, 50, 62, 'niveau-suivant'),
    ('baisse', 'Baisse', 'Argent', 3.0, v_baisse, E, E, 'Maj+u', 50, 50, 62, 'descente'),
    ('jackpot', 'Jackpot', 'Argent', 3.8, v_jackpot, E, E, 'Maj+i', 50, 50, 62, 'piece-jeu'),
    ('valide', 'Validé ✓', 'Divers', 2.2, v_valide, E, E, 'Maj+v', 50, 50, 36, 'bonne-reponse'),
    ('erreur', 'Faux ✗', 'Divers', 2.2, v_erreur, E, E, 'Maj+x', 50, 50, 36, 'mauvaise-reponse'),
    ('bravo', 'Bravo (trophée)', 'Divers', 3.2, v_bravo, E, E, 'Maj+b', 50, 50, 55, 'succes'),
    ('idee', 'Idée', 'Divers', 2.6, v_idee, E, E, 'Maj+a', 50, 45, 40, 'ding-cloche'),
    ('feu', 'Feu', 'Divers', 2.8, v_feu, E, E, 'Maj+q', 50, 50, 42, 'feu'),
    ('cent', '100 %', 'Divers', 2.4, v_cent, E, E, 'Maj+c', 50, 50, 50, 'impact-leger'),
    ('question', 'Question', 'Divers', 2.6, v_question, E, E, 'Maj+z', 50, 50, 40, 'bloup'),
    ('top1', 'N°1', 'Divers', 3.0, v_top1, E, E, 'Maj+w', 50, 50, 42, 'succes'),
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
