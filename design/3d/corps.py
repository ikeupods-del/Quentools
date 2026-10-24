"""Bibliothèque de pièces des personnages : corps réglable (même squelette pour tous), tête et visage,
cheveux, barbes, casques et chapeaux, armures, vêtements, chaussures, équipements.

Chaque fonction ajoute des pièces au Perso ; « m » désigne une matière (clé de palette) ou zones(...).
Les pièces du côté gauche (x > 0) sont recopiées en miroir pour le côté droit.
"""
from moteur import *  # noqa: F401,F403
from moteur import (Piece, loft, tube, superellipse, interp, ss, chemin, boite, bande, mix, bruit, zones,
                    w_os, w_chaine, chaine, w_main, w_jupe, w_torse, w_cape, J, IDX, NB, CASQUE_C, CASQUE_E,
                    rot_x, rot_y, rot_z)
import math
import numpy as np

BRAS = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand']
JAMBE = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase']
TETE_C = np.array([0.0, 1.62, 0.01])
ARM_Y, ARM_Z = 1.475, -0.01


class Morph:
    """Silhouette : multiplicateurs autour du gabarit héroïque (hoplite = 1)."""

    def __init__(self, carrure=1.0, taille=1.0, hanches=1.0, bras=1.0, jambes=1.0, poitrine=0.0, tete=1.0,
                 ventre=0.0, mains=1.0, pecs=1.0, cou=1.0):
        self.carrure, self.taille, self.hanches, self.bras, self.jambes = carrure, taille, hanches, bras, jambes
        self.poitrine, self.tete, self.ventre, self.mains, self.pecs, self.cou = poitrine, tete, ventre, mains, pecs, cou


HEROS = Morph()
FEMME = Morph(carrure=0.86, taille=0.84, hanches=1.10, bras=0.76, jambes=0.86, poitrine=1.0, mains=0.86, pecs=0.0,
              cou=0.88)
ROBUSTE = Morph(carrure=1.07, taille=1.12, hanches=1.06, bras=1.1, jambes=1.08, ventre=0.025, mains=1.06, cou=1.1)
SVELTE = Morph(carrure=0.93, taille=0.93, bras=0.88, jambes=0.93, mains=0.95, pecs=0.6)


def _anneau(K, y, a, zf, zb, cz=0.0, cx=0.0, n=2.2, dy=None, dr=None, debut=0.0):
    th = debut + np.arange(K) * 2 * np.pi / K
    c, s = np.cos(th), np.sin(th)
    x = a * np.sign(c) * np.abs(c) ** (2 / n)
    z = np.where(s > 0, zf, zb) * np.sign(s) * np.abs(s) ** (2 / n)
    if dr is not None:
        r = dr(th)
        x, z = x + r * c, z + r * s
    yy = y + (dy(th) if dy is not None else 0) * np.ones(K)
    return np.stack([x + cx, yy, z + cz], 1)


class Perso:
    def __init__(self, morph=HEROS, q=1.0):
        self.m = morph
        self.q = q
        self.pieces = []

    def k(self, n):
        return max(6, 2 * int(round(n * self.q / 2)))

    def ajoute(self, nom, anneaux, m, poids, miroir=False, lisse=True, partage=None, decor=(), xf=None):
        P, F, ST, taille = loft(anneaux)
        if xf is not None:
            P = xf[0] + (P - xf[0]) * xf[1]
            taille = (taille[0] * xf[1], taille[1] * xf[1])
        mats, zf = (m, None) if isinstance(m, str) else m
        p = Piece(nom, P, F, ST, taille, mats, poids, lisse, partage, zf, decor)
        p.xf = xf
        self.pieces.append(p)
        if miroir:
            q = Piece(nom + '_D', P * [-1, 1, 1], F[:, ::-1], ST, taille, mats, poids, lisse, p.partage, zf, decor)
            q.xf, q.miroir, q.peindre = xf, True, False
            self.pieces.append(q)
        return p

    def tete_xf(self, e=1.0, c=None):
        return (np.asarray(c if c is not None else TETE_C, float), self.m.tete * e)


# ---------------------------------------------------------------------------------------------
# Corps
# ---------------------------------------------------------------------------------------------
TORSE = [  # y, demi-largeur, avant, arrière (cuirasse du hoplite ; corps nu = ep -0.012)
    (1.030, 0.158, 0.118, 0.108), (1.10, 0.152, 0.117, 0.106), (1.20, 0.166, 0.127, 0.110),
    (1.29, 0.188, 0.140, 0.116), (1.37, 0.203, 0.146, 0.121), (1.43, 0.198, 0.137, 0.120),
    (1.49, 0.176, 0.118, 0.112), (1.525, 0.135, 0.096, 0.090), (1.546, 0.083, 0.072, 0.062)]


def niveau_torse(m, y, a, zf, zb, ep):
    g = 1 + 0.10 * ss(1.12, 1.36, y) * ss(1.545, 1.45, y)
    a = a * g * (1 + (m.carrure - 1) * ss(1.15, 1.42, y)) * (1 + (m.taille - 1) * ss(1.34, 1.12, y))
    zf = zf * (1 + 0.5 * (g - 1)) * (1 + 0.5 * (m.carrure - 1) * ss(1.2, 1.4, y)) + m.ventre * math.exp(-((y - 1.10) / 0.09) ** 2)
    zb = zb * (1 + 0.5 * (m.carrure - 1) * ss(1.2, 1.4, y))
    e = ep * ss(1.56, 1.50, y) + min(ep, 0.0) * ss(1.50, 1.56, y)
    return a + e, zf + e, zb + e


def profil_torse(m, y, ep=0.0):
    ys = [t[0] for t in TORSE]
    a = np.interp(y, ys, [t[1] for t in TORSE])
    zf = np.interp(y, ys, [t[2] for t in TORSE])
    zb = np.interp(y, ys, [t[3] for t in TORSE])
    return niveau_torse(m, y, a, zf, zb, ep)


BASSIN = [(1.04, 0.156, 0.116, 0.108), (0.97, 0.166, 0.121, 0.120), (0.91, 0.160, 0.114, 0.120),
          (0.865, 0.110, 0.084, 0.090), (0.846, 0.045, 0.032, 0.034)]


def profil_corps(m, y, ep=0.0):
    """Section du tronc à la hauteur y (bassin en bas, torse en haut)."""
    if y >= 1.03:
        return profil_torse(m, y, ep)
    ys = [t[0] for t in BASSIN][::-1]
    a = np.interp(y, ys, [t[1] for t in BASSIN][::-1]) * m.hanches
    zf = np.interp(y, ys, [t[2] for t in BASSIN][::-1]) * (0.5 + 0.5 * m.hanches)
    zb = np.interp(y, ys, [t[3] for t in BASSIN][::-1]) * m.hanches
    return a + ep, zf + ep, zb + ep


def _bosses(m, x, y, z, pecs, poitrine):
    av = z > 0
    b = (0.016 * pecs * np.exp(-((np.abs(x) - 0.088) / 0.05) ** 2) * math.exp(-((y - 1.37) / 0.05) ** 2)
         + 0.007 * pecs * np.exp(-(x / 0.06) ** 2) * math.exp(-((y - 1.18) / 0.07) ** 2)
         + 0.040 * poitrine * np.exp(-((np.abs(x) - 0.072) / 0.045) ** 2) * math.exp(-((y - 1.335) / 0.055) ** 2))
    return np.where(av, b, 0)


def torse(p, m, ep=-0.012, rebord=False, y_bas=1.0, decor=(), bosses=True, nom='torse', pecs=None, K=30):
    """Tronc du bas du ventre à l'encolure ; ep > 0 = vêtement épais ou armure ; rebord = bord roulé en bas."""
    M = p.m
    K = p.k(K)
    pc = M.pecs if pecs is None else pecs
    niv = []
    if rebord:
        a, zf, zb = profil_torse(M, y_bas + 0.03, ep)
        niv += [(y_bas + 0.01, a - 0.008, zf - 0.008, zb - 0.008), (y_bas, a + 0.010, zf + 0.010, zb + 0.010)]
    else:
        a, zf, zb = profil_corps(M, y_bas, ep)
        niv += [(y_bas, a, zf, zb)]
    for y, a, zf, zb in TORSE:
        if y <= y_bas + 0.02:
            continue
        niv.append((y,) + niveau_torse(M, y, a, zf, zb, ep))
    a, zf, zb = niv[-1][1:]
    niv += [(1.548, a * 0.85, zf * 0.86, zb * 0.87), (1.530, a * 0.72, zf * 0.75, zb * 0.77)]
    ann = []
    for y, a, zf, zb in niv:
        x, z = superellipse(K, a, zf, zb, n=2.3)
        if bosses:
            z = z + _bosses(M, x, y, z, pc * (1 if ep <= 0.004 else 0.6), M.poitrine)
        ann.append(np.stack([x, np.full(K, y), z + 0.004], 1))
    p.ajoute(nom, ann, m, w_torse, decor=decor)


def bassin(p, m, ep=0.0, decor=()):
    K = p.k(24)
    ann = []
    for y, a, zf, zb in BASSIN:
        a, zf, zb = profil_corps(p.m, y, ep)
        x, z = superellipse(K, a, zf, zb, n=2.3)
        ann.append(np.stack([x, np.full(K, y), z + 0.004], 1))
    ann.append(np.array([[0, 0.842, 0.004]] * K))
    p.ajoute('bassin', ann, m, lambda P: w_jupe(P, 0.9, 1.0, 0.86), decor=decor)


def cou(p, m, decor=()):
    e = p.m.cou
    ys = [1.47, 1.53, 1.58, 1.63]
    rs = [(0.055 * e, 0.058 * e), (0.054 * e, 0.056 * e), (0.056 * e, 0.058 * e), (0.058 * e, 0.06 * e)]
    p.ajoute('cou', tube([(0, y, -0.008) for y in ys], rs, p.k(12), axe='y'), m,
             chaine(['Spine2', 'Neck', 'Head'], [0.0, 0.03, 0.04]), decor=decor)


XS_BRAS = [0.13, 0.18, 0.21, 0.24, 0.27, 0.30, 0.34, 0.40, 0.43, 0.455, 0.48, 0.50, 0.53, 0.56, 0.60, 0.635, 0.67,
           0.70, 0.73, 0.736]
RS_BRAS = [(0.060, 0.060), (0.071, 0.069), (0.070, 0.067), (0.067, 0.063), (0.062, 0.060), (0.059, 0.057),
           (0.058, 0.056), (0.050, 0.050), (0.047, 0.047), (0.045, 0.046), (0.047, 0.049), (0.048, 0.050),
           (0.0475, 0.049), (0.046, 0.047), (0.042, 0.042), (0.038, 0.038), (0.033, 0.037), (0.029, 0.036),
           (0.027, 0.035), (0.019, 0.026)]


def r_bras(m, x):
    ry = np.interp(x, XS_BRAS, [r[0] for r in RS_BRAS]) * 1.3
    rz = np.interp(x, XS_BRAS, [r[1] for r in RS_BRAS]) * 1.3
    e = m.bras * (1 + (m.mains - 1) * ss(0.6, 0.72, x))
    return ry * e, rz * e


