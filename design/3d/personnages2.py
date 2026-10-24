"""Catalogue complémentaire : toutes les familles d'unités par ère (villageois, infanterie, tireurs, cavaliers,
prêtres et soigneurs, héros, éclaireurs) et d'autres cultures."""
import numpy as np

from moteur import Mat, zones, ss, mix, rot_x, w_os
from corps import *  # noqa: F401,F403
from corps import (HEROS, FEMME, ROBUSTE, SVELTE, Morph, torse, bassin, cou, bras, manchon_bras, mains, jambes,
                   manchon_jambe, pieds, sandales, tete, visage, cheveux, barbe, moustache, casque_galea, casque_conique,
                   casque_rond, casque_integral, chapeau, nemes, bonnet_fourrure, capuche, cimier_crin, jupe, lanieres,
                   lin_lanieres, ceinture, gilet, col, cape, ourlet, col_fourrure, epaulieres, bandes_horizontales,
                   croix, baudriers, boutons, camouflage, carreaux, rayures, lignes_lumineuses, articulations,
                   collier_large, sacoches, sac_dos, carquois, boite_piece, anneau_tete, laurier, couronne, turban,
                   bonnet_phrygien, bicorne, casquette, casque_adrian, coiffe_plumes, foulard, cagoule_pilote,
                   barbe_postiche, bonnet_haut, casque_pointe, ecailles, matelasse, damier, franges, croix_rouge,
                   bande_verticale, peinture_visage, cache_oeil, tatouages, calotte, _ligne_cheveux, tete_robot,
                   _w_dos)
from personnages import (base, peau_et, jambiere, cuirasse_musclee, plastron, ourlet_manche, _boucle, _w_hanche,
                         _jambiere_deco, w_os_tete)

FEMME_FORTE = Morph(carrure=0.9, taille=0.86, hanches=1.08, bras=0.84, jambes=0.92, poitrine=0.9, mains=0.9, pecs=0.0,
                    cou=0.9)
AGE = Morph(carrure=0.92, taille=1.05, bras=0.85, jambes=0.9, ventre=0.02, mains=0.95, pecs=0.3)


def plis(c):
    c.col = c.col * (1 - 0.10 * (np.sin(np.arctan2(c.z, c.x) * 14 + c.y * 3) > 0.55))[:, None]


def tablier(cle, y0=1.10, y1=0.5, larg=0.14):
    def f(c):
        c.poser(cle, (c.z > 0.05) & (c.ax < larg) & (c.y < y0) & (c.y > y1))
    return f


# ---------------------------------------------------------------------------------------------
# ANTIQUITÉ
# ---------------------------------------------------------------------------------------------
def villageois_antique(p):
    pal = base('olive', 'noir')
    torse(p, 'joueur', ep=-0.004, y_bas=1.0, decor=[plis])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.20, 0.13, 0.08))])
    cheveux(p, 'cheveux', 'court')
    barbe(p, 'barbe', 'courte')
    chapeau(p, 'lin', 'paille')
    bras(p, peau_et([('joueur', lambda c: c.ax < 0.25)]))
    mains(p, 'peau')
    jambes(p, 'peau')
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'tunique', 'joueur', 1.0, 0.68, -0.004, 0.05, decor=[ourlet(0.70), plis])
    ceinture(p, 'cuir', 1.02, 0.03, 0.012)
    return pal


def heros_grec(p):
    pal = base('mate', 'brun', crin=Mat('cheveux', (0.72, 0.08, 0.05), rug=0.78))
    torse(p, 'or', ep=0.0, rebord=True, y_bas=0.995, decor=[cuirasse_musclee])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.25, 0.30, 0.40))])
    casque_galea(p, 'bronze', joues=True)
    cimier_crin(p, 'crin', hauteur=1.3)
    barbe(p, 'barbe', 'courte')
    bras(p, peau_et([('or', lambda c: (c.ax > 0.64) & (c.ax < 0.71))]))
    manchon_bras(p, 'manche', 'joueur', 0.12, 0.285, 0.012, evase=0.008, decor=[ourlet_manche(0.285)])
    mains(p, 'peau')
    jambes(p, 'peau')
    manchon_jambe(p, 'jambiere', 'or', 0.62, 0.13, 0.012, n=9, ext_fn=jambiere, decor=[_jambiere_deco])
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'tunique', 'joueur', 0.98, 0.705, 0.0, 0.058, decor=[ourlet(0.725)])
    lanieres(p, 'pteryge', 'or', 20, 0.0, 1.025, 0.80, 0.024, decor=[lin_lanieres('cuir')])
    cape(p, 'joueur', bas=0.30, largeur=1.1)
    return pal


def pretresse_grecque(p):
    pal = base('claire', 'chatain', voile=Mat('tissu', (0.95, 0.94, 0.90)))
    torse(p, 'voile', ep=-0.004, y_bas=1.0, decor=[plis, bande_verticale('joueur', 0.05, True, False)])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.25, 0.35, 0.30), femme=True)])
    cheveux(p, 'cheveux', 'long')
    laurier(p, 'or')
    bras(p, peau_et([('voile', lambda c: c.ax < 0.42)]))
    manchon_bras(p, 'manche', 'voile', 0.30, 0.42, 0.012, evase=0.04)
    mains(p, 'peau')
    jambes(p, 'peau')
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'chiton', 'voile', 1.02, 0.11, -0.004, 0.12, n=8, decor=[ourlet(0.13), plis,
                                                                      bande_verticale('joueur', 0.05, True, False)], force=0.7)
    ceinture(p, 'or', 1.17, 0.022, 0.008)
    cape(p, 'joueur', bas=0.25, largeur=0.85)
    return pal


def pretre_egyptien(p):
    pal = base('brune', 'noir', leopard=Mat('fourrure', (0.80, 0.60, 0.25)), lapis=Mat('peinture', (0.10, 0.22, 0.55)))
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[collier_large(('or', 'lapis', 'or'))])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03))])
    bras(p, peau_et([('or', lambda c: (c.ax > 0.66) & (c.ax < 0.70))]))
    mains(p, 'peau')
    jambes(p, 'peau')
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'pagne', 'lin', 1.04, 0.15, 0.004, 0.10, n=8, decor=[ourlet(0.17), plis], force=0.75)
    ceinture(p, 'joueur', 1.04, 0.05, 0.012)
    gilet(p, 'leopard', 1.08, 1.50, 0.012, base_ep=-0.012, decor=[_peau_leopard])
    return pal


def _peau_leopard(c):
    from moteur import bruit
    n = bruit(c.P, 60, 5)
    c.col = np.where(((n > 0.65) & (n < 0.73))[:, None], c.col * 0.2, c.col)
    c.poser('peau', (c.x < 0) & (c.y > 1.25))


