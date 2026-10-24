"""Créatures mythologiques (squelette humain, agrandi pour les géants : option « echelle »)."""
import numpy as np

from moteur import Mat, zones, ss, mix, rot_x, rot_z, w_os, boite, chemin, bruit
from corps import *  # noqa: F401,F403
from corps import (HEROS, FEMME, ROBUSTE, SVELTE, Morph, torse, bassin, cou, bras, manchon_bras, mains, jambes,
                   manchon_jambe, pieds, sandales, tete, visage, cheveux, barbe, moustache, casque_conique, jupe,
                   lanieres, ceinture, gilet, cape, ourlet, col_fourrure, epaulieres, collier_large, laurier,
                   anneau_tete, ailes, peinture_visage, calotte, _ligne_cheveux, boite_piece, tatouages)
from personnages import base, peau_et

GEANT = Morph(carrure=1.15, taille=1.08, hanches=1.08, bras=1.28, jambes=1.22, mains=1.25, cou=1.45, ventre=0.02, pecs=1.3)
VENTRU = Morph(carrure=1.12, taille=1.35, hanches=1.15, bras=1.3, jambes=1.3, mains=1.3, cou=1.5, ventre=0.07, pecs=0.8)
OSSEUX = Morph(carrure=0.86, taille=0.62, hanches=0.8, bras=0.52, jambes=0.58, mains=0.75, cou=0.6, pecs=0.0)
FEMME_GUERRIERE = Morph(carrure=0.92, taille=0.86, hanches=1.06, bras=0.86, jambes=0.94, poitrine=0.9, mains=0.9, pecs=0.0, cou=0.9)


def _fourrure_jambe(c):
    c.col = c.col * (0.85 + 0.25 * (np.sin(c.y * 120 + np.sin(c.x * 60) * 2) > 0))[:, None]


def tete_taureau(p, m, corne='corne', anneau='or'):
    xf = p.tete_xf()
    p.ajoute('crane', boite((0, 1.73, 0.0), (0.21, 0.22, 0.22), K=p.k(14), arrondi=0.85), m, w_os('Head'), xf=xf,
             decor=[_yeux_betes((0.06, 1.76, 0.095), (0.6, 0.1, 0.05))])
    p.ajoute('mufle', chemin([(0, 1.74, 0.06), (0, 1.69, 0.15), (0, 1.66, 0.22), (0, 1.655, 0.25)],
                             [(0.085, 0.08), (0.075, 0.07), (0.07, 0.06), (0.0, 0.0)], p.k(12)), m, w_os('Head'), xf=xf,
             decor=[_naseaux_taureau])
    for s in (1, -1):
        p.ajoute('corne%d' % (s > 0), chemin([(s * 0.08, 1.82, 0.0), (s * 0.17, 1.86, 0.02), (s * 0.24, 1.93, 0.06),
                                               (s * 0.25, 2.00, 0.10)], [0.035, 0.028, 0.018, 0.0], p.k(8)), corne,
                 w_os('Head'), xf=xf)
        p.ajoute('oreille%d' % (s > 0), chemin([(s * 0.10, 1.77, -0.02), (s * 0.17, 1.76, -0.03)], [(0.03, 0.012), 0.0],
                                                p.k(6), haut=(0, 0, 1)), m, w_os('Head'), xf=xf)
    p.ajoute('anneau', chemin([(-0.02, 1.645, 0.24), (0, 1.625, 0.25), (0.02, 1.645, 0.24)], [0.006] * 3, p.k(5), poles=False),
             anneau, w_os('Head'), xf=xf)


def _yeux_betes(pos, couleur):
    x0, y0, z0 = pos

    def f(c):
        e = (np.hypot(c.ax - x0, c.y - y0) < 0.016) & (c.z > z0 - 0.04)
        c.col = np.where(e[:, None], np.array(couleur), c.col)
        e2 = (np.hypot(c.ax - x0, c.y - y0) < 0.006) & (c.z > z0 - 0.04)
        c.col = np.where(e2[:, None], np.array([0.02, 0.02, 0.02]), c.col)
    return f


