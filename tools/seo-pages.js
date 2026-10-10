#!/usr/bin/env node
/* Référencement du site vitrine : balises de chaque page (titre, description, adresse canonique, Open Graph, Twitter Card, icônes),
   accueil (section « Pour qui ? », formules, questions fréquentes + données structurées), pages « site internet par métier »,
   pied de page commun (mentions légales, contact, métiers), images WebP, plan du site et robots.txt.
   Idempotent : on peut le relancer à volonté. Ensuite : node tools/seo-site.js (fil d'Ariane) puis node tools/verifier-site.js.
   Usage : node tools/seo-pages.js */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), base = 'https://quentools.fr/', mail = 'contact.quentools@gmail.com';
const INSTAGRAM = '';   // adresse du compte Instagram de QuenTools (https://www.instagram.com/…), ajoutée aux profils de l'entreprise si renseignée
const OG = 'assets/og-creation-site-internet-artisan.jpg', OG_ALT = 'QuenTools : création de site internet pour artisans, site vitrine clé en main dès 299 €';
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8'), ecrire = (f, s) => { fs.mkdirSync(path.dirname(path.join(racine, f)), { recursive: true }); fs.writeFileSync(path.join(racine, f), s); };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const w = {}; new Function('window', lire('assets/qt-templates.js'))(w); const T = w.QTT, opt = id => T.options.find(o => o.id === id);
const metiers = require('./seo-metiers.js');
const erreurs = [];

