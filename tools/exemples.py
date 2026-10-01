#!/usr/bin/env python3
"""Génère les sites d'exemple de exemples/<secteur>/index.html à partir des structures des modèles de design/templates.
Entreprises, lieux, tarifs et contenus sont fictifs : chaque page l'indique en haut. Aucun avis ni chiffre inventé n'est présenté comme réel.
Usage : python3 tools/exemples.py   (puis, pour les vignettes : node tools/vignettes-exemples.js)"""
import json, os, html

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
e = html.escape

CSS = """
  .ph{aspect-ratio:4/3;border-radius:var(--r-lg);display:grid;place-items:center;font-size:clamp(2.4rem,6vw,3.6rem);background:linear-gradient(135deg,var(--accent-soft),var(--bg-2));border:1px solid var(--line)}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:var(--s-6);align-items:start}@media (max-width:760px){.two{grid-template-columns:1fr}}
  .price-list{display:grid;border:1px solid var(--line);border-radius:var(--r-lg);background:var(--surface);overflow:hidden}
  .price-row{display:flex;gap:var(--s-4);justify-content:space-between;align-items:baseline;padding:18px 22px;border-top:1px solid var(--line)}
  .price-row:first-child{border-top:0}.price-row b{font-weight:600}.price-row small{display:block;color:var(--muted)}.price-row .amount{font:700 var(--t-lg)/1 var(--f-display);white-space:nowrap}
  .hours{width:100%;border-collapse:collapse}.hours td{padding:10px 0;border-top:1px solid var(--line)}.hours td:last-child{text-align:right;color:var(--muted)}
  .today{padding:var(--s-6);border-radius:var(--r-xl);background:#1b1712;color:#f6efe6}.today h3{color:var(--lime);margin:0 0 var(--s-3)}.today p{color:#e9dfd2;margin:0 0 6px}
  .dish{display:flex;gap:var(--s-4);justify-content:space-between;align-items:baseline;padding:14px 0;border-top:1px solid var(--line)}
  .dish b{font-weight:600}.dish small{display:block;color:var(--muted)}.dish .amount{font:700 var(--t-md)/1 var(--f-display);white-space:nowrap}
  .menu h3{margin:var(--s-5) 0 var(--s-2);font-size:var(--t-lg)}
  .cover{aspect-ratio:3/4;max-width:340px;margin-inline:auto;border-radius:var(--r-lg);background:linear-gradient(150deg,var(--accent),#1b1340);color:#fff;display:grid;align-content:end;padding:28px;box-shadow:var(--sh-3);transform:rotate(2deg)}
  .cover b{font:700 clamp(1.4rem,3vw,2rem)/1.1 var(--f-display)}.cover small{opacity:.8}
  .toc{columns:2;column-gap:var(--s-6);padding:0;list-style:none;margin:0}@media (max-width:640px){.toc{columns:1}}.toc li{break-inside:avoid;padding:10px 0;border-top:1px solid var(--line)}
  .cta-band form p,.cta-band form a{color:var(--muted)}
  .demo-note{margin-top:var(--s-3);font-size:var(--t-sm)}
"""

JS = """<script src="../../assets/qt.js" defer></script>
<script>document.addEventListener('submit',function(e){e.preventDefault();var n=e.target.querySelector('.demo-note');if(!n){n=document.createElement('p');n.className='demo-note';e.target.appendChild(n)}n.textContent='Démonstration : ce formulaire n\\u2019envoie rien. Sur un vrai site, la demande arrive directement chez le professionnel.'});</script>"""


def head(c):
    a, s, l = c['accent'], c['soft'], c['lime']
    dk = c.get('dark', ('#fb923c', '#2a1608'))
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(c['nom'])} · exemple de site ({e(c['secteur'])})</title>
<meta name="description" content="Exemple fictif de site pour {e(c['secteur'].lower())}, réalisé par QuenTools.">
<meta name="robots" content="noindex">
<link rel="icon" href="../../assets/logo.svg" type="image/svg+xml">
<link rel="preload" href="../../assets/fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../../assets/qt.css">
<style>
  :root{{--accent:{a};--accent-soft:{s};--lime:{l}}}
  @media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--accent:{dk[0]};--accent-soft:{dk[1]}}}}}{CSS}</style>
</head>
<body>
<div class="announce"><div class="wrap"><a href="../../devis/">Exemple fictif réalisé par QuenTools : demander le mien →</a></div></div>
<a class="skip" href="#contenu">Aller au contenu</a>
"""


def nav(c, links, cta):
    li = ''.join(f'<li><a href="{h}">{t}</a></li>' for h, t in links)
    return f"""<header class="nav"><div class="wrap">
  <a class="brand" href="./">{e(c['nom'])}</a>
  <ul class="nav-links">{li}</ul>
  <a class="btn btn-sm btn-accent" href="#contact">{e(cta)}</a>
