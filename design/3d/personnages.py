"""Catalogue des personnages, rangés par ère et par culture.

Chaque personnage = une fonction qui pose les pièces (corps.py) et renvoie sa palette de matières.
Les zones « joueur » sont peintes en gris clair et marquées dans le masque couleur du joueur.
"""
import numpy as np

from moteur import Mat, zones, ss, mix, rot_x
from corps import *  # noqa: F401,F403
from corps import (HEROS, FEMME, ROBUSTE, SVELTE, Morph, torse, bassin, cou, bras, manchon_bras, mains, jambes,
                   manchon_jambe, pieds, sandales, tete, visage, cheveux, barbe, moustache, casque_corinthien,
                   cimier_crin, casque_galea, casque_conique, heaume, kabuto, morion, shako, casque_rond,
                   casque_integral, chapeau, nemes, bonnet_fourrure, capuche, casque_chantier, tete_jaguar,
                   tete_robot, jupe, lanieres, lin_lanieres, ceinture, gilet, col, cape, ourlet, col_fourrure,
                   epaulieres, bandes_horizontales, lacets_lamelles, croix, baudriers, boutons, camouflage,
                   carreaux, rayures, lignes_lumineuses, articulations, collier_large, sacoches, sac_dos, carquois,
                   torque, reacteur, boite_piece, _w_dos)

# --- matières communes ---------------------------------------------------------------------------
PEAUX = {'claire': (0.88, 0.67, 0.53), 'mate': (0.80, 0.56, 0.40), 'olive': (0.72, 0.51, 0.35),
         'brune': (0.55, 0.36, 0.24), 'foncee': (0.38, 0.24, 0.16), 'doree': (0.84, 0.62, 0.42)}
CHEVEUX = {'noir': (0.07, 0.055, 0.05), 'brun': (0.24, 0.14, 0.08), 'chatain': (0.36, 0.22, 0.12),
           'roux': (0.62, 0.27, 0.10), 'blond': (0.78, 0.62, 0.36), 'gris': (0.62, 0.60, 0.58)}


def base(peau='mate', poil='brun', **autres):
    pal = {
        'peau': Mat('peau', PEAUX[peau]),
        'cheveux': Mat('cheveux', CHEVEUX[poil]),
        'barbe': Mat('cheveux', CHEVEUX[poil]),
        'joueur': Mat('tissu', joueur=True),
        'joueur_metal': Mat('peinture', joueur=True, rug=0.45),
        'cuir': Mat('cuir', (0.40, 0.24, 0.13)),
        'cuir_noir': Mat('cuir', (0.13, 0.11, 0.10)),
        'bronze': Mat('metal', (0.74, 0.50, 0.21), clair=(0.99, 0.83, 0.48)),
        'fer': Mat('metal', (0.64, 0.66, 0.68)),
        'acier': Mat('metal', (0.68, 0.70, 0.74), rug=0.28),
        'or': Mat('metal', (0.86, 0.64, 0.22), clair=(1.0, 0.92, 0.6)),
        'lin': Mat('tissu', (0.89, 0.84, 0.71)),
        'blanc': Mat('tissu', (0.90, 0.89, 0.86)),
        'sombre': Mat('sombre', (0.05, 0.04, 0.035)),
        'bois': Mat('bois', (0.50, 0.33, 0.18)),
        'fourrure': Mat('fourrure', (0.45, 0.33, 0.22)),
        'os': Mat('peinture', (0.90, 0.86, 0.76), rug=0.6),
        'plumes': Mat('plumes', (0.86, 0.84, 0.80)),
    }
    pal.update(autres)
    return pal


def peau_et(zone_regles, defaut='peau'):
    return zones(defaut, *zone_regles)


def jambiere(y):
    return 0.010 * np.exp(-((y - 0.55) / 0.03) ** 2) + 0.004 * np.exp(-((y - 0.42) / 0.05) ** 2)


def cuirasse_musclee(c):
    """Muscles en relief peints sur une cuirasse (pectoraux, abdominaux, dos)."""
    x, y, z, ax = c.x, c.y, c.z, c.ax
    av, ar = ss(0.0, 0.03, z), ss(0.0, 0.03, -z)
    c.relief(np.where((y > 1.06) & (y < 1.43), ax, 1) - 0.004, 0.005, av)
    f = 1.31 + 2.2 * (np.clip(ax, 0.012, 0.19) - 0.09) ** 2
    c.relief(np.where((ax > 0.01) & (ax < 0.18), y - f, 1), 0.006, av)
    for y0 in (1.245, 1.175):
        c.relief(np.where(ax < 0.075, y - y0, 1), 0.005, av * ss(0.085, 0.05, ax))
    f = 1.065 + 4.5 * ax ** 2
    c.relief(np.where(ax < 0.15, y - f, 1), 0.006, av)
    c.relief(np.where((y > 1.06) & (y < 1.47), ax - 0.004, 1), 0.005, ar)
    f = 1.405 - 3.0 * (np.clip(ax, 0, 0.18) - 0.09) ** 2
    c.relief(np.where((ax > 0.03) & (ax < 0.17), f - y, 1), 0.006, ar * 0.8)
    bord = np.clip(ss(1.03, 1.012, y) + ss(1.52, 1.54, y), 0, 1)
    c.col = mix(c.col, [0.97, 0.80, 0.46], bord * 0.45)
    c.relief(y - 1.034, 0.004, 1.0)
    c.relief(1.516 - y, 0.004, 1.0)


def plastron(c):
    """Plastron d'acier : arête centrale, bords roulés."""
    c.col = mix(c.col, np.minimum(c.col * 1.35 + 0.05, 1), np.exp(-(c.x / 0.012) ** 2) * (c.z > 0) * 0.6)
    c.relief(np.where(c.z > 0, c.ax - 0.004, 1), 0.004, 0.5)
    c.relief(c.y - 1.035, 0.004, 1.0)