def bras(p, m, decor=()):
    rs = [r_bras(p.m, x) for x in XS_BRAS]
    p.ajoute('bras', tube([(x, ARM_Y, ARM_Z) for x in XS_BRAS], rs, p.k(14), axe='x'), m,
             chaine(BRAS, [0.0, 0.05, 0.05, 0.03]), miroir=True, decor=decor)


def manchon_bras(p, nom, m, x0, x1, ext, evase=0.0, n=5, bout=True, decor=(), K=14, ext_fn=None):
    """Manche, brassard, gant à revers : tube autour du bras de x0 à x1."""
    xs = list(np.linspace(x0, x1, n))
    rs = []
    for i, x in enumerate(xs):
        ry, rz = r_bras(p.m, x)
        e = ext + evase * (i / (n - 1)) ** 2 + (ext_fn(x) if ext_fn else 0)
        rs.append((ry + e, rz + e))
    cs = [(x, ARM_Y + 0.002, ARM_Z) for x in xs]
    if bout:
        ry, rz = r_bras(p.m, x1 + 0.006)
        cs.append((x1 + 0.006, ARM_Y + 0.002, ARM_Z))
        rs.append((ry * 0.94, rz * 0.94))
    if x0 > 0.16:
        ry, rz = r_bras(p.m, x0 - 0.006)
        cs.insert(0, (x0 - 0.006, ARM_Y + 0.002, ARM_Z))
        rs.insert(0, (ry * 0.94, rz * 0.94))
    p.ajoute(nom, tube(cs, rs, p.k(K), axe='x'), m, chaine(BRAS, [0.0, 0.06, 0.05, 0.03]), miroir=True, decor=decor)


def mains(p, m, decor=(), moufle=False):
    e = p.m.mains
    xs = [0.712, 0.76, 0.812, 0.852, 0.884, 0.903, 0.912]
    rs = [(0.026, 0.035), (0.025, 0.045), (0.020, 0.047), (0.017, 0.044), (0.015, 0.040), (0.011, 0.032), (0, 0)]
    rs = [(a * 1.22 * e, b * 1.18 * e) for a, b in rs]
    ys = [1.474, 1.472, 1.470, 1.467, 1.464, 1.462, 1.461]
    dec = list(decor) + ([] if moufle else [_doigts])
    p.ajoute('main', tube([(x, y, 0.0) for x, y in zip(xs, ys)], rs, p.k(12), axe='x'), m, w_main, miroir=True,
             decor=dec)
    pc = [J['LeftHandThumb1'] + [-0.012, 0.002, -0.012], J['LeftHandThumb1'], J['LeftHandThumb2'],
          J['LeftHandThumb3'], J['LeftHandThumb4'], J['LeftHandThumb4'] + [0.004, -0.001, 0.008]]
    rp = [0.021, 0.021, 0.019, 0.016, 0.012, 0.0]
    ann = []
    th = np.arange(8) * 2 * np.pi / 8
    for i, (c, r) in enumerate(zip(pc, rp)):
        d = pc[min(i + 1, len(pc) - 1)] - pc[max(i - 1, 0)]
        d = d / np.linalg.norm(d)
        u = np.cross(d, [0, 1, 0]); u /= np.linalg.norm(u)
        v = np.cross(u, d)
        ann.append(c + np.outer(r * e * np.cos(th), u) + np.outer(r * e * 0.85 * np.sin(th), v))
    p.ajoute('pouce', ann, m, chaine(['LeftHand', 'LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3'],
                                      [0.0, 0.012, 0.010, 0.008]), miroir=True, decor=decor)


def _doigts(c):
    for zz in (0.0205, 0.0, -0.021):
        t = np.exp(-((c.z - zz) / 0.0022) ** 2) * ss(0.818, 0.835, c.ax)
        c.col = c.col * (1 - 0.38 * t)[:, None]


def sur_jambe(y):
    haut, genou, cheville = np.array([0.10, 0.95, 0.0]), np.array([0.12, 0.53, 0.012]), np.array([0.135, 0.10, -0.01])
    if y >= genou[1]:
        return haut + (genou - haut) * (haut[1] - y) / (haut[1] - genou[1])
    return genou + (cheville - genou) * (genou[1] - y) / (genou[1] - cheville[1])


YS_JAMBE = [0.93, 0.86, 0.80, 0.74, 0.68, 0.62, 0.575, 0.535, 0.49, 0.43, 0.36, 0.28, 0.20, 0.145, 0.11, 0.085]
RS_JAMBE = [(0.112, 0.118), (0.108, 0.112), (0.103, 0.107), (0.096, 0.099), (0.088, 0.092), (0.080, 0.084),
            (0.074, 0.078), (0.070, 0.075), (0.067, 0.072), (0.071, 0.079), (0.066, 0.072), (0.056, 0.059),
            (0.047, 0.050), (0.042, 0.046), (0.040, 0.044), (0.040, 0.044)]
DZ_JAMBE = [0, 0, 0, 0, 0, 0, 0.003, 0.006, 0.002, -0.008, -0.006, -0.002, 0, 0, 0, 0]


def r_jambe(m, y):
    ys = YS_JAMBE[::-1]
    rx = np.interp(y, ys, [r[0] for r in RS_JAMBE][::-1])
    rz = np.interp(y, ys, [r[1] for r in RS_JAMBE][::-1])
    dz = np.interp(y, ys, DZ_JAMBE[::-1])
    e = m.jambes * (1 + (m.hanches - 1) * ss(0.7, 0.9, y))
    return rx * e, rz * e, dz


def jambes(p, m, decor=()):
    cs, rs = [], []
    for y in YS_JAMBE:
        rx, rz, dz = r_jambe(p.m, y)
        cs.append(sur_jambe(y) + [0, 0, dz])
        rs.append((rx, rz))
    p.ajoute('jambe', tube(cs, rs, p.k(14), axe='y'), m, chaine(JAMBE, [0.0, 0.06, 0.04, 0.03]), miroir=True,
             decor=decor)


def manchon_jambe(p, nom, m, y0, y1, ext, n=6, ext_fn=None, bout=True, decor=(), K=14, lisse=True):
    """Jambière, botte, guêtre, bas de pantalon : tube autour de la jambe de y0 (haut) à y1 (bas)."""
    ys = list(np.linspace(y0, y1, n))
    cs, rs = [], []
    for y in ys:
        rx, rz, dz = r_jambe(p.m, y)
        e = ext + (ext_fn(y) if ext_fn else 0)
        cs.append(sur_jambe(y) + [0, 0, dz])
        rs.append((rx + e, rz + e))
    if y0 < 0.88:
        rx, rz, dz = r_jambe(p.m, y0 + 0.006)
        cs.insert(0, sur_jambe(y0 + 0.006) + [0, 0, dz])
        rs.insert(0, (rx * 0.95, rz * 0.95))
    if bout:
        rx, rz, dz = r_jambe(p.m, y1 - 0.006)
        cs.append(sur_jambe(y1 - 0.006) + [0, 0, dz])
        rs.append((rx * 0.93, rz * 0.93))
    p.ajoute(nom, tube(cs, rs, p.k(K), axe='y'), m, chaine(JAMBE, [0.0, 0.06, 0.04, 0.03]), miroir=True,
             decor=decor, lisse=lisse)


def pieds(p, m, semelle='cuir', ext=0.0, haut=0.0, decor=(), bout_rond=1.0):
    """Pied (peau, chaussure, botte) et semelle ; ext grossit le pied (chaussures)."""
    zs = [-0.078, -0.068, -0.035, 0.02, 0.08, 0.14, 0.185, 0.20]
    rs = [(0, 0), (0.031, 0.027), (0.044, 0.041), (0.050, 0.041), (0.053, 0.030), (0.055, 0.021), (0.046, 0.016), (0, 0)]
    cy = [0.045, 0.048, 0.060, 0.058, 0.045, 0.035, 0.031, 0.030]
    cx = [0.135, 0.135, 0.136, 0.138, 0.141, 0.144, 0.146, 0.147]
    rs = [(a + ext * (a > 0), b + (ext + haut * (1 - i / 7)) * (b > 0)) for i, (a, b) in enumerate(rs)]
    cy = [y + haut * 0.5 * (1 - i / 7) for i, y in enumerate(cy)]
    zs = [z - ext * (z < 0) + ext * bout_rond * (z > 0.15) for z in zs]
    p.ajoute('pied', tube([(x, y, z) for x, y, z in zip(cx, cy, zs)], rs, p.k(12), axe='z'), m,
             chaine(['LeftFoot', 'LeftToeBase'], [0.0, 0.03]), miroir=True, decor=decor)
    if semelle:
        zs = [-0.084, -0.08, -0.04, 0.05, 0.14, 0.198, 0.212, 0.216]
        rs = [(0.0, 0.0), (0.033, 0.009), (0.048, 0.010), (0.055, 0.010), (0.059, 0.010), (0.053, 0.010), (0.033, 0.009), (0, 0)]
        rs = [(a + ext * (a > 0), b) for a, b in rs]
        zs = [z - ext * (z < 0) + ext * bout_rond * (z > 0.15) for z in zs]
        cx = [0.135, 0.135, 0.136, 0.139, 0.144, 0.147, 0.148, 0.148]
        p.ajoute('semelle', tube([(x, 0.010, z) for x, z in zip(cx, zs)], rs, p.k(10), axe='z'), semelle,
                 chaine(['LeftFoot', 'LeftToeBase'], [0.0, 0.03]), miroir=True)


def sandales(c, cle='cuir'):
    """Sangles des sandales sur le pied et lacets croisés jusqu'au mollet (décor du pied / de la jambe)."""
    x, y, z = c.ax, c.y, c.z
    cxp = 0.135 + 0.012 * np.clip(z / 0.2, 0, 1)
    if c.piece.nom.startswith('pied'):
        s = np.zeros(len(x), bool)
        for z0 in (0.125, 0.06, 0.0):
            s |= (np.abs(z - z0) < 0.009) & (y > 0.022)
        s |= (np.abs(x - cxp) < 0.008) & (z > -0.01) & (z < 0.15) & (y > 0.04)
        s |= (y < 0.022) | ((z < -0.04) & (y > 0.05))
    else:
        ang = np.arctan2(z + 0.012, x - 0.135)
        s = np.zeros(len(x), bool)
        for sens in (1, -1):
            v = (y * 26 + sens * ang / np.pi * 2.0) % 1.0
            s |= (np.abs(v - 0.5) < 0.12) & (y < 0.20)
        s &= y < 0.20
    c.poser(cle, s)


# ---------------------------------------------------------------------------------------------
# Tête, visage, cheveux, barbe
# ---------------------------------------------------------------------------------------------
TETE = [  # y, demi-largeur, avant, arrière
    (1.585, 0.045, 0.065, 0.040), (1.605, 0.062, 0.088, 0.055), (1.640, 0.072, 0.094, 0.080),
    (1.680, 0.080, 0.097, 0.095), (1.715, 0.084, 0.096, 0.100), (1.755, 0.085, 0.088, 0.100),
    (1.795, 0.078, 0.074, 0.090), (1.830, 0.058, 0.052, 0.066), (1.852, 0.030, 0.028, 0.035)]
