#!/usr/bin/env python3
"""Génère les stickers (PNG transparents) de QuentMovie : flèches, cercles, bulles, étiquettes, boutons, cadres.
Créations originales, sans droits. Usage : python3 scripts/generer-stickers.py
Écrit bibliotheque/stickers/*.png et ajoute la liste « stickers » dans bibliotheque/index.json."""
import json
import math
import os
from PIL import Image, ImageDraw, ImageFont

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bibliotheque')
SORTIE = os.path.join(RACINE, 'stickers')
S = 512
POLICES = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf']


def police(taille):
    for p in POLICES:
        if os.path.exists(p):
            return ImageFont.truetype(p, taille)
    return ImageFont.load_default()


def nouveau(largeur=S, hauteur=S):
    im = Image.new('RGBA', (largeur, hauteur), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def texte_centre(d, xy, txt, taille, couleur, ombre=None, largeur_max=None):
    f = police(taille)
    b = d.textbbox((0, 0), txt, font=f)
    while largeur_max and (b[2] - b[0]) > largeur_max and taille > 20:  # réduit le texte pour qu'il tienne dans l'étiquette
        taille -= 4
        f = police(taille)
        b = d.textbbox((0, 0), txt, font=f)
    x = xy[0] - (b[2] - b[0]) / 2 - b[0]
    y = xy[1] - (b[3] - b[1]) / 2 - b[1]
    if ombre:
        d.text((x + 4, y + 5), txt, font=f, fill=ombre)
    d.text((x, y), txt, font=f, fill=couleur)


def contour(d, pts, rempli, bord=(0, 0, 0, 255), ep=10):
    d.polygon(pts, fill=rempli)
    d.line(pts + [pts[0]], fill=bord, width=ep, joint='curve')


def fleche(angle):
    im, d = nouveau()
    pts = [(60, 190), (290, 190), (290, 100), (460, 256), (290, 412), (290, 322), (60, 322)]
    contour(d, pts, (255, 59, 48, 255), (255, 255, 255, 255), 14)
    return im.rotate(angle, resample=Image.BICUBIC)


def cercle():
    im, d = nouveau()
    d.ellipse((40, 40, S - 40, S - 40), outline=(255, 59, 48, 255), width=34)
    return im


def croix():
    im, d = nouveau()
    d.line((90, 90, S - 90, S - 90), fill=(255, 59, 48, 255), width=70)
    d.line((S - 90, 90, 90, S - 90), fill=(255, 59, 48, 255), width=70)
    return im


def coche():
    im, d = nouveau()
    d.ellipse((30, 30, S - 30, S - 30), fill=(52, 199, 89, 255))
    d.line((130, 270, 220, 360), fill='white', width=60, joint='curve')
    d.line((220, 360, 390, 160), fill='white', width=60, joint='curve')
    return im


def point(symbole, couleur):
    im, d = nouveau()
    d.ellipse((30, 30, S - 30, S - 30), fill=couleur)
    texte_centre(d, (S / 2, S / 2 + 6), symbole, 360, 'white')
    return im


def etoile(couleur=(255, 204, 0, 255)):
    im, d = nouveau()
    pts = []
    for i in range(10):
        r = 230 if i % 2 == 0 else 100
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((S / 2 + r * math.cos(a), S / 2 + r * math.sin(a) + 12))
    contour(d, pts, couleur, (255, 255, 255, 255), 12)
    return im


def coeur():
    im, d = nouveau()
    d.ellipse((50, 70, 270, 290), fill=(255, 45, 85, 255))
    d.ellipse((242, 70, 462, 290), fill=(255, 45, 85, 255))
    d.polygon([(62, 215), (450, 215), (256, 450)], fill=(255, 45, 85, 255))
    return im


def eclair():
    im, d = nouveau()
    contour(d, [(300, 20), (110, 290), (240, 290), (190, 492), (400, 210), (270, 210)], (255, 214, 10, 255), (255, 255, 255, 255), 12)
    return im


def bulle(pensee=False):
    im, d = nouveau(S, S)
    d.rounded_rectangle((30, 50, S - 30, 340), radius=90, fill='white', outline=(30, 30, 30, 255), width=12)
    if pensee:
        for (cx, cy, r) in [(130, 390, 38), (84, 450, 24), (50, 490, 14)]:
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill='white', outline=(30, 30, 30, 255), width=8)
    else:
        d.polygon([(110, 330), (90, 470), (230, 335)], fill='white')
        d.line([(110, 335), (90, 470), (232, 340)], fill=(30, 30, 30, 255), width=12, joint='curve')
        d.rectangle((118, 322, 222, 346), fill='white')
    return im


