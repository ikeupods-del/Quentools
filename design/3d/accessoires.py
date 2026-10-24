"""Catalogue des accessoires (armes, boucliers, outils, objets), un fichier .glb chacun.

Convention : origine = point de prise (milieu de la poignée), axe principal vers +Y (lame, pointe ou fer vers le haut).
Boucliers : origine à la poignée, face vers +Z, haut vers +Y. Zones « joueur » : face des boucliers, étendards.
"""
import math

import numpy as np

from moteur import Piece, loft, chemin, boite, bande, Mat, zones, ss, mix, rot_x, rot_y, rot_z, superellipse

PAL = {
    'bois': Mat('bois', (0.52, 0.34, 0.18)),
    'bois_clair': Mat('bois', (0.70, 0.52, 0.32)),
    'bois_fonce': Mat('bois', (0.30, 0.19, 0.11)),
    'bronze': Mat('metal', (0.74, 0.50, 0.21), clair=(0.99, 0.83, 0.48)),
    'fer': Mat('metal', (0.55, 0.57, 0.60)),
    'acier': Mat('metal', (0.72, 0.74, 0.78), rug=0.25),
    'or': Mat('metal', (0.86, 0.64, 0.22), clair=(1.0, 0.92, 0.6)),
    'cuir': Mat('cuir', (0.40, 0.24, 0.13)),
    'cuir_noir': Mat('cuir', (0.13, 0.11, 0.10)),
    'joueur': Mat('peinture', joueur=True, rug=0.55),
    'joueur_tissu': Mat('tissu', joueur=True),
    'obsidienne': Mat('peinture', (0.06, 0.06, 0.08), rug=0.12, metal=0.2),
    'noir': Mat('peinture', (0.10, 0.10, 0.11), rug=0.5),
    'polymere': Mat('peinture', (0.18, 0.18, 0.17), rug=0.6),
    'blanc': Mat('peinture', (0.88, 0.88, 0.90), rug=0.35, metal=0.3),
    'cyan': Mat('lumiere', (0.35, 0.95, 1.0)),
    'plumes': Mat('plumes', (0.88, 0.86, 0.80)),
    'plumes_vertes': Mat('plumes', (0.10, 0.50, 0.30)),
    'osier': Mat('bois', (0.74, 0.58, 0.34)),
    'corde': Mat('tissu', (0.70, 0.58, 0.38)),
    'flamme': Mat('lumiere', (1.0, 0.62, 0.15)),
    'pierre': Mat('pierre', (0.55, 0.55, 0.55)),
}


class Objet:
    def __init__(self):
        self.pieces = []

    def ajoute(self, nom, anneaux, m, lisse=True, decor=(), partage=None):
        P, F, ST, taille = loft(anneaux)
        mats, zf = (m, None) if isinstance(m, str) else m
        p = Piece(nom, P, F, ST, taille, mats, None, lisse, partage, zf, decor)
        p.xf = None
        self.pieces.append(p)
        return p

    def tube(self, nom, pts, rs, m, K=10, aplat=1.0, haut=(0, 0, 1), poles=True, decor=()):
        return self.ajoute(nom, chemin(pts, rs, K, haut=haut, aplat=aplat, poles=poles), m, decor=decor)

    def boite(self, nom, c, t, m, arrondi=0.3, rot=None, K=8, decor=()):
        return self.ajoute(nom, boite(c, t, K=K, arrondi=arrondi, rot=rot), m, decor=decor)

    def lame(self, nom, y0, y1, larg, ep, m, pointe=0.25, courbe=0.0, K=None, decor=(), tranchant=True, larg_fin=None):
        """Lame plate de y0 à y1 (losange en section), pointe sur la fraction finale, courbure en x."""
        ann = []
        n = 9
        lf = larg if larg_fin is None else larg_fin
        for i in range(n):
            t = i / (n - 1)
            y = y0 + (y1 - y0) * t
            w = larg + (lf - larg) * t
            if t > 1 - pointe:
                w *= max((1 - t) / pointe, 0.0) ** 0.8
            e = ep * (0.4 + 0.6 * w / max(larg, 1e-6))
            dx = courbe * t * t
            pts = [(dx + w, y, 0), (dx, y, e), (dx - w * (0.25 if not tranchant else 1), y, 0), (dx, y, -e)]
            ann.append(np.array(pts))
        ann.append(np.array([ann[-1].mean(0)] * 4))
        return self.ajoute(nom, ann, m, lisse=False, decor=decor)

    def disque(self, nom, r, ep, m, K=28, bombe=0.0, rx=None, centre=(0, 0, 0), decor=(), rebord=0.0):
        """Bouclier rond ou ovale : face vers +Z, bombé, avec rebord."""
        rx = rx or r
        cx, cy, cz = centre
        th = np.arange(K) * 2 * np.pi / K
        ann = [np.array([[cx, cy, cz + ep / 2 + bombe]] * K)]
        for f in (0.35, 0.7, 0.92, 1.0):
            z = cz + ep / 2 + bombe * (1 - f * f) + (rebord if f > 0.95 else 0)
            ann.append(np.stack([cx + rx * f * np.cos(th), cy + r * f * np.sin(th), np.full(K, z)], 1))
        ann.append(np.stack([cx + rx * 1.01 * np.cos(th), cy + r * 1.01 * np.sin(th), np.full(K, cz)], 1))
        for f in (1.0, 0.7):
            ann.append(np.stack([cx + rx * f * np.cos(th), cy + r * f * np.sin(th), np.full(K, cz - ep / 2 + bombe * 0.5 * (1 - f * f))], 1))
        ann.append(np.array([[cx, cy, cz - ep / 2 + bombe * 0.5]] * K))
        return self.ajoute(nom, ann, m, decor=decor)


