"""Moteur commun des personnages et accessoires 3D : squelette, géométrie, poids de peau,
atlas de texture, peinture des matières et export glTF binaire (.glb).

Repères : mètres, Y vers le haut, le personnage regarde vers +Z, sa gauche est +X (conventions glTF).
Tous les personnages partagent le même squelette (noms et hiérarchie Mixamo, 65 os).
"""
import io
import json
import math
import struct

import numpy as np
from PIL import Image

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
    """Un morceau du maillage : sommets, triangles, coordonnées locales (s, t) dans [0,1].
    mats : clés de matières de la palette ; zones(P, N, ST) -> indice de matière par texel ;
    decor : fonctions de peinture des détails (voir Ctx)."""

    def __init__(self, nom, P, F, ST, taille, mats, poids, lisse=True, partage=None, zones=None, decor=()):
        self.nom, self.P, self.F, self.ST = nom, np.asarray(P, float), np.asarray(F, int), np.asarray(ST, float)
        self.taille = taille          # (largeur, hauteur) en mètres dans l'atlas
        self.mats = [mats] if isinstance(mats, str) else list(mats)
        self.zones = zones
        self.decor = list(decor)
        self.poids = poids            # fonction P -> matrice (n, NB)
        self.lisse = lisse
        self.partage = partage or nom  # même clé = même zone de texture
        self.peindre = True
        self.miroir = False


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
# Atlas de texture (rangement par étagères, densité uniforme)
# ---------------------------------------------------------------------------------------------
def ranger(pieces, tex, marge=8):
    zones = {}
    for p in pieces:
        zones.setdefault(p.partage, p.taille)
    lo, hi = 20.0, 6000.0
    for _ in range(40):
        s = (lo + hi) / 2
        if _placer(zones, s, marge, tex) is None:
            hi = s
        else:
            lo = s
    return _placer(zones, lo, marge, tex), lo


def _placer(zones, s, marge, tex):
    rects = sorted(((k, max(int(w * s), 12), max(int(h * s), 12)) for k, (w, h) in zones.items()),
                   key=lambda r: (-r[2], -r[1]))
    x = y = h_rang = 0
    out = {}
    for k, w, h in rects:
        if w + 2 * marge > tex:
            return None
        if x + w + 2 * marge > tex:
            x, y, h_rang = 0, y + h_rang, 0
        if y + h + 2 * marge > tex:
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




# ---------------------------------------------------------------------------------------------
# Formes génériques
# ---------------------------------------------------------------------------------------------
def repere(d, haut=(0, 1, 0)):
    """Deux vecteurs perpendiculaires à la direction d."""
    d = np.asarray(d, float)
    d = d / max(np.linalg.norm(d), 1e-12)
    h = np.asarray(haut, float)
    if abs(float(d @ h)) > 0.95:
        h = np.array([1.0, 0, 0]) if abs(d[0]) < 0.9 else np.array([0, 0, 1.0])
    u = np.cross(d, h)
    u /= np.linalg.norm(u)
    v = np.cross(u, d)
    return u, v


def chemin(points, rayons, K, haut=(0, 1, 0), aplat=1.0, poles=True):
    """Tube le long d'une ligne brisée ; rayons = r ou (ru, rv) ; pôles aux deux bouts si poles."""
    P = [np.asarray(p, float) for p in points]
    th = np.arange(K) * 2 * np.pi / K
    ann = []
    for i, c in enumerate(P):
        d = P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]
        u, v = repere(d, haut)
        r = rayons[i]
        ru, rv = (r, r * aplat) if np.isscalar(r) else r
        ann.append(c + np.outer(ru * np.cos(th), u) + np.outer(rv * np.sin(th), v))
    if poles:
        ann = [P[0][None].repeat(K, 0)] + ann + [P[-1][None].repeat(K, 0)]
    return ann