TETE_CZ = 0.012


def profil_tete(y):
    ys = [t[0] for t in TETE]
    return (np.interp(y, ys, [t[1] for t in TETE]), np.interp(y, ys, [t[2] for t in TETE]),
            np.interp(y, ys, [t[3] for t in TETE]))


def point_tete(th, y, off=0.0, n=2.2):
    """Point de la surface de la tête (repère d'origine) à l'angle th et la hauteur y, décalé de off."""
    a, zf, zb = profil_tete(y)
    c, s = np.cos(th), np.sin(th)
    x = (a + off) * np.sign(c) * np.abs(c) ** (2 / n)
    z = (np.where(s > 0, zf, zb) + off) * np.sign(s) * np.abs(s) ** (2 / n)
    return np.stack([x, np.asarray(y) * np.ones_like(th), z + TETE_CZ], -1)


def tete(p, m, decor=(), nez=1.0, oreilles=True):
    K = p.k(22)
    ann = []
    for y, a, zf, zb in TETE:
        x, z = superellipse(K, a, zf, zb, n=2.2)
        th = np.arange(K) * 2 * np.pi / K
        z = z + nez * 0.022 * np.exp(-(x / 0.017) ** 2) * math.exp(-((y - 1.685) / 0.02) ** 2) * (z > 0)
        z = z + 0.006 * np.exp(-(x / 0.05) ** 2) * math.exp(-((y - 1.735) / 0.012) ** 2) * (z > 0)
        if oreilles:
            x = x + 0.014 * np.sign(x) * np.exp(-(np.minimum(np.abs(th), np.abs(th - np.pi)) / 0.22) ** 2) \
                * math.exp(-((y - 1.70) / 0.03) ** 2)
        ann.append(np.stack([x, np.full(K, y), z + TETE_CZ], 1))
    ann.append(np.array([[0, 1.858, TETE_CZ - 0.003]] * K))
    p.ajoute('tete', ann, m, w_os('Head'), decor=decor, xf=p.tete_xf())


def visage(yeux=(0.28, 0.18, 0.11), sourcils=(0.16, 0.10, 0.06), femme=False, bouche=True, cle_yeux=None):
    """Décor peint du visage : yeux, sourcils, ombre du nez, bouche (repère d'origine de la tête)."""
    yeux = np.array(yeux)
    sourcils = np.array(sourcils)

    def f(c):
        x, y, z = c.ax, c.y, c.z
        av = (z > 0.02)
        e = np.hypot((x - 0.034) / 0.0165, (y - 1.712) / (0.0085 if not femme else 0.0095))
        blanc = av & (e < 1)
        c.col = np.where(blanc[:, None], mix(c.col, [0.93, 0.90, 0.86], 0.85), c.col)
        iris = av & (np.hypot(x - 0.032, y - 1.711) < 0.0062)
        c.col = np.where(iris[:, None], yeux * 0.9, c.col)
        pup = av & (np.hypot(x - 0.032, y - 1.711) < 0.0028)
        c.col = np.where(pup[:, None], np.array([0.04, 0.03, 0.03]), c.col)
        cont = av & (np.abs(e - 1) < 0.22) & (y > 1.709 - (0.004 if femme else 0))
        c.col = np.where(cont[:, None], c.col * (0.35 if femme else 0.55), c.col)
        epai = 0.0028 if femme else 0.0042
        sy = 1.731 + 0.004 * (1 - ((x - 0.036) / 0.024) ** 2) - (0.0 if femme else 0.002)
        src = av & (np.abs(y - sy) < epai) & (x > 0.012) & (x < 0.058)
        c.col = np.where(src[:, None], mix(c.col, sourcils, 0.9), c.col)
        nez = av & (x < 0.02)
        c.col = c.col * (1 - 0.18 * nez * np.exp(-((y - 1.668) / 0.006) ** 2) * np.exp(-(x / 0.012) ** 2))[:, None]
        if bouche:
            lb = av & (x < 0.026) & (np.abs(y - (1.640 + 2.5 * x ** 2)) < 0.0028)
            c.col = np.where(lb[:, None], c.col * 0.5, c.col)
            if femme:
                lv = av & (x < 0.024) & (np.abs(y - 1.640) < 0.006)
                c.col = np.where(lv[:, None], mix(c.col, [0.62, 0.24, 0.24], 0.55), c.col)
        joue = av & (z > 0.04)
        c.col = mix(c.col, c.col * np.array([1.05, 0.93, 0.9]), 0.4 * np.exp(-((x - 0.05) / 0.02) ** 2)
                    * np.exp(-((y - 1.675) / 0.02) ** 2) * joue)
    return f


def _ligne_cheveux(style):
    def dy(th):
        s, c = np.sin(th), np.cos(th)
        av = np.clip(s, 0, 1)
        ar = np.clip(-s, 0, 1)
        if style == 'haut':
            return 1.745 + 0.04 * av ** 2 - 0.06 * ar
        return 1.69 + 0.083 * av ** 1.6 - 0.07 * ar ** 1.2
    return dy


def calotte(p, nom, m, ligne, off=0.008, y_haut=1.865, R=8, K=22, decor=(), xf=None, epais=0.006):
    """Coque épousant le crâne au-dessus d'une ligne (cheveux, bonnet, casque près de la tête)."""
    K = p.k(K)
    th = np.arange(K) * 2 * np.pi / K
    y0 = ligne(th)
    ann = []
    yh = TETE[-1][0]
    for i, t in enumerate(np.linspace(0, 1, R)):
        yy = y0 + (yh - y0) * t ** 0.9
        o = off * (1 - 0.3 * t)
        ann.append(point_tete(th, yy, o))
    ann.insert(0, point_tete(th, y0 + 0.004, off - epais))
    ann.append(np.array([[0, y_haut + off, TETE_CZ - 0.003]] * K))
    p.ajoute(nom, ann, m, w_os('Head'), decor=decor, xf=xf or p.tete_xf())


def cheveux(p, m, style='court', decor=()):
    """Coupes : court, haut (front dégagé), long (jusqu'aux épaules), queue, chignon, tresses."""
    calotte(p, 'cheveux', m, _ligne_cheveux('haut' if style == 'haut' else 'court'), off=0.010, decor=decor)
    xf = p.tete_xf()
    if style == 'long':
        K = p.k(10)
        ext, inte = [], []
        for y, lg in ((1.78, 0.080), (1.71, 0.092), (1.64, 0.098), (1.57, 0.104), (1.50, 0.11), (1.45, 0.11)):
            th = np.linspace(np.pi * 1.07, np.pi * 1.93, K)
            yy = max(y, 1.60)
            pe = point_tete(th, yy, 0.022)
            pi = point_tete(th, yy, 0.004)
            dz = -0.03 * ss(1.62, 1.48, y)
            pe[:, 1] = pi[:, 1] = y
            pe[:, 2] += dz - 0.012 * ss(1.6, 1.45, y)
            pi[:, 2] += dz
            pe[:, 0] *= lg / 0.08
            pi[:, 0] *= lg / 0.08
            ext.append(pe); inte.append(pi)
        p.ajoute('cheveux_long', bande(ext, inte), m,
                 lambda P: _w_tete_dos(P), decor=decor, xf=xf)
    elif style in ('queue', 'tresses'):
        pts = [(0, 1.76, -0.10), (0, 1.73, -0.125), (0, 1.66, -0.15), (0, 1.58, -0.165), (0, 1.50, -0.17), (0, 1.46, -0.168)]
        rs = [0.03, 0.032, 0.03, 0.026, 0.018, 0.0]
        if style == 'tresses':
            for s in (1, -1):
                pts2 = [(s * 0.085, 1.70, -0.035), (s * 0.10, 1.63, -0.03), (s * 0.115, 1.56, 0.0), (s * 0.12, 1.50, 0.04),
                        (s * 0.12, 1.45, 0.06)]
                p.ajoute('tresse%d' % (s > 0), chemin(pts2, [0.018, 0.02, 0.018, 0.015, 0.01], p.k(8)), m,
                         lambda P: _w_tete_dos(P), decor=decor, xf=xf)
        else:
            p.ajoute('queue', chemin(pts, rs, p.k(10)), m, lambda P: _w_tete_dos(P), decor=decor, xf=xf)
    elif style == 'chignon':
        p.ajoute('chignon', boite((0, 1.775, -0.10), (0.075, 0.07, 0.07), K=p.k(10), arrondi=0.95), m, w_os('Head'),
                 decor=decor, xf=xf)


def _w_tete_dos(P):
    a = ss(1.66, 1.52, P[:, 1])
    W = np.zeros((len(P), NB))
    W[:, IDX['Head']] = 1 - a
    W[:, IDX['Spine2']] = a * 0.6
    W[:, IDX['Neck']] = a * 0.4
    return W


def barbe(p, m, style='courte', decor=()):
    """Barbe sur la mâchoire : courte, longue, pointue ; moustache seule possible (style='moustache')."""
    xf = p.tete_xf()
    if style != 'moustache':
        K = p.k(16)
        long_ = {'courte': 0.03, 'longue': 0.11, 'pointue': 0.075, 'fournie': 0.065}[style]
        th = np.linspace(np.pi * 0.03, np.pi * 0.97, K)
        av = np.sin(th) ** 4
        ytop = 1.705 - (1.705 - 1.628) * av
        ybot = 1.598 - (long_ + 0.008) * av ** 0.7
        ext, inte = [], []
        for f in np.linspace(0, 1, 7):
            y = ytop + (ybot - ytop) * f
            dessous = np.clip((1.592 - y) / max(long_, 1e-3), 0, 1)
            o = 0.003 + (0.016 if style == 'fournie' else 0.011) * np.sin(f * np.pi * 0.8) + 0.002 * f
            pe = point_tete(th, np.maximum(y, 1.592), o)
            pi = point_tete(th, np.maximum(y, 1.592), -0.004)
            for q in (pe, pi):
                q[:, 1] = y
                q[:, 0] *= 1 - (0.45 if style == 'pointue' else 0.25) * dessous
                q[:, 2] += 0.014 * dessous
            pi[:, 2] -= 0.008 * dessous
            ext.append(pe); inte.append(pi)
        p.ajoute('barbe', bande(ext, inte, fermer=True), m, w_os('Head'), decor=list(decor), xf=xf)
    moustache(p, m, tombante=(style == 'moustache'), decor=decor)


def _bouche_barbe(c):
    t = (c.z > 0.07) & (c.ax < 0.022) & (np.abs(c.y - 1.637) < 0.004)
    c.col = np.where(t[:, None], c.col * 0.3, c.col)