def ourlet_manche(x0):
    def f(c):
        c.col = c.col * (1 - 0.14 * np.exp(-((c.ax - (x0 - 0.012)) / 0.003) ** 2))[:, None]
        c.col = mix(c.col, c.col * 0.86, ss(x0 - 0.01, x0, c.ax))
    return f


# ---------------------------------------------------------------------------------------------
# ANTIQUITÉ
# ---------------------------------------------------------------------------------------------
def hoplite_grec(p):
    pal = base('mate', 'brun', crin=Mat('cheveux', (0.70, 0.09, 0.06), rug=0.78))
    torse(p, 'bronze', ep=0.0, rebord=True, y_bas=0.995, decor=[cuirasse_musclee])
    cou(p, 'peau')
    casque_corinthien(p, 'bronze')
    cimier_crin(p, 'crin')
    bras(p, peau_et([('cuir', lambda c: (c.ax > 0.655) & (c.ax < 0.705))]))
    manchon_bras(p, 'manche', 'joueur', 0.12, 0.285, 0.012, evase=0.008, decor=[ourlet_manche(0.285)])
    mains(p, 'peau')
    jambes(p, 'peau')
    manchon_jambe(p, 'jambiere', 'bronze', 0.62, 0.13, 0.012, n=9, ext_fn=jambiere, decor=[_jambiere_deco])
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'tunique', 'joueur', 0.98, 0.705, 0.0, 0.058, decor=[ourlet(0.725)])
    lanieres(p, 'pteryge_bas', 'lin', 20, 0.5, 0.985, 0.738, 0.010, decor=[lin_lanieres()])
    lanieres(p, 'pteryge_haut', 'lin', 20, 0.0, 1.025, 0.870, 0.024, decor=[lin_lanieres()])
    cape(p, 'joueur')
    return pal


def _jiere(c):
    pass


def _jambiere_deco(c):
    cx = 0.12 + 0.015 * np.clip((0.53 - c.y) / 0.43, 0, 1)
    devant = ss(0.4, 0.8, c.N[:, 2])
    c.col = mix(c.col, [0.99, 0.84, 0.50], np.exp(-((c.ax - cx) / 0.006) ** 2) * devant * 0.35 * (c.y < 0.5))
    r = np.hypot(c.ax - 0.12, c.y - 0.555) - 0.032
    c.relief(-r, 0.004, devant)
    bords = ss(0.08, 0.02, c.ST[:, 1]) + ss(0.93, 0.99, c.ST[:, 1])
    c.col = mix(c.col, [0.97, 0.80, 0.46], np.clip(bords, 0, 1) * 0.4)


def legionnaire_romain(p):
    pal = base('olive', 'noir')
    torse(p, 'fer', ep=0.004, rebord=True, y_bas=1.0,
          decor=[bandes_horizontales(0.042, 1.02, 1.40, 'or'), _epaules_segmentata])
    cou(p, peau_et([('joueur', lambda c: c.y < 1.56)]))
    tete(p, 'peau', decor=[visage((0.22, 0.15, 0.10))])
    casque_galea(p, 'fer')
    barbe(p, 'barbe', 'courte')
    epaulieres(p, 'fer', 'bandes', decor=[bandes_horizontales(0.03, 1.40, 1.60)])
    bras(p, peau_et([('joueur', lambda c: c.ax < 0.26)]))
    mains(p, 'peau')
    jambes(p, 'peau', decor=[sandales])
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'tunique', 'joueur', 1.0, 0.70, 0.0, 0.05, decor=[ourlet(0.72)])
    ceinture(p, 'cuir', 1.0, 0.04, 0.014, decor=[_plaques_ceinture])
    lanieres(p, 'tablier', 'cuir', 8, -0.25, 0.98, 0.80, 0.03, haut=(0.07, 0.13, 0.12), bas=(0.07, 0.15, 0.14),
             jeu=0.55, ep=0.006, decor=[_rivets_tablier], rangs=3)
    return pal


def _epaules_segmentata(c):
    m = (c.y > 1.46) & (c.ax > 0.07)
    c.relief(np.where(m, ((c.ax * 30) % 1 - 0.5) * 0.03, 1), 0.003, 0.8)


def _plaques_ceinture(c):
    m = (np.abs(((np.arctan2(c.z, c.x) * 4) % 1) - 0.5) < 0.3)
    c.poser('or', m & (c.z > -0.05))


def _rivets_tablier(c):
    m = (np.abs(((c.ST[:, 1] * 6) % 1) - 0.5) < 0.12) & (c.ST[:, 0] < 0.43)
    c.poser('or', m)


def archer_egyptien(p):
    pal = base('brune', 'noir', lapis=Mat('peinture', (0.10, 0.22, 0.55), rug=0.35))
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[collier_large()])
    bassin(p, 'lin')
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.15, 0.10, 0.07), (0.05, 0.04, 0.03)), _khol])
    nemes(p, 'joueur', rayure='or')
    bras(p, peau_et([('or', lambda c: ((c.ax > 0.30) & (c.ax < 0.33)) | ((c.ax > 0.66) & (c.ax < 0.70)))]))
    mains(p, 'peau')
    jambes(p, 'peau', decor=[sandales])
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'pagne', zones('lin', ('joueur', lambda c: (c.ax < 0.05) & (c.z > 0))), 1.01, 0.70, 0.004, 0.03,
         decor=[ourlet(0.715), _plis], devant=1.08)
    ceinture(p, 'or', 1.0, 0.035, 0.010)
    carquois(p, 'cuir')
    return pal


def _khol(c):
    t = (c.z > 0.03) & (np.abs(c.y - 1.712) < 0.002) & (c.ax > 0.045) & (c.ax < 0.062)
    c.col = np.where(t[:, None], c.col * 0.2, c.col)


