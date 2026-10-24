"""Machines de guerre et véhicules, de l'Antiquité au futur.

Chaque pièce mobile a son os (rotation autour de sa position) : roues (Wheel_*), bras de lancement (Arm), tourelle
(Turret), canon (Barrel), rotor (Rotor), rampe (Ramp)... L'avant est vers +Z, le sol à y = 0.
"""
import math

import numpy as np

from moteur import Squelette, Mat, zones, ss, mix, rot_x, rot_y, rot_z, repere, boite, chemin, bande, bruit
from accessoires import Objet, PAL as PAL_ACC


class Machine(Objet):
    def __init__(self, os_liste, q=1.0):
        super().__init__()
        self.sq = Squelette(os_liste, '')
        self.os = os_liste[0][0]
        self.q = q

    def k(self, n):
        return max(4, 2 * int(round(n * self.q / 2)))

    def ajoute(self, nom, anneaux, m, lisse=True, decor=(), partage=None):
        p = super().ajoute(nom, anneaux, m, lisse=lisse, decor=decor, partage=partage)
        p.poids = self.sq.w_os(self.os)
        return p

    def poutre(self, nom, a, b, ep, m, K=4, decor=(), arrondi=0.25):
        a, b = np.asarray(a, float), np.asarray(b, float)
        d = b - a
        L = np.linalg.norm(d)
        u, v = repere(d / L, (0, 0, 1) if abs(d[1]) > 0.9 * L else (0, 1, 0))
        R = np.stack([u, d / L, v], 1)
        e = ep if np.ndim(ep) else (ep, ep)
        return self.ajoute(nom, boite((a + b) / 2, (e[0], L, e[1]), K=K, arrondi=arrondi, rot=R), m, lisse=False,
                           decor=decor)

    def roue(self, nom, centre, r, larg, m, os_, m_bande=None, rayons=0, cote=1):
        """Roue d'axe X (cote = +1 gauche, -1 droite) liée à l'os os_."""
        ancien = self.os
        self.os = os_
        K = self.k(18)
        th = np.arange(K) * 2 * np.pi / K
        cx, cy, cz = centre
        ann = [np.array([[cx + cote * larg / 2 + cote * 0.01, cy, cz]] * K)]
        for f, dx in ((0.35, larg / 2 + 0.01), (0.85, larg / 2), (1.0, larg / 2), (1.0, -larg / 2), (0.85, -larg / 2),
                      (0.35, -larg / 2 - 0.01)):
            ann.append(np.stack([np.full(K, cx + cote * dx), cy + r * f * np.sin(th), cz + r * f * np.cos(th)], 1))
        ann.append(np.array([[cx - cote * larg / 2 - cote * 0.01, cy, cz]] * K))
        dec = []
        if m_bande:
            dec.append(lambda c: c.poser(m_bande, np.hypot(c.y - cy, c.z - cz) > r * 0.9))
        if rayons:
            def ray(c):
                a = np.arctan2(c.y - cy, c.z - cz)
                rr = np.hypot(c.y - cy, c.z - cz)
                m_ = (np.abs(((a * rayons / (2 * np.pi)) % 1) - 0.5) > 0.38) & (rr < r * 0.85) & (rr > r * 0.2)
                c.col = np.where(m_[:, None], c.col * 0.55, c.col)
            dec.append(ray)
        self.ajoute(nom, ann, m, decor=dec)
        self.os = ancien

    def chenille(self, nom, x, y0, y1, z0, z1, larg, m, os_='Root'):
        ancien = self.os
        self.os = os_
        h = y1 - y0
        self.ajoute(nom, boite((x, (y0 + y1) / 2, (z0 + z1) / 2), (larg, h, z1 - z0), K=self.k(14), arrondi=1.6,
                               rot=rot_z(math.pi / 2) @ rot_x(0) @ np.eye(3) if False else None), m,
                    decor=[lambda c: setattr(c, 'col', c.col * (0.6 + 0.45 * (np.sin(c.ST[:, 1] * c.piece.taille[1] * 40) > 0))[:, None])])
        self.os = ancien