</div></header>
"""


def foot(c):
    return f"""
<footer class="footer"><div class="wrap"><div class="footer-bottom" style="margin-top:0;border-top:0;padding-top:0">
  <span>© <span data-year>2026</span> {e(c['nom'])} (entreprise fictive) · SIRET 000 000 000 00000 (exemple)</span>
  <span><a href="../">Autres exemples</a> · Site réalisé par <a href="https://ikeupods-del.github.io/Quentools/">QuenTools</a></span>
</div></div></footer>
{JS}
</body>
</html>
"""


def faq(items):
    d = ''.join(f'<details><summary>{e(q)}</summary><p>{e(r)}</p></details>' for q, r in items)
    return f"""  <section class="section" id="faq" style="padding-top:0"><div class="wrap faq-grid">
    <div class="section-head"><span class="eyebrow">FAQ</span><h2 class="h-section">Questions fréquentes</h2></div>
    <div class="faq">{d}</div>
  </div></section>
"""


def contact(c, titre, texte, fields):
    f = ''.join(fields)
    return f"""  <section class="section" id="contact" style="padding-top:0"><div class="wrap" style="max-width:820px">
    <div class="cta-band">
      <span class="eyebrow" style="color:var(--lime)">Contact</span>
      <h2 style="margin:var(--s-4) 0">{e(titre)}</h2>
      <p>{e(texte)}</p>
      <form class="form" style="background:var(--surface);color:var(--ink);padding:var(--s-5);border-radius:var(--r-lg);margin-top:var(--s-5)">
        {f}
        <button class="btn btn-accent" type="submit">Envoyer ma demande</button>
      </form>
    </div>
  </div></section>
"""


F_NOM = '<div class="form-grid"><div class="field"><label for="n">Nom</label><input id="n" name="nom" autocomplete="name" required></div><div class="field"><label for="t">Téléphone ou e-mail</label><input id="t" name="contact" required></div></div>'


def f_msg(label):
    return f'<div class="field"><label for="m">{e(label)}</label><textarea id="m" name="message" rows="3" required></textarea></div>'


def hero(c, badge):
    return f"""  <section class="hero"><div class="bg-grid" aria-hidden="true"></div>
    <div class="wrap">
      <span class="chip chip-ok reveal"><span class="dot"></span> {e(badge)}</span>
      <h1 class="display reveal" style="--i:1">{e(c['h1a'])} <em>{e(c['h1b'])}</em></h1>
      <p class="lede reveal" style="--i:2">{e(c['lede'])}</p>
      <div class="hero-cta reveal" style="--i:3"><a class="btn btn-accent" href="#contact">{e(c['cta'])}</a><a class="btn btn-ghost" href="#{c.get('second','services')}">{e(c['cta2'])}</a></div>
    </div>
  </section>
"""


def services(c):
    cards = ''
    for i, (t, d, pts) in enumerate(c['services']):
        feat = ' is-featured' if i == 1 else ''
        chip = '<span class="chip chip-lime" style="align-self:flex-start">Le plus demandé</span>' if i == 1 else ''
        li = ''.join(f'<li>{e(p)}</li>' for p in pts)
        cards += f'<article class="card offer{feat} reveal" style="--i:{i}">{chip}<h3>{e(t)}</h3><p>{e(d)}</p><ul>{li}</ul></article>'
    return f"""  <section class="section" id="services" style="padding-top:0"><div class="wrap">
    <div class="section-head"><span class="eyebrow">{e(c.get('services_eyebrow','Services'))}</span><h2 class="h-section">{e(c['services_title'])}</h2></div>
    <div class="grid grid-3">{cards}</div>
  </div></section>