def face(R, frac, cle='joueur', dos=None, rx=None):
    """Face avant (vers +Z) dans la couleur du joueur jusqu'à la fraction frac du rayon R ; dos en bois."""
    def f(c):
        r = np.hypot(c.x / (rx or R), c.y / R)
        c.poser(cle, (c.N[:, 2] > 0.2) & (r < frac))
        if dos:
            c.poser(dos, c.N[:, 2] < -0.3)
    return f


def poignee_cuir(c):
    m = ((c.ST[:, 1] * 18) % 1) < 0.25
    c.col = np.where(m[:, None], c.col * 0.7, c.col)


def fil(c):
    c.col = mix(c.col, np.minimum(c.col * 1.35 + 0.08, 1), 0.5 * (np.abs(c.N[:, 2]) < 0.5))


# --- fabrication des objets ----------------------------------------------------------------------
def lance_dory():
    o = Objet()
    o.tube('hampe', [(0, -1.0, 0), (0, 0.6, 0), (0, 1.3, 0)], [0.016, 0.016, 0.014], 'bois', K=8, poles=True)
    o.lame('fer', 1.28, 1.52, 0.032, 0.008, 'bronze', pointe=0.55)
    o.tube('douille', [(0, 1.24, 0), (0, 1.30, 0)], [0.020, 0.018], 'bronze', K=8)
    o.tube('talon', [(0, -1.08, 0), (0, -0.98, 0)], [0.006, 0.018], 'bronze', K=8)
    o.tube('prise', [(0, -0.07, 0), (0, 0.07, 0)], [0.019, 0.019], 'cuir', K=8, decor=[poignee_cuir])
    return o.pieces, PAL, 'main droite, au milieu de la hampe'


def bouclier_hoplon():
    o = Objet()
    o.disque('bouclier', 0.45, 0.04, zones('bronze'), K=32, bombe=0.07, centre=(0, 0, 0.06), rebord=0.012,
             decor=[face(0.45, 0.84, 'joueur', 'bois')])
    o.boite('brassard', (0, 0.0, 0.0), (0.08, 0.05, 0.03), 'bronze')
    o.tube('poignee', [(-0.30, 0, 0.02), (-0.33, 0, 0.0), (-0.30, 0, -0.02)], [0.012] * 3, 'cuir', K=6)
    return o.pieces, PAL, 'avant-bras gauche (brassard au centre), main à la poignée du bord'


def _lambda(c):
    pass


def xiphos():
    o = Objet()
    o.lame('lame', 0.06, 0.62, 0.026, 0.006, 'bronze', pointe=0.3, larg_fin=0.034, decor=[fil])
    o.boite('garde', (0, 0.055, 0), (0.11, 0.022, 0.03), 'bronze', arrondi=0.6)
    o.tube('poignee', [(0, -0.06, 0), (0, 0.045, 0)], [0.016, 0.014], 'cuir', K=8, decor=[poignee_cuir])
    o.boite('pommeau', (0, -0.07, 0), (0.05, 0.03, 0.035), 'bronze', arrondi=0.8)
    return o.pieces, PAL, 'main, poignée'


def gladius():
    o = Objet()
    o.lame('lame', 0.07, 0.62, 0.028, 0.006, 'fer', pointe=0.18, decor=[fil])
    o.boite('garde', (0, 0.06, 0), (0.085, 0.03, 0.04), 'bois_clair', arrondi=0.8)
    o.tube('poignee', [(0, -0.05, 0), (0, 0.05, 0)], [0.016, 0.016], 'bois_clair', K=8, decor=[poignee_cuir])
    o.boite('pommeau', (0, -0.07, 0), (0.06, 0.04, 0.045), 'bois_clair', arrondi=0.9)
    return o.pieces, PAL, 'main, poignée'


def scutum():
    o = Objet()
    K = 16
    ann = []
    for y in np.linspace(-0.55, 0.55, 7):
        th = np.linspace(-1.0, 1.0, K)
        x = 0.36 * np.sin(th)
        z = 0.14 * np.cos(th) - 0.06
        e = np.stack([x, np.full(K, y), z], 1)
        i = np.stack([x * 0.98, np.full(K, y), z - 0.02], 1)
        ann.append((e, i))
    o.ajoute('bouclier', bande([a for a, b in ann], [b for a, b in ann], fermer=True), zones('joueur'),
             decor=[_scutum_deco])
    o.disque('umbo', 0.07, 0.02, 'bronze', K=16, bombe=0.04, centre=(0, 0, 0.085))
    o.tube('poignee', [(-0.05, 0, 0.02), (0, 0, -0.01), (0.05, 0, 0.02)], [0.012] * 3, 'cuir', K=6)
    return o.pieces, PAL, 'main gauche (poignée derrière l\'umbo)'