/* ---------- Titres et descriptions (title 50-60 caractères, description 140-155) ---------- */
const PAGES = {
  '': ['Création de site internet pour artisans | QuenTools', 'Création de site internet pour artisans : site vitrine clé en main dès 299 €, refonte de site, prix fixé d’avance. Devis gratuit sous 48 h, sans engagement'],
  'devis/': ['Devis gratuit pour site internet d’artisan | QuenTools', 'Demandez un devis gratuit pour votre site vitrine artisan, un site web clé en main ou une refonte de site. Réponse sous 48 h, prix fixé d’avance.'],
  'templates/': ['Site web clé en main dès 299 € pour artisans | QuenTools', 'Modèles de site web clé en main par métier dès 299 € : site vitrine artisan à votre marque, nom de domaine offert, 3 mois d’assistance offerts.'],
  'audit/': ['Audit de sécurité de site web express, 100 € | QuenTools', 'Audit de sécurité express de votre site internet : HTTPS, cookies, formulaires, fichiers exposés. Rapport PDF sous 48 h, 100 €, avec votre accord écrit.'],
  'conseils/': ['Conseils pour le site internet d’un artisan | QuenTools', 'Conseils simples pour artisans et indépendants : site vitrine sur téléphone, fiche Google, nom de domaine, mentions légales, refonte de site, sécurité.'],
  'realisations/': ['Réalisations : sites web et outils sur mesure | QuenTools', 'Réalisations QuenTools : site vitrine, site web clé en main, outils sur mesure et applications. Le problème, la solution et le résultat de chaque projet.'],
  'outils/': ['Outils gratuits pour artisans et indépendants | QuenTools', 'Outils gratuits en ligne : Infikit, Freelance Kit, Gourmet AI, Wouf, carnet d’entretien auto. Sur téléphone et ordinateur, sans inscription obligatoire.'],
  'exemples/': ['Exemples de sites vitrines pour artisans | QuenTools', 'Treize exemples de site vitrine pour artisans, commerçants et indépendants : plombier, fleuriste, restaurant… Voyez votre site avant de vous lancer.'],
  'cadeau/': ['Carte cadeau création de site internet | QuenTools', 'Offrez une carte cadeau QuenTools : un site vitrine, un site web clé en main ou un coup de pouce numérique. Montant au choix, valable un an.'],
  'infikit/': ['Infikit : l’appli gratuite des infirmières | QuenTools', 'Infikit, l’application gratuite des infirmières à domicile : tournée, fiches patients, ordonnances, cotations et compta. Sur téléphone, sans installation.'],
  'freelance/': ['Freelance Kit : calculateur de TJM et devis | QuenTools', 'Calculateur de TJM et générateur de devis pour freelances : votre tarif journalier, vos charges et un devis prêt à envoyer. Gratuit, sur téléphone et PC.'],
  'gourmet/': ['Gourmet AI : recettes, menu et liste de courses | QuenTools', 'Gourmet AI : des recettes du monde entier, cuisiner avec ce qu’on a, menu de la semaine, liste de courses et budget. Gratuit, sur téléphone et ordinateur.'],
  'outils/carnet-entretien/': ['Carnet d’entretien auto gratuit en ligne | QuenTools', 'Carnet d’entretien auto gratuit : vidanges, pneus, freins, contrôle technique, alertes en km ou en mois, coûts. Sans inscription, données chez vous.'],
  'outils/revisions/': ['Aide à la révision gratuite pour étudiants | QuenTools', 'Aide à la révision gratuite : fiches à répétition espacée, planning d’examens, minuteur, moyennes. Sans inscription ni pub, données sur votre appareil.'],
  'creation-site/': ['Site internet par métier pour artisans | QuenTools', 'Création de site internet artisan par métier : plombier, électricien, menuisier, coiffeur, paysagiste, restaurant… Site vitrine clé en main, devis gratuit.'],
  'creation-site/paysagiste/': ['Site vitrine pour paysagiste, création de site | QuenTools', 'Site vitrine pour paysagiste : galerie de jardins, services, zone d’intervention et devis en ligne. Site web clé en main ou refonte de site, devis gratuit.'],
  'creation-site/photographe/': ['Site vitrine pour photographe : portfolio | QuenTools', 'Site vitrine pour photographe : portfolio soigné, tarifs, réservation de séances et contact. Site web clé en main ou refonte de site. Devis gratuit.'],
  'creation-site/fleuriste/': ['Site vitrine pour fleuriste, création de site | QuenTools', 'Site vitrine pour fleuriste : bouquets, abonnements, horaires et commande en ligne. Site web clé en main ou refonte de site, prix fixé. Devis gratuit.'],
  'creation-site/osteopathe/': ['Site vitrine pour ostéopathe, création de site | QuenTools', 'Site vitrine pour ostéopathe : présentation du cabinet, déroulé de séance, tarifs et rendez-vous. Site web clé en main ou refonte de site. Devis gratuit.'],
  'creation-site/coach/': ['Site vitrine pour coach sportif en ligne | QuenTools', 'Site vitrine pour coach sportif : programmes, planning des séances, tarifs et contact. Site web clé en main ou refonte de site, prix fixé. Devis gratuit.'],
  'creation-site/restaurant/': ['Site vitrine pour restaurant, création de site | QuenTools', 'Site vitrine pour restaurant : carte, horaires, ambiance et réservation de table. Site web clé en main ou refonte de site, prix fixé. Devis gratuit.'],
  'creation-site/formation/': ['Page de vente pour formation, création de site | QuenTools', 'Page de vente pour formateur : promesse claire, bénéfices concrets, aperçu du contenu, présentation de l’auteur. Site web clé en main, devis gratuit.'],
  'creation-site/climatisation/': ['Site vitrine climatisation, création de site | QuenTools', 'Site vitrine pour installateur de climatisation : installation, entretien, dépannage, devis en ligne. Site web clé en main, refonte de site. Devis gratuit.']
};
for (const m of metiers) PAGES[m.slug + '/'] = [m.t, m.d];
const PRIVE = { 'mentions-legales/': 'noindex', 'espace/': 'noindex', 'cadeau/carte/': 'noindex', 'formation/8gbuw1z5ua58n9/': 'noindex' };   // pages sans Open Graph

