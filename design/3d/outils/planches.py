#!/usr/bin/env python3
"""Planches de présentation à partir des aperçus (outils/apercus.js) : une par ère, une pour tous les
personnages, une pour les accessoires, une pour les portraits. Usage : python3 design/3d/outils/planches.py"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, '..', 'sortie')
FOND = (52, 60, 72)
ERES = {'1-antiquite': 'Antiquité', '2-moyen-age': 'Moyen Âge', '3-epoque-moderne': 'Époque moderne',
        '4-industrielle': 'Ère industrielle', '5-xxe-siecle': 'XXe siècle', '6-contemporain': 'Contemporain',
        '7-futur': 'Futur'}


def police(t):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/Library/Fonts/Arial Bold.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, t)
    return ImageFont.load_default()


def vue(x, i, n=4, fichier='apercu.png'):
    im = Image.open(os.path.join(SORTIE, x['chemin'], fichier)).convert('RGBA')
    w = im.width // n
    return im.crop((i * w, 0, (i + 1) * w, im.height))


def planche(items, titre, chemin, vues=(0, 1), fichier='apercu.png', n=4, cols=None, ech=1.0):
    cases = []
    for x in items:
        ims = [vue(x, i, n, fichier) for i in vues]
        w, h = sum(i.width for i in ims), ims[0].height
        c = Image.new('RGBA', (w, h + 34), FOND + (255,))
        xx = 0
        for im in ims:
            c.alpha_composite(im, (xx, 0))
            xx += im.width
        d = ImageDraw.Draw(c)
        d.text((10, h + 4), x['nom'] + ('  ·  ' + x['culture'] if x.get('culture') else ''), fill=(235, 238, 242),
               font=police(18))
        if ech != 1.0:
            c = c.resize((int(c.width * ech), int(c.height * ech)), Image.LANCZOS)
        cases.append(c)
    cols = cols or min(len(cases), 4)
    lignes = (len(cases) + cols - 1) // cols
    cw, ch = max(c.width for c in cases), max(c.height for c in cases)
    pl = Image.new('RGB', (cols * cw, lignes * ch + 70), FOND)
    ImageDraw.Draw(pl).text((16, 16), titre, fill=(255, 255, 255), font=police(34))
    for i, c in enumerate(cases):
        pl.paste(c, ((i % cols) * cw, 70 + (i // cols) * ch), c)
    pl.save(chemin, optimize=True)


def main():
    cat = json.load(open(os.path.join(SORTIE, 'catalogue.json'), encoding='utf8'))
    os.makedirs(os.path.join(SORTIE, 'apercus'), exist_ok=True)
    persos = [x for x in cat if x['type'] == 'personnage']
    accs = [x for x in cat if x['type'] == 'accessoire']
    for ere, nom in ERES.items():
        p = [x for x in persos if x['ere'] == ere]
        if p:
            planche(p, 'Personnages — ' + nom, os.path.join(SORTIE, 'apercus', 'personnages-%s.png' % ere))
            planche(p, 'Couleur du joueur (bleu) — ' + nom,
                    os.path.join(SORTIE, 'apercus', 'personnages-%s-couleur-joueur.png' % ere), fichier='apercu-couleur-joueur.png')
    planche(persos, 'Tous les personnages (même squelette)', os.path.join(SORTIE, 'apercus', 'tous-les-personnages.png'),
            vues=(0,), cols=7, ech=0.75)
    planche(persos, 'Portraits', os.path.join(SORTIE, 'apercus', 'portraits.png'), vues=(0,), fichier='portrait.png', n=1,
            cols=7, ech=0.5)
    planche(accs, 'Accessoires', os.path.join(SORTIE, 'apercus', 'accessoires.png'), vues=(0, 1), n=3, cols=6, ech=0.6)


if __name__ == '__main__':
    main()