def etiquette(txt, couleur, taille=170, point_blanc=False, largeur=S):
    im, d = nouveau(largeur, 220)
    d.rounded_rectangle((8, 8, largeur - 8, 212), radius=44, fill=couleur, outline=(255, 255, 255, 255), width=8)
    x = largeur / 2
    if point_blanc:
        d.ellipse((46, 80, 106, 140), fill='white')
        x += 30
    texte_centre(d, (x, 112), txt, taille, 'white', largeur_max=largeur - (150 if point_blanc else 70))
    return im


def bouton(txt, couleur, taille=84):
    im, d = nouveau(S, 180)
    d.rounded_rectangle((8, 14, S - 8, 166), radius=30, fill=couleur, outline=(255, 255, 255, 255), width=8)
    texte_centre(d, (S / 2, 92), txt, taille, 'white', largeur_max=S - 70)
    return im


def cadre_polaroid():
    im, d = nouveau()
    d.rectangle((0, 0, S, S), fill='white')
    d.rectangle((40, 40, S - 40, S - 120), fill=(0, 0, 0, 0))
    ombre = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    return Image.alpha_composite(ombre, im)


def cadre_rec():
    im, d = nouveau()
    c = (255, 255, 255, 255)
    for (x, y, dx, dy) in [(20, 20, 1, 1), (S - 20, 20, -1, 1), (20, S - 20, 1, -1), (S - 20, S - 20, -1, -1)]:
        d.line((x, y, x + dx * 120, y), fill=c, width=14)
        d.line((x, y, x, y + dy * 120), fill=c, width=14)
    d.ellipse((60, 60, 110, 110), fill=(255, 59, 48, 255))
    d.text((126, 56), 'REC', font=police(56), fill=c)
    return im


def smiley(lunettes=False):
    im, d = nouveau()
    d.ellipse((20, 20, S - 20, S - 20), fill=(255, 204, 0, 255), outline=(60, 40, 0, 255), width=12)
    if lunettes:
        d.rounded_rectangle((90, 170, 230, 260), radius=30, fill=(20, 20, 20, 255))
        d.rounded_rectangle((282, 170, 422, 260), radius=30, fill=(20, 20, 20, 255))
        d.line((230, 200, 282, 200), fill=(20, 20, 20, 255), width=14)
    else:
        d.ellipse((150, 160, 210, 250), fill=(40, 25, 0, 255))
        d.ellipse((302, 160, 362, 250), fill=(40, 25, 0, 255))
    d.arc((120, 190, 392, 420), 20, 160, fill=(40, 25, 0, 255), width=22)
    return im


def soleil():
    im, d = nouveau()
    for i in range(12):
        a = i * math.pi / 6
        d.line((S / 2 + 150 * math.cos(a), S / 2 + 150 * math.sin(a), S / 2 + 235 * math.cos(a), S / 2 + 235 * math.sin(a)), fill=(255, 176, 0, 255), width=26)
    d.ellipse((130, 130, S - 130, S - 130), fill=(255, 204, 0, 255), outline=(255, 255, 255, 255), width=10)
    return im


def fleche_courbe():
    im, d = nouveau()
    d.arc((70, 70, 430, 430), 200, 340, fill=(255, 59, 48, 255), width=36)
    d.polygon([(420, 190), (470, 300), (350, 280)], fill=(255, 59, 48, 255))
    return im


def etoiles_note():
    im, d = nouveau(S, 150)
    for i in range(5):
        x = 20 + i * 98
        pts = []
        for k in range(10):
            r = 46 if k % 2 == 0 else 20
            a = -math.pi / 2 + k * math.pi / 5
            pts.append((x + 48 + r * math.cos(a), 78 + r * math.sin(a)))
        d.polygon(pts, fill=(255, 204, 0, 255), outline=(255, 255, 255, 255))
    return im