def pharaon(p):
    pal = base('brune', 'noir', lapis=Mat('peinture', (0.10, 0.22, 0.55), rug=0.35))
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[collier_large(('or', 'lapis', 'or', 'joueur', 'or'))])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03))])
    nemes(p, 'joueur', rayure='or')
    barbe_postiche(p, 'or')
    bras(p, peau_et([('or', lambda c: ((c.ax > 0.28) & (c.ax < 0.33)) | ((c.ax > 0.62) & (c.ax < 0.70)))]))
    mains(p, 'peau')
    jambes(p, 'peau', decor=[sandales])
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'pagne', zones('lin', ('or', lambda c: (c.ax < 0.06) & (c.z > 0))), 1.02, 0.55, 0.004, 0.08,
         decor=[ourlet(0.57), plis], devant=1.1)
    ceinture(p, 'or', 1.02, 0.05, 0.012)
    cape(p, 'joueur', bas=0.35, largeur=0.9)
    return pal


def immortel_perse(p):
    pal = base('olive', 'noir', robe=Mat('tissu', (0.62, 0.48, 0.20)), ecailles=Mat('metal', (0.78, 0.62, 0.30)))
    torse(p, 'ecailles', ep=0.004, y_bas=1.0, decor=[ecailles()])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03))])
    bonnet_phrygien(p, 'joueur')
    barbe(p, 'barbe', 'longue')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.64)))
    manchon_bras(p, 'manche', 'joueur', 0.40, 0.62, 0.014, evase=0.03)
    mains(p, 'peau')
    jambes(p, 'robe')
    pieds(p, 'cuir', ext=0.008, haut=0.01)
    jupe(p, 'robe', 'joueur', 1.0, 0.18, 0.006, 0.10, n=8, decor=[ourlet(0.20), plis, rayures('robe', 0.12, 1, 0.12)],
         force=0.8)
    ceinture(p, 'or', 1.0, 0.04, 0.02)
    carquois(p, 'cuir')
    return pal


def soldat_qin(p):
    pal = base('doree', 'noir', plaques=Mat('peinture', (0.30, 0.26, 0.22), rug=0.6),
               rivet=Mat('metal', (0.8, 0.6, 0.3)))
    torse(p, 'joueur', ep=-0.006, y_bas=1.0)
    gilet(p, 'plaques', 1.0, 1.52, 0.022, base_ep=-0.006, decor=[_lamelles_qin])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03))])
    calotte(p, 'cheveux', 'cheveux', _ligne_cheveux('haut'), off=0.010)
    p.ajoute('chignon', __import__('moteur').boite((0.03, 1.86, -0.02), (0.06, 0.05, 0.06), K=p.k(8), arrondi=0.9),
             'cheveux', w_os('Head'), xf=p.tete_xf())
    moustache(p, 'barbe')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.64)))
    mains(p, 'peau')
    jambes(p, 'joueur')
    manchon_jambe(p, 'bande', 'lin', 0.42, 0.10, 0.012, n=4)
    pieds(p, 'cuir', ext=0.006, haut=0.008, bout_rond=1.5)
    jupe(p, 'tunique', 'joueur', 1.0, 0.62, 0.012, 0.05, decor=[ourlet(0.64)])
    ceinture(p, 'cuir', 1.02, 0.03, 0.03)
    return pal


def _lamelles_qin(c):
    r = (c.ST[:, 1] * c.piece.taille[1] / 0.035) % 1
    u = (c.ST[:, 0] * c.piece.taille[0] / 0.05) % 1
    c.col = c.col * (1 - 0.4 * (r < 0.12))[:, None]
    c.poser('rivet', (np.abs(u - 0.5) < 0.08) & (np.abs(r - 0.5) < 0.12))


def guerrier_nubien(p):
    pal = base('foncee', 'noir', leopard=Mat('fourrure', (0.80, 0.60, 0.25)), plume=Mat('plumes', (0.92, 0.90, 0.85)))
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[collier_large(('or', 'joueur', 'or'))])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.10, 0.07, 0.05), (0.04, 0.03, 0.03))])
    cheveux(p, 'cheveux', 'court')
    coiffe_plumes(p, 'joueur', 'plume', n=3, grande=False)
    bras(p, peau_et([('or', lambda c: (c.ax > 0.30) & (c.ax < 0.335))]))
    mains(p, 'peau')
    jambes(p, 'peau', decor=[sandales])
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'pagne', 'leopard', 1.0, 0.76, 0.004, 0.03, decor=[_peau_leopard2])
    ceinture(p, 'joueur', 1.0, 0.04, 0.012)
    carquois(p, 'cuir')
    return pal


def _peau_leopard2(c):
    from moteur import bruit
    n = bruit(c.P, 60, 5)
    c.col = np.where(((n > 0.65) & (n < 0.73))[:, None], c.col * 0.2, c.col)


def archere_scythe(p):
    pal = base('claire', 'roux', feutre=Mat('tissu', (0.50, 0.20, 0.12)), braies=Mat('tissu', (0.30, 0.26, 0.20)))
    torse(p, 'joueur', ep=-0.004, y_bas=1.0, decor=[_galons_scythes])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.25, 0.40, 0.35), (0.45, 0.20, 0.08), femme=True)])
    cheveux(p, 'cheveux', 'tresses')
    bonnet_phrygien(p, 'feutre')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.66)), decor=[_galons_scythes])
    mains(p, 'peau')
    bassin(p, 'braies')
    jambes(p, 'braies', decor=[_galons_scythes])
    manchon_jambe(p, 'botte', 'cuir', 0.34, 0.10, 0.012, n=4)
    pieds(p, 'cuir', ext=0.008, haut=0.01)
    jupe(p, 'kaftan', 'joueur', 1.0, 0.70, 0.004, 0.05, decor=[ourlet(0.72)])
    ceinture(p, 'or', 1.02, 0.03, 0.012)
    carquois(p, 'cuir')
    return pal


def _galons_scythes(c):
    m = (np.abs(((c.ST[:, 1] * c.piece.taille[1]) / 0.12) % 1 - 0.5) < 0.05)
    c.col = np.where(m[:, None], np.array([0.85, 0.65, 0.20]), c.col)


# ---------------------------------------------------------------------------------------------
# MOYEN ÂGE
# ---------------------------------------------------------------------------------------------
def archer_anglais(p):
    pal = base('claire', 'chatain', gambeson=Mat('tissu', (0.68, 0.60, 0.45)), chausses=Mat('tissu', (0.30, 0.34, 0.22)))
    torse(p, 'gambeson', ep=0.006, y_bas=1.0, decor=[matelasse()])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.40, 0.45))])
    cheveux(p, 'cheveux', 'court')
    barbe(p, 'barbe', 'courte')
    capuche(p, 'joueur')
    bras(p, zones('gambeson', ('peau', lambda c: c.ax > 0.66), ('cuir', lambda c: (c.ax > 0.52) & (c.ax < 0.66))),
         decor=[matelasse()])
    mains(p, 'peau')
    jambes(p, 'chausses')
    pieds(p, 'cuir', ext=0.008, haut=0.01)
    jupe(p, 'gambeson_bas', 'gambeson', 1.0, 0.70, 0.010, 0.05, decor=[matelasse(), ourlet(0.72)])
    ceinture(p, 'cuir', 1.0, 0.03, 0.025)
    carquois(p, 'cuir')
    return pal


