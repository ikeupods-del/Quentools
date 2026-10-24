"""Montures et animaux : squelette de quadrupède commun (noms anglais, côtés _L/_R), cheval, cheval de guerre,
chameau, éléphant de guerre, loup.

Pose de repos : debout, les quatre pattes droites, tête vers +Z. Os « Saddle » = point d'attache du cavalier.
"""
import math

import numpy as np

from moteur import Piece, loft, chemin, boite, bande, Mat, zones, ss, mix, Squelette, w_chaine, superellipse, rot_x

ARRIERE = ['Thigh', 'Shin', 'BackCannon', 'BackHoof']
AVANT = ['FrontUpper', 'FrontLower', 'FrontCannon', 'FrontHoof']


def squelette(J):
    """J : positions des os du côté gauche et du centre ; le côté droit est déduit par symétrie."""
    os_ = [('Pelvis', None), ('Spine1', 'Pelvis'), ('Spine2', 'Spine1'), ('Chest', 'Spine2'), ('Saddle', 'Spine2'),
           ('Neck1', 'Chest'), ('Neck2', 'Neck1'), ('Head', 'Neck2'), ('Head_End', 'Head'),
           ('Tail1', 'Pelvis'), ('Tail2', 'Tail1'), ('Tail3', 'Tail2'), ('Tail_End', 'Tail3')]
    os_ += [(n, p) for n, p in (('Trunk1', 'Head'), ('Trunk2', 'Trunk1'), ('Trunk3', 'Trunk2'), ('Trunk_End', 'Trunk3'))
            if n in J]
    liste = [(n, p, J[n]) for n, p in os_ if n in J]
    for cote, s in (('_L', 1), ('_R', -1)):
        for chaine_, parent in ((ARRIERE, 'Pelvis'), (AVANT, 'Chest')):
            prec = parent
            for n in chaine_ + [chaine_[-1] + '_End']:
                x, y, z = J[n + '_L']
                liste.append((n + cote, prec, (s * x, y, z)))
                prec = n + cote
        if 'Ear_L' in J:
            x, y, z = J['Ear_L']
            liste.append(('Ear' + cote, 'Head', (s * x, y, z)))
    return Squelette(liste, '', {'Spine2': 'Chest', 'Chest': 'Neck1', 'Pelvis': 'Spine1', 'Head': 'Head_End'})


class Animal:
    def __init__(self, J, q=1.0):
        self.sq = squelette(J)
        self.J = J
        self.q = q
        self.pieces = []

    def k(self, n):
        return max(6, 2 * int(round(n * self.q / 2)))

    def ajoute(self, nom, anneaux, m, poids, miroir=False, lisse=True, decor=(), partage=None):
        P, F, ST, taille = loft(anneaux)
        mats, zf = (m, None) if isinstance(m, str) else m
        p = Piece(nom, P, F, ST, taille, mats, poids, lisse, partage, zf, decor)
        p.xf = None
        self.pieces.append(p)
        if miroir:
            q = Piece(nom + '_D', P * [-1, 1, 1], F[:, ::-1], ST, taille, mats, poids, lisse, p.partage, zf, decor)
            q.xf, q.miroir, q.peindre = None, True, False
            self.pieces.append(q)
        return p

    def chaine(self, noms, fondu):
        return lambda P: w_chaine(P, noms, fondu, self.sq)

    def os_(self, nom):
        return self.sq.w_os(nom)

    # --- pièces génériques ---
    def corps(self, m, anneaux, decor=(), n=2.2, K=26):
        """anneaux : (z, cy, rx, ry, bosse) ; bosse = relief du dos (chameau)."""
        K = self.k(K)
        th = np.arange(K) * 2 * np.pi / K
        ann = []
        for z, cy, rx, ry, bosse in anneaux:
            if rx <= 0:
                ann.append(np.array([[0, cy, z]] * K))
                continue
            c, s = np.cos(th), np.sin(th)
            x = rx * np.sign(c) * np.abs(c) ** (2 / n)
            y = ry * np.sign(s) * np.abs(s) ** (2 / n)
            y = y + bosse * np.clip(s, 0, 1) ** 3
            ann.append(np.stack([x, cy + y, np.full(K, z)], 1))

        def poids(P):
            W = w_chaine(P, ['Pelvis', 'Spine1', 'Spine2', 'Chest'], [0.0, 0.12, 0.12, 0.10], self.sq)
            for jambe, bas in (('Thigh', 0.25), ('FrontUpper', 0.22)):
                for cote, s in (('_L', 1), ('_R', -1)):
                    j = self.sq.J[jambe + cote]
                    d = np.linalg.norm((P - j) * [1.0, 1.4, 1.0], axis=1)
                    a = 0.55 * ss(bas, 0.0, d) * (P[:, 0] * s > 0) * ss(j[1] + 0.1, j[1] - 0.15, P[:, 1])
                    W *= (1 - a)[:, None]
                    W[:, self.sq.idx[jambe + cote]] += a
            return W
        self.ajoute('corps', ann, m, poids, decor=decor)

    def tube_os(self, nom, m, pts, rs, os_noms, fondu, K=12, miroir=False, decor=(), aplat=1.0, haut=(0, 1, 0),
                poles=True):
        self.ajoute(nom, chemin(pts, rs, self.k(K), haut=haut, aplat=aplat, poles=poles), m,
                    self.chaine(os_noms, fondu) if len(os_noms) > 1 else self.os_(os_noms[0]), miroir=miroir,
                    decor=decor)

    def patte(self, nom, m, pts, rs, os_noms, sabot=None, m_sabot='corne', K=12, decor=(), epais=1.0):
        """Patte du côté gauche (miroir automatique) : tube vertical, sabot ou coussinet au bout."""
        K = self.k(K)
        th = np.arange(K) * 2 * np.pi / K
        ann = []
        rs = [(a * epais, b * epais) for a, b in rs]
        if sabot:
            sabot = (sabot[0], sabot[1] * epais, sabot[2] * epais, sabot[3])
        for (x, y, z), (rx, rz) in zip(pts, rs):
            ann.append(np.stack([x + rx * np.cos(th), np.full(K, y), z + rz * np.sin(th)], 1))
        x, y, z = pts[-1]
        ann.append(np.array([[x, y - 0.01, z]] * K))
        self.ajoute(nom, ann, m, self.chaine(os_noms, [0.0, 0.06, 0.05, 0.04][:len(os_noms)]), miroir=True,
                    decor=decor)
        if sabot:
            h, rx, rz, dz = sabot
            ann = [np.array([[x, h, z + dz]] * K)]
            for yy, f in ((h, 0.85), (h * 0.6, 1.0), (0.004, 1.08), (0.0, 1.0)):
                ann.append(np.stack([x + rx * f * np.cos(th), np.full(K, yy), z + dz + rz * f * np.sin(th)], 1))
            ann.append(np.array([[x, 0.0, z + dz]] * K))
            self.ajoute(nom + '_sabot', ann, m_sabot, self.os_(os_noms[-1]), miroir=True)