def boite(c, taille, K=None, arrondi=0.35, rot=None):
    """Boîte aux coins arrondis (anneaux superellipse le long de Y), centrée en c."""
    sx, sy, sz = [t / 2 for t in taille]
    K = K or 12
    n = 2 / max(arrondi, 0.05)
    ann = []
    ys = [-sy, -sy * 0.97, -sy * 0.8, 0, sy * 0.8, sy * 0.97, sy]
    rs = [0.0, 0.7, 0.97, 1.0, 0.97, 0.7, 0.0]
    for y, r in zip(ys, rs):
        x, z = superellipse(K, sx * max(r, 1e-9), sz * max(r, 1e-9), sz * max(r, 1e-9), n=max(n, 2.0), debut=np.pi / K)
        pts = np.stack([x, np.full(K, y), z], 1)
        if rot is not None:
            pts = pts @ np.asarray(rot).T
        ann.append(np.asarray(c, float) + pts)
    return ann


def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def bande(courbes_ext, courbes_int, fermer=False):
    """Anneaux fermés faits d'une courbe extérieure et d'une courbe intérieure (tissu ou plaque épaisse) ;
    fermer : bords de début et de fin refermés (plaque sans trou)."""
    ann = [np.vstack([np.asarray(e, float), np.asarray(i, float)[::-1]]) for e, i in zip(courbes_ext, courbes_int)]
    if fermer:
        def milieu(e, i):
            m = (np.asarray(e, float) + np.asarray(i, float)) / 2
            return np.vstack([m, m[::-1]])
        ann = [milieu(courbes_ext[0], courbes_int[0])] + ann + [milieu(courbes_ext[-1], courbes_int[-1])]
    return ann


# ---------------------------------------------------------------------------------------------
# Matières peintes
# ---------------------------------------------------------------------------------------------
GRIS_JOUEUR = (0.84, 0.84, 0.84)


class Mat:
    """style : metal, tissu, peau, cuir, bois, fourrure, cheveux, plumes, peinture, lumiere, sombre, mailles, pierre.
    joueur=True : zone teintée par la couleur du joueur (peinte en gris clair, masque blanc)."""

    def __init__(self, style, couleur=(0.5, 0.5, 0.5), rug=None, metal=None, joueur=False, clair=None, motif=None):
        self.style = style
        self.couleur = np.array(GRIS_JOUEUR if joueur else couleur, float)
        self.joueur = joueur
        self.clair = None if clair is None else np.array(clair, float)
        self.motif = motif
        defaut = {'metal': (0.32, 0.9), 'mailles': (0.45, 0.85), 'tissu': (0.88, 0.0), 'peau': (0.58, 0.0),
                  'cuir': (0.72, 0.0), 'bois': (0.75, 0.0), 'fourrure': (0.95, 0.0), 'cheveux': (0.75, 0.0),
                  'plumes': (0.8, 0.0), 'peinture': (0.5, 0.0), 'lumiere': (0.3, 0.0), 'sombre': (0.9, 0.0),
                  'pierre': (0.8, 0.0)}[style]
        self.rug = defaut[0] if rug is None else rug
        self.metal = defaut[1] if metal is None else metal


def _ech(s, a=0.5, b=0.6):
    return np.clip((s - a) / b, 0, 1)


