# Pax Mythica — compose les textures de feuillage du jeu (ressources/feuillages/*.png, avec transparence) à partir des feuilles,
# brindilles et touffes photographiques des modèles Poly Haven (CC0) téléchargés dans ressources/modeles/.
# Les éléments sont détachés grâce à leurs masques de transparence, puis assemblés en bouquets vus de dessus et de profil.
# Lancer : python3 scripts/feuillages.py   (numpy, scipy et Pillow)
import os, random, math
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

RACINE = os.path.join(os.path.dirname(__file__), '..', 'ressources')
M = os.path.join(RACINE, 'modeles')
SORTIE = os.path.join(RACINE, 'feuillages')
os.makedirs(SORTIE, exist_ok=True)

def charger(diff, alpha):
    c = Image.open(os.path.join(M, diff)).convert('RGB')
    a = Image.open(os.path.join(M, alpha)).convert('L').resize(c.size)
    im = c.copy(); im.putalpha(a); return im

def morceaux(im, mini=900, maxi=None, zone=None, vert=0.0):
    """éléments séparés (feuilles, brindilles) : composantes connexes du masque ; zone = (x0, y0, x1, y1) en fraction de l'image,
    vert = part minimale du vert dans la couleur (écarte écorces et branches)"""
    a = np.array(im)[:, :, 3] > 110
    lab, n = ndimage.label(ndimage.binary_closing(a, iterations=2))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sl is None: continue
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        surf = int((lab[sl] == i + 1).sum())
        if surf < mini or (maxi and surf > maxi): continue
        H, Wd = lab.shape
        if zone and not (zone[0] * Wd <= sl[1].start and sl[1].stop <= zone[2] * Wd and zone[1] * H <= sl[0].start and sl[0].stop <= zone[3] * H): continue
        if vert:
            px = np.array(im)[sl][lab[sl] == i + 1][:, :3].astype(np.float32); g = (px[:, 1] / np.maximum(1, px.sum(axis=1))).mean()
            if g < vert: continue
        m = im.crop((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
        masque = Image.fromarray(((lab[sl] == i + 1) * 255).astype('uint8'))
        al = Image.fromarray(np.minimum(np.array(m)[:, :, 3], np.array(masque)))
        m.putalpha(al); out.append(m)
    return out

def coller(fond, piece, cx, cy, angle, echelle, teinte=1.0):
    p = piece.resize((max(2, int(piece.width * echelle)), max(2, int(piece.height * echelle))), Image.LANCZOS).rotate(angle, expand=True, resample=Image.BICUBIC)
    if teinte != 1.0:
        arr = np.array(p).astype(np.float32); arr[:, :, :3] = np.clip(arr[:, :, :3] * teinte, 0, 255); p = Image.fromarray(arr.astype('uint8'))
    fond.alpha_composite(p, (int(cx - p.width / 2), int(cy - p.height / 2)))

def ombrer(im, force=0.45):
    """assombrit le cœur du bouquet (feuilles du dessous dans l'ombre)"""
    arr = np.array(im).astype(np.float32); h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]; d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    k = 1 - force * np.clip(1 - d, 0, 1) ** 1.5
    arr[:, :, :3] *= k[:, :, None]; return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'))

def finir(im, nom, taille=512):
    im = im.resize((taille, taille), Image.LANCZOS)
    # bords des feuilles : la couleur déborde sous la transparence (pas de liseré sombre au filtrage)
    arr = np.array(im).astype(np.float32); a = arr[:, :, 3] > 8
    coul = arr[:, :, :3].copy()
    for _ in range(6):
        flou = np.array(Image.fromarray(coul.astype('uint8')).filter(ImageFilter.MaxFilter(3))).astype(np.float32)
        coul = np.where(a[:, :, None], coul, flou)
    arr[:, :, :3] = coul
    Image.fromarray(arr.astype('uint8')).save(os.path.join(SORTIE, nom + '.png'), optimize=True)
    print('feuillage', nom)

random.seed(7)
T = 1024

# --- feuillu : bouquet rond de feuilles (vu de partout) ---
feuilles = morceaux(charger('arbre-ile/textures/island_tree_01_leaves_diff_1k.jpg', 'arbre-ile/textures/leaves_alpha.jpg'), mini=3000)
fond = Image.new('RGBA', (T, T), (0, 0, 0, 0))
for k in range(260):
    r = math.sqrt(random.random()) * 0.42 * T; a = random.random() * 2 * math.pi
    x, y = T / 2 + math.cos(a) * r, T / 2 + math.sin(a) * r * 0.92
    coller(fond, random.choice(feuilles), x, y, random.uniform(0, 360), random.uniform(0.32, 0.5), random.uniform(0.75, 1.15))
finir(ombrer(fond, 0.5), 'feuillu')

# --- acacia : grandes palmes légères (jacaranda) ---
palmes = morceaux(charger('jacaranda/textures/jacaranda_tree_leaves_diff_1k.jpg', 'jacaranda/textures/leaves_alpha.jpg'), mini=8000)
fond = Image.new('RGBA', (T, T), (0, 0, 0, 0))
for k in range(26):
    a = random.random() * 2 * math.pi; r = random.uniform(0.05, 0.25) * T
    coller(fond, random.choice(palmes), T / 2 + math.cos(a) * r, T / 2 + math.sin(a) * r, math.degrees(-a) + random.uniform(-30, 30), random.uniform(0.55, 0.8), random.uniform(0.8, 1.1))
finir(ombrer(fond, 0.4), 'acacia')

# --- sapin : étage vu de dessus (brindilles en étoile autour du tronc) et profil ---
brins = morceaux(charger('sapin/textures/fir_tree_01_twig_diff_1k.jpg', 'sapin/textures/twig_alpha.jpg'), mini=2500, maxi=120000, zone=(0.12, 0, 1, 0.8), vert=0.355)
brins = [b for b in brins if b.height > 120]
fond = Image.new('RGBA', (T, T), (0, 0, 0, 0))
for couche in range(3):
    for k in range(16):
        a = (k / 16 + couche * 0.021 + random.uniform(-0.015, 0.015)) * 360
        b = random.choice(brins); L = b.height
        e = (0.47 * T) / L * random.uniform(0.75, 1.0) * (1 - couche * 0.15)
        cx, cy = T / 2 + math.cos(math.radians(a)) * L * e / 2, T / 2 - math.sin(math.radians(a)) * L * e / 2
        coller(fond, b, cx, cy, a - 90, e, random.uniform(0.7, 1.05) * (1 - couche * 0.12))
finir(ombrer(fond, 0.55), 'sapin-etage')
fond = Image.new('RGBA', (T, T), (0, 0, 0, 0))
for etage in range(9):
    y = T * (0.12 + etage * 0.095); larg = T * (0.08 + etage * 0.048)
    for k in range(5):
        b = random.choice(brins); e = larg / b.height * random.uniform(0.9, 1.2)
        cote = 1 if k % 2 else -1
        coller(fond, b, T / 2 + cote * larg * 0.45 * random.uniform(0.6, 1.0), y + random.uniform(-14, 14), cote * random.uniform(55, 80), e, random.uniform(0.75, 1.05))
finir(ombrer(fond, 0.3), 'sapin-profil')

# --- herbe : quatre touffes côte à côte ---
herbe = charger('herbe-touffe/textures/grass_medium_01_diff_1k.jpg', 'herbe-touffe/textures/Alpha.jpg')
touffes = [t for t in morceaux(herbe, mini=4000, zone=(0, 0.72, 1, 1)) if t.height > 60 and t.width > 90]
touffes.sort(key=lambda t: -t.width * t.height)
fond = Image.new('RGBA', (T, T // 2), (0, 0, 0, 0))
for k in range(4):
    t = touffes[k % max(1, len(touffes))]; e = min((T / 2.4) / t.width, (T / 2 * 0.95) / t.height)
    coller(fond, t, T * (0.18 + k * 0.215), T / 2 - t.height * e / 2 - 2, 0, e, random.uniform(0.85, 1.1))
im = fond.resize((512, 256), Image.LANCZOS); im.save(os.path.join(SORTIE, 'herbe.png'), optimize=True); print('feuillage herbe', len(touffes), 'touffes')

# --- buisson : feuilles arrondies et brindilles ---
fb = morceaux(charger('arbuste/textures/searsia_lucida_diff_1k.jpg', 'arbuste/textures/Alpha.jpg'), mini=1500, maxi=60000, zone=(0, 0, 0.62, 1), vert=0.36)
fond = Image.new('RGBA', (T, T), (0, 0, 0, 0))
for k in range(320):
    r = math.sqrt(random.random()) * 0.44 * T; a = random.random() * 2 * math.pi
    coller(fond, random.choice(fb), T / 2 + math.cos(a) * r, T / 2 + math.sin(a) * r, random.uniform(0, 360), random.uniform(0.45, 0.75), random.uniform(0.7, 1.1))
finir(ombrer(fond, 0.5), 'buisson')