def _scutum_deco(c):
    bord = (np.abs(c.y) > 0.52) | (np.abs(c.x) > 0.335)
    c.poser('bronze', bord)
    c.poser('bois', c.N[:, 2] < -0.3)
    eclair = (c.N[:, 2] > 0.2) & (np.abs(np.abs(c.y) - 0.25 - 0.3 * np.abs(c.x)) < 0.012) & (np.abs(c.x) < 0.25)
    c.poser('or', eclair)


def pilum():
    o = Objet()
    o.tube('hampe', [(0, -0.9, 0), (0, 0.55, 0)], [0.017, 0.017], 'bois', K=8)
    o.boite('renfort', (0, 0.56, 0), (0.04, 0.06, 0.04), 'fer', arrondi=0.4)
    o.tube('tige', [(0, 0.58, 0), (0, 1.15, 0)], [0.006, 0.005], 'fer', K=6)
    o.lame('pointe', 1.14, 1.22, 0.012, 0.006, 'fer', pointe=0.8)
    return o.pieces, PAL, 'main droite, tiers arrière de la hampe'


def arc(style='egyptien'):
    o = Objet()
    K = 13
    if style == 'egyptien':
        pts = [(0.02 * math.sin(t * math.pi) + 0.0, -0.72 + 1.44 * t, -0.06 * math.sin(t * math.pi)) for t in np.linspace(0, 1, K)]
    else:  # composite à extrémités recourbées
        pts = []
        for t in np.linspace(0, 1, K):
            y = -0.55 + 1.10 * t
            z = -0.10 * math.sin(t * math.pi) + 0.06 * (abs(t - 0.5) > 0.42) * (abs(t - 0.5) - 0.42) * 25
            pts.append((0, y, z))
    rs = [0.008] + [0.014 + 0.006 * math.sin(t * math.pi) for t in np.linspace(0, 1, K)[1:-1]] + [0.008]
    o.tube('arc', pts, rs, 'bois_fonce' if style != 'egyptien' else 'bois', K=8,
           decor=[lambda c: c.poser('cuir', np.abs(c.y) < 0.06)])
    o.tube('corde', [pts[0], (0, 0, 0.02), pts[-1]], [0.003] * 3, 'corde', K=4)
    return o.pieces, PAL, 'main gauche, au milieu de l\'arc'


def khopesh():
    o = Objet()
    o.tube('poignee', [(0, -0.07, 0), (0, 0.06, 0)], [0.016, 0.016], 'or', K=8, decor=[poignee_cuir])
    o.lame('tige', 0.06, 0.30, 0.016, 0.006, 'bronze', pointe=0.0)
    ann = []
    for i, t in enumerate(np.linspace(0, 1, 10)):
        a = math.pi * 0.95 * t
        cx, cy = 0.11 * (1 - math.cos(a)), 0.30 + 0.16 * math.sin(a)
        w = 0.05 * (1 - 0.6 * t) + 0.006
        nx, ny = math.cos(a), math.sin(a)
        n = np.array([nx, -ny * 0 + ny, 0])
        pts = [(cx + w * math.cos(a), cy + w * math.sin(a) * 0.3, 0), (cx, cy, 0.005),
               (cx - w * math.cos(a) * 0.3, cy - 0.01, 0), (cx, cy, -0.005)]
        ann.append(np.array(pts))
    ann.append(np.array([ann[-1].mean(0)] * 4))
    o.ajoute('lame', ann, 'bronze', lisse=False, decor=[fil])
    return o.pieces, PAL, 'main, poignée'


def epee(lame=0.85, larg=0.026, garde=0.20, m='acier', poignee=0.18, pommeau='disque'):
    o = Objet()
    o.lame('lame', 0.04, 0.04 + lame, larg, 0.006, m, pointe=0.14, larg_fin=larg * 0.7, decor=[fil])
    o.tube('garde', [(-garde / 2, 0.03, 0), (0, 0.035, 0), (garde / 2, 0.03, 0)], [0.012, 0.014, 0.012], m, K=6)
    o.tube('poignee', [(0, -poignee + 0.03, 0), (0, 0.025, 0)], [0.015, 0.015], 'cuir', K=8, decor=[poignee_cuir])
    o.boite('pommeau', (0, -poignee + 0.015, 0), (0.05, 0.05, 0.022) if pommeau == 'disque' else (0.045, 0.04, 0.04), m,
            arrondi=0.95)
    return o.pieces, PAL, 'main, poignée'


def bouclier_ecu():
    o = Objet()
    K = 24
    t = np.linspace(0, 1, K, endpoint=False)
    contour = []
    for u in t:  # haut plat puis flancs arrondis jusqu'à la pointe
        a = u * 2 * math.pi
        x = 0.29 * math.sin(a)
        y = 0.24 if math.cos(a) > 0.55 else 0.24 - 0.66 * ((0.55 - math.cos(a)) / 1.55) ** 1.3
        x *= 1 - 0.75 * ((0.55 - min(math.cos(a), 0.55)) / 1.55) ** 2
        contour.append((x, y))
    contour = np.array(contour)
    ann = [np.array([[0, -0.03, 0.06]] * K)]
    for f in (0.4, 0.8, 1.0):
        ann.append(np.stack([contour[:, 0] * f, contour[:, 1] * f - 0.03 * (1 - f), np.full(K, 0.05 * (1 - f * f) + 0.01)], 1))
    for f in (1.0, 0.6):
        ann.append(np.stack([contour[:, 0] * f, contour[:, 1] * f - 0.03 * (1 - f), np.full(K, -0.012 + 0.02 * (1 - f * f))], 1))
    ann.append(np.array([[0, -0.03, 0.006]] * K))
    o.ajoute('bouclier', ann, zones('joueur'), decor=[_ecu_deco])
    o.tube('poignee', [(-0.06, 0, -0.01), (0, 0, -0.04), (0.06, 0, -0.01)], [0.012] * 3, 'cuir', K=6)
    return o.pieces, PAL, 'avant-bras gauche'