def _naseaux_taureau(c):
    n = (c.z > 0.22) & (np.abs(c.ax - 0.03) < 0.014) & (np.abs(c.y - 1.67) < 0.014)
    c.col = np.where(n[:, None], c.col * 0.25, c.col)


def minotaure(p):
    pal = base('brune', 'brun', pelage=Mat('fourrure', (0.30, 0.18, 0.10)), corne=Mat('peinture', (0.85, 0.80, 0.68), rug=0.5))
    torse(p, 'peau', ep=-0.012, y_bas=1.0)
    bassin(p, 'pelage')
    cou(p, 'peau')
    tete_taureau(p, 'pelage')
    bras(p, peau_et([('or', lambda c: (c.ax > 0.60) & (c.ax < 0.68))]))
    mains(p, 'peau')
    jambes(p, 'pelage', decor=[_fourrure_jambe])
    pieds(p, 'cuir_noir', semelle=None, ext=0.01, haut=0.02, bout_rond=0.2)
    jupe(p, 'pagne', 'joueur', 1.0, 0.72, 0.006, 0.03, decor=[ourlet(0.74)])
    ceinture(p, 'cuir', 1.0, 0.05, 0.02, decor=[lambda c: c.poser('or', (c.z > 0.08) & (c.ax < 0.03))])
    epaulieres(p, 'bronze', 'dome', taille=0.9)
    return pal


def cyclope(p):
    pal = base('mate', 'brun', pelage=Mat('fourrure', (0.40, 0.28, 0.18)))
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[tatouages((0.25, 0.15, 0.10))])
    bassin(p, 'pelage')
    cou(p, 'peau')
    tete(p, 'peau', decor=[_oeil_unique, _bouche_dents], nez=1.4, oreilles=True)
    barbe(p, 'barbe', 'fournie')
    bras(p, peau_et([('cuir', lambda c: (c.ax > 0.60) & (c.ax < 0.70))]))
    mains(p, 'peau')
    jambes(p, 'peau')
    pieds(p, 'peau', semelle='cuir', decor=[sandales])
    jupe(p, 'pagne', 'pelage', 1.0, 0.70, 0.006, 0.04, decor=[_fourrure_jambe])
    ceinture(p, 'joueur', 1.0, 0.06, 0.02)
    return pal


def _oeil_unique(c):
    av = c.z > 0.03
    e = av & (np.hypot(c.ax / 1.3, c.y - 1.718) < 0.024)
    c.col = np.where(e[:, None], np.array([0.92, 0.90, 0.84]), c.col)
    i = av & (np.hypot(c.ax, c.y - 1.716) < 0.013)
    c.col = np.where(i[:, None], np.array([0.55, 0.20, 0.06]), c.col)
    pu = av & (np.hypot(c.ax, c.y - 1.716) < 0.006)
    c.col = np.where(pu[:, None], np.array([0.03, 0.02, 0.02]), c.col)
    s = av & (np.abs(c.y - (1.748 + 4 * c.ax ** 2)) < 0.005) & (c.ax < 0.04)
    c.col = np.where(s[:, None], c.col * 0.3, c.col)


def _bouche_dents(c):
    av = c.z > 0.05
    b = av & (c.ax < 0.03) & (np.abs(c.y - 1.64) < 0.008)
    c.col = np.where(b[:, None], np.array([0.15, 0.04, 0.04]), c.col)
    d = b & (np.abs(((c.x * 120) % 1) - 0.5) < 0.25) & (c.y > 1.638)
    c.col = np.where(d[:, None], np.array([0.85, 0.82, 0.70]), c.col)