"""


def vitrine(c):
    tiles = ''.join(f'<figure class="card reveal" style="margin:0;--i:{i%2}"><div class="ph" aria-hidden="true">{em}</div><figcaption style="margin-top:var(--s-3)"><b>{e(t)}</b><br><span class="muted">{e(s)}</span></figcaption></figure>' for i, (em, t, s) in enumerate(c['gallery']))
    steps = ''.join(f'<div class="step reveal" style="--i:{i}"><h3>{e(t)}</h3><p>{e(d)}</p></div>' for i, (t, d) in enumerate(c['steps']))
    return (head(c) + nav(c, [('#services', 'Services'), ('#realisations', c.get('gal_nav', 'Réalisations')), ('#faq', 'FAQ')], c['nav_cta']) + '\n<main id="contenu">\n'
            + hero(c, c['badge']) + services(c)
            + f"""  <section class="section" id="realisations" style="background:var(--bg-2)"><div class="wrap">
    <div class="section-head"><span class="eyebrow">{e(c.get('gal_nav','Réalisations'))}</span><h2 class="h-section">{e(c['gal_title'])}</h2><p class="lede">Visuels d'illustration : sur un vrai site, vos photos remplacent ces cadres.</p></div>
    <div class="grid grid-2">{tiles}</div>
  </div></section>
  <section class="section"><div class="wrap"><div class="section-head"><span class="eyebrow">Comment ça se passe</span><h2 class="h-section">{e(c['steps_title'])}</h2></div><div class="steps">{steps}</div></div></section>
"""
            + faq(c['faq']) + contact(c, c['contact_title'], c['contact_text'], [F_NOM, f_msg(c['msg_label'])]) + '</main>' + foot(c))


def rdv(c):
    rows = ''.join(f'<div class="price-row"><div><b>{e(t)}</b><small>{e(d)}</small></div><span class="amount">{e(p)}</span></div>' for t, d, p in c['tarifs'])
    hrs = ''.join(f'<tr><td>{e(j)}</td><td>{e(h)}</td></tr>' for j, h in c['hours'])
    opts = ''.join(f'<option>{e(t)}</option>' for t, _, _ in c['tarifs'])
    fields = [F_NOM, f'<div class="field"><label for="p">Prestation</label><select id="p" name="prestation">{opts}</select></div>', f_msg('Créneaux souhaités')]
    return (head(c) + nav(c, [('#services', 'Prestations'), ('#tarifs', 'Tarifs'), ('#horaires', 'Horaires'), ('#faq', 'FAQ')], 'Prendre rendez-vous') + '\n<main id="contenu">\n'
            + hero(c, c['badge']) + services(c)
            + f"""  <section class="section" id="tarifs" style="background:var(--bg-2)"><div class="wrap two">
    <div><span class="eyebrow">Tarifs</span><h2 class="h-section" style="margin:var(--s-4) 0">{e(c['tarifs_title'])}</h2><p class="lede">{e(c['tarifs_text'])}</p></div>
    <div class="price-list reveal">{rows}</div>
  </div></section>
  <section class="section" id="horaires"><div class="wrap two">
    <div><span class="eyebrow">Horaires</span><h2 class="h-section" style="margin:var(--s-4) 0">Quand me trouver</h2><p class="lede">{e(c['adresse'])}</p></div>
    <table class="hours reveal"><caption class="muted" style="text-align:left;padding-bottom:8px">Horaires d'ouverture</caption>{hrs}</table>
  </div></section>
"""
            + faq(c['faq']) + contact(c, 'Réservez votre créneau', 'Indiquez la prestation et deux créneaux possibles : confirmation sous 24 h.', fields) + '</main>' + foot(c))


def resto(c):
    today = ''.join(f'<p><b>{e(x)}</b></p>' for x in c['today'])
    menu = ''
    for cat, items in c['menu']:
        menu += f'<h3>{e(cat)}</h3>' + ''.join(f'<div class="dish"><div><b>{e(n)}</b><small>{e(d)}</small></div><span class="amount">{e(p)}</span></div>' for n, d, p in items)
    hrs = ''.join(f'<tr><td>{e(j)}</td><td>{e(h)}</td></tr>' for j, h in c['hours'])
    fields = [F_NOM, '<div class="form-grid"><div class="field"><label for="d">Date et heure</label><input id="d" name="date" type="datetime-local" required></div><div class="field"><label for="c">Couverts</label><input id="c" name="couverts" type="number" min="1" max="12" value="2" required></div></div>' if c.get('reservation', True) else '', f_msg(c['msg_label'])]
    return (head(c) + nav(c, [('#carte', c['carte_nav']), ('#infos', 'Infos'), ('#contact', c['cta_nav'])], c['cta_nav']) + '\n<main id="contenu">\n'
            + f"""  <section class="hero"><div class="bg-grid" aria-hidden="true"></div>
    <div class="wrap two">
      <div><span class="chip chip-ok reveal"><span class="dot"></span> {e(c['badge'])}</span>
        <h1 class="display reveal" style="--i:1">{e(c['h1a'])} <em>{e(c['h1b'])}</em></h1>
        <p class="lede reveal" style="--i:2">{e(c['lede'])}</p>
        <div class="hero-cta reveal" style="--i:3"><a class="btn btn-accent" href="#contact">{e(c['cta'])}</a><a class="btn btn-ghost" href="#carte">{e(c['cta2'])}</a></div></div>
      <div class="today reveal" style="--i:2"><h3>{e(c['today_title'])}</h3>{today}<p style="margin-top:var(--s-4)">{e(c['today_price'])}</p></div>
    </div>
  </section>
  <section class="section" id="carte" style="padding-top:0"><div class="wrap two">
    <div><span class="eyebrow">{e(c['carte_nav'])}</span><h2 class="h-section" style="margin:var(--s-4) 0">{e(c['carte_title'])}</h2><p class="lede">{e(c['carte_text'])}</p>
      <p class="muted" style="font-size:var(--t-sm)">Allergènes : la liste est disponible sur demande auprès du personnel.</p></div>
    <div class="menu reveal">{menu}</div>
  </div></section>
  <section class="section" id="infos" style="background:var(--bg-2)"><div class="wrap two">
    <div><span class="eyebrow">Infos pratiques</span><h2 class="h-section" style="margin:var(--s-4) 0">Où et quand</h2><p class="lede">{e(c['adresse'])}</p></div>
    <table class="hours reveal"><caption class="muted" style="text-align:left;padding-bottom:8px">Horaires</caption>{hrs}</table>
  </div></section>