def peindre_matiere(m, P, N, ST):
    s, lam = ombre(P, N)
    n = len(P)
    c = m.couleur
    met = np.full(n, m.metal)
    if m.style in ('metal', 'mailles'):
        clair = m.clair if m.clair is not None else c + (1 - c) * 0.55
        col = mix(c * 0.4, c, _ech(s))
        col = mix(col, clair, ss(0.78, 0.99, lam) * 0.55)
        col = col * (1 + bruit(P, 22) * 0.10 + bruit(P * [1, 4, 1], 40, 3) * 0.05 - 0.075)[:, None]
        rug = m.rug + 0.14 * (bruit(P, 30, 5) - 0.5)
        if m.style == 'mailles':
            k = 330.0
            anneau = np.abs(np.sin(P[:, 0] * k + np.sin(P[:, 1] * k) * 1.2) * np.sin(P[:, 1] * k * 0.9)
                            * np.sin(P[:, 2] * k + P[:, 1] * k * 0.5))
            col = col * (0.55 + 0.6 * anneau ** 0.5)[:, None]
            rug = rug + 0.15 * (1 - anneau)
    elif m.style == 'peau':
        col = mix(c * np.array([0.52, 0.42, 0.40]), c, _ech(s))
        col = mix(col, np.minimum(c * 1.13 + 0.03, 1), ss(0.85, 1.0, lam) * 0.3)
        col = col * (1 + bruit(P, 35, 7) * 0.06 - 0.03)[:, None]
        rug = m.rug + 0.08 * (bruit(P, 20, 2) - 0.5)
    elif m.style == 'tissu':
        v = 0.70 + 0.30 * _ech(s, 0.55, 0.55)
        v = v * (1 + bruit(P * [3, 0.6, 3], 25, 11) * 0.05 - 0.025)
        col = c * v[:, None]
        col = mix(col, np.minimum(c * 1.08, 1), ss(0.85, 1.0, lam) * 0.25)
        rug = m.rug + 0.06 * (bruit(P, 15, 4) - 0.5)
    elif m.style == 'cuir':
        col = mix(c * 0.42, c, _ech(s, 0.4, 0.6))
        col = col * (1 + bruit(P, 45, 6) * 0.10 - 0.05)[:, None]
        rug = m.rug + 0.1 * (bruit(P, 40, 6) - 0.5)
    elif m.style == 'bois':
        grain = 0.5 + 0.5 * np.sin(ST[:, 0] * 2 * np.pi * 7 + bruit(P * [1, 0.2, 1], 30, 21) * 6)
        col = mix(c * 0.45, c, _ech(s, 0.45, 0.6) * (0.78 + 0.22 * grain))
        rug = m.rug + 0.1 * grain
    elif m.style in ('fourrure', 'cheveux', 'plumes'):
        f = {'fourrure': (14, 120), 'cheveux': (9, 90), 'plumes': (5, 60)}[m.style]
        mech = 0.6 * bruit(P * [f[0], 1, f[0]], f[1], 12) + 0.4 * bruit(P * [1, 1, 1], 40, 31)
        col = mix(c * 0.38, c, _ech(s, 0.45, 0.6) * (0.55 + 0.6 * mech))
        col = mix(col, np.minimum(c * 1.3 + 0.06, 1), ss(0.8, 1.0, lam) * 0.3 * mech)
        rug = m.rug + 0.1 * mech
    elif m.style == 'peinture':
        col = mix(c * 0.5, c, _ech(s, 0.5, 0.55))
        col = mix(col, np.minimum(c + 0.25, 1), ss(0.82, 1.0, lam) * 0.4)
        col = col * (1 + bruit(P, 18, 17) * 0.04 - 0.02)[:, None]
        rug = m.rug + 0.08 * (bruit(P, 25, 9) - 0.5)
    elif m.style == 'pierre':
        col = mix(c * 0.45, c, _ech(s)) * (0.85 + 0.3 * bruit(P, 60, 41))[:, None]
        rug = np.full(n, m.rug)
    elif m.style == 'lumiere':
        col = np.tile(c, (n, 1)) * (0.92 + 0.08 * lam)[:, None]
        rug = np.full(n, m.rug)
    else:  # sombre
        col = np.tile(c, (n, 1)) * (0.8 + 0.2 * s)[:, None]
        rug = np.full(n, m.rug)
    return col, np.asarray(rug, float) * np.ones(n), met