def _plis(c):
    c.col = c.col * (1 - 0.08 * (np.sin(np.arctan2(c.z, c.x) * 40) > 0.6))[:, None]


def guerrier_celte(p):
    pal = base('claire', 'roux', plaid=Mat('tissu', (0.30, 0.42, 0.24)))
    torse(p, 'peau', ep=-0.012, y_bas=1.0)
    bassin(p, 'joueur', decor=[carreaux('plaid', 0.06, 0.01)])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.25, 0.40, 0.45), (0.50, 0.22, 0.08))])
    cheveux(p, 'cheveux', 'long')
    moustache(p, 'barbe', tombante=True)
    torque(p, 'or')
    bras(p, peau_et([('or', lambda c: (c.ax > 0.30) & (c.ax < 0.335))]))
    mains(p, 'peau')
    jambes(p, peau_et([('joueur', lambda c: c.y > 0.16)]), decor=[carreaux('plaid', 0.06, 0.01)])
    pieds(p, 'cuir', ext=0.006, haut=0.008)
    ceinture(p, 'cuir', 0.99, 0.04, 0.012, decor=[_boucle])
    cape(p, zones('joueur'), bas=0.85, largeur=0.9, decor=[carreaux('plaid', 0.08, 0.012)])
    return pal


def _boucle(c):
    c.poser('or', (c.z > 0.08) & (c.ax < 0.02))


def villageoise_antique(p):
    pal = base('olive', 'brun')
    torse(p, 'joueur', ep=-0.004, y_bas=1.0, decor=[_drape])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.25, 0.16, 0.10), femme=True)])
    cheveux(p, 'cheveux', 'chignon')
    bras(p, peau_et([('joueur', lambda c: c.ax < 0.24)]))
    manchon_bras(p, 'manche', 'joueur', 0.13, 0.25, 0.012, evase=0.015)
    mains(p, 'peau')
    jambes(p, 'peau')
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'chiton', 'joueur', 1.02, 0.12, -0.004, 0.10, n=8, decor=[ourlet(0.14), _drape], force=0.7)
    ceinture(p, 'cuir', 1.16, 0.025, 0.008)
    return pal


def _drape(c):
    c.col = c.col * (1 - 0.10 * (np.sin(np.arctan2(c.z, c.x) * 14 + c.y * 3) > 0.55))[:, None]


# ---------------------------------------------------------------------------------------------
# MOYEN ÂGE
# ---------------------------------------------------------------------------------------------
def chevalier(p):
    pal = base('claire', 'chatain', mailles=Mat('mailles', (0.74, 0.76, 0.79), metal=0.7),
               croix_blanche=Mat('tissu', (0.92, 0.90, 0.86)))
    torse(p, 'mailles', ep=-0.004, y_bas=1.0)
    gilet(p, 'joueur', 1.0, 1.53, 0.018, base_ep=-0.004, decor=[croix('croix_blanche', 1.30, 0.022, 0.09, 0.13)])
    cou(p, 'mailles')
    heaume(p, 'acier', croix='or')
    bras(p, 'mailles')
    manchon_bras(p, 'gantelet', 'acier', 0.65, 0.71, 0.010, evase=0.006, n=3)
    mains(p, 'cuir', moufle=True)
    epaulieres(p, 'acier', 'dome', taille=0.85)
    jambes(p, 'mailles')
    manchon_jambe(p, 'genouillere', 'acier', 0.61, 0.49, 0.010, n=4, ext_fn=lambda y: 0.008 * np.exp(-((y - 0.55) / 0.03) ** 2))
    pieds(p, 'acier', semelle='cuir_noir', ext=0.006, haut=0.006)
    jupe(p, 'surcot', 'joueur', 1.02, 0.60, 0.018, 0.07, decor=[ourlet(0.62)], force=0.85)
    ceinture(p, 'cuir', 1.05, 0.035, 0.024, decor=[_boucle])
    return pal


def viking(p):
    p.m = ROBUSTE
    pal = base('claire', 'blond', mailles=Mat('mailles', (0.66, 0.67, 0.68), metal=0.7),
               laine=Mat('tissu', (0.42, 0.33, 0.24)))
    torse(p, 'mailles', ep=0.0, y_bas=1.0)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.45, 0.55), (0.55, 0.42, 0.22))])
    casque_conique(p, 'fer', bandes='bronze')
    cheveux(p, 'cheveux', 'tresses')
    barbe(p, 'barbe', 'longue')
    col_fourrure(p, 'fourrure')
    bras(p, peau_et([('joueur', lambda c: c.ax < 0.62), ('cuir', lambda c: (c.ax > 0.56) & (c.ax < 0.70))]))
    manchon_bras(p, 'manche_maille', 'mailles', 0.13, 0.30, 0.014, evase=0.01)
    mains(p, 'peau')
    jambes(p, zones('laine', ('cuir', lambda c: (c.y < 0.45) & (((c.y * 40) % 1) < 0.5))))
    pieds(p, 'cuir', ext=0.008, haut=0.01)
    jupe(p, 'broigne', 'mailles', 1.01, 0.66, 0.006, 0.05, decor=[ourlet(0.68)])
    ceinture(p, 'cuir', 1.02, 0.045, 0.02, decor=[_boucle])
    return pal