def _ecu_deco(c):
    c.poser('fer', (c.N[:, 2] < 0.45) & (c.z < 0.035))
    c.poser('bois', c.N[:, 2] < -0.3)
    bande_ = (c.N[:, 2] > 0.3) & (np.abs(c.x) < 0.035)
    c.poser('or', bande_)


def hache(viking=True):
    o = Objet()
    o.tube('manche', [(0, -0.45, 0), (0, 0.0, 0), (0, 0.32, 0)], [0.018, 0.017, 0.019], 'bois', K=8)
    ann = []
    for t in np.linspace(0, 1, 7):
        y = 0.18 + 0.14 * t if viking else 0.20 + 0.10 * t
        bas = (0.24 if viking else 0.13) * math.sin(t * math.pi) ** (0.6 if viking else 1.0)
        x1 = 0.02 + (0.20 if viking else 0.15) * (t ** 0.4 if viking else 1)
        ann.append(np.array([(x1, y - (0.10 * (1 - t) if viking else 0), 0.0), (0.04, y, 0.012), (-0.02, y, 0.0),
                             (0.04, y, -0.012)]))
    o.ajoute('fer', ann, 'fer', lisse=False, decor=[fil])
    return o.pieces, PAL, 'main, bas du manche'


def bouclier_rond(rayon=0.42, motif='planches', bord='fer'):
    o = Objet()
    o.disque('bouclier', rayon, 0.025, zones('joueur'), K=30, bombe=0.01, centre=(0, 0, 0.02), rebord=0.006,
             decor=[_rond_deco(motif, bord, rayon)])
    o.disque('umbo', 0.07, 0.02, 'fer', K=16, bombe=0.05, centre=(0, 0, 0.04))
    o.tube('poignee', [(-0.06, 0, -0.01), (0, 0, -0.035), (0.06, 0, -0.01)], [0.012] * 3, 'bois', K=6)
    return o.pieces, PAL, 'main gauche (poignée derrière l\'umbo)'


def _rond_deco(motif, bord, R, rx=None):
    def f(c):
        r = np.hypot(c.x / (rx or R), c.y / R)
        c.poser(bord, r > 0.9)
        c.poser('bois', c.N[:, 2] < -0.3)
        if motif == 'planches':
            pass
        if motif == 'planches':
            m = (np.abs(((c.x * 9) % 1) - 0.5) > 0.46) & (c.N[:, 2] > 0.2)
            c.col = np.where(m[:, None], c.col * 0.7, c.col)
        elif motif == 'plumes':
            fr = (r > 0.80) & (r <= 0.9) & (c.N[:, 2] > -0.3)
            c.poser('plumes_vertes', fr)
            m = (np.abs(np.hypot(c.x, c.y) - 0.16) < 0.015) & (c.N[:, 2] > 0.2)
            c.poser('or', m)
    return f


def katana():
    o = Objet()
    o.lame('lame', 0.06, 0.78, 0.016, 0.006, 'acier', pointe=0.08, courbe=-0.04, tranchant=False, decor=[fil])
    o.disque('tsuba', 0.04, 0.008, 'fer', K=12)
    o.pieces[-1].P = o.pieces[-1].P @ rot_x(math.pi / 2).T + [0, 0.05, 0]
    o.tube('tsuka', [(0, -0.24, 0), (0, 0.045, 0)], [0.015, 0.016], 'noir', K=8, aplat=0.8,
           decor=[lambda c: c.poser('joueur_tissu', ((c.y * 30) % 1) < 0.45)])
    return o.pieces, PAL, 'main, poignée (tsuka)'


def lance(long_=2.0, fer='acier', m='bois', larg=0.022, pointe_l=0.28):
    o = Objet()
    o.tube('hampe', [(0, -long_ * 0.45, 0), (0, long_ * 0.5, 0)], [0.016, 0.015], m, K=8)
    o.lame('fer', long_ * 0.5 - 0.02, long_ * 0.5 + pointe_l, larg, 0.007, fer, pointe=0.6)
    return o.pieces, PAL, 'main droite, tiers arrière de la hampe'


def macuahuitl():
    o = Objet()
    o.boite('corps', (0, 0.30, 0), (0.08, 0.62, 0.025), 'bois', arrondi=0.6)
    o.tube('poignee', [(0, -0.12, 0), (0, 0.0, 0)], [0.016, 0.017], 'cuir', K=8, decor=[poignee_cuir])
    for i, y in enumerate(np.linspace(0.08, 0.56, 7)):
        for s in (1, -1):
            o.boite('eclat%d%d' % (i, s > 0), (s * 0.048, y, 0), (0.03, 0.045, 0.008), 'obsidienne', arrondi=0.1,
                    rot=rot_z(s * 0.3), K=4)
    return o.pieces, PAL, 'main, poignée'


def chimalli():
    return bouclier_rond(0.33, 'plumes', 'or')


def arc_composite():
    return arc('composite')


