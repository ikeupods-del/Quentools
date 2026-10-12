#!/usr/bin/env python3
"""Icônes « autocollants » de QuentMovie (vlog, podcast, finance, tech) : formes pleines, liseré blanc, ombre portée, PNG transparents 512×512.
Créations originales, sans droits. Usage : python3 scripts/generer-icones.py → bibliotheque/stickers/ic-*.png et liste « stickers » de index.json."""
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bibliotheque')
S, SS = 512, 2
NOIR, BLANC = (24, 26, 40, 255), (255, 255, 255, 255)
ROUGE, ORANGE, JAUNE, VERT, TURQ, BLEU, VIOLET, ROSE, GRIS = (255, 59, 70, 255), (255, 149, 0, 255), (255, 204, 0, 255), (40, 200, 120, 255), (0, 199, 190, 255), (10, 132, 255, 255), (150, 90, 235, 255), (255, 90, 160, 255), (110, 118, 140, 255)


def toile():
    im = Image.new('RGBA', (S * SS, S * SS), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def p(*pts):
    return [(x * SS, y * SS) for x, y in pts]


def rr(d, x0, y0, x1, y1, r, fill, bord=NOIR, ep=8):
    d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=r * SS, fill=fill, outline=bord, width=ep * SS // 2)


def el(d, cx, cy, rx, ry, fill, bord=NOIR, ep=8):
    d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=fill, outline=bord, width=ep * SS // 2)


def po(d, pts, fill, bord=NOIR, ep=8):
    d.polygon(p(*pts), fill=fill)
    d.line(p(*(pts + [pts[0]])), fill=bord, width=ep * SS // 2, joint='curve')


def reflet(d, x0, y0, x1, y1):
    d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=min(x1 - x0, y1 - y0) * SS / 2, fill=(255, 255, 255, 110))


def finir(im):
    """Réduit, ajoute le liseré blanc de l'autocollant et une ombre portée douce."""
    im = im.resize((S, S), Image.LANCZOS)
    a = np.asarray(im)[..., 3]
    masque = Image.fromarray(a)
    gros = masque.filter(ImageFilter.MaxFilter(15)).point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.GaussianBlur(0.8))
    sortie = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ombre = Image.new('RGBA', (S, S), (10, 14, 30, 120)); ombre.putalpha(gros.filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.45)))
    sortie.alpha_composite(ombre, (4, 7))
    blanc = Image.new('RGBA', (S, S), BLANC); blanc.putalpha(gros)
    sortie.alpha_composite(blanc)
    sortie.alpha_composite(im)
    return sortie


def pin():
    im, d = toile()
    el(d, 256, 200, 120, 120, ROUGE); po(d, [(150, 270), (362, 270), (256, 460)], ROUGE); el(d, 256, 200, 120, 120, ROUGE, ROUGE, 1)
    el(d, 256, 200, 48, 48, BLANC); reflet(d, 170, 130, 215, 175)
    return im


def camera():
    im, d = toile()
    rr(d, 60, 170, 452, 400, 36, GRIS); rr(d, 170, 120, 300, 190, 18, GRIS)
    el(d, 256, 285, 92, 92, NOIR); el(d, 256, 285, 66, 66, BLEU); el(d, 256, 285, 28, 28, (200, 230, 255, 255), NOIR, 4)
    el(d, 400, 215, 15, 15, ORANGE, NOIR, 4); reflet(d, 80, 190, 160, 205)
    return im


