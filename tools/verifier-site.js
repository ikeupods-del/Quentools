#!/usr/bin/env node
/* Contrôle statique du site vitrine (sans dépendance) : pages du plan du site, titres,
   descriptions, adresse canonique, images, données structurées et liens internes.
   Usage : node tools/verifier-site.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), erreurs = [];
const lire = f => fs.readFileSync(path.join(root, f), 'utf8');
const ko = (page, msg) => erreurs.push(`${page} : ${msg}`);

const plan = [...lire('sitemap.xml').matchAll(/<loc>https:\/\/quentools\.fr\/([^<]*)<\/loc>/g)].map(m => m[1]);
if (!plan.includes('')) ko('sitemap.xml', 'l’accueil manque');
if (/\/Quentools\//.test(lire('404.html'))) ko('404.html', 'chemins vers l’ancienne adresse du dépôt');
if (!/Sitemap: https:\/\/quentools\.fr\/sitemap\.xml/.test(lire('robots.txt'))) ko('robots.txt', 'adresse du plan du site absente');
if (!/Disallow: \/formation\//.test(lire('robots.txt'))) ko('robots.txt', 'la formation cachée doit être interdite (Disallow: /formation/)');
if (plan.some(p => /^formation\/|^cadeau\/carte|^espace|^admin|^mentions/.test(p))) ko('sitemap.xml', 'page privée ou cachée listée dans le plan du site');
if (!/noindex/.test(lire('formation/8gbuw1z5ua58n9/index.html'))) ko('formation/8gbuw1z5ua58n9/index.html', 'noindex absent');
{ const acc = lire('index.html'), ld = (acc.match(/<script type="application\/ld\+json" data-seo="accueil">(.*?)<\/script>/s) || [])[1];
  if (!ld) ko('index.html', 'données structurées de l’accueil absentes'); else { const g = JSON.parse(ld)['@graph'], types = g.map(x => x['@type']);
    for (const t of ['ProfessionalService', 'WebSite', 'FAQPage']) if (!types.includes(t)) ko('index.html', `données structurées : ${t} absent`);
    const offres = ((g.find(x => x['@type'] === 'ProfessionalService') || {}).hasOfferCatalog || {}).itemListElement || [];
    if (offres.map(o => o.price).join() !== '299,599,799') ko('index.html', 'les trois formules (299, 599, 799 €) doivent figurer dans les données structurées');
    const faq = g.find(x => x['@type'] === 'FAQPage'); if (!faq || faq.mainEntity.length !== 5) ko('index.html', 'la FAQ doit compter 5 questions');
    for (const q of (faq || { mainEntity: [] }).mainEntity) if (!acc.includes(q.name.replace(/&/g, '&amp;'))) ko('index.html', `question absente du contenu visible : ${q.name}`);
    for (const o of offres) if (!acc.replace(/\u00a0|\u202f/g, ' ').includes(String(o.price).replace(/(\d)(\d{3})$/, '$1 $2') + ' €')) ko('index.html', `prix de la formule ${o.name} absent du contenu visible`); } }

// Prix des options : la page templates est écrite à la main, elle doit rester alignée sur le catalogue (assets/qt-templates.js) ; pas d'option en double.
{ const w = {}; new Function('window', lire('assets/qt-templates.js'))(w); const T = w.QTT, page = lire('templates/index.html').replace(/\u00a0|\u202f/g, ' ');
  const noms = T.options.map(o => o.name.toLowerCase()); if (new Set(noms).size !== noms.length) ko('assets/qt-templates.js', 'option en double');
  for (const o of T.options) if (o.price && !page.includes(T.fmt(o.price).replace(/ €$/, ' €'))) ko('templates/index.html', `prix de l’option « ${o.name} » (${T.fmt(o.price)}) absent ou différent du catalogue`);
  for (const t of T.templates) if (!fs.existsSync(path.join(root, t.demo))) ko('assets/qt-templates.js', `démonstration introuvable : ${t.demo}`); }
const titres = new Set(), descriptions = new Set();
const pages = new Set([...plan.map(p => p + 'index.html'), 'index.html', 'devis/index.html', 'realisations/index.html', 'exemples/index.html']);
for (const p of pages) {
  if (!fs.existsSync(path.join(root, p))) { ko(p, 'fichier introuvable'); continue; }
  const h = lire(p), dir = path.dirname(p);
  if (/ikeupods-del\.github\.io\/Quentools/i.test(h) && !p.startsWith('wouf')) ko(p, 'ancienne adresse du site');
  if (!/<html lang="fr"/.test(h)) ko(p, 'langue absente');
  if (!/<title>[^<]{10,}<\/title>/.test(h)) ko(p, 'titre absent ou trop court');
  { const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '', d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    if (t.length < 50 || t.length > 60) ko(p, `titre de ${t.length} caractères (50 à 60 attendus)`);
    if (d.length < 140 || d.length > 155) ko(p, `description de ${d.length} caractères (140 à 155 attendus)`);
    if (titres.has(t)) ko(p, 'titre déjà utilisé par une autre page'); titres.add(t);
    if (descriptions.has(d)) ko(p, 'description déjà utilisée par une autre page'); descriptions.add(d);
    if (/\b(IA|intelligence artificielle)\b/i.test(t + d) && !/^(gourmet|infikit|freelance|outils)/.test(p)) ko(p, 'mention de l’IA dans le titre ou la description'); }
  for (const b of ['og:title', 'og:description', 'og:url', 'og:image', 'og:locale', 'twitter:card', 'twitter:image']) if (!new RegExp(`<meta (?:property|name)="${b}"`).test(h)) ko(p, `balise ${b} absente`);
  if (!/og:url" content="https:\/\/quentools\.fr\//.test(h) || (h.match(/og:url" content="([^"]*)"/) || [])[1] !== (h.match(/rel="canonical" href="([^"]*)"/) || [])[1]) ko(p, 'og:url différent de l’adresse canonique');
  if (!/<meta name="viewport"/.test(h)) ko(p, 'viewport absent');
  if (!/rel="icon"/.test(h)) ko(p, 'icône absente');
  if (p && !/mentions-legales\//.test(h) && !/^(infikit|freelance|gourmet)\//.test(p)) ko(p, 'lien vers les mentions légales absent');
  if (!/<meta name="description" content="[^"]{50,}/.test(h)) ko(p, 'description absente ou trop courte');
  if (!/<link rel="canonical" href="https:\/\/quentools\.fr\//.test(h)) ko(p, 'adresse canonique absente');
  if (!/^(infikit|freelance|gourmet)\//.test(p) && (h.match(/<h1[\s>]/g) || []).length !== 1) ko(p, 'il faut exactement un titre h1');   // les applications affichent leurs titres dynamiquement
  for (const img of h.match(/<img\b[^>]*>/g) || []) if (!/\balt=/.test(img)) ko(p, 'image sans texte alternatif');
  for (const m of h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) { try { JSON.parse(m[1]); } catch (e) { ko(p, 'données structurées invalides'); } }
  for (const [, href] of h.matchAll(/(?<![:@\w-])(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
    if (/^(https?:|mailto:|tel:|data:|\/\/|javascript:)/.test(href) || href.includes('${')) continue;
    const cible = path.normalize(path.join(root, href.startsWith('/') ? href : path.join(dir, href)));
    if (!fs.existsSync(cible) && !fs.existsSync(path.join(cible, 'index.html'))) ko(p, `lien cassé : ${href}`);
  }
}
if (erreurs.length) { console.error('✗ Site vitrine :\n - ' + erreurs.join('\n - ')); process.exit(1); }
console.log(`✓ Site vitrine : ${pages.size} pages contrôlées, aucune erreur.`);
