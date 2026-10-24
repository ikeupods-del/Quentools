"""Navires de l'Antiquité au futur : coque, mâts, voiles (couleur du joueur), rames, tourelles.

Os : Root (coque), Sail* (voiles, pour le vent), Oars_L / Oars_R (bancs de rames), Turret* (tourelles).
Proue vers +Z, ligne de flottaison à y = 0 (la coque descend sous l'eau).
"""
import math

import numpy as np

from moteur import Mat, ss, mix, rot_x, rot_y, rot_z, boite, chemin, bande
from machines import Machine, pal as pal_machines, planches


def coque(m, nom, L, larg, pont, quille, proue=0.6, poupe=0.6, R=16, K=16, mat='bois', decor=(), plat=0.0):
    """Coque : sections en U fermées par le pont, de la poupe (-L/2) à la proue (+L/2)."""
    K = m.k(K)
    n = K // 2
    ann = []
    for i, t in enumerate(np.linspace(0, 1, R)):
        z = -L / 2 + L * t
        f = math.sin(math.pi * t) ** (0.55 if plat == 0 else 0.35)
        w = larg / 2 * max(f, 0.0)
        yd = pont + proue * ss(0.75, 1.0, t) ** 1.6 + poupe * ss(0.25, 0.0, t) ** 1.6
        yk = -quille * (0.35 + 0.65 * f)
        if w < 1e-4:
            ann.append(np.array([[0, yd, z]] * (2 * n)))
            continue
        a = np.linspace(0, math.pi, n)
        x = w * np.cos(a)
        y = yd - (yd - yk) * np.sin(a) ** (0.7 + plat)
        dessous = np.stack([x, y, np.full(n, z)], 1)
        dessus = np.stack([np.linspace(-w, w, n), np.full(n, yd), np.full(n, z)], 1)[1:-1]
        ann.append(np.vstack([dessous, dessus]))
    m.ajoute(nom, [r if len(r) == len(ann[1]) else np.repeat(r[:1], len(ann[1]), 0) for r in ann], mat,
             decor=list(decor))


def coque_deco(flottaison='sombre', bande_joueur=(0.25, 0.45), pont='bois_clair', yd=1.0):
    def f(c):
        c.col = c.col * (1 - 0.25 * (np.abs(((c.y * 6.5) % 1) - 0.5) > 0.45))[:, None]
        c.poser(flottaison, c.y < 0.08)
        lo, hi = bande_joueur
        c.poser('joueur', (c.y > yd - hi) & (c.y < yd - lo) & (np.abs(c.N[:, 1]) < 0.7))
        c.poser(pont, c.N[:, 1] > 0.85)
    return f


def voile(m, nom, centre, larg, haut, m_voile='joueur_tissu', bombe=0.25, K=8, decor=(), latine=False):
    cx, cy, cz = centre
    K = m.k(K)
    ext, inte = [], []
    for t in np.linspace(0, 1, 6):
        y = cy + haut / 2 - haut * t
        w = larg / 2 * ((1 - 0.85 * t) if latine else (1 + 0.08 * t))
        xs = np.linspace(-w, w, K)
        z = cz + bombe * (1 - (xs / max(w, 1e-6)) ** 2) * math.sin(math.pi * (0.15 + 0.7 * t))
        e = np.stack([cx + xs, np.full(K, y), z], 1)
        ext.append(e); inte.append(e - [0, 0, 0.03])
    m.ajoute(nom, bande(ext, inte, fermer=True), m_voile, decor=list(decor))


def mat(m, nom, x, z, y0, y1, r, vergues=(), mat_='bois_fonce'):
    m.tube(nom, [(x, y0, z), (x, y1, z)], [r, r * 0.7], mat_, K=m.k(8))
    for i, (y, larg) in enumerate(vergues):
        m.tube('%s_vergue%d' % (nom, i), [(x - larg / 2, y, z + 0.12), (x + larg / 2, y, z + 0.12)], [r * 0.5, r * 0.5], mat_, K=m.k(6))