class Ctx:
    """Texels d'une pièce pendant la peinture des détails ; les tableaux sont modifiables sur place."""

    def __init__(self, piece, pal, P, N, ST, idx):
        self.piece, self.pal, self.P, self.N, self.ST, self.idx = piece, pal, P, N, ST, idx
        L = P
        xf = getattr(piece, 'xf', None)
        if xf is not None:  # pièces de la tête : dessin dans le repère d'origine (avant grossissement)
            L = xf[0] + (P - xf[0]) / xf[1]
        self.L = L
        self.x, self.y, self.z = L[:, 0], L[:, 1], L[:, 2]
        self.ax = np.abs(self.x)
        self.col = np.zeros((len(P), 3))
        self.rug = np.zeros(len(P))
        self.met = np.zeros(len(P))
        self.msk = np.zeros(len(P))

    def de(self, cle):
        """Masque des texels peints avec la matière cle."""
        if cle not in self.piece.mats:
            return np.zeros(len(self.P), bool)
        return self.idx == self.piece.mats.index(cle)

    def poser(self, cle, m):
        """Repeint les texels du masque m avec la matière cle de la palette."""
        if not np.any(m):
            return
        mat = self.pal[cle]
        c, r, me = peindre_matiere(mat, self.P[m], self.N[m], self.ST[m])
        self.col[m], self.rug[m], self.met[m], self.msk[m] = c, r, me, float(mat.joueur)

    def relief(self, d, w, force=1.0):
        self.col, self.rug = relief(self.col, self.rug, d, w, force)

    def trait(self, d, w, force=0.45, teinte=None):
        t = np.exp(-(d / w) ** 2) * force
        if teinte is None:
            self.col = self.col * (1 - t)[:, None]
        else:
            self.col = mix(self.col, teinte, t)


def zones(defaut, *regles):
    """Matières d'une pièce : défaut puis règles (clé, condition(c: Ctx)) ; la dernière règle vraie l'emporte."""
    mats = [defaut] + [r[0] for r in regles if r[0] != defaut]
    uniq = []
    for m in mats:
        if m not in uniq:
            uniq.append(m)

    def f(c):
        idx = np.zeros(len(c.P), int)
        for cle, cond in regles:
            idx = np.where(cond(c), uniq.index(cle), idx)
        return idx
    return uniq, f