def yeux(cote_x, y, z, r=0.018, couleur=(0.08, 0.05, 0.03)):
    def f(c):
        e = np.hypot(np.abs(c.x) - cote_x, np.hypot(c.y - y, c.z - z)) < r
        c.col = np.where(e[:, None], np.array(couleur), c.col)
        g = np.hypot(np.abs(c.x) - cote_x, np.hypot(c.y - y - r * 0.35, c.z - z - r * 0.3)) < r * 0.3
        c.col = np.where(g[:, None], np.array([0.85, 0.85, 0.85]), c.col)
    return f


def pal_base(robe, crins, **autres):
    pal = {'robe': Mat('peau', robe, rug=0.6), 'crins': Mat('cheveux', crins), 'corne': Mat('peinture', (0.14, 0.12, 0.11), rug=0.5),
           'joueur': Mat('tissu', joueur=True), 'joueur_metal': Mat('peinture', joueur=True, rug=0.45),
           'cuir': Mat('cuir', (0.36, 0.21, 0.11)), 'cuir_noir': Mat('cuir', (0.12, 0.10, 0.09)),
           'acier': Mat('metal', (0.70, 0.72, 0.76), rug=0.28), 'or': Mat('metal', (0.86, 0.64, 0.22), clair=(1, 0.92, 0.6)),
           'bois': Mat('bois', (0.48, 0.31, 0.17)), 'ivoire': Mat('peinture', (0.92, 0.88, 0.76), rug=0.45),
           'sombre': Mat('sombre', (0.05, 0.04, 0.035)), 'lin': Mat('tissu', (0.88, 0.83, 0.70))}
    pal.update(autres)
    return pal


# ---------------------------------------------------------------------------------------------
# Cheval
# ---------------------------------------------------------------------------------------------
J_CHEVAL = {
    'Pelvis': (0, 1.30, -0.50), 'Spine1': (0, 1.32, -0.15), 'Spine2': (0, 1.35, 0.20), 'Chest': (0, 1.38, 0.45),
    'Saddle': (0, 1.70, 0.02), 'Neck1': (0, 1.46, 0.62), 'Neck2': (0, 1.72, 0.80), 'Head': (0, 1.93, 0.92),
    'Head_End': (0, 1.62, 1.34), 'Tail1': (0, 1.33, -0.78), 'Tail2': (0, 1.13, -0.88), 'Tail3': (0, 0.90, -0.93),
    'Tail_End': (0, 0.64, -0.94), 'Ear_L': (0.05, 2.02, 0.87),
    'Thigh_L': (0.18, 1.22, -0.55), 'Shin_L': (0.18, 0.86, -0.43), 'BackCannon_L': (0.17, 0.55, -0.66),
    'BackHoof_L': (0.17, 0.16, -0.62), 'BackHoof_End_L': (0.17, 0.0, -0.57),
    'FrontUpper_L': (0.17, 1.18, 0.48), 'FrontLower_L': (0.16, 0.92, 0.46), 'FrontCannon_L': (0.15, 0.50, 0.48),
    'FrontHoof_L': (0.15, 0.16, 0.50), 'FrontHoof_End_L': (0.15, 0.0, 0.55),
}


