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
  let admin = false;
  for (const f of Array.isArray(s.fichiers) ? s.fichiers.slice(0, 6) : []) { if (f && AUTORISES.has(f.chemin)) { ajoute(f.chemin, f.contenu); if (f.chemin === 'admin/index.html') admin = true; } }
  ajoute('robots.txt', 'User-agent: *\nAllow: /\n' + (admin ? 'Disallow: /admin/\n' : ''));
  return out;
}
module.exports = { composerSite, nomDossier, AUTORISES, LOCAUX };