STICKERS = [
    ('fleche-droite', 'Flèche droite', 'Flèches et repères', lambda: fleche(0)),
    ('fleche-bas', 'Flèche vers le bas', 'Flèches et repères', lambda: fleche(-90)),
    ('fleche-haut', 'Flèche vers le haut', 'Flèches et repères', lambda: fleche(90)),
    ('fleche-gauche', 'Flèche gauche', 'Flèches et repères', lambda: fleche(180)),
    ('fleche-courbe', 'Flèche courbe', 'Flèches et repères', fleche_courbe),
    ('cercle-rouge', 'Cercle de surbrillance', 'Flèches et repères', cercle),
    ('croix-rouge', 'Croix rouge', 'Flèches et repères', croix),
    ('coche-verte', 'Coche verte', 'Flèches et repères', coche),
    ('exclamation', 'Point d’exclamation', 'Flèches et repères', lambda: point('!', (255, 149, 0, 255))),
    ('interrogation', 'Point d’interrogation', 'Flèches et repères', lambda: point('?', (10, 132, 255, 255))),
    ('bulle-parole', 'Bulle de parole', 'Bulles et émotions', lambda: bulle(False)),
    ('bulle-pensee', 'Bulle de pensée', 'Bulles et émotions', lambda: bulle(True)),
    ('smiley', 'Smiley', 'Bulles et émotions', smiley),
    ('smiley-lunettes', 'Smiley lunettes', 'Bulles et émotions', lambda: smiley(True)),
    ('coeur', 'Cœur', 'Bulles et émotions', coeur),
    ('etoile', 'Étoile', 'Bulles et émotions', etoile),
    ('eclair', 'Éclair', 'Bulles et émotions', eclair),
    ('soleil', 'Soleil', 'Bulles et émotions', soleil),
    ('note-etoiles', 'Note 5 étoiles', 'Bulles et émotions', etoiles_note),
    ('tag-live', 'Étiquette LIVE', 'Étiquettes et boutons', lambda: etiquette('LIVE', (255, 45, 85, 255), 130, True)),
    ('tag-new', 'Étiquette NEW', 'Étiquettes et boutons', lambda: etiquette('NEW', (10, 132, 255, 255))),
    ('tag-top', 'Étiquette TOP', 'Étiquettes et boutons', lambda: etiquette('TOP', (255, 149, 0, 255))),
    ('tag-wow', 'Étiquette WOW', 'Étiquettes et boutons', lambda: etiquette('WOW !', (175, 82, 222, 255), 150)),
    ('tag-promo', 'Étiquette PROMO', 'Étiquettes et boutons', lambda: etiquette('PROMO', (255, 59, 48, 255), 140)),
    ('tag-gratuit', 'Étiquette GRATUIT', 'Étiquettes et boutons', lambda: etiquette('GRATUIT', (52, 199, 89, 255), 120)),
    ('bouton-abonne', 'Bouton S’ABONNER', 'Étiquettes et boutons', lambda: bouton('S’ABONNER', (255, 0, 0, 255), 88)),
    ('bouton-jaime', 'Bouton J’AIME', 'Étiquettes et boutons', lambda: bouton('J’AIME  👍'.replace('  👍', ''), (10, 132, 255, 255), 96)),
    ('bouton-partage', 'Bouton PARTAGER', 'Étiquettes et boutons', lambda: bouton('PARTAGER', (52, 199, 89, 255), 92)),
    ('cadre-visee', 'Cadre caméra REC', 'Cadres', cadre_rec),
    ('cadre-blanc', 'Cadre blanc', 'Cadres', cadre_polaroid),
]


def main():
    os.makedirs(SORTIE, exist_ok=True)
    index_chemin = os.path.join(RACINE, 'index.json')
    index = json.load(open(index_chemin)) if os.path.exists(index_chemin) else {'sons': [], 'musiques': []}
    index['stickers'] = []
    for (ident, nom, cat, fabrique) in STICKERS:
        im = fabrique()
        im.save(os.path.join(SORTIE, ident + '.png'), optimize=True)
        index['stickers'].append({'id': ident, 'nom': nom, 'cat': cat, 'file': 'stickers/' + ident + '.png', 'w': im.width, 'h': im.height})
    json.dump(index, open(index_chemin, 'w'), indent=1, ensure_ascii=False)
    print(len(STICKERS), 'stickers')


main()