def rames(m, cote, n, z0, z1, y, x, longueur, os_):
    ancien = m.os
    m.os = os_
    for i, z in enumerate(np.linspace(z0, z1, n)):
        a = np.array([cote * x, y, z])
        b = a + [cote * longueur * 0.8, -longueur * 0.55, -0.15]
        p = m.poutre('rame_%s%02d' % ('L' if cote > 0 else 'R', i), a, b, (0.05, 0.05), 'bois', K=4)
        p.partage = 'rame'
        p.peindre = (i == 0 and cote > 0)
    m.os = ancien


def boucliers(m, cote, n, z0, z1, y, x, r=0.30):
    for i, z in enumerate(np.linspace(z0, z1, n)):
        m.disque('bouclier_%s%02d' % ('L' if cote > 0 else 'R', i), r, 0.04, 'joueur', K=m.k(12), centre=(0, 0, 0))
        p = m.pieces[-1]
        p.P = p.P @ rot_y(cote * math.pi / 2).T + [cote * x, y, z]
        p.partage = 'bouclier'
        p.peindre = (i == 0 and cote > 0)
        p.decor = [lambda c: c.poser('fer', np.hypot(c.ST[:, 1] - 0.0, 0) < 0.12)]


def oeil(z, y, x, r=0.22):
    def f(c):
        m_ = (np.hypot(c.z - z, c.y - y) < r) & (np.abs(np.abs(c.x) - x) < 0.6)
        c.col = np.where(m_[:, None], np.array([0.92, 0.90, 0.85]), c.col)
        m2 = (np.hypot(c.z - z, c.y - y) < r * 0.5) & (np.abs(np.abs(c.x) - x) < 0.6)
        c.col = np.where(m2[:, None], np.array([0.05, 0.05, 0.05]), c.col)
    return f


# ---------------------------------------------------------------------------------------------
def trireme(q=1.0):
    os_ = [('Root', None, (0, 0, 0)), ('Sail', 'Root', (0, 6.0, 0.5)), ('Oars_L', 'Root', (1.3, 1.0, 0)),
           ('Oars_R', 'Root', (-1.3, 1.0, 0))]
    m = Machine(os_, q)
    coque(m, 'coque', 14.0, 2.8, 1.25, 0.9, proue=0.5, poupe=1.4, decor=[coque_deco(yd=1.25), oeil(6.2, 0.95, 0.6)])
    m.tube('eperon', [(0, 0.25, 6.6), (0, 0.25, 7.6), (0, 0.25, 7.9)], [0.25, 0.16, 0.0], 'bronze_c', K=m.k(8))
    m.tube('queue', [(0, 2.0, -6.8), (0, 2.9, -7.4), (0, 3.3, -6.9)], [0.18, 0.12, 0.0], 'bois_fonce', K=m.k(8))
    mat(m, 'mat', 0, 0.5, 1.2, 7.2, 0.12, vergues=[(6.6, 4.8)])
    m.os = 'Sail'
    voile(m, 'voile', (0, 4.9, 0.62), 4.6, 3.4, decor=[lambda c: c.poser('blanc', np.abs(c.x) < 0.35)])
    m.os = 'Root'
    for s, n in ((1, 'L'), (-1, 'R')):
        rames(m, s, 9, -4.5, 4.0, 1.0, 1.3, 2.6, 'Oars_' + n)
    return m.pieces, pal_machines(), m.sq


