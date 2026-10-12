#!/usr/bin/env python3
"""Fonds pour la bourse et l'économie : bougies japonaises qui défilent en boucle parfaite (vidéo) et deux images fixes (16:9 et vertical).
Usage : python3 scripts/generer-fonds-finance.py   → bibliotheque/fonds/anime-bourse.mp4, bourse-sombre-h/v.jpg et liste « fonds » de index.json (ffmpeg requis)."""
import json
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ici = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.join(ici, '..', 'bibliotheque')
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
VERT, ROUGE, FOND = (25, 211, 138), (255, 77, 94), (6, 10, 22)


def serie(n, graine):
    """Marche aléatoire fermée (la fin rejoint le début) : défilement en boucle sans à-coup."""
    r = np.random.default_rng(graine)
    pas = r.normal(0, 1, n * 4)
    ferme = np.cumsum(pas)
    ferme -= np.linspace(0, ferme[-1], len(ferme))
    # bougies : ouverture = clôture précédente, mèches aléatoires
    clot = ferme[::4]
    ouv = np.roll(clot, 1)
    haut = np.maximum(ouv, clot) + np.abs(r.normal(0, 0.9, n))
    bas = np.minimum(ouv, clot) - np.abs(r.normal(0, 0.9, n))
    return ouv, clot, haut, bas


def dessiner(w, h, decalage, n_vis=46, n=184, graine=7):
    ouv, clot, haut, bas = serie(n, graine)
    im = Image.new('RGB', (w, h), FOND)
    d = ImageDraw.Draw(im)
    for k in range(1, 8):  # grille
        y = int(h * k / 8)
        d.line([(0, y), (w, y)], fill=(16, 24, 44), width=1)
    pas = w / n_vis
    mn, mx = min(bas), max(haut)
    mn, mx = np.percentile(bas, 3), np.percentile(haut, 97)
    echelle = (h * 0.78) / (mx - mn)
    y0 = h * 0.88
    cal = lambda v: y0 - (v - mn) * echelle
    for i in range(-2, n_vis + 3):
        idx = int(np.floor(decalage)) + i
        k = idx % n
        x = (i - (decalage - np.floor(decalage))) * pas + pas / 2
        hausse = clot[k] >= ouv[k]
        c = VERT if hausse else ROUGE
        d.line([(x, cal(haut[k])), (x, cal(bas[k]))], fill=c, width=max(1, int(pas * 0.08)))
        y1, y2 = cal(max(ouv[k], clot[k])), cal(min(ouv[k], clot[k]))
        d.rectangle([x - pas * 0.32, y1, x + pas * 0.32, max(y1 + 2, y2)], fill=c)
    flou = im.filter(ImageFilter.GaussianBlur(w / 160))
    arr = np.clip(np.asarray(im, dtype=np.float32) * 0.85 + np.asarray(flou, dtype=np.float32) * 0.9, 0, 255)
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :, None]
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    arr *= 0.55 + 0.45 * np.clip(1.2 - ((x - 0.5) ** 2 + (y - 0.5) ** 2) * 1.4, 0, 1)  # vignettage
    return Image.fromarray(arr.astype(np.uint8))


def video(dest, duree=12, ips=24, w=1280, h=720):
    p = subprocess.Popen([FFMPEG, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(ips), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
                          '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dest], stdin=subprocess.PIPE)
    total = int(duree * ips)
    for k in range(total):
        p.stdin.write(np.asarray(dessiner(w, h, (k / total) * 46, n=46), dtype=np.uint8).tobytes())  # la série compte 46 bougies et 46 défilent : la boucle est parfaite
    p.stdin.close()
    if p.wait():
        raise SystemExit('Échec de l’encodage de ' + dest)


def main():
    idx_f = os.path.join(RACINE, 'index.json')
    index = json.load(open(idx_f, encoding='utf8'))
    os.makedirs(os.path.join(RACINE, 'fonds'), exist_ok=True)
    dessiner(1920, 1080, 20.3).save(os.path.join(RACINE, 'fonds', 'bourse-sombre-h.jpg'), quality=90)
    dessiner(1080, 1920, 20.3, n_vis=26).save(os.path.join(RACINE, 'fonds', 'bourse-sombre-v.jpg'), quality=90)
    video(os.path.join(RACINE, 'fonds', 'anime-bourse.mp4'))
    index['fonds'] = [x for x in index.get('fonds', []) if x['id'] not in ('bourse-sombre', 'anime-bourse')]
    index['fonds'] += [{'id': 'bourse-sombre', 'nom': 'Bougies de bourse (fixe)', 'cat': 'Finance', 'file': 'fonds/bourse-sombre-h.jpg', 'kind': 'image'},
                       {'id': 'anime-bourse', 'nom': 'Bougies de bourse qui défilent (animé)', 'cat': 'Finance', 'file': 'fonds/anime-bourse.mp4', 'kind': 'video'}]
    json.dump(index, open(idx_f, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('fonds de bourse générés')


if __name__ == '__main__':
    main()