def moine(p):
    pal = base('mate', 'chatain', bure=Mat('tissu', (0.36, 0.26, 0.18)), corde=Mat('tissu', (0.80, 0.70, 0.50)))
    torse(p, 'bure', ep=0.006, y_bas=1.0, decor=[bande_verticale('joueur', 0.07)])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.25, 0.15))])
    calotte(p, 'cheveux', 'cheveux', lambda th: 1.70 + 0.07 * np.clip(np.sin(th), 0, 1) - 0.07 * np.clip(-np.sin(th), 0, 1),
            off=0.008, y_haut=1.81, R=4)
    barbe(p, 'barbe', 'courte')
    bras(p, zones('bure', ('peau', lambda c: c.ax > 0.66)))
    manchon_bras(p, 'manche', 'bure', 0.42, 0.62, 0.016, evase=0.05)
    mains(p, 'peau')
    jambes(p, 'bure')
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'robe', 'bure', 1.02, 0.11, 0.008, 0.10, n=8, decor=[plis, bande_verticale('joueur', 0.07)], force=0.75)
    ceinture(p, 'corde', 1.04, 0.02, 0.022)
    col(p, 'bure', 1.555, 0.06, 0.06, nom='capuche_baissee')
    return pal


def paysanne_medievale(p):
    pal = base('claire', 'blond', robe=Mat('tissu', (0.45, 0.32, 0.22)), lin=Mat('tissu', (0.88, 0.84, 0.74)))
    torse(p, 'joueur', ep=-0.004, y_bas=1.0, decor=[_lacage_corsage])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.40, 0.45), femme=True)])
    foulard(p, 'lin')
    bras(p, zones('lin', ('peau', lambda c: c.ax > 0.58)))
    mains(p, 'peau')
    jambes(p, 'peau')
    pieds(p, 'cuir', ext=0.008, haut=0.008)
    jupe(p, 'robe', 'joueur', 1.02, 0.12, -0.004, 0.12, n=8, decor=[plis, tablier('lin', 1.0, 0.4, 0.13)], force=0.7)
    ceinture(p, 'cuir', 1.04, 0.025, 0.01)
    return pal


def _lacage_corsage(c):
    m = (c.z > 0.06) & (c.ax < 0.04) & (c.y < 1.40) & (np.abs(((c.y * 40) % 1) - 0.5) < 0.12) & (np.abs(c.ax - (c.y * 40 % 1) * 0.04) < 0.01)
    c.poser('cuir', m | ((c.z > 0.06) & (c.y > 1.40) & (c.y < 1.46)))


def roi_medieval(p):
    pal = base('claire', 'gris', mailles=Mat('mailles', (0.74, 0.76, 0.79), metal=0.7),
               hermine=Mat('fourrure', (0.95, 0.94, 0.92)), rouge=Mat('tissu', (0.60, 0.08, 0.08)))
    torse(p, 'mailles', ep=-0.004, y_bas=1.0)
    gilet(p, 'joueur', 1.0, 1.53, 0.018, base_ep=-0.004, decor=[_lion])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.40, 0.50))])
    cheveux(p, 'cheveux', 'long')
    barbe(p, 'barbe', 'longue')
    couronne(p, 'or')
    bras(p, zones('mailles', ('cuir', lambda c: c.ax > 0.62)))
    mains(p, 'cuir')
    jambes(p, 'mailles')
    pieds(p, 'acier', semelle='cuir_noir', ext=0.006, haut=0.006)
    jupe(p, 'surcot', 'joueur', 1.02, 0.45, 0.018, 0.08, n=6, decor=[ourlet(0.47)])
    ceinture(p, 'or', 1.05, 0.035, 0.024)
    col_fourrure(p, 'hermine')
    cape(p, 'rouge', bas=0.15, largeur=1.1)
    return pal


def _lion(c):
    m = (c.z > 0.05) & (np.hypot(c.x / 0.7, c.y - 1.30) < 0.045)
    c.poser('or', m)


def guerrier_sarrasin(p):
    pal = base('olive', 'noir', mailles=Mat('mailles', (0.70, 0.72, 0.75), metal=0.7), blanc=Mat('tissu', (0.92, 0.90, 0.85)))
    torse(p, 'mailles', ep=0.0, y_bas=1.0)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03))])
    barbe(p, 'barbe', 'pointue')
    turban(p, 'blanc', pointe='acier')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.66)))
    manchon_bras(p, 'manche_maille', 'mailles', 0.13, 0.32, 0.014)
    mains(p, 'peau')
    jambes(p, 'blanc')
    manchon_jambe(p, 'botte', 'cuir', 0.40, 0.10, 0.012, n=4)
    pieds(p, 'cuir', ext=0.008, haut=0.01, bout_rond=1.6)
    jupe(p, 'robe', 'joueur', 1.02, 0.42, 0.008, 0.09, n=6, decor=[ourlet(0.44), plis])
    ceinture(p, 'or', 1.02, 0.05, 0.02, decor=[_boucle])
    cape(p, 'blanc', bas=0.35, largeur=0.9)
    return pal


def cataphracte(p):
    pal = base('olive', 'brun', ecailles=Mat('metal', (0.70, 0.66, 0.58)), mailles=Mat('mailles', (0.70, 0.72, 0.75), metal=0.7))
    torse(p, 'ecailles', ep=0.008, y_bas=1.0, decor=[ecailles()])
    cou(p, 'mailles')
    tete(p, 'peau', decor=[visage((0.20, 0.15, 0.10))])
    casque_pointe(p, 'acier', 'mailles')
    barbe(p, 'barbe', 'courte')
    epaulieres(p, 'ecailles', 'plaque', decor=[ecailles()])
    bras(p, zones('mailles', ('cuir', lambda c: c.ax > 0.62)))
    mains(p, 'cuir')
    jambes(p, 'ecailles', decor=[ecailles()])
    manchon_jambe(p, 'botte', 'cuir', 0.38, 0.10, 0.012, n=4)
    pieds(p, 'cuir', ext=0.008, haut=0.01)
    jupe(p, 'tunique', 'joueur', 1.0, 0.62, 0.012, 0.06, decor=[ourlet(0.64)])
    ceinture(p, 'or', 1.02, 0.04, 0.03)
    cape(p, 'joueur', bas=0.45)
    return pal


def ninja(p):
    pal = base('doree', 'noir', noir=Mat('tissu', (0.07, 0.07, 0.09)))
    torse(p, 'noir', ep=-0.008, y_bas=1.0)
    cou(p, 'noir')
    tete(p, zones('noir', ('peau', lambda c: (c.z > 0.03) & (np.abs(c.y - 1.712) < 0.022) & (c.ax < 0.075))),
         decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03), bouche=False)])
    calotte(p, 'cagoule', 'noir', lambda th: 1.735 + 0.0 * th, off=0.006)
    anneau_tete(p, 'bandeau', 'joueur', 1.745, 0.012, 0.022, 0.008)
    bras(p, zones('noir'))
    manchon_bras(p, 'bande', 'noir', 0.56, 0.70, 0.010)
    mains(p, 'noir')
    bassin(p, 'noir')
    jambes(p, 'noir')
    manchon_jambe(p, 'molletiere', 'noir', 0.40, 0.10, 0.008, n=4)
    pieds(p, 'noir', ext=0.004, haut=0.004)
    ceinture(p, 'joueur', 1.0, 0.05, 0.016)
    return pal