def pal():
    p = dict(PAL_ACC)
    p.update({'toile': Mat('tissu', (0.80, 0.74, 0.60)), 'peau_bete': Mat('cuir', (0.50, 0.36, 0.22)),
              'kaki': Mat('peinture', (0.36, 0.38, 0.26), rug=0.65), 'gris_mil': Mat('peinture', (0.42, 0.44, 0.42), rug=0.6),
              'pneu': Mat('peinture', (0.08, 0.08, 0.08), rug=0.85), 'chenille': Mat('metal', (0.25, 0.25, 0.25), rug=0.6, metal=0.6),
              'vitre': Mat('peinture', (0.20, 0.30, 0.38), rug=0.1, metal=0.4), 'coque_f': Mat('peinture', (0.86, 0.88, 0.90), rug=0.3, metal=0.3),
              'sombre': Mat('sombre', (0.05, 0.05, 0.05)), 'corde': Mat('tissu', (0.70, 0.58, 0.38)),
              'pierre': Mat('pierre', (0.55, 0.53, 0.50)), 'bronze_c': Mat('metal', (0.62, 0.42, 0.20)),
              'joueur_metal': Mat('peinture', joueur=True, rug=0.45)})
    return p


def planches(c):
    """Planches de bois : joints réguliers."""
    m = np.abs(((c.ST[:, 0] * c.piece.taille[0] / 0.14) % 1) - 0.5) > 0.46
    c.col = np.where(m[:, None], c.col * 0.6, c.col)


def bande_joueur(y0, y1):
    return lambda c: c.poser('joueur', (c.y > y0) & (c.y < y1))


# ---------------------------------------------------------------------------------------------
def belier(q=1.0):
    """Bélier couvert : abri à toit de peaux sur 4 roues, tronc ferré suspendu."""
    os_ = [('Root', None, (0, 0, 0)), ('Ram', 'Root', (0, 1.55, 0.0))] + \
          [('Wheel_%s' % n, 'Root', (x, 0.42, z)) for n, x, z in (('FL', 0.78, 1.1), ('FR', -0.78, 1.1), ('BL', 0.78, -1.1), ('BR', -0.78, -1.1))]
    m = Machine(os_, q)
    for x in (0.68, -0.68):
        m.poutre('longeron%d' % (x > 0), (x, 0.45, -1.6), (x, 0.45, 1.6), 0.14, 'bois_fonce', decor=[planches])
        for z in (-1.4, 0.0, 1.4):
            m.poutre('poteau%d%d' % (x > 0, int(z * 10)), (x, 0.45, z), (x * 0.45, 2.15, z), 0.11, 'bois_fonce')
    for z in (-1.4, 0.0, 1.4):
        m.poutre('traverse%d' % int(z * 10), (0.70, 0.45, z), (-0.70, 0.45, z), 0.10, 'bois_fonce')
    K = m.k(10)
    ext, inte = [], []
    for z in np.linspace(-1.65, 1.65, 6):
        xs = np.linspace(-0.98, 0.98, K)
        y = 2.25 - 1.25 * np.abs(xs) ** 1.2
        e = np.stack([xs, y, np.full(K, z)], 1)
        ext.append(e); inte.append(e - [0, 0.04, 0])
    m.ajoute('toit', bande(ext, inte, fermer=True), 'peau_bete',
             decor=[lambda c: setattr(c, 'col', c.col * (0.85 + 0.2 * (np.sin(c.x * 30) > 0))[:, None]),
                    lambda c: c.poser('joueur', (c.y > 1.05) & (c.y < 1.25))])
    m.os = 'Ram'
    m.tube('tronc', [(0, 1.15, -1.5), (0, 1.15, 0.0), (0, 1.15, 1.75)], [0.15, 0.16, 0.15], 'bois', K=m.k(10), poles=False)
    m.ajoute('tete', boite((0, 1.15, 1.92), (0.36, 0.32, 0.36), K=m.k(10), arrondi=0.6), 'fer',
             decor=[lambda c: c.poser('joueur_metal', np.abs(c.z - 1.80) < 0.03)])
    for z in (-0.7, 0.7):
        m.tube('corde%d' % (z > 0), [(0, 2.0, z), (0, 1.30, z)], [0.02, 0.02], 'corde', K=4, poles=False)
    m.os = 'Root'
    for n, x, z in (('FL', 0.78, 1.1), ('FR', -0.78, 1.1), ('BL', 0.78, -1.1), ('BR', -0.78, -1.1)):
        m.roue('roue_' + n, (x, 0.42, z), 0.42, 0.14, 'bois', 'Wheel_' + n, m_bande='fer', rayons=6, cote=1 if x > 0 else -1)
    return m.pieces, pal(), m.sq