/* ---------- Balises de tête ---------- */
const prefixe = p => '../'.repeat(p.split('/').filter(Boolean).length);
function tete(p, h) {
  const pre = prefixe(p), pr = PAGES[p]; if (!pr) return h;
  const [t, d] = pr, url = base + p;
  if (t.length < 50 || t.length > 60) erreurs.push(`${p || 'accueil'} : titre de ${t.length} caractères (${t})`);
  if (d.length < 140 || d.length > 155) erreurs.push(`${p || 'accueil'} : description de ${d.length} caractères`);
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(t)}</title>`);
  h = h.replace(/\s*<meta name="description"[^>]*>/, '').replace(/\s*<link rel="canonical"[^>]*>/, '').replace(/\s*<meta (?:property="og:|name="twitter:)[^>]*>/g, '')
    .replace(/\s*<meta data-seo="tete">/g, '');   // ancien marqueur
  const icones = p !== 'infikit/';   // Infikit garde ses propres icônes d'application
  if (icones) h = h.replace(/\s*<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, '');
  const img = base + OG;
  const lignes = [`<meta name="description" content="${esc(d)}">`, `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="QuenTools">`, `<meta property="og:locale" content="fr_FR">`, `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${esc(t)}">`, `<meta property="og:description" content="${esc(d)}">`, `<meta property="og:image" content="${img}">`,
    `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`, `<meta property="og:image:alt" content="${esc(OG_ALT)}">`,
    `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(t)}">`, `<meta name="twitter:description" content="${esc(d)}">`, `<meta name="twitter:image" content="${img}">`]
    .concat(icones ? [`<link rel="icon" href="${pre}assets/logo.svg" type="image/svg+xml">`, `<link rel="icon" href="${pre}assets/favicon-32x32.png" type="image/png" sizes="32x32">`, `<link rel="icon" href="${pre}favicon.ico" sizes="48x48">`,
    `<link rel="apple-touch-icon" href="${pre}assets/apple-touch-icon.png">`] : []);
  return h.replace('</title>', '</title>\n' + lignes.join('\n'));
}

/* ---------- Pied de page commun ---------- */
const lienMetiers = pre => 'Sites par métier : ' + metiers.map(m => `<a href="${pre}${m.slug}/">${m.nom}</a>`).join(' · ') + ` · <a href="${pre}creation-site/">Tous les métiers</a>`;
function pied(p, h) {
  const pre = prefixe(p) || '';
  const liens = `<a href="${pre || './'}">Accueil</a> · <a href="${pre}creation-site/">Site internet artisan</a> · <a href="${pre}templates/">Site clé en main</a> · <a href="${pre}devis/">Devis</a> · <a href="${pre}realisations/">Réalisations</a> · <a href="${pre}conseils/">Conseils</a> · <a href="${pre}mentions-legales/">Mentions légales</a> · <a href="${pre}politique-confidentialite.html">Confidentialité</a> · <a href="mailto:${mail}">Contact</a>`;
  const metiersP = `<p data-seo="pied-metiers" class="muted" style="margin:var(--s-4) 0 0;font-size:var(--t-sm)">${lienMetiers(pre)}</p>`;
  h = h.replace(/\s*<p data-seo="pied-metiers"[^>]*>.*?<\/p>/s, '').replace(/(<a href="[^"]*mentions-legales\/")\s+rel="nofollow"/g, '$1');
  if (/<div class="footer-bottom"/.test(h) && !/footer-grid/.test(h)) {
    h = h.replace(/(<span>© <span data-year>\d+<\/span> QuenTools\.?<\/span>)<span(?: data-seo="pied")?>.*?<\/span>(\s*<\/div>)(<\/div>)(<\/footer>)/s, `$1<span data-seo="pied">${liens}</span>$2${metiersP}$3$4`);
    h = h.replace(/(<span data-seo="pied">.*?<\/span>)/s, `<span data-seo="pied">${liens}</span>`);
  } else if (/footer-grid/.test(h)) {
    h = h.replace(/(<\/div>\s*<div class="footer-bottom">)/, `${metiersP}\n    $1`);
    h = h.replace(/<li><a href="mentions-legales\/">Mentions légales et confidentialité<\/a><\/li>(?!<li><a href="mailto)/, `<li><a href="mentions-legales/">Mentions légales et confidentialité</a></li><li><a href="politique-confidentialite.html">Confidentialité</a></li><li><a href="mailto:${mail}">Contact</a></li>`);
  } else if (/<footer class="foot"><div class="wrap">/.test(h) && !/mentions-legales/.test(h)) {
    h = h.replace(/(<footer class="foot"><div class="wrap">.*?)(<\/div><\/footer>)/s, `$1 · <a href="${base}mentions-legales/">Mentions légales</a>$2`);
  }
  return h;
}

/* ---------- Images : WebP avec repli JPEG ---------- */
function images(p, h) {
  const dir = path.join(racine, path.dirname(p === '' ? 'index.html' : p + 'index.html'));
  return h.replace(/(?<!type="image\/webp">)<img\b([^>]*?)\bsrc="([^"?]+)\.jpg"([^>]*)>/g, (m, a, src, b) => {
    if (!fs.existsSync(path.join(dir, src + '.webp'))) return m;
    return `<picture><source srcset="${src}.webp" type="image/webp"><img${a}src="${src}.jpg"${b}></picture>`;
  });
}