def samourai(p):
    pal = base('doree', 'noir', laque=Mat('peinture', (0.20, 0.06, 0.05), rug=0.3),
               hakama=Mat('tissu', (0.18, 0.18, 0.24)), menpo=Mat('peinture', (0.55, 0.10, 0.08), rug=0.35),
               laque_noire=Mat('peinture', (0.09, 0.08, 0.08), rug=0.25))
    torse(p, 'laque', ep=0.010, y_bas=1.0, decor=[lacets_lamelles('joueur')], bosses=False)
    cou(p, 'peau')
    tete(p, zones('peau', ('menpo', lambda c: (c.y < 1.672) & (c.z > -0.02))),
         decor=[visage((0.12, 0.08, 0.05), (0.04, 0.03, 0.03), bouche=False)])
    kabuto(p, 'laque_noire', shikoro='laque', maedate='or')
    moustache(p, 'cheveux')
    epaulieres(p, 'laque', 'plaque', decor=[lacets_lamelles('joueur')])
    bras(p, peau_et([('hakama', lambda c: c.ax < 0.62), ('laque', lambda c: (c.ax > 0.48) & (c.ax < 0.69))]))
    mains(p, 'peau')
    jambes(p, 'hakama')
    pieds(p, 'peau', decor=[sandales], semelle='bois')
    jupe(p, 'hakama', 'hakama', 1.0, 0.13, 0.008, 0.12, n=8, decor=[_plis_hakama], force=0.9)
    lanieres(p, 'kusazuri', 'laque', 7, 0.0, 1.03, 0.80, 0.03, jeu=0.06, ep=0.012, decor=[lacets_lamelles('joueur')],
             rangs=3)
    ceinture(p, 'joueur', 1.035, 0.03, 0.04)
    return pal


def _plis_hakama(c):
    c.col = c.col * (1 - 0.15 * (np.sin(np.arctan2(c.z, c.x) * 8) > 0.7))[:, None]


def guerrier_jaguar(p):
    pal = base('brune', 'noir', pelage=Mat('fourrure', (0.80, 0.56, 0.18), rug=0.85),
               plume_verte=Mat('plumes', (0.10, 0.50, 0.30)))
    torse(p, 'pelage', ep=-0.008, y_bas=1.0, decor=[_taches_jaguar])
    bassin(p, 'pelage', decor=[_taches_jaguar])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03)), _peinture_guerre])
    tete_jaguar(p, 'pelage')
    bras(p, zones('pelage', ('peau', lambda c: c.ax > 0.70)), decor=[_taches_jaguar])
    mains(p, 'peau')
    jambes(p, zones('pelage', ('peau', lambda c: c.y < 0.16)), decor=[_taches_jaguar, sandales])
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'maxtlatl', 'joueur', 1.0, 0.82, 0.004, 0.02, decor=[ourlet(0.835)], devant=1.1)
    cape(p, 'plume_verte', bas=1.0, largeur=0.85, decor=[_plumes_cape])
    return pal


def _taches_jaguar(c):
    n = bruit_local(c)
    t = (n > 0.62) & (n < 0.70)
    c.col = np.where(t[:, None], c.col * 0.15, c.col)


def bruit_local(c):
    from moteur import bruit
    return bruit(c.P, 45, 77)


def _peinture_guerre(c):
    m = (c.z > 0.02) & (np.abs(c.y - 1.69) < 0.006) & (c.ax > 0.03)
    c.col = np.where(m[:, None], np.array([0.05, 0.05, 0.05]), c.col)


def _plumes_cape(c):
    r = ((c.ST[:, 1] * 10) % 1)
    c.col = c.col * (0.75 + 0.35 * r)[:, None]
    c.poser('joueur', (c.ST[:, 1] > 0.92))


def cavalier_mongol(p):
    pal = base('doree', 'noir', deel=Mat('tissu', (0.55, 0.20, 0.12)))
    torse(p, 'joueur', ep=0.004, y_bas=1.0, decor=[_croise])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03))])
    bonnet_fourrure(p, 'joueur', 'fourrure')
    moustache(p, 'barbe', tombante=True)
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.66)))
    manchon_bras(p, 'manchette', 'fourrure', 0.60, 0.66, 0.012, evase=0.01)
    mains(p, 'peau')
    jambes(p, 'cuir_noir')
    manchon_jambe(p, 'botte', 'cuir', 0.46, 0.10, 0.010, n=5, ext_fn=lambda y: 0.012 * ss(0.38, 0.46, y))
    pieds(p, 'cuir', ext=0.010, haut=0.012, bout_rond=1.6)
    jupe(p, 'deel', 'joueur', 1.0, 0.40, 0.006, 0.10, n=6, decor=[ourlet(0.42), _croise], force=0.85)
    ceinture(p, 'deel', 1.05, 0.05, 0.016)
    carquois(p, 'cuir')
    return pal


def _croise(c):
    m = (c.z > 0.02) & (np.abs(c.x - (c.y - 1.45) * 0.5 + 0.01) < 0.012) & (c.y > 1.0)
    c.poser('fourrure', m)


def villageois_medieval(p):
    pal = base('mate', 'chatain', braies=Mat('tissu', (0.45, 0.38, 0.28)))
    torse(p, 'joueur', ep=-0.002, y_bas=1.0, decor=[_lacage])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.20, 0.12))])
    cheveux(p, 'cheveux', 'court')
    barbe(p, 'barbe', 'courte')
    chapeau(p, 'lin', 'paille', ruban='cuir')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.60)))
    manchon_bras(p, 'manche', 'joueur', 0.56, 0.60, 0.012, evase=0.008)
    mains(p, 'peau')
    jambes(p, 'braies')
    manchon_jambe(p, 'molletiere', 'lin', 0.40, 0.11, 0.008, n=4, decor=[_bandes_molletiere])
    pieds(p, 'cuir', ext=0.008, haut=0.01)
    jupe(p, 'cotte', 'joueur', 1.0, 0.74, 0.004, 0.04, decor=[ourlet(0.76)])
    ceinture(p, 'cuir', 1.0, 0.03, 0.012)
    boite_piece(p, 'bourse', 'cuir', (0.12, 0.95, 0.09), (0.06, 0.08, 0.035), lambda P: _w_hanche(P))
    return pal


def _w_hanche(P):
    from moteur import w_jupe
    return w_jupe(P)