def catapulte(q=1.0):
    """Onagre : châssis, bras à cuillère (os Arm), quatre roues."""
    os_ = [('Root', None, (0, 0, 0)), ('Arm', 'Root', (0, 0.80, -0.35))] + \
          [('Wheel_%s' % n, 'Root', (x, 0.30, z)) for n, x, z in (('FL', 0.62, 0.85), ('FR', -0.62, 0.85), ('BL', 0.62, -0.85), ('BR', -0.62, -0.85))]
    m = Machine(os_, q)
    for x in (0.48, -0.48):
        m.poutre('longeron%d' % (x > 0), (x, 0.32, -1.2), (x, 0.32, 1.2), 0.14, 'bois', decor=[planches])
        m.poutre('montant%d' % (x > 0), (x, 0.32, 0.30), (x * 0.7, 1.35, 0.15), 0.12, 'bois')
    m.poutre('butee', (0.42, 1.30, 0.17), (-0.42, 1.30, 0.17), 0.16, 'bois_fonce',
             decor=[lambda c: c.poser('joueur', c.y > -1)])
    for z in (-1.0, -0.35, 0.9):
        m.poutre('traverse%d' % int(z * 10), (0.50, 0.34, z), (-0.50, 0.34, z), 0.11, 'bois')
    m.tube('treuil', [(0.50, 0.55, -0.90), (-0.50, 0.55, -0.90)], [0.07, 0.07], 'bois_fonce', K=m.k(8))
    m.tube('torsion', [(0.45, 0.80, -0.35), (-0.45, 0.80, -0.35)], [0.10, 0.10], 'corde', K=m.k(8))
    m.os = 'Arm'
    m.poutre('bras', (0, 0.80, -0.35), (0, 1.75, -1.0), 0.11, 'bois_fonce')
    K = m.k(10)
    m.ajoute('cuillere', boite((0, 1.80, -1.05), (0.34, 0.12, 0.34), K=K, arrondi=0.9), 'bois_fonce')
    m.ajoute('pierre', boite((0, 1.90, -1.08), (0.22, 0.22, 0.22), K=m.k(8), arrondi=0.9), 'pierre')
    m.os = 'Root'
    for n, x, z in (('FL', 0.62, 0.85), ('FR', -0.62, 0.85), ('BL', 0.62, -0.85), ('BR', -0.62, -0.85)):
        m.roue('roue_' + n, (x, 0.30, z), 0.30, 0.10, 'bois', 'Wheel_' + n, m_bande='fer', rayons=6, cote=1 if x > 0 else -1)
    return m.pieces, pal(), m.sq


def baliste(q=1.0):
    """Baliste sur affût pivotant (os Turret) : arbalète géante, trépied."""
    os_ = [('Root', None, (0, 0, 0)), ('Turret', 'Root', (0, 0.95, 0)), ('Bow', 'Turret', (0, 1.15, 0.45))]
    m = Machine(os_, q)
    for a in (0, 2.1, 4.2):
        m.poutre('pied%d' % int(a), (0, 0.95, 0), (0.75 * math.sin(a), 0.0, 0.75 * math.cos(a)), 0.09, 'bois_fonce')
    m.tube('pivot', [(0, 0.85, 0), (0, 1.02, 0)], [0.10, 0.10], 'fer', K=m.k(10), poles=False)
    m.os = 'Turret'
    m.poutre('glissiere', (0, 1.10, -0.85), (0, 1.12, 0.75), (0.14, 0.10), 'bois', decor=[planches])
    m.ajoute('cadre', boite((0, 1.15, 0.45), (0.55, 0.30, 0.16), K=m.k(8), arrondi=0.3), 'bois_fonce',
             decor=[lambda c: c.poser('joueur', c.y > 1.25)])
    m.tube('carreau', [(0, 1.20, -0.55), (0, 1.20, 0.95)], [0.025, 0.02], 'bois', K=m.k(6))
    m.tube('pointe', [(0, 1.20, 0.95), (0, 1.20, 1.07)], [0.04, 0.0], 'fer', K=m.k(6))
    m.os = 'Bow'
    for s in (1, -1):
        m.tube('bras%d' % (s > 0), [(s * 0.2, 1.15, 0.45), (s * 0.55, 1.17, 0.35), (s * 0.85, 1.18, 0.15)],
               [0.045, 0.035, 0.02], 'bois_fonce', K=m.k(6))
    m.tube('corde', [(0.85, 1.18, 0.15), (0, 1.18, -0.55), (-0.85, 1.18, 0.15)], [0.008] * 3, 'corde', K=4, poles=False)
    return m.pieces, pal(), m.sq