# ---------------------------------------------------------------------------------------------
# Assemblage, peinture, export
# ---------------------------------------------------------------------------------------------
def remplir(img, plein):
    """Étend les bords peints (2 pixels) puis remplit le reste par moyennes successives (pyramide)."""
    img = img.copy()
    plein = plein.copy()
    for _ in range(3):
        acc = np.zeros_like(img)
        cnt = np.zeros(plein.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sl_dst = (slice(max(dy, 0), img.shape[0] + min(dy, 0)), slice(max(dx, 0), img.shape[1] + min(dx, 0)))
            sl_src = (slice(max(-dy, 0), img.shape[0] + min(-dy, 0)), slice(max(-dx, 0), img.shape[1] + min(-dx, 0)))
            acc[sl_dst] += img[sl_src] * plein[sl_src][..., None]
            cnt[sl_dst] += plein[sl_src]
        neuf = (~plein) & (cnt > 0)
        img[neuf] = acc[neuf] / cnt[neuf][:, None]
        plein |= neuf
    # pyramide : chaque niveau = moyenne des pixels pleins
    niveaux = [(img * plein[..., None], plein.astype(float))]
    while niveaux[-1][1].shape[0] > 1:
        s, w = niveaux[-1]
        h = s.shape[0] // 2
        s2 = s.reshape(h, 2, h, 2, -1).sum((1, 3))
        w2 = w.reshape(h, 2, h, 2).sum((1, 3))
        niveaux.append((s2, w2))
    remp = niveaux[-1][0] / np.maximum(niveaux[-1][1], 1e-9)[..., None]
    for s, w in reversed(niveaux[:-1]):
        remp = remp.repeat(2, 0).repeat(2, 1)
        moy = s / np.maximum(w, 1e-9)[..., None]
        remp = np.where((w > 0)[..., None], moy, remp)
    return np.where(plein[..., None], img, remp)


def png(arr):
    b = io.BytesIO()
    Image.fromarray(arr).save(b, 'PNG', compress_level=7)
    return b.getvalue()


def assembler(pieces, pal, tex):
    """Maillage final, poids, atlas et textures peintes."""
    place, densite = ranger(pieces, tex)
    gb_id = np.full((tex, tex), -1, np.int32)
    gb_at = np.zeros((tex, tex, 8), np.float32)
    Ps, Ns, UVs, Ws, Fs = [], [], [], [], []
    base = 0
    rig = pieces[0].poids is not None
    for pid, p in enumerate(pieces):
        P, F, ST = p.P, p.F, p.ST
        if not p.lisse:
            P, ST = P[F.reshape(-1)], ST[F.reshape(-1)]
            F = np.arange(len(P)).reshape(-1, 3)
            fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
            N = np.repeat(fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12), 3, 0)
        else:
            N = normales(P, F, True)
        x0, y0, w, h = place[p.partage]
        UVpx = np.stack([x0 + 0.5 + ST[:, 0] * (w - 1), y0 + 0.5 + ST[:, 1] * (h - 1)], 1)
        if rig:
            W = p.poids(P * [-1, 1, 1])[:, MIROIR_OS] if p.miroir else p.poids(P)
            Ws.append(W)
        if p.peindre:
            rasteriser({'id': gb_id, 'attr': gb_at}, pid, UVpx, F, np.concatenate([P, N, ST], 1))
        Ps.append(P); Ns.append(N); UVs.append(UVpx / tex); Fs.append(F + base)
        base += len(P)
    out = {'P': np.vstack(Ps).astype(np.float32), 'N': np.vstack(Ns).astype(np.float32),
           'UV': np.vstack(UVs).astype(np.float32), 'I': np.vstack(Fs), 'densite': densite}
    if rig:
        W = np.vstack(Ws)
        ordre = np.argsort(-W, 1)[:, :4]
        JW = np.take_along_axis(W, ordre, 1)
        JW[JW < 0.01] = 0
        JW /= JW.sum(1, keepdims=True)
        out['JI'] = np.where(JW > 0, ordre, 0)
        JW = JW.astype(np.float32)
        JW[:, 0] += 1 - JW.sum(1)
        out['JW'] = JW
    couleur = np.zeros((tex, tex, 3))
    rmm = np.zeros((tex, tex, 3))
    for pid, p in enumerate(pieces):
        if not p.peindre:
            continue
        m = gb_id == pid
        if not m.any():
            continue
        A = gb_at[m].astype(float)
        n = A[:, 3:6] / np.maximum(np.linalg.norm(A[:, 3:6], axis=1, keepdims=True), 1e-9)
        c = Ctx(p, pal, A[:, :3], n, A[:, 6:8], np.zeros(len(A), int))
        if p.zones is not None:
            c.idx = p.zones(c)
        for i, cle in enumerate(p.mats):
            c.poser(cle, c.idx == i)
        for d in p.decor:
            d(c)
        couleur[m] = np.clip(c.col, 0, 1)
        rmm[m] = np.stack([np.clip(c.rug, 0.05, 1), np.clip(c.met, 0, 1), np.clip(c.msk, 0, 1)], 1)
    plein = gb_id >= 0
    out['couleur'] = remplir(couleur, plein)
    out['rmm'] = remplir(rmm, plein)
    return out