def _lacage(c):
    m = (c.z > 0.08) & (c.ax < 0.012) & (c.y > 1.40)
    c.poser('cuir', m)


def _bandes_molletiere(c):
    c.col = c.col * (1 - 0.18 * (((c.y + c.x) * 35) % 1 < 0.15))[:, None]


# ---------------------------------------------------------------------------------------------
# ÉPOQUE MODERNE (1500-1815)
# ---------------------------------------------------------------------------------------------
def conquistador(p):
    pal = base('mate', 'noir', chausses=Mat('tissu', (0.55, 0.12, 0.10)))
    torse(p, zones('joueur'), ep=-0.004, y_bas=1.0)
    gilet(p, 'acier', 1.02, 1.50, 0.024, base_ep=-0.004, decor=[plastron])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.15, 0.10, 0.07))])
    morion(p, 'acier', plume='joueur')
    barbe(p, 'barbe', 'pointue')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.66)), decor=[rayures('chausses', 0.03, 0)])
    manchon_bras(p, 'bouffant', 'joueur', 0.13, 0.30, 0.025, evase=-0.01, decor=[rayures('chausses', 0.03, 0)])
    mains(p, 'cuir')
    jambes(p, 'chausses')
    manchon_jambe(p, 'botte', 'cuir_noir', 0.62, 0.10, 0.012, n=6, ext_fn=lambda y: 0.02 * ss(0.54, 0.62, y))
    pieds(p, 'cuir_noir', ext=0.008, haut=0.01)
    jupe(p, 'trousses', 'joueur', 1.02, 0.76, 0.02, 0.05, decor=[rayures('chausses', 0.03, 0)], force=0.9)
    ceinture(p, 'cuir', 1.01, 0.03, 0.03, decor=[_boucle])
    return pal


def mousquetaire(p):
    pal = base('claire', 'chatain', bleu=Mat('tissu', (0.18, 0.22, 0.45)), croix_blanche=Mat('tissu', (0.92, 0.90, 0.86)),
               feutre=Mat('tissu', (0.12, 0.10, 0.09)), plume_blanche=Mat('plumes', (0.92, 0.90, 0.86)))
    torse(p, 'bleu', ep=-0.004, y_bas=1.0)
    gilet(p, 'joueur', 1.0, 1.53, 0.016, base_ep=-0.004, decor=[croix('croix_blanche', 1.30, 0.02, 0.10, 0.14)])
    col(p, 'blanc', 1.53, 0.03, 0.035)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.25, 0.15))])
    cheveux(p, 'cheveux', 'long')
    moustache(p, 'barbe')
    chapeau(p, 'feutre', 'mousquetaire', plume='plume_blanche')
    bras(p, zones('bleu', ('peau', lambda c: c.ax > 0.66)))
    manchon_bras(p, 'gant', 'cuir', 0.58, 0.68, 0.012, evase=0.025)
    mains(p, 'cuir')
    jambes(p, 'bleu')
    manchon_jambe(p, 'botte', 'cuir', 0.66, 0.10, 0.012, n=6, ext_fn=lambda y: 0.03 * ss(0.56, 0.66, y))
    pieds(p, 'cuir', ext=0.008, haut=0.01)
    jupe(p, 'casaque', 'joueur', 1.0, 0.74, 0.016, 0.06, decor=[croix('croix_blanche', 0.90, 0.02, 0.07, 0.12)])
    ceinture(p, 'cuir', 1.0, 0.035, 0.03, decor=[_boucle])
    return pal


def soldat_napoleonien(p):
    pal = base('claire', 'brun', drap=Mat('tissu', (0.90, 0.89, 0.86)), noir=Mat('cuir', (0.08, 0.07, 0.07), rug=0.4),
               rouge=Mat('tissu', (0.70, 0.12, 0.10)))
    torse(p, 'joueur', ep=0.0, y_bas=1.0, decor=[baudriers('drap', 0.02), boutons('or'), _plastron_blanc])
    col(p, 'rouge', 1.54, 0.035, 0.03)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.25, 0.15))])
    cheveux(p, 'cheveux', 'court')
    moustache(p, 'barbe')
    shako(p, 'noir', visiere='noir', plume='rouge')
    epaulieres(p, 'rouge', 'bandes')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.67), ('rouge', lambda c: (c.ax > 0.61) & (c.ax < 0.67))))
    mains(p, 'peau')
    bassin(p, 'drap')
    jambes(p, 'drap')
    manchon_jambe(p, 'guetre', 'noir', 0.46, 0.10, 0.008, n=5, decor=[boutons_guetre])
    pieds(p, 'noir', ext=0.006, haut=0.008)
    for s in (1, -1):
        boite_piece(p, 'basque%d' % (s > 0), 'joueur', (s * 0.065, 0.84, -0.135), (0.11, 0.36, 0.022),
                    lambda P: _w_hanche(P), rot=rot_x(0.12), arrondi=0.3)
    ceinture(p, 'drap', 1.03, 0.04, 0.02)
    sac_dos(p, 'cuir', (0.28, 0.30, 0.10), 1.32, rouleau='rouge')
    return pal


def _plastron_blanc(c):
    c.poser('drap', (c.z > 0.06) & (c.ax < 0.05) & (c.y > 1.05) & (c.y < 1.50))


def boutons_guetre(c):
    m = (np.abs(c.x - 0.165) < 0.006) & (((c.y * 30) % 1) < 0.25) & (c.y > 0.14)
    c.col = np.where(m[:, None], c.col * 1.8 + 0.1, c.col)