def guerrier_inca(p):
    pal = base('brune', 'noir', unku=Mat('tissu', (0.85, 0.75, 0.55)), rouge=Mat('tissu', (0.70, 0.15, 0.10)))
    torse(p, 'unku', ep=-0.002, y_bas=1.0, decor=[damier('joueur', 0.07), _ceinture_inca])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03))])
    cheveux(p, 'cheveux', 'court')
    anneau_tete(p, 'llautu', 'rouge', 1.74, 0.012, 0.025, 0.01)
    bras(p, peau_et([('unku', lambda c: c.ax < 0.22), ('or', lambda c: (c.ax > 0.30) & (c.ax < 0.33))]))
    mains(p, 'peau')
    jambes(p, 'peau', decor=[sandales])
    pieds(p, 'peau', decor=[sandales])
    jupe(p, 'unku_bas', 'unku', 1.0, 0.66, -0.002, 0.04, decor=[damier('joueur', 0.07), ourlet(0.68)])
    return pal


def _ceinture_inca(c):
    c.poser('rouge', np.abs(c.y - 1.30) < 0.03)


# ---------------------------------------------------------------------------------------------
# ÉPOQUE MODERNE
# ---------------------------------------------------------------------------------------------
def janissaire(p):
    pal = base('olive', 'noir', feutre=Mat('tissu', (0.92, 0.90, 0.86)), ceinture_rouge=Mat('tissu', (0.70, 0.12, 0.10)),
               pantalon=Mat('tissu', (0.25, 0.30, 0.50)))
    torse(p, 'joueur', ep=0.004, y_bas=1.0, decor=[boutons('or', 0.03, (1.20, 1.28, 1.36, 1.44), 0.007)])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03))])
    moustache(p, 'barbe', tombante=True)
    bonnet_haut(p, 'feutre')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.66)))
    mains(p, 'peau')
    jambes(p, 'pantalon')
    pieds(p, 'cuir', ext=0.008, haut=0.01, bout_rond=1.7)
    jupe(p, 'kaftan', 'joueur', 1.0, 0.25, 0.008, 0.10, n=7, decor=[ourlet(0.27), plis], force=0.8)
    ceinture(p, 'ceinture_rouge', 1.04, 0.08, 0.02)
    return pal


def pirate(p):
    pal = base('mate', 'noir', manteau=Mat('tissu', (0.30, 0.12, 0.10)), chemise=Mat('tissu', (0.88, 0.85, 0.78)),
               pantalon=Mat('tissu', (0.25, 0.22, 0.18)), feutre=Mat('tissu', (0.10, 0.09, 0.08)))
    torse(p, 'chemise', ep=-0.006, y_bas=1.0)
    gilet(p, 'manteau', 1.0, 1.52, 0.014, base_ep=-0.006, decor=[_ouvert_devant, boutons('or', 0.08, (1.15, 1.25, 1.35, 1.45))])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.25, 0.15)), cache_oeil])
    cheveux(p, 'cheveux', 'long')
    barbe(p, 'barbe', 'fournie')
    chapeau(p, 'feutre', 'tricorne', ruban='or')
    bras(p, zones('manteau', ('chemise', lambda c: c.ax > 0.58), ('peau', lambda c: c.ax > 0.66)))
    manchon_bras(p, 'revers', 'manteau', 0.52, 0.58, 0.016, evase=0.02)
    mains(p, 'peau')
    jambes(p, 'pantalon')
    manchon_jambe(p, 'botte', 'cuir_noir', 0.60, 0.10, 0.012, n=6, ext_fn=lambda y: 0.03 * ss(0.52, 0.60, y))
    pieds(p, 'cuir_noir', ext=0.008, haut=0.01)
    jupe(p, 'pans', 'manteau', 1.0, 0.55, 0.014, 0.07, devant=1.0, decor=[_ouvert_devant])
    ceinture(p, 'joueur', 1.0, 0.07, 0.02)
    return pal


def _ouvert_devant(c):
    c.poser('chemise', (c.z > 0.05) & (c.ax < 0.045))


def guerrier_amerindien(p):
    pal = base('brune', 'noir', daim=Mat('cuir', (0.70, 0.52, 0.32), rug=0.8), plume=Mat('plumes', (0.95, 0.94, 0.90)),
               rouge=Mat('peinture', (0.70, 0.12, 0.08)))
    torse(p, 'daim', ep=-0.004, y_bas=1.0, decor=[franges('y', 1.40), _perles])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.12, 0.08, 0.05), (0.05, 0.04, 0.03)), peinture_visage((0.70, 0.12, 0.08))])
    cheveux(p, 'cheveux', 'tresses')
    coiffe_plumes(p, 'daim', 'plume', n=16, grande=True)
    bras(p, zones('daim', ('peau', lambda c: c.ax > 0.66)), decor=[franges('x', 0.4)])
    mains(p, 'peau')
    jambes(p, 'daim', decor=[franges('x', 0.12)])
    pieds(p, 'daim', ext=0.006, haut=0.006, semelle='cuir')
    jupe(p, 'pagne', 'joueur', 1.0, 0.70, 0.004, 0.02, devant=1.0, decor=[ourlet(0.72)])
    ceinture(p, 'cuir', 1.0, 0.035, 0.012)
    return pal


def _perles(c):
    m = (np.abs(c.y - 1.42) < 0.03) & (np.abs(((np.arctan2(c.z, c.x) * 8) % 1) - 0.5) < 0.25)
    c.poser('joueur', m)


def hallebardier(p):
    pal = base('claire', 'blond', bande2=Mat('tissu', (0.92, 0.88, 0.80)), feutre=Mat('tissu', (0.15, 0.12, 0.10)),
               plume=Mat('plumes', (0.92, 0.90, 0.86)))
    torse(p, 'joueur', ep=0.004, y_bas=1.0, decor=[rayures('bande2', 0.05, 0, 0.35)])
    gilet(p, 'acier', 1.04, 1.48, 0.026, base_ep=0.004, decor=[plastron])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.40, 0.45))])
    barbe(p, 'barbe', 'fournie')
    chapeau(p, 'feutre', 'paille', plume='plume')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.66)), decor=[rayures('bande2', 0.05, 0, 0.35)])
    manchon_bras(p, 'bouffant', 'joueur', 0.13, 0.33, 0.03, decor=[rayures('bande2', 0.04, 0, 0.35)])
    mains(p, 'cuir')
    jambes(p, zones('joueur', ('bande2', lambda c: c.y < 0.62)), decor=[rayures('bande2', 0.05, 0, 0.35)])
    pieds(p, 'cuir_noir', ext=0.01, haut=0.01, bout_rond=0.5)
    jupe(p, 'chausses', 'joueur', 1.02, 0.72, 0.03, 0.05, decor=[rayures('bande2', 0.04, 0, 0.35)], force=0.9)
    return pal


