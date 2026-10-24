#!/usr/bin/env python3
"""Fabrique tous les personnages et accessoires 3D (numpy + Pillow uniquement).

  python3 design/3d/fabriquer.py                 tout fabriquer (personnages puis accessoires)
  python3 design/3d/fabriquer.py --seul viking   un ou plusieurs éléments (séparés par des virgules)
  python3 design/3d/fabriquer.py --zip           tout fabriquer puis créer le zip de livraison
  python3 design/3d/fabriquer.py --emballer      créer seulement la livraison : zips de 30 Mo au plus dans livraison/ (après outils/apercus.js et outils/planches.py)

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

from moteur import assembler, exporter, humain_echelle  # noqa: E402
from corps import Perso  # noqa: E402
import personnages  # noqa: E402
import accessoires  # noqa: E402
import quadrupedes  # noqa: E402

TOUS_PERSOS = list(personnages.PERSONNAGES)
for _mod in ('personnages2', 'mythologie'):
    try:
        TOUS_PERSOS += getattr(__import__(_mod), 'PERSONNAGES')
    except ImportError:
        pass
TOUS_PERSOS.sort(key=lambda e: e[0])

FAMILLES = [('monture', quadrupedes.MONTURES, (4000, 10000))]
for _mod, _cle, _budget in (('machines', 'MACHINES', (300, 10000)), ('navires', 'NAVIRES', (300, 10000))):
    try:
        FAMILLES.append((_cle.lower()[:-1], getattr(__import__(_mod), _cle), _budget))
    except ImportError:
        pass
UNITES = [(fam, e, budget) for fam, liste, budget in FAMILLES for e in liste]

SORTIE = os.path.join(ICI, 'sortie')
MIN_TRI, MAX_TRI, CIBLE = 6000, 10000, 8000


def fabriquer_perso(i):
    e = TOUS_PERSOS[i]
    ere, ident, nom, culture, morph, fn, conseils = e[:7]
    opts = e[7] if len(e) > 7 else {}
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
    if opts.get('echelle', 1.0) != 1.0:  # géants : maillage et squelette agrandis ensemble
        M['P'] = M['P'] * opts['echelle']
        M['sq'] = humain_echelle(opts['echelle'])
    dossier = os.path.join(SORTIE, 'personnages', ere, ident)
    st = exporter(M, dossier, ident)
    st.update(type='personnage', ere=ere, id=ident, nom=nom, culture=culture, accessoires=conseils,
              duree=round(time.time() - t0, 1), chemin=os.path.relpath(dossier, SORTIE))
    return st


def fabriquer_unite(i):
    fam, e, (mini, maxi) = UNITES[i]
    ere, ident, nom, culture, fn, tex = e
    t0 = time.time()
    cible = (mini + maxi) * 0.5 if fam == 'monture' else 3500
    q = 1.0
    for _ in range(6):
        pieces, pal, sq = fn(q)
        tri = sum(len(pc.F) for pc in pieces)
        if mini <= tri <= maxi - 300 and abs(tri - cible) < cible * 0.3:
            break
        q2 = min(max(q * (cible / tri) ** 0.95, 0.4), 3.0)
        if q2 == q:
            break
        q = q2
    M = assembler(pieces, pal, tex, sq)
    dossier = os.path.join(SORTIE, fam + 's', ere, ident)
    st = exporter(M, dossier, ident)
    st.update(type=fam, ere=ere, id=ident, nom=nom, culture=culture, os=sq.nb if sq else 0, texture=tex,
              budget=[mini, maxi], duree=round(time.time() - t0, 1), chemin=os.path.relpath(dossier, SORTIE))
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
    persos = [i for i, e in enumerate(TOUS_PERSOS) if not seul or e[1] in seul]
    accs = [i for i, e in enumerate(accessoires.ACCESSOIRES) if not seul or e[1] in seul]
    unites = [i for i, u in enumerate(UNITES) if not seul or u[1][1] in seul]
    erreurs = []
    ids_acc = {e[1] for e in accessoires.ACCESSOIRES}
    for e in TOUS_PERSOS:
        erreurs += ['%s (accessoire inconnu : %s)' % (e[1], a) for a in e[6] if a not in ids_acc]
    with Pool(min(4, os.cpu_count() or 2)) as pool:
        res = (pool.map(fabriquer_perso, persos, chunksize=1) + pool.map(fabriquer_unite, unites, chunksize=1)
               + pool.map(fabriquer_acc, accs, chunksize=1))
    for r in res:
        ok = r['type'] != 'personnage' or MIN_TRI <= r['triangles'] <= MAX_TRI
        if 'budget' in r:
            ok = r['budget'][0] <= r['triangles'] <= r['budget'][1]
        if r['type'] != 'accessoire' and r['joueur'] <= 0.001:
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
    ordre = ([e[1] for e in TOUS_PERSOS] + [u[1][1] for u in UNITES]
             + [e[1] for e in accessoires.ACCESSOIRES])
    liste = [ancien[i] for i in ordre if i in ancien]
    with open(catalogue, 'w', encoding='utf8') as f:
        json.dump(liste, f, ensure_ascii=False, indent=1)
    ecrire_catalogue(liste)
    if erreurs:
        print('Hors budget ou sans zone joueur :', ', '.join(erreurs))
        sys.exit(1)
    if '--zip' in args:
        emballer()


ERES = {'0-montures': 'Montures', '1-antiquite': 'Antiquité', '2-moyen-age': 'Moyen Âge', '3-epoque-moderne': 'Époque moderne (1500-1815)',
        '4-industrielle': 'Ère industrielle (XIXe)', '5-xxe-siecle': 'XXe siècle', '6-contemporain': 'Contemporain',
        '7-futur': 'Futur', '8-mythologie': 'Mythologie'}
TYPES = {'personnage': 'Personnage', 'monture': 'Monture', 'machine': 'Machine', 'navire': 'Navire'}


def ecrire_catalogue(liste):
    """CATALOGUE.md : tableau des personnages et accessoires, par ère."""
    L = ['# Catalogue', '', 'Généré par `fabriquer.py` : ne pas modifier à la main.', '']
    for t, nom in TYPES.items():
        n = sum(1 for x in liste if x['type'] == t)
        L.append('- %s : %d' % (nom + 's', n))
    L += ['- Accessoires : %d' % sum(1 for x in liste if x['type'] == 'accessoire'), '']
    for ere, titre in ERES.items():
        p = [x for x in liste if x['ere'] == ere and x['type'] == 'personnage']
        a = [x for x in liste if x['ere'] == ere and x['type'] == 'accessoire']
        if not [x for x in liste if x['ere'] == ere]:
            continue
        L += ['## ' + titre, '']
        if p:
            L += ['| Personnage | Culture | Fichier | Triangles | Accessoires conseillés |', '|---|---|---|---|---|']
            L += ['| %s | %s | `%s/%s.glb` | %d | %s |' % (x['nom'], x['culture'], x['chemin'], x['id'], x['triangles'],
                                                        ', '.join(x['accessoires'])) for x in p]
            L.append('')
        u = [x for x in liste if x['ere'] == ere and x['type'] in ('monture', 'machine', 'navire')]
        if u:
            L += ['| %s | Culture | Fichier | Triangles | Os animables |' % 'Unité', '|---|---|---|---|---|']
            L += ['| %s (%s) | %s | `%s/%s.glb` | %d | %d |' % (x['nom'], TYPES[x['type']].lower(), x['culture'], x['chemin'],
                                                            x['id'], x['triangles'], x['os']) for x in u]
            L.append('')
        if a:
            L += ['| Accessoire | Fichier | Triangles | Texture | Prise |', '|---|---|---|---|---|']
            L += ['| %s | `%s/%s.glb` | %d | %d px | %s |' % (x['nom'], x['chemin'], x['id'], x['triangles'],
                                                           x['texture'], x['prise']) for x in a]
            L.append('')
    with open(os.path.join(SORTIE, 'CATALOGUE.md'), 'w', encoding='utf8') as f:
        f.write('\n'.join(L))


LIMITE_ZIP = 29_500_000  # « 30 Mo au plus » par zip, avec une marge


def _contenu(ch, rel):
    """(nom dans le zip, octets, compresser) ; aperçus et couleur de base convertis en JPEG haute qualité."""
    f = os.path.basename(ch)
    if f.endswith('.png') and (f.startswith(('apercu', 'portrait')) or f.endswith('_basecolor.png')):
        import io
        from PIL import Image
        im = Image.open(ch)
        if im.mode == 'RGBA':
            fond = Image.new('RGBA', im.size, (52, 60, 72, 255))
            fond.alpha_composite(im)
            im = fond
        b = io.BytesIO()
        im.convert('RGB').save(b, 'JPEG', quality=95 if f.endswith('_basecolor.png') else 90, subsampling=0)
        return rel[:-4] + '.jpg', b.getvalue(), False
    with open(ch, 'rb') as fh:
        return rel, fh.read(), not f.endswith(('.png', '.jpg', '.glb'))


def emballer():
    """Livraison en plusieurs zips de 30 Mo au plus, par famille et par ère (coupés en parties si besoin).
    Tous les zips se décompressent dans le même dossier QuenTools-3D/ et reforment l'arborescence complète."""
    import shutil
    import zlib
    dossier = os.path.join(ICI, 'livraison')
    shutil.rmtree(dossier, ignore_errors=True)
    os.makedirs(dossier)
    racine = 'QuenTools-3D'
    docs = [_contenu(os.path.join(ICI, 'README.md'), racine + '/LISEZMOI.md'),
            _contenu(os.path.join(SORTIE, 'CATALOGUE.md'), racine + '/CATALOGUE.md')]
    cat = json.load(open(os.path.join(SORTIE, 'catalogue.json'), encoding='utf8'))
    groupes = [('00-apercus-et-catalogue', [])]
    for t, ere_par_ere in (('personnage', True), ('monture', False), ('machine', False), ('navire', False),
                           ('accessoire', False)):
        items = [x for x in cat if x['type'] == t]
        if ere_par_ere:
            for ere in ERES:
                g = [x for x in items if x['ere'] == ere]
                if g:
                    groupes.append(('personnages-' + ere, g))
        elif items:
            groupes.append((t + 's', items))
    produits = []

    def ecrire(nom, contenus):
        ch = os.path.join(dossier, 'QuenTools-3D-%s.zip' % nom)
        with zipfile.ZipFile(ch, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for arc, data, comp in docs + contenus:
                z.writestr(arc, data, compress_type=zipfile.ZIP_DEFLATED if comp else zipfile.ZIP_STORED)
        produits.append((os.path.basename(ch), os.path.getsize(ch)))

    for nom, items in groupes:
        if not items:  # planches, catalogue
            extra = [_contenu(os.path.join(SORTIE, 'apercus', f), '%s/apercus/%s' % (racine, f))
                     for f in sorted(os.listdir(os.path.join(SORTIE, 'apercus')))]
            extra.append(_contenu(os.path.join(SORTIE, 'catalogue.json'), racine + '/catalogue.json'))
            ecrire(nom, extra)
            continue
        base = sum(len(zlib.compress(d, 6)) if c else len(d) for _, d, c in docs) + 4000
        parties, cour, taille = [], [], base
        for x in items:
            rep = os.path.join(SORTIE, x['chemin'])
            cont = []
            for r, _, fs in os.walk(rep):
                for f in sorted(fs):
                    ch = os.path.join(r, f)
                    cont.append(_contenu(ch, '%s/%s' % (racine, os.path.relpath(ch, SORTIE))))
            t = sum((len(zlib.compress(d, 6)) if c else len(d)) + 200 for _, d, c in cont)
            if cour and taille + t > LIMITE_ZIP:
                parties.append(cour)
                cour, taille = [], base
            cour += cont
            taille += t
        if cour:
            parties.append(cour)
        for k, p in enumerate(parties):
            ecrire(nom + ('-partie%d' % (k + 1) if len(parties) > 1 else ''), p)
    for n, t in produits:
        print('%-60s %6.1f Mo' % (n, t / 1e6))
    trop = [n for n, t in produits if t > 30_000_000]
    print('%d zips, %.1f Mo au total%s' % (len(produits), sum(t for _, t in produits) / 1e6,
                                          (' — TROP GROS : ' + ', '.join(trop)) if trop else ', tous sous 30 Mo'))


if __name__ == '__main__':
    main()