"""
            + contact(c, c['contact_title'], c['contact_text'], fields) + '</main>' + foot(c))


def ebook(c):
    toc = ''.join(f'<li><b>{e(t)}</b> : {e(d)}</li>' for t, d in c['toc'])
    pb = ''.join(f'<article class="card reveal" style="--i:{i}"><h3>{e(t)}</h3><p>{e(d)}</p></article>' for i, (t, d) in enumerate(c['problems']))
    return (head(c) + nav(c, [('#programme', 'Au programme'), ('#faq', 'FAQ')], 'Acheter').replace('href="#contact">Acheter', 'href="#acheter">Acheter') + '\n<main id="contenu">\n'
            + f"""  <section class="hero"><div class="bg-grid" aria-hidden="true"></div>
    <div class="wrap two" style="align-items:center">
      <div><span class="chip chip-accent reveal">{e(c['badge'])}</span>
        <h1 class="display reveal" style="--i:1">{e(c['h1a'])} <em>{e(c['h1b'])}</em></h1>
        <p class="lede reveal" style="--i:2">{e(c['lede'])}</p>
        <div class="hero-cta reveal" style="--i:3"><a class="btn btn-accent" href="#acheter">Obtenir le guide · {e(c['price'])}</a><a class="btn btn-ghost" href="#programme">Voir le programme</a></div></div>
      <div class="cover reveal" style="--i:2"><small>{e(c['cover_sub'])}</small><b>{e(c['cover'])}</b><small>{e(c['auteur'])}</small></div>
    </div>
  </section>
  <section class="section" style="padding-top:0"><div class="wrap"><div class="section-head"><span class="eyebrow">Le problème</span><h2 class="h-section">{e(c['problems_title'])}</h2></div><div class="grid grid-3">{pb}</div></div></section>
  <section class="section" id="programme" style="background:var(--bg-2)"><div class="wrap"><div class="section-head"><span class="eyebrow">Au programme</span><h2 class="h-section">Ce que vous allez apprendre</h2></div><ol class="toc reveal">{toc}</ol></div></section>
  <section class="section" id="acheter"><div class="wrap" style="max-width:520px"><div class="card reveal" style="padding:var(--s-6);text-align:center"><span class="chip chip-ok">Accès immédiat</span>
    <div class="display" style="margin:var(--s-3) 0">{e(c['price'])}</div><p class="muted">Paiement unique · PDF · exemple fictif</p>
    <a class="btn btn-accent" href="#acheter" style="width:100%">Acheter maintenant</a><p class="demo-note muted">Démonstration : aucun achat possible sur cet exemple.</p></div></div></section>