def trebuchet(q=1.0):
    """Trébuchet à contrepoids : portique, bras (os Arm), caisse de contrepoids (os Weight)."""
    os_ = [('Root', None, (0, 0, 0)), ('Arm', 'Root', (0, 3.2, 0)), ('Weight', 'Arm', (0, 3.2, 1.1))]
    m = Machine(os_, q)
    for x in (0.75, -0.75):
        m.poutre('base%d' % (x > 0), (x, 0.15, -2.2), (x, 0.15, 2.2), 0.22, 'bois_fonce', decor=[planches])
        m.poutre('jambe_av%d' % (x > 0), (x, 0.15, 1.6), (x * 0.9, 3.25, 0.0), 0.18, 'bois')
        m.poutre('jambe_ar%d' % (x > 0), (x, 0.15, -1.6), (x * 0.9, 3.25, 0.0), 0.18, 'bois')
        m.poutre('jambe_v%d' % (x > 0), (x, 0.15, 0.0), (x * 0.9, 3.25, 0.0), 0.16, 'bois')
    for z in (-2.0, 0.0, 2.0):
        m.poutre('traverse%d' % int(z * 10), (0.80, 0.17, z), (-0.80, 0.17, z), 0.16, 'bois_fonce')
    m.tube('axe', [(0.85, 3.2, 0), (-0.85, 3.2, 0)], [0.07, 0.07], 'fer', K=m.k(8))
    K = m.k(8)
    m.ajoute('fanion', bande([np.stack([np.zeros(K), np.linspace(3.9, 3.3, K), np.linspace(0, 0.6, K)], 1) * 0 +
                              np.array([[0.9, y, 0.02] for y in np.linspace(3.9, 3.5, K)]),
                              np.array([[0.9, y, 0.5 - 0.3 * (3.9 - y)] for y in np.linspace(3.9, 3.5, K)])],
                             [np.array([[0.88, y, 0.02] for y in np.linspace(3.9, 3.5, K)]),
                              np.array([[0.88, y, 0.5 - 0.3 * (3.9 - y)] for y in np.linspace(3.9, 3.5, K)])], fermer=True),
             'joueur_tissu')
    m.tube('mat_fanion', [(0.9, 3.2, 0.0), (0.9, 4.0, 0.0)], [0.025, 0.02], 'bois', K=4)
    m.os = 'Arm'
    m.poutre('bras', (0, 3.2, 1.2), (0, 3.6, -3.6), 0.16, 'bois_fonce')
    m.tube('fronde', [(0, 3.6, -3.6), (0, 2.6, -3.7), (0, 1.9, -3.5)], [0.012, 0.012, 0.012], 'corde', K=4, poles=False)
    m.ajoute('poche', boite((0, 1.85, -3.45), (0.24, 0.12, 0.24), K=m.k(8), arrondi=0.9), 'cuir')
    m.os = 'Weight'
    m.ajoute('contrepoids', boite((0, 2.45, 1.25), (0.95, 0.95, 0.85), K=m.k(8), arrondi=0.2), 'bois',
             decor=[planches, lambda c: c.poser('joueur', np.abs(c.y - 2.45) < 0.12)])
    m.poutre('suspente', (0, 3.2, 1.2), (0, 2.9, 1.25), 0.10, 'fer')
    return m.pieces, pal(), m.sq