def cheval(q=1.0, guerre=False, couleur=(0.42, 0.25, 0.14), crins=(0.10, 0.07, 0.05), selle=True):
    a = Animal(J_CHEVAL, q)
    pal = pal_base(couleur, crins)
    corps = [(-0.82, 1.32, 0.0, 0.0, 0), (-0.80, 1.32, 0.12, 0.12, 0), (-0.74, 1.31, 0.22, 0.25, 0),
             (-0.60, 1.30, 0.27, 0.30, 0), (-0.40, 1.29, 0.28, 0.31, 0), (-0.15, 1.27, 0.29, 0.33, 0),
             (0.15, 1.27, 0.30, 0.34, 0), (0.40, 1.31, 0.27, 0.33, 0), (0.55, 1.34, 0.22, 0.29, 0),
             (0.66, 1.37, 0.13, 0.19, 0), (0.70, 1.38, 0.0, 0.0, 0)]
    deco = []
    if selle:
        deco.append(lambda c: c.poser('joueur', (c.y > 1.45) & (np.abs(c.z - 0.02) < 0.30) & (np.abs(c.x) < 0.30)))
    a.corps('robe', corps, decor=deco)
    a.tube_os('cou', 'robe', [(0, 1.36, 0.48), (0, 1.58, 0.70), (0, 1.80, 0.85), (0, 1.94, 0.92)],
              [(0.17, 0.27), (0.13, 0.21), (0.10, 0.15), (0.09, 0.12)], ['Chest', 'Neck1', 'Neck2', 'Head'],
              [0.0, 0.12, 0.10, 0.06], K=14, poles=False)
    a.tube_os('tete', 'robe', [(0, 1.97, 0.88), (0, 1.90, 1.00), (0, 1.77, 1.17), (0, 1.67, 1.29), (0, 1.62, 1.34)],
              [(0.085, 0.115), (0.08, 0.11), (0.066, 0.085), (0.06, 0.07), (0.045, 0.05)], ['Head'], 0,
              K=14, decor=[yeux(0.072, 1.90, 1.00), _naseaux, _bride] if selle else [yeux(0.072, 1.90, 1.00), _naseaux])
    a.tube_os('oreille', 'robe', [(0.05, 1.99, 0.88), (0.06, 2.06, 0.87), (0.065, 2.11, 0.86)], [0.022, 0.016, 0.0],
              ['Ear_L'], 0, K=6, miroir=True, poles=False)
    a.tube_os('criniere', 'crins', [(0, 1.62, 0.50), (0, 1.80, 0.68), (0, 1.96, 0.82), (0, 2.03, 0.90), (0, 1.98, 1.00)],
              [(0.03, 0.07), (0.035, 0.08), (0.03, 0.07), (0.025, 0.05), (0.0, 0.0)], ['Chest', 'Neck1', 'Neck2', 'Head'],
              [0.0, 0.12, 0.1, 0.06], K=8, haut=(1, 0, 0))
    a.tube_os('queue', 'crins', [(0, 1.36, -0.77), (0, 1.25, -0.86), (0, 1.05, -0.92), (0, 0.85, -0.95), (0, 0.66, -0.95)],
              [0.05, 0.07, 0.08, 0.07, 0.0], ['Tail1', 'Tail2', 'Tail3'], [0.0, 0.08, 0.08], K=10, poles=False)
    a.patte('patte_av', 'robe', [(0.17, 1.12, 0.47), (0.16, 0.92, 0.46), (0.155, 0.70, 0.47), (0.15, 0.50, 0.48),
                                 (0.15, 0.30, 0.49), (0.15, 0.16, 0.50), (0.15, 0.09, 0.52)],
            [(0.10, 0.12), (0.085, 0.10), (0.062, 0.07), (0.055, 0.06), (0.042, 0.047), (0.047, 0.052), (0.04, 0.045)],
            ['FrontUpper_L', 'FrontLower_L', 'FrontCannon_L', 'FrontHoof_L'], sabot=(0.09, 0.05, 0.058, 0.025), epais=1.2)
    a.patte('patte_ar', 'robe', [(0.18, 1.15, -0.55), (0.18, 0.95, -0.47), (0.18, 0.86, -0.44), (0.175, 0.70, -0.55),
                                 (0.17, 0.55, -0.66), (0.17, 0.35, -0.64), (0.17, 0.16, -0.62), (0.17, 0.09, -0.60)],
            [(0.13, 0.17), (0.12, 0.16), (0.10, 0.13), (0.07, 0.09), (0.05, 0.07), (0.04, 0.045), (0.046, 0.05), (0.04, 0.045)],
            ['Thigh_L', 'Shin_L', 'BackCannon_L', 'BackHoof_L'], sabot=(0.09, 0.05, 0.058, 0.03), epais=1.2)
    if selle:
        a.ajoute('selle', boite((0, 1.66, 0.02), (0.36, 0.09, 0.46), K=a.k(12), arrondi=0.55), 'cuir', a.os_('Spine2'),
                 decor=[lambda c: c.poser('cuir_noir', c.y < 1.63)])
        a.ajoute('etrier', chemin([(0.27, 1.62, 0.05), (0.29, 1.30, 0.05), (0.29, 1.18, 0.05)], [0.012, 0.012, 0.03],
                                  a.k(6)), 'cuir', a.os_('Spine2'), miroir=True)
    if guerre:
        caparacon(a, 'joueur')
        a.ajoute('chanfrein', boite((0, 1.86, 1.06), (0.13, 0.10, 0.30), K=a.k(10), arrondi=0.5, rot=rot_x(0.95)),
                 'acier', a.os_('Head'), decor=[lambda c: c.poser('or', np.abs(c.x) < 0.012)])
    return a.pieces, pal, a.sq