def micro():
    im, d = toile()
    rr(d, 190, 60, 322, 270, 66, GRIS)
    for y in (110, 150, 190): d.line(p((205, y), (307, y)), fill=NOIR, width=7 * SS // 2)
    d.arc([140 * SS, 160 * SS, 372 * SS, 360 * SS], 0, 180, fill=NOIR, width=18 * SS)
    d.line(p((256, 360), (256, 430)), fill=NOIR, width=18 * SS); rr(d, 186, 420, 326, 454, 12, NOIR)
    reflet(d, 205, 80, 225, 140)
    return im


def play():
    im, d = toile()
    rr(d, 40, 100, 472, 412, 76, ROUGE); po(d, [(206, 180), (206, 332), (338, 256)], BLANC, BLANC, 2)
    reflet(d, 70, 120, 330, 148)
    return im


def ampoule():
    im, d = toile()
    el(d, 256, 205, 128, 128, JAUNE); po(d, [(194, 300), (318, 300), (298, 360), (214, 360)], JAUNE, NOIR, 8)
    rr(d, 206, 360, 306, 392, 12, GRIS); rr(d, 226, 392, 286, 426, 14, GRIS)
    d.arc([200 * SS, 150 * SS, 312 * SS, 260 * SS], 200, 340, fill=NOIR, width=7 * SS); reflet(d, 170, 130, 215, 190)
    return im


def fusee():
    im, d = toile()
    po(d, [(256, 40), (330, 150), (330, 330), (182, 330), (182, 150)], BLANC)
    po(d, [(182, 250), (110, 350), (182, 330)], ROUGE); po(d, [(330, 250), (402, 350), (330, 330)], ROUGE)
    el(d, 256, 190, 40, 40, BLEU); po(d, [(206, 330), (306, 330), (280, 400), (232, 400)], ORANGE)
    po(d, [(232, 400), (280, 400), (256, 470)], JAUNE, NOIR, 6); po(d, [(256, 40), (300, 108), (212, 108)], ROUGE, NOIR, 6)
    return im


def trophee():
    im, d = toile()
    po(d, [(150, 70), (362, 70), (342, 230), (256, 290), (170, 230)], JAUNE)
    d.arc([60 * SS, 80 * SS, 190 * SS, 200 * SS], 90, 270, fill=NOIR, width=14 * SS); d.arc([322 * SS, 80 * SS, 452 * SS, 200 * SS], -90, 90, fill=NOIR, width=14 * SS)
    rr(d, 232, 285, 280, 380, 6, JAUNE); rr(d, 160, 380, 352, 440, 16, ORANGE); reflet(d, 180, 90, 200, 190)
    return im


def piece():
    im, d = toile()
    el(d, 256, 256, 190, 190, JAUNE); el(d, 256, 256, 150, 150, (255, 224, 90, 255), (200, 140, 0, 255), 6)
    d.text((256 * SS, 256 * SS), '€', font=_pol(250 * SS), fill=(190, 120, 0, 255), anchor='mm'); reflet(d, 120, 130, 200, 160)
    return im


def _pol(t):
    from PIL import ImageFont
    for c in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'):
        if os.path.exists(c):
            return ImageFont.truetype(c, int(t))
    return ImageFont.load_default()


def hausse():
    im, d = toile()
    rr(d, 50, 330, 120, 450, 8, TURQ); rr(d, 150, 270, 220, 450, 8, TURQ); rr(d, 250, 200, 320, 450, 8, TURQ); rr(d, 350, 130, 420, 450, 8, TURQ)
    d.line(p((60, 270), (180, 190), (260, 140), (400, 60)), fill=BLANC, width=26 * SS, joint='curve'); po(d, [(440, 40), (380, 40), (440, 100)], BLANC, NOIR, 6)
    return im


def baisse():
    im, d = toile()
    rr(d, 50, 130, 120, 450, 8, ROUGE); rr(d, 150, 190, 220, 450, 8, ROUGE); rr(d, 250, 270, 320, 450, 8, ROUGE); rr(d, 350, 340, 420, 450, 8, ROUGE)
    d.line(p((60, 80), (180, 180), (260, 220), (400, 320)), fill=BLANC, width=26 * SS, joint='curve'); po(d, [(440, 350), (440, 290), (380, 350)], BLANC, NOIR, 6)
    return im


def bouclier():
    im, d = toile()
    po(d, [(256, 40), (440, 110), (430, 280), (256, 470), (82, 280), (72, 110)], BLEU)
    d.line(p((170, 255), (235, 320), (350, 190)), fill=BLANC, width=34 * SS, joint='curve'); reflet(d, 110, 120, 150, 250)
    return im


def couronne():
    im, d = toile()
    po(d, [(60, 380), (60, 150), (160, 260), (256, 100), (352, 260), (452, 150), (452, 380)], JAUNE)
    rr(d, 60, 380, 452, 430, 10, ORANGE); el(d, 256, 100, 22, 22, ROUGE, NOIR, 5); el(d, 60, 150, 20, 20, BLEU, NOIR, 5); el(d, 452, 150, 20, 20, VERT, NOIR, 5)
    return im


def flamme():
    im, d = toile()
    po(d, [(256, 30), (360, 170), (420, 300), (380, 410), (256, 470), (132, 410), (92, 300), (150, 200), (190, 260), (210, 150)], ORANGE)
    po(d, [(256, 200), (330, 300), (330, 400), (256, 450), (182, 400), (182, 300)], JAUNE, JAUNE, 2)
    return im


def loupe():
    im, d = toile()
    d.line(p((330, 330), (450, 450)), fill=NOIR, width=60 * SS); d.line(p((330, 330), (450, 450)), fill=(150, 90, 40, 255), width=40 * SS)
    el(d, 215, 215, 150, 150, (200, 230, 255, 255), NOIR, 22); el(d, 215, 215, 130, 130, (200, 230, 255, 255), (150, 190, 230, 255), 6); reflet(d, 120, 130, 170, 160)
    return im


def cadenas():
    im, d = toile()
    d.arc([140 * SS, 50 * SS, 372 * SS, 300 * SS], 180, 360, fill=NOIR, width=44 * SS); d.arc([156 * SS, 66 * SS, 356 * SS, 290 * SS], 180, 360, fill=GRIS, width=22 * SS)
    rr(d, 90, 230, 422, 450, 36, JAUNE); el(d, 256, 320, 36, 36, NOIR, NOIR, 2); rr(d, 244, 330, 268, 395, 10, NOIR); reflet(d, 112, 250, 220, 276)
    return im


def engrenage():
    im, d = toile()
    pts = []
    for k in range(24):
        a = math.pi * 2 * k / 24; r = 215 if k % 3 else 160
        pts += [(256 + r * math.cos(a - 0.06), 256 + r * math.sin(a - 0.06)), (256 + r * math.cos(a + 0.06), 256 + r * math.sin(a + 0.06))]
    po(d, [(256 + (215 if (i // 2) % 3 else 175) * math.cos(math.pi * 2 * i / 48), 256 + (215 if (i // 2) % 3 else 175) * math.sin(math.pi * 2 * i / 48)) for i in range(48)], GRIS)
    el(d, 256, 256, 112, 112, (200, 206, 220, 255)); el(d, 256, 256, 62, 62, NOIR)
    return im


def wifi():
    im, d = toile()
    for r, c in ((200, BLEU), (140, BLEU), (80, BLEU)):
        d.arc([(256 - r) * SS, (330 - r) * SS, (256 + r) * SS, (330 + r) * SS], 225, 315, fill=NOIR, width=62 * SS)
        d.arc([(256 - r) * SS, (330 - r) * SS, (256 + r) * SS, (330 + r) * SS], 225, 315, fill=c, width=40 * SS)
    el(d, 256, 330, 34, 34, BLEU)
    return im


def mail():
    im, d = toile()
    rr(d, 50, 110, 462, 410, 30, BLANC); d.line(p((60, 130), (256, 290), (452, 130)), fill=NOIR, width=14 * SS, joint='curve'); el(d, 396, 130, 44, 44, ROUGE, NOIR, 5)
    return im


def horloge():
    im, d = toile()
    el(d, 256, 256, 200, 200, BLANC); el(d, 256, 256, 170, 170, (240, 244, 255, 255), (150, 160, 190, 255), 5)
    for k in range(12):
        a = math.pi * 2 * k / 12; d.line(p((256 + 150 * math.cos(a), 256 + 150 * math.sin(a)), (256 + 130 * math.cos(a), 256 + 130 * math.sin(a))), fill=NOIR, width=8 * SS)
    d.line(p((256, 256), (256, 140)), fill=NOIR, width=14 * SS); d.line(p((256, 256), (340, 296)), fill=ROUGE, width=12 * SS); el(d, 256, 256, 16, 16, NOIR, NOIR, 2)
    return im


def calendrier():
    im, d = toile()
    rr(d, 60, 90, 452, 440, 34, BLANC); rr(d, 60, 90, 452, 190, 34, ROUGE); d.rectangle([60 * SS, 150 * SS, 452 * SS, 190 * SS], fill=ROUGE)
    for x in (150, 362): rr(d, x - 14, 50, x + 14, 130, 12, NOIR)
    for ry in (240, 310, 380):
        for rx in (110, 190, 270, 350): rr(d, rx, ry - 24, rx + 50, ry + 24, 8, (210, 218, 235, 255), (210, 218, 235, 255), 1)
    rr(d, 270, 286, 320, 334, 8, ROUGE, ROUGE, 1)
    return im


def drapeau():
    im, d = toile()
    rr(d, 90, 40, 116, 470, 6, NOIR); po(d, [(116, 60), (430, 60), (370, 140), (430, 220), (116, 220)], ROUGE); reflet(d, 130, 74, 330, 92)
    return im


def livre():
    im, d = toile()
    po(d, [(256, 120), (60, 90), (60, 400), (256, 440)], BLEU); po(d, [(256, 120), (452, 90), (452, 400), (256, 440)], (70, 160, 255, 255))
    for y in (180, 230, 280, 330): d.line(p((90, y - 10), (230, y + 4)), fill=BLANC, width=9 * SS); d.line(p((282, y + 4), (422, y - 10)), fill=BLANC, width=9 * SS)
    return im


def diamant():
    im, d = toile()
    po(d, [(256, 450), (60, 190), (140, 90), (372, 90), (452, 190)], TURQ)
    po(d, [(60, 190), (452, 190), (256, 450)], (90, 230, 225, 255), NOIR, 6); d.line(p((140, 90), (190, 190), (256, 90), (322, 190), (372, 90)), fill=NOIR, width=6 * SS)
    reflet(d, 170, 112, 200, 160)
    return im


def maison():
    im, d = toile()
    po(d, [(256, 50), (462, 230), (410, 230), (410, 440), (102, 440), (102, 230), (50, 230)], ROUGE)
    rr(d, 130, 230, 382, 440, 6, (255, 240, 220, 255)); rr(d, 216, 320, 296, 440, 6, ORANGE); rr(d, 150, 260, 200, 310, 6, (160, 210, 255, 255))
    return im


def avion():
    im, d = toile()
    po(d, [(40, 230), (470, 60), (330, 450), (250, 320)], BLANC); po(d, [(250, 320), (470, 60), (230, 300)], (210, 220, 240, 255), NOIR, 6)
    po(d, [(250, 320), (232, 420), (310, 360)], (170, 185, 215, 255), NOIR, 6)
    return im


def micro_onair():
    im, d = toile()
    rr(d, 40, 130, 472, 380, 40, ROUGE); d.text((256 * SS, 255 * SS), 'ON AIR', font=_pol(84 * SS), fill=BLANC, anchor='mm'); reflet(d, 70, 150, 440, 176)
    return im


ICONES = [('pin', 'Repère de lieu', pin), ('appareil', 'Appareil photo', camera), ('micro', 'Micro', micro), ('play', 'Bouton lecture', play), ('ampoule', 'Idée (ampoule)', ampoule),
          ('fusee', 'Fusée', fusee), ('trophee', 'Trophée', trophee), ('piece', 'Pièce d’euro', piece), ('hausse', 'Graphique en hausse', hausse), ('baisse', 'Graphique en baisse', baisse),
          ('bouclier', 'Bouclier validé', bouclier), ('couronne', 'Couronne', couronne), ('flamme', 'Flamme', flamme), ('loupe', 'Loupe', loupe), ('cadenas', 'Cadenas', cadenas),
          ('engrenage', 'Engrenage', engrenage), ('wifi', 'Wi-Fi', wifi), ('mail', 'Courrier', mail), ('horloge', 'Horloge', horloge), ('calendrier', 'Calendrier', calendrier),
          ('drapeau', 'Drapeau', drapeau), ('livre', 'Livre ouvert', livre), ('diamant', 'Diamant', diamant), ('maison', 'Maison', maison), ('avion', 'Avion en papier', avion), ('onair', 'ON AIR', micro_onair)]


def main():
    sortie = os.path.join(RACINE, 'stickers')
    os.makedirs(sortie, exist_ok=True)
    idx_f = os.path.join(RACINE, 'index.json')
    index = json.load(open(idx_f, encoding='utf8'))
    index['stickers'] = [x for x in index.get('stickers', []) if not x['id'].startswith('ic-')]
    for id_, nom, f in ICONES:
        finir(f()).save(os.path.join(sortie, f'ic-{id_}.png'), optimize=True)
        index['stickers'].append({'id': 'ic-' + id_, 'nom': nom, 'cat': 'Icônes (vlog, finance, tech)', 'file': f'stickers/ic-{id_}.png', 'w': S, 'h': S})
    json.dump(index, open(idx_f, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(len(ICONES), 'icônes')


if __name__ == '__main__':
    main()