def moustache(p, m, tombante=False, decor=()):
    pts = [(-0.04, 1.648, 0.085), (-0.02, 1.656, 0.103), (0, 1.659, 0.109), (0.02, 1.656, 0.103), (0.04, 1.648, 0.085)]
    rs = [0.006, 0.011, 0.011, 0.011, 0.006]
    if tombante:
        pts = [(-0.045, 1.595, 0.08), (-0.045, 1.625, 0.088)] + pts[1:4] + [(0.045, 1.625, 0.088), (0.045, 1.595, 0.08)]
        rs = [0.004, 0.009, 0.012, 0.013, 0.012, 0.009, 0.004]
    p.ajoute('moustache', chemin(pts, rs, p.k(8), haut=(0, 0, 1), aplat=0.7), m, w_os('Head'), decor=decor,
             xf=p.tete_xf())


# ---------------------------------------------------------------------------------------------
# Casques et coiffes
# ---------------------------------------------------------------------------------------------
def coque(p, nom, niveaux, m, K=24, n=2.15, cz=0.012, dy=None, poids=None, decor=(), xf=None, nbas=2, dr=None):
    """Coque horizontale niveau par niveau ; dy(th, i) déplace les nbas premiers anneaux (joues, nuque)."""
    K = p.k(K)
    ann = []
    for i, niv in enumerate(niveaux):
        y, a, zf, zb = niv[:4]
        if a <= 0:
            ann.append(np.array([[0, y, cz]] * K))
            continue
        d = (lambda th, i=i: dy(th, i)) if (dy is not None and i < nbas) else None
        r = (lambda th, i=i: dr(th, i)) if dr is not None else None
        ann.append(_anneau(K, y, a, zf, zb, cz=cz, n=n, dy=d, dr=r))
    p.ajoute(nom, ann, m, poids or w_os('Head'), decor=decor, xf=xf or p.tete_xf())


def casque_corinthien(p, m, interieur='sombre', barbe_cle='barbe'):
    niv = [(1.588, 0.090, 0.104, 0.112), (1.566, 0.112, 0.124, 0.137), (1.600, 0.115, 0.131, 0.128),
           (1.650, 0.112, 0.136, 0.121), (1.700, 0.114, 0.137, 0.121), (1.750, 0.115, 0.131, 0.123),
           (1.792, 0.106, 0.117, 0.118), (1.832, 0.085, 0.092, 0.095), (1.862, 0.050, 0.053, 0.056),
           (1.874, 0.0, 0.0, 0.0)]

    def dy(th, i):
        s = np.sin(th)
        return -0.03 * np.clip(s, 0, 1) ** 2 - 0.004 * np.clip(-s, 0, 1)

    coque(p, 'casque', niv, m, K=26, dy=dy, xf=(CASQUE_C, CASQUE_E * p.m.tete),
          decor=[_face_corinthienne(interieur, barbe_cle)])
    p.ajoute('barbe_casque', tube([(0, 1.615, 0.055), (0, 1.58, 0.078), (0, 1.55, 0.09), (0, 1.53, 0.097), (0, 1.522, 0.10)],
                                  [(0.050, 0.035), (0.046, 0.030), (0.034, 0.022), (0.018, 0.013), (0.0, 0.0)],
                                  p.k(12), axe='y'), barbe_cle, w_os('Head'))


def _face_corinthienne(interieur, barbe_cle):
    def f(c):
        x, y, z = (CASQUE_C + (c.P - CASQUE_C) / (c.piece.xf[1])).T
        ax = np.abs(x)
        av = (z > 0.02) & (ax < 0.09)

        def ouv(x_, y_):
            a_ = np.abs(x_)
            yeux = (a_ > 0.012) & (a_ < 0.076) & (np.abs(y_ - 1.705) < 0.018 * np.clip(1 - ((a_ - 0.044) / 0.033) ** 2, 0, 1))
            fente = (y_ < 1.682) & (a_ < 0.017 + 0.014 * ss(1.66, 1.57, y_))
            pont = (y_ > 1.668) & (y_ < 1.70) & (a_ < 0.05) & ~((a_ < 0.012) & (y_ > 1.678))
            return yeux | fente | pont

        o = ouv(x, y) & av
        d = 0.006
        bord = av & ~o & (ouv(x + d, y) | ouv(x - d, y) | ouv(x, y + d) | ouv(x, y - d))
        inter = np.tile([0.07, 0.045, 0.035], (len(x), 1))
        oeil = np.hypot(ax - 0.043, y - 1.704)
        inter = mix(inter, [0.34, 0.27, 0.22], ss(0.0095, 0.006, oeil))
        inter = mix(inter, [0.09, 0.06, 0.045], ss(0.0055, 0.0035, oeil))
        inter = mix(inter, [0.75, 0.68, 0.58], ss(0.0018, 0.0008, np.hypot(ax - 0.0415, y - 1.7055)))
        inter = mix(inter, [0.48, 0.31, 0.22], ((y > 1.632) & (y < 1.665)) * 0.8)
        bc = c.pal[barbe_cle].couleur
        poil = 0.85 + 0.3 * bruit(c.P * [9, 1, 9], 60, 8)
        inter = np.where((y < 1.636)[:, None], bc * 0.8 * poil[:, None], inter)
        c.col = np.where(o[:, None], inter, c.col)
        c.rug = np.where(o, 0.85, c.rug)
        c.met = np.where(o, 0.0, c.met)
        c.msk = np.where(o, 0.0, c.msk)
        c.col = np.where(bord[:, None], c.col * 1.22 + 0.05, c.col)
        fy = 1.737 + 2.5 * (np.clip(ax, 0, 0.09) - 0.045) ** 2
        c.relief(np.where(ax < 0.085, y - fy, 1), 0.004, (z > 0.03) * 1.0)
        bas = c.ST[:, 1] < 0.09
        c.col = np.where(bas[:, None], c.col * 1.15, c.col)
        c.relief(np.where(c.ST[:, 1] < 0.2, (c.ST[:, 1] - 0.115) * 0.4, 1), 0.004, 1.0)
    return f


def cimier_crin(p, m, transversal=False, hauteur=1.0):
    """Cimier en crin d'avant en arrière (ou transversal, centurion), avec queue tombante."""
    c0 = np.array([0, 1.72, -0.005])
    cles_phi = [62, 45, 20, -10, -45, -80, -110, -135, -150, -160]
    cles_rb = [0.150, 0.160, 0.158, 0.157, 0.152, 0.145, 0.145, 0.150, 0.170, 0.205]
    cles_h = [0.012, 0.045, 0.068, 0.072, 0.064, 0.048, 0.032, 0.022, 0.016, 0.0]
    cles_w = [0.012, 0.036, 0.044, 0.046, 0.044, 0.040, 0.036, 0.030, 0.020, 0.0]
    if transversal:
        cles_phi = [80, 60, 30, 0, -30, -60, -80]
        cles_rb = [0.150] * 7
        cles_h = [0.01, 0.05, 0.07, 0.075, 0.07, 0.05, 0.01]
        cles_w = [0.01, 0.025, 0.03, 0.03, 0.03, 0.025, 0.01]
    fphi, frb, fh, fw = interp(cles_phi), interp(cles_rb), interp(cles_h), interp(cles_w)
    Kc, Rc = p.k(12), 28 if not transversal else 18
    th = np.arange(Kc) * 2 * np.pi / Kc
    ann = []
    ts = np.linspace(0, 1, Rc)
    for t in ts:
        ph = math.radians(float(fphi(t)))
        if transversal:
            nrm = np.array([math.sin(ph), math.cos(ph), 0])
            lat = np.array([0, 0, 1.0])
        else:
            nrm = np.array([0, math.cos(ph), math.sin(ph)])
            lat = np.array([1.0, 0, 0])
        h, w = max(float(fh(t)), 0) * hauteur, max(float(fw(t)), 0)
        cc = c0 + (float(frb(t)) + 0.75 * h) * nrm
        if t == ts[-1]:
            h = w = 0
        ann.append(cc + np.outer(w * np.cos(th), lat) + np.outer(h * np.sin(th), nrm))
    ann.insert(0, ann[0].mean(0)[None].repeat(Kc, 0))
    p.ajoute('cimier', ann, m, w_os('Head'), decor=[_meches], xf=(CASQUE_C, CASQUE_E * p.m.tete))


def _meches(c):
    mech = 0.5 + 0.5 * np.sin(c.ST[:, 0] * 2 * np.pi * 13 + bruit(c.P, 70, 9) * 5)
    c.col = c.col * (0.72 + 0.38 * mech)[:, None]
    c.col = c.col * (1 - 0.5 * ss(0.06, 0.0, c.ST[:, 1]))[:, None]


def casque_galea(p, m, crete=None, joues=True):
    """Casque romain : calotte, couvre-nuque évasé, protège-joues, petit bouton de cimier."""
    niv = [(1.712, 0.098, 0.106, 0.118), (1.705, 0.104, 0.112, 0.128), (1.745, 0.102, 0.110, 0.122),
           (1.79, 0.096, 0.100, 0.112), (1.83, 0.076, 0.078, 0.088), (1.86, 0.045, 0.046, 0.052), (1.874, 0, 0, 0)]

    def dy(th, i):
        s = np.sin(th)
        return 0.045 * np.clip(s, 0, 1) ** 2 - 0.06 * np.clip(-s, 0, 1) ** 1.5 - 0.012 * (1 - np.abs(s))

    def dr(th, i):
        return (0.035 * np.clip(-np.sin(th), 0, 1) ** 2) if i == 1 else 0 * th

    coque(p, 'casque', niv, m, K=24, dy=dy, dr=dr, decor=[_rebord_bas(0.10)])
    if joues:
        K = p.k(8)
        ext, inte = [], []
        for y in (1.745, 1.71, 1.67, 1.635, 1.62):
            th = np.linspace(np.pi * 0.10, np.pi * 0.36, K)
            ext.append(point_tete(th, y, 0.016))
            inte.append(point_tete(th, y, 0.006))
        p.ajoute('protege_joue', bande(ext, inte), m, w_os('Head'), miroir=True, xf=p.tete_xf())
    p.ajoute('bouton', boite((0, 1.885, 0.012), (0.03, 0.03, 0.03), K=p.k(8), arrondi=0.9), m, w_os('Head'),
             xf=p.tete_xf())
    if crete:
        cimier_crin(p, crete, transversal=True)


def _rebord_bas(t0=0.12):
    def f(c):
        b = ss(t0, t0 * 0.3, c.ST[:, 1])
        c.col = mix(c.col, np.minimum(c.col * 1.3 + 0.05, 1), b * 0.6)
        c.relief((c.ST[:, 1] - t0 * 1.2) * 0.4, 0.004, 1.0)
    return f