def sabre():
    o = Objet()
    o.lame('lame', 0.05, 0.80, 0.020, 0.006, 'acier', pointe=0.1, courbe=-0.09, tranchant=False, decor=[fil])
    o.tube('garde', [(-0.04, 0.045, 0), (0.04, 0.045, 0)], [0.010, 0.010], 'or', K=6)
    o.tube('poignee', [(0, -0.11, 0), (0, 0.04, 0)], [0.015, 0.015], 'cuir', K=8, decor=[poignee_cuir])
    return o.pieces, PAL, 'main, poignée'


def outil(type_):
    o = Objet()
    if type_ == 'hache-bucheron':
        o.tube('manche', [(0, -0.40, 0), (0, 0.40, 0)], [0.019, 0.018], 'bois_clair', K=8)
        o.boite('tete', (0.05, 0.36, 0), (0.17, 0.08, 0.035), 'fer', arrondi=0.3, decor=[fil])
        return o.pieces, PAL, 'main, bas du manche'
    if type_ == 'pioche':
        o.tube('manche', [(0, -0.42, 0), (0, 0.40, 0)], [0.019, 0.018], 'bois_clair', K=8)
        o.tube('fer', [(-0.28, 0.33, 0), (-0.1, 0.40, 0), (0, 0.41, 0), (0.1, 0.40, 0), (0.28, 0.33, 0)],
               [0.004, 0.02, 0.028, 0.02, 0.004], 'fer', K=6, aplat=0.8)
        return o.pieces, PAL, 'main, bas du manche'
    if type_ == 'marteau':
        o.tube('manche', [(0, -0.18, 0), (0, 0.20, 0)], [0.015, 0.014], 'bois_clair', K=8)
        o.boite('tete', (0, 0.22, 0), (0.13, 0.05, 0.05), 'fer', arrondi=0.4)
        return o.pieces, PAL, 'main, bas du manche'
    if type_ == 'faucille':
        o.tube('manche', [(0, -0.10, 0), (0, 0.06, 0)], [0.016, 0.016], 'bois', K=8)
        pts = [(0.0, 0.06, 0), (0.06, 0.20, 0), (0.0, 0.32, 0), (-0.12, 0.30, 0), (-0.16, 0.22, 0)]
        o.tube('lame', pts, [0.012, 0.016, 0.016, 0.012, 0.002], 'fer', K=6, aplat=0.25)
        return o.pieces, PAL, 'main, manche'
    if type_ == 'panier':
        th = np.arange(16) * 2 * math.pi / 16
        ann = [np.array([[0, -0.15, 0]] * 16)]
        for y, r in ((-0.15, 0.13), (-0.05, 0.16), (0.08, 0.18), (0.08, 0.17), (-0.13, 0.12)):
            ann.append(np.stack([r * np.cos(th), np.full(16, y), r * np.sin(th)], 1))
        o.ajoute('panier', ann, 'osier', decor=[lambda c: setattr(c, 'col', c.col * (0.8 + 0.25 * (np.sin(c.y * 120) > 0))[:, None])])
        o.tube('anse', [(-0.17, 0.08, 0), (-0.1, 0.25, 0), (0, 0.29, 0), (0.1, 0.25, 0), (0.17, 0.08, 0)],
               [0.012] * 5, 'osier', K=6)
        return o.pieces, PAL, 'main, anse'
    if type_ == 'pelle':
        o.tube('manche', [(0, -0.55, 0), (0, 0.30, 0)], [0.017, 0.017], 'bois_clair', K=8)
        o.boite('poignee', (0, -0.58, 0), (0.12, 0.03, 0.03), 'bois_clair', arrondi=0.6)
        o.boite('fer', (0, 0.42, 0.01), (0.20, 0.26, 0.012), 'fer', arrondi=0.5)
        return o.pieces, PAL, 'main, manche'
    if type_ == 'cle':
        o.boite('manche', (0, 0.0, 0), (0.035, 0.26, 0.012), 'acier', arrondi=0.5)
        o.tube('tete', [(-0.03, 0.14, 0), (0, 0.17, 0), (0.03, 0.14, 0)], [0.015, 0.02, 0.015], 'acier', K=6, aplat=0.5)
        return o.pieces, PAL, 'main, manche'
    if type_ == 'torche':
        o.tube('manche', [(0, -0.25, 0), (0, 0.20, 0)], [0.016, 0.022], 'bois', K=8)
        o.tube('flamme', [(0, 0.20, 0), (0, 0.30, 0), (0, 0.40, 0)], [0.04, 0.035, 0.0], 'flamme', K=8)
        return o.pieces, PAL, 'main, manche'
    if type_ == 'lasso':
        th = np.linspace(0, 2 * math.pi, 18)
        pts = [(0.18 * math.cos(t), 0.18 * math.sin(t) + 0.18, 0.01 * math.sin(3 * t)) for t in th]
        o.tube('lasso', pts, [0.008] * len(pts), 'corde', K=5, poles=False)
        return o.pieces, PAL, 'main, bas de la boucle'
    raise ValueError(type_)


