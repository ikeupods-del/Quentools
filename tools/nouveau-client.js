#!/usr/bin/env node
/* Prépare le site d'un client à partir d'un modèle de design/templates/ et d'une fiche (JSON) : copie le système de design,
   applique la marque (3 jetons, contraste contrôlé), remplace les champs connus et liste ce qu'il reste à compléter.
   Le dossier créé (clients/<dossier>/) n'est jamais versionné.
   Usage : node tools/nouveau-client.js --exemple > fiche.json   (modèle de fiche)
           node tools/nouveau-client.js fiche.json              (génère clients/<dossier>/)
           node tools/nouveau-client.js --modeles               (modèles disponibles) */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), tpl = path.join(racine, 'design', 'templates');
const modeles = fs.readdirSync(tpl).filter(f => f.endsWith('.html')).map(f => f.replace('.html', '')).filter(m => !['legal', 'merci'].includes(m));
const arg = process.argv[2];
const EXEMPLE = { modele: 'vitrine', dossier: 'dupont-plomberie', nom: 'Dupont Plomberie', metier: 'plombier chauffagiste', ville: 'Lyon',
  accroche: 'une panne réparée dans la journée', couleur: '#0f766e', services: ['Dépannage urgent', 'Chauffe-eau', 'Salle de bains'],
  telephone: '06 12 34 56 78', email: 'contact@exemple.fr' };

if (arg === '--exemple') { console.log(JSON.stringify(EXEMPLE, null, 2)); process.exit(0); }
if (arg === '--modeles') { console.log(modeles.join('\n')); process.exit(0); }
if (!arg) { console.error('Usage : node tools/nouveau-client.js fiche.json | --exemple | --modeles'); process.exit(1); }

const f = JSON.parse(fs.readFileSync(arg, 'utf8'));
for (const k of ['modele', 'dossier', 'nom', 'couleur']) if (!f[k]) { console.error(`Champ obligatoire manquant : ${k}`); process.exit(1); }
if (!modeles.includes(f.modele)) { console.error(`Modèle inconnu « ${f.modele} ». Disponibles : ${modeles.join(', ')}`); process.exit(1); }
if (!/^[a-z0-9-]+$/.test(f.dossier)) { console.error('« dossier » : minuscules, chiffres et tirets uniquement'); process.exit(1); }
if (!/^#[0-9a-f]{6}$/i.test(f.couleur)) { console.error('« couleur » : code #rrggbb'); process.exit(1); }

// Couleurs : accent, fond doux (clair et sombre), version éclaircie pour le mode sombre ; contraste du texte blanc contrôlé.
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const A = rgb(f.couleur), BL = [255, 255, 255], NO = [13, 12, 18];
const contraste = 1.05 / (lum(A) + .05);
const accent = f.couleur, soft = hex(mix(A, BL, .88)), accentSombre = hex(mix(A, BL, .45)), softSombre = hex(mix(A, NO, .85));
const lime = f.couleur2 || '#fbbf24';
const jetons = `.display{font-size:clamp(2rem,8.2vw,4.6rem);overflow-wrap:break-word;hyphens:auto}.display em{white-space:normal}\n  :root{--accent:${accent};--accent-soft:${soft};--lime:${lime}}\n  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--accent:${accentSombre};--accent-soft:${softSombre}}}`;

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const tel = String(f.telephone || ''), e164 = tel ? '+33' + tel.replace(/\D/g, '').replace(/^0/, '') : '';
const s = f.services || [];
const remplacements = [
  ['[Nom de l’entreprise]', f.nom], ['[Nom]', f.nom],
  ['[Votre métier]', cap(f.metier)], ['[Métier]', cap(f.metier)], ['[métier]', f.metier],
  ['[ville]', f.ville], ['[promesse courte]', f.accroche],
  ['[service 1]', s[0]], ['[service 2]', s[1]], ['[service 3]', s[2]],
  ['[Service 1]', cap(s[0])], ['[Service 2]', cap(s[1])], ['[Service 3]', cap(s[2])],
  ['[+33600000000]', e164], ['[06 00 00 00 00]', tel]
];

let h = fs.readFileSync(path.join(tpl, f.modele + '.html'), 'utf8');
h = h.replace(/:root\{--accent:[^}]*\}\s*@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\)\{[^}]*\}\}/, jetons);
for (const [de, par] of remplacements) if (par) h = h.split(de).join(par);

const sortie = path.join(racine, 'clients', f.dossier);
fs.mkdirSync(path.join(sortie, 'assets', 'fonts'), { recursive: true });
for (const x of ['qt.css', 'qt.js']) fs.copyFileSync(path.join(racine, 'assets', x), path.join(sortie, 'assets', x));
for (const x of fs.readdirSync(path.join(racine, 'assets', 'fonts'))) if (/^(bricolage|inter)\.woff2$|^OFL-/.test(x)) fs.copyFileSync(path.join(racine, 'assets', 'fonts', x), path.join(sortie, 'assets', 'fonts', x));
fs.writeFileSync(path.join(sortie, 'index.html'), h.split('../../assets/').join('assets/'));
for (const [src, dir] of [['legal', 'mentions-legales'], ['merci', 'merci']]) {
  fs.mkdirSync(path.join(sortie, dir), { recursive: true });
  let p = fs.readFileSync(path.join(tpl, src + '.html'), 'utf8');
  for (const [de, par] of remplacements) if (par) p = p.split(de).join(par);
  fs.writeFileSync(path.join(sortie, dir, 'index.html'), p.split('../../assets/').join('../assets/').split('../../').join('../'));
}

// Contrôle : champs restant à compléter, h1, images sans alt, contraste.
const reste = [];
fs.readFileSync(path.join(sortie, 'index.html'), 'utf8').split('\n').forEach((l, i) => {
  for (const m of l.matchAll(/\[[^\]=\[]{2,80}\]/g)) reste.push(`  ligne ${i + 1} : ${m[0]}`);
});
const h1 = (h.match(/<h1[\s>]/g) || []).length, sansAlt = (h.match(/<img\b[^>]*>/g) || []).filter(x => !/\balt=/.test(x)).length;
console.log(`Dossier créé : clients/${f.dossier}/ (modèle « ${f.modele} »)`);
console.log(`Contraste texte blanc sur ${accent} : ${contraste.toFixed(1)}:1 ${contraste >= 4.5 ? '(correct)' : '(INSUFFISANT : choisir une couleur plus foncée)'}`);
console.log(`Titres h1 : ${h1} ${h1 === 1 ? '(correct)' : '(il en faut exactement un)'} · images sans texte alternatif : ${sansAlt}`);
console.log(`À compléter dans index.html : ${reste.length} champ(s)`);
console.log(reste.slice(0, 60).join('\n'));
console.log('Ensuite : photos réelles, mentions légales (SIRET, hébergeur), aperçu sur 390 px et 1440 px, clair et sombre (design/CHECKLIST-CLIENT.md).');