def general_empire(p):
    pal = base('claire', 'brun', drap=Mat('tissu', (0.90, 0.89, 0.86)), noir=Mat('cuir', (0.08, 0.07, 0.07), rug=0.4),
               feutre=Mat('tissu', (0.07, 0.07, 0.08)), echarpe=Mat('tissu', (0.75, 0.12, 0.12)))
    torse(p, 'joueur', ep=0.002, y_bas=1.0, decor=[boutons('or', 0.04), _plastron_drap, _echarpe])
    col(p, 'or', 1.545, 0.04, 0.03)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.30, 0.30))])
    cheveux(p, 'cheveux', 'court')
    bicorne(p, 'feutre')
    epaulieres(p, 'or', 'bandes')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.66), ('or', lambda c: (c.ax > 0.61) & (c.ax < 0.66))))
    mains(p, 'drap')
    bassin(p, 'drap')
    jambes(p, 'drap')
    manchon_jambe(p, 'botte', 'noir', 0.62, 0.10, 0.012, n=6, ext_fn=lambda y: 0.02 * ss(0.55, 0.62, y))
    pieds(p, 'noir', ext=0.008, haut=0.01)
    jupe(p, 'pans', 'joueur', 1.0, 0.50, 0.004, 0.06, decor=[ourlet(0.52)], force=0.7)
    cape(p, 'joueur', bas=0.35, largeur=1.0)
    return pal


def _plastron_drap(c):
    c.poser('drap', (c.z > 0.06) & (c.ax < 0.05) & (c.y > 1.05) & (c.y < 1.50))


def _echarpe(c):
    c.poser('echarpe', np.abs(c.y - 1.06) < 0.03)


# ---------------------------------------------------------------------------------------------
# ÈRE INDUSTRIELLE
# ---------------------------------------------------------------------------------------------
def guerrier_zoulou(p):
    pal = base('foncee', 'noir', fourrure=Mat('fourrure', (0.30, 0.22, 0.15)), plume=Mat('plumes', (0.10, 0.10, 0.10)),
               blanc=Mat('fourrure', (0.92, 0.90, 0.86)))
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[tatouages()])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.10, 0.07, 0.05), (0.04, 0.03, 0.03))])
    cheveux(p, 'cheveux', 'court')
    anneau_tete(p, 'bandeau', 'fourrure', 1.74, 0.014, 0.035, 0.02)
    coiffe_plumes(p, 'fourrure', 'plume', n=4, grande=False)
    bras(p, peau_et([('blanc', lambda c: (c.ax > 0.36) & (c.ax < 0.42))]))
    mains(p, 'peau')
    jambes(p, peau_et([('blanc', lambda c: (c.y > 0.40) & (c.y < 0.47))]))
    pieds(p, 'peau', semelle=None)
    lanieres(p, 'pagne', 'joueur', 16, 0.0, 1.0, 0.72, 0.012, ep=0.006, jeu=0.15, rangs=3)
    ceinture(p, 'fourrure', 1.0, 0.04, 0.02)
    col_fourrure(p, 'blanc')
    return pal


def ouvriere_usine(p):
    pal = base('claire', 'chatain', robe=Mat('tissu', (0.30, 0.30, 0.36)), lin=Mat('tissu', (0.88, 0.85, 0.78)))
    torse(p, 'robe', ep=-0.004, y_bas=1.0, decor=[boutons('lin', 0.0, (1.25, 1.33, 1.41), 0.007)])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.25, 0.30, 0.40), femme=True)])
    cheveux(p, 'cheveux', 'chignon')
    foulard(p, 'joueur', noeud=False)
    bras(p, zones('robe', ('peau', lambda c: c.ax > 0.62)))
    mains(p, 'peau')
    jambes(p, 'robe')
    pieds(p, 'cuir_noir', ext=0.008, haut=0.01)
    jupe(p, 'robe', 'robe', 1.02, 0.16, -0.004, 0.10, n=8, decor=[plis, tablier('joueur', 1.25, 0.35, 0.15)], force=0.7)
    gilet(p, 'joueur', 1.04, 1.36, 0.008, base_ep=-0.004, nom='bavette',
          decor=[lambda c: c.poser('robe', (c.z < 0.0) | (c.ax > 0.12))])
    ceinture(p, 'lin', 1.04, 0.02, 0.012)
    return pal


def poilu_1914(p):
    pal = base('claire', 'brun', bleu=Mat('tissu', (0.42, 0.52, 0.62)), casque=Mat('peinture', (0.40, 0.48, 0.55), rug=0.55),
               bande=Mat('tissu', (0.40, 0.48, 0.56)))
    torse(p, 'joueur', ep=0.006, y_bas=1.0, decor=[boutons('or', 0.035, (1.12, 1.24, 1.36, 1.46), 0.008)])
    col(p, 'joueur', 1.545, 0.035, 0.03)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.25, 0.15))])
    moustache(p, 'barbe')
    casque_adrian(p, 'casque')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.67)))
    mains(p, 'peau')
    bassin(p, 'bleu')
    jambes(p, 'bleu')
    manchon_jambe(p, 'bandes', 'bande', 0.42, 0.10, 0.012, n=5, decor=[lambda c: setattr(c, 'col', c.col * (1 - 0.2 * (((c.y + c.x) * 30) % 1 < 0.15))[:, None])])
    pieds(p, 'cuir', ext=0.008, haut=0.012)
    jupe(p, 'capote', 'joueur', 1.0, 0.55, 0.010, 0.08, decor=[ourlet(0.57)], force=0.8)
    ceinture(p, 'cuir', 1.0, 0.04, 0.025)
    sacoches(p, 'cuir', 1.0, 2, (0.07, 0.07, 0.04), ep=0.025)
    sac_dos(p, 'bleu', (0.30, 0.32, 0.12), 1.30, rouleau='bleu')
    return pal


# ---------------------------------------------------------------------------------------------
# XXe SIÈCLE
# ---------------------------------------------------------------------------------------------
def infirmiere(p):
    pal = base('claire', 'blond', blanc=Mat('tissu', (0.94, 0.94, 0.93)))
    torse(p, 'blanc', ep=-0.004, y_bas=1.0, decor=[croix_rouge(1.33, 0.035, 0.012, dos=False)])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.40, 0.50), femme=True)])
    cheveux(p, 'cheveux', 'chignon')
    foulard(p, 'blanc', noeud=False)
    bras(p, zones('blanc', ('joueur', lambda c: (c.ax > 0.27) & (c.ax < 0.31)), ('peau', lambda c: c.ax > 0.58)))
    mains(p, 'peau')
    jambes(p, 'peau')
    pieds(p, 'cuir_noir', ext=0.006, haut=0.008)
    jupe(p, 'robe', 'blanc', 1.02, 0.50, -0.004, 0.06, n=6, decor=[tablier('joueur', 1.05, 0.55, 0.15)], force=0.75)
    ceinture(p, 'blanc', 1.04, 0.03, 0.008)
    return pal


