/* Studio Posts — prépare marketing/generateur-posts/donnees.js : node tools/generateur-posts.js [--fichier-unique chemin.html]
   Polices de marque en base64 (la page s'ouvre sans serveur, le navigateur refuse de charger une police depuis un fichier local)
   et bibliothèque de publications déjà écrites : Le Parvis (marketing/generateur-posts/parvis-posts.js)
   et QuenTools (tools/publications.json). Relancer après toute modification de ces fichiers.
   --fichier-unique : écrit en plus une copie autonome (page + données dans un seul fichier) à ouvrir d'un double clic sur le Mac. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dossier = path.join(root, 'marketing', 'generateur-posts');
const b64 = f => fs.readFileSync(path.join(root, 'assets', 'fonts', f)).toString('base64');

const POLICES = [
  { famille: 'QBric', style: 'normal', poids: '200 800', data: b64('bricolage.woff2') },
  { famille: 'QInter', style: 'normal', poids: '100 900', data: b64('inter.woff2') },
  { famille: 'QPlay', style: 'normal', poids: '400 900', data: b64('ex/playfair-display-normal.woff2') },
  { famille: 'QPlay', style: 'italic', poids: '400 900', data: b64('ex/playfair-display-italic.woff2') }
];

// Le Parvis : cover → couverture, point → point, verse → verset, cta → abonnement
const TYPES_PARVIS = { cover: 'couverture', point: 'point', verse: 'verset', cta: 'abonnement' };
const parvis = require(path.join(dossier, 'parvis-posts.js')).map(p => ({
  nom: p.tiktok, categorie: p.format, marque: 'parvis',
  legende: { titre: p.tiktok, texte: p.legende },
  slides: p.slides.map(s => {
    const d = { type: TYPES_PARVIS[s.kind] };
    for (const k of ['titre', 'sous', 'texte', 'ref', 'label']) if (s[k] != null) d[k] = s[k];
    if (s.n) d.n = s.n;
    return d;
  })
}));

// QuenTools : une publication = une image (liste ou accroche)
const quentools = JSON.parse(fs.readFileSync(path.join(__dirname, 'publications.json'), 'utf8')).map(p => {
  const s = { type: p.liste ? 'liste' : 'accroche', theme: p.theme || 'violet', etiquette: p.etiquette || '', titre: p.titre || '' };
  if (p.liste) { s.items = p.liste.join('\n'); s.puce = p.numero === false ? 'point' : 'numero'; }
  if (p.sous) s.sous = p.sous;
  return { nom: (p.titre || p.id).replace(/\*/g, ''), categorie: p.etiquette || 'Publication', marque: 'quentools', legende: { titre: p.tiktok || '', texte: p.legende || '' }, slides: [s] };
});

const sortie = `/* Généré par tools/generateur-posts.js : ne pas modifier à la main. */
window.POLICES = ${JSON.stringify(POLICES)};
window.BIBLIOTHEQUE = ${JSON.stringify({ parvis, quentools }, null, 1)};
`;
fs.writeFileSync(path.join(dossier, 'donnees.js'), sortie);
console.log(`donnees.js : ${POLICES.length} polices, ${parvis.length} publications Le Parvis, ${quentools.length} publications QuenTools (${Math.round(sortie.length / 1024)} Ko)`);

const iU = process.argv.indexOf('--fichier-unique');
if (iU > 0) {
  const page = fs.readFileSync(path.join(dossier, 'index.html'), 'utf8').replace('<script src="donnees.js"></script>', () => `<script>\n${sortie}</script>`);
  fs.writeFileSync(process.argv[iU + 1], page);
  console.log('fichier unique : ' + process.argv[iU + 1]);
}