/* ---------- Accueil : Pour qui ?, formules, questions fréquentes ---------- */
const COURT = { 'site-internet-plombier': 'Dépannage, chauffage, zones d’intervention et bouton d’appel.', 'site-internet-electricien': 'Dépannage, mise aux normes, qualifications et devis en ligne.', 'site-internet-menuisier': 'Une galerie de réalisations et une demande de devis guidée.',
  'site-internet-macon': 'Chantiers avant et après, spécialités et secteur desservi.', 'site-internet-coiffeur': 'Tarifs affichés, ambiance du salon et réservation en ligne.', 'site-internet-couvreur': 'Toiture, zinguerie, garanties expliquées et contact immédiat.', 'site-internet-peintre-batiment': 'Avant et après, méthode de travail et estimation en ligne.' };
const FORMULES = [
  { id: 'cle-en-main', nom: 'Clé en main', prix: 299, dès: true, texte: 'Un site vitrine pensé pour votre métier, personnalisé à votre marque (nom, couleurs, textes, photos). Nom de domaine offert la première année, 3 mois d’assistance offerts.' },
  { id: 'sur-mesure', nom: 'Sur mesure', prix: 599, texte: 'Un site conçu avec vous pour votre activité : structure, pages et textes adaptés, formulaire de devis, mise en ligne sur votre nom. Paiement unique.' },
  { id: 'complet', nom: 'Complet', prix: 799, texte: 'Le sur mesure avec, en plus, la prise de rendez-vous en ligne, le référencement local de base et un pack de visuels pour vos réseaux sociaux. Paiement unique.' }
];
const FAQ = [
  ['Combien coûte la création d’un site internet pour un artisan ?', `Trois formules à paiement unique : ${FORMULES.map(f => `${f.nom} ${f.prix} €`).join(', ')}. Le prix est fixé dans le devis avant de commencer, sans frais cachés. TVA non applicable, article 293 B du CGI.`],
  ['Quel est le délai pour avoir mon site en ligne ?', 'Vous recevez votre devis sous 48 h. Une première version vous est montrée avant la suite, puis la mise en ligne se fait en quelques semaines, selon la formule et la rapidité de vos retours (textes, photos).'],
  ['Y a-t-il un abonnement à payer ?', `Non, le site se paie une seule fois. L’assistance est offerte pendant 3 mois. Ensuite, un suivi mensuel est possible (${T.fmt(opt('suivi').price)} par mois : hébergement, sauvegardes, mises à jour et modifications simples), mais il reste facultatif.`],
  ['Puis-je modifier mon site après sa mise en ligne ?', `Oui. Une série de retouches et une notice d’utilisation sont comprises, et pendant les 3 mois d’assistance les modifications simples (textes, prix, horaires, photos) sont faites sous 48 h ouvrées. Les modifications importantes ou nouvelles fonctions se chiffrent à partir de ${T.fmt(opt('modifs').price)}.`],
  ['Qui s’occupe de l’hébergement et du nom de domaine ?', 'Nous mettons le site en ligne sur votre propre nom de domaine, offert la première année (renouvellement ensuite au prix du fournisseur). L’hébergement et les sauvegardes sont assurés pendant les 3 mois d’assistance, puis dans le suivi mensuel si vous le souhaitez.']
];
const section = (nom, html) => `<!--seo:${nom}-->${html}<!--/seo:${nom}-->`;
const reMarq = nom => new RegExp(`\\s*<!--seo:${nom}-->.*?<!--/seo:${nom}-->`, 's');
function accueil(h) {
  const cartes = [...metiers.map(m => [m.slug + '/', m.nom, COURT[m.slug]]), ['creation-site/paysagiste/', 'Paysagiste', 'Galerie de jardins, services et devis en ligne.']]
    .map(([u, n, t], i) => `<article class="card is-link reveal"${i % 3 ? ` style="--i:${i % 3}"` : ''}><h3 style="margin-top:0">Site internet pour ${n.toLowerCase()}</h3><p class="muted">${t}</p><a class="more" href="${u}">Voir le site pour ${n.toLowerCase()} →</a></article>`).join('\n        ');
  const pourqui = section('pourqui', `
  <section class="section" id="pour-qui" style="padding-top:clamp(24px,4vw,48px)">
    <div class="wrap">
      <div class="section-head split">
        <div><span class="eyebrow reveal">Pour qui ?</span><h2 class="h-section reveal" style="--i:1">Un site vitrine pour artisans, commerçants et indépendants.</h2></div>
        <p class="lede reveal" style="--i:2">Plombiers, électriciens, menuisiers, maçons, coiffeurs… chaque métier a ses attentes. Choisissez le vôtre pour voir ce que doit contenir votre site.</p>
      </div>
      <div class="grid grid-3">
        ${cartes}
      </div>
      <p class="note reveal"><a href="creation-site/">Voir tous les métiers : création de site internet par activité</a> · <a href="exemples/">exemples de sites vitrines</a></p>
    </div>
  </section>`);
  const ligne = (f, i) => `<article class="${i === 0 ? 'is-main ' : ''}reveal"${i ? ` style="--i:${i}"` : ''}><h3>${f.nom}</h3><div class="pr">${f.dès ? '<small>dès </small>' : ''}<span${f.dès ? ' data-tpl="base"' : ''}>${T.fmt(f.prix)}</span></div><p>${f.texte}</p><a href="${i === 0 ? 'templates/' : 'devis/?type=Site%20vitrine'}">${i === 0 ? 'Voir les modèles de sites →' : 'Demander un devis →'}</a></article>`;
  const formules = section('formules', '\n        ' + FORMULES.map(ligne).join('\n        '));
  const faq = section('faq', `
  <section class="section" id="questions" style="padding-top:0">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow reveal">Questions fréquentes</span><h2 class="h-section reveal" style="--i:1">Création de site internet : vos questions, nos réponses.</h2></div>
      <div class="faq reveal">${FAQ.map(([q, r]) => `<details><summary>${esc(q)}</summary><p>${esc(r)}</p></details>`).join('')}</div>
    </div>
  </section>`);
  h = h.replace(reMarq('pourqui'), '').replace(reMarq('faq'), '');
  h = h.replace(/(\n\s*<section class="section" id="services")/, (m, a) => pourqui + a);
  h = reMarq('formules').test(h) ? h.replace(reMarq('formules'), () => formules) : h.replace(/\n\s*<article class="is-main reveal"><h3>Site prêt à l’emploi<\/h3>.*?<\/article>/s, () => formules);
  h = h.replace(/(\n\s*<section class="section" id="sur-mesure")/, (m, a) => faq + a);
  /* h1 : mot-clé principal ; les mots restent animés un à un */
  h = h.replace(/<h1 class="display reveal" style="--i:1">.*?<\/h1>/s, () => {
    const mots = [['Création', 0], ['de', 1], ['site', 2], ['internet', 3], ['pour', 4], ['artisans,', 5]], em = [['clé', 6], ['en', 7], ['main', 8]];
    return '<h1 class="display reveal" style="--i:1">' + mots.map(([m, k]) => `<span class="m" style="--k:${k}">${m}</span>`).join(' ') + ' <em>' + em.map(([m, k]) => `<span class="m" style="--k:${k}">${m}</span>`).join(' ') + '</em></h1>';
  });
  /* données structurées de l'entreprise, du site et des formules */
  const org = { '@type': 'ProfessionalService', '@id': base + '#organisation', name: 'QuenTools', url: base, logo: base + 'assets/icon-512.png', image: base + OG, email: mail,
    description: 'Agence de communication digitale : création de site internet pour artisans et indépendants, site vitrine clé en main, refonte de site, boutiques, réseaux sociaux et outils sur mesure.',
    areaServed: { '@type': 'Country', name: 'France' }, knowsLanguage: 'fr', slogan: 'Création de site internet pour artisans',
    serviceType: ['Création de site internet pour artisans', 'Site vitrine clé en main', 'Refonte de site', 'Boutique en ligne Shopify', 'Contenus pour les réseaux sociaux', 'Outil sur mesure', 'Audit de sécurité de site web'],
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: mail, availableLanguage: 'French', url: base + 'devis/' },
    sameAs: ['https://www.tiktok.com/@quentools'].concat(INSTAGRAM ? [INSTAGRAM] : []),
    hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Formules de création de site internet', itemListElement: FORMULES.map(f => ({ '@type': 'Offer', name: f.nom, description: f.texte, price: String(f.prix), priceCurrency: 'EUR', url: base + '#tarifs', availability: 'https://schema.org/InStock',
      itemOffered: { '@type': 'Service', name: 'Site web ' + f.nom.toLowerCase(), provider: { '@id': base + '#organisation' } } })) } };
  const site = { '@type': 'WebSite', '@id': base + '#site', url: base, name: 'QuenTools', inLanguage: 'fr-FR', publisher: { '@id': base + '#organisation' } };
  const faqLd = { '@type': 'FAQPage', '@id': base + '#faq', inLanguage: 'fr-FR', mainEntity: FAQ.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) };
  const ld = `<script type="application/ld+json" data-seo="accueil">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, site, faqLd] })}</script>`;
  h = h.replace(/<script type="application\/ld\+json"(?: data-seo="accueil")?>\{"@context":"https:\/\/schema\.org","@graph":.*?<\/script>/s, ld);
  return h;
}