def tete_chacal(p, m, or_='or'):
    xf = p.tete_xf()
    p.ajoute('crane', boite((0, 1.73, 0.0), (0.17, 0.20, 0.20), K=p.k(14), arrondi=0.85), m, w_os('Head'), xf=xf,
             decor=[_yeux_betes((0.045, 1.76, 0.08), (0.95, 0.75, 0.1))])
    p.ajoute('museau', chemin([(0, 1.74, 0.05), (0, 1.70, 0.15), (0, 1.67, 0.24), (0, 1.66, 0.28)],
                              [(0.06, 0.06), (0.045, 0.045), (0.03, 0.03), (0.0, 0.0)], p.k(10)), m, w_os('Head'), xf=xf)
    for s in (1, -1):
        p.ajoute('oreille%d' % (s > 0), chemin([(s * 0.05, 1.82, -0.01), (s * 0.065, 1.92, -0.02), (s * 0.075, 2.00, -0.025)],
                                                [(0.035, 0.012), (0.025, 0.01), (0.0, 0.0)], p.k(6), haut=(0, 0, 1)),
                 m, w_os('Head'), xf=xf, decor=[lambda c: c.poser(or_, c.ST[:, 1] < 0.2)])


def anubite(p):
    pal = base('foncee', 'noir', noir=Mat('peinture', (0.08, 0.08, 0.09), rug=0.4), lapis=Mat('peinture', (0.10, 0.22, 0.55)))
    pal['peau'] = Mat('peau', (0.16, 0.15, 0.16), rug=0.45)
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[collier_large(('or', 'lapis', 'or', 'joueur'))])
    cou(p, 'peau')
    tete_chacal(p, 'noir')
    bras(p, peau_et([('or', lambda c: ((c.ax > 0.28) & (c.ax < 0.33)) | ((c.ax > 0.60) & (c.ax < 0.69)))]))
    mains(p, 'peau')
    jambes(p, peau_et([('or', lambda c: (c.y > 0.15) & (c.y < 0.22))]))
    pieds(p, 'peau', semelle='or')
    jupe(p, 'pagne', zones('lin', ('joueur', lambda c: (c.ax < 0.06) & (c.z > 0))), 1.0, 0.58, 0.004, 0.08, devant=1.1,
         decor=[ourlet(0.60)])
    ceinture(p, 'or', 1.0, 0.05, 0.014)
    return pal


def golem(p):
    pal = base('mate', 'noir', roche=Mat('pierre', (0.50, 0.48, 0.45)), lave=Mat('lumiere', (1.0, 0.55, 0.15)))
    deco = [_fissures]
    torse(p, 'roche', ep=0.03, y_bas=1.0, bosses=False, decor=deco)
    bassin(p, 'roche', decor=deco)
    cou(p, 'roche')
    p.ajoute('tete', boite((0, 1.70, 0.02), (0.20, 0.20, 0.20), K=p.k(10), arrondi=0.45), 'roche', w_os('Head'),
             xf=p.tete_xf(), decor=[_fissures, _yeux_betes((0.045, 1.72, 0.10), (1.0, 0.6, 0.15))])
    epaulieres(p, 'roche', 'futur', taille=1.3, decor=deco)
    bras(p, 'roche', decor=deco)
    manchon_bras(p, 'avant_bras', 'roche', 0.48, 0.72, 0.03, evase=0.03, decor=deco)
    mains(p, 'roche', moufle=True)
    jambes(p, 'roche', decor=deco)
    manchon_jambe(p, 'tibia', 'roche', 0.55, 0.10, 0.03, n=5, decor=deco)
    pieds(p, 'roche', semelle=None, ext=0.02, haut=0.02)
    boite_piece(p, 'runes', 'joueur_metal', (0, 1.30, 0.17), (0.12, 0.12, 0.03), w_os('Spine2'), arrondi=0.5)
    return pal


def _fissures(c):
    n = bruit(c.P, 18, 9)
    m = np.abs(n - 0.5) < 0.018
    c.col = np.where(m[:, None], np.array([1.0, 0.55, 0.15]), c.col)
    c.col = c.col * (0.85 + 0.25 * bruit(c.P, 50, 3))[:, None]