def _naseaux(c):
    n = (c.z > 1.30) & (np.abs(np.abs(c.x) - 0.025) < 0.012) & (np.abs(c.y - 1.64) < 0.015)
    c.col = np.where(n[:, None], c.col * 0.3, c.col)
    b = (c.z > 1.28) & (np.abs(c.y - 1.60) < 0.006)
    c.col = np.where(b[:, None], c.col * 0.4, c.col)


def _bride(c):
    m = (np.abs(c.z - (1.22 - (c.y - 1.72) * 0.3)) < 0.012) | ((np.abs(c.y - 1.74) < 0.012) & (c.z > 1.05))
    c.poser('cuir', m)


def caparacon(a, m, z0=-0.70, z1=0.62, bas=0.90):
    """Caparaçon de tissu tombant sur les flancs (couleur du joueur), bordure dorée."""
    K = a.k(18)
    ext, inte = [], []
    for z in np.linspace(z0, z1, 7):
        t = (z - z0) / (z1 - z0)
        cy, rx, ry = 1.30 + 0.06 * t, 0.30, 0.35
        th = np.linspace(-0.08 * np.pi, 1.08 * np.pi, K)
        x = (rx + 0.03) * np.cos(th)
        y = cy + (ry + 0.03) * np.sin(th)
        y = np.where(np.sin(th) < 0, np.minimum(y, cy) - (cy - bas) * np.clip(-np.sin(th) / 0.25, 0, 1), y)
        x = np.where(np.sin(th) < 0, np.sign(x) * (rx + 0.04), x)
        e = np.stack([x, y, np.full(K, z)], 1)
        i = np.stack([x * 0.95, cy + (y - cy) * 0.97, np.full(K, z)], 1)
        ext.append(e); inte.append(i)

    def deco(c):
        c.poser('or', (c.y < bas + 0.04) | (np.abs(c.z - z0) < 0.02) | (np.abs(c.z - z1) < 0.02))
    a.ajoute('caparacon', bande(ext, inte, fermer=True), m,
             lambda P: w_chaine(P, ['Pelvis', 'Spine1', 'Spine2', 'Chest'], [0.0, 0.12, 0.12, 0.1], a.sq), decor=[deco])