/* ---------- Pages par métier ---------- */
function pageMetier(m) {
  const url = base + m.slug + '/', pre = '../', [t, d] = PAGES[m.slug + '/'];
  const h1 = esc(m.h1).replace(/\*(.+?)\*/, '<em>$1</em>');
  const autres = metiers.filter(x => x.slug !== m.slug).map(x => `<a href="../${x.slug}/">${x.nom}</a>`).join(' · ');
  const bloc = m.img ? `
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <article class="card is-link reveal">
        <div class="card-media"><img src="../assets/${m.img}.jpg" alt="${esc(m.alt)}" loading="lazy" width="1280" height="800"></div>
        <h3>Un exemple pour vous donner une idée</h3>
        <p class="muted">Ce site est un exemple fictif : textes, prix et visuels sont des illustrations. Sur votre site, tout est remplacé par votre activité, vos photos et vos vrais tarifs.</p>
        <a class="more" href="../${m.exemple}">Voir l’exemple de site vitrine →</a>
      </article>
    </div>
  </section>` : `
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <p class="muted reveal">Pour vous faire une idée avant de demander un devis, parcourez nos <a href="../exemples/">exemples de sites vitrines par métier</a> et nos <a href="../templates/">modèles de sites clé en main</a>. Ce sont des démonstrations fictives : sur votre site, tout est remplacé par votre activité, vos photos et vos vrais tarifs.</p>
    </div>
  </section>`;
  const nom = m.nom.toLowerCase();
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t)}</title>
<link rel="preload" href="../assets/fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/qt.css?v=20261001h">
<link rel="preload" href="../assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="nav"><div class="wrap">
  <a class="brand" href="../" aria-label="QuenTools, accueil"><img class="brand-mark" src="../assets/logo.svg" alt="" width="32" height="32">QuenTools</a>
  <ul class="nav-links"><li><a href="../creation-site/">Sites par métier</a></li><li><a href="../#tarifs">Offres et tarifs</a></li><li><a href="../realisations/">Réalisations</a></li><li><a href="../exemples/">Exemples</a></li><li><a href="../decodeur-courrier.html">Paperdecrypt</a></li></ul>
  <span class="nav-actions"><a class="nav-espace" href="../espace/" aria-label="Espace client"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span>Espace client</span></a><a class="btn btn-sm btn-accent" href="../devis/"><span class="lg">Demander un </span><span class="w">devis</span></a></span>
