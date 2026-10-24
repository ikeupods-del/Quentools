#!/usr/bin/env python3
"""Hoplite grec : personnage 3D low poly pour jeu de stratégie, fabriqué entièrement par programme.

Sortie (dans ce dossier) :
  hoplite.glb                    personnage riggé (squelette aux noms Mixamo), pose en T, textures intégrées
  textures/hoplite_basecolor.png couleur de base peinte (2048 x 2048)
  textures/hoplite_roughness.png rugosité (niveaux de gris)
  textures/hoplite_metallic.png  métal (bronze = blanc)
  textures/hoplite_couleur_joueur.png  masque des zones à teinter (cape, tunique, manches)

Usage : python3 design/3d/hoplite/fabriquer.py        (numpy et Pillow uniquement)
Repères : mètres, Y vers le haut, le personnage regarde vers +Z, sa gauche est +X (conventions glTF).
"""
import io
import json
import math
import os
import struct
import sys

import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
TEX = 2048
PREFIXE = 'mixamorig:'

# ---------------------------------------------------------------------------------------------
# Squelette (hiérarchie et noms du squelette humanoïde Mixamo, 65 os)
# ---------------------------------------------------------------------------------------------
OS = [
    ('Hips', None, (0.0, 1.00, 0.0)),
    ('Spine', 'Hips', (0.0, 1.10, 0.005)),
    ('Spine1', 'Spine', (0.0, 1.22, 0.01)),
    ('Spine2', 'Spine1', (0.0, 1.34, 0.005)),
    ('Neck', 'Spine2', (0.0, 1.53, -0.01)),
    ('Head', 'Neck', (0.0, 1.62, 0.0)),
    ('HeadTop_End', 'Head', (0.0, 1.84, 0.0)),
]


def _cote(c, s):
    """Os d'un côté (s = +1 gauche, -1 droite) : bras, main, doigts, jambe."""
    L = []
    def a(n, p, x, y, z):
        L.append((c + n, (c + p) if p else 'Spine2' if n == 'Shoulder' else 'Hips', (s * x, y, z)))
    a('Shoulder', None, 0.065, 1.46, -0.005)
    a('Arm', 'Shoulder', 0.20, 1.475, -0.01)
    a('ForeArm', 'Arm', 0.475, 1.475, -0.01)
    a('Hand', 'ForeArm', 0.725, 1.475, -0.005)
    a('HandThumb1', 'Hand', 0.745, 1.462, 0.032)
    a('HandThumb2', 'HandThumb1', 0.772, 1.456, 0.066)
    a('HandThumb3', 'HandThumb2', 0.792, 1.451, 0.09)
    a('HandThumb4', 'HandThumb3', 0.808, 1.447, 0.11)
    for doigt, z, fin in (('Index', 0.031, 0.902), ('Middle', 0.010, 0.908),
                          ('Ring', -0.011, 0.900), ('Pinky', -0.031, 0.885)):
        x0 = 0.813
        pas = (fin - x0) / 3
        for i in range(4):
            a('Hand%s%d' % (doigt, i + 1), 'Hand' if i == 0 else 'Hand%s%d' % (doigt, i),
              x0 + pas * i, 1.471 - 0.004 * i, z)
    a('UpLeg', None, 0.10, 0.95, 0.0)
    a('Leg', 'UpLeg', 0.12, 0.53, 0.01)
    a('Foot', 'Leg', 0.135, 0.10, -0.01)
    a('ToeBase', 'Foot', 0.14, 0.025, 0.11)
    a('Toe_End', 'ToeBase', 0.145, 0.025, 0.19)
    return L