def etendard():
    o = Objet()
    o.tube('hampe', [(0, -0.9, 0), (0, 1.5, 0)], [0.016, 0.015], 'bois', K=8)
    o.tube('pointe', [(0, 1.5, 0), (0, 1.62, 0)], [0.02, 0.0], 'or', K=6)
    o.tube('traverse', [(-0.02, 1.42, 0), (0.62, 1.42, 0)], [0.008, 0.008], 'bois', K=6)
    K = 11
    ext, inte = [], []
    for y in np.linspace(1.42, 0.72, 6):
        xs = np.linspace(0.02, 0.60, K)
        z = 0.025 * np.sin(xs * 9 + y * 4)
        fin = y < 0.86
        yy = np.full(K, y) - (0.12 * np.abs(np.sin((xs - 0.02) / 0.58 * math.pi)) if fin else 0) * ss(0.86, 0.72, y)
        e = np.stack([xs, yy, z + 0.004], 1)
        i = np.stack([xs, yy, z - 0.004], 1)
        ext.append(e); inte.append(i)
    o.ajoute('drapeau', bande(ext, inte, fermer=True), 'joueur_tissu',
             decor=[lambda c: c.poser('or', (c.ST[:, 1] < 0.05) | (c.ST[:, 1] > 0.97))])
    return o.pieces, PAL, 'main droite, bas de la hampe'


def arme_feu(type_):
    o = Objet()
    if type_ in ('mousquet', 'arquebuse', 'fusil-baionnette', 'fusil-1940'):
        L = {'mousquet': 1.45, 'arquebuse': 1.25, 'fusil-baionnette': 1.50, 'fusil-1940': 1.10}[type_]
        o.tube('canon', [(0, 0.10, 0.03), (0, L * 0.72, 0.03)], [0.012, 0.010], 'fer', K=8)
        o.boite('fut', (0, L * 0.25 - 0.02, 0.0), (0.045, L * 0.5, 0.05), 'bois', arrondi=0.5)
        o.ajoute('crosse', boite((0, -0.15, -0.028), (0.045, 0.34, 0.085), K=8, arrondi=0.5, rot=rot_x(-0.22)), 'bois')
        o.boite('platine', (0.0, 0.05, 0.0), (0.05, 0.08, 0.04), 'fer', arrondi=0.3)
        if type_ == 'fusil-baionnette':
            o.lame('baionnette', L * 0.72, L * 0.72 + 0.40, 0.012, 0.006, 'acier', pointe=0.3)
        if type_ == 'fusil-1940':
            o.boite('culasse', (0.02, 0.12, 0.035), (0.04, 0.16, 0.035), 'fer', arrondi=0.3)
        return o.pieces, PAL, 'main droite à la poignée de la crosse (origine)'
    if type_ in ('revolver', 'pistolet', 'pistolet-laser'):
        m = {'revolver': 'fer', 'pistolet': 'polymere', 'pistolet-laser': 'blanc'}[type_]
        o.boite('poignee', (0, -0.04, 0), (0.03, 0.11, 0.045), 'bois' if type_ == 'revolver' else m, arrondi=0.5,
                rot=rot_x(0.25))
        o.boite('carcasse', (0, 0.05, 0.05), (0.03, 0.05, 0.14), m, arrondi=0.4)
        o.tube('canon', [(0, 0.06, 0.10), (0, 0.06, 0.24)], [0.011, 0.011], 'fer' if type_ == 'revolver' else m, K=8)
        if type_ == 'revolver':
            o.tube('barillet', [(0, 0.05, 0.03), (0, 0.05, 0.08)], [0.022, 0.022], 'fer', K=8)
        if type_ == 'pistolet-laser':
            o.tube('emetteur', [(0, 0.06, 0.23), (0, 0.06, 0.26)], [0.014, 0.008], 'cyan', K=8)
            o.boite('cellule', (0, 0.08, 0.04), (0.034, 0.02, 0.06), 'joueur', arrondi=0.4)
        return _redresser(o.pieces), PAL, 'main, poignée'
    if type_ in ('carabine', 'fusil-assaut', 'fusil-laser'):
        m = {'carabine': 'fer', 'fusil-assaut': 'polymere', 'fusil-laser': 'blanc'}[type_]
        o.boite('carcasse', (0, 0.06, 0.05), (0.045, 0.08, 0.36), m, arrondi=0.35)
        o.tube('canon', [(0, 0.075, 0.22), (0, 0.075, 0.58 if type_ != 'fusil-assaut' else 0.52)], [0.012, 0.011],
               'fer' if type_ == 'carabine' else m, K=8)
        o.ajoute('crosse', boite((0, 0.03, -0.25), (0.04, 0.11, 0.24), K=8, arrondi=0.45, rot=rot_x(0.12)),
                 'bois' if type_ == 'carabine' else m)
        o.boite('poignee', (0, -0.04, 0.0), (0.03, 0.10, 0.045), 'bois' if type_ == 'carabine' else m, arrondi=0.5,
                rot=rot_x(0.3))
        if type_ == 'fusil-assaut':
            o.boite('chargeur', (0, -0.04, 0.11), (0.025, 0.13, 0.05), 'polymere', arrondi=0.3, rot=rot_x(-0.25))
            o.boite('viseur', (0, 0.125, 0.06), (0.03, 0.035, 0.08), 'noir', arrondi=0.4)
            o.boite('garde-main', (0, 0.07, 0.30), (0.05, 0.06, 0.18), 'joueur', arrondi=0.4)
        if type_ == 'fusil-laser':
            o.boite('batterie', (0, 0.12, -0.02), (0.05, 0.04, 0.16), 'joueur', arrondi=0.5)
            o.tube('emetteur', [(0, 0.075, 0.56), (0, 0.075, 0.62)], [0.02, 0.012], 'cyan', K=8)
            o.boite('ligne', (0.024, 0.06, 0.10), (0.004, 0.012, 0.22), 'cyan', arrondi=0.3)
        return _redresser(o.pieces), PAL, 'main droite, poignée'
    raise ValueError(type_)


