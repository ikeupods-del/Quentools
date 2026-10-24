#!/usr/bin/env python3
"""Fabrique tous les personnages et accessoires 3D (numpy + Pillow uniquement).

  python3 design/3d/fabriquer.py                 tout fabriquer (personnages puis accessoires)
  python3 design/3d/fabriquer.py --seul viking   un ou plusieurs éléments (séparés par des virgules)
  python3 design/3d/fabriquer.py --zip           tout fabriquer puis créer le zip de livraison
  python3 design/3d/fabriquer.py --emballer      créer seulement le zip (après outils/apercus.js et outils/planches.py)

Sortie : design/3d/sortie/personnages/<ère>/<id>/<id>.glb (+ textures/), design/3d/sortie/accessoires/...
"""
import json
import os
import sys
import time
import zipfile
from multiprocessing import Pool

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)

from moteur import assembler, exporter  # noqa: E402
from corps import Perso  # noqa: E402
import personnages  # noqa: E402
import accessoires  # noqa: E402

SORTIE = os.path.join(ICI, 'sortie')
MIN_TRI, MAX_TRI, CIBLE = 6000, 10000, 8000


def fabriquer_perso(i):
    e = personnages.PERSONNAGES[i]
    ere, ident, nom, culture, morph, fn, conseils = e
    t0 = time.time()
    q = 1.0
    for _ in range(6):
        p = Perso(morph, q)
        pal = fn(p)
        tri = sum(len(pc.F) for pc in p.pieces)
        if MIN_TRI + 300 <= tri <= MAX_TRI - 300:
            break
        q = min(max(q * (CIBLE / tri) ** 0.95, 0.4), 3.0)
    M = assembler(p.pieces, pal, 2048)
    dossier = os.path.join(SORTIE, 'personnages', ere, ident)
    st = exporter(M, dossier, ident)
    st.update(type='personnage', ere=ere, id=ident, nom=nom, culture=culture, accessoires=conseils,
              duree=round(time.time() - t0, 1), chemin=os.path.relpath(dossier, SORTIE))
    return st


def fabriquer_acc(i):
    e = accessoires.ACCESSOIRES[i]
    ere, ident, nom, fn, tex = e
    t0 = time.time()
    pieces, pal, prise = fn()
    M = assembler(pieces, pal, tex)
    dossier = os.path.join(SORTIE, 'accessoires', ere, ident)
    st = exporter(M, dossier, ident)
    st.update(type='accessoire', ere=ere, id=ident, nom=nom, prise=prise, texture=tex,
              duree=round(time.time() - t0, 1), chemin=os.path.relpath(dossier, SORTIE))
    return st


def main():
    args = sys.argv[1:]
    if '--emballer' in args:
        emballer()
        return
    seul = None
    if '--seul' in args:
        seul = set(args[args.index('--seul') + 1].split(','))
    persos = [i for i, e in enumerate(personnages.PERSONNAGES) if not seul or e[1] in seul]
    accs = [i for i, e in enumerate(accessoires.ACCESSOIRES) if not seul or e[1] in seul]
    erreurs = []
    with Pool(min(4, os.cpu_count() or 2)) as pool:
        res = pool.map(fabriquer_perso, persos, chunksize=1) + pool.map(fabriquer_acc, accs, chunksize=1)
    for r in res:
        ok = r['type'] != 'personnage' or MIN_TRI <= r['triangles'] <= MAX_TRI
        if r['type'] == 'personnage' and r['joueur'] <= 0.001:
            ok = False
        if not ok:
            erreurs.append(r['id'])
        print('%-4s %-24s %6d triangles  %5.2f m  joueur %4.1f %%  %5.1f s' % (
            'OK' if ok else 'ERR', r['id'], r['triangles'], r['hauteur'], 100 * r['joueur'], r['duree']))
    catalogue = os.path.join(SORTIE, 'catalogue.json')
    ancien = {}
    if os.path.exists(catalogue) and seul:
        ancien = {x['id']: x for x in json.load(open(catalogue, encoding='utf8'))}
    for r in res:
        ancien[r['id']] = r
    ordre = [e[1] for e in personnages.PERSONNAGES] + [e[1] for e in accessoires.ACCESSOIRES]
    liste = [ancien[i] for i in ordre if i in ancien]
    with open(catalogue, 'w', encoding='utf8') as f:
        json.dump(liste, f, ensure_ascii=False, indent=1)
    ecrire_catalogue(liste)
    if erreurs:
        print('Hors budget ou sans zone joueur :', ', '.join(erreurs))
        sys.exit(1)
    if '--zip' in args:
        emballer()


ERES = {'1-antiquite': 'Antiquité', '2-moyen-age': 'Moyen Âge', '3-epoque-moderne': 'Époque moderne (1500-1815)',
        '4-industrielle': 'Ère industrielle (XIXe)', '5-xxe-siecle': 'XXe siècle', '6-contemporain': 'Contemporain',
        '7-futur': 'Futur'}


def ecrire_catalogue(liste):
    """CATALOGUE.md : tableau des personnages et accessoires, par ère."""
    L = ['# Catalogue', '', 'Généré par `fabriquer.py` : ne pas modifier à la main.', '']
    for ere, titre in ERES.items():
        p = [x for x in liste if x['ere'] == ere and x['type'] == 'personnage']
        a = [x for x in liste if x['ere'] == ere and x['type'] == 'accessoire']
        if not p and not a:
            continue
        L += ['## ' + titre, '']
        if p:
            L += ['| Personnage | Culture | Fichier | Triangles | Accessoires conseillés |', '|---|---|---|---|---|']
            L += ['| %s | %s | `%s/%s.glb` | %d | %s |' % (x['nom'], x['culture'], x['chemin'], x['id'], x['triangles'],
                                                        ', '.join(x['accessoires'])) for x in p]
            L.append('')
        if a:
            L += ['| Accessoire | Fichier | Triangles | Texture | Prise |', '|---|---|---|---|---|']
            L += ['| %s | `%s/%s.glb` | %d | %d px | %s |' % (x['nom'], x['chemin'], x['id'], x['triangles'],
                                                           x['texture'], x['prise']) for x in a]
            L.append('')
    with open(os.path.join(SORTIE, 'CATALOGUE.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(L))


def emballer():
    nom = os.path.join(ICI, 'QuenTools-personnages-3D.zip')
    if os.path.exists(nom):
        os.remove(nom)
    racine_zip = 'QuenTools-personnages-3D'
    with zipfile.ZipFile(nom, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        z.write(os.path.join(ICI, 'README.md'), racine_zip + '/LISEZMOI.md')
        for racine, _, fichiers in os.walk(SORTIE):
            for f in sorted(fichiers):
                ch = os.path.join(racine, f)
                z.write(ch, os.path.join(racine_zip, os.path.relpath(ch, SORTIE)))
    print('Zip : %s (%.1f Mo)' % (os.path.relpath(nom, ICI), os.path.getsize(nom) / 1e6))


if __name__ == '__main__':
    main()