# ---------------------------------------------------------------------------------------------
# Chameau
# ---------------------------------------------------------------------------------------------
def chameau(q=1.0):
    J = dict(J_CHEVAL)
    J.update({'Pelvis': (0, 1.62, -0.55), 'Spine1': (0, 1.66, -0.18), 'Spine2': (0, 1.70, 0.18), 'Chest': (0, 1.66, 0.48),
              'Saddle': (0, 2.20, -0.05), 'Neck1': (0, 1.62, 0.70), 'Neck2': (0, 1.62, 1.02), 'Head': (0, 2.00, 1.20),
              'Head_End': (0, 1.98, 1.55), 'Tail1': (0, 1.62, -0.82), 'Tail2': (0, 1.45, -0.88), 'Tail3': (0, 1.28, -0.90),
              'Tail_End': (0, 1.10, -0.90), 'Ear_L': (0.06, 2.08, 1.16),
              'Thigh_L': (0.20, 1.50, -0.58), 'Shin_L': (0.19, 1.05, -0.45), 'BackCannon_L': (0.18, 0.62, -0.62),
              'BackHoof_L': (0.18, 0.10, -0.60), 'BackHoof_End_L': (0.18, 0.0, -0.52),
              'FrontUpper_L': (0.18, 1.45, 0.45), 'FrontLower_L': (0.17, 1.10, 0.48), 'FrontCannon_L': (0.17, 0.62, 0.50),
              'FrontHoof_L': (0.17, 0.10, 0.52), 'FrontHoof_End_L': (0.17, 0.0, 0.60)})
    a = Animal(J, q)
    pal = pal_base((0.74, 0.58, 0.38), (0.55, 0.40, 0.25))
    corps = [(-0.86, 1.62, 0.0, 0.0, 0), (-0.84, 1.62, 0.12, 0.12, 0), (-0.75, 1.62, 0.24, 0.26, 0),
             (-0.55, 1.63, 0.29, 0.31, 0.04), (-0.30, 1.66, 0.31, 0.33, 0.18), (-0.05, 1.68, 0.32, 0.34, 0.30),
             (0.18, 1.68, 0.31, 0.33, 0.20), (0.40, 1.66, 0.27, 0.31, 0.04), (0.58, 1.64, 0.20, 0.26, 0),
             (0.68, 1.62, 0.12, 0.16, 0), (0.72, 1.62, 0.0, 0.0, 0)]
    a.corps('robe', corps, decor=[lambda c: c.poser('joueur', (c.y > 1.92) & (c.y < 2.06) & (np.abs(c.z + 0.05) < 0.35))])
    a.tube_os('cou', 'robe', [(0, 1.62, 0.55), (0, 1.55, 0.80), (0, 1.62, 1.02), (0, 1.85, 1.15), (0, 2.02, 1.19)],
              [(0.15, 0.20), (0.11, 0.15), (0.09, 0.12), (0.08, 0.10), (0.08, 0.09)], ['Chest', 'Neck1', 'Neck2', 'Head'],
              [0.0, 0.12, 0.10, 0.06], K=12, poles=False)
    a.tube_os('tete', 'robe', [(0, 2.04, 1.12), (0, 2.06, 1.22), (0, 2.02, 1.38), (0, 1.98, 1.50), (0, 1.97, 1.56)],
              [(0.08, 0.09), (0.085, 0.09), (0.062, 0.07), (0.055, 0.06), (0.03, 0.03)], ['Head'], 0, K=12,
              decor=[yeux(0.075, 2.08, 1.25), _bride_chameau])
    a.tube_os('oreille', 'robe', [(0.06, 2.10, 1.14), (0.08, 2.14, 1.12)], [0.016, 0.0], ['Ear_L'], 0, K=6, miroir=True,
              poles=False)
    a.tube_os('queue', 'crins', [(0, 1.66, -0.84), (0, 1.48, -0.90), (0, 1.28, -0.92), (0, 1.15, -0.92)],
              [0.025, 0.025, 0.035, 0.0], ['Tail1', 'Tail2', 'Tail3'], [0.0, 0.06, 0.06], K=8, poles=False)
    for nom, pts, rs, os_n in (
            ('patte_av', [(0.18, 1.40, 0.46), (0.17, 1.10, 0.48), (0.17, 0.85, 0.49), (0.17, 0.62, 0.50),
                          (0.17, 0.35, 0.51), (0.17, 0.10, 0.52)],
             [(0.09, 0.11), (0.07, 0.08), (0.05, 0.055), (0.055, 0.06), (0.04, 0.042), (0.045, 0.05)], AVANT),
            ('patte_ar', [(0.20, 1.42, -0.58), (0.19, 1.05, -0.45), (0.185, 0.85, -0.53), (0.18, 0.62, -0.62),
                          (0.18, 0.35, -0.61), (0.18, 0.10, -0.60)],
             [(0.12, 0.16), (0.08, 0.10), (0.055, 0.065), (0.055, 0.06), (0.04, 0.042), (0.045, 0.05)], ARRIERE)):
        a.patte(nom, 'robe', pts, rs, [n + '_L' for n in os_n], sabot=(0.06, 0.07, 0.085, 0.03), m_sabot='robe', epais=1.3)
    a.ajoute('selle', boite((0, 2.14, -0.05), (0.42, 0.14, 0.40), K=a.k(12), arrondi=0.6), 'cuir', a.os_('Spine2'),
             decor=[lambda c: c.poser('joueur', c.y < 2.10)])
    return a.pieces, pal, a.sq


def _bride_chameau(c):
    m = (np.abs(c.z - 1.40) < 0.012) | ((np.abs(c.y - 2.04) < 0.01) & (c.z > 1.2))
    c.poser('cuir', m)