def _redresser(pieces):
    """Armes construites canon vers +Z : canon remis vers +Y comme les autres armes (dessus vers -Z)."""
    R = rot_x(-math.pi / 2)
    for pc in pieces:
        pc.P = pc.P @ R.T
    return pieces


def epee_energie():
    o = Objet()
    o.tube('poignee', [(0, -0.12, 0), (0, 0.04, 0)], [0.018, 0.018], 'blanc', K=8,
           decor=[lambda c: c.poser('joueur', ((c.y * 25) % 1) < 0.3)])
    o.tube('emetteur', [(0, 0.04, 0), (0, 0.07, 0)], [0.024, 0.02], 'noir', K=8)
    o.tube('lame', [(0, 0.07, 0), (0, 0.9, 0), (0, 0.96, 0)], [0.02, 0.02, 0.0], 'cyan', K=8)
    return o.pieces, PAL, 'main, poignée'


def bouclier_energie():
    o = Objet()
    o.boite('emetteur', (0, 0, 0), (0.10, 0.16, 0.05), 'blanc', arrondi=0.5)
    th = np.arange(6) * 2 * math.pi / 6 + math.pi / 6
    ann = [np.array([[0, 0, 0.05]] * 6)]
    for r, z in ((0.40, 0.05), (0.42, 0.04), (0.42, 0.03), (0.40, 0.02)):
        ann.append(np.stack([r * np.cos(th), r * np.sin(th), np.full(6, z)], 1))
    ann.append(np.array([[0, 0, 0.02]] * 6))
    o.ajoute('champ', ann, zones('joueur'), lisse=False,
             decor=[lambda c: c.poser('cyan', c.ST[:, 1] > 0.3)])
    return o.pieces, PAL, 'avant-bras gauche'


def drone():
    o = Objet()
    o.boite('corps', (0, 0, 0), (0.16, 0.06, 0.16), 'blanc', arrondi=0.6)
    o.boite('oeil', (0, -0.01, 0.08), (0.05, 0.03, 0.02), 'cyan', arrondi=0.8)
    for i, (x, z) in enumerate(((0.14, 0.14), (-0.14, 0.14), (0.14, -0.14), (-0.14, -0.14))):
        o.tube('bras%d' % i, [(0, 0, 0), (x, 0.01, z)], [0.012, 0.01], 'joueur', K=6, poles=False)
        o.disque('helice%d' % i, 0.06, 0.006, 'noir', K=12, centre=(x, 0.03, z))
        o.pieces[-1].P = (o.pieces[-1].P - [x, 0.03, z]) @ rot_x(-math.pi / 2).T + [x, 0.03, z]
    return o.pieces, PAL, 'en vol, au-dessus de l\'épaule (pas de prise)'


def tambour():
    o = Objet()
    th = np.arange(18) * 2 * math.pi / 18
    ann = [np.array([[0, 0.16, 0]] * 18)]
    for y in (0.16, 0.15, -0.15, -0.16):
        ann.append(np.stack([0.17 * np.cos(th), np.full(18, y), 0.17 * np.sin(th)], 1))
    ann.append(np.array([[0, -0.16, 0]] * 18))
    o.ajoute('fut', ann, zones('joueur'), decor=[_tambour_deco])
    return o.pieces, PAL, 'hanche gauche (sangle)'


def _tambour_deco(c):
    c.poser('blanc', np.abs(c.y) > 0.155)
    c.poser('bois', (np.abs(c.y) > 0.125) & (np.abs(c.y) <= 0.155))
    zig = np.abs(((np.arctan2(c.z, c.x) * 6 / math.pi) % 1) - 0.5) * 0.24 - 0.06 - c.y * 0.5
    c.poser('corde', (np.abs(zig) < 0.01) & (np.abs(c.y) < 0.12))


def epee_celte():
    return epee(0.78, 0.028, 0.10, 'fer', 0.15, 'boule')


def bouclier_celte():
    o = Objet()
    o.disque('bouclier', 0.55, 0.025, zones('joueur'), K=26, rx=0.30, bombe=0.02, centre=(0, 0, 0.02),
             decor=[_rond_deco('planches', 'bronze', 0.55, 0.30)])
    o.boite('umbo', (0, 0, 0.05), (0.10, 0.20, 0.05), 'bronze', arrondi=0.8)
    o.boite('arete', (0, 0, 0.04), (0.04, 0.90, 0.02), 'bois', arrondi=0.6)
    o.tube('poignee', [(-0.05, 0, -0.01), (0, 0, -0.035), (0.05, 0, -0.01)], [0.012] * 3, 'bois', K=6)
    return o.pieces, PAL, 'main gauche (poignée derrière l\'umbo)'