def drakkar(q=1.0):
    os_ = [('Root', None, (0, 0, 0)), ('Sail', 'Root', (0, 5.5, 0.2)), ('Oars_L', 'Root', (1.4, 0.9, 0)),
           ('Oars_R', 'Root', (-1.4, 0.9, 0))]
    m = Machine(os_, q)
    coque(m, 'coque', 12.0, 3.0, 1.05, 0.7, proue=1.6, poupe=1.6, decor=[coque_deco(yd=1.05, bande_joueur=(0.10, 0.20))])
    m.tube('dragon', [(0, 2.5, 5.9), (0, 3.4, 6.3), (0, 3.9, 6.2), (0, 4.1, 6.5), (0, 4.0, 6.9)],
           [0.16, 0.14, 0.13, 0.15, 0.0], 'bois_fonce', K=m.k(8),
           decor=[lambda c: c.poser('or', c.y > 3.85)])
    m.tube('queue', [(0, 2.5, -5.9), (0, 3.3, -6.3), (0, 3.6, -6.0), (0, 3.5, -5.8)], [0.16, 0.13, 0.08, 0.0],
           'bois_fonce', K=m.k(8))
    mat(m, 'mat', 0, 0.2, 1.0, 6.8, 0.12, vergues=[(6.3, 5.0)])
    m.os = 'Sail'
    voile(m, 'voile', (0, 4.6, 0.32), 4.8, 3.3, decor=[lambda c: c.poser('blanc', ((c.x + 3) / 0.6 % 2) < 1)])
    m.os = 'Root'
    for s, n in ((1, 'L'), (-1, 'R')):
        boucliers(m, s, 7, -3.6, 3.6, 1.15, 1.45, 0.32)
        rames(m, s, 7, -3.6, 3.6, 0.85, 1.4, 2.4, 'Oars_' + n)
    return m.pieces, pal_machines(), m.sq


def jonque(q=1.0):
    os_ = [('Root', None, (0, 0, 0)), ('Sail1', 'Root', (0, 6.5, 2.0)), ('Sail2', 'Root', (0, 7.5, -0.8)),
           ('Sail3', 'Root', (0, 5.0, -4.2))]
    m = Machine(os_, q)
    coque(m, 'coque', 13.0, 3.6, 1.4, 0.9, proue=0.9, poupe=2.2, plat=0.4,
          decor=[coque_deco(yd=1.4, bande_joueur=(0.2, 0.45)), oeil(5.8, 1.3, 0.9, 0.3)])
    m.ajoute('chateau', boite((0, 2.6, -4.6), (3.0, 1.4, 2.6), K=m.k(8), arrondi=0.25), 'bois', lisse=False,
             decor=[planches, lambda c: c.poser('joueur', c.y > 3.1)])
    for i, (z, h, nom) in enumerate(((2.0, 9.0, 'Sail1'), (-0.8, 10.5, 'Sail2'), (-4.2, 7.0, 'Sail3'))):
        mat(m, 'mat%d' % i, 0, z, 1.3, h, 0.13)
        m.os = nom
        voile(m, 'voile%d' % i, (0, 1.3 + h * 0.55, z + 0.2), 3.6 - i * 0.3, h * 0.7, m_voile='joueur_tissu', bombe=0.15,
              decor=[lambda c: c.trait(np.abs(((c.y * 1.6) % 1) - 0.5) - 0.5, 0.03, 0.6)])
        m.os = 'Root'
    return m.pieces, pal_machines(), m.sq