def valkyrie(p):
    pal = base('claire', 'blond', mailles=Mat('mailles', (0.74, 0.76, 0.79), metal=0.7),
               plume=Mat('plumes', (0.95, 0.94, 0.92)))
    torse(p, 'mailles', ep=-0.004, y_bas=1.0)
    gilet(p, 'acier', 1.18, 1.50, 0.02, base_ep=-0.004, decor=[lambda c: c.poser('or', np.abs(c.y - 1.30) < 0.02)])
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.30, 0.45, 0.60), femme=True)])
    cheveux(p, 'cheveux', 'tresses')
    casque_conique(p, 'acier', nasal=False, bandes='or')
    for s in (1, -1):
        p.ajoute('aile_casque%d' % (s > 0), chemin([(s * 0.10, 1.78, -0.01), (s * 0.15, 1.84, -0.04), (s * 0.17, 1.90, -0.08)],
                                                    [(0.04, 0.006), (0.035, 0.006), (0.0, 0.0)], p.k(6), haut=(0, 0, 1)),
                 'plume', w_os('Head'), xf=p.tete_xf())
    ailes(p, 'plume', envergure=0.55, hauteur=0.85)
    bras(p, zones('mailles', ('cuir', lambda c: c.ax > 0.60)))
    mains(p, 'cuir')
    jambes(p, 'cuir')
    manchon_jambe(p, 'botte', 'cuir', 0.40, 0.10, 0.012, n=4)
    pieds(p, 'cuir', ext=0.008, haut=0.01)
    jupe(p, 'jupe', 'joueur', 1.0, 0.66, 0.006, 0.05, decor=[ourlet(0.68)])
    ceinture(p, 'or', 1.0, 0.04, 0.016)
    cape(p, 'joueur', bas=0.40, largeur=0.9)
    return pal


def guerrier_squelette(p):
    pal = base('claire', 'noir', os_=Mat('peinture', (0.86, 0.82, 0.70), rug=0.6), rouille=Mat('metal', (0.45, 0.30, 0.20), rug=0.7),
               lambeaux=Mat('tissu', joueur=True))
    torse(p, 'os_', ep=-0.012, y_bas=1.0, bosses=False, decor=[_cotes])
    bassin(p, 'os_')
    cou(p, 'os_')
    tete(p, 'os_', decor=[peinture_visage((0.05, 0.04, 0.04), 'crane'), _dents], nez=0, oreilles=False)
    casque_conique(p, 'rouille', nasal=True, bandes=None)
    bras(p, 'os_', decor=[_articulations_os])
    mains(p, 'os_')
    jambes(p, 'os_', decor=[_articulations_os])
    pieds(p, 'os_', semelle=None)
    lanieres(p, 'haillons', 'lambeaux', 10, 0.0, 1.02, 0.66, 0.012, ep=0.004, jeu=0.25, rangs=3)
    ceinture(p, 'cuir', 1.02, 0.03, 0.014)
    return pal


def _cotes(c):
    r = np.abs(np.sin((c.y - 1.15) * 55)) < 0.35
    m = r & (c.y > 1.15) & (c.y < 1.45) & (c.ax > 0.02)
    c.col = np.where(m[:, None], c.col * 0.35, c.col)
    c.col = np.where(((c.y < 1.15) & (c.ax > 0.03) & (c.z > 0))[:, None], c.col * 0.45, c.col)


def _dents(c):
    d = (c.z > 0.05) & (c.ax < 0.03) & (np.abs(c.y - 1.635) < 0.01) & (np.abs(((c.x * 110) % 1) - 0.5) < 0.3)
    c.col = np.where(d[:, None], c.col * 0.35, c.col)


def _articulations_os(c):
    if c.piece.nom.startswith('bras'):
        m = np.abs(c.ax - 0.455) < 0.02
    else:
        m = np.abs(c.y - 0.535) < 0.02
    c.col = np.where(m[:, None], c.col * 0.75, c.col)


def titan(p):
    pal = base('mate', 'blond', peau_or=Mat('metal', (0.82, 0.62, 0.30), rug=0.4, metal=0.7, clair=(1.0, 0.88, 0.55)),
               lumiere=Mat('lumiere', (1.0, 0.95, 0.70)))
    pal['peau'] = pal['peau_or']
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[_veines_lumineuses])
    cou(p, 'peau')
    tete(p, 'peau', decor=[_yeux_lumineux])
    cheveux(p, 'lumiere', 'long')
    barbe(p, 'lumiere', 'longue')
    laurier(p, 'or')
    bras(p, peau_et([('or', lambda c: (c.ax > 0.60) & (c.ax < 0.70))]), decor=[_veines_lumineuses])
    mains(p, 'peau')
    jambes(p, 'peau', decor=[_veines_lumineuses])
    pieds(p, 'peau', semelle='or', decor=[sandales])
    jupe(p, 'pagne', 'joueur', 1.0, 0.62, 0.006, 0.06, decor=[ourlet(0.64)])
    ceinture(p, 'or', 1.0, 0.05, 0.02)
    cape(p, 'joueur', bas=0.30, largeur=1.0)
    return pal