"""
            + faq(c['faq']) + '</main>' + foot(c))


SITES = {}

SITES['plombier'] = dict(build=vitrine, secteur='Plombier chauffagiste', nom='Dupont Plomberie', ville='Lyon', accent='#0f5fa8', soft='#dbeafe', lime='#fbbf24', dark=('#7cb7ff', '#0e2238'),
    badge='Dépannage sous 24 h', h1a='Votre plombier à Lyon,', h1b='sans mauvaise surprise.', lede='Dépannage, chauffe-eau et salle de bains : un devis clair avant chaque intervention, un artisan qui vient quand il l\'a dit.',
    cta='Demander un devis gratuit', cta2='Voir les services', nav_cta='Devis gratuit',
    services_title='Ce que je répare et installe',
    services=[('Dépannage', 'Fuite, canalisation bouchée, panne de chauffe-eau.', ['Intervention rapide', 'Prix annoncé avant de commencer']),
              ('Chauffe-eau et chauffage', 'Remplacement et entretien de chaudières et ballons.', ['Conseil sur le modèle adapté', 'Reprise de l\'ancien appareil']),
              ('Salle de bains', 'Rénovation complète ou remplacement de la douche.', ['Plan et devis détaillé', 'Chantier propre'])],
    gal_title='Quelques types de chantiers', gallery=[('🚿', 'Salle de bains rénovée', 'Lyon 3e'), ('🔥', 'Chaudière remplacée', 'Villeurbanne'), ('🚰', 'Cuisine : nouvelle arrivée d\'eau', 'Lyon 7e'), ('🛁', 'Douche à l\'italienne', 'Caluire')],
    steps_title='Un devis, une date, un chantier propre', steps=[('Vous décrivez', 'Photo et description par message.'), ('Je chiffre', 'Devis détaillé sous 48 h.'), ('J\'interviens', 'À la date convenue, chantier nettoyé.')],
    faq=[('Le devis est-il gratuit ?', 'Oui, sans engagement.'), ('Intervenez-vous le week-end ?', 'Pour les urgences, selon disponibilité.'), ('Quels moyens de paiement ?', 'Virement, carte ou chèque.')],
    contact_title='Décrivez-moi votre problème', contact_text='Réponse sous 24 h avec une première estimation.', msg_label='Votre besoin')

SITES['paysagiste'] = dict(build=vitrine, secteur='Paysagiste', nom='Verdure & Co', accent='#2f7d32', soft='#dcfce7', lime='#bef264', dark=('#86efac', '#0f2a14'),
    badge='Planning ouvert pour le printemps', h1a='Un jardin qui vous ressemble,', h1b='et qui reste facile à vivre.', lede='Création, entretien et terrasses : je dessine, je plante et je suis là quand les saisons changent.',
    cta='Demander une visite', cta2='Voir les prestations', nav_cta='Visite gratuite',
    services_title='Du projet à l\'entretien',
    services=[('Création de jardin', 'Plan, plantations, éclairage et arrosage.', ['Plan 3D du projet', 'Plantes adaptées à votre sol']),
              ('Entretien régulier', 'Tonte, taille, désherbage, évacuation des déchets.', ['Forfait annuel', 'Passage à date fixe']),
              ('Terrasses et allées', 'Bois, pierre, dalles, bordures.', ['Pose soignée', 'Garantie sur la pose'])],
    gal_title='Des ambiances de jardin', gallery=[('🌿', 'Jardin méditerranéen', 'Maison de ville'), ('🪴', 'Terrasse en bois', 'Pose sur plots'), ('🌳', 'Haie et massifs', 'Entretien annuel'), ('💧', 'Coin eau', 'Bassin et galets')],
    steps_title='Une visite, un plan, un chantier', steps=[('Visite du terrain', 'Écoute de vos envies et mesures sur place.'), ('Proposition', 'Plan et devis détaillé.'), ('Réalisation', 'Chantier par étapes, suivi photo.')],
    faq=[('La visite est-elle payante ?', 'Non, elle est gratuite.'), ('Faites-vous l\'entretien seul ?', 'Oui, sans création préalable.'), ('Quand planter ?', 'Selon les plantes : on en parle lors de la visite.')],
    contact_title='Parlons de votre jardin', contact_text='Dites-moi la surface et vos envies : je vous rappelle.', msg_label='Votre projet')

SITES['photographe'] = dict(build=vitrine, secteur='Photographe', nom='Atelier Lumière', accent='#7c3aed', soft='#ede9fe', lime='#fde68a', dark=('#c4b5fd', '#221640'),
    badge='Dates disponibles cet été', h1a='Des photos qui racontent', h1b='votre histoire.', lede='Mariages, portraits et reportages d\'entreprise : un regard sincère, des images livrées en galerie privée.',
    cta='Réserver une date', cta2='Voir les formules', nav_cta='Réserver',
    services_title='Les formules', services=[('Portrait', 'Séance en studio ou en extérieur.', ['1 heure', '15 photos retouchées']), ('Mariage', 'Du préparatif à la soirée.', ['Journée complète', 'Galerie privée en ligne']), ('Entreprise', 'Équipe, locaux, produits.', ['Demi-journée', 'Droits d\'usage inclus'])],
    gal_title='Quelques ambiances', gal_nav='Portfolio', gallery=[('📷', 'Portrait lumineux', 'Séance en extérieur'), ('💍', 'Mariage champêtre', 'Cérémonie'), ('🏢', 'Reportage d\'équipe', 'Entreprise'), ('👶', 'Séance famille', 'À domicile')],
    steps_title='De la rencontre à la galerie', steps=[('On se rencontre', 'Échange sur vos envies, sans engagement.'), ('Jour J', 'Séance détendue, direction douce.'), ('Galerie', 'Livraison en ligne sous trois semaines.')],
    faq=[('Livrez-vous les fichiers bruts ?', 'Seules les images retouchées sont livrées.'), ('Peut-on imprimer ?', 'Oui, droits d\'impression privée inclus.'), ('Déplacez-vous ?', 'Oui, frais de déplacement selon la distance.')],
    contact_title='Parlons de votre projet', contact_text='Donnez la date et le lieu : je vérifie ma disponibilité.', msg_label='Votre projet')

SITES['fleuriste'] = dict(build=vitrine, secteur='Fleuriste', nom='Fleurs de Marie', accent='#be185d', soft='#fce7f3', lime='#fbcfe8', dark=('#f9a8d4', '#33101f'),
    badge='Commande avant 15 h, livraison le jour même', h1a='Des bouquets de saison,', h1b='faits à la main.', lede='Bouquets, compositions et décorations d\'événement, avec des fleurs choisies au marché le matin.',
    cta='Commander un bouquet', cta2='Voir les créations', nav_cta='Commander',
    services_title='Ce que je compose', services=[('Bouquets', 'Du petit bouquet aux grandes occasions.', ['Fleurs de saison', 'Carte message incluse']), ('Mariages et événements', 'Arche, centres de table, bouquet de mariée.', ['Rendez-vous conseil', 'Devis sur mesure']), ('Abonnement', 'Un bouquet chaque semaine, chez vous ou au bureau.', ['Livraison fixe', 'Résiliable à tout moment'])],
    gal_title='Créations récentes', gallery=[('💐', 'Bouquet champêtre', 'Saison'), ('🌹', 'Roses d\'amour', 'Fête'), ('🌷', 'Tulipes de printemps', 'Boutique'), ('🏺', 'Composition en vase', 'Décoration')],
    steps_title='Commander en trois temps', steps=[('Choisissez', 'Un bouquet ou une envie, un budget.'), ('Je compose', 'Avec les fleurs du jour.'), ('Récupérez ou recevez', 'En boutique ou livré.')],
    faq=[('Livrez-vous ?', 'Oui, dans un rayon à préciser avec la boutique.'), ('Puis-je choisir les couleurs ?', 'Oui, indiquez-les dans le message.'), ('Les fleurs tiennent combien de temps ?', 'Je joins des conseils d\'entretien.')],
    contact_title='Passez commande', contact_text='Précisez la date, l\'occasion et votre budget.', msg_label='Votre commande')

SITES['coiffeuse'] = dict(build=rdv, secteur='Coiffeuse à domicile', nom='Léa Coiffure', accent='#c0265f', soft='#fde4ee', lime='#fcd9a8', dark=('#f48fb1', '#33121f'),
    badge='Prochaine disponibilité : cette semaine', h1a='La coiffure à domicile,', h1b='sans courir ni attendre.', lede='Coupes, couleurs et soins chez vous, sur rendez-vous, avec des produits professionnels.',
    cta='Prendre rendez-vous', cta2='Voir les tarifs', second='tarifs',
    services_title='Ce que je propose', services=[('Coupe', 'Femme, homme, enfant.', ['Shampoing et coiffage', 'Environ 1 heure']), ('Couleur', 'Couleur, balayage, patine.', ['Diagnostic préalable', 'Produits sans ammoniaque']), ('Soin', 'Soin profond et brushing.', ['Selon le type de cheveux', 'Environ 45 min'])],
    tarifs_title='Des prix affichés', tarifs_text='Déplacement inclus dans un rayon de 15 km. Annulation gratuite jusqu\'à 24 h avant.',
    tarifs=[('Coupe femme', '1 h', '45 €'), ('Coupe homme', '30 min', '25 €'), ('Couleur', '2 h', '70 €'), ('Soin et brushing', '45 min', '35 €')],
    hours=[('Lundi', 'Fermé'), ('Mardi – Vendredi', '9 h – 19 h'), ('Samedi', '9 h – 17 h'), ('Dimanche', 'Fermé')], adresse='Intervention à domicile dans un rayon de 15 km.',
    faq=[('Comment réserver ?', 'Par le formulaire ou par téléphone.'), ('Que fournissez-vous ?', 'Tout le matériel et les produits.'), ('Comment payer ?', 'Carte ou espèces sur place.')])

SITES['osteopathe'] = dict(build=rdv, secteur='Ostéopathe', nom='Cabinet Bien-Être', accent='#0f766e', soft='#dcf2ee', lime='#fbbf24', dark=('#34d3bd', '#0f2b27'),
    badge='Rendez-vous sous 5 jours', h1a='Un geste précis,', h1b='pour retrouver du confort.', lede='Consultations pour adultes, enfants et sportifs. Écoute, examen complet et conseils pour la maison.',
    cta='Prendre rendez-vous', cta2='Voir les tarifs', second='tarifs',
    services_title='Les consultations', services=[('Adulte', 'Douleurs de dos, nuque, articulations.', ['Bilan complet', '45 minutes']), ('Sportif', 'Récupération et prévention.', ['Gestes adaptés au sport', '45 minutes']), ('Enfant', 'Suivi tout en douceur.', ['En présence d\'un parent', '30 minutes'])],
    tarifs_title='Tarifs de consultation', tarifs_text='Tarifs d\'exemple. Aucune promesse de guérison : la consultation est un accompagnement. Pour un symptôme inquiétant, consultez un médecin.',
    tarifs=[('Consultation adulte', '45 min', '60 €'), ('Consultation sportif', '45 min', '60 €'), ('Consultation enfant', '30 min', '50 €')],
    hours=[('Lundi – Vendredi', '9 h – 19 h'), ('Samedi', '9 h – 13 h'), ('Dimanche', 'Fermé')], adresse='12 rue Exemple, [ville] · Accès PMR · Parking à proximité.',
    faq=[('Faut-il une ordonnance ?', 'Non, mais parlez-en à votre médecin si vous avez un doute.'), ('Les séances sont-elles remboursées ?', 'Selon votre mutuelle : renseignez-vous.'), ('Que porter ?', 'Une tenue souple.')])

SITES['coach'] = dict(build=rdv, secteur='Coach sportif', nom='Move Coaching', accent='#c2410c', soft='#ffedd5', lime='#fde047', dark=('#fb923c', '#3a1d0c'),
    badge='3 places pour les cours collectifs', h1a='Bougez régulièrement,', h1b='sans vous forcer.', lede='Coaching individuel et petits groupes, à domicile, en salle ou en extérieur. Un programme adapté à votre rythme.',
    cta='Réserver une séance d\'essai', cta2='Voir les tarifs', second='tarifs',
    services_title='Les formats', services=[('Coaching individuel', 'Un programme à votre mesure.', ['Bilan de départ', 'Suivi entre les séances']), ('Petit groupe', 'Jusqu\'à 6 personnes, ambiance motivante.', ['En extérieur ou en salle', 'Tous niveaux']), ('Remise en forme', 'Reprise douce après une pause.', ['Rythme progressif', 'Conseils du quotidien'])],
    tarifs_title='Des tarifs simples', tarifs_text='Une séance d\'essai pour se rencontrer. Pour un problème de santé, avis médical conseillé avant de commencer.',
    tarifs=[('Séance individuelle', '1 h', '50 €'), ('Séance en groupe', '1 h', '15 €'), ('Pack 10 séances', 'individuel', '450 €')],
    hours=[('Lundi – Vendredi', '7 h – 20 h'), ('Samedi', '8 h – 12 h'), ('Dimanche', 'Fermé')], adresse='Séances à domicile, en salle partenaire ou au parc.',
    faq=[('Faut-il être sportif ?', 'Non, on part de votre niveau.'), ('Quel matériel ?', 'Tenue de sport, le reste est fourni.'), ('Et en cas de pluie ?', 'Séance repliée en salle ou reportée.')])

SITES['restaurant'] = dict(build=resto, secteur='Restaurant', nom='Le Petit Comptoir', accent='#b45309', soft='#fef0d7', lime='#fcd34d', dark=('#f59e0b', '#33210a'),
    badge='Ouvert ce soir dès 19 h', h1a='Une cuisine de saison,', h1b='simple et généreuse.', lede='Produits locaux, plats faits maison, ardoise qui change chaque semaine.', cta='Réserver une table', cta2='Voir la carte',
    today_title='Plat du jour', today=['Velouté de potimarron', 'Poulet fermier, purée maison', 'Tarte aux pommes'], today_price='Formule : 18 € · Plat seul : 14 €',
    carte_nav='La carte', carte_title='Ce que nous cuisinons', carte_text='Une carte courte, des produits de saison et des fournisseurs de la région.',
    menu=[('Entrées', [('Salade de chèvre chaud', 'Miel et noix', '9 €'), ('Soupe du jour', 'Pain grillé', '7 €')]), ('Plats', [('Burger du Comptoir', 'Bœuf local, frites maison', '16 €'), ('Risotto de saison', 'Légumes du marché', '15 €')]), ('Desserts', [('Mousse au chocolat', 'Maison', '6 €'), ('Crumble du moment', 'Fruits de saison', '7 €')])],
    hours=[('Lundi', 'Fermé'), ('Mardi – Vendredi', '12 h – 14 h · 19 h – 22 h'), ('Samedi', '19 h – 23 h'), ('Dimanche', '12 h – 15 h')], adresse='5 place Exemple, [ville] · Terrasse · Accès PMR.',
    cta_nav='Réserver', contact_title='Réservez votre table', contact_text='Indiquez la date, l\'heure et le nombre de couverts : confirmation sous 2 h.', msg_label='Précisions (allergies, anniversaire…)')

SITES['boulangerie'] = dict(build=resto, secteur='Boulangerie', nom='La Fournée Dorée', accent='#a16207', soft='#fef3c7', lime='#fde68a', dark=('#fbbf24', '#33260a'), reservation=False,
    badge='Pain chaud dès 7 h', h1a='Le pain du quartier,', h1b='cuit chaque matin.', lede='Pains au levain, viennoiseries pur beurre et pâtisseries, faits sur place. Commande à retirer en boutique.', cta='Commander pour demain', cta2='Voir nos produits',
    today_title='La fournée du jour', today=['Pain au levain', 'Baguette tradition', 'Croissant pur beurre'], today_price='Commande avant 17 h pour le lendemain matin',
    carte_nav='Nos produits', carte_title='Fait maison, tous les jours', carte_text='Une farine travaillée sur place, des recettes simples, du temps de fermentation.',
    menu=[('Pains', [('Baguette tradition', '', '1,30 €'), ('Pain au levain', '', '4,20 €')]), ('Viennoiseries', [('Croissant pur beurre', '', '1,40 €'), ('Pain au chocolat', '', '1,50 €')]), ('Pâtisseries', [('Éclair', 'Chocolat ou café', '3,20 €'), ('Tarte du jour', 'Part', '3,80 €')])],
    hours=[('Lundi', 'Fermé'), ('Mardi – Samedi', '7 h – 19 h 30'), ('Dimanche', '7 h – 13 h')], adresse='8 rue Exemple, [ville].',
    cta_nav='Commander', contact_title='Commandez pour demain', contact_text='Indiquez vos produits et l\'heure de retrait.', msg_label='Votre commande')

SITES['formation'] = dict(build=ebook, secteur='Formation en ligne', nom='Cuisine en 1 heure', accent='#4f46e5', soft='#e0e7ff', lime='#d9f56b', dark=('#a5b4fc', '#1c1d4a'),
    badge='E-book · PDF · accès immédiat', h1a='Préparer ses repas de la semaine', h1b='en une heure.', lede='Pour ceux qui n\'ont pas le temps de cuisiner chaque soir : une méthode simple, des listes de courses et des recettes à doubler.',
    price='12 €', cover_sub='Guide pratique', cover='Cuisine en 1 heure', auteur='Exemple fictif',
    problems_title='Ce qui vous bloque aujourd\'hui', problems=[('Pas le temps', 'Le soir, on finit par commander ou grignoter.'), ('Pas d\'idées', 'On refait toujours les mêmes plats.'), ('Du gaspillage', 'On jette des restes faute de les avoir prévus.')],
    toc=[('Chapitre 1', 'planifier sa semaine en 10 minutes'), ('Chapitre 2', 'la liste de courses qui évite les oublis'), ('Chapitre 3', 'cuisiner en lot sans s\'ennuyer'), ('Chapitre 4', 'conserver et réchauffer sans perdre le goût')],
    faq=[('Sous quelle forme le reçoit-on ?', 'En PDF, par lien de téléchargement.'), ('Convient-il aux débutants ?', 'Oui, les étapes sont expliquées.'), ('Y a-t-il des recettes ?', 'Oui, avec les quantités à doubler.')])


def build():
    meta = []
    for slug, c in SITES.items():
        out = c['build'](c)
        d = os.path.join(ROOT, 'exemples', slug)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(out)
        meta.append({'slug': slug, 'nom': c['nom'], 'secteur': c['secteur'], 'accent': c['accent']})
    with open(os.path.join(ROOT, 'exemples', 'liste.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(len(meta), 'exemples générés')


if __name__ == '__main__':
    build()