# ---------------------------------------------------------------------------------------------
# Éléphant de guerre
# ---------------------------------------------------------------------------------------------
def elephant(q=1.0, guerre=True):
    E = 1.0
    J = {'Pelvis': (0, 2.05, -0.75), 'Spine1': (0, 2.15, -0.25), 'Spine2': (0, 2.20, 0.25), 'Chest': (0, 2.15, 0.70),
         'Saddle': (0, 3.05, -0.05), 'Neck1': (0, 2.30, 0.95), 'Neck2': (0, 2.45, 1.08), 'Head': (0, 2.55, 1.20),
         'Head_End': (0, 2.30, 1.65), 'Trunk1': (0, 2.15, 1.62), 'Trunk2': (0, 1.65, 1.75), 'Trunk3': (0, 1.05, 1.78),
         'Trunk_End': (0, 0.55, 1.85), 'Tail1': (0, 2.05, -1.25), 'Tail2': (0, 1.75, -1.32), 'Tail3': (0, 1.45, -1.34),
         'Tail_End': (0, 1.20, -1.34), 'Ear_L': (0.42, 2.55, 1.05),
         'Thigh_L': (0.40, 1.80, -0.80), 'Shin_L': (0.40, 1.05, -0.78), 'BackCannon_L': (0.40, 0.50, -0.80),
         'BackHoof_L': (0.40, 0.15, -0.80), 'BackHoof_End_L': (0.40, 0.0, -0.72),
         'FrontUpper_L': (0.40, 1.85, 0.72), 'FrontLower_L': (0.40, 1.05, 0.74), 'FrontCannon_L': (0.40, 0.50, 0.75),
         'FrontHoof_L': (0.40, 0.15, 0.76), 'FrontHoof_End_L': (0.40, 0.0, 0.84)}
    a = Animal(J, q)
    pal = pal_base((0.48, 0.45, 0.43), (0.2, 0.2, 0.2), peau_grise=Mat('peau', (0.50, 0.47, 0.45), rug=0.85))
    corps = [(-1.30, 2.05, 0.0, 0.0, 0), (-1.27, 2.05, 0.25, 0.30, 0), (-1.15, 2.08, 0.50, 0.62, 0),
             (-0.85, 2.12, 0.62, 0.78, 0), (-0.40, 2.15, 0.66, 0.84, 0), (0.10, 2.18, 0.68, 0.86, 0),
             (0.55, 2.20, 0.62, 0.82, 0), (0.85, 2.25, 0.50, 0.70, 0), (1.00, 2.30, 0.30, 0.45, 0), (1.05, 2.32, 0.0, 0.0, 0)]
    a.corps('robe', corps, decor=[_rides], n=2.3, K=28)
    a.ajoute('tete', boite((0, 2.52, 1.22), (0.62, 0.78, 0.62), K=a.k(16), arrondi=0.9), 'robe', a.os_('Head'),
             decor=[yeux(0.27, 2.62, 1.36, 0.03), _rides])
    a.tube_os('trompe', 'robe', [(0, 2.35, 1.48), (0, 2.10, 1.66), (0, 1.65, 1.76), (0, 1.05, 1.79), (0, 0.65, 1.86),
                                 (0, 0.52, 1.93)],
              [0.20, 0.16, 0.12, 0.09, 0.075, 0.05], ['Head', 'Trunk1', 'Trunk2', 'Trunk3'], [0.0, 0.15, 0.15, 0.15],
              K=14, decor=[_anneaux_trompe])
    K = a.k(10)
    ext, inte = [], []
    for y in np.linspace(2.95, 2.05, 6):
        f = max(math.sin((2.95 - y) / 0.9 * math.pi), 0.0) ** 0.6
        zs = np.linspace(0.95, 0.95 - 0.55 * f - 0.05, K)
        e = np.stack([0.34 + 0.12 * (zs - 0.95) ** 2 + 0.0 * zs, np.full(K, y), zs], 1)
        ext.append(e); inte.append(e - [0.025, 0, 0])
    a.ajoute('oreille', bande(ext, inte, fermer=True), 'robe', a.os_('Ear_L'), miroir=True, decor=[_rides])
    a.tube_os('defense', 'ivoire', [(0.16, 2.20, 1.55), (0.18, 1.98, 1.78), (0.17, 1.85, 2.02), (0.15, 1.88, 2.18)],
              [0.05, 0.045, 0.03, 0.0], ['Head'], 0, K=8, miroir=True, poles=False)
    a.tube_os('queue', 'robe', [(0, 2.10, -1.27), (0, 1.80, -1.33), (0, 1.45, -1.35), (0, 1.25, -1.35)],
              [0.05, 0.04, 0.03, 0.0], ['Tail1', 'Tail2', 'Tail3'], [0.0, 0.08, 0.08], K=8, poles=False)
    for nom, z, os_n in (('patte_av', 0.75, AVANT), ('patte_ar', -0.79, ARRIERE)):
        pts = [(0.40, 1.95, z), (0.40, 1.50, z), (0.40, 1.05, z), (0.40, 0.55, z), (0.40, 0.18, z)]
        rs = [(0.26, 0.28), (0.24, 0.25), (0.21, 0.22), (0.20, 0.21), (0.22, 0.23)]
        a.patte(nom, 'robe', pts, rs, [n + '_L' for n in os_n], sabot=(0.18, 0.23, 0.24, 0.0), m_sabot='peau_grise',
                K=14, decor=[_rides])
    if guerre:
        caparacon_elephant(a)
        a.ajoute('nacelle', boite((0, 3.20, -0.05), (0.90, 0.42, 1.05), K=a.k(14), arrondi=0.25), 'bois',
                 a.os_('Spine2'), decor=[lambda c: c.poser('joueur_metal', (c.y > 3.30) & (c.y < 3.36)),
                                         lambda c: c.poser('or', (c.y > 3.38))])
        a.ajoute('frontal', boite((0, 2.62, 1.50), (0.40, 0.55, 0.06), K=a.k(10), arrondi=0.5, rot=rot_x(-0.35)),
                 'acier', a.os_('Head'), decor=[lambda c: c.poser('or', np.abs(c.x) < 0.02)])
    return a.pieces, pal, a.sq