def ecrire_glb(chemin, M, images, nom):
    blobs, vues, accs = [], [], []

    def vue(data, cible=None):
        off = sum(len(b) for b in blobs)
        blobs.append(data + b'\0' * ((4 - len(data) % 4) % 4))
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if cible:
            v['target'] = cible
        vues.append(v)
        return len(vues) - 1

    def acc(arr, comp, typ, cible=None, minmax=False):
        a = {'bufferView': vue(arr.tobytes(), cible), 'componentType': comp, 'count': int(len(arr)), 'type': typ}
        if minmax:
            a['min'] = [float(v) for v in np.atleast_1d(arr.min(0))]
            a['max'] = [float(v) for v in np.atleast_1d(arr.max(0))]
        accs.append(a)
        return len(accs) - 1

    attrs = {'POSITION': acc(M['P'], 5126, 'VEC3', 34962, True),
             'NORMAL': acc(M['N'], 5126, 'VEC3', 34962),
             'TEXCOORD_0': acc(M['UV'], 5126, 'VEC2', 34962)}
    rig = 'JI' in M
    if rig:
        attrs['JOINTS_0'] = acc(M['JI'].astype(np.uint8), 5121, 'VEC4', 34962)
        attrs['WEIGHTS_0'] = acc(M['JW'], 5126, 'VEC4', 34962)
    ind = M['I'].reshape(-1)
    aI = acc(ind.astype(np.uint16 if ind.max() < 65535 else np.uint32), 5123 if ind.max() < 65535 else 5125,
             'SCALAR', 34963, True)
    noeud = {'name': nom, 'mesh': 0}
    nodes = [noeud]
    scene = [0]
    gltf_extra = {}
    if rig:
        ibm = np.zeros((NB, 16), np.float32)
        for i, n in enumerate(NOMS):
            m = np.eye(4)
            m[:3, 3] = -J[n]
            ibm[i] = m.T.reshape(-1)
        aB = acc(ibm, 5126, 'MAT4')
        base = 1
        for i, n in enumerate(NOMS):
            t = J[n] - (J[PARENT[n]] if PARENT[n] else 0)
            nd = {'name': PREFIXE + n, 'translation': [round(float(v), 6) for v in t]}
            enf = [base + IDX[c] for c in ENFANTS[n]]
            if enf:
                nd['children'] = enf
            nodes.append(nd)
        noeud['skin'] = 0
        scene = [0, base]
        gltf_extra['skins'] = [{'name': 'Squelette', 'joints': [base + i for i in range(NB)],
                                'inverseBindMatrices': aB, 'skeleton': base}]
    imgs = [{'bufferView': vue(data), 'mimeType': 'image/png', 'name': n} for n, data in images]
    gltf = {
        'asset': {'version': '2.0', 'generator': 'QuenTools moteur.py'},
        'scene': 0,
        'scenes': [{'name': nom, 'nodes': scene}],
        'nodes': nodes,
        'meshes': [{'name': nom, 'primitives': [{'attributes': attrs, 'indices': aI, 'material': 0}]}],
        'materials': [{'name': nom, 'pbrMetallicRoughness': {
            'baseColorTexture': {'index': 0}, 'metallicRoughnessTexture': {'index': 1},
            'metallicFactor': 1.0, 'roughnessFactor': 1.0}}],
        'textures': [{'source': 0, 'sampler': 0}, {'source': 1, 'sampler': 0}],
        'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
        'images': imgs,
        'accessors': accs,
        'bufferViews': vues,
        'buffers': [{'byteLength': sum(len(b) for b in blobs)}],
    }
    gltf.update(gltf_extra)
    js = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False).encode('utf8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    binaire = b''.join(blobs)
    with open(chemin, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binaire)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(binaire), 0x004E4942) + binaire)


def exporter(M, dossier, ident, textures_a_part=True):
    import os
    os.makedirs(dossier, exist_ok=True)
    c8 = (np.clip(M['couleur'], 0, 1) * 255 + 0.5).astype(np.uint8)
    r8 = (np.clip(M['rmm'][..., 0], 0, 1) * 255 + 0.5).astype(np.uint8)
    m8 = (np.clip(M['rmm'][..., 1], 0, 1) * 255 + 0.5).astype(np.uint8)
    k8 = (np.clip(M['rmm'][..., 2], 0, 1) * 255 + 0.5).astype(np.uint8)
    orm = np.stack([np.full_like(r8, 255), r8, m8], -1)  # glTF : G = rugosité, B = métal
    ecrire_glb(os.path.join(dossier, ident + '.glb'), M,
               [(ident + '_basecolor', png(c8)), (ident + '_metal_rugosite', png(orm))], ident)
    if textures_a_part:
        t = os.path.join(dossier, 'textures')
        os.makedirs(t, exist_ok=True)
        for suffixe, arr in (('basecolor', c8), ('roughness', r8), ('metallic', m8), ('couleur_joueur', k8)):
            Image.fromarray(arr).save(os.path.join(t, '%s_%s.png' % (ident, suffixe)), compress_level=7)
    return {'triangles': int(len(M['I'])), 'sommets': int(len(M['P'])),
            'hauteur': float(M['P'][:, 1].max() - M['P'][:, 1].min()),
            'joueur': float((k8 > 127).mean())}