def _veines_lumineuses(c):
    n = bruit(c.P, 10, 21)
    m = np.abs(n - 0.5) < 0.012
    c.col = np.where(m[:, None], np.array([1.0, 0.95, 0.70]), c.col)


def _yeux_lumineux(c):
    e = (c.z > 0.03) & (np.hypot((c.ax - 0.034) / 1.6, c.y - 1.712) < 0.009)
    c.col = np.where(e[:, None], np.array([1.0, 0.98, 0.85]), c.col)


def geant_glace(p):
    pal = base('claire', 'blond', glace=Mat('peau', (0.62, 0.78, 0.92), rug=0.35),
               givre=Mat('cheveux', (0.92, 0.96, 1.0)), fourrure=Mat('fourrure', (0.85, 0.85, 0.82)),
               cristal=Mat('lumiere', (0.70, 0.92, 1.0)))
    pal['peau'] = pal['glace']
    torse(p, 'peau', ep=-0.012, y_bas=1.0, decor=[tatouages((0.25, 0.45, 0.75))])
    bassin(p, 'fourrure')
    cou(p, 'peau')
    tete(p, 'peau', decor=[visage((0.55, 0.85, 1.0), (0.85, 0.92, 1.0))])
    cheveux(p, 'givre', 'long')
    barbe(p, 'givre', 'longue')
    anneau_tete(p, 'couronne_glace', 'cristal', 1.78, 0.008, 0.02, 0.01, pointes=6, h_pointe=0.06)
    col_fourrure(p, 'fourrure')
    bras(p, peau_et([('fourrure', lambda c: (c.ax > 0.58) & (c.ax < 0.70))]))
    mains(p, 'peau')
    jambes(p, 'fourrure')
    manchon_jambe(p, 'botte', 'fourrure', 0.42, 0.10, 0.02, n=4)
    pieds(p, 'fourrure', ext=0.012, haut=0.012)
    jupe(p, 'pagne', 'joueur', 1.0, 0.66, 0.008, 0.06, decor=[ourlet(0.68)])
    ceinture(p, 'cuir', 1.0, 0.06, 0.02)
    return pal


PERSONNAGES = [
    ('8-mythologie', 'minotaure', 'Minotaure', 'Mythologie grecque', GEANT, minotaure, ['hache-double'], {'echelle': 1.35}),
    ('8-mythologie', 'cyclope', 'Cyclope', 'Mythologie grecque', VENTRU, cyclope, ['massue'], {'echelle': 1.6}),
    ('8-mythologie', 'titan', 'Titan', 'Mythologie grecque', GEANT, titan, ['massue'], {'echelle': 2.2}),
    ('8-mythologie', 'anubite', 'Anubite', 'Mythologie égyptienne', HEROS, anubite, ['khopesh', 'lance-dory'], {'echelle': 1.15}),
    ('8-mythologie', 'valkyrie', 'Valkyrie', 'Mythologie nordique', FEMME_GUERRIERE, valkyrie, ['lance-dory', 'bouclier-viking'], {'echelle': 1.05}),
    ('8-mythologie', 'geant-de-glace', 'Géant de glace', 'Mythologie nordique', GEANT, geant_glace, ['massue', 'hache-viking'], {'echelle': 1.8}),
    ('8-mythologie', 'golem', 'Golem de pierre', 'Légendes', VENTRU, golem, [], {'echelle': 1.5}),
    ('8-mythologie', 'guerrier-squelette', 'Guerrier squelette', 'Légendes', OSSEUX, guerrier_squelette, ['epee-longue', 'bouclier-rond-orient']),
]