def _rides(c):
    r = np.sin(c.y * 80 + np.sin(c.z * 13) * 2)
    c.col = c.col * (1 - 0.07 * (r > 0.7))[:, None]


def _anneaux_trompe(c):
    c.col = c.col * (1 - 0.12 * (np.sin(c.y * 70) > 0.5))[:, None]


def caparacon_elephant(a):
    K = a.k(20)
    ext, inte = [], []
    z0, z1 = -0.95, 0.70
    for z in np.linspace(z0, z1, 7):
        th = np.linspace(-0.05 * np.pi, 1.05 * np.pi, K)
        cy = 2.20
        x = 0.72 * np.cos(th)
        y = cy + 0.90 * np.sin(th)
        y = np.where(np.sin(th) < 0.1, cy - 0.55, y)
        x = np.where(np.sin(th) < 0.1, np.sign(x) * 0.74, x)
        e = np.stack([x, y, np.full(K, z)], 1)
        ext.append(e); inte.append(np.stack([x * 0.96, cy + (y - cy) * 0.97, np.full(K, z)], 1))

    def deco(c):
        c.poser('or', (c.y < 1.72) | (np.abs(c.z - z0) < 0.03) | (np.abs(c.z - z1) < 0.03))
    a.ajoute('caparacon', bande(ext, inte, fermer=True), 'joueur',
             lambda P: w_chaine(P, ['Pelvis', 'Spine1', 'Spine2', 'Chest'], [0.0, 0.2, 0.2, 0.2], a.sq), decor=[deco])