</div></header>

<main id="contenu">
  <section class="hero" style="padding-bottom:var(--s-6)">
    <div class="bg-grid" aria-hidden="true"></div>
    <div class="wrap">
      <span class="eyebrow reveal">Création de site internet pour ${nom}</span>
      <h1 class="display reveal" style="--i:1;max-width:20ch">${h1}</h1>
      <p class="lede reveal" style="--i:2">${esc(m.lede)}</p>
      <div class="hero-cta reveal" style="--i:3;margin-top:var(--s-5)"><a class="btn btn-accent" href="../devis/?type=Site%20vitrine">Demander un devis gratuit</a><a class="btn btn-ghost" href="../templates/">Voir les sites clé en main dès ${T.fmt(299)}</a></div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap"><div style="max-width:820px">
      <h2 class="h-section reveal" style="max-width:none">Ce que cherchent vos clients</h2>
      <p class="reveal">${esc(m.cherchent)}</p>
    </div></div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow reveal">Votre site vitrine</span><h2 class="h-section reveal" style="--i:1">Ce que votre site doit contenir.</h2></div>
      <div class="grid grid-2">${m.items.map(([a, b], i) => `<article class="card reveal"${i % 2 ? ' style="--i:1"' : ''}><h3 style="margin-top:0">${esc(a)}</h3><p class="muted">${esc(b)}</p></article>`).join('')}</div>
    </div>
  </section>