def casque_conique(p, m, nasal=True, bandes='or'):
    """Casque nordique à nasal (spangenhelm) : pointe conique, bandes rivetées."""
    niv = [(1.738, 0.094, 0.104, 0.110), (1.730, 0.100, 0.110, 0.116), (1.775, 0.096, 0.104, 0.110),
           (1.82, 0.080, 0.086, 0.090), (1.865, 0.052, 0.056, 0.058), (1.905, 0.020, 0.022, 0.022), (1.925, 0, 0, 0)]

    def dy(th, i):
        return -0.02 * np.clip(-np.sin(th), 0, 1)

    def deco(c):
        if bandes:
            th = np.arctan2(c.z - 0.012, c.x)
            b = np.zeros(len(c.x), bool)
            for a0 in (np.pi / 2, -np.pi / 2, 0, np.pi):
                d = np.abs(np.angle(np.exp(1j * (th - a0))))
                b |= d * np.hypot(c.x, c.z - 0.012) < 0.012
            b |= c.ST[:, 1] < 0.16
            c.poser(bandes, b)
            riv = b & (np.sin(c.y * 260) > 0.85)
            c.col = np.where(riv[:, None], c.col * 1.3, c.col)
    coque(p, 'casque', niv, m, K=24, dy=dy, decor=[deco])
    if nasal:
        p.ajoute('nasal', boite((0, 1.705, 0.127), (0.020, 0.075, 0.010), K=p.k(8), arrondi=0.4, rot=rot_x(-0.22)),
                 bandes or m, w_os('Head'), xf=p.tete_xf())


def heaume(p, m, fente='sombre', croix='or'):
    """Heaume de croisé : cylindre à sommet plat, fente des yeux, trous d'aération, croix."""
    niv = [(1.560, 0.104, 0.118, 0.116), (1.548, 0.114, 0.128, 0.124), (1.62, 0.116, 0.130, 0.124),
           (1.70, 0.117, 0.133, 0.124), (1.78, 0.115, 0.128, 0.122), (1.86, 0.110, 0.120, 0.118),
           (1.885, 0.098, 0.108, 0.106), (1.893, 0.055, 0.06, 0.06), (1.896, 0, 0, 0)]

    def deco(c):
        av = c.z > 0.03
        fe = av & (np.abs(c.y - 1.716) < 0.008) & (c.ax > 0.008) & (c.ax < 0.085)
        c.poser(fente, fe)
        cr = av & ~fe & (((c.ax < 0.008) & (c.y > 1.60) & (c.y < 1.80)) | ((np.abs(c.y - 1.735) < 0.007) & (c.ax < 0.07)))
        if croix:
            c.poser(croix, cr)
        tr = av & (c.y < 1.68) & (c.y > 1.60) & (c.x > 0.02) & (c.x < 0.085)
        tr &= (np.hypot((c.x * 120) % 1 - 0.5, (c.y * 120) % 1 - 0.5) < 0.22)
        c.col = np.where(tr[:, None], c.col * 0.15, c.col)
        c.relief((c.ST[:, 1] - 0.05) * 0.3, 0.003, 1.0)
    coque(p, 'casque', niv, m, K=24, n=2.4, decor=[deco], xf=p.tete_xf(1.04, CASQUE_C))


def kabuto(p, m, shikoro='joueur', maedate='or'):
    """Casque de samouraï : bol, couvre-nuque évasé à lamelles, croissant doré."""
    niv = [(1.738, 0.100, 0.108, 0.114), (1.730, 0.106, 0.114, 0.120), (1.78, 0.104, 0.110, 0.116),
           (1.83, 0.088, 0.092, 0.098), (1.87, 0.058, 0.060, 0.064), (1.892, 0.024, 0.024, 0.026), (1.898, 0, 0, 0)]
    coque(p, 'casque', niv, m, K=24, decor=[_rebord_bas(0.14)])
    K = p.k(16)
    ext, inte = [], []
    for i, y in enumerate((1.745, 1.71, 1.67, 1.63, 1.60)):
        o = 0.012 + 0.016 * i
        th = np.linspace(np.pi * 0.86, np.pi * 2.14, K)
        e = point_tete(th, 1.745, 0.0)
        e[:, 0] *= 1 + o / 0.1
        e[:, 2] = (e[:, 2] - TETE_CZ) * (1 + o / 0.1) + TETE_CZ
        e[:, 1] = y
        ii = e.copy()
        ii[:, 0] *= 0.93
        ii[:, 2] = (ii[:, 2] - TETE_CZ) * 0.93 + TETE_CZ
        ext.append(e); inte.append(ii)

    def lam(c):
        r = (c.y * 110) % 1
        c.col = c.col * (1 - 0.35 * (r < 0.15))[:, None]
        lace = (np.abs(((np.arctan2(c.z, c.x) * 9) % 1) - 0.5) < 0.08)
        c.col = np.where(lace[:, None], c.col * 0.82, c.col)
    p.ajoute('shikoro', bande(ext, inte), shikoro, _w_tete_dos, decor=[lam], xf=p.tete_xf())
    pts = [(0.075, 1.86, 0.10), (0.05, 1.82, 0.115), (0.02, 1.79, 0.12), (0, 1.785, 0.122), (-0.02, 1.79, 0.12),
           (-0.05, 1.82, 0.115), (-0.075, 1.86, 0.10)]
    p.ajoute('maedate', chemin(pts, [0.004, 0.009, 0.012, 0.013, 0.012, 0.009, 0.004], p.k(8), haut=(0, 0, 1), aplat=0.3),
             maedate, w_os('Head'), xf=p.tete_xf())


def morion(p, m, plume=None):
    """Morion de conquistador : bombe à crête haute, bord relevé devant et derrière."""
    niv = [(1.745, 0.098, 0.104, 0.110), (1.79, 0.096, 0.100, 0.106), (1.84, 0.082, 0.086, 0.090),
           (1.88, 0.056, 0.058, 0.060), (1.905, 0.022, 0.022, 0.022), (1.91, 0, 0, 0)]
    coque(p, 'casque', niv, m, K=22)
    bord(p, m, 1.748, (0.098, 0.104, 0.110), 0.075, 0.006, releve=lambda th: 0.07 * np.abs(np.sin(th)) ** 3,
         pointe=0.05)
    pts = [(0, 1.84, 0.13), (0, 1.90, 0.10), (0, 1.935, 0.03), (0, 1.94, -0.03), (0, 1.915, -0.10), (0, 1.85, -0.135)]
    p.ajoute('crete', chemin(pts, [0.02, 0.035, 0.045, 0.045, 0.035, 0.02], p.k(10), haut=(1, 0, 0), aplat=0.25),
             m, w_os('Head'), xf=p.tete_xf())
    if plume:
        p.ajoute('plume', chemin([(0.05, 1.86, -0.09), (0.07, 1.95, -0.14), (0.08, 2.02, -0.22), (0.08, 2.03, -0.30)],
                                 [0.012, 0.03, 0.03, 0.01], p.k(8), haut=(1, 0, 0), aplat=0.25), plume, w_os('Head'),
                 xf=p.tete_xf())


def bord(p, m, y, prof, largeur, ep, releve=None, pointe=0.0, nom='bord', xf=None, K=28, avant_seul=False):
    """Bord de chapeau ou de casque : couronne plate (relevée selon releve(th))."""
    K = p.k(K)
    a, zf, zb = prof
    th = np.arange(K) * 2 * np.pi / K
    if avant_seul:
        th = np.linspace(np.pi * 0.12, np.pi * 0.88, K)
    rel = releve(th) if releve else np.zeros(K)
    pt = pointe * np.abs(np.sin(th)) ** 4

    def cour(off, dy):
        c, s = np.cos(th), np.sin(th)
        x = (a + off) * np.sign(c) * np.abs(c) ** (2 / 2.2)
        z = (np.where(s > 0, zf, zb) + off) * np.sign(s) * np.abs(s) ** (2 / 2.2)
        return np.stack([x, y + dy * np.ones(K), z + TETE_CZ], 1)
    o = largeur + pt
    if avant_seul:
        anns = [cour(-0.004, 0.0), cour(o * 0.5, rel * 0.3 - 0.003), cour(o, rel - 0.012)]
        p.ajoute(nom, bande(anns, [a_ + [0, -ep, 0] for a_ in anns], fermer=True), m, w_os('Head'),
                 xf=xf or p.tete_xf())
        return
    anns = [cour(-0.004, ep / 2), cour(o * 0.55, rel * 0.35 + ep / 2), cour(o, rel + ep / 2),
            cour(o + 0.004, rel), cour(o, rel - ep / 2), cour(o * 0.55, rel * 0.35 - ep / 2), cour(-0.004, -ep / 2)]
    p.ajoute(nom, anns, m, w_os('Head'), xf=xf or p.tete_xf())


def shako(p, m, visiere='cuir', plume='joueur', plaque='or'):
    niv = [(1.738, 0.096, 0.104, 0.110), (1.73, 0.100, 0.108, 0.114), (1.80, 0.104, 0.112, 0.116),
           (1.88, 0.110, 0.118, 0.120), (1.955, 0.116, 0.124, 0.124), (1.962, 0.11, 0.118, 0.118), (1.965, 0, 0, 0)]

    def deco(c):
        pl = (c.z > 0.08) & (c.ax < 0.04) & (c.y > 1.80) & (c.y < 1.90) & \
             (np.abs(c.ax) < 0.04 - 0.4 * np.abs(c.y - 1.85) ** 1.5)
        c.poser(plaque, pl)
        bd = (c.y > 1.935)
        c.poser(plaque, bd & (c.y < 1.952))
        c.poser(visiere, c.y < 1.75)
    coque(p, 'shako', niv, m, K=22, n=2.3, decor=[deco])
    bord(p, visiere, 1.742, (0.098, 0.106, 0.112), 0.05, 0.006, avant_seul=True, nom='visiere')
    p.ajoute('plumet', chemin([(0, 1.95, 0.11), (0, 2.01, 0.12), (0, 2.06, 0.12), (0, 2.08, 0.115)],
                              [0.016, 0.022, 0.018, 0.0], p.k(8)), plume, w_os('Head'), xf=p.tete_xf())


def casque_rond(p, m, style='1940', decor=()):
    """Casque d'acier 1940 (bord évasé) ou casque moderne coupé haut (avec support de lunettes)."""
    if style == '1940':
        niv = [(1.712, 0.128, 0.142, 0.144), (1.718, 0.138, 0.152, 0.152), (1.728, 0.126, 0.138, 0.140),
               (1.775, 0.120, 0.128, 0.132), (1.825, 0.104, 0.110, 0.114), (1.865, 0.074, 0.078, 0.080),
               (1.89, 0.036, 0.038, 0.040), (1.898, 0, 0, 0)]

        def dy(th, i):
            return 0.012 * np.sin(th)
        coque(p, 'casque', niv, m, K=24, dy=dy, nbas=3, decor=list(decor) + [_rebord_bas(0.08)])
    else:
        niv = [(1.728, 0.108, 0.112, 0.122), (1.722, 0.114, 0.118, 0.128), (1.77, 0.114, 0.118, 0.126),
               (1.82, 0.102, 0.106, 0.114), (1.86, 0.074, 0.076, 0.082), (1.888, 0.036, 0.036, 0.04), (1.896, 0, 0, 0)]

        def dy(th, i):
            s, c = np.sin(th), np.cos(th)
            return 0.03 * np.clip(s, 0, 1) ** 2 + 0.035 * np.exp(-((np.abs(c) - 0.92) / 0.12) ** 2) - 0.02 * np.clip(-s, 0, 1)
        coque(p, 'casque', niv, m, K=24, dy=dy, decor=decor)


