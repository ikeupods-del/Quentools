// Banque d'idées QuentInvest : chaque script se découpe en fiche fabricable, dure plus de 5 minutes, garde des phrases courtes,
// cite la source de chacun de ses chiffres et ne donne aucun conseil d'investissement ; la route de QuentMovie les sert.
'use strict';
const { charger, toutes } = require('../idees-quentinvest');
const { ficheDepuisScript, controler } = require('../fiche-quentinvest');

let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
const l = toutes(), themes = charger();
check('une centaine d’idées', l.length >= 100, String(l.length));
check('plusieurs thèmes', themes.length >= 4, String(themes.length));
check('titres tous différents', new Set(l.map(x => x.titre.toLowerCase())).size === l.length);
check('identifiants tous différents', new Set(l.map(x => x.id)).size === l.length);
for (const x of l) {
  let f; try { f = ficheDepuisScript(x.texte, { numero: 50 }); } catch (e) { check(`${x.id} découpé`, false, e.message); continue; }
  const r = controler(f);
  check(`${x.id} « ${x.titre} » : titre lu`, f.titre === x.titre, f.titre);
  check(`${x.id} : fabricable et plus de 5 minutes`, r.ok && r.secondes >= 300, `${r.mots} mots, ${r.secondes} s · ${r.erreurs.join(' | ')}`);
  const g = r.avertissements.filter(a => /conseil|aucun lien|phrase\(s\) de plus|absent\(s\) des sources|Accroche|coupe-le/.test(a));
  check(`${x.id} : aucun avertissement`, !g.length, g.join(' | '));
  check(`${x.id} : sources données`, !/Script de la chaîne/.test(f.sources.join(' ')));
  check(`${x.id} : question finale`, /\?$/.test(f.question) && f.question !== 'Et toi, qu’en penses-tu ?', f.question);
}
// la route sert la banque à la fenêtre Épisode
(async () => {
  const routes = require('../routes-voix').creer({ BASE: require('os').tmpdir(), opts: {}, send: (res, c, o) => { res.c = c; res.o = o; return o; }, readJson: async () => ({}), travail: () => ({}) });
  const res = {}; await routes({ method: 'GET' }, res, '/api/quentinvest/idees');
  check('route /api/quentinvest/idees', res.c === 200 && res.o.themes.flatMap(t => t.idees).length === l.length);
  console.log(`Idées QuentInvest : ${l.length} scripts, ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})();