def officier_1940(p):
    pal = base('mate', 'brun', kaki=Mat('tissu', (0.42, 0.40, 0.30)), noir=Mat('cuir', (0.08, 0.07, 0.07), rug=0.4))
    torse(p, 'joueur', ep=0.004, y_bas=1.0, decor=[boutons('or', 0.035, (1.12, 1.24, 1.36, 1.46), 0.007),
                                                   lambda c: c.poser('cuir', np.abs((c.y - 1.47) + 1.25 * c.x) < 0.015)])
    col(p, 'joueur', 1.545, 0.035, 0.03)
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.30, 0.35))])
    cheveux(p, 'cheveux', 'court')
    moustache(p, 'barbe')
    casquette(p, 'kaki', visiere='noir', bandeau='joueur')
    bras(p, zones('joueur', ('peau', lambda c: c.ax > 0.67)))
    mains(p, 'cuir')
    bassin(p, 'kaki')
    jambes(p, 'kaki')
    manchon_jambe(p, 'botte', 'noir', 0.50, 0.10, 0.012, n=5)
    pieds(p, 'noir', ext=0.008, haut=0.01)
    jupe(p, 'pans', 'joueur', 1.0, 0.72, 0.008, 0.04, decor=[ourlet(0.74)])
    ceinture(p, 'cuir', 1.0, 0.04, 0.02, decor=[_boucle])
    boite_piece(p, 'etui', 'cuir', (0.19, 0.93, 0.03), (0.04, 0.10, 0.07), lambda P: _w_hanche(P))
    return pal


def aviateur(p):
    pal = base('claire', 'chatain', blouson=Mat('cuir', (0.40, 0.24, 0.14), rug=0.65),
               mouton=Mat('fourrure', (0.88, 0.80, 0.65)), verre=Mat('peinture', (0.35, 0.45, 0.50), rug=0.1, metal=0.4),
               kaki=Mat('tissu', (0.42, 0.40, 0.30)), echarpe=Mat('tissu', (0.92, 0.92, 0.90)))
    torse(p, 'blouson', ep=0.008, y_bas=1.0, decor=[lambda c: c.poser('joueur', (np.abs(c.x - 0.10) < 0.035) & (np.abs(c.y - 1.38) < 0.035) & (c.z > 0))])
    col_fourrure(p, 'mouton')
    cou(p, 'echarpe')
    tete(p, 'peau', decor=[visage((0.30, 0.40, 0.50))])
    cagoule_pilote(p, 'blouson', verre='verre')
    moustache(p, 'barbe')
    bras(p, zones('blouson', ('cuir', lambda c: c.ax > 0.62)))
    manchon_bras(p, 'poignet', 'mouton', 0.58, 0.62, 0.016)
    mains(p, 'cuir')
    bassin(p, 'kaki')
    jambes(p, 'kaki')
    manchon_jambe(p, 'botte', 'mouton', 0.40, 0.10, 0.016, n=4)
    pieds(p, 'cuir', ext=0.012, haut=0.014)
    gilet(p, 'blouson', 1.0, 1.05, 0.01, base_ep=0.008, nom='bas_blouson')
    ceinture(p, 'joueur', 0.99, 0.04, 0.02)
    return pal


# ---------------------------------------------------------------------------------------------
# CONTEMPORAIN
# ---------------------------------------------------------------------------------------------
def policier(p):
    pal = base('mate', 'brun', marine=Mat('tissu', (0.12, 0.14, 0.24)), gilet_noir=Mat('tissu', (0.10, 0.10, 0.11)),
               chemise=Mat('tissu', (0.55, 0.65, 0.80)))
    torse(p, 'chemise', ep=-0.006, y_bas=1.0)
    gilet(p, 'gilet_noir', 1.04, 1.48, 0.03, base_ep=-0.006, decor=[lambda c: c.poser('joueur', (np.abs(c.y - 1.30) < 0.03))])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.25, 0.20, 0.12))])
    cheveux(p, 'cheveux', 'court')
    casquette(p, 'marine', visiere='cuir_noir', bandeau='joueur', insigne='or')
    bras(p, zones('chemise', ('peau', lambda c: c.ax > 0.30)))
    mains(p, 'cuir_noir')
    bassin(p, 'marine')
    jambes(p, 'marine')
    pieds(p, 'cuir_noir', ext=0.01, haut=0.012)
    ceinture(p, 'cuir_noir', 0.99, 0.05, 0.018)
    sacoches(p, 'cuir_noir', 0.98, 3, (0.05, 0.07, 0.035), ep=0.018, avant=False)
    return pal


def pompier(p):
    pal = base('mate', 'brun', veste=Mat('tissu', (0.15, 0.15, 0.18), rug=0.7), refl=Mat('peinture', (0.88, 0.88, 0.85), rug=0.3, metal=0.2),
               casque=Mat('peinture', (0.88, 0.88, 0.86), rug=0.3, metal=0.3), jaune=Mat('peinture', (0.92, 0.75, 0.10)))
    torse(p, 'veste', ep=0.012, y_bas=1.0, decor=[lambda c: c.poser('refl', (np.abs(c.y - 1.14) < 0.018) | (np.abs(c.y - 1.40) < 0.018)),
                                                  lambda c: c.poser('joueur', (np.abs(c.y - 1.27) < 0.035))])
    cou(p, 'veste')
    tete(p, 'peau', decor=[visage((0.25, 0.20, 0.12))])
    casque_rond(p, 'casque', 'moderne', decor=[lambda c: c.poser('jaune', (c.z > 0.05) & (c.y < 1.76))])
    bras(p, zones('veste', ('refl', lambda c: np.abs(c.ax - 0.55) < 0.018)))
    mains(p, 'cuir')
    bassin(p, 'veste')
    jambes(p, zones('veste', ('refl', lambda c: np.abs(c.y - 0.32) < 0.018)))
    manchon_jambe(p, 'botte', 'cuir_noir', 0.38, 0.10, 0.016, n=4)
    pieds(p, 'cuir_noir', ext=0.012, haut=0.016)
    jupe(p, 'veste_bas', 'veste', 1.0, 0.82, 0.012, 0.03, decor=[lambda c: c.poser('refl', np.abs(c.y - 0.86) < 0.016)])
    sac_dos(p, 'acier', (0.18, 0.40, 0.14), 1.28)
    return pal


def medecin(p):
    pal = base('brune', 'noir', blouse=Mat('tissu', (0.95, 0.95, 0.95)), pyjama=Mat('tissu', (0.30, 0.55, 0.60)))
    torse(p, 'pyjama', ep=-0.008, y_bas=1.0)
    gilet(p, 'blouse', 1.0, 1.52, 0.012, base_ep=-0.008, decor=[_ouvert_blouse, croix_rouge(1.40, 0.02, 0.006, dos=False)])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.15, 0.10, 0.07), (0.05, 0.04, 0.03), femme=True)])
    cheveux(p, 'cheveux', 'queue')
    bras(p, zones('blouse', ('peau', lambda c: c.ax > 0.62)))
    mains(p, 'peau')
    bassin(p, 'pyjama')
    jambes(p, 'pyjama')
    pieds(p, 'blouse', ext=0.01, haut=0.012, semelle='sombre')
    jupe(p, 'blouse_bas', 'blouse', 1.0, 0.55, 0.012, 0.05, decor=[_ouvert_blouse])
    col(p, 'joueur', 1.54, 0.025, 0.02, nom='stethoscope')
    return pal


def _ouvert_blouse(c):
    c.poser('pyjama', (c.z > 0.06) & (c.ax < 0.03))
    c.poser('joueur', (c.z > 0.06) & (np.abs(c.ax - 0.035) < 0.006) & (c.y > 1.0))