def rapiere():
    o = Objet()
    o.lame('lame', 0.04, 0.95, 0.012, 0.005, 'acier', pointe=0.1, decor=[fil])
    o.tube('quillon', [(-0.12, 0.03, 0), (0, 0.035, 0), (0.12, 0.03, 0)], [0.006, 0.008, 0.006], 'or', K=6)
    o.tube('panier', [(0, 0.035, 0.0), (0.05, 0.0, 0.05), (0.03, -0.1, 0.05), (0, -0.12, 0)], [0.005] * 4, 'or', K=5,
           poles=False)
    o.tube('poignee', [(0, -0.12, 0), (0, 0.025, 0)], [0.013, 0.013], 'cuir', K=8, decor=[poignee_cuir])
    o.boite('pommeau', (0, -0.135, 0), (0.035, 0.035, 0.035), 'or', arrondi=0.95)
    return o.pieces, PAL, 'main, poignée'


# ---------------------------------------------------------------------------------------------
ACCESSOIRES = [
    ('1-antiquite', 'lance-dory', 'Lance (dory)', lance_dory, 512),
    ('1-antiquite', 'bouclier-hoplon', 'Bouclier hoplon', bouclier_hoplon, 1024),
    ('1-antiquite', 'xiphos', 'Épée courte (xiphos)', xiphos, 512),
    ('1-antiquite', 'gladius', 'Glaive (gladius)', gladius, 512),
    ('1-antiquite', 'scutum', 'Bouclier (scutum)', scutum, 1024),
    ('1-antiquite', 'pilum', 'Javelot (pilum)', pilum, 512),
    ('1-antiquite', 'arc-egyptien', 'Arc égyptien', lambda: arc('egyptien'), 512),
    ('1-antiquite', 'khopesh', 'Khopesh', khopesh, 512),
    ('1-antiquite', 'epee-celte', 'Épée celte', epee_celte, 512),
    ('1-antiquite', 'bouclier-celte', 'Bouclier celte', bouclier_celte, 1024),
    ('1-antiquite', 'panier', 'Panier', lambda: outil('panier'), 512),
    ('1-antiquite', 'faucille', 'Faucille', lambda: outil('faucille'), 512),
    ('2-moyen-age', 'epee-longue', 'Épée longue', epee, 512),
    ('2-moyen-age', 'bouclier-ecu', 'Écu', bouclier_ecu, 1024),
    ('2-moyen-age', 'etendard', 'Étendard', etendard, 1024),
    ('2-moyen-age', 'hache-viking', 'Hache viking', hache, 512),
    ('2-moyen-age', 'bouclier-viking', 'Bouclier rond viking', bouclier_rond, 1024),
    ('2-moyen-age', 'katana', 'Katana', katana, 512),
    ('2-moyen-age', 'yari', 'Lance (yari)', lambda: lance(2.1, 'acier', 'bois_fonce', 0.018, 0.25), 512),
    ('2-moyen-age', 'macuahuitl', 'Macuahuitl', macuahuitl, 512),
    ('2-moyen-age', 'chimalli', 'Bouclier (chimalli)', chimalli, 1024),
    ('2-moyen-age', 'arc-composite', 'Arc composite', arc_composite, 512),
    ('2-moyen-age', 'sabre', 'Sabre', sabre, 512),
    ('2-moyen-age', 'hache-bucheron', 'Hache de bûcheron', lambda: outil('hache-bucheron'), 512),
    ('2-moyen-age', 'pioche', 'Pioche', lambda: outil('pioche'), 512),
    ('2-moyen-age', 'marteau', 'Marteau', lambda: outil('marteau'), 512),
    ('2-moyen-age', 'torche', 'Torche', lambda: outil('torche'), 512),
    ('3-epoque-moderne', 'rapiere', 'Rapière', rapiere, 512),
    ('3-epoque-moderne', 'arquebuse', 'Arquebuse', lambda: arme_feu('arquebuse'), 512),
    ('3-epoque-moderne', 'mousquet', 'Mousquet', lambda: arme_feu('mousquet'), 512),
    ('3-epoque-moderne', 'fusil-baionnette', 'Fusil à baïonnette', lambda: arme_feu('fusil-baionnette'), 512),
    ('3-epoque-moderne', 'tambour', 'Tambour', tambour, 512),
    ('4-industrielle', 'revolver', 'Revolver', lambda: arme_feu('revolver'), 512),
    ('4-industrielle', 'carabine', 'Carabine', lambda: arme_feu('carabine'), 512),
    ('4-industrielle', 'lasso', 'Lasso', lambda: outil('lasso'), 512),
    ('5-xxe-siecle', 'fusil-1940', 'Fusil (1940)', lambda: arme_feu('fusil-1940'), 512),
    ('5-xxe-siecle', 'pelle', 'Pelle', lambda: outil('pelle'), 512),
    ('6-contemporain', 'fusil-assaut', 'Fusil d\'assaut', lambda: arme_feu('fusil-assaut'), 512),
    ('6-contemporain', 'pistolet', 'Pistolet', lambda: arme_feu('pistolet'), 512),
    ('6-contemporain', 'cle', 'Clé', lambda: outil('cle'), 512),
    ('7-futur', 'fusil-laser', 'Fusil laser', lambda: arme_feu('fusil-laser'), 512),
    ('7-futur', 'pistolet-laser', 'Pistolet laser', lambda: arme_feu('pistolet-laser'), 512),
    ('7-futur', 'epee-energie', 'Épée à énergie', epee_energie, 512),
    ('7-futur', 'bouclier-energie', 'Bouclier à énergie', bouclier_energie, 1024),
    ('7-futur', 'drone', 'Drone', drone, 512),
]