${bloc}

  <section class="section" style="padding-top:0">
    <div class="wrap"><div style="max-width:820px">
      <h2 class="h-section reveal" style="max-width:none">Un site clé en main, à votre nom</h2>
      <p class="reveal">${esc(m.conclusion)}</p>
    </div></div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="cta-band reveal">
        <span class="big-q" aria-hidden="true">Q</span>
        <span class="eyebrow" style="color:var(--lime)">Votre projet</span>
        <h2 style="margin:var(--s-4) 0">Parlons de votre site de ${nom}.</h2>
        <p>Devis gratuit, sans engagement. Décrivez votre activité en deux minutes.</p>
        <a class="btn btn-lime" href="../devis/?type=Site%20vitrine" style="margin-top:var(--s-5)">Demander un devis gratuit</a>
      </div>
      <p class="muted" style="margin-top:var(--s-5);font-size:var(--t-sm)">Autres métiers : ${autres} · <a href="../creation-site/paysagiste/">Paysagiste</a> · <a href="../creation-site/">Tous les métiers</a></p>
    </div>
  </section>
</main>

<footer class="footer"><div class="wrap"><div class="footer-bottom" style="margin-top:0;border-top:0;padding-top:0">
  <span>© <span data-year>2026</span> QuenTools</span><span></span>
</div></div></footer>
<script src="../assets/qt.js?v=20261001h" defer></script>
</body>
</html>
`;
}

/* ---------- Versions WebP des images (ImageMagick requis ; une image JPEG modifiée est reconvertie) ---------- */
{ const { execFileSync } = require('child_process'), dossier = path.join(racine, 'assets');
  for (const j of fs.readdirSync(dossier).filter(x => /\.jpg$/.test(x) && !/^(partage|og-)/.test(x))) {
    const src = path.join(dossier, j), dst = src.replace(/\.jpg$/, '.webp');
    if (!fs.existsSync(dst) || fs.statSync(dst).mtimeMs < fs.statSync(src).mtimeMs) { try { execFileSync('convert', [src, '-quality', '80', dst]); } catch (e) { erreurs.push('WebP non généré pour ' + j + ' (ImageMagick absent ?)'); break; } } } }

/* ---------- Écriture ---------- */
let n = 0;
for (const m of metiers) {
  const f = m.slug + '/index.html';
  ecrire(f, pageMetier(m));
}
const aTraiter = Object.keys(PAGES).concat(Object.keys(PRIVE));
for (const p of aTraiter) {
  const f = p + 'index.html'; if (!fs.existsSync(path.join(racine, f))) { erreurs.push(`${f} introuvable`); continue; }
  let h = lire(f);
  if (PAGES[p]) h = tete(p, h);
  if (p === '') h = accueil(h);
  h = pied(p, h); h = images(p, h);
  ecrire(f, h); n++;
}
/* Pages sans balises de partage : formation cachée et pages privées */
{ const f = 'formation/8gbuw1z5ua58n9/index.html'; let h = lire(f); h = h.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex,nofollow,noarchive">'); ecrire(f, h); }

/* Anciennes adresses : /creation-site/plombier/ renvoie vers la page du métier à la racine */
{ const [t, d] = PAGES['site-internet-plombier/'], u = base + 'site-internet-plombier/';
  ecrire('creation-site/plombier/index.html', `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t)}</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${u}">
