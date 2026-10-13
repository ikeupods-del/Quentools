"""Rendu : 3 sketchs × 4 plans + carte finale (question + appel à s'abonner), exactement 62,0 s.

Les images sont dessinées avec Pillow et envoyées brutes à ffmpeg (nombre d'images exact :
62 s × 30 = 1860), le son est mixé à l'échantillon près : la durée ne dépend d'aucun arrondi.
"""
import array
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import config
import history
import series
import voice

W, H, FPS = config.LARGEUR, config.HAUTEUR, config.FPS
TOTAL = int(round(config.DUREE * FPS))
DEBUT_VOIX = 0.12          # la voix démarre juste après le changement de plan
POP = 0.45                 # apparition du bouton « S'abonner » (s après le début de la carte finale)
VOIX_CTA = 0.95            # réplique d'appel à s'abonner, juste après le ding
TEMPO_MAX = 1.6

VERT = (198, 232, 74)
NUIT = (22, 24, 34)
BLANC = (255, 255, 255)
ROUGE = (229, 57, 53)
PALETTES = [((255, 214, 170), (246, 160, 120)), ((176, 214, 255), (120, 160, 230)), ((214, 240, 190), (150, 200, 140)),
            ((240, 200, 240), (190, 140, 210)), ((255, 236, 160), (240, 190, 90)), ((200, 230, 230), (120, 180, 190)),
            ((230, 220, 205), (190, 170, 150)), ((210, 205, 250), (150, 140, 220))]