# ---------------------------------------------------------------------------------------------
# ÈRE INDUSTRIELLE (XIXe)
# ---------------------------------------------------------------------------------------------
def cowboy(p):
    pal = base('mate', 'chatain', jean=Mat('tissu', (0.20, 0.26, 0.40)), chemise=Mat('tissu', (0.80, 0.72, 0.60)),
               feutre=Mat('tissu', (0.42, 0.32, 0.22)), foulard=Mat('tissu', (0.72, 0.16, 0.12)))
    torse(p, 'chemise', ep=-0.008, y_bas=1.0)
    gilet(p, 'joueur', 1.0, 1.50, 0.012, base_ep=-0.008, decor=[boutons('or', 0.03, (1.10, 1.20, 1.30), 0.006)])
    col(p, 'foulard', 1.535, 0.04, 0.03)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.25, 0.15))])
    cheveux(p, 'cheveux', 'court')
    moustache(p, 'barbe')
    chapeau(p, 'feutre', 'cowboy', ruban='cuir')
    bras(p, zones('chemise', ('peau', lambda c: c.ax > 0.66)))
    mains(p, 'peau')
    bassin(p, 'jean')
    jambes(p, 'jean')
    manchon_jambe(p, 'botte', 'cuir', 0.40, 0.10, 0.012, n=5, ext_fn=lambda y: 0.012 * ss(0.33, 0.40, y))
    pieds(p, 'cuir', ext=0.008, haut=0.012, bout_rond=1.5)
    ceinture(p, 'cuir', 0.97, 0.04, 0.014, nom='ceinturon', decor=[_balles])
    boite_piece(p, 'holster', 'cuir', (0.20, 0.87, 0.0), (0.04, 0.16, 0.07), lambda P: _w_hanche(P))
    return pal


def _balles(c):
    c.poser('or', (np.abs(((np.arctan2(c.z, c.x) * 18) % 1) - 0.5) < 0.18) & (c.z < 0))


# ---------------------------------------------------------------------------------------------
# XXe SIÈCLE ET CONTEMPORAIN
# ---------------------------------------------------------------------------------------------
def soldat_1940(p):
    pal = base('mate', 'brun', kaki=Mat('tissu', (0.42, 0.40, 0.28)), olive=Mat('peinture', (0.30, 0.32, 0.22), rug=0.65),
               toile=Mat('tissu', (0.55, 0.50, 0.36)))
    torse(p, 'joueur', ep=0.0, y_bas=1.0, decor=[boutons('cuir', 0.0, (1.12, 1.22, 1.32, 1.42), 0.007)])
    col(p, 'joueur', 1.54, 0.03, 0.025)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.25, 0.15))])
    cheveux(p, 'cheveux', 'court')
    casque_rond(p, 'olive', '1940', decor=[_filet])
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.67)))
    mains(p, 'peau')
    bassin(p, 'kaki')
    jambes(p, 'kaki')
    manchon_jambe(p, 'guetre', 'toile', 0.32, 0.10, 0.012, n=4)
    pieds(p, 'cuir', ext=0.008, haut=0.012)
    ceinture(p, 'toile', 1.0, 0.045, 0.02, decor=[])
    sacoches(p, 'toile', 1.0, 4, (0.055, 0.06, 0.035), ep=0.02)
    sac_dos(p, 'toile', (0.28, 0.30, 0.12), 1.30)
    return pal


def _filet(c):
    m = (np.abs(((c.x + c.y) * 45) % 1 - 0.5) < 0.05) | (np.abs(((c.x - c.y) * 45) % 1 - 0.5) < 0.05)
    c.col = np.where(m[:, None], c.col * 0.7, c.col)


def soldat_moderne(p):
    pal = base('brune', 'noir', camo1=Mat('tissu', (0.50, 0.46, 0.36)), camo2=Mat('tissu', (0.33, 0.33, 0.24)),
               camo3=Mat('tissu', (0.22, 0.20, 0.16)), tactique=Mat('tissu', (0.36, 0.34, 0.26), rug=0.8),
               casque=Mat('peinture', (0.40, 0.38, 0.30), rug=0.7), verre=Mat('peinture', (0.05, 0.06, 0.07), rug=0.1, metal=0.3))
    torse(p, 'joueur', ep=-0.006, y_bas=1.0)
    gilet(p, 'tactique', 1.04, 1.49, 0.04, base_ep=-0.006, decor=[_sangles_gilet])
    col(p, 'tactique', 1.54, 0.03, 0.02)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.15, 0.10, 0.07), (0.05, 0.04, 0.03))])
    casque_rond(p, 'casque', 'moderne', decor=[_bandes_casque])
    boite_piece(p, 'lunettes', 'verre', (0, 1.79, 0.105), (0.15, 0.04, 0.05), w_os_tete(), arrondi=0.6)
    boite_piece(p, 'support', 'sombre', (0, 1.84, 0.115), (0.04, 0.03, 0.03), w_os_tete())
    epaulieres(p, 'tactique', 'bandes')
    bras(p, zones('joueur', ('sombre', lambda c: c.ax > 0.66)), decor=[camouflage(('camo1', None, 'camo3'))])
    mains(p, 'sombre')
    bassin(p, 'camo1', decor=[camouflage(('camo2', None, 'camo3'))])
    jambes(p, 'camo1', decor=[camouflage(('camo2', None, 'camo3'))])
    manchon_jambe(p, 'genouillere', 'sombre', 0.60, 0.49, 0.014, n=3)
    manchon_jambe(p, 'rangers', 'cuir_noir', 0.28, 0.10, 0.012, n=4)
    pieds(p, 'cuir_noir', semelle='sombre', ext=0.01, haut=0.014)
    sacoches(p, 'tactique', 1.22, 3, (0.06, 0.09, 0.04), ep=0.03)
    ceinture(p, 'tactique', 0.99, 0.05, 0.02)
    sacoches(p, 'tactique', 0.98, 2, (0.06, 0.07, 0.04), ep=0.02, avant=False)
    return pal


def w_os_tete():
    from moteur import w_os
    return w_os('Head')