def tour_siege(q=1.0):
    """Tour de siège à étages, pont-levis (os Ramp), quatre roues pleines."""
    os_ = [('Root', None, (0, 0, 0)), ('Ramp', 'Root', (0, 5.0, 0.95))] + \
          [('Wheel_%s' % n, 'Root', (x, 0.45, z)) for n, x, z in (('FL', 1.05, 0.7), ('FR', -1.05, 0.7), ('BL', 1.05, -0.7), ('BR', -1.05, -0.7))]
    m = Machine(os_, q)
    K = m.k(4)
    ann = []
    for y, s in ((0.5, 1.0), (0.5, 1.0), (5.0, 0.86), (6.2, 0.86), (6.25, 0.0)):
        ann.append(np.array([[s * 0.95, y, s * 0.95], [-s * 0.95, y, s * 0.95], [-s * 0.95, y, -s * 0.95], [s * 0.95, y, -s * 0.95]]))
    ann[0] = np.array([[0, 0.5, 0]] * 4)
    m.ajoute('tour', ann, 'bois', lisse=False, decor=[planches, lambda c: c.poser('peau_bete', c.z > 0.5),
                                                     lambda c: c.poser('joueur', (c.y > 4.6) & (c.y < 4.95))])
    for y in (1.8, 3.3, 5.0):
        m.poutre('ceinture%d' % int(y * 10), (1.0, y, 1.0), (-1.0, y, 1.0), 0.12, 'bois_fonce')
    m.os = 'Ramp'
    m.ajoute('pont', boite((0, 5.6, 0.95), (1.4, 1.2, 0.10), K=4, arrondi=0.2), 'bois_fonce', lisse=False, decor=[planches])
    m.os = 'Root'
    for n, x, z in (('FL', 1.05, 0.7), ('FR', -1.05, 0.7), ('BL', 1.05, -0.7), ('BR', -1.05, -0.7)):
        m.roue('roue_' + n, (x, 0.45, z), 0.45, 0.18, 'bois_fonce', 'Wheel_' + n, m_bande='fer', cote=1 if x > 0 else -1)
    return m.pieces, pal(), m.sq


def canon(q=1.0):
    """Canon de campagne : affût, fût en bronze (os Barrel, élévation), deux grandes roues."""
    os_ = [('Root', None, (0, 0, 0)), ('Barrel', 'Root', (0, 0.95, 0.15)),
           ('Wheel_L', 'Root', (0.55, 0.65, 0.15)), ('Wheel_R', 'Root', (-0.55, 0.65, 0.15))]
    m = Machine(os_, q)
    for x in (0.22, -0.22):
        m.poutre('flasque%d' % (x > 0), (x, 0.85, 0.45), (x * 0.4, 0.08, -1.55), (0.07, 0.24), 'bois',
                 decor=[lambda c: c.poser('joueur', (c.y > 0.55) & (c.y < 0.62))])
    m.tube('essieu', [(0.6, 0.65, 0.15), (-0.6, 0.65, 0.15)], [0.05, 0.05], 'fer', K=m.k(8))
    m.os = 'Barrel'
    m.tube('fut', [(0, 0.95, -0.55), (0, 0.95, -0.35), (0, 0.97, 0.4), (0, 0.98, 1.15), (0, 0.98, 1.22)],
           [0.12, 0.16, 0.14, 0.11, 0.12], 'bronze_c', K=m.k(14),
           decor=[lambda c: c.relief(np.abs(c.z - 0.4) - 0.01, 0.006, 1.0), lambda c: c.relief(np.abs(c.z - 1.10) - 0.01, 0.006, 1.0)])
    m.tube('bouche', [(0, 0.98, 1.21), (0, 0.98, 1.235)], [0.07, 0.0], 'sombre', K=m.k(10))
    m.tube('tourillons', [(0.17, 0.95, 0.15), (-0.17, 0.95, 0.15)], [0.04, 0.04], 'bronze_c', K=m.k(6))
    m.os = 'Root'
    m.roue('roue_L', (0.55, 0.65, 0.15), 0.65, 0.09, 'bois', 'Wheel_L', m_bande='fer', rayons=12)
    m.roue('roue_R', (-0.55, 0.65, 0.15), 0.65, 0.09, 'bois', 'Wheel_R', m_bande='fer', rayons=12, cote=-1)
    return m.pieces, pal(), m.sq