def tireur_elite(p):
    pal = base('mate', 'brun', camo1=Mat('tissu', (0.40, 0.42, 0.30)), camo2=Mat('tissu', (0.28, 0.30, 0.20)),
               camo3=Mat('tissu', (0.50, 0.46, 0.34)), filet=Mat('fourrure', (0.38, 0.40, 0.26)))
    torse(p, 'camo1', ep=-0.004, y_bas=1.0, decor=[camouflage(('camo2', None, 'camo3'))])
    cou(p, 'camo1')
    tete(p, 'peau', decor=[visage((0.20, 0.15, 0.10)), peinture_visage((0.25, 0.28, 0.18), 'bandes')])
    capuche(p, 'filet')
    bras(p, zones('camo1', ('cuir_noir', lambda c: c.ax > 0.64)), decor=[camouflage(('camo2', None, 'camo3'))])
    mains(p, 'cuir_noir')
    bassin(p, 'camo1', decor=[camouflage(('camo2', None, 'camo3'))])
    jambes(p, 'camo1', decor=[camouflage(('camo2', None, 'camo3'))])
    manchon_jambe(p, 'rangers', 'cuir_noir', 0.28, 0.10, 0.012, n=4)
    pieds(p, 'cuir_noir', semelle='sombre', ext=0.01, haut=0.014)
    gilet(p, 'filet', 1.20, 1.52, 0.03, base_ep=-0.004, nom='filet')
    ceinture(p, 'joueur', 0.99, 0.05, 0.02)
    sacoches(p, 'camo2', 0.98, 2, (0.06, 0.07, 0.04), ep=0.02, avant=False)
    return pal


# ---------------------------------------------------------------------------------------------
# FUTUR
# ---------------------------------------------------------------------------------------------
def medecin_futuriste(p):
    pal = base('claire', 'noir', combi=Mat('tissu', (0.88, 0.90, 0.92), rug=0.5), coque=Mat('peinture', (0.92, 0.93, 0.95), rug=0.3, metal=0.2),
               vert=Mat('lumiere', (0.40, 1.0, 0.65)))
    torse(p, 'combi', ep=-0.006, y_bas=1.0, decor=[lignes_lumineuses('vert', (1.20,)), lambda c: c.poser('joueur', c.y > 1.42)])
    cou(p, 'combi')
    tete(p, 'peau', decor=[visage((0.15, 0.30, 0.45), femme=True)])
    cheveux(p, 'cheveux', 'court')
    p.ajoute('visiere', __import__('moteur').boite((0, 1.715, 0.105), (0.17, 0.035, 0.03), K=p.k(8), arrondi=0.7), 'vert',
             w_os('Head'), xf=p.tete_xf())
    bras(p, zones('combi', ('joueur', lambda c: (c.ax > 0.40) & (c.ax < 0.50)), ('coque', lambda c: c.ax > 0.64)))
    manchon_bras(p, 'scanner', 'coque', 0.55, 0.66, 0.02, decor=[lignes_lumineuses('vert', (), (0.6,))])
    mains(p, 'coque')
    bassin(p, 'combi')
    jambes(p, zones('combi', ('joueur', lambda c: c.ax > 0.16)))
    pieds(p, 'coque', semelle='combi', ext=0.012, haut=0.014)
    ceinture(p, 'coque', 1.0, 0.05, 0.02, decor=[lignes_lumineuses('vert', (1.0,))])
    sac_dos(p, 'coque', (0.22, 0.26, 0.08), 1.30, decor=[croix_rouge(1.30, 0.05, 0.016)])
    return pal


def robot_lourd(p):
    pal = base('mate', 'noir', chassis=Mat('peinture', (0.42, 0.44, 0.46), rug=0.4, metal=0.6),
               jaune=Mat('peinture', (0.95, 0.70, 0.10), rug=0.4), rouge=Mat('lumiere', (1.0, 0.25, 0.15)),
               joint=Mat('metal', (0.18, 0.18, 0.20), rug=0.4))
    torse(p, 'chassis', ep=0.04, y_bas=1.0, bosses=False, decor=[_panneaux, lambda c: c.poser('joueur_metal', (c.z > 0.05) & (c.y > 1.32) & (c.y < 1.46))])
    bassin(p, 'joint')
    cou(p, 'joint')
    tete_robot(p, 'chassis', oeil='rouge', joint='joint')
    epaulieres(p, 'joueur_metal', 'futur', taille=1.25)
    bras(p, zones('chassis'), decor=[articulations('joint')])
    manchon_bras(p, 'avant_bras', 'chassis', 0.48, 0.70, 0.04, evase=0.02, decor=[lambda c: c.poser('jaune', np.abs(c.ax - 0.62) < 0.02)])
    mains(p, 'joint')
    jambes(p, 'chassis', decor=[articulations('joint')])
    manchon_jambe(p, 'cuisse', 'joueur_metal', 0.88, 0.62, 0.035, n=4)
    manchon_jambe(p, 'tibia', 'chassis', 0.56, 0.12, 0.035, n=5)
    pieds(p, 'chassis', semelle='joint', ext=0.02, haut=0.02)
    ceinture(p, 'jaune', 1.0, 0.06, 0.05)
    return pal


def _panneaux(c):
    c.trait(np.abs(c.y - 1.25), 0.003, 0.5)
    c.trait(np.where(c.y > 1.25, np.abs(c.ax - 0.08), 1), 0.003, 0.4)


def cyborg_ninja(p):
    pal = base('mate', 'noir', armure=Mat('peinture', (0.12, 0.13, 0.15), rug=0.3, metal=0.5),
               rouge=Mat('lumiere', (1.0, 0.20, 0.25)))
    torse(p, 'armure', ep=0.0, y_bas=1.0, decor=[lignes_lumineuses('rouge', (1.25,), (0.0,)), lambda c: c.poser('joueur_metal', (c.y > 1.40) & (c.ax > 0.08))])
    bassin(p, 'armure')
    cou(p, 'armure')
    casque_integral(p, 'armure', 'rouge')
    bras(p, zones('armure', ('joueur_metal', lambda c: (c.ax > 0.24) & (c.ax < 0.40))), decor=[articulations('rouge', largeur=0.004)])
    mains(p, 'armure')
    jambes(p, zones('armure', ('joueur_metal', lambda c: (c.y > 0.65) & (c.y < 0.85))), decor=[articulations('rouge', largeur=0.004)])
    pieds(p, 'armure', semelle='rouge', ext=0.008, haut=0.008)
    ceinture(p, 'joueur_metal', 1.0, 0.04, 0.016)
    cape(p, 'joueur', bas=1.0, largeur=0.6, nom='echarpe')
    return pal


