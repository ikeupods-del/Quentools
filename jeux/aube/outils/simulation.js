'use strict';
/* Simulation sans affichage : plusieurs parties entières jouées par l'IA seule.
   node jeux/aube/outils/simulation.js [nbParties] [taille] [vitesse]
   Échoue (code 1) si une erreur survient ou si les parties n'avancent pas (villes, techniques, combats). */
const fs = require('fs'), path = require('path'), vm = require('vm');

const dossier = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, Date, JSON, Set, Map, Array, Object, Number, String, Float32Array, Float64Array, Int32Array, Int16Array, Uint8Array, Uint16Array, Error });
const code = ['regles.js', 'monde.js', 'moteur.js', 'ia.js'].map(f => fs.readFileSync(path.join(dossier, f), 'utf8')).join('\n;\n');
vm.runInContext(code + `
;globalThis.__api = { nouvellePartie, finDuTour, exporter, importer, villesDe, unitesDe, ereCiv, get G() { return G; }, coutTech, TECHS };`, ctx);
const A = ctx.__api;

const nb = Number(process.argv[2] || 3);
const tailles = process.argv[3] ? [process.argv[3]] : ['petite', 'normale', 'grande'];
const vitesse = process.argv[4] || 'rapide';
const types = ['continents', 'pangee', 'archipel'];
let erreurs = 0;

for (let p = 0; p < nb; p++) {
  const taille = tailles[p % tailles.length], type = types[p % types.length];
  const t0 = Date.now();
  A.nouvellePartie({ taille, type, vitesse, graine: 1000 + p * 77, tousIA: true, difficulte: 'normal' });
  let G = A.G, maxGuerres = 0, prises = 0, tourLent = 0;
  const villesAvant = new Map();
  try {
    while (!G.fin && G.tour <= G.toursMax + 1) {
      const t1 = Date.now();
      A.finDuTour();
      tourLent = Math.max(tourLent, Date.now() - t1);
      G = A.G;
      const guerres = G.civs.reduce((s, c) => s + Object.keys(c.guerre).filter(k => !G.civs[k].barbare).length, 0) / 2;
      maxGuerres = Math.max(maxGuerres, guerres);
      for (const v of G.villes) { const a = villesAvant.get(v.id); if (a !== undefined && a !== v.civ) prises++; villesAvant.set(v.id, v.civ); }
      if (G.tour % 40 === 0) {
        /* Sauvegarde et rechargement en cours de partie. */
        A.importer(A.exporter()); G = A.G;
        const lignes = G.civs.filter(c => !c.barbare).map(c => {
          const vs = A.villesDe(c.n), pop = vs.reduce((s, v) => s + v.pop, 0);
          return `${c.nom.padEnd(10)} ${c.elimine ? 'éliminé' : `${vs.length} villes, pop ${pop}, ${Object.keys(c.techs).length} tech (ère ${A.ereCiv(c)}), ${A.unitesDe(c.n).length} unités, or ${Math.round(c.or)}, bonheur ${c.bonheur}`}`;
        });
        console.log(`  tour ${G.tour} :\n    ` + lignes.join('\n    '));
      }
    }
  } catch (e) {
    erreurs++;
    console.error(`ERREUR partie ${p + 1} (${taille}, ${type}) au tour ${G.tour} :`, e.stack);
    continue;
  }
  const civs = G.civs.filter(c => !c.barbare);
  const villes = G.villes.length, techs = Math.max(...civs.map(c => Object.keys(c.techs).length));
  console.log(`Partie ${p + 1} (${taille}, ${type}, ${vitesse}) : fin ${G.fin ? `${G.fin.type} (${G.fin.civ >= 0 ? G.civs[G.fin.civ].nom : '—'})` : 'aucune'} au tour ${G.tour}, ${villes} villes, max ${techs} tech, guerres simultanées max ${maxGuerres}, villes prises ${prises}, ${Math.round((Date.now() - t0) / 1000)} s (tour le plus lent ${tourLent} ms)`);
  if (villes < civs.length * 2) { erreurs++; console.error('  trop peu de villes'); }
  if (techs < 20) { erreurs++; console.error('  recherche trop lente'); }
}
if (erreurs) { console.error(`${erreurs} problème(s)`); process.exit(1); }
console.log('Simulation : tout est correct.');