def char_1940(q=1.0, moderne=False):
    """Char d'assaut : caisse, chenilles, tourelle (os Turret) et canon (os Barrel)."""
    os_ = [('Root', None, (0, 0, 0)), ('Turret', 'Root', (0, 1.65, -0.1)), ('Barrel', 'Turret', (0, 2.05, 0.75)),
           ('Track_L', 'Root', (1.25, 0.55, 0)), ('Track_R', 'Root', (-1.25, 0.55, 0))]
    m = Machine(os_, q)
    coul = 'gris_mil' if moderne else 'kaki'
    m.ajoute('caisse', boite((0, 1.15, 0), (2.10, 0.85, 5.6 if moderne else 5.0), K=m.k(10), arrondi=0.25), coul,
             decor=[lambda c: c.poser('joueur_metal', (c.y > 1.05) & (c.y < 1.25) & (np.abs(c.x) > 0.95)),
                    lambda c: c.trait(np.abs(c.z - 1.4), 0.006, 0.4)])
    for s, n in ((1, 'L'), (-1, 'R')):
        m.os = 'Track_' + n
        m.ajoute('chenille_' + n, boite((s * 1.25, 0.55, 0), (0.55, 1.05, 5.4 if moderne else 4.9), K=m.k(12), arrondi=0.95),
                 'chenille', decor=[lambda c: setattr(c, 'col', c.col * (0.6 + 0.45 * (np.sin(c.z * 40 + c.y * 40) > 0))[:, None])])
        for z in np.linspace(-1.8, 1.8, 5):
            m.roue('galet_%s%d' % (n, int(z * 10)), (s * 1.27, 0.42, z), 0.32, 0.5, 'gris_mil' if moderne else 'kaki',
                   'Track_' + n, cote=s)
    m.os = 'Turret'
    if moderne:
        m.ajoute('tourelle', boite((0, 1.95, -0.2), (2.0, 0.55, 2.6), K=m.k(10), arrondi=0.35, rot=rot_x(0.02)), coul,
                 decor=[lambda c: c.poser('joueur_metal', np.abs(c.z + 1.1) < 0.2)])
    else:
        m.ajoute('tourelle', boite((0, 2.0, -0.1), (1.55, 0.65, 1.9), K=m.k(12), arrondi=0.8), coul,
                 decor=[lambda c: c.poser('joueur_metal', (c.y > 1.95) & (c.y < 2.12))])
    m.ajoute('trappe', boite((0.3, 2.35, -0.4), (0.45, 0.10, 0.45), K=m.k(8), arrondi=0.8), coul)
    m.os = 'Barrel'
    L = 3.4 if moderne else 2.4
    m.tube('canon', [(0, 2.05, 0.7), (0, 2.05, 0.75 + L * 0.3), (0, 2.05, 0.75 + L)], [0.13, 0.08, 0.07], coul, K=m.k(10))
    m.tube('frein', [(0, 2.05, 0.75 + L - 0.15), (0, 2.05, 0.75 + L + 0.05)], [0.11, 0.11], coul, K=m.k(8), poles=False)
    return m.pieces, pal(), m.sq


def jeep(q=1.0):
    os_ = [('Root', None, (0, 0, 0))] + \
          [('Wheel_%s' % n, 'Root', (x, 0.38, z)) for n, x, z in (('FL', 0.70, 1.15), ('FR', -0.70, 1.15), ('BL', 0.70, -1.05), ('BR', -0.70, -1.05))]
    m = Machine(os_, q)
    m.ajoute('caisse', boite((0, 0.80, 0.0), (1.45, 0.55, 3.2), K=m.k(10), arrondi=0.35), 'kaki',
             decor=[lambda c: c.poser('joueur_metal', (c.z > 0.9) & (c.y > 0.95)), lambda c: c.poser('sombre', (c.y > 1.0) & (np.abs(c.z + 0.2) < 0.9) & (np.abs(c.x) < 0.6))])
    m.ajoute('capot', boite((0, 1.08, 1.05), (1.30, 0.12, 1.05), K=m.k(8), arrondi=0.4), 'kaki',
             decor=[lambda c: c.poser('blanc', np.hypot(c.x, c.z - 1.05) < 0.16)])
    m.poutre('pare_brise', (0.65, 1.12, 0.45), (-0.65, 1.12, 0.45), (0.06, 0.06), 'kaki')
    m.ajoute('vitre', boite((0, 1.35, 0.45), (1.25, 0.42, 0.04), K=4, arrondi=0.2), 'vitre', lisse=False)
    m.ajoute('siege', boite((0, 1.05, -0.35), (1.1, 0.25, 0.5), K=m.k(6), arrondi=0.5), 'cuir')
    m.ajoute('roue_secours', boite((0, 1.0, -1.70), (0.62, 0.62, 0.22), K=m.k(12), arrondi=1.8), 'pneu')
    for n, x, z in (('FL', 0.70, 1.15), ('FR', -0.70, 1.15), ('BL', 0.70, -1.05), ('BR', -0.70, -1.05)):
        m.roue('roue_' + n, (x, 0.38, z), 0.38, 0.24, 'pneu', 'Wheel_' + n, rayons=0, cote=1 if x > 0 else -1)
    return m.pieces, pal(), m.sq


