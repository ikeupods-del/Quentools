// Studio Sites : assemble les fichiers d'un site à enregistrer ou à publier (index, mentions légales, polices et styles utilisés, fonctions, robots.txt).
// Fonction pure (lit seulement le dossier des modèles) : utilisée par l'enregistrement sur le disque et par la publication GitHub.
'use strict';
const fs = require('fs');
const path = require('path');

// fichiers de fonctions acceptés (chemins relatifs sûrs uniquement)
const AUTORISES = new Set(['admin/index.html', 'REGLES-FIRESTORE.txt', 'LISEZMOI-FIREBASE.txt']);
// jamais publiés sur un dépôt : notes internes de livraison, règles et mode d'emploi Firebase
const LOCAUX = new Set(['LISEZMOI-LIVRAISON.txt', 'REGLES-FIRESTORE.txt', 'LISEZMOI-FIREBASE.txt']);

const nomDossier = s => String(s || 'site').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'site';

// site : { index, legal, notes, fichiers: [{ chemin, contenu }] } → [{ chemin, contenu: Buffer, local }]
function composerSite(site, modeles) {
  const out = [], ajoute = (chemin, contenu, local) => out.push({ chemin, contenu: Buffer.isBuffer(contenu) ? contenu : Buffer.from(String(contenu == null ? '' : contenu), 'utf8'), local: !!local || LOCAUX.has(chemin) });
  const s = site || {};
  ajoute('index.html', s.index); ajoute('mentions-legales.html', s.legal); ajoute('LISEZMOI-LIVRAISON.txt', s.notes, true);
  const tout = String(s.index || '') + String(s.legal || '');
  const polices = new Set(); for (const m of tout.matchAll(/assets\/fonts\/([\w.-]+\.woff2)/g)) polices.add(m[1]);
  for (const f of polices) { const src = path.join(modeles, 'polices', f); if (fs.existsSync(src)) ajoute('assets/fonts/' + f, fs.readFileSync(src)); }
  for (const f of ['qt.css', 'qt.js']) if (tout.includes('assets/' + f)) { const src = path.join(modeles, 'assets', f); if (fs.existsSync(src)) ajoute('assets/' + f, fs.readFileSync(src)); }
  // photos du professionnel : réduites et converties en JPEG par la fenêtre ; ici seulement vérifiées (nom sûr, taille, format JPEG)
  for (const im of Array.isArray(s.images) ? s.images.slice(0, 12) : []) {
    if (!im || !/^photo-\d{1,2}\.jpg$/.test(im.nom || '')) continue;
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(im.data || '')); if (!m) continue;
    const buf = Buffer.from(m[1], 'base64'); if (buf.length < 100 || buf.length > 4e6 || buf[0] !== 0xff || buf[1] !== 0xd8) continue;
    ajoute('assets/img/' + im.nom, buf);
  }
  let admin = false;
  for (const f of Array.isArray(s.fichiers) ? s.fichiers.slice(0, 6) : []) { if (f && AUTORISES.has(f.chemin)) { ajoute(f.chemin, f.contenu); if (f.chemin === 'admin/index.html') admin = true; } }
  const domaine = String(s.domaine || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase(), racine = /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domaine) ? 'https://' + domaine + '/' : '';
  if (racine) {
    const jour = new Date().toISOString().slice(0, 10);
    ajoute('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${racine}</loc><lastmod>${jour}</lastmod></url>\n  <url><loc>${racine}mentions-legales.html</loc><lastmod>${jour}</lastmod></url>\n</urlset>\n`);
  }
  ajoute('404.html', `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page introuvable</title><style>body{font:18px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;color:#1a1a1a}a{color:#1f3a68;font-weight:700}</style></head><body><main><h1>Page introuvable</h1><p>Cette page n’existe pas ou a été déplacée.</p><p><a href="./">Retour à l’accueil</a></p></main></body></html>\n`);
  ajoute('robots.txt', 'User-agent: *\nAllow: /\n' + (admin ? 'Disallow: /admin/\n' : '') + (racine ? 'Sitemap: ' + racine + 'sitemap.xml\n' : ''));
  return out;
}
module.exports = { composerSite, nomDossier, AUTORISES, LOCAUX };