def casque_integral(p, m, visiere='lumiere', decor=()):
    """Casque futuriste fermé : visière lumineuse, modules latéraux."""
    niv = [(1.570, 0.098, 0.12, 0.112), (1.555, 0.108, 0.130, 0.122), (1.62, 0.118, 0.142, 0.126),
           (1.70, 0.124, 0.146, 0.130), (1.78, 0.120, 0.136, 0.130), (1.84, 0.100, 0.112, 0.116),
           (1.88, 0.066, 0.072, 0.078), (1.900, 0.02, 0.02, 0.02), (1.902, 0, 0, 0)]

    def deco(c):
        v = (c.z > 0.03) & (np.abs(c.y - (1.712 - 0.9 * c.x ** 2)) < 0.026) & (c.ax < 0.115)
        c.poser(visiere, v)
        bord_v = (c.z > 0.03) & (np.abs(np.abs(c.y - (1.712 - 0.9 * c.x ** 2)) - 0.029) < 0.003) & (c.ax < 0.118)
        c.col = np.where(bord_v[:, None], c.col * 0.4, c.col)
        c.trait(np.abs(c.y - 1.62) + 2 * np.maximum(c.ax - 0.05, 0), 0.003, 0.4)
        c.trait(np.where(c.z < 0, c.ax - 0.004, 1), 0.003, 0.4)

    def dy(th, i):
        return -0.02 * np.clip(np.sin(th), 0, 1) ** 2
    coque(p, 'casque', niv, m, K=24, n=2.6, dy=dy, decor=list(decor) + [deco], xf=p.tete_xf(1.06, CASQUE_C))
    p.ajoute('module', boite((0.128, 1.70, 0.0), (0.03, 0.09, 0.09), K=p.k(8), arrondi=0.5), m, w_os('Head'),
             miroir=True, xf=p.tete_xf(1.06, CASQUE_C))


def chapeau(p, m, style='mousquetaire', ruban=None, plume=None):
    """Chapeaux : mousquetaire (large bord relevé d'un côté, plume), cowboy, paille, tricorne."""
    hauteur = {'mousquetaire': 1.90, 'cowboy': 1.92, 'paille': 1.86, 'tricorne': 1.87}[style]
    niv = [(1.742, 0.096, 0.104, 0.110), (1.74, 0.099, 0.106, 0.112), (1.80, 0.098, 0.104, 0.11),
           (hauteur - 0.03, 0.090, 0.096, 0.1), (hauteur, 0.06, 0.064, 0.068), (hauteur + 0.004, 0, 0, 0)]

    def deco(c):
        if ruban:
            c.poser(ruban, (c.y < 1.78) & (c.y > 1.745))
    xf = p.tete_xf()
    coque(p, 'chapeau', niv, m, K=22, decor=[deco], xf=xf)
    if style == 'mousquetaire':
        rel = lambda th: 0.09 * np.clip(np.cos(th), 0, 1) ** 3
        bord(p, m, 1.745, (0.099, 0.106, 0.112), 0.15, 0.007, releve=rel, xf=xf)
    elif style == 'cowboy':
        rel = lambda th: 0.05 * np.abs(np.cos(th)) ** 2.5
        bord(p, m, 1.745, (0.099, 0.106, 0.112), 0.09, 0.007, releve=rel, xf=xf)
    elif style == 'tricorne':
        rel = lambda th: 0.075 * (0.6 + 0.4 * np.cos(3 * (th - np.pi / 2)))
        bord(p, m, 1.745, (0.099, 0.106, 0.112), 0.08, 0.007, releve=rel, xf=xf)
    else:
        rel = lambda th: -0.02 + 0 * th
        bord(p, m, 1.745, (0.099, 0.106, 0.112), 0.13, 0.007, releve=rel, xf=xf)
    if plume:
        p.ajoute('plume', chemin([(-0.06, 1.79, 0.06), (-0.11, 1.86, 0.0), (-0.13, 1.90, -0.08), (-0.12, 1.88, -0.18),
                                  (-0.10, 1.84, -0.24)], [0.008, 0.03, 0.035, 0.028, 0.006], p.k(8), haut=(1, 0, 0),
                                 aplat=0.3), plume, w_os('Head'), xf=xf)


def nemes(p, m, rayure='or'):
    """Coiffe égyptienne rayée : bandeau, retombées devant les épaules, queue dans le dos."""
    def ligne(th):
        s = np.sin(th)
        return 1.745 + 0.02 * np.clip(s, 0, 1) - 0.12 * np.clip(-s, 0, 1) ** 1.2 - 0.04 * (1 - np.abs(s))

    def ray(c):
        r = ((c.y * 38) % 1) < 0.5
        if c.piece.nom.startswith('nemes_tombe'):
            r = ((c.ST[:, 1] * 9) % 1) < 0.5
        c.poser(rayure, r & ~c.de('peau'))
        band = (c.y > 1.75) & (c.y < 1.77) & (c.z > 0.0) & c.piece.nom.startswith('nemes') & (c.piece.nom == 'nemes')
        c.poser(rayure, band)
    calotte(p, 'nemes', m, ligne, off=0.02, decor=[ray])
    K = p.k(8)
    ext, inte = [], []
    for i, y in enumerate((1.76, 1.70, 1.62, 1.55, 1.48, 1.42)):
        f = i / 5
        x0, x1 = 0.075 + 0.02 * f, 0.105 + 0.035 * f
        z0 = 0.03 + 0.06 * ss(1.6, 1.45, y)
        xs = np.linspace(x0, x1, K)
        e = np.stack([xs, np.full(K, y), np.full(K, z0 + 0.012)], 1)
        ii = e - [0, 0, 0.012]
        ext.append(e); inte.append(ii)
    p.ajoute('nemes_tombe', bande(ext, inte), m, _w_tete_dos, miroir=True, decor=[ray], xf=p.tete_xf())
    p.ajoute('nemes_queue', chemin([(0, 1.66, -0.11), (0, 1.58, -0.13), (0, 1.50, -0.135)], [0.035, 0.03, 0.015],
                                   p.k(8), aplat=0.5), m, _w_tete_dos, decor=[ray], xf=p.tete_xf())


def bonnet_fourrure(p, m, fourrure='fourrure', pointe=True):
    niv = [(1.742, 0.096, 0.104, 0.110), (1.738, 0.099, 0.107, 0.113), (1.80, 0.094, 0.100, 0.106),
           (1.86, 0.070, 0.074, 0.078), (1.92, 0.030, 0.032, 0.034), (1.95, 0, 0, 0)]
    if not pointe:
        niv = niv[:3] + [(1.86, 0.072, 0.076, 0.08), (1.885, 0.03, 0.03, 0.03), (1.89, 0, 0, 0)]
    coque(p, 'bonnet', niv, m, K=22)
    K = p.k(20)
    ann = []
    for y, o in ((1.72, 0.0), (1.725, 0.03), (1.76, 0.04), (1.80, 0.03), (1.805, 0.0)):
        ann.append(_anneau(K, y, 0.099 + o, 0.107 + o, 0.113 + o, cz=TETE_CZ))
    p.ajoute('bord_fourrure', ann, fourrure, w_os('Head'), xf=p.tete_xf())


def capuche(p, m):
    def ligne(th):
        s = np.sin(th)
        return 1.62 + 0.18 * np.clip(s, 0, 1) ** 0.7 - 0.06 * np.clip(-s, 0, 1)
    calotte(p, 'capuche', m, ligne, off=0.025, y_haut=1.87, epais=0.012)


def casque_chantier(p, m):
    niv = [(1.745, 0.106, 0.114, 0.118), (1.75, 0.110, 0.118, 0.122), (1.80, 0.108, 0.114, 0.118),
           (1.85, 0.090, 0.094, 0.098), (1.885, 0.056, 0.058, 0.06), (1.905, 0.02, 0.02, 0.02), (1.908, 0, 0, 0)]

    def deco(c):
        c.relief(np.where(c.ax < 0.02, c.ax - 0.012, 1), 0.004, 1.0)
    coque(p, 'casque', niv, m, K=22, decor=[deco])
    bord(p, m, 1.748, (0.11, 0.118, 0.122), 0.035, 0.006, releve=lambda th: -0.01 + 0 * th, pointe=0.03)


def tete_jaguar(p, m, crocs='os'):
    """Coiffe de guerrier jaguar : tête de fauve sur le crâne, gueule ouverte autour du visage."""
    def ligne(th):
        s = np.sin(th)
        return 1.62 + 0.15 * np.clip(s, 0, 1) ** 0.8 - 0.07 * np.clip(-s, 0, 1)
    calotte(p, 'jaguar', m, ligne, off=0.03, y_haut=1.89, epais=0.014, decor=[_taches])
    xf = p.tete_xf()
    p.ajoute('museau', boite((0, 1.80, 0.105), (0.11, 0.06, 0.10), K=p.k(10), arrondi=0.7, rot=rot_x(0.15)), m,
             w_os('Head'), decor=[_taches, _yeux_jaguar], xf=xf)
    p.ajoute('oreille', boite((0.075, 1.88, -0.01), (0.04, 0.05, 0.02), K=p.k(6), arrondi=0.8), m, w_os('Head'),
             miroir=True, xf=xf)
    for s in (1, -1):
        p.ajoute('croc%d' % (s > 0), chemin([(s * 0.03, 1.775, 0.145), (s * 0.03, 1.745, 0.148)], [0.008, 0.0],
                                            p.k(6), poles=True), crocs, w_os('Head'), xf=xf)


def _taches(c):
    n = bruit(c.P * [1, 1, 1], 55, 77)
    t = (n > 0.66) & (n < 0.74)
    c2 = (n > 0.74)
    c.col = np.where(t[:, None], c.col * 0.2, c.col)
    c.col = np.where(c2[:, None], c.col * 0.85, c.col)


def _yeux_jaguar(c):
    e = (c.z > 0.12) & (np.hypot(c.ax - 0.03, c.y - 1.815) < 0.01)
    c.col = np.where(e[:, None], np.array([0.85, 0.65, 0.1]), c.col)
    n = (c.z > 0.14) & (c.ax < 0.015) & (np.abs(c.y - 1.79) < 0.01)
    c.col = np.where(n[:, None], c.col * 0.2, c.col)


def tete_robot(p, m, oeil='lumiere', joint='sombre'):
    """Tête d'androïde : boîte arrondie, bandeau optique, antennes."""
    xf = p.tete_xf()
    p.ajoute('tete', boite((0, 1.725, 0.012), (0.17, 0.25, 0.20), K=p.k(16), arrondi=0.6), m, w_os('Head'),
             decor=[_optique(oeil)], xf=xf)
    p.ajoute('machoire', boite((0, 1.615, 0.03), (0.12, 0.05, 0.15), K=p.k(10), arrondi=0.5), joint, w_os('Head'),
             xf=xf)
    p.ajoute('antenne', chemin([(0.09, 1.76, -0.02), (0.11, 1.84, -0.04), (0.12, 1.90, -0.05)], [0.012, 0.007, 0.004],
                               p.k(6)), m, w_os('Head'), miroir=True, xf=xf)