def _sangles_gilet(c):
    m = (((c.y * 30) % 1) < 0.18) & (c.y > 1.06) & (c.y < 1.20) & (c.z > 0.05)
    c.col = np.where(m[:, None], c.col * 0.75, c.col)
    c.poser('joueur', (c.z < -0.06) & (np.abs(c.y - 1.38) < 0.02) & (c.ax < 0.06))


def _bandes_casque(c):
    c.col = c.col * (1 - 0.3 * (np.abs(c.y - 1.80) < 0.006))[:, None]


def ouvrier_chantier(p):
    pal = base('mate', 'brun', jaune=Mat('peinture', (0.95, 0.72, 0.10), rug=0.45),
               jean=Mat('tissu', (0.22, 0.28, 0.42)), tshirt=Mat('tissu', (0.30, 0.30, 0.32)),
               bande_refl=Mat('peinture', (0.82, 0.82, 0.80), rug=0.3, metal=0.2))
    torse(p, 'tshirt', ep=-0.010, y_bas=1.0)
    gilet(p, 'joueur', 1.0, 1.50, 0.012, base_ep=-0.010, decor=[_bandes_refl])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.25, 0.18, 0.10))])
    cheveux(p, 'cheveux', 'court')
    barbe(p, 'barbe', 'courte')
    casque_chantier(p, 'jaune')
    bras(p, zones('tshirt', ('peau', lambda c: c.ax > 0.30)))
    manchon_bras(p, 'gant', 'cuir', 0.66, 0.70, 0.01)
    mains(p, 'cuir')
    bassin(p, 'jean')
    jambes(p, 'jean')
    manchon_jambe(p, 'chaussure', 'cuir', 0.20, 0.10, 0.012, n=3)
    pieds(p, 'cuir', semelle='sombre', ext=0.012, haut=0.016, bout_rond=1.3)
    ceinture(p, 'cuir_noir', 0.98, 0.04, 0.012)
    sacoches(p, 'cuir', 0.96, 2, (0.07, 0.09, 0.04), ep=0.012, avant=False)
    return pal


def _bandes_refl(c):
    c.poser('bande_refl', (np.abs(c.y - 1.16) < 0.018) | (np.abs(c.y - 1.26) < 0.018))


# ---------------------------------------------------------------------------------------------
# FUTUR
# ---------------------------------------------------------------------------------------------
def soldat_futuriste(p):
    pal = base('mate', 'noir', armure=Mat('peinture', (0.86, 0.87, 0.88), rug=0.35, metal=0.4),
               combi=Mat('tissu', (0.12, 0.13, 0.15), rug=0.6), cyan=Mat('lumiere', (0.35, 0.95, 1.0)),
               visiere=Mat('lumiere', (0.30, 0.85, 1.0)))
    torse(p, 'combi', ep=-0.004, y_bas=1.0)
    gilet(p, 'joueur_metal', 1.04, 1.53, 0.045, base_ep=-0.004, decor=[lignes_lumineuses('cyan', (1.20, 1.34), (0.0,)),
                                                                     _plaques])
    cou(p, 'combi')
    casque_integral(p, 'joueur_metal', 'visiere')
    epaulieres(p, 'joueur_metal', 'futur', decor=[lignes_lumineuses('cyan', (1.56,))])
    bras(p, zones('combi'))
    manchon_bras(p, 'avant_bras', 'armure', 0.50, 0.70, 0.018, evase=0.006, decor=[lignes_lumineuses('cyan', (), (0.6,))])
    mains(p, 'combi')
    bassin(p, 'combi')
    jambes(p, 'combi')
    manchon_jambe(p, 'cuissard', 'joueur_metal', 0.86, 0.62, 0.02, n=4)
    manchon_jambe(p, 'tibia', 'armure', 0.58, 0.12, 0.02, n=6, ext_fn=jambiere,
                  decor=[lignes_lumineuses('cyan', (0.35,))])
    pieds(p, 'armure', semelle='combi', ext=0.014, haut=0.016)
    ceinture(p, 'armure', 1.0, 0.06, 0.03, decor=[lignes_lumineuses('cyan', (1.0,))])
    sac_dos(p, 'armure', (0.24, 0.28, 0.08), 1.32, decor=[lignes_lumineuses('cyan', (1.32,))])
    return pal


def _plaques(c):
    c.trait(np.abs(c.y - 1.27) + 3 * np.maximum(c.ax - 0.12, 0), 0.003, 0.5)
    c.trait(np.where(c.y > 1.27, np.abs(c.ax - 0.06), 1), 0.003, 0.4)


def androide(p):
    p.m = SVELTE
    pal = base('mate', 'noir', chassis=Mat('peinture', (0.80, 0.82, 0.84), rug=0.3, metal=0.6),
               cyan=Mat('lumiere', (0.40, 0.95, 1.0)), joint=Mat('metal', (0.20, 0.21, 0.23), rug=0.4))
    torse(p, 'chassis', ep=0.0, y_bas=1.0, decor=[_panneaux_robot, lignes_lumineuses('cyan', (1.28,))])
    bassin(p, 'joueur_metal')
    cou(p, 'joint')
    tete_robot(p, 'chassis', oeil='cyan', joint='joint')
    epaulieres(p, 'joueur_metal', 'dome', taille=0.8)
    bras(p, zones('chassis', ('joueur_metal', lambda c: (c.ax > 0.25) & (c.ax < 0.40))),
         decor=[articulations('joint')])
    mains(p, 'joint')
    jambes(p, zones('chassis', ('joueur_metal', lambda c: (c.y > 0.62) & (c.y < 0.85))), decor=[articulations('joint')])
    pieds(p, 'chassis', semelle='joint', ext=0.008, haut=0.006)
    ceinture(p, 'joueur_metal', 1.02, 0.05, 0.02)
    return pal