<meta http-equiv="refresh" content="0;url=${u}">
<link rel="icon" href="../../assets/logo.svg" type="image/svg+xml">
</head>
<body>
<p>Cette page a déménagé : <a href="../../site-internet-plombier/">site internet pour plombier</a>.</p>
</body>
</html>
`); }
/* Liens « Autres métiers » : ancienne adresse du plombier remplacée */
for (const p of Object.keys(PAGES).filter(x => x.startsWith('creation-site/') && x !== 'creation-site/plombier/')) {
  const f = p + 'index.html'; let h = lire(f);
  h = h.replace(/href="\.\.\/plombier\/"/g, 'href="../../site-internet-plombier/"');
  ecrire(f, h);
}
{ const f = 'creation-site/index.html'; let h = lire(f);
  h = h.replace('href="plombier/"', 'href="../site-internet-plombier/"');
  h = h.replace(/\s*<section class="section" data-seo="metiers".*?<\/section>/s, '');
  const liste = metiers.map(m => `<li><a href="../${m.slug}/">Site internet pour ${m.nom.toLowerCase()}</a> : ${COURT[m.slug].replace(/\.$/, '')}.</li>`).join('');
  h = h.replace('</main>', `  <section class="section" data-seo="metiers" style="padding-top:0"><div class="wrap"><div style="max-width:820px"><h2 class="h-section reveal" style="max-width:none">Création de site internet pour artisans</h2><p class="muted reveal">Le bâtiment, la coiffure et l’artisanat ont chacun leurs besoins. Voici nos pages dédiées, avec ce que votre site vitrine doit contenir et un devis gratuit.</p><ul class="reveal" style="padding-left:1.2em;display:grid;gap:8px">${liste}</ul></div></div></section>\n</main>`);
  ecrire(f, h); }
{ /* accueil et pages à image : plombier du bloc exemples → nouvelle adresse */
  for (const f of ['exemples/index.html', 'exemples/plombier/index.html']) if (fs.existsSync(path.join(racine, f))) { const h = lire(f); if (/creation-site\/plombier/.test(h)) ecrire(f, h.replace(/creation-site\/plombier\//g, 'site-internet-plombier/')); } }

/* ---------- Plan du site et robots.txt ---------- */
const prio = p => p === '' ? '1.0' : p === 'devis/' ? '0.9' : /^(templates|realisations)\/$/.test(p) ? '0.8' : /^site-internet-|^creation-site\//.test(p) ? '0.7' : /^(audit|cadeau|outils)\/$/.test(p) ? '0.7' : '0.6';
const jour = new Date().toISOString().slice(0, 10);
const publiques = Object.keys(PAGES).filter(p => p !== 'creation-site/plombier/');
ecrire('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publiques.map(p => `  <url><loc>${base}${p}</loc><lastmod>${jour}</lastmod><priority>${prio(p)}</priority></url>`).join('\n')}\n</urlset>\n`);
ecrire('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /demo/\nDisallow: /espace/\nDisallow: /formation/\nDisallow: /cadeau/carte/\n\nSitemap: ${base}sitemap.xml\n`);

console.log(`SEO : ${n} pages mises à jour, ${metiers.length} pages par métier, ${publiques.length} adresses dans le plan du site.`);
if (erreurs.length) { console.error('À corriger :\n - ' + erreurs.join('\n - ')); process.exit(1); }