# ---------------------------------------------------------------------------------------------
# Loup (et chien de guerre)
# ---------------------------------------------------------------------------------------------
def loup(q=1.0, collier=True, pelage=(0.48, 0.45, 0.42)):
    J = {'Pelvis': (0, 0.66, -0.38), 'Spine1': (0, 0.70, -0.12), 'Spine2': (0, 0.72, 0.12), 'Chest': (0, 0.72, 0.32),
         'Saddle': (0, 0.90, 0.0), 'Neck1': (0, 0.78, 0.42), 'Neck2': (0, 0.88, 0.50), 'Head': (0, 0.96, 0.56),
         'Head_End': (0, 0.90, 0.80), 'Tail1': (0, 0.70, -0.50), 'Tail2': (0, 0.58, -0.62), 'Tail3': (0, 0.45, -0.70),
         'Tail_End': (0, 0.32, -0.74), 'Ear_L': (0.05, 1.05, 0.54),
         'Thigh_L': (0.09, 0.62, -0.40), 'Shin_L': (0.09, 0.42, -0.33), 'BackCannon_L': (0.085, 0.24, -0.46),
         'BackHoof_L': (0.085, 0.05, -0.43), 'BackHoof_End_L': (0.085, 0.0, -0.37),
         'FrontUpper_L': (0.09, 0.62, 0.30), 'FrontLower_L': (0.085, 0.42, 0.27), 'FrontCannon_L': (0.08, 0.20, 0.28),
         'FrontHoof_L': (0.08, 0.05, 0.29), 'FrontHoof_End_L': (0.08, 0.0, 0.35)}
    a = Animal(J, q)
    pal = pal_base(pelage, pelage, poil=Mat('fourrure', pelage))
    corps = [(-0.52, 0.68, 0.0, 0.0, 0), (-0.50, 0.68, 0.08, 0.09, 0), (-0.42, 0.67, 0.13, 0.15, 0),
             (-0.25, 0.68, 0.14, 0.15, 0), (-0.05, 0.69, 0.145, 0.16, 0), (0.15, 0.72, 0.165, 0.19, 0),
             (0.32, 0.74, 0.165, 0.20, 0), (0.42, 0.76, 0.12, 0.15, 0), (0.46, 0.77, 0.0, 0.0, 0)]
    a.corps('poil', corps, decor=[_ventre_clair])
    a.tube_os('cou', 'poil', [(0, 0.76, 0.36), (0, 0.85, 0.47), (0, 0.95, 0.54)], [(0.10, 0.13), (0.09, 0.11), (0.08, 0.09)],
              ['Chest', 'Neck1', 'Neck2', 'Head'], [0.0, 0.06, 0.05, 0.04], K=12, poles=False)
    a.tube_os('tete', 'poil', [(0, 0.98, 0.50), (0, 0.98, 0.58), (0, 0.94, 0.68), (0, 0.91, 0.76), (0, 0.90, 0.80)],
              [(0.075, 0.07), (0.075, 0.068), (0.04, 0.045), (0.028, 0.032), (0.012, 0.012)], ['Head'], 0, K=12,
              decor=[yeux(0.045, 1.00, 0.62, 0.011, (0.75, 0.55, 0.1)), _truffe])
    a.tube_os('oreille', 'poil', [(0.045, 1.02, 0.54), (0.055, 1.08, 0.53), (0.06, 1.11, 0.52)], [(0.025, 0.012), (0.015, 0.008), 0],
              ['Ear_L'], 0, K=6, miroir=True, poles=False)
    a.tube_os('queue', 'poil', [(0, 0.72, -0.48), (0, 0.62, -0.60), (0, 0.48, -0.68), (0, 0.36, -0.72), (0, 0.30, -0.73)],
              [0.04, 0.06, 0.07, 0.055, 0.0], ['Tail1', 'Tail2', 'Tail3'], [0.0, 0.05, 0.05], K=10, poles=False)
    a.patte('patte_av', 'poil', [(0.09, 0.62, 0.30), (0.085, 0.42, 0.27), (0.08, 0.28, 0.28), (0.08, 0.12, 0.29),
                                 (0.08, 0.05, 0.31)],
            [(0.05, 0.065), (0.035, 0.04), (0.025, 0.028), (0.022, 0.025), (0.025, 0.03)], [n + '_L' for n in AVANT],
            sabot=(0.04, 0.03, 0.045, 0.02), m_sabot='poil', epais=1.5)
    a.patte('patte_ar', 'poil', [(0.09, 0.64, -0.40), (0.09, 0.42, -0.33), (0.085, 0.24, -0.46), (0.085, 0.12, -0.44),
                                 (0.085, 0.05, -0.42)],
            [(0.07, 0.10), (0.045, 0.06), (0.025, 0.03), (0.022, 0.025), (0.025, 0.03)], [n + '_L' for n in ARRIERE],
            sabot=(0.04, 0.03, 0.045, 0.02), m_sabot='poil', epais=1.45)
    if collier:
        th = np.arange(a.k(14)) * 2 * np.pi / a.k(14)
        ann = []
        for y, o in ((0.89, -0.005), (0.89, 0.018), (0.84, 0.018), (0.84, -0.005)):
            ann.append(np.stack([(0.095 + o) * np.cos(th), y + 0.07 * np.sin(th) * 0, 0.48 + (0.10 + o) * np.sin(th)], 1))
        a.ajoute('collier', ann, 'joueur', a.os_('Neck2'), decor=[lambda c: c.poser('acier', np.sin(np.arctan2(c.z - 0.48, c.x) * 8) > 0.9)])
    return a.pieces, pal, a.sq


def _ventre_clair(c):
    c.col = mix(c.col, np.minimum(c.col * 1.45, 1), ss(0.62, 0.56, c.y))


def _truffe(c):
    t = (c.z > 0.78)
    c.col = np.where(t[:, None], np.array([0.06, 0.05, 0.05]), c.col)


# ---------------------------------------------------------------------------------------------
MONTURES = [
    # ère, identifiant, nom, culture, fonction(q), texture
    ('0-montures', 'cheval', 'Cheval de selle', 'Toutes époques', lambda q: cheval(q), 2048),
    ('0-montures', 'cheval-de-guerre', 'Cheval de guerre caparaçonné', 'Moyen Âge', lambda q: cheval(q, guerre=True, couleur=(0.20, 0.14, 0.10)), 2048),
    ('0-montures', 'cheval-blanc', 'Cheval blanc (héros)', 'Toutes époques', lambda q: cheval(q, couleur=(0.86, 0.84, 0.80), crins=(0.78, 0.76, 0.72)), 2048),
    ('0-montures', 'chameau', 'Chameau', 'Orient, déserts', chameau, 2048),
    ('0-montures', 'elephant-de-guerre', 'Éléphant de guerre', 'Inde, Carthage, Perse', elephant, 2048),
    ('0-montures', 'loup', 'Loup / chien de guerre', 'Toutes époques', loup, 1024),
]
