#!/usr/bin/env python3
"""Pochettes d'épisode pour les podcasts audio (fond derrière le visualiseur sonore) : quatre ambiances, en 16:9 et en vertical 9:16.
Usage : python3 scripts/generer-fonds-podcast.py   → bibliotheque/fonds/podcast-*-h.jpg / -v.jpg et liste « fonds » de index.json."""
import json
import math
import os

import numpy as np
from PIL import Image, ImageFilter

ici = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.join(ici, '..', 'bibliotheque')


def grille(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    return x / w, y / h


def lueur(x, y, cx, cy, r, couleur, force=1.0):
    d = np.sqrt(((x - cx) * (x.shape[1] / x.shape[0])) ** 2 + (y - cy) ** 2)
    return (np.exp(-(d * d) / (2 * r * r))[..., None] * np.asarray(couleur, dtype=np.float32) * force)


def grain(a, graine, force=6):
    r = np.random.default_rng(graine)
    return a + r.normal(0, force, a.shape[:2])[..., None]


def orange(w, h):
    x, y = grille(w, h)
    a = np.zeros((h, w, 3), np.float32) + np.array([20, 14, 20], np.float32)
    a += lueur(x, y, 0.15, 1.0, 0.55, (255, 110, 40), 0.85) + lueur(x, y, 0.95, 0.0, 0.4, (160, 40, 90), 0.5)
    d = np.sqrt(((x - 0.15) * (w / h)) ** 2 + (y - 1.0) ** 2)
    a += (np.exp(-(((d * 9) % 1 - 0.5) ** 2) / 0.0035) * 22)[..., None] * np.array([1, 0.6, 0.35]) * np.clip(1 - d / 1.6, 0, 1)[..., None]
    return a


def violet(w, h):
    x, y = grille(w, h)
    a = np.zeros((h, w, 3), np.float32) + np.array([14, 10, 38], np.float32)
    a += lueur(x, y, 0.2, 0.2, 0.45, (120, 70, 255), 0.9) + lueur(x, y, 0.85, 0.85, 0.5, (255, 60, 170), 0.65) + lueur(x, y, 0.6, 0.35, 0.3, (40, 140, 255), 0.4)
    return a


def sable(w, h):
    x, y = grille(w, h)
    a = np.zeros((h, w, 3), np.float32) + np.array([232, 222, 205], np.float32)
    a -= lueur(x, y, 0.85, 0.2, 0.5, (40, 55, 70), 0.55) + lueur(x, y, 0.1, 0.95, 0.45, (60, 80, 100), 0.45)
    a += lueur(x, y, 0.3, 0.3, 0.35, (30, 20, 5), 0.25)
    r = np.random.default_rng(5)
    fibres = np.asarray(Image.fromarray((r.random((h // 6, w // 6)) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32)
    return a + (fibres[..., None] - 128) * 0.06


def nuit(w, h):
    x, y = grille(w, h)
    a = np.zeros((h, w, 3), np.float32) + np.array([8, 14, 34], np.float32) * (1.4 - y[..., None] * 0.6)
    a += lueur(x, y, 0.5, 1.05, 0.5, (60, 110, 230), 0.8)
    r = np.random.default_rng(9)
    for _ in range(260):
        px, py = int(r.random() * w), int(r.random() * h * 0.75)
        a[max(0, py - 1):py + 1, max(0, px - 1):px + 1] += r.random() * 190
    return a


STYLES = [('podcast-orange', 'Pochette orange (soir)', orange), ('podcast-violet', 'Pochette violet et rose', violet),
          ('podcast-sable', 'Pochette sable (papier)', sable), ('podcast-nuit', 'Pochette nuit étoilée', nuit)]


def main():
    idx_f = os.path.join(RACINE, 'index.json')
    index = json.load(open(idx_f, encoding='utf8'))
    index['fonds'] = [x for x in index.get('fonds', []) if not x['id'].startswith('podcast-')]
    for id_, nom, f in STYLES:
        for suffixe, (w, h) in (('h', (1920, 1080)), ('v', (1080, 1920))):
            a = grain(f(w, h), 11)
            Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.4)).save(os.path.join(RACINE, 'fonds', f'{id_}-{suffixe}.jpg'), quality=90)
        index['fonds'].append({'id': id_, 'nom': nom, 'cat': 'Podcast', 'file': f'fonds/{id_}-h.jpg', 'kind': 'image'})
        print(' ', nom)
    json.dump(index, open(idx_f, 'w', encoding='utf8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