def helicoptere(q=1.0):
    os_ = [('Root', None, (0, 0, 0)), ('Rotor', 'Root', (0, 2.55, 0.2)), ('TailRotor', 'Root', (0.18, 2.15, -5.2))]
    m = Machine(os_, q)
    K = m.k(14)
    m.tube('fuselage', [(0, 1.30, 2.3), (0, 1.40, 1.8), (0, 1.45, 0.6), (0, 1.55, -0.8), (0, 1.85, -2.2), (0, 2.05, -4.8),
                        (0, 2.1, -5.3)],
           [(0.30, 0.25), (0.62, 0.55), (0.78, 0.75), (0.72, 0.68), (0.25, 0.28), (0.12, 0.14), (0.0, 0.0)], 'kaki',
           K=K, haut=(0, 1, 0), decor=[lambda c: c.poser('vitre', (c.z > 1.2) & (c.y > 1.35)),
                       lambda c: c.poser('joueur_metal', (c.z < -1.6) & (c.z > -2.4))])
    m.ajoute('derive', boite((0, 2.55, -5.05), (0.08, 0.95, 0.55), K=4, arrondi=0.5, rot=rot_x(-0.3)), 'kaki', lisse=False)
    for s in (1, -1):
        m.poutre('patin%d' % (s > 0), (s * 0.85, 0.10, 1.4), (s * 0.85, 0.10, -1.3), (0.07, 0.07), 'gris_mil', K=6)
        for z in (0.9, -0.7):
            m.poutre('jambe%d%d' % (s > 0, z > 0), (s * 0.85, 0.10, z), (s * 0.45, 0.9, z), 0.06, 'gris_mil', K=6)
        m.ajoute('nacelle%d' % (s > 0), boite((s * 1.05, 1.25, 0.1), (0.35, 0.30, 0.9), K=m.k(8), arrondi=0.8), 'gris_mil')
    m.os = 'Rotor'
    m.tube('mat', [(0, 2.15, 0.2), (0, 2.6, 0.2)], [0.10, 0.08], 'gris_mil', K=m.k(8), poles=False)
    for a in (0, math.pi / 2, math.pi, 1.5 * math.pi):
        m.poutre('pale%d' % int(a * 10), (0, 2.62, 0.2), (5.0 * math.sin(a), 2.62, 0.2 + 5.0 * math.cos(a)), (0.30, 0.04), 'sombre', K=4)
    m.os = 'TailRotor'
    for a in (0, math.pi):
        m.poutre('pale_q%d' % int(a), (0.18, 2.15, -5.2), (0.18, 2.15 + 0.7 * math.cos(a), -5.2 + 0.7 * math.sin(a)), (0.03, 0.12), 'sombre', K=4)
    return m.pieces, pal(), m.sq


def char_antigrav(q=1.0):
    """Char flottant futuriste : coque à réacteurs lumineux, tourelle à deux canons plasma."""
    os_ = [('Root', None, (0, 0, 0)), ('Turret', 'Root', (0, 1.55, -0.3)), ('Barrel', 'Turret', (0, 1.75, 0.55))]
    m = Machine(os_, q)
    K = m.k(16)
    m.ajoute('coque', boite((0, 0.95, 0), (2.4, 0.65, 4.6), K=K, arrondi=0.6), 'coque_f',
             decor=[lambda c: c.poser('joueur_metal', (np.abs(c.x) > 0.9) & (c.y > 0.95)),
                    lambda c: c.poser('cyan', (c.y < 0.70) & (np.abs(c.z) < 1.9))])
    for s in (1, -1):
        for z in (1.4, -1.4):
            m.tube('reacteur%d%d' % (s > 0, z > 0), [(s * 1.0, 0.70, z), (s * 1.0, 0.45, z)], [0.32, 0.30], 'gris_mil',
                   K=m.k(10), decor=[lambda c: c.poser('cyan', c.y < 0.5)])
    m.os = 'Turret'
    m.ajoute('tourelle', boite((0, 1.55, -0.3), (1.5, 0.5, 1.8), K=m.k(12), arrondi=0.7), 'coque_f',
             decor=[lambda c: c.poser('joueur_metal', c.y > 1.7), lambda c: c.poser('cyan', (np.abs(c.y - 1.55) < 0.03) & (c.z > 0.4))])
    m.os = 'Barrel'
    for s in (1, -1):
        m.tube('canon%d' % (s > 0), [(s * 0.3, 1.70, 0.5), (s * 0.3, 1.70, 2.4)], [0.10, 0.08], 'gris_mil', K=m.k(10),
               decor=[lambda c: c.poser('cyan', c.z > 2.3)])
    return m.pieces, pal(), m.sq