def _panneaux_robot(c):
    c.trait(np.abs(c.y - 1.20), 0.003, 0.5)
    c.trait(np.where(c.y > 1.20, np.abs(c.ax - 0.07), 1), 0.003, 0.4)
    c.poser('joueur_metal', (c.z > 0.05) & (c.y > 1.36) & (c.y < 1.46) & (c.ax < 0.11))


def pilote_spatiale(p):
    p.m = FEMME
    pal = base('claire', 'roux', combi=Mat('tissu', (0.42, 0.46, 0.54), rug=0.6),
               coque=Mat('peinture', (0.90, 0.90, 0.92), rug=0.35, metal=0.2), cyan=Mat('lumiere', (0.40, 0.90, 1.0)),
               orange=Mat('peinture', (0.95, 0.45, 0.10), rug=0.4))
    torse(p, 'combi', ep=-0.006, y_bas=1.0, decor=[_combinaison])
    cou(p, 'combi')
    col(p, 'coque', 1.55, 0.04, 0.035)
    tete(p, 'peau', decor=[visage((0.20, 0.45, 0.30), (0.50, 0.24, 0.10), femme=True)])
    cheveux(p, 'cheveux', 'queue')
    bras(p, zones('joueur', ('combi', lambda c: (c.ax > 0.30) & (c.ax < 0.62)), ('coque', lambda c: c.ax > 0.66)))
    mains(p, 'coque')
    bassin(p, 'combi')
    jambes(p, zones('combi', ('joueur', lambda c: (c.ax > c.ax * 0 + 0.17) | ((c.y > 0.66) & (c.y < 0.74)))))
    manchon_jambe(p, 'botte', 'coque', 0.36, 0.10, 0.014, n=5)
    pieds(p, 'coque', semelle='combi', ext=0.012, haut=0.014)
    ceinture(p, 'orange', 1.0, 0.045, 0.014)
    reacteur(p, 'coque', 'cyan')
    return pal


def _combinaison(c):
    c.poser('joueur', (c.y > 1.36) | (c.ax > 0.12))
    c.poser('orange', (c.z > 0.06) & (np.abs(c.x - 0.07) < 0.025) & (np.abs(c.y - 1.38) < 0.015))


# ---------------------------------------------------------------------------------------------
PERSONNAGES = [
    # ère, identifiant, nom, culture, silhouette, fonction, accessoires conseillés
    ('1-antiquite', 'hoplite-grec', 'Hoplite', 'Grèce antique', HEROS, hoplite_grec, ['lance-dory', 'bouclier-hoplon', 'xiphos']),
    ('1-antiquite', 'legionnaire-romain', 'Légionnaire', 'Rome antique', HEROS, legionnaire_romain, ['gladius', 'scutum', 'pilum']),
    ('1-antiquite', 'archer-egyptien', 'Archer', 'Égypte antique', SVELTE, archer_egyptien, ['arc-egyptien', 'khopesh']),
    ('1-antiquite', 'guerrier-celte', 'Guerrier', 'Gaule / Celtes', ROBUSTE, guerrier_celte, ['epee-celte', 'bouclier-celte']),
    ('1-antiquite', 'villageoise-antique', 'Villageoise', 'Méditerranée antique', FEMME, villageoise_antique, ['panier', 'faucille']),
    ('2-moyen-age', 'chevalier', 'Chevalier', 'Europe médiévale', HEROS, chevalier, ['epee-longue', 'bouclier-ecu', 'etendard']),
    ('2-moyen-age', 'viking', 'Viking', 'Scandinavie', ROBUSTE, viking, ['hache-viking', 'bouclier-viking']),
    ('2-moyen-age', 'samourai', 'Samouraï', 'Japon féodal', HEROS, samourai, ['katana', 'yari']),
    ('2-moyen-age', 'guerrier-jaguar', 'Guerrier jaguar', 'Aztèques', HEROS, guerrier_jaguar, ['macuahuitl', 'chimalli']),
    ('2-moyen-age', 'cavalier-mongol', 'Archer des steppes', 'Mongols', HEROS, cavalier_mongol, ['arc-composite', 'sabre']),
    ('2-moyen-age', 'villageois-medieval', 'Villageois', 'Europe médiévale', SVELTE, villageois_medieval, ['hache-bucheron', 'pioche', 'marteau']),
    ('3-epoque-moderne', 'conquistador', 'Conquistador', 'Espagne', HEROS, conquistador, ['rapiere', 'arquebuse']),
    ('3-epoque-moderne', 'mousquetaire', 'Mousquetaire', 'France', HEROS, mousquetaire, ['rapiere', 'mousquet']),
    ('3-epoque-moderne', 'soldat-napoleonien', 'Fusilier', 'Empire (1805)', HEROS, soldat_napoleonien, ['fusil-baionnette', 'tambour']),
    ('4-industrielle', 'cowboy', 'Pionnier', 'Far West', SVELTE, cowboy, ['revolver', 'carabine', 'lasso']),
    ('5-xxe-siecle', 'soldat-1940', 'Fantassin', 'Seconde Guerre mondiale', HEROS, soldat_1940, ['fusil-1940', 'pelle']),
    ('6-contemporain', 'soldat-moderne', 'Soldat', 'Armée moderne', HEROS, soldat_moderne, ['fusil-assaut', 'pistolet']),
    ('6-contemporain', 'ouvrier-chantier', 'Ouvrier', 'Monde moderne', HEROS, ouvrier_chantier, ['cle', 'pelle', 'marteau']),
    ('7-futur', 'soldat-futuriste', 'Soldat cybernétique', 'Futur', HEROS, soldat_futuriste, ['fusil-laser', 'bouclier-energie']),
    ('7-futur', 'androide', 'Androïde', 'Futur', SVELTE, androide, ['epee-energie']),
    ('7-futur', 'pilote-spatiale', 'Pilote spatiale', 'Futur', FEMME, pilote_spatiale, ['pistolet-laser', 'drone']),
]
