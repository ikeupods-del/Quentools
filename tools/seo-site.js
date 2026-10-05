#!/usr/bin/env node
/* Référencement de base du site vitrine : fil d'Ariane (BreadcrumbList) sur chaque page du plan du site, et offre « Service » sur la page templates
   (prix lu dans assets/qt-templates.js). Idempotent : les blocs repérés par data-seo sont remplacés à chaque exécution.
   Usage : node tools/seo-site.js          (écrit les pages)
           node tools/verifier-site.js     (contrôle titres, descriptions, canonical, données structurées) */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), base = 'https://quentools.fr/';
const plan = [...fs.readFileSync(path.join(racine, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/quentools\.fr\/([^<]*)<\/loc>/g)].map(m => m[1]);
const w = {}; new Function('window', fs.readFileSync(path.join(racine, 'assets', 'qt-templates.js'), 'utf8'))(w); const T = w.QTT;
const nomPage = h => ((h.match(/<title>([^<]*)<\/title>/) || [])[1] || '').replace(/\s*[·—|-]\s*QuenTools\s*$/, '').trim();
const bloc = (id, o) => `<script type="application/ld+json" data-seo="${id}">${JSON.stringify(o)}</script>`;
let n = 0;
for (const p of plan) {
  if (!p || /^(wouf|infikit|freelance|gourmet)\//.test(p)) continue;
  const f = path.join(racine, p, 'index.html'); if (!fs.existsSync(f)) continue;
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace(/\s*<script type="application\/ld\+json" data-seo="[^"]*">.*?<\/script>/gs, '');
  const parts = p.split('/').filter(Boolean), items = [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: base }];
  parts.forEach((_, i) => {
    const sub = parts.slice(0, i + 1).join('/') + '/', file = path.join(racine, sub, 'index.html');
    const name = i === parts.length - 1 ? nomPage(h) : fs.existsSync(file) ? nomPage(fs.readFileSync(file, 'utf8')) : parts[i];
    items.push({ '@type': 'ListItem', position: i + 2, name, item: base + sub });
  });
  let ld = bloc('fil', { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items });
  if (p === 'templates/') ld += '\n' + bloc('offre', { '@context': 'https://schema.org', '@type': 'Service', name: 'Site web prêt à l’emploi, personnalisé à votre marque', serviceType: 'Création de site web', provider: { '@id': base + '#organisation' }, areaServed: 'FR',
    offers: T.templates.map(t => ({ '@type': 'Offer', name: t.name, price: String(t.base), priceCurrency: 'EUR', url: base + 'templates/' })) });
  h = h.replace('</head>', ld + '\n</head>'); fs.writeFileSync(f, h); n++;
}
console.log(`Données structurées écrites sur ${n} pages.`);