def _optique(oeil):
    def f(c):
        v = (c.z > 0.09) & (np.abs(c.y - 1.735) < 0.017) & (c.ax < 0.07)
        c.poser(oeil, v)
        c.trait(np.where(c.z > 0.09, np.abs(np.abs(c.y - 1.735) - 0.021), 1), 0.003, 0.6)
        c.trait(np.abs(c.y - 1.66), 0.003, 0.4)
        c.trait(np.where(c.z < 0, c.ax, 1), 0.003, 0.4)
    return f


# ---------------------------------------------------------------------------------------------
# Vêtements et armures du tronc
# ---------------------------------------------------------------------------------------------
def jupe(p, nom, m, y0, y1, ep0, evase, K=30, force=0.9, decor=(), devant=1.0, dos=1.0, poids=None, n=5):
    """Jupe, tunique, robe, pans de manteau : cône de y0 (haut) à y1 (bas), évasé de evase en bas."""
    K = p.k(K)
    ann = []
    ys = sorted(set(list(np.linspace(y0, y1, n)) + [y for y in (0.95, 0.90, 0.85) if y1 < y < y0 - 0.02]), reverse=True)
    for i, y in enumerate(ys):
        f = (y0 - y) / (y0 - y1)
        a, zf, zb = profil_corps(p.m, min(y, 1.03) if y > 0.9 else 0.92, ep0)
        e = evase * f ** 1.2
        a2 = a
        if y < 0.985:  # dégager les cuisses
            cj = sur_jambe(min(max(y, 0.12), 0.93))
            rx, rz, dz = r_jambe(p.m, min(max(y, 0.12), 0.93))
            a2 = max(a, cj[0] + rx + 0.016 - e)
            zf = max(zf, rz + abs(cj[2]) + 0.016 - e)
            zb = max(zb, rz + abs(cj[2]) + 0.016 - e)
        x, z = superellipse(K, a2 + e, (zf + e) * devant, (zb + e) * dos, n=2.2)
        ann.append(np.stack([x, np.full(K, y), z + 0.004], 1))
    x, z = superellipse(K, a2 + e - 0.016, (zf + e) * devant - 0.016, (zb + e) * dos - 0.016, n=2.2)
    ann.append(np.stack([x, np.full(K, ys[-1] + 0.006), z + 0.004], 1))
    p.ajoute(nom, ann, m, poids or (lambda P: w_jupe(P, force, y0 - 0.02, y1 + 0.05)), decor=decor)


def lanieres(p, nom, m, n, decal, y0, y1, ext, haut=(0.166, 0.126, 0.116), bas=(0.226, 0.176, 0.166), ep=0.009,
             jeu=0.10, decor=(), rangs=4, poids=None):
    """Lanières (ptéryges, lamelles de jupe) autour d'un cône ; une seule zone de texture partagée."""
    def cone(y):
        t = (y0 - y) / max(y0 - y1, 1e-6)
        return [h + (b - h) * t + ext for h, b in zip(haut, bas)]
    for i in range(n):
        th0 = (i + decal + jeu / 2) * 2 * np.pi / n
        th1 = (i + 1 + decal - jeu / 2) * 2 * np.pi / n
        ann = []
        for y in np.linspace(y0, y1, rangs):
            a, zf, zb = cone(y)
            pts = []
            for th, e in ((th0, ep), (th1, ep), (th1, 0), (th0, 0)):
                c, s = math.cos(th), math.sin(th)
                x = (a + e) * np.sign(c) * abs(c) ** (2 / 2.2)
                z = ((zf if s > 0 else zb) + e) * np.sign(s) * abs(s) ** (2 / 2.2)
                pts.append((x, y, z + 0.004))
            ann.append(pts)
        P, F, ST, taille = loft(ann)
        mats, zf_ = (m, None) if isinstance(m, str) else m
        pc = Piece('%s%02d' % (nom, i), P, F, ST, taille, mats, poids or w_jupe, False, nom, zf_, decor)
        pc.peindre = (i == 0)
        pc.xf = None
        p.pieces.append(pc)


def lin_lanieres(cle_bord='cuir'):
    def f(c):
        su, tv = c.ST[:, 0], c.ST[:, 1]
        face = su < 0.43
        c.col = c.col * (0.72 + 0.28 * ss(0.0, 0.6, tv))[:, None]
        c.col = c.col * (1 + 0.05 * np.sin(su * 260) * np.sin(tv * 90))[:, None]
        bordm = face & ((su < 0.045) | (su > 0.385))
        if cle_bord:
            c.poser(cle_bord, bordm)
        frange = (tv > 0.88) & (np.sin(su * 2 * np.pi * 9) > 0.2)
        c.col = np.where(frange[:, None], c.col * 0.82, c.col)
        c.col = np.where(~face[:, None], c.col * 0.7, c.col)
    return f


def ceinture(p, m, y, h=0.045, ep=0.012, nom='ceinture', decor=(), base_ep=0.0):
    K = p.k(28)
    ann = []
    for yy, e in ((y + h / 2, -0.016), (y + h / 2, ep), (y - h / 2, ep), (y - h / 2, -0.016)):
        a, zf, zb = profil_corps(p.m, yy, base_ep)
        x, z = superellipse(K, a + e, zf + e, zb + e, n=2.3)
        ann.append(np.stack([x, np.full(K, yy), z + 0.004], 1))
    p.ajoute(nom, ann, m, w_torse if y > 1.05 else w_jupe, decor=decor)


def gilet(p, m, y0=1.06, y1=1.50, ep=0.03, nom='gilet', decor=(), base_ep=-0.012):
    """Couche par-dessus le torse (gilet, plastron, porte-plaques) ; l'encolure reste au corps."""
    K = p.k(28)
    ann = []
    ys = [y0] + list(np.linspace(y0, y1, 6)) + [y1]
    for i, y in enumerate(ys):
        e = -0.006 if i in (0, len(ys) - 1) else (ep if 1 < i < len(ys) - 2 else ep * 0.75)
        a, zf, zb = profil_torse(p.m, y, base_ep)
        x, z = superellipse(K, a + e, zf + e, zb + e, n=2.6)
        z = z + _bosses(p.m, x, y, z, p.m.pecs, p.m.poitrine)
        ann.append(np.stack([x, np.full(K, y), z + 0.004], 1))
    p.ajoute(nom, ann, m, w_torse, decor=decor)


def col(p, m, y=1.545, h=0.03, ep=0.02, nom='col'):
    """Col montant (veste, uniforme) autour du cou."""
    K = p.k(16)
    ann = []
    for yy, e in ((y - h / 2, -0.004), (y - h / 2, ep), (y + h / 2, ep * 0.8), (y + h / 2, -0.004)):
        r = 0.056 * p.m.cou + e
        ann.append(_anneau(K, yy, r, r, r, cz=-0.008))
    p.ajoute(nom, ann, m, chaine(['Spine2', 'Neck'], [0.0, 0.02]))


def cape(p, m, bas=0.42, largeur=1.0, nom='cape', decor=(), ourlet=True):
    niv = [(1.535, 0.165, -0.122, 0.105, 0.000), (1.48, 0.200, -0.135, 0.070, 0.004),
           (1.40, 0.225, -0.145, 0.055, 0.008), (1.25, 0.255, -0.155, 0.055, 0.012),
           (1.08, 0.285, -0.172, 0.060, 0.016), (0.90, 0.310, -0.200, 0.065, 0.020),
           (0.70, 0.330, -0.222, 0.068, 0.024), (0.52, 0.340, -0.240, 0.070, 0.026),
           (0.42, 0.342, -0.248, 0.070, 0.026)]
    niv = [n for n in niv if n[0] >= bas - 1e-6]
    if niv[-1][0] > bas:
        niv.append((bas,) + niv[-1][1:])
    Nc, ep = p.k(23) | 1, 0.012
    ann = []
    for y, W, zc, av, amp in niv:
        W = W * largeur * (1 + 0.5 * (p.m.carrure - 1))
        x = np.linspace(-W, W, Nc)
        u = x / W
        z = zc * (1 + 0.6 * (p.m.carrure - 1)) + av * u ** 4 + amp * np.cos(u * np.pi * 2.5)
        ext = np.stack([x, np.full(Nc, y), z - ep], 1)
        inte = np.stack([x, np.full(Nc, y), z], 1)[::-1]
        ann.append(np.vstack([ext, inte]))
    dec = list(decor)
    if ourlet:
        dec.append(_ourlet_cape)
    p.ajoute(nom, ann, m, w_cape, decor=dec)


def _ourlet_cape(c):
    c.col = mix(c.col, c.col * 0.84, ss(0.955, 0.97, c.ST[:, 1]))
    c.col = c.col * (1 - 0.14 * np.exp(-((c.ST[:, 1] - 0.94) / 0.004) ** 2))[:, None]


def ourlet(y0, w=0.004, sens=1):
    """Liseré à la hauteur y0 et bas plus sombre (tuniques, robes)."""
    def f(c):
        c.col = c.col * (1 - 0.14 * np.exp(-((c.y - y0) / w) ** 2))[:, None]
        c.col = mix(c.col, c.col * 0.86, ss(y0, y0 - 0.012 * sens, c.y))
    return f


def col_fourrure(p, m):
    K = p.k(26)
    ann = []
    for y, o in ((1.585, -0.005), (1.585, 0.03), (1.555, 0.055), (1.50, 0.06), (1.455, 0.04), (1.445, -0.005)):
        a, zf, zb = profil_torse(p.m, min(y, 1.546), 0.0)
        a = max(a, 0.09) + o
        ann.append(_anneau(K, y, a, zf + o, zb + o, cz=0.004))
    p.ajoute('fourrure', ann, m, lambda P: w_torse(P))


