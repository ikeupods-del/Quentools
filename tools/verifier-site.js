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

const pages = new Set([...plan.map(p => p + 'index.html'), 'index.html', 'devis/index.html', 'realisations/index.html', 'exemples/index.html']);
for (const p of pages) {
  if (!fs.existsSync(path.join(root, p))) { ko(p, 'fichier introuvable'); continue; }
  const h = lire(p), dir = path.dirname(p);
  if (/ikeupods-del\.github\.io\/Quentools/i.test(h) && !p.startsWith('wouf')) ko(p, 'ancienne adresse du site');
  if (!/<html lang="fr"/.test(h)) ko(p, 'langue absente');
  if (!/<title>[^<]{10,}<\/title>/.test(h)) ko(p, 'titre absent ou trop court');
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