POLICES = [
    "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]
_police = next((p for p in POLICES if os.path.exists(p)), None)
_cache_polices = {}


def police(taille):
    taille = int(taille)
    if taille not in _cache_polices:
        _cache_polices[taille] = ImageFont.truetype(_police, taille) if _police else ImageFont.load_default()
    return _cache_polices[taille]


def ffmpeg_exe():
    return os.environ.get("QS_FFMPEG") or config.outil("ffmpeg") or shutil.which("ffmpeg") or next(
        (p for p in ("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg") if os.path.exists(p)), "ffmpeg")


# ---------- Calage à 62,0 s ----------
def caler(voix, cta):
    """Durées en images de chaque plan et de la carte finale, total exactement TOTAL.

    voix : durées (s) des 12 répliques ; cta : durée (s) de la réplique d'appel à s'abonner.
    Renvoie (plans_en_images, fin_en_images, tempo) ; tempo > 1 si les voix doivent être accélérées.
    """
    fin = min(config.FIN_MAX, max(config.FIN_MIN, VOIX_CTA + cta + 0.6))
    dispo = config.DUREE - fin
    marge, qmin = config.MARGE, config.QMIN

    def besoin(t, m, q):
        return sum(max(q, DEBUT_VOIX + v / t + m) for v in voix)

    tempo = 1.0
    if besoin(1.0, marge, qmin) > dispo:
        bas, haut = 1.0, TEMPO_MAX
        if besoin(haut, marge, qmin) > dispo:  # voix très longues : on réduit d'abord les respirations
            marge, qmin = 0.12, 1.0
        if besoin(haut, marge, qmin) <= dispo:
            for _ in range(40):
                milieu = (bas + haut) / 2
                bas, haut = (bas, milieu) if besoin(milieu, marge, qmin) <= dispo else (milieu, haut)
            tempo = haut
        else:
            tempo = TEMPO_MAX
    durees = [max(qmin, DEBUT_VOIX + v / tempo + marge) for v in voix]
    reste = dispo - sum(durees)
    if reste > 0:  # du temps en trop : un peu plus de carte finale, puis des respirations réparties
        bonus = min(reste, config.FIN_MAX - fin)
        fin += bonus
        reste -= bonus
        durees = [d + reste / len(durees) for d in durees]
    else:  # toujours trop long malgré le tempo maximal : on resserre (les voix seront coupées en fin de plan)
        k = dispo / sum(durees)
        durees = [d * k for d in durees]
    # en images, total exact
    images, cumul, t = [], 0, 0.0
    for d in durees:
        t += d
        fin_plan = int(round(t * FPS))
        images.append(fin_plan - cumul)
        cumul = fin_plan
    return images, TOTAL - cumul, tempo


# ---------- Dessin ----------
def _aa(taille, dessin):
    """Sprite anti-crénelé : dessiné en double taille puis réduit."""
    im = Image.new("RGBA", (taille[0] * 2, taille[1] * 2), (0, 0, 0, 0))
    dessin(ImageDraw.Draw(im), 2)
    return im.resize(taille, Image.LANCZOS)


def sprite_quentools(bouche, parle):
    def d(g, k):
        s = lambda *v: [x * k for x in v]
        # corps (sweat)
        g.rounded_rectangle(s(70, 330, 410, 640), radius=90 * k, fill=(84, 104, 140), outline=(40, 48, 66), width=6 * k)
        g.rectangle(s(200, 330, 280, 380), fill=(70, 88, 120))
        # tête
        g.ellipse(s(110, 60, 370, 340), fill=(241, 199, 160), outline=(120, 80, 60), width=6 * k)
        # cheveux en bataille
        g.polygon(s(110, 170, 130, 70, 170, 95, 200, 40, 240, 85, 280, 35, 310, 90, 355, 70, 370, 170, 330, 120, 250, 110, 160, 125), fill=(74, 52, 40))
        # yeux mi-clos et cernes
        for x in (180, 300):
            g.arc(s(x - 32, 170, x + 32, 230), 200, 340, fill=(40, 30, 30), width=7 * k)
            g.line(s(x - 30, 196, x + 30, 196), fill=(40, 30, 30), width=7 * k)
            g.arc(s(x - 30, 205, x + 30, 245), 20, 160, fill=(170, 120, 160), width=5 * k)
        # sourcils fatigués
        g.line(s(148, 158, 205, 168), fill=(74, 52, 40), width=8 * k)
        g.line(s(275, 168, 332, 158), fill=(74, 52, 40), width=8 * k)
        # bouche
        if bouche:
            g.ellipse(s(208, 262, 272, 312), fill=(90, 30, 40), outline=(60, 20, 30), width=4 * k)
        else:
            g.line(s(212, 285, 268, 282), fill=(90, 50, 50), width=7 * k)
        # tasse de café
        g.rounded_rectangle(s(330, 470, 410, 570), radius=12 * k, fill=(240, 240, 240), outline=(90, 90, 90), width=5 * k)
        g.arc(s(390, 490, 440, 545), 270, 90, fill=(90, 90, 90), width=6 * k)
        if parle:
            g.line(s(30, 150, 60, 170), fill=(255, 196, 120), width=8 * k)
            g.line(s(20, 210, 55, 212), fill=(255, 196, 120), width=8 * k)
    return _aa((460, 660), d)


def sprite_glitchou(bouche, parle):
    def d(g, k):
        s = lambda *v: [x * k for x in v]
        # antenne
        g.line(s(170, 60, 170, 20), fill=(60, 80, 30), width=7 * k)
        g.ellipse(s(150, 0, 190, 40), fill=(255, 120, 90) if parle else (230, 200, 80), outline=(60, 80, 30), width=4 * k)
        # corps rond
        g.ellipse(s(20, 50, 320, 350), fill=VERT, outline=(80, 110, 30), width=8 * k)
        g.ellipse(s(60, 80, 160, 150), fill=(226, 248, 160))
        # grands yeux sûrs d'eux
        for x in (120, 220):
            g.ellipse(s(x - 38, 140, x + 38, 230), fill=BLANC, outline=(60, 80, 30), width=5 * k)
            g.ellipse(s(x - 14, 170, x + 22, 215), fill=(30, 34, 40))
            g.ellipse(s(x, 176, x + 12, 190), fill=BLANC)
        # sourcils fiers
        g.line(s(80, 128, 150, 118), fill=(60, 80, 30), width=8 * k)
        g.line(s(190, 118, 260, 128), fill=(60, 80, 30), width=8 * k)
        # bouche
        if bouche:
            g.chord(s(120, 240, 220, 320), 0, 180, fill=(70, 40, 40), outline=(60, 80, 30), width=4 * k)
        else:
            g.arc(s(120, 230, 220, 290), 20, 160, fill=(60, 80, 30), width=7 * k)
        # joues
        g.ellipse(s(55, 240, 95, 270), fill=(240, 190, 120))
        g.ellipse(s(245, 240, 285, 270), fill=(240, 190, 120))
    return _aa((340, 360), d)


PERSOS = config.RESSOURCES / "persos"


def sprite_png(nom):
    """Personnage dessiné en vectoriel (persos/*.svg), livré en PNG : bouche fermée ou ouverte."""
    def charger(bouche, parle):
        return Image.open(PERSOS / f"{nom}-{'ouvert' if bouche else 'ferme'}.png").convert("RGBA")
    return charger


SPRITES = {"quentools": sprite_quentools, "glitchou": sprite_glitchou, "max": sprite_png("max"), "pepite": sprite_png("pepite")}


def texte_ajuste(g, texte, boite, tailles=(72, 36), lignes_max=4, couleur=BLANC, centre=True, interligne=1.18):
    """Écrit le texte dans la boîte, en réduisant la taille jusqu'à ce qu'il tienne (jamais coupé)."""
    x0, y0, x1, y1 = boite
    largeur, hauteur = x1 - x0, y1 - y0
    for taille in range(tailles[0], tailles[1] - 1, -2):
        f = police(taille)
        lignes = couper(texte, f, largeur)
        h = len(lignes) * taille * interligne
        if len(lignes) <= lignes_max and h <= hauteur and all(f.getlength(l) <= largeur for l in lignes):
            break
    y = y0 + (hauteur - h) / 2
    for l in lignes:
        x = x0 + (largeur - f.getlength(l)) / 2 if centre else x0
        g.text((x, y), l, font=f, fill=couleur)
        y += taille * interligne
    return taille, lignes


def insecables(texte):
    """Espaces insécables du français : jamais de « ? », « ! », « : » ou « » » seul en début de ligne."""
    texte = re.sub(r"\s+", " ", texte).strip()
    texte = re.sub(r" ([?!:;»%€])", "\u00a0\\1", texte)
    return re.sub(r"« ", "«\u00a0", texte)


def couper(texte, f, largeur):
    lignes, cur = [], ""
    for m in insecables(texte).split(" "):
        essai = (cur + " " + m).strip()
        if f.getlength(essai) <= largeur or not cur:
            cur = essai
        else:
            lignes.append(cur)
            cur = m
    if cur:
        lignes.append(cur)
    return lignes


def fond_lieu(lieu, S=None):
    S = S or series.serie("quentools")
    h = int(hashlib.md5(lieu.encode("utf-8")).hexdigest(), 16)
    pal = S["palettes"] or PALETTES
    haut, bas = pal[h % len(pal)]
    im = Image.new("RGB", (W, H), NUIT)
    g = ImageDraw.Draw(im)
    x0, y0, x1, y1 = 40, 380, W - 40, 1250
    panneau = Image.new("RGB", (x1 - x0, y1 - y0))
    pg = ImageDraw.Draw(panneau)
    for y in range(y1 - y0):
        t = y / (y1 - y0)
        pg.line([(0, y), (x1 - x0, y)], fill=tuple(int(haut[i] + (bas[i] - haut[i]) * t) for i in range(3)))
    if S["decor"] == "courbe":  # QuentInvest : tableau avec une courbe de cours
        bx = 420 + h % 260
        pg.rounded_rectangle([bx, 90, bx + 300, 300], radius=18, fill=(28, 36, 48), outline=(90, 90, 110), width=6)
        pts = [(bx + 25 + i * 25, 250 - ((h >> i) % 7) * 18 - i * 6) for i in range(11)]
        pg.line(pts, fill=(120, 230, 120), width=7, joint="curve")
    else:  # décor simple : fenêtre, sol
        pg.rounded_rectangle([430 + h % 300, 90, 650 + h % 300, 300], radius=18, fill=(250, 250, 245), outline=(90, 90, 110), width=6)
        pg.line([540 + h % 300, 90, 540 + h % 300, 300], fill=(90, 90, 110), width=6)
    pg.rectangle([0, y1 - y0 - 150, x1 - x0, y1 - y0], fill=tuple(int(c * 0.78) for c in bas))
    masque = Image.new("L", panneau.size, 0)
    ImageDraw.Draw(masque).rounded_rectangle([0, 0, panneau.size[0], panneau.size[1]], radius=48, fill=255)
    im.paste(panneau, (x0, y0), masque)
    f = police(40)
    l = f.getlength(lieu)
    g.rounded_rectangle([x0 + 30, y0 + 28, x0 + 80 + l, y0 + 92], radius=32, fill=(30, 32, 44))
    g.text((x0 + 55, y0 + 38), lieu, font=f, fill=BLANC)
    return im


def image_plan(sketch, rang, plan, S=None, avec_texte=True):
    """Image de base d'un plan (fond, titre, sous-titre) ; les personnages sont posés à part."""
    S = S or series.serie("quentools")
    im = fond_lieu(sketch["lieu"], S)
    g = ImageDraw.Draw(im)
    etiquette = S["etiquette"].format(n=rang + 1, total=config.SKETCHS, episode=sketch.get("episode", "")).upper()
    texte_ajuste(g, etiquette, (60, 80, W - 60, 135), tailles=(38, 26), lignes_max=1, couleur=S["couleurs"]["G"])
    texte_ajuste(g, sketch["titre"], (60, 140, W - 60, 340), tailles=(74, 40), lignes_max=2)
    if avec_texte:
        im.paste(sous_titre(plan, S, None), (ST_X, ST_Y))
    mention(g, S)
    return im


# ---------- Sous-titre mot par mot, chiffre clé, barre de progression ----------
ST_X, ST_Y, ST_W, ST_H = 30, 1280, W - 60, 392


def disposer(texte, largeur, hauteur, tailles=(68, 38), lignes_max=4, interligne=1.18):
    """Mise en page du sous-titre : taille, et position (x, y) de chaque mot dans la boîte."""
    for taille in range(tailles[0], tailles[1] - 1, -2):
        f = police(taille)
        lignes = couper(texte, f, largeur)
        h = len(lignes) * taille * interligne
        if len(lignes) <= lignes_max and h <= hauteur and all(f.getlength(l) <= largeur for l in lignes):
            break
    mots, y, esp = [], (hauteur - h) / 2, f.getlength(" ")
    for l in lignes:
        x = (largeur - f.getlength(l)) / 2
        for m in l.split(" "):
            mots.append((m, x, y))
            x += f.getlength(m) + esp
        y += taille * interligne
    return f, mots


def sous_titre(plan, S, actif):
    """Bandeau du sous-titre ; le mot « actif » (en cours de prononciation) est éclairé à la couleur du personnage."""
    couleur = S["couleurs"][plan["qui"]]
    im = Image.new("RGB", (ST_W, ST_H), NUIT)
    g = ImageDraw.Draw(im)
    g.rounded_rectangle([10, 10, ST_W - 10, ST_H - 12], radius=40, fill=(14, 15, 22), outline=couleur, width=6)
    g.text((60, 32), S["noms"][plan["qui"]], font=police(40), fill=couleur)
    f, mots = disposer(plan["texte"], ST_W - 100, 265)
    for k, (m, x, y) in enumerate(mots):
        if k == actif:
            l = f.getlength(m)
            g.rounded_rectangle([50 + x - 10, 90 + y - 4, 50 + x + l + 10, 90 + y + f.size * 1.08], radius=14, fill=couleur)
            g.text((50 + x, 90 + y), m, font=f, fill=(14, 15, 22))
        else:
            g.text((50 + x, 90 + y), m, font=f, fill=BLANC)
    return im


def instants_mots(texte, duree):
    """Début de chaque mot (s après le début de la voix), d'après sa longueur et la ponctuation qui suit."""
    mots = insecables(texte).split(" ")
    poids = [len(re.sub(r"\W", "", m)) + 2 + (5 if re.search(r"[,;:]$", m) else 8 if re.search(r"[.!?…»]$", m) else 0) for m in mots]
    total, t, out = sum(poids) or 1, 0.0, []
    for p in poids:
        out.append(t * duree / total)
        t += p
    return out


RE_CHIFFRE = re.compile(r"(\d[\d\s\u00a0\u202f]*(?:[.,]\d+)?)\s?(%|€|\$|milliards?(?: d['’]euros| de dollars)?|millions?(?: d['’]euros)?|dollars|euros|points|ans|fois)?", re.I)


def chiffre_cle(texte):
    """Chiffre marquant d'une réplique (« 22,6 % », « 3 300 milliards d'euros », « 1929 ») ou None."""
    meilleurs = []
    for m in RE_CHIFFRE.finditer(texte):
        n, u = re.sub(r"[\s\u00a0\u202f]+", " ", m.group(1)).strip(), (m.group(2) or "").strip()
        n = n.rstrip(" ")
        if not re.search(r"\d", n):
            continue
        if texte[m.end():m.end() + 2].lower().startswith("er"):  # « 1er juin »
            continue
        brut = re.sub(r"\D", "", n)
        if u:
            meilleurs.append((2, f"{n}\u00a0{u}" if u not in ("%", "€", "$") else f"{n}\u00a0{u}"))
        elif len(brut) == 4 and 1000 <= int(brut) <= 2099:
            meilleurs.append((1, n))
        elif len(brut) >= 3:
            meilleurs.append((0, n))
    if not meilleurs:
        return None
    return max(meilleurs, key=lambda x: x[0])[1][:26]


def badge_chiffre(texte, couleur):
    """Grande étiquette du chiffre clé (image RGBA)."""
    for taille in range(120, 50, -6):
        f = police(taille)
        if f.getlength(texte) <= 800:
            break
    lw, lh = int(f.getlength(texte)) + 90, taille + 70
    b = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
    g = ImageDraw.Draw(b)
    g.rounded_rectangle([0, 0, lw - 1, lh - 1], radius=36, fill=(14, 15, 22, 235), outline=couleur + (255,), width=6)
    g.text((45, 22), texte, font=f, fill=couleur)
    return b


def barre_progression(octets, image_n, couleur):
    """Barre de progression en haut de l'image (écrite sur les octets bruts : aucune copie de l'image)."""
    hb, w = 10, int(W * (image_n + 1) / TOTAL)
    ligne = bytes(couleur) * w + bytes((60, 62, 76)) * (W - w)
    return ligne * hb, memoryview(octets)[hb * W * 3:]


# ---------- Ambiance sonore : musique de fond (baissée sous les voix) et bruitages ----------
SONS = config.RESSOURCES / "sons"
_sons = {}


def charger_son(nom, ffmpeg=None):
    """Son livré (sons/<nom>.mp3) en échantillons mono au taux de la voix, ou None."""
    if nom not in _sons:
        f = SONS / f"{nom}.mp3"
        a = None
        if f.exists():
            try:
                r = subprocess.run([ffmpeg or ffmpeg_exe(), "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(voice.TAUX), "-f", "s16le", "-"],
                                   capture_output=True, timeout=60)
                if r.returncode == 0 and r.stdout:
                    a = array.array("h")
                    a.frombytes(r.stdout[:len(r.stdout) // 2 * 2])
                    if sys.byteorder == "big":
                        a.byteswap()
            except Exception:
                a = None
        _sons[nom] = a
    return _sons[nom]


def ajouter_musique(mix, voix, nom, volume, debut_fin, ffmpeg=None):
    """Musique en boucle sous tout le montage : basse quand quelqu'un parle, un peu plus présente sinon, fondu à la fin."""
    m = charger_son(nom, ffmpeg)
    if not m or volume <= 0:
        return False
    n, bloc = len(mix), voice.TAUX // 20  # enveloppe calculée par tranches de 50 ms
    parle = []
    for k in range(0, n, bloc):
        t = voix[k:k + bloc:8]
        parle.append((sum(x * x for x in t) / len(t)) ** 0.5 > 500 if len(t) else False)
    # tient compte d'un petit délai avant et après la voix, pour ne pas « pomper »
    garde = [any(parle[max(0, i - 3):i + 6]) for i in range(len(parle))]
    bas, haut = 0.07 * volume / 100, 0.16 * volume / 100
    g, fondu = bas, int(1.5 * voice.TAUX)
    pas_g = 1 / (voice.TAUX * 0.25)
    fin_fondu = n - fondu
    L = len(m)
    for k in range(n):
        cible = bas if garde[k // bloc] else haut
        g += max(-pas_g, min(pas_g, cible - g))
        e = g * (1 if k < fin_fondu else (n - k) / fondu)
        x = mix[k] + int(m[k % L] * e)
        mix[k] = 32767 if x > 32767 else -32767 if x < -32767 else x
    return True


def ajouter_bruitage(mix, nom, instant, gain=0.6, ffmpeg=None):
    a = charger_son(nom, ffmpeg)
    if not a:
        return False
    d = int(instant * voice.TAUX)
    for k in range(len(a)):
        i = d + k
        if 0 <= i < len(mix):
            x = mix[i] + int(a[k] * gain)
            mix[i] = 32767 if x > 32767 else -32767 if x < -32767 else x
    return True


def mention(g, S):
    """Mention fixe en bas (QuentInvest : vulgarisation, pas un conseil en investissement)."""
    if S.get("mention"):
        f = police(30)
        g.text(((W - f.getlength(S["mention"])) / 2, 1700), S["mention"], font=f, fill=(170, 176, 196))


def bouton_abonner(texte, echelle, angle):
    """Bouton rouge « S'ABONNER » avec cloche, à l'échelle donnée (animation d'apparition)."""
    lw, lh = 660, 160
    b = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
    g = ImageDraw.Draw(b)
    g.rounded_rectangle([0, 0, lw - 1, lh - 1], radius=lh // 2, fill=ROUGE, outline=(255, 255, 255), width=6)
    cloche = _aa((110, 110), lambda d, k: (
        d.chord([18 * k, 14 * k, 92 * k, 96 * k], 180, 360, fill=BLANC),
        d.rectangle([18 * k, 54 * k, 92 * k, 82 * k], fill=BLANC),
        d.polygon([12 * k, 84 * k, 98 * k, 84 * k, 92 * k, 76 * k, 18 * k, 76 * k], fill=BLANC),
        d.ellipse([46 * k, 84 * k, 64 * k, 102 * k], fill=BLANC),
        d.ellipse([49 * k, 4 * k, 61 * k, 16 * k], fill=BLANC))).rotate(angle, resample=Image.BICUBIC)
    b.alpha_composite(cloche, (40, 25))
    texte_tenu = texte
    for taille in range(64, 30, -2):
        f = police(taille)
        if f.getlength(texte_tenu) <= lw - 220:
            break
    g.text((170 + (lw - 210 - f.getlength(texte_tenu)) / 2, (lh - taille) / 2 - 6), texte_tenu, font=f, fill=BLANC)
    if abs(echelle - 1) > 1e-3:
        b = b.resize((max(1, int(lw * echelle)), max(1, int(lh * echelle))), Image.LANCZOS)
    return b


def image_fin(question, cta_texte=None, S=None):
    S = S or series.serie("quentools")
    im = Image.new("RGB", (W, H), NUIT)
    g = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        g.line([(0, y), (W, y)], fill=(int(22 + 20 * t), int(24 + 10 * t), int(34 + 40 * t)))
    f = police(44)
    g.text(((W - f.getlength(S["fin"])) / 2, 170), S["fin"], font=f, fill=S["couleurs"]["G"])
    texte_ajuste(g, question, (70, 240, W - 70, 720), tailles=(84, 44), lignes_max=4)
    g.text(((W - police(36).getlength("Réponds en commentaire")) / 2, 735), "Réponds en commentaire", font=police(36), fill=(190, 194, 210))
    if cta_texte:  # sous-titre de la réplique, affiché quand elle est dite
        texte_ajuste(g, cta_texte, (90, 1480, W - 90, 1640), tailles=(52, 32), lignes_max=2, couleur=(230, 232, 240))
    mention(g, S)
    return im


# ---------- Couverture et texte de publication ----------
def couverture(video, S):
    """Image de couverture 1080×1920 (miniature YouTube Shorts, Instagram) : grand titre et les deux personnages."""
    s0 = video["sketchs"][0]
    im = fond_lieu(s0["lieu"], S)
    g = ImageDraw.Draw(im)
    g.rectangle([0, 0, W, 375], fill=NUIT)
    titre = video.get("episode") or s0["titre"]
    sur = S["nom"].upper() if video.get("episode") else f"{S['nom'].upper()} · {len(video['sketchs'])} SKETCHS"
    f = police(44)
    g.text(((W - f.getlength(sur)) / 2, 70), sur, font=f, fill=S["couleurs"]["G"])
    texte_ajuste(g, titre, (50, 130, W - 50, 360), tailles=(104, 54), lignes_max=2)
    gq = SPRITES[S["sprites"]["Q"]](True, True)
    gg = SPRITES[S["sprites"]["G"]](False, False)
    gq = gq.resize((int(gq.width * 1.25), int(gq.height * 1.25)), Image.LANCZOS)
    gg = gg.resize((int(gg.width * 1.25), int(gg.height * 1.25)), Image.LANCZOS)
    im.paste(gq, (30, 1300 - gq.height), gq)
    im.paste(gg, (W - gg.width - 30, 1180 - gg.height + 120), gg)
    g.rectangle([0, 1300, W, H], fill=NUIT)
    texte_ajuste(g, video["question"], (70, 1360, W - 70, 1640), tailles=(70, 40), lignes_max=3, couleur=BLANC)
    mention(g, S)
    return im


def _diese(mot):
    import unicodedata
    m = unicodedata.normalize("NFD", mot)
    m = "".join(c for c in m if unicodedata.category(c) != "Mn")
    return "#" + re.sub(r"[^A-Za-z0-9]", "", m.title().replace(" ", "")).lower()


def texte_publication(video, serie):
    """Titre, description et hashtags prêts à coller sous la vidéo (aucun lien, aucun prix)."""
    if serie == "quentinvest":
        ep = video.get("episode") or video["sketchs"][0]["titre"]
        sujets = []
        try:
            import invest
            f = invest.fiche_pour(ep)
            sujets = [c for c in (f or {}).get("cles", []) if len(c) > 2 and not c.isdigit()][:3]
        except Exception:
            pass
        tags = ["#economie", "#finance", "#argent", "#apprendre"] + [_diese(c) for c in sujets] + ["#quentinvest", "#pourtoi"]
        lignes = [f"{ep} : expliqué en 1 minute 💡", "", video["question"], "", "Vulgarisation, pas un conseil en investissement."]
    else:
        titres = [s["titre"] for s in video["sketchs"]]
        tags = ["#humour", "#sketch", "#comedie", "#drole", "#quentools", "#glitchou", "#pourtoi"]
        lignes = [f"{titres[0]} 😂", "", "Au programme : " + " · ".join(titres), "", video["question"]]
    vus, uniques = set(), []
    for t in tags:
        if len(t) > 2 and t not in vus:
            vus.add(t)
            uniques.append(t)
    return "\n".join(lignes + ["", " ".join(uniques)]) + "\n"


# ---------- Rendu ----------
def rendre(video, sortie, journal=print, avancement=lambda f: None, serie=None):
    serie = serie or config.serie
    S = series.serie(serie)
    Path(sortie).parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = ffmpeg_exe()
    reg = config.reglages(serie)
    lignes_cta = reg["cta_lignes"]
    cta_qui, cta_texte = lignes_cta[history.cta_suivant(len(lignes_cta))]
    plans = [(s, i, p) for i, s in enumerate(video["sketchs"]) for p in s["plans"]]

    if not voice.chemin_modele().exists() and not os.environ.get("QS_BIPS"):  # voix pas encore là : on l'attend plutôt que des bips
        journal("Téléchargement de la voix avant la vidéo (une seule fois)…")
        if not voice.assurer_modele(journal=journal):
            journal("Voix impossible à télécharger (connexion ?) : bips de secours pour cette vidéo.")
    v = voice.Voix(ffmpeg=ffmpeg, journal=journal)
    journal(f"Voix : {'Piper (Pierre et Jessica)' if v.mode == 'piper' else 'bips de secours'}")
    sons = [v.dire(p["texte"], p["qui"], effet=S["voix"][p["qui"]]) for _, _, p in plans]
    son_cta = v.dire(cta_texte, cta_qui, effet=S["voix"][cta_qui])
    durees = [len(a) / voice.TAUX for a in sons]
    images, fin_images, tempo = caler(durees, len(son_cta) / voice.TAUX)
    if tempo > 1.0001:
        journal(f"Voix longues : accélérées ×{tempo:.2f} pour tenir dans 62 s")
        sons = [v.dire(p["texte"], p["qui"], tempo, effet=S["voix"][p["qui"]]) for _, _, p in plans]
    avancement(0.15)

    # son : mixage à l'échantillon près, une piste par personnage pour animer les bouches
    n = int(round(config.DUREE * voice.TAUX))
    pistes = {"Q": array.array("h", [0]) * n, "G": array.array("h", [0]) * n}
    debuts, t = [], 0
    for (s, i, p), a, nb in zip(plans, sons, images):
        debut = int((t / FPS + DEBUT_VOIX) * voice.TAUX)
        fin = int((t + nb) / FPS * voice.TAUX)
        _poser(pistes[p["qui"]], a[:max(0, fin - debut)], debut)
        debuts.append(t)
        t += nb
    debut_fin = t
    _poser(pistes[cta_qui], son_cta, int((debut_fin / FPS + VOIX_CTA) * voice.TAUX))
    mix = array.array("h", (max(-32767, min(32767, a + b)) for a, b in zip(pistes["Q"], pistes["G"])))
    voix_seules = array.array("h", mix)
    _poser(mix, voice.ding(), int((debut_fin / FPS + POP) * voice.TAUX), ajouter=True)

    # ambiance : bruitage entre les sketchs (ou parties), ponctuation après la chute, musique de fond sous les voix
    opts = config.options()
    durees_voix = [len(a) / voice.TAUX for a in sons]
    if opts["bruitages"]:
        for j in range(len(plans)):
            if j and j % config.PLANS == 0 and S.get("transition"):
                ajouter_bruitage(mix, S["transition"], max(0, debuts[j] / FPS - 0.12), 0.55, ffmpeg)
            if S.get("chute") and j % config.PLANS == config.PLANS - 1:
                fin_plan = (debuts[j] + images[j]) / FPS
                quand = debuts[j] / FPS + DEBUT_VOIX + durees_voix[j] + 0.05
                if quand < fin_plan + 0.2:
                    ajouter_bruitage(mix, S["chute"], quand, 0.45, ffmpeg)
        if S.get("transition"):
            ajouter_bruitage(mix, S["transition"], max(0, debut_fin / FPS - 0.12), 0.5, ffmpeg)
    musique = None
    if opts["musique"] and S.get("musiques"):
        graine = int(hashlib.md5("|".join(s["titre"] for s in video["sketchs"]).encode("utf-8")).hexdigest(), 16)
        musique = S["musiques"][graine % len(S["musiques"])]
        if not ajouter_musique(mix, voix_seules, musique, opts["volume_musique"], debut_fin / FPS, ffmpeg):
            musique = None

    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "son.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(voice.TAUX)
            m = mix
            if sys.byteorder == "big":
                m = array.array("h", mix)
                m.byteswap()
            w.writeframes(m.tobytes())
        _encoder(ffmpeg, wav, sortie, video, plans, images, debuts, debut_fin, pistes, reg["cta_bouton"], cta_texte, avancement, S,
                 durees_voix, opts)

    meta = {
        "serie": serie, "episode": video.get("episode"), "a_verifier": bool(video.get("verifier")),
        "titres": [s["titre"] for s in video["sketchs"]], "question": video["question"], "mode": video.get("mode"),
        "voix": v.mode, "locuteurs": getattr(v, "spk", None), "tempo": round(tempo, 3), "musique": musique,
        "options": opts, "chiffres": [c for c in (chiffre_cle(p["texte"]) for _, _, p in plans) if c] if S.get("chiffres") else [],
        "cta": {"qui": cta_qui, "texte": cta_texte, "debut": round(debut_fin / FPS, 3)},
        "plans": [{"qui": p["qui"], "texte": p["texte"], "debut": round(d / FPS, 3), "duree": round(nb / FPS, 3),
                   "voix": round(len(a) / voice.TAUX, 3)} for (s, i, p), d, nb, a in zip(plans, debuts, images, sons)],
        "sketchs": video["sketchs"],
    }
    Path(sortie).with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), "utf-8")
    try:  # à côté de la vidéo : texte à publier et couverture
        Path(sortie).with_suffix(".txt").write_text(texte_publication(video, serie), "utf-8")
        couverture(video, S).save(Path(sortie).with_name(Path(sortie).stem + "-couverture.png"))
    except Exception as e:
        journal(f"Couverture ou texte de publication impossible : {e}")
    return meta


def _poser(piste, son, debut, ajouter=False):
    fin = min(len(piste), debut + len(son))
    for k in range(debut, fin):
        x = piste[k] + son[k - debut] if ajouter else son[k - debut]
        piste[k] = max(-32767, min(32767, x))


def _bouches(piste, nb_images, seuil=700):
    """Bouche ouverte quand la voix du personnage est assez forte pendant l'image."""
    pas = voice.TAUX / FPS
    out = []
    for f in range(nb_images):
        a, b = int(f * pas), int((f + 1) * pas)
        tranche = piste[a:b:4]
        e = (sum(x * x for x in tranche) / len(tranche)) ** 0.5 if len(tranche) else 0
        out.append(e > seuil)
    return out


def _encodeur(ffmpeg):
    try:
        enc = subprocess.run([ffmpeg, "-hide_banner", "-encoders"], capture_output=True, text=True, timeout=20).stdout
    except Exception:
        enc = ""
    if sys.platform == "darwin" and "h264_videotoolbox" in enc and not os.environ.get("QS_X264"):
        return ["-c:v", "h264_videotoolbox", "-b:v", "8M", "-allow_sw", "1"]
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"]


def _encoder(ffmpeg, wav, sortie, video, plans, images, debuts, debut_fin, pistes, bouton, cta_texte, avancement, S, durees_voix=None, opts=None):
    opts = opts or config.options()
    durees_voix = durees_voix or [0.0] * len(plans)
    karaoke, barre = opts["karaoke"], opts["barre"]
    coul_barre = S["couleurs"]["G"]
    bq, bg = _bouches(pistes["Q"], TOTAL), _bouches(pistes["G"], TOTAL)
    spr = {(c, o, p): SPRITES[S["sprites"][c]](o, p)
           for c in "QG" for o in (False, True) for p in (False, True)}
    cmd = [ffmpeg, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", wav, "-map", "0:v", "-map", "1:a"] + _encodeur(ffmpeg) + [
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-frames:v", str(TOTAL),
           "-t", f"{config.DUREE:.3f}", "-movflags", "+faststart", str(sortie)]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    def ecrire(octets, img_n):
        if barre:
            haut, reste = barre_progression(octets, img_n, coul_barre)
            pr.stdin.write(haut)
            pr.stdin.write(reste)
        else:
            pr.stdin.write(octets)

    def garder(cache, cle, octets, maxi=40):  # mémoire bornée (MacBook Air)
        cache[cle] = octets
        if len(cache) > maxi:
            cache.pop(next(iter(cache)))
    try:
        f = 0
        for (s, rang, p), debut, nb, dv in zip(plans, debuts, images, durees_voix):
            base = image_plan(s, rang, p, S, avec_texte=not karaoke)
            inst = instants_mots(p["texte"], dv) if karaoke and dv > 0 else None
            ch = chiffre_cle(p["texte"]) if S.get("chiffres") and opts["chiffres"] else None
            badge = badge_chiffre(ch, S["couleurs"]["G"]) if ch else None
            bandeaux, cache = {}, {}
            for k in range(nb):
                img_n = debut + k
                bob = int(4 * (1 + math.sin(img_n / FPS * 2 * math.pi * 0.9)))  # Glitchou flotte
                t = k / FPS - DEBUT_VOIX
                actif = -1
                if inst and 0 <= t <= dv + 0.1:
                    actif = max(i for i, x in enumerate(inst) if x <= t)
                pop = min(k, 7) if badge else 0
                cle = (bq[img_n], bg[img_n], bob, actif, pop)
                if cle not in cache:
                    im = base.copy()
                    if badge:  # le chiffre clé arrive avec un petit rebond
                        e = (0.55, 0.8, 1.02, 1.12, 1.08, 1.03, 1.01, 1.0)[pop]
                        b = badge if e == 1.0 else badge.resize((max(1, int(badge.width * e)), max(1, int(badge.height * e))), Image.LANCZOS)
                        im.paste(b, (int(W - 70 - badge.width / 2 - b.width / 2), int(520 - b.height / 2)), b)
                    im.paste(*_place(spr[("Q", bq[img_n], p["qui"] == "Q")], 90, 1240 - 660))
                    im.paste(*_place(spr[("G", bg[img_n], p["qui"] == "G")], 640, 760 + bob * 6))
                    if karaoke:
                        if actif not in bandeaux:
                            bandeaux[actif] = sous_titre(p, S, actif)
                        im.paste(bandeaux[actif], (ST_X, ST_Y))
                    garder(cache, cle, im.tobytes())
                ecrire(cache[cle], img_n)
                f += 1
            avancement(0.15 + 0.8 * f / TOTAL)
        bases = {False: image_fin(video["question"], None, S), True: image_fin(video["question"], cta_texte, S)}
        petit = {k: v.resize((int(v.width * 0.6), int(v.height * 0.6)), Image.LANCZOS) for k, v in spr.items()}
        cache = {}
        for k in range(TOTAL - f):
            img_n = debut_fin + k
            t = k / FPS - POP
            echelle = 0 if t < 0 else (min(1.15, t / 0.18 * 1.15) if t < 0.18 else 1.15 - 0.15 * min(1, (t - 0.18) / 0.15))
            angle = int(round(18 * math.sin(t * 24) * max(0, 1 - t / 0.8))) if t >= 0 else 0
            pas_e = round(echelle, 2)
            dit = k / FPS >= VOIX_CTA
            cle = (bq[img_n], bg[img_n], pas_e, angle, dit)
            if cle not in cache:
                im = bases[dit].copy()
                im.paste(*_place(petit[("Q", bq[img_n], False)], 230, 820))
                im.paste(*_place(petit[("G", bg[img_n], False)], 600, 870))
                if pas_e > 0:
                    b = bouton_abonner(bouton, pas_e, angle)
                    im.paste(b, (int((W - b.width) / 2), int(1300 + 80 - b.height / 2)), b)
                garder(cache, cle, im.tobytes(), 64)
            ecrire(cache[cle], img_n)
        pr.stdin.close()
    except BrokenPipeError:
        pass
    if pr.wait() != 0:
        raise RuntimeError("ffmpeg a échoué : " + pr.stderr.read().decode("utf-8", "replace")[-600:])
    avancement(1.0)


def _place(sprite, x, y):
    return sprite, (int(x), int(y)), sprite