def vaisseau_drone(q=1.0):
    """Chasseur-drone futuriste : aile volante, deux réacteurs (os Engine_L/R orientables)."""
    os_ = [('Root', None, (0, 0, 0)), ('Engine_L', 'Root', (1.4, 1.5, -0.6)), ('Engine_R', 'Root', (-1.4, 1.5, -0.6))]
    m = Machine(os_, q)
    K = m.k(10)
    ext, inte = [], []
    for z in np.linspace(1.8, -1.6, 7):
        t = (1.8 - z) / 3.4
        demi = 0.3 + 2.5 * t
        xs = np.linspace(-demi, demi, K)
        y = 1.5 + 0.18 * (1 - (xs / demi) ** 2) * (1 - 0.5 * t)
        ext.append(np.stack([xs, y, np.full(K, z) - 0.6 * (np.abs(xs) / 2.8) ** 1.5], 1))
        inte.append(np.stack([xs, y - 0.16 * (1 - (xs / demi) ** 2), np.full(K, z) - 0.6 * (np.abs(xs) / 2.8) ** 1.5], 1))
    m.ajoute('aile', bande(ext, inte, fermer=True), 'coque_f',
             decor=[lambda c: c.poser('joueur_metal', np.abs(c.x) > 1.6), lambda c: c.poser('vitre', (c.z > 0.8) & (np.abs(c.x) < 0.25)),
                    lambda c: c.poser('cyan', np.abs(np.abs(c.x) - 1.2) < 0.03)])
    for s, n in ((1, 'L'), (-1, 'R')):
        m.os = 'Engine_' + n
        m.tube('reacteur_' + n, [(s * 1.4, 1.5, 0.3), (s * 1.4, 1.5, -1.3)], [0.22, 0.20], 'gris_mil', K=m.k(10),
               decor=[lambda c: c.poser('cyan', c.z < -1.2)])
    return m.pieces, pal(), m.sq


MACHINES = [
    ('1-antiquite', 'belier', 'Bélier couvert', 'Antiquité, Moyen Âge', belier, 2048),
    ('1-antiquite', 'catapulte', 'Catapulte (onagre)', 'Rome antique', catapulte, 1024),
    ('1-antiquite', 'baliste', 'Baliste', 'Grèce et Rome', baliste, 1024),
    ('2-moyen-age', 'trebuchet', 'Trébuchet', 'Europe médiévale', trebuchet, 2048),
    ('2-moyen-age', 'tour-de-siege', 'Tour de siège', 'Europe médiévale', tour_siege, 2048),
    ('3-epoque-moderne', 'canon', 'Canon de campagne', 'XVIIe-XIXe siècle', canon, 1024),
    ('5-xxe-siecle', 'char-1940', 'Char d\'assaut', 'Seconde Guerre mondiale', char_1940, 2048),
    ('5-xxe-siecle', 'jeep', 'Véhicule léger', 'Seconde Guerre mondiale', jeep, 1024),
    ('6-contemporain', 'char-moderne', 'Char moderne', 'Armée moderne', lambda q: char_1940(q, moderne=True), 2048),
    ('6-contemporain', 'helicoptere', 'Hélicoptère', 'Armée moderne', helicoptere, 2048),
    ('7-futur', 'char-antigrav', 'Char antigravité', 'Futur', char_antigrav, 2048),
    ('7-futur', 'chasseur-drone', 'Chasseur-drone', 'Futur', vaisseau_drone, 1024),
]