def galion(q=1.0):
    os_ = [('Root', None, (0, 0, 0)), ('Sail1', 'Root', (0, 9.0, 3.5)), ('Sail2', 'Root', (0, 11.0, 0.0)),
           ('Sail3', 'Root', (0, 8.0, -4.0))]
    m = Machine(os_, q)
    coque(m, 'coque', 16.0, 4.6, 2.2, 1.6, proue=1.0, poupe=1.2,
          decor=[coque_deco(yd=2.2, bande_joueur=(0.25, 0.55)), _sabords])
    m.ajoute('chateau_arriere', boite((0, 3.8, -5.6), (4.0, 2.4, 3.6), K=m.k(8), arrondi=0.3), 'bois', lisse=False,
             decor=[planches, _sabords, lambda c: c.poser('or', c.y > 4.85)])
    m.ajoute('chateau_avant', boite((0, 3.3, 5.6), (3.0, 1.3, 2.4), K=m.k(8), arrondi=0.3), 'bois', lisse=False,
             decor=[planches, lambda c: c.poser('or', c.y > 3.85)])
    m.tube('beaupre', [(0, 3.4, 7.2), (0, 5.2, 10.5)], [0.14, 0.08], 'bois_fonce', K=m.k(6))
    for i, (z, h, nom, larg) in enumerate(((3.5, 13.0, 'Sail1', 5.5), (0.0, 15.5, 'Sail2', 6.4), (-4.0, 11.5, 'Sail3', 4.6))):
        mat(m, 'mat%d' % i, 0, z, 2.0, h, 0.18, vergues=[(h * 0.55, larg), (h * 0.88, larg * 0.75)])
        m.os = nom
        voile(m, 'voile_b%d' % i, (0, h * 0.42, z + 0.25), larg * 0.95, h * 0.26, decor=[_croix_voile])
        voile(m, 'voile_h%d' % i, (0, h * 0.73, z + 0.25), larg * 0.72, h * 0.22)
        m.os = 'Root'
    m.tube('pavillon_mat', [(0, 15.5, 0.0), (0, 16.6, 0.0)], [0.05, 0.04], 'bois_fonce', K=4)
    m.ajoute('pavillon', bande([np.array([[0, y, 0.05 + 0.0 * y] for y in np.linspace(16.5, 16.0, 4)]),
                                np.array([[0.04, y, 1.2] for y in np.linspace(16.5, 16.0, 4)])],
                               [np.array([[0, y, 0.02] for y in np.linspace(16.5, 16.0, 4)]),
                                np.array([[0.0, y, 1.2] for y in np.linspace(16.5, 16.0, 4)])], fermer=True), 'joueur_tissu')
    return m.pieces, pal_machines(), m.sq


def _sabords(c):
    m_ = (np.abs(c.y - 1.55) < 0.17) & (np.abs(((c.z * 0.9) % 1) - 0.5) < 0.16) & (np.abs(c.N[:, 1]) < 0.5)
    c.col = np.where(m_[:, None], np.array([0.05, 0.04, 0.03]), c.col)


def _croix_voile(c):
    """Croix blanche (hors couleur du joueur) au centre de la grande voile."""
    u, v = c.ST[:, 0], c.ST[:, 1]
    face = u < 0.5
    c.poser('blanc', face & ((np.abs(u - 0.25) < 0.025) | (np.abs(v - 0.5) < 0.06)))


def barque(q=1.0):
    """Barque de pêche (villageois) : coque, petit mât, voile, filet."""
    os_ = [('Root', None, (0, 0, 0)), ('Sail', 'Root', (0, 2.8, 0.0))]
    m = Machine(os_, q)
    coque(m, 'coque', 5.0, 1.8, 0.7, 0.45, proue=0.35, poupe=0.25, decor=[coque_deco(yd=0.7, bande_joueur=(0.05, 0.18))])
    mat(m, 'mat', 0, 0.6, 0.5, 4.0, 0.07)
    m.os = 'Sail'
    voile(m, 'voile', (0.6, 2.5, 0.4), 2.0, 2.6, latine=True, bombe=0.2)
    m.os = 'Root'
    m.ajoute('filet', boite((0, 0.80, -1.2), (0.9, 0.25, 0.8), K=m.k(8), arrondi=0.8), 'corde')
    m.ajoute('caisse', boite((0, 0.82, 1.1), (0.5, 0.3, 0.45), K=4, arrondi=0.2), 'bois', lisse=False, decor=[planches])
    return m.pieces, pal_machines(), m.sq