def technicien_futuriste(p):
    pal = base('brune', 'noir', combi=Mat('tissu', (0.30, 0.34, 0.40), rug=0.6), orange=Mat('peinture', (0.95, 0.50, 0.10)),
               cyan=Mat('lumiere', (0.35, 0.95, 1.0)), verre=Mat('peinture', (0.20, 0.50, 0.60), rug=0.1, metal=0.4))
    torse(p, 'joueur', ep=-0.004, y_bas=1.0, decor=[lambda c: c.poser('combi', c.y < 1.22)])
    cou(p, 'combi')
    tete(p, 'peau', decor=[visage((0.15, 0.10, 0.07), (0.05, 0.04, 0.03))])
    cheveux(p, 'cheveux', 'court')
    p.ajoute('lunettes', __import__('moteur').boite((0, 1.715, 0.10), (0.15, 0.03, 0.03), K=p.k(8), arrondi=0.7), 'verre',
             w_os('Head'), xf=p.tete_xf())
    bras(p, zones('joueur', ('combi', lambda c: c.ax > 0.40), ('orange', lambda c: c.ax > 0.64)))
    mains(p, 'orange')
    bassin(p, 'combi')
    jambes(p, 'combi')
    manchon_jambe(p, 'botte', 'orange', 0.30, 0.10, 0.014, n=4)
    pieds(p, 'orange', semelle='sombre', ext=0.012, haut=0.014)
    ceinture(p, 'orange', 1.0, 0.05, 0.02)
    sacoches(p, 'combi', 0.98, 3, (0.06, 0.08, 0.04), ep=0.02, avant=False)
    sac_dos(p, 'combi', (0.26, 0.30, 0.10), 1.30, decor=[lignes_lumineuses('cyan', (1.30,))])
    return pal


# ---------------------------------------------------------------------------------------------
PERSONNAGES = [
    ('1-antiquite', 'villageois-antique', 'Villageois', 'Méditerranée antique', SVELTE, villageois_antique, ['faucille', 'panier']),
    ('1-antiquite', 'heros-grec', 'Héros', 'Grèce antique', HEROS, heros_grec, ['lance-dory', 'bouclier-hoplon']),
    ('1-antiquite', 'pretresse-grecque', 'Prêtresse', 'Grèce antique', FEMME, pretresse_grecque, ['baton-pretre']),
    ('1-antiquite', 'pretre-egyptien', 'Prêtre', 'Égypte antique', SVELTE, pretre_egyptien, ['ankh', 'baton-pretre']),
    ('1-antiquite', 'pharaon', 'Pharaon', 'Égypte antique', HEROS, pharaon, ['sceptre', 'khopesh']),
    ('1-antiquite', 'immortel-perse', 'Immortel', 'Perse achéménide', HEROS, immortel_perse, ['lance-dory', 'arc-composite']),
    ('1-antiquite', 'soldat-qin', 'Soldat', 'Chine des Qin', HEROS, soldat_qin, ['ji', 'arbalete']),
    ('1-antiquite', 'guerrier-nubien', 'Archer', 'Nubie', SVELTE, guerrier_nubien, ['arc-egyptien']),
    ('1-antiquite', 'archere-scythe', 'Archère à cheval', 'Scythes', FEMME_FORTE, archere_scythe, ['arc-composite']),
    ('2-moyen-age', 'archer-anglais', 'Archer', 'Angleterre', HEROS, archer_anglais, ['arc-long']),
    ('2-moyen-age', 'moine', 'Moine', 'Europe médiévale', AGE, moine, ['baton-pretre']),
    ('2-moyen-age', 'paysanne-medievale', 'Villageoise', 'Europe médiévale', FEMME, paysanne_medievale, ['panier', 'faucille']),
    ('2-moyen-age', 'roi-medieval', 'Roi', 'Europe médiévale', ROBUSTE, roi_medieval, ['epee-longue', 'sceptre']),
    ('2-moyen-age', 'guerrier-sarrasin', 'Cavalier', 'Monde arabe', HEROS, guerrier_sarrasin, ['cimeterre', 'bouclier-rond-orient']),
    ('2-moyen-age', 'cataphracte', 'Cataphracte', 'Byzance', HEROS, cataphracte, ['lance-cavalerie', 'sabre']),
    ('2-moyen-age', 'ninja', 'Ninja', 'Japon féodal', SVELTE, ninja, ['katana']),
    ('2-moyen-age', 'guerrier-inca', 'Guerrier', 'Incas', HEROS, guerrier_inca, ['fronde', 'massue-etoile']),
    ('3-epoque-moderne', 'janissaire', 'Janissaire', 'Empire ottoman', HEROS, janissaire, ['mousquet', 'cimeterre']),
    ('3-epoque-moderne', 'pirate', 'Pirate', 'Caraïbes', HEROS, pirate, ['sabre', 'pistolet-silex']),
    ('3-epoque-moderne', 'guerrier-amerindien', 'Guerrier', 'Plaines d\'Amérique du Nord', HEROS, guerrier_amerindien, ['tomahawk', 'arc-egyptien']),
    ('3-epoque-moderne', 'hallebardier', 'Hallebardier', 'Suisse, Saint-Empire', ROBUSTE, hallebardier, ['hallebarde']),
    ('3-epoque-moderne', 'general-empire', 'Général', 'Empire (1805)', HEROS, general_empire, ['sabre', 'pistolet-silex']),
    ('4-industrielle', 'guerrier-zoulou', 'Guerrier', 'Royaume zoulou', HEROS, guerrier_zoulou, ['sagaie', 'bouclier-zoulou']),
    ('4-industrielle', 'ouvriere-usine', 'Ouvrière', 'Révolution industrielle', FEMME, ouvriere_usine, ['cle', 'marteau']),
    ('5-xxe-siecle', 'poilu-1914', 'Fantassin', 'Première Guerre mondiale', HEROS, poilu_1914, ['fusil-baionnette', 'pelle']),
    ('5-xxe-siecle', 'infirmiere', 'Infirmière', 'XXe siècle', FEMME, infirmiere, ['trousse-soin']),
    ('5-xxe-siecle', 'officier-1940', 'Officier', 'Seconde Guerre mondiale', HEROS, officier_1940, ['pistolet', 'jumelles']),
    ('5-xxe-siecle', 'aviateur', 'Aviateur', 'XXe siècle', HEROS, aviateur, ['pistolet']),
    ('6-contemporain', 'policier', 'Policier', 'Monde moderne', HEROS, policier, ['pistolet', 'bouclier-anti-emeute']),
    ('6-contemporain', 'pompier', 'Pompier', 'Monde moderne', HEROS, pompier, ['hache-pompier', 'extincteur']),
    ('6-contemporain', 'medecin', 'Médecin', 'Monde moderne', FEMME, medecin, ['trousse-soin']),
    ('6-contemporain', 'tireur-elite', 'Tireur d\'élite', 'Armée moderne', HEROS, tireur_elite, ['fusil-precision']),
    ('7-futur', 'medecin-futuriste', 'Médecin', 'Futur', FEMME, medecin_futuriste, ['trousse-soin']),
    ('7-futur', 'robot-lourd', 'Robot lourd', 'Futur', ROBUSTE, robot_lourd, ['canon-plasma']),
    ('7-futur', 'cyborg-ninja', 'Cyborg', 'Futur', SVELTE, cyborg_ninja, ['epee-energie']),
    ('7-futur', 'meca', 'Méca de combat', 'Futur', ROBUSTE, robot_lourd, ['canon-plasma'], {'echelle': 3.0}),
    ('7-futur', 'technicien-futuriste', 'Technicien', 'Futur', HEROS, technicien_futuriste, ['cle', 'drone']),
]