def epaulieres(p, m, style='dome', decor=(), taille=1.0):
    """Protections d'épaule : dome (spalière), plaque (sode), bandes (segmentata), futur (massive)."""
    poids = lambda P: w_chaine(P, BRAS, [0.0, 0.08, 0.05, 0.03])
    if style == 'dome':
        xs = [0.10, 0.12, 0.17, 0.22, 0.27, 0.30, 0.305]
        rs = [(0.0, 0.0), (0.05, 0.07), (0.075, 0.10), (0.08, 0.105), (0.072, 0.095), (0.05, 0.07), (0.0, 0.0)]
        rs = [(a * taille, b * taille) for a, b in rs]
        cs = [(x, ARM_Y + 0.035 - 0.12 * (x - 0.2) * (x > 0.2), ARM_Z) for x in xs]
        p.ajoute('epauliere', tube(cs, rs, p.k(14), axe='x', echelle=p.m.bras ** 0.5), m, poids, miroir=True,
                 decor=decor)
    elif style in ('plaque', 'bandes'):
        K = p.k(12)
        ext, inte = [], []
        x0, x1 = (0.15, 0.34) if style == 'plaque' else (0.13, 0.27)
        for x in np.linspace(x0, x1, 5):
            ry, rz = r_bras(p.m, x)
            th = np.linspace(-0.25 * np.pi, 1.25 * np.pi, K) if style == 'plaque' else np.linspace(-0.1 * np.pi, 1.1 * np.pi, K)
            o = 0.03 if style == 'plaque' else 0.016
            dr = (x - x0) / (x1 - x0)
            ro = o + (0.035 * dr if style == 'plaque' else 0)
            e = np.stack([np.full(K, x), ARM_Y + (ry + ro) * np.sin(th), ARM_Z + (rz + ro) * np.cos(th)], 1)
            ii = np.stack([np.full(K, x), ARM_Y + (ry + ro - 0.008) * np.sin(th), ARM_Z + (rz + ro - 0.008) * np.cos(th)], 1)
            ext.append(e); inte.append(ii)
        p.ajoute('epauliere', bande(ext, inte), m, poids, miroir=True, decor=decor)
    elif style == 'futur':
        p.ajoute('epauliere', boite((0.22, 1.545, -0.01), (0.17 * taille, 0.09 * taille, 0.19 * taille), K=p.k(12),
                                    arrondi=0.55, rot=rot_z(-0.28)), m, poids, miroir=True, decor=decor)
        p.ajoute('epauliere2', boite((0.25, 1.47, -0.01), (0.14 * taille, 0.07, 0.17 * taille), K=p.k(10),
                                     arrondi=0.55, rot=rot_z(-0.5)), m, poids, miroir=True, decor=decor)


def bandes_horizontales(pas=0.042, y0=1.04, y1=1.40, cle=None):
    """Lames horizontales (segmentata, lamelles) : traits sombres et reflets."""
    def f(c):
        r = (c.y - y0) / pas
        d = (r - np.round(r)) * pas
        dans = (c.y > y0 - 0.01) & (c.y < y1)
        c.relief(np.where(dans, -d, 1), 0.003, 1.0)
        if cle:
            riv = dans & (np.abs(d) < 0.006) & (np.abs(((c.x * 25) % 1) - 0.5) < 0.12) & (c.z > 0)
            c.poser(cle, riv)
    return f


def lacets_lamelles(cle, pas_y=0.04, pas_x=0.05):
    """Lamelles de samouraï : rangées de plaques, laçage vertical dans la couleur du joueur."""
    def f(c):
        r = (c.ST[:, 1] * c.piece.taille[1] / pas_y) % 1
        u = (c.ST[:, 0] * c.piece.taille[0] / pas_x) % 1
        lac = (np.abs(u - 0.5) < 0.07) & (r > 0.18)
        c.poser(cle, lac)
        c.col = c.col * (1 - 0.45 * (r < 0.14))[:, None]
        c.col = c.col * (1 + 0.15 * ss(0.14, 0.3, r) * (1 - r))[:, None]
    return f


def croix(cle, y=1.30, larg=0.024, bras_x=0.09, haut=0.12):
    def f(c):
        v = (c.ax < larg) & (np.abs(c.y - y) < haut)
        h = (np.abs(c.y - (y + 0.02)) < larg) & (c.ax < bras_x)
        c.poser(cle, (v | h) & (c.z > 0.03))
        c.poser(cle, (v | h) & (c.z < -0.03))
    return f


def baudriers(cle, larg=0.022):
    """Deux baudriers croisés sur la poitrine et le dos."""
    def f(c):
        d1 = np.abs((c.y - 1.47) + 1.25 * c.x)
        d2 = np.abs((c.y - 1.47) - 1.25 * c.x)
        m = ((d1 < larg) | (d2 < larg)) & (c.y < 1.52) & (c.y > 1.06)
        c.poser(cle, m)
    return f


def boutons(cle, x=0.035, ys=(1.12, 1.20, 1.28, 1.36, 1.44), r=0.008):
    def f(c):
        m = np.zeros(len(c.x), bool)
        for y in ys:
            m |= (c.z > 0.05) & (np.hypot(c.ax - x, c.y - y) < r)
        c.poser(cle, m)
    return f


def camouflage(cles, freq=26, graine=3):
    def f(c):
        n1 = bruit(c.P, freq, graine)
        n2 = bruit(c.P, freq * 1.3, graine + 7)
        for cle, mask in zip(cles, ((n1 > 0.58), (n2 > 0.62) & (n1 <= 0.58), (n1 < 0.3) & (n2 < 0.45))):
            if cle:
                sel = mask & (c.msk == 0)
                old = c.col.copy()
                c.poser(cle, sel)
                c.col[sel] = mix(old[sel], c.col[sel], 0.85)
    return f


def carreaux(cle, pas=0.05, larg=0.012):
    """Tissu à carreaux (plaid) : bandes croisées de la matière cle."""
    def f(c):
        u = (c.ST[:, 1] * c.piece.taille[1] / pas) % 1
        v = (c.ST[:, 0] * c.piece.taille[0] / pas) % 1
        m = (np.abs(u - 0.5) < larg / pas) | (np.abs(v - 0.5) < larg / pas)
        c.poser(cle, m)
        dbl = (np.abs(u - 0.5) < larg / pas) & (np.abs(v - 0.5) < larg / pas)
        c.col = np.where(dbl[:, None], c.col * 0.8, c.col)
    return f


def rayures(cle, pas=0.03, axe=1, prop=0.5):
    def f(c):
        r = ((c.P[:, axe] / pas) % 1) < prop
        c.poser(cle, r & (c.msk > 0.5))
    return f


def lignes_lumineuses(cle, ys=(1.18, 1.32), xs=(), epais=0.0045):
    def f(c):
        m = np.zeros(len(c.x), bool)
        for y in ys:
            m |= np.abs(c.y - y) < epais
        for x in xs:
            m |= np.abs(c.ax - x) < epais
        c.poser(cle, m)
    return f


def articulations(cle, xs_bras=(0.455, 0.70), ys_jambe=(0.535, 0.12), largeur=0.012):
    """Anneaux sombres aux coudes, poignets, genoux et chevilles (androïde, armure)."""
    def f(c):
        m = np.zeros(len(c.x), bool)
        n = c.piece.nom
        if n.startswith('bras'):
            for x in xs_bras:
                m |= np.abs(c.ax - x) < largeur
        if n.startswith('jambe'):
            for y in ys_jambe:
                m |= np.abs(c.y - y) < largeur
        c.poser(cle, m)
    return f


def collier_large(cles=('or', 'joueur', 'or', 'lapis')):
    """Collier égyptien (ousekh) peint en anneaux autour de l'encolure."""
    def f(c):
        d = np.hypot(c.x / 1.0, (c.y - 1.56) / 0.75)
        for i, cle in enumerate(cles):
            r0 = 0.075 + i * 0.022
            m = (d > r0) & (d < r0 + 0.022) & (c.y > 1.40)
            c.poser(cle, m)
    return f


def boite_piece(p, nom, m, centre, taille, poids, rot=None, miroir=False, arrondi=0.4, K=10, decor=()):
    p.ajoute(nom, boite(centre, taille, K=p.k(K), arrondi=arrondi, rot=rot), m, poids, miroir=miroir, decor=decor)


def sacoches(p, m, y=1.0, n=3, taille=(0.06, 0.07, 0.035), ep=0.012, avant=True):
    """Poches de ceinture réparties sur le devant ou le côté."""
    for i in range(n):
        ang = np.pi / 2 + (i - (n - 1) / 2) * 0.55 if avant else 0.15 + i * 0.5
        a, zf, zb = profil_corps(p.m, y, ep)
        x = a * np.cos(ang) * 1.02
        z = zf * np.sin(ang) * 1.02 + 0.004
        if abs(x) < 0.03 and avant:
            continue
        p.ajoute('sacoche%d' % i, boite((x, y - 0.005, z + taille[2] * 0.4), taille, K=p.k(8), arrondi=0.4,
                                        rot=rot_y(np.pi / 2 - ang)), m, w_jupe if y < 1.05 else w_torse)


def sac_dos(p, m, taille=(0.30, 0.34, 0.14), y=1.30, decor=(), rouleau=None):
    a, zf, zb = profil_torse(p.m, y, 0.0)
    p.ajoute('sac', boite((0, y, -zb - taille[2] / 2 + 0.01), taille, K=p.k(12), arrondi=0.45), m,
             lambda P: _w_dos(P), decor=decor)
    if rouleau:
        p.ajoute('rouleau', chemin([(-0.17, y + taille[1] / 2 + 0.03, -zb - 0.07), (0.17, y + taille[1] / 2 + 0.03, -zb - 0.07)],
                                   [0.045, 0.045], p.k(10)), rouleau, lambda P: _w_dos(P))


def _w_dos(P):
    W = np.zeros((len(P), NB))
    W[:, IDX['Spine2']] = 0.7
    W[:, IDX['Spine1']] = 0.3
    return W


def carquois(p, m, fleches='plumes', bois='bois'):
    a, zf, zb = profil_torse(p.m, 1.28, 0.0)
    z = -zb - 0.05
    pts = [(0.13, 0.98, z), (0.0, 1.25, z - 0.01), (-0.13, 1.52, z - 0.02)]
    p.ajoute('carquois', chemin(pts, [0.042, 0.044, 0.046], p.k(10)), m, lambda P: _w_dos(P))
    for i, dx in enumerate((-0.02, 0.0, 0.02, 0.012)):
        base = np.array([-0.13 + dx, 1.53, z - 0.02 + (i - 1.5) * 0.012])
        p.ajoute('fleche%d' % i, chemin([base, base + [-0.05, 0.11, 0.0]], [0.012, 0.0], p.k(6)), fleches,
                 lambda P: _w_dos(P))


def torque(p, m):
    pts = []
    for t in np.linspace(0.18, 0.82, 9):
        th = -np.pi / 2 + t * 2 * np.pi
        pts.append((0.07 * np.cos(th), 1.555, -0.008 + 0.074 * np.sin(-th) * -1))
    pts = [(0.072 * np.cos(a), 1.552 - 0.01 * np.sin(a), -0.008 + 0.075 * np.sin(a)) for a in
           np.linspace(np.pi * 0.62, np.pi * 2.38, 11)]
    p.ajoute('torque', chemin(pts, [0.016] + [0.011] * 9 + [0.016], p.k(8)), m, chaine(['Spine2', 'Neck'], [0.0, 0.02]))


def reacteur(p, m, flamme='lumiere'):
    """Réacteur dorsal (pilote spatial) : caisson et deux tuyères."""
    a, zf, zb = profil_torse(p.m, 1.30, 0.0)
    z = -zb - 0.07
    p.ajoute('reacteur', boite((0, 1.30, z), (0.26, 0.30, 0.10), K=p.k(12), arrondi=0.5), m, lambda P: _w_dos(P))
    for s in (1, -1):
        p.ajoute('tuyere%d' % (s > 0), chemin([(s * 0.08, 1.24, z - 0.04), (s * 0.08, 1.08, z - 0.05)], [0.045, 0.055],
                                              p.k(10)), m, lambda P: _w_dos(P),
                 decor=[lambda c: c.poser(flamme, c.y < 1.10)])