def cuirasse(q=1.0):
    os_ = [('Root', None, (0, 0, 0)), ('Turret1', 'Root', (0, 3.3, 7.0)), ('Gun1', 'Turret1', (0, 3.6, 8.3)),
           ('Turret2', 'Root', (0, 3.3, -7.5)), ('Gun2', 'Turret2', (0, 3.6, -8.8))]
    m = Machine(os_, q)
    coque(m, 'coque', 26.0, 5.0, 2.6, 2.4, proue=0.6, poupe=0.1, mat='gris_mil',
          decor=[coque_deco('rouge', yd=2.6, bande_joueur=(0.3, 0.7), pont='bois_clair')])
    m.ajoute('superstructure', boite((0, 4.0, -0.5), (3.0, 2.8, 8.0), K=m.k(6), arrondi=0.15), 'gris_mil', lisse=False,
             decor=[lambda c: c.poser('sombre', (np.abs(c.y - 4.3) < 0.12) & (np.abs(c.N[:, 1]) < 0.5))])
    m.ajoute('passerelle', boite((0, 6.0, 1.8), (2.4, 1.2, 2.4), K=m.k(6), arrondi=0.2), 'gris_mil', lisse=False,
             decor=[lambda c: c.poser('vitre', (np.abs(c.y - 6.2) < 0.18) & (c.z > 2.8))])
    for z in (0.0, -2.8):
        m.tube('cheminee%d' % int(z), [(0, 5.0, z), (0, 8.0, z - 0.4)], [(0.55, 0.75), (0.5, 0.7)], 'gris_mil', K=m.k(10),
               decor=[lambda c: c.poser('joueur_metal', np.abs(c.y - 7.3) < 0.25), lambda c: c.poser('sombre', c.y > 7.8)])
    m.tube('mat', [(0, 6.6, 1.8), (0, 11.5, 1.8)], [0.12, 0.06], 'gris_mil', K=6)
    for i, (z, s) in enumerate(((7.0, 1), (-7.5, -1))):
        m.os = 'Turret%d' % (i + 1)
        m.ajoute('tourelle%d' % (i + 1), boite((0, 3.35, z), (2.4, 1.1, 2.6), K=m.k(10), arrondi=0.7), 'gris_mil',
                 decor=[lambda c: c.poser('joueur_metal', c.y > 3.75)])
        m.os = 'Gun%d' % (i + 1)
        for x in (0.45, -0.45):
            m.tube('canon%d%d' % (i, x > 0), [(x, 3.5, z + s * 1.1), (x, 3.55, z + s * 5.0)], [0.16, 0.12], 'gris_mil', K=m.k(8))
    return m.pieces, pal_machines() | {'rouge': Mat('peinture', (0.45, 0.12, 0.10), rug=0.6)}, m.sq


def vedette(q=1.0):
    os_ = [('Root', None, (0, 0, 0)), ('Turret', 'Root', (0, 2.1, 3.2))]
    m = Machine(os_, q)
    coque(m, 'coque', 11.0, 3.0, 1.4, 0.8, proue=0.6, poupe=0.0, plat=0.5, mat='gris_mil',
          decor=[coque_deco('sombre', yd=1.4, bande_joueur=(0.15, 0.4), pont='gris_mil')])
    m.ajoute('cabine', boite((0, 2.3, -0.6), (2.2, 1.7, 3.6), K=m.k(8), arrondi=0.3), 'gris_mil',
             decor=[lambda c: c.poser('vitre', (c.y > 2.5) & (c.y < 2.9) & (c.z > 0.8))])
    m.tube('antenne', [(0, 3.1, -1.2), (0, 5.0, -1.4)], [0.05, 0.02], 'gris_mil', K=4)
    m.os = 'Turret'
    m.ajoute('tourelle', boite((0, 2.0, 3.2), (0.9, 0.6, 0.9), K=m.k(8), arrondi=0.8), 'gris_mil',
             decor=[lambda c: c.poser('joueur_metal', c.y > 2.15)])
    m.tube('canon', [(0, 2.05, 3.6), (0, 2.05, 5.0)], [0.08, 0.06], 'noir', K=m.k(6))
    return m.pieces, pal_machines(), m.sq