OS += _cote('Left', 1) + _cote('Right', -1)
NOMS = [o[0] for o in OS]
IDX = {n: i for i, n in enumerate(NOMS)}
PARENT = {o[0]: o[1] for o in OS}
J = {o[0]: np.array(o[2], float) for o in OS}
ENFANTS = {n: [m for m in NOMS if PARENT[m] == n] for n in NOMS}
NB = len(NOMS)
MIROIR_OS = np.array([IDX[n.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right')] for n in NOMS])


def bout(n):
    """Extrémité d'un os : la tête de son enfant principal (ou un prolongement pour les feuilles)."""
    pref = {'Hand': n.replace('Hand', 'HandMiddle1') if n.endswith('Hand') else None,
            'Spine2': 'Neck', 'Hips': 'Spine'}
    for cle, cible in pref.items():
        if n.endswith(cle) and cible and cible in J:
            return J[cible]
    if ENFANTS[n]:
        return J[ENFANTS[n][0]]
    p = J[PARENT[n]]
    return J[n] + (J[n] - p) * 0.5


# ---------------------------------------------------------------------------------------------
# Outils de géométrie
# ---------------------------------------------------------------------------------------------
def ss(e0, e1, x):
    t = np.clip((np.asarray(x, float) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def interp(points, n=None):
    """Interpolation douce (Catmull-Rom) d'une liste de valeurs clés -> fonction t in [0,1]."""
    P = np.array(points, float)
    def f(t):
        t = np.clip(t, 0, 1) * (len(P) - 1)
        i = int(min(math.floor(t), len(P) - 2))
        u = t - i
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
        return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                      + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
    return f


def superellipse(K, a, zf, zb, n=2.4, debut=0.0):
    """Section horizontale (x, z) : demi-largeur a, profondeur avant zf, arrière zb, coins arrondis."""
    th = debut + np.arange(K) * 2 * np.pi / K
    c, s = np.cos(th), np.sin(th)
    x = a * np.sign(c) * np.abs(c) ** (2 / n)
    z = np.where(s > 0, zf, zb) * np.sign(s) * np.abs(s) ** (2 / n)
    return x, z


class Piece:
    """Un morceau du maillage : sommets, triangles, coordonnées locales (s, t) dans [0,1]."""

    def __init__(self, nom, P, F, ST, taille, matiere, poids, lisse=True, partage=None):
        self.nom, self.P, self.F, self.ST = nom, np.asarray(P, float), np.asarray(F, int), np.asarray(ST, float)
        self.taille = taille          # (largeur, hauteur) en mètres dans l'atlas
        self.matiere = matiere
        self.poids = poids            # fonction P -> matrice (n, NB)
        self.lisse = lisse
        self.partage = partage or nom  # même clé = même zone de texture
        self.peindre = True


def loft(anneaux):
    """Relie des anneaux de K points (même sens) par des quadrilatères ; anneau réduit à un point = pôle."""
    A = [np.asarray(r, float) for r in anneaux]
    R, K = len(A), len(A[0])
    P, S, T = [], [], []
    # paramètre le long du tube : distance moyenne entre anneaux
    d = [0.0]
    for i in range(1, R):
        d.append(d[-1] + float(np.mean(np.linalg.norm(A[i] - A[i - 1], axis=1))))
    long_ = d[-1] or 1.0
    peris = []
    s_prec = None
    for i, r in enumerate(A):
        boucle = np.vstack([r, r[:1]])
        seg = np.linalg.norm(np.diff(boucle, axis=0), axis=1)
        per = seg.sum()
        if per < 1e-9:
            s = s_prec if s_prec is not None else np.linspace(0, 1, K + 1)
        else:
            s = np.concatenate([[0], np.cumsum(seg)]) / per
            peris.append(per)
        s_prec = s
        P.append(boucle)
        S.append(s)
        T.append(np.full(K + 1, d[i] / long_))
    P = np.vstack(P)
    ST = np.stack([np.concatenate(S), np.concatenate(T)], 1)
    F = []
    for i in range(R - 1):
        for k in range(K):
            a, b = i * (K + 1) + k, i * (K + 1) + k + 1
            c, e = b + K + 1, a + K + 1
            F += [(a, b, c), (a, c, e)]
    F = np.array(F)
    aire = np.linalg.norm(np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]]), axis=1)
    F = F[aire > 1e-10]
    # orientation : volume signé (avec bouchons fictifs) positif = faces vers l'extérieur
    v = _volume(P, F)
    for r in (A[0], A[-1]):
        c = r.mean(0)
        sens = 1 if r is A[0] else -1
        for k in range(K):
            p, q = r[k], r[(k + 1) % K]
            v += sens * np.dot(c, np.cross(q, p)) / 6
    if v < 0:
        F = F[:, ::-1]
    taille = (float(np.mean(peris)) if peris else 0.1, long_)
    return P, F, ST, taille


def _volume(P, F):
    return float(np.sum(np.einsum('ij,ij->i', P[F[:, 0]], np.cross(P[F[:, 1]], P[F[:, 2]]))) / 6)


def tube(centres, rayons, K, debut=0.0, axe=None, echelle=1.0):
    """Anneaux elliptiques autour d'une ligne de centres ; rayons = (r1, r2) dans le plan perpendiculaire.
    axe : 'x' (bras), 'y' (jambes, cou), 'z' (pieds)."""
    anneaux = []
    th = debut + np.arange(K) * 2 * np.pi / K
    for c, (r1, r2) in zip(centres, rayons):
        c = np.asarray(c, float)
        r1, r2 = r1 * echelle, r2 * echelle
        if axe == 'x':      # section dans (y, z)
            pts = np.stack([np.zeros(K), r1 * np.cos(th), r2 * np.sin(th)], 1)
        elif axe == 'z':    # section dans (x, y)
            pts = np.stack([r1 * np.cos(th), r2 * np.sin(th), np.zeros(K)], 1)
        else:               # section dans (x, z)
            pts = np.stack([r1 * np.cos(th), np.zeros(K), r2 * np.sin(th)], 1)
        anneaux.append(c + pts)
    return anneaux


# ---------------------------------------------------------------------------------------------
# Poids de peau
# ---------------------------------------------------------------------------------------------
def w_os(nom):
    def f(P):
        W = np.zeros((len(P), NB))
        W[:, IDX[nom]] = 1
        return W
    return f


def w_chaine(P, noms, fondu):
    """Poids le long d'une chaîne d'os : segment le plus proche, fondu linéaire adouci aux articulations."""
    n = len(noms)
    tetes = [J[x] for x in noms]
    bouts = [J[noms[i + 1]] if i + 1 < n else bout(noms[i]) for i in range(n)]
    D = np.zeros((len(P), n))
    S = np.zeros((len(P), n))
    Lg = np.zeros(n)
    for i in range(n):
        a, b = tetes[i], bouts[i]
        ab = b - a
        l2 = max(float(ab @ ab), 1e-9)
        t = np.clip(((P - a) @ ab) / l2, 0, 1)
        D[:, i] = np.linalg.norm(P - (a + t[:, None] * ab), axis=1)
        S[:, i] = t * math.sqrt(l2)
        Lg[i] = math.sqrt(l2)
    k = np.argmin(D, 1)
    s = S[np.arange(len(P)), k]
    lk = Lg[k]
    fd = np.array(fondu if isinstance(fondu, (list, tuple)) else [fondu] * n, float)
    W = np.zeros((len(P), NB))
    cour = np.ones(len(P))
    autre = np.zeros(len(P), int) - 1
    # près du début du segment : fondu avec le précédent
    b0 = fd[k]
    m0 = (k > 0) & (s < b0)
    f0 = 0.5 + 0.5 * ss(0, 1, s / np.maximum(b0, 1e-6))
    cour = np.where(m0, f0, cour)
    autre = np.where(m0, k - 1, autre)
    # près de la fin : fondu avec le suivant
    b1 = fd[np.minimum(k + 1, n - 1)]
    m1 = (~m0) & (k < n - 1) & (lk - s < b1)
    f1 = 0.5 + 0.5 * ss(0, 1, (lk - s) / np.maximum(b1, 1e-6))
    cour = np.where(m1, f1, cour)
    autre = np.where(m1, k + 1, autre)
    idx = np.array([IDX[x] for x in noms])
    r = np.arange(len(P))
    W[r, idx[k]] += cour
    sel = autre >= 0
    W[r[sel], idx[autre[sel]]] += 1 - cour[sel]
    return W


def chaine(noms, fondu):
    return lambda P: w_chaine(P, noms, fondu)


BRAS = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand']
COLONNE = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head']
JAMBE = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase']


def w_main(P):
    """Main en moufle : quatre doigts répartis selon la position en profondeur, pouce à part."""
    total = np.zeros((len(P), NB))
    zs = {'Index': 0.031, 'Middle': 0.010, 'Ring': -0.011, 'Pinky': -0.031}
    poids = {d: np.exp(-((P[:, 2] - z) / 0.011) ** 2) for d, z in zs.items()}
    somme = sum(poids.values()) + 1e-9
    for d in zs:
        Wd = w_chaine(P, ['LeftForeArm', 'LeftHand'] + ['LeftHand%s%d' % (d, i) for i in (1, 2, 3)],
                      [0.0, 0.035, 0.012, 0.010, 0.010])
        total += Wd * (poids[d] / somme)[:, None]
    return total


def w_jupe(P, force=0.85, haut=0.98, bas=0.72):
    """Jupe et lanières : bassin en haut, cuisses vers le bas selon le côté."""
    a = force * ss(haut, bas, P[:, 1])
    g = np.clip(0.5 + P[:, 0] / 0.10, 0, 1)
    W = np.zeros((len(P), NB))
    W[:, IDX['Hips']] = 1 - a
    W[:, IDX['LeftUpLeg']] = a * g
    W[:, IDX['RightUpLeg']] = a * (1 - g)
    return W


def w_torse(P):
    W = w_chaine(P, ['Hips', 'Spine', 'Spine1', 'Spine2'], [0.0, 0.05, 0.06, 0.06])
    e = ss(0.11, 0.19, np.abs(P[:, 0])) * ss(1.36, 1.46, P[:, 1]) * 0.6
    W *= (1 - e)[:, None]
    W[:, IDX['LeftShoulder']] += e * (P[:, 0] > 0)
    W[:, IDX['RightShoulder']] += e * (P[:, 0] <= 0)
    return W


def w_cape(P):
    W = w_chaine(P, ['Hips', 'Spine', 'Spine1', 'Spine2'], [0.0, 0.06, 0.08, 0.08])
    e = ss(0.08, 0.17, np.abs(P[:, 0])) * ss(1.42, 1.52, P[:, 1]) * 0.5
    W *= (1 - e)[:, None]
    W[:, IDX['LeftShoulder']] += e * (P[:, 0] > 0)
    W[:, IDX['RightShoulder']] += e * (P[:, 0] <= 0)
    a = 0.35 * ss(0.85, 0.45, P[:, 1])
    g = np.clip(0.5 + P[:, 0] / 0.30, 0, 1)
    W *= (1 - a)[:, None]
    W[:, IDX['LeftUpLeg']] += a * g
    W[:, IDX['RightUpLeg']] += a * (1 - g)
    return W


# ---------------------------------------------------------------------------------------------
# Construction du personnage
# ---------------------------------------------------------------------------------------------
def construire():
    pieces = []

    def ajoute(nom, anneaux, matiere, poids, miroir=False, lisse=True, partage=None):
        P, F, ST, taille = loft(anneaux)
        p = Piece(nom, P, F, ST, taille, matiere, poids, lisse, partage)
        pieces.append(p)
        if miroir:
            q = Piece(nom + '_D', P * [-1, 1, 1], F[:, ::-1], ST, taille, matiere, poids, lisse, partage=p.partage)
            q.miroir = True
            q.peindre = False
            pieces.append(q)
        return p

    # --- Cuirasse musclée en bronze -----------------------------------------------------------
    K = 30
    niveaux = [  # y, demi-largeur, avant, arrière
        (1.005, 0.150, 0.110, 0.100),
        (0.995, 0.168, 0.128, 0.118),
        (1.030, 0.158, 0.118, 0.108),
        (1.10, 0.152, 0.117, 0.106),
        (1.20, 0.166, 0.127, 0.110),
        (1.29, 0.188, 0.140, 0.116),
        (1.37, 0.203, 0.146, 0.121),
        (1.43, 0.198, 0.137, 0.120),
        (1.49, 0.176, 0.118, 0.112),
        (1.525, 0.135, 0.096, 0.090),
        (1.546, 0.083, 0.072, 0.062),
        (1.548, 0.070, 0.062, 0.054),
        (1.530, 0.060, 0.054, 0.048),
    ]
    anneaux = []
    for y, a, zf, zb in niveaux:
        g = 1 + 0.10 * ss(1.12, 1.36, y) * ss(1.545, 1.45, y)
        a, zf = a * g, zf * (1 + 0.5 * (g - 1))
        x, z = superellipse(K, a, zf, zb, n=2.3)
        av = z > 0
        bosse = (0.016 * np.exp(-((np.abs(x) - 0.088) / 0.05) ** 2) * math.exp(-((y - 1.37) / 0.05) ** 2)
                 + 0.007 * np.exp(-(x / 0.06) ** 2) * math.exp(-((y - 1.18) / 0.07) ** 2))
        z = z + np.where(av, bosse, 0)
        anneaux.append(np.stack([x, np.full(K, y), z + 0.004], 1))
    ajoute('cuirasse', anneaux, 'cuirasse', w_torse)

    # --- Cou, barbe -------------------------------------------------------------------------
    ys = [1.47, 1.53, 1.58, 1.63]
    ajoute('cou', tube([(0, y, -0.008) for y in ys], [(0.055, 0.058), (0.054, 0.056), (0.056, 0.058), (0.058, 0.06)], 12, axe='y'),
           'peau', chaine(['Spine2', 'Neck', 'Head'], [0.0, 0.03, 0.04]))
    ajoute('barbe', tube([(0, 1.615, 0.055), (0, 1.58, 0.078), (0, 1.55, 0.09), (0, 1.53, 0.097), (0, 1.522, 0.10)],
                         [(0.050, 0.035), (0.046, 0.030), (0.034, 0.022), (0.018, 0.013), (0.0, 0.0)], 12, axe='y'),
           'barbe', w_os('Head'))

    # --- Casque corinthien ------------------------------------------------------------------
    K = 26
    niv = [  # y, demi-largeur, avant, arrière
        (1.588, 0.090, 0.104, 0.112),
        (1.566, 0.112, 0.124, 0.137),
        (1.600, 0.115, 0.131, 0.128),
        (1.650, 0.112, 0.136, 0.121),
        (1.700, 0.114, 0.137, 0.121),
        (1.750, 0.115, 0.131, 0.123),
        (1.792, 0.106, 0.117, 0.118),
        (1.832, 0.085, 0.092, 0.095),
        (1.862, 0.050, 0.053, 0.056),
        (1.874, 0.0, 0.0, 0.0),
    ]
    anneaux = []
    for i, (y, a, zf, zb) in enumerate(niv):
        x, z = superellipse(K, a, zf, zb, n=2.15)
        yy = np.full(K, y)
        if i <= 1:  # joues plus basses devant, nuque évasée derrière
            s = z / max(zf, 1e-6)
            yy = yy - 0.03 * np.clip(s, 0, 1) ** 2 - 0.004 * np.clip(-s, 0, 1)
        anneaux.append(np.stack([x, yy, z + 0.012], 1))
    anneaux = [CASQUE_C + (r - CASQUE_C) * CASQUE_E for r in anneaux]
    ajoute('casque', anneaux, 'casque', w_os('Head'))

    # --- Cimier en crin rouge (arc d'avant en arrière, queue tombante) ----------------------
    c0 = np.array([0, 1.72, -0.005])
    cles_phi = [62, 45, 20, -10, -45, -80, -110, -135, -150, -160]
    cles_rb = [0.150, 0.160, 0.158, 0.157, 0.152, 0.145, 0.145, 0.150, 0.170, 0.205]
    cles_h = [0.012, 0.045, 0.068, 0.072, 0.064, 0.048, 0.032, 0.022, 0.016, 0.0]
    cles_w = [0.012, 0.036, 0.044, 0.046, 0.044, 0.040, 0.036, 0.030, 0.020, 0.0]
    fphi, frb, fh, fw = interp(cles_phi), interp(cles_rb), interp(cles_h), interp(cles_w)
    Kc, Rc = 12, 28
    th = np.arange(Kc) * 2 * np.pi / Kc
    anneaux = []
    ts = np.linspace(0, 1, Rc)
    for t in ts:
        ph = math.radians(float(fphi(t)))
        nrm = np.array([0, math.cos(ph), math.sin(ph)])
        h, w = max(float(fh(t)), 0), max(float(fw(t)), 0)
        c = c0 + (float(frb(t)) + 0.75 * h) * nrm
        if t == ts[-1]:
            h = w = 0
        pts = c + np.outer(w * np.cos(th), [1, 0, 0]) + np.outer(h * np.sin(th), nrm)
        anneaux.append(pts)
    anneaux.insert(0, anneaux[0].mean(0)[None].repeat(Kc, 0))
    anneaux = [CASQUE_C + (r - CASQUE_C) * CASQUE_E for r in anneaux]
    ajoute('cimier', anneaux, 'cimier', w_os('Head'))

    # --- Bras (gauche puis miroir) ----------------------------------------------------------
    xs = [0.13, 0.18, 0.21, 0.24, 0.27, 0.30, 0.34, 0.40, 0.43, 0.455, 0.48, 0.50, 0.53, 0.56, 0.60, 0.635, 0.67, 0.70, 0.73, 0.736]
    rs = [(0.060, 0.060), (0.071, 0.069), (0.070, 0.067), (0.067, 0.063), (0.062, 0.060), (0.059, 0.057), (0.058, 0.056),
          (0.050, 0.050), (0.047, 0.047), (0.045, 0.046), (0.047, 0.049), (0.048, 0.050), (0.0475, 0.049), (0.046, 0.047),
          (0.042, 0.042), (0.038, 0.038), (0.033, 0.037), (0.029, 0.036), (0.027, 0.035), (0.019, 0.026)]
    rs = [(a * 1.3, b * 1.3) for a, b in rs]
    ajoute('bras', tube([(x, 1.475, -0.01) for x in xs], rs, 14, axe='x'), 'peau',
           chaine(BRAS, [0.0, 0.05, 0.05, 0.03]), miroir=True)
    xs = [0.12, 0.18, 0.24, 0.285, 0.292]
    rs = [(0.090, 0.090), (0.106, 0.104), (0.102, 0.097), (0.096, 0.091), (0.073, 0.071)]
    ajoute('manche', tube([(x, 1.477, -0.01) for x in xs], rs, 14, axe='x'), 'tissu',
           chaine(BRAS, [0.0, 0.06, 0.05, 0.03]), miroir=True)
    # main paume vers le bas, doigts serrés
    xs = [0.712, 0.76, 0.812, 0.852, 0.884, 0.903, 0.912]
    rs = [(0.026, 0.035), (0.025, 0.045), (0.020, 0.047), (0.016, 0.043), (0.013, 0.037), (0.007, 0.022), (0, 0)]
    ys = [1.474, 1.472, 1.470, 1.467, 1.464, 1.462, 1.461]
    rs = [(a * 1.22, b * 1.18) for a, b in rs]
    ajoute('main', tube([(x, y, 0.0) for x, y in zip(xs, ys)], rs, 12, axe='x'), 'peau', w_main, miroir=True)
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
        ann.append(c + np.outer(r * np.cos(th), u) + np.outer(r * 0.85 * np.sin(th), v))
    ajoute('pouce', ann, 'peau', chaine(['LeftHand', 'LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3'],
                                        [0.0, 0.012, 0.010, 0.008]), miroir=True)

    # --- Jambes -----------------------------------------------------------------------------
    def sur_jambe(y, haut=(0.10, 0.95, 0.0), genou=(0.12, 0.53, 0.012), cheville=(0.135, 0.10, -0.01)):
        a, b, c = map(np.array, (haut, genou, cheville))
        if y >= genou[1]:
            t = (haut[1] - y) / (haut[1] - genou[1])
            return a + (b - a) * t
        t = (genou[1] - y) / (genou[1] - cheville[1])
        return b + (c - b) * t

    ys = [0.90, 0.82, 0.76, 0.70, 0.65, 0.60, 0.56]
    rs = [(0.088, 0.093), (0.085, 0.088), (0.080, 0.083), (0.074, 0.077), (0.068, 0.071), (0.062, 0.065), (0.056, 0.059)]
    rs = [(a * 1.25, b * 1.25) for a, b in rs]
    ajoute('cuisse', tube([sur_jambe(y) for y in ys], rs, 14, axe='y'), 'peau',
           chaine(JAMBE, [0.0, 0.06, 0.04, 0.03]), miroir=True)
    ys = [0.622, 0.612, 0.585, 0.550, 0.50, 0.43, 0.36, 0.28, 0.20, 0.135, 0.118, 0.123]
    rs = [(0.053, 0.056), (0.064, 0.068), (0.066, 0.073), (0.064, 0.074), (0.059, 0.064), (0.062, 0.069),
          (0.058, 0.063), (0.050, 0.052), (0.042, 0.046), (0.041, 0.045), (0.044, 0.048), (0.035, 0.038)]
    dz = [0, 0, 0.006, 0.008, 0.002, -0.008, -0.006, -0.002, 0, 0, 0, 0]
    rs = [(a * k, b * k) for (a, b), k in zip(rs, [1.28, 1.32, 1.27, 1.22] + [1.2] * 8)]
    ajoute('jambiere', tube([sur_jambe(y) + [0, 0, d] for y, d in zip(ys, dz)], rs, 14, axe='y'), 'jambiere',
           chaine(JAMBE, [0.0, 0.06, 0.04, 0.03]), miroir=True)
    ajoute('cheville', tube([(0.135, y, -0.014) for y in (0.17, 0.12, 0.085, 0.062)],
                            [(0.034, 0.038), (0.035, 0.039), (0.040, 0.046), (0.042, 0.05)], 12, axe='y', echelle=1.12),
           'pied', chaine(JAMBE, [0.0, 0.05, 0.04, 0.03]), miroir=True)
    zs = [-0.078, -0.068, -0.035, 0.02, 0.08, 0.14, 0.185, 0.20]
    rs = [(0, 0), (0.031, 0.027), (0.044, 0.041), (0.050, 0.041), (0.053, 0.030), (0.055, 0.021), (0.046, 0.016), (0, 0)]
    cy = [0.045, 0.048, 0.060, 0.058, 0.045, 0.035, 0.031, 0.030]
    cx = [0.135, 0.135, 0.136, 0.138, 0.141, 0.144, 0.146, 0.147]
    ajoute('pied', tube([(x, y, z) for x, y, z in zip(cx, cy, zs)], rs, 12, axe='z'), 'pied',
           chaine(['LeftFoot', 'LeftToeBase'], [0.0, 0.03]), miroir=True)
    zs = [-0.084, -0.08, -0.04, 0.05, 0.14, 0.198, 0.212, 0.216]
    rs = [(0.0, 0.0), (0.033, 0.009), (0.048, 0.010), (0.055, 0.010), (0.059, 0.010), (0.053, 0.010), (0.033, 0.009), (0, 0)]
    cx = [0.135, 0.135, 0.136, 0.139, 0.144, 0.147, 0.148, 0.148]
    ajoute('semelle', tube([(x, 0.010, z) for x, z in zip(cx, zs)], rs, 10, axe='z'), 'cuir',
           chaine(['LeftFoot', 'LeftToeBase'], [0.0, 0.03]), miroir=True)

    # --- Tunique (couleur du joueur) sous les ptéryges -------------------------------------
    K = 30
    niv = [(0.98, 0.160, 0.122, 0.112), (0.88, 0.190, 0.148, 0.140), (0.78, 0.208, 0.160, 0.152),
           (0.705, 0.218, 0.168, 0.160), (0.712, 0.200, 0.152, 0.145)]
    anneaux = []
    for y, a, zf, zb in niv:
        x, z = superellipse(K, a, zf, zb, n=2.2)
        anneaux.append(np.stack([x, np.full(K, y), z + 0.004], 1))
    ajoute('tunique', anneaux, 'tunique', lambda P: w_jupe(P, 0.9, 0.95, 0.74))

    # --- Ptéryges : deux rangées de lanières de lin ----------------------------------------
    def cone(y, ext):
        t = (1.02 - y) / (1.02 - 0.72)
        a = 0.166 + (0.226 - 0.166) * t + ext
        zf = 0.126 + (0.176 - 0.126) * t + ext
        zb = 0.116 + (0.166 - 0.116) * t + ext
        return a, zf, zb

    def lanieres(nom, n, decal, y0, y1, ext, ep=0.009, jeu=0.10):
        for i in range(n):
            th0 = (i + decal + jeu / 2) * 2 * np.pi / n
            th1 = (i + 1 + decal - jeu / 2) * 2 * np.pi / n
            ann = []
            for y in np.linspace(y0, y1, 4):
                a, zf, zb = cone(y, ext)
                pts = []
                for th, e in ((th0, ep), (th1, ep), (th1, 0), (th0, 0)):
                    c, s = math.cos(th), math.sin(th)
                    x = (a + e) * np.sign(c) * abs(c) ** (2 / 2.2)
                    z = ((zf if s > 0 else zb) + e) * np.sign(s) * abs(s) ** (2 / 2.2)
                    pts.append((x, y, z + 0.004))
                ann.append(pts)
            P, F, ST, taille = loft(ann)
            p = Piece('%s%02d' % (nom, i), P, F, ST, taille, 'lin', w_jupe, lisse=False, partage=nom)
            p.peindre = (i == 0)
            pieces.append(p)

    lanieres('pteryge_bas', 20, 0.5, 0.985, 0.738, 0.010)
    lanieres('pteryge_haut', 20, 0.0, 1.025, 0.870, 0.024)

    # --- Cape (couleur du joueur), bande épaisse derrière le dos ---------------------------
    niv = [  # y, demi-largeur, recul au centre, avancée des bords, amplitude des plis
        (1.535, 0.165, -0.122, 0.105, 0.000),
        (1.48, 0.200, -0.135, 0.070, 0.004),
        (1.40, 0.225, -0.145, 0.055, 0.008),
        (1.25, 0.255, -0.155, 0.055, 0.012),
        (1.08, 0.285, -0.172, 0.060, 0.016),
        (0.90, 0.310, -0.200, 0.065, 0.020),
        (0.70, 0.330, -0.222, 0.068, 0.024),
        (0.52, 0.340, -0.240, 0.070, 0.026),
        (0.42, 0.342, -0.248, 0.070, 0.026),
    ]
    Nc, ep = 23, 0.012
    anneaux = []
    for y, W, zc, av, amp in niv:
        x = np.linspace(-W, W, Nc)
        u = x / W
        z = zc + av * u ** 4 + amp * np.cos(u * np.pi * 2.5)
        ext = np.stack([x, np.full(Nc, y), z - ep], 1)
        inte = np.stack([x, np.full(Nc, y), z], 1)[::-1]
        anneaux.append(np.vstack([ext, inte]))
    ajoute('cape', anneaux, 'cape', w_cape)
    return pieces


# ---------------------------------------------------------------------------------------------
# Atlas de texture (rangement par étagères, densité uniforme)
# ---------------------------------------------------------------------------------------------
def ranger(pieces, marge=8):
    zones = {}
    for p in pieces:
        zones.setdefault(p.partage, p.taille)
    # les zones très étroites (lanières) gardent une largeur raisonnable
    lo, hi = 50.0, 4000.0
    for _ in range(40):
        s = (lo + hi) / 2
        if _placer(zones, s, marge) is None:
            hi = s
        else:
            lo = s
    place = _placer(zones, lo, marge)
    return place, lo


def _placer(zones, s, marge):
    rects = sorted(((k, max(int(w * s), 16), max(int(h * s), 16)) for k, (w, h) in zones.items()),
                   key=lambda r: -r[2])
    x = y = h_rang = 0
    out = {}
    for k, w, h in rects:
        if w + 2 * marge > TEX:
            return None
        if x + w + 2 * marge > TEX:
            x, y, h_rang = 0, y + h_rang, 0
        if y + h + 2 * marge > TEX:
            return None
        out[k] = (x + marge, y + marge, w, h)
        x += w + 2 * marge
        h_rang = max(h_rang, h + 2 * marge)
    return out


# ---------------------------------------------------------------------------------------------
# Peinture : rendu des pièces dans l'espace de texture, puis matières peintes à la main
# ---------------------------------------------------------------------------------------------
def normales(P, F, lisse):
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    cle = np.round(P / 1e-5).astype(np.int64)
    _, inv = np.unique(cle, axis=0, return_inverse=True)
    inv = inv.reshape(-1)
    acc = np.zeros((inv.max() + 1, 3))
    for c in range(3):
        np.add.at(acc, inv[F[:, c]], fn)
    N = acc[inv]
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def rasteriser(gb, pid, UVpx, F, attrs):
    """Remplit les tampons (id, attributs interpolés) pour chaque triangle, en pixels de texture."""
    H, W = gb['id'].shape
    for f in F:
        q = UVpx[f]
        x0, y0 = np.floor(q.min(0)).astype(int)
        x1, y1 = np.ceil(q.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, W - 1), min(y1, H - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = q
        det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(det) < 1e-12:
            continue
        l0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / det
        l1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / det
        l2 = 1 - l0 - l1
        m = (l0 >= -1e-6) & (l1 >= -1e-6) & (l2 >= -1e-6)
        if not m.any():
            continue
        iy = (ys[m] - 0.5).astype(int)
        ix = (xs[m] - 0.5).astype(int)
        A = attrs[f]  # (3, k)
        val = l0[m, None] * A[0] + l1[m, None] * A[1] + l2[m, None] * A[2]
        gb['id'][iy, ix] = pid
        gb['attr'][iy, ix] = val


def _hash(ix, iy, iz, graine):
    h = np.sin(ix * 127.1 + iy * 311.7 + iz * 74.7 + graine * 19.19) * 43758.5453
    return h - np.floor(h)


def bruit(P, freq, graine=0):
    """Bruit de valeur 3D lissé (0..1)."""
    q = P * freq
    i = np.floor(q)
    f = q - i
    f = f * f * (3 - 2 * f)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (np.where(dx, f[:, 0], 1 - f[:, 0]) * np.where(dy, f[:, 1], 1 - f[:, 1])
                     * np.where(dz, f[:, 2], 1 - f[:, 2]))
                out = out + w * _hash(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz, graine)
    return out


CASQUE_C, CASQUE_E = np.array([0.0, 1.66, 0.01]), 1.08  # casque un peu grossi pour la lecture de loin
LUMIERE = np.array([0.0, 1.0, 0.38]) / np.linalg.norm([0.0, 1.0, 0.38])


def ombre(P, N):
    lam = np.clip(N @ LUMIERE, -1, 1)
    s = 0.80 + 0.28 * lam
    s *= 0.90 + 0.12 * np.clip(P[:, 1] / 1.9, 0, 1)
    s *= 1 - 0.16 * np.clip(-N[:, 1], 0, 1)
    return s, lam


def mix(a, b, t):
    a, b = np.asarray(a, float), np.asarray(b, float)
    t = np.asarray(t, float)[..., None] if np.ndim(t) else t
    return a + (b - a) * t


def relief(col, rug, d, w, force=1.0):
    """Trait gravé + reflet juste au-dessus (d > 0) : faux relief peint à la main."""
    sombre = np.exp(-(d / w) ** 2) * force
    clair = np.exp(-((d - 2.2 * w) / (1.2 * w)) ** 2) * force
    col = col * (1 - 0.5 * sombre)[:, None] + (clair * 0.22)[:, None] * np.array([1.0, 0.86, 0.58])
    return col, rug + 0.08 * sombre - 0.06 * clair


def bronze(P, N):
    s, lam = ombre(P, N)
    col = mix([0.30, 0.17, 0.07], [0.74, 0.50, 0.21], np.clip((s - 0.5) / 0.6, 0, 1))
    col = mix(col, [0.99, 0.83, 0.48], ss(0.78, 0.99, lam) * 0.55)
    coups = bruit(P, 22) * 0.10 + bruit(P * [1, 4, 1], 40, 3) * 0.05 - 0.075
    col = col * (1 + coups)[:, None]
    rug = 0.30 + 0.14 * bruit(P, 30, 5)
    return col, rug, np.full(len(P), 0.9)


def peau(P, N):
    s, lam = ombre(P, N)
    col = mix([0.42, 0.24, 0.16], [0.82, 0.57, 0.41], np.clip((s - 0.5) / 0.6, 0, 1))
    col = mix(col, [0.93, 0.72, 0.56], ss(0.85, 1.0, lam) * 0.3)
    col = col * (1 + bruit(P, 35, 7) * 0.06 - 0.03)[:, None]
    return col, 0.58 + 0.08 * bruit(P, 20, 2), np.zeros(len(P))


def gris(P, N, clair=0.84):
    s, lam = ombre(P, N)
    v = clair * (0.70 + 0.30 * np.clip((s - 0.55) / 0.55, 0, 1))
    v = v * (1 + bruit(P * [3, 0.6, 3], 25, 11) * 0.05 - 0.025)
    return np.stack([v, v, v], 1), 0.88 + 0.06 * bruit(P, 15, 4), np.zeros(len(P))


def peindre_piece(p, P, N, ST):
    """Couleur, rugosité, métal et masque joueur pour les texels d'une pièce."""
    m = p.matiere
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    ax = np.abs(x)
    masque = np.zeros(len(P))
    if m == 'cuirasse':
        col, rug, met = bronze(P, N)
        av = ss(0.0, 0.03, z)
        ar = ss(0.0, 0.03, -z)
        # ligne médiane, pectoraux, abdominaux, bas du ventre
        d = np.where((y > 1.06) & (y < 1.43), ax, 1)
        col, rug = relief(col, rug, d - 0.004, 0.005, av)
        f = 1.31 + 2.2 * (np.clip(ax, 0.012, 0.19) - 0.09) ** 2
        col, rug = relief(col, rug, np.where((ax > 0.01) & (ax < 0.18), y - f, 1), 0.006, av)
        for y0 in (1.245, 1.175):
            col, rug = relief(col, rug, np.where(ax < 0.075, y - y0, 1), 0.005, av * ss(0.085, 0.05, ax))
        f = 1.065 + 4.5 * ax ** 2
        col, rug = relief(col, rug, np.where(ax < 0.15, y - f, 1), 0.006, av)
        # dos : sillon de la colonne, omoplates
        col, rug = relief(col, rug, np.where((y > 1.06) & (y < 1.47), ax - 0.004, 1), 0.005, ar)
        f = 1.405 - 3.0 * (np.clip(ax, 0, 0.18) - 0.09) ** 2
        col, rug = relief(col, rug, np.where((ax > 0.03) & (ax < 0.17), f - y, 1), 0.006, ar * 0.8)
        # bordures roulées (taille et encolure)
        bord = ss(1.03, 1.012, y) + ss(1.52, 1.54, y)
        col = mix(col, [0.97, 0.80, 0.46], np.clip(bord, 0, 1) * 0.45)
        col, rug = relief(col, rug, y - 1.034, 0.004, 1.0)
        col, rug = relief(col, rug, 1.516 - y, 0.004, 1.0)
    elif m == 'casque':
        col, rug, met = bronze(P, N)
        x, y, z = (CASQUE_C + (P - CASQUE_C) / CASQUE_E).T  # dessin du visage dans le repère d'origine
        ax = np.abs(x)
        av = (z > 0.02) & (ax < 0.09)

        def ouverture(x_, y_):
            ax_ = np.abs(x_)
            yeux = (ax_ > 0.012) & (ax_ < 0.076) & (np.abs(y_ - 1.705) < 0.018 * np.clip(1 - ((ax_ - 0.044) / 0.033) ** 2, 0, 1))
            fente = (y_ < 1.682) & (ax_ < 0.017 + 0.014 * ss(1.66, 1.57, y_))
            pont = (y_ > 1.668) & (y_ < 1.70) & (ax_ < 0.05) & ~((ax_ < 0.012) & (y_ > 1.678))
            return yeux | fente | pont

        o = ouverture(x, y) & av
        d = 0.006
        bordure = av & ~o & (ouverture(x + d, y) | ouverture(x - d, y) | ouverture(x, y + d) | ouverture(x, y - d))
        # intérieur sombre, yeux, lèvres, barbe
        fond = np.array([0.07, 0.045, 0.035])
        inter = np.tile(fond, (len(P), 1))
        oeil = np.hypot(ax - 0.043, y - 1.704)
        inter = mix(inter, [0.34, 0.27, 0.22], ss(0.0095, 0.006, oeil))
        inter = mix(inter, [0.09, 0.06, 0.045], ss(0.0055, 0.0035, oeil))
        inter = mix(inter, [0.75, 0.68, 0.58], ss(0.0018, 0.0008, np.hypot(ax - 0.0415, y - 1.7055)))
        inter = mix(inter, [0.48, 0.31, 0.22], ((y > 1.632) & (y < 1.665)) * 0.8)
        barbe = (y < 1.636)
        poil = 0.85 + 0.3 * bruit(P * [9, 1, 9], 60, 8)
        inter = np.where(barbe[:, None], np.array([0.22, 0.13, 0.07]) * poil[:, None], inter)
        col = np.where(o[:, None], inter, col)
        rug = np.where(o, 0.85, rug)
        met = np.where(o, 0.0, met)
        col = np.where(bordure[:, None], col * 1.22 + 0.05, col)
        # sourcils gravés et bordure basse
        f = 1.737 + 2.5 * (np.clip(ax, 0, 0.09) - 0.045) ** 2
        col, rug = relief(col, rug, np.where(ax < 0.085, y - f, 1), 0.004, (z > 0.03) * 1.0)
        bas = ST[:, 1] < 0.09
        col = np.where(bas[:, None], col * 1.15, col)
        col, rug = relief(col, rug, np.where(ST[:, 1] < 0.2, (ST[:, 1] - 0.115) * 0.4, 1), 0.004, 1.0)
    elif m == 'cimier':
        s, lam = ombre(P, N)
        mech = 0.5 + 0.5 * np.sin(ST[:, 0] * 2 * np.pi * 13 + bruit(P, 70, 9) * 5)
        mech = mech * 0.6 + bruit(P * [6, 1, 1], 90, 12) * 0.4
        col = mix([0.28, 0.025, 0.02], [0.78, 0.10, 0.06], np.clip((s - 0.45) / 0.6, 0, 1) * (0.55 + 0.45 * mech))
        col = mix(col, [0.95, 0.30, 0.18], ss(0.8, 1.0, lam) * 0.35 * mech)
        col = mix(col, [0.20, 0.02, 0.02], ss(0.06, 0.0, ST[:, 1]) * 0.6)
        rug, met = 0.78 + 0.1 * mech, np.zeros(len(P))
    elif m == 'peau':
        col, rug, met = peau(P, N)
        if p.nom.startswith('bras'):  # bracelet de cuir au poignet
            br = (ax > 0.655) & (ax < 0.705)
            cuir = np.array([0.36, 0.21, 0.11]) * ombre(P, N)[0][:, None]
            col = np.where(br[:, None], cuir, col)
            col, rug = relief(col, rug, np.where(br, np.minimum(ax - 0.655, 0.705 - ax), 1) - 0.004, 0.003, 1.0)
            rug = np.where(br, 0.7, rug)
        if p.nom.startswith('main'):  # séparation des doigts
            for zz in (0.0205, 0.0, -0.021):
                trait = np.exp(-((z - zz) / 0.0022) ** 2) * ss(0.818, 0.835, ax)
                col = col * (1 - 0.38 * trait)[:, None]
    elif m == 'barbe':
        s, lam = ombre(P, N)
        poil = 0.8 + 0.4 * bruit(P * [10, 1, 10], 80, 13)
        col = mix([0.10, 0.06, 0.035], [0.32, 0.19, 0.10], np.clip(s - 0.4, 0, 1) * poil)
        rug, met = np.full(len(P), 0.85), np.zeros(len(P))
    elif m == 'jambiere':
        col, rug, met = bronze(P, N)
        cx = 0.12 + (0.135 - 0.12) * np.clip((0.53 - y) / 0.43, 0, 1)
        devant = ss(0.4, 0.8, N[:, 2])
        col = mix(col, [0.99, 0.84, 0.50], np.exp(-((ax - cx) / 0.006) ** 2) * devant * 0.35 * (y < 0.5))
        r = np.hypot(ax - 0.12, y - 0.555) - 0.032
        col, rug = relief(col, rug, -r, 0.004, devant)
        mollet = np.hypot((ax - cx) / 1.0, (y - 0.41) / 2.2) - 0.05
        col, rug = relief(col, rug, -mollet, 0.005, ss(0.2, 0.6, -N[:, 2]) * 0.7)
        bords = ss(0.08, 0.02, ST[:, 1]) + ss(0.93, 0.99, ST[:, 1])
        col = mix(col, [0.97, 0.80, 0.46], np.clip(bords, 0, 1) * 0.4)
    elif m == 'pied':
        col, rug, met = peau(P, N)
        cxp = 0.135 + 0.012 * np.clip(z / 0.2, 0, 1)
        sangle = np.zeros(len(P), bool)
        if p.nom.startswith('pied'):
            for z0 in (0.125, 0.06, 0.0):
                sangle |= (np.abs(z - z0) < 0.009) & (y > 0.022)
            sangle |= (np.abs(ax - cxp) < 0.008) & (z > -0.01) & (z < 0.15) & (y > 0.04)
            sangle |= (y < 0.022)
        else:  # lacets croisés autour de la cheville
            ang = np.arctan2(z + 0.014, ax - 0.135)
            for sens in (1, -1):
                v = (y * 26 + sens * ang / np.pi * 2.0) % 1.0
                sangle |= (np.abs(v - 0.5) < 0.12) & (y < 0.165)
        cuir = np.array([0.38, 0.22, 0.12]) * ombre(P, N)[0][:, None]
        col = np.where(sangle[:, None], cuir, col)
        rug = np.where(sangle, 0.72, rug)
    elif m == 'cuir':
        s, lam = ombre(P, N)
        col = mix([0.16, 0.09, 0.05], [0.42, 0.25, 0.13], np.clip(s - 0.4, 0, 1))
        rug, met = 0.75 + 0.1 * bruit(P, 40, 6), np.zeros(len(P))
    elif m == 'lin':
        su, tv = ST[:, 0], ST[:, 1]
        face = su < 0.43
        col = np.tile([0.89, 0.83, 0.69], (len(P), 1))
        col = col * (0.72 + 0.28 * ss(0.0, 0.6, tv))[:, None]
        trame = 1 + 0.05 * np.sin(su * 260) * np.sin(tv * 90)
        col = col * trame[:, None]
        bord = face & ((su < 0.045) | (su > 0.385))
        col = np.where(bord[:, None], np.array([0.50, 0.33, 0.18]), col)
        frange = (tv > 0.88) & (np.sin(su * 2 * np.pi * 9) > 0.2)
        col = np.where(frange[:, None], col * 0.82, col)
        col = np.where(~face[:, None], col * 0.7, col)
        rug, met = np.full(len(P), 0.86), np.zeros(len(P))
    elif m in ('tissu', 'tunique', 'cape'):
        col, rug, met = gris(P, N)
        masque[:] = 1
        if m == 'cape':
            col = mix(col, col * 0.84, ss(0.955, 0.97, ST[:, 1]))
            col = col * (1 - 0.14 * np.exp(-((ST[:, 1] - 0.94) / 0.004) ** 2))[:, None]
        elif m == 'tunique':
            col = col * (1 - 0.14 * np.exp(-((y - 0.725) / 0.004) ** 2))[:, None]
            col = mix(col, col * 0.86, ss(0.72, 0.712, y))
        else:
            col = col * (1 - 0.14 * np.exp(-((ax - 0.272) / 0.003) ** 2))[:, None]
            col = mix(col, col * 0.86, ss(0.275, 0.285, ax))
    else:
        raise ValueError(m)
    return np.clip(col, 0, 1), np.clip(rug, 0.05, 1), np.clip(met, 0, 1), masque


def dilater(img, plein, n=12):
    """Étend les bords peints sur les pixels vides (évite les coutures en mip-map)."""
    img = img.copy()
    plein = plein.copy()
    for _ in range(n):
        acc = np.zeros_like(img)
        cnt = np.zeros(plein.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            m = np.roll(np.roll(plein, dy, 0), dx, 1)
            acc += np.roll(np.roll(img, dy, 0), dx, 1) * m[..., None]
            cnt += m
        neuf = (~plein) & (cnt > 0)
        img[neuf] = acc[neuf] / cnt[neuf][:, None]
        plein |= neuf
    # le reste de l'atlas : couleur moyenne
    img[~plein] = img[plein].mean(0)
    return img


# ---------------------------------------------------------------------------------------------
# Export glTF binaire
# ---------------------------------------------------------------------------------------------
def png(arr):
    b = io.BytesIO()
    Image.fromarray(arr).save(b, 'PNG', optimize=True)
    return b.getvalue()


def ecrire_glb(chemin, P, N, UV, JI, JW, I, images):
    blobs, vues, accs = [], [], []
    def vue(data, cible=None):
        off = sum(len(b) for b in blobs)
        blobs.append(data + b'\0' * ((4 - len(data) % 4) % 4))
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if cible:
            v['target'] = cible
        vues.append(v)
        return len(vues) - 1

    def acc(arr, comp, typ, cible=None, minmax=False, normalise=False):
        a = {'bufferView': vue(arr.tobytes(), cible), 'componentType': comp, 'count': int(len(arr)), 'type': typ}
        if minmax:
            a['min'] = [float(v) for v in np.atleast_1d(arr.min(0))]
            a['max'] = [float(v) for v in np.atleast_1d(arr.max(0))]
        if normalise:
            a['normalized'] = True
        accs.append(a)
        return len(accs) - 1

    aP = acc(P.astype(np.float32), 5126, 'VEC3', 34962, True)
    aN = acc(N.astype(np.float32), 5126, 'VEC3', 34962)
    aT = acc(UV.astype(np.float32), 5126, 'VEC2', 34962)
    aJ = acc(JI.astype(np.uint8), 5121, 'VEC4', 34962)
    aW = acc(JW.astype(np.float32), 5126, 'VEC4', 34962)
    aI = acc(I.reshape(-1).astype(np.uint16), 5123, 'SCALAR', 34963, True)
    ibm = np.zeros((NB, 16), np.float32)
    for i, n in enumerate(NOMS):
        m = np.eye(4)
        m[:3, 3] = -J[n]
        ibm[i] = m.T.reshape(-1)  # ordre colonne
    aB = acc(ibm, 5126, 'MAT4')
    imgs = [{'bufferView': vue(data), 'mimeType': 'image/png', 'name': nom} for nom, data in images]

    # maillage et racine du squelette à la racine de la scène (recommandation glTF pour un maillage riggé)
    nodes = [{'name': 'Hoplite', 'mesh': 0, 'skin': 0}]
    base = 1
    for i, n in enumerate(NOMS):
        t = J[n] - (J[PARENT[n]] if PARENT[n] else 0)
        nd = {'name': PREFIXE + n, 'translation': [round(float(v), 6) for v in t]}
        enf = [base + IDX[c] for c in ENFANTS[n]]
        if enf:
            nd['children'] = enf
        nodes.append(nd)
    gltf = {
        'asset': {'version': '2.0', 'generator': 'QuenTools fabriquer.py'},
        'scene': 0,
        'scenes': [{'name': 'Hoplite', 'nodes': [0, base]}],
        'nodes': nodes,
        'meshes': [{'name': 'Hoplite', 'primitives': [{
            'attributes': {'POSITION': aP, 'NORMAL': aN, 'TEXCOORD_0': aT, 'JOINTS_0': aJ, 'WEIGHTS_0': aW},
            'indices': aI, 'material': 0}]}],
        'skins': [{'name': 'Squelette', 'joints': [base + i for i in range(NB)],
                   'inverseBindMatrices': aB, 'skeleton': base}],
        'materials': [{'name': 'Hoplite', 'pbrMetallicRoughness': {
            'baseColorTexture': {'index': 0}, 'metallicRoughnessTexture': {'index': 1},
            'metallicFactor': 1.0, 'roughnessFactor': 1.0}}],
        'textures': [{'source': 0, 'sampler': 0}, {'source': 1, 'sampler': 0}],
        'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
        'images': imgs,
        'accessors': accs,
        'bufferViews': vues,
        'buffers': [{'byteLength': sum(len(b) for b in blobs)}],
    }
    js = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False).encode('utf8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    binaire = b''.join(blobs)
    total = 12 + 8 + len(js) + 8 + len(binaire)
    with open(chemin, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(binaire), 0x004E4942) + binaire)


# ---------------------------------------------------------------------------------------------
def main():
    pieces = construire()
    place, densite = ranger(pieces)

    gb = {'id': np.full((TEX, TEX), -1, np.int32), 'attr': np.zeros((TEX, TEX, 8), np.float32)}
    Ps, Ns, UVs, Js, Ws, Fs = [], [], [], [], [], []
    base = 0
    for pid, p in enumerate(pieces):
        P, F, ST = p.P, p.F, p.ST
        if not p.lisse:  # faces plates : un sommet par coin de triangle
            P, ST = P[F.reshape(-1)], ST[F.reshape(-1)]
            F = np.arange(len(P)).reshape(-1, 3)
        N = normales(P, F, p.lisse) if p.lisse else np.repeat(
            (lambda fn: fn / np.linalg.norm(fn, axis=1, keepdims=True))(
                np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])), 3, 0)
        x0, y0, w, h = place[p.partage]
        UVpx = np.stack([x0 + 0.5 + ST[:, 0] * (w - 1), y0 + 0.5 + ST[:, 1] * (h - 1)], 1)
        if getattr(p, 'miroir', False):
            W = p.poids(P * [-1, 1, 1])[:, MIROIR_OS]
        else:
            W = p.poids(P)
        if p.peindre:
            rasteriser(gb, pid, UVpx, F, np.concatenate([P, N, ST], 1))
        Ps.append(P); Ns.append(N); UVs.append(UVpx / TEX); Ws.append(W); Fs.append(F + base)
        base += len(P)

    P = np.vstack(Ps).astype(np.float32)
    N = np.vstack(Ns).astype(np.float32)
    UV = np.vstack(UVs).astype(np.float32)
    W = np.vstack(Ws)
    I = np.vstack(Fs)
    # 4 influences au plus par sommet, normalisées
    ordre = np.argsort(-W, 1)[:, :4]
    JW = np.take_along_axis(W, ordre, 1)
    JW[JW < 0.01] = 0
    JW /= JW.sum(1, keepdims=True)
    JI = np.where(JW > 0, ordre, 0)
    JW = JW.astype(np.float32)
    JW[:, 0] += 1 - JW.sum(1)

    # peinture
    couleur = np.zeros((TEX, TEX, 3))
    rmm = np.zeros((TEX, TEX, 3))  # rugosité, métal, masque
    plein = gb['id'] >= 0
    for pid, p in enumerate(pieces):
        if not p.peindre:
            continue
        m = gb['id'] == pid
        if not m.any():
            continue
        A = gb['attr'][m].astype(float)
        n = A[:, 3:6] / np.maximum(np.linalg.norm(A[:, 3:6], axis=1, keepdims=True), 1e-9)
        col, rug, met, mq = peindre_piece(p, A[:, :3], n, A[:, 6:8])
        couleur[m] = col
        rmm[m] = np.stack([rug, met, mq], 1)
    couleur = dilater(couleur, plein)
    rmm = dilater(rmm, plein)

    os.makedirs(os.path.join(ICI, 'textures'), exist_ok=True)
    c8 = (np.clip(couleur, 0, 1) * 255 + 0.5).astype(np.uint8)
    r8 = (np.clip(rmm[..., 0], 0, 1) * 255 + 0.5).astype(np.uint8)
    m8 = (np.clip(rmm[..., 1], 0, 1) * 255 + 0.5).astype(np.uint8)
    k8 = (np.clip(rmm[..., 2], 0, 1) * 255 + 0.5).astype(np.uint8)
    orm = np.stack([np.full_like(r8, 255), r8, m8], -1)  # glTF : G = rugosité, B = métal
    Image.fromarray(c8).save(os.path.join(ICI, 'textures', 'hoplite_basecolor.png'), optimize=True)
    Image.fromarray(r8).save(os.path.join(ICI, 'textures', 'hoplite_roughness.png'), optimize=True)
    Image.fromarray(m8).save(os.path.join(ICI, 'textures', 'hoplite_metallic.png'), optimize=True)
    Image.fromarray(k8).save(os.path.join(ICI, 'textures', 'hoplite_couleur_joueur.png'), optimize=True)

    ecrire_glb(os.path.join(ICI, 'hoplite.glb'), P, N, UV, JI, JW, I,
               [('hoplite_basecolor', png(c8)), ('hoplite_metal_rugosite', png(orm))])

    # contrôles
    tri = len(I)
    taille = P.max(0) - P.min(0)
    erreurs = []
    if not 6000 <= tri <= 10000:
        erreurs.append('triangles hors budget : %d' % tri)
    if len(P) >= 65535:
        erreurs.append('trop de sommets pour des indices 16 bits')
    if not np.allclose(JW.sum(1), 1, atol=1e-5):
        erreurs.append('poids non normalisés')
    print('Triangles : %d  |  sommets : %d  |  os : %d' % (tri, len(P), NB))
    print('Hauteur : %.2f m (cimier compris)  |  envergure : %.2f m  |  densité : %.0f px/m'
          % (taille[1], taille[0], densite))
    print('Écrit : hoplite.glb (%.1f Mo) + textures/' % (os.path.getsize(os.path.join(ICI, 'hoplite.glb')) / 1e6))
    if erreurs:
        print('ERREURS :', *erreurs, sep='\n  ')
        sys.exit(1)


if __name__ == '__main__':
    main()
