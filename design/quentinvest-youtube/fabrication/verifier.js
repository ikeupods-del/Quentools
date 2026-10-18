// Contrôle rapide de la chaîne, sans fabrication (quelques secondes) :
//  1. les écrans des épisodes 1 et 2 sont identiques à la référence (reference-ecrans.json) : aucune évolution du moteur ne doit les changer ;
//  2. chaque fiche de fiches/ se compose sans erreur (YouTube + TikTok).
// Usage : node verifier.js            (node verifier.js --maj-reference pour accepter un changement voulu des épisodes 1 et 2)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { image } = require('./ecrans'), { compose } = require('./composer');
const EPISODES = path.join(__dirname, '..', 'episodes'), FICHES = path.join(__dirname, '..', 'fiches');
let erreurs = 0;

const actuel = {};
for (const f of ['01-pourquoi-les-prix-montent', '02-que-fait-linflation-a-ton-argent']) {
  const EP = JSON.parse(fs.readFileSync(path.join(EPISODES, f + '.json'), 'utf8')); let ecran = null, section = '';
  EP.scenes.forEach((s, i) => { if (s.ecran !== '=') ecran = s.ecran; if (s.section) section = s.section; actuel[f + i] = crypto.createHash('md5').update(image(ecran, { section, mention: EP.mention, chaine: EP.chaine, sources: EP.sources, duree: 5 + i % 4 })).digest('hex'); });
}
const refFichier = path.join(__dirname, 'reference-ecrans.json');
if (process.argv.includes('--maj-reference')) { fs.writeFileSync(refFichier, JSON.stringify(actuel)); console.log('Référence mise à jour.'); }
else {
  const ref = JSON.parse(fs.readFileSync(refFichier, 'utf8')), diff = Object.keys(ref).filter(k => ref[k] !== actuel[k]);
  if (diff.length) { erreurs++; console.log('✗ Écrans des épisodes 1 et 2 modifiés : ' + diff.join(', ')); } else console.log(`✓ Épisodes 1 et 2 : ${Object.keys(ref).length} écrans identiques à la référence`);
}
for (const f of fs.readdirSync(FICHES).filter(n => /^\d.*\.json$/.test(n))) {
  try { const c = compose(JSON.parse(fs.readFileSync(path.join(FICHES, f), 'utf8'))); const lec = require('./lecture'); if (lec.lignes(c.long).length !== c.long.scenes.length || lec.lignes(c.tiktok).some(x => !x)) throw new Error('texte à lire incohérent avec les répliques'); console.log(`✓ Fiche ${f} : ${c.long.scenes.length} répliques YouTube, ${c.tiktok.scenes.length} TikTok, texte à lire prêt`); }
  catch (e) { erreurs++; console.log(`✗ Fiche ${f} : ${e.message}`); }
}
process.exit(erreurs ? 1 : 0);