def croiseur_spatial(q=1.0):
    """Croiseur futuriste flottant (naval ou spatial) : coque effilée, réacteurs, deux tourelles."""
    os_ = [('Root', None, (0, 0, 0)), ('Turret1', 'Root', (0, 3.6, 4.0)), ('Turret2', 'Root', (0, 3.75, -1.5))]
    m = Machine(os_, q)
    m.tube('coque', [(0, 2.0, -9.0), (0, 2.2, -6.0), (0, 2.4, 0.0), (0, 2.2, 6.0), (0, 2.0, 9.5), (0, 2.0, 10.5)],
           [(1.6, 0.75), (2.6, 0.95), (3.0, 1.0), (2.3, 0.85), (0.8, 0.45), (0.0, 0.0)], 'coque_f', K=m.k(16), haut=(0, 1, 0),
           decor=[lambda c: c.poser('joueur_metal', np.abs(c.x) > 2.0), lambda c: c.poser('cyan', np.abs(c.y - 2.0) < 0.06)])
    for s in (1, -1):
        m.tube('aileron%d' % (s > 0), [(s * 2.3, 2.2, -5.0), (s * 4.2, 1.8, -7.5)], [(0.6, 0.12), (0.2, 0.06)],
               'coque_f', K=m.k(6), haut=(0, 1, 0))
        m.tube('reacteur%d' % (s > 0), [(s * 1.4, 2.0, -8.5), (s * 1.4, 2.0, -10.2)], [0.75, 0.65], 'gris_mil', K=m.k(10),
               decor=[lambda c: c.poser('cyan', c.z < -10.0)])
    m.ajoute('pont', boite((0, 3.9, -4.0), (2.0, 1.6, 3.5), K=m.k(8), arrondi=0.6), 'coque_f',
             decor=[lambda c: c.poser('cyan', (np.abs(c.y - 4.1) < 0.1) & (c.z > -2.5)),
                    lambda c: c.poser('joueur_metal', c.y > 4.5)])
    for i, (z, nom) in enumerate(((4.0, 'Turret1'), (-1.5, 'Turret2'))):
        m.os = nom
        yt = 3.6 + 0.15 * i
        m.ajoute('tourelle%d' % i, boite((0, yt, z), (1.6, 0.6, 1.6), K=m.k(10), arrondi=0.8), 'coque_f',
                 decor=[lambda c, yt=yt: c.poser('joueur_metal', c.y > yt + 0.15)])
        for x in (0.3, -0.3):
            m.tube('canon%d%d' % (i, x > 0), [(x, yt + 0.05, z + 0.6), (x, yt + 0.05, z + 2.6)], [0.10, 0.08], 'gris_mil', K=m.k(8),
                   decor=[lambda c: c.poser('cyan', c.z > z + 2.5)])
        m.os = 'Root'
    return m.pieces, pal_machines(), m.sq


NAVIRES = [
    ('1-antiquite', 'trireme', 'Trirème', 'Grèce antique', trireme, 2048),
    ('2-moyen-age', 'drakkar', 'Drakkar', 'Vikings', drakkar, 2048),
    ('2-moyen-age', 'jonque', 'Jonque', 'Chine', jonque, 2048),
    ('2-moyen-age', 'barque', 'Barque de pêche', 'Toutes époques', barque, 1024),
    ('3-epoque-moderne', 'galion', 'Galion', 'Espagne, Europe', galion, 2048),
    ('5-xxe-siecle', 'cuirasse', 'Cuirassé', 'XXe siècle', cuirasse, 2048),
    ('6-contemporain', 'vedette', 'Vedette rapide', 'Monde moderne', vedette, 1024),
    ('7-futur', 'croiseur', 'Croiseur futuriste', 'Futur', croiseur_spatial, 2048),
]
