/* Studio Posts : essai réel de la génération avec le vrai modèle (sur Mac, workflow « Studio Posts — application Mac »).
   SP_DOSSIER=dossier node tests/ia-reel.js : télécharge le modèle si besoin, écrit une publication de chaque forme
   pour les deux marques, affiche les textes et le temps, échoue si une forme ne donne rien après 3 essais. */
'use strict';
const path = require('path');
const IA = require('../ia'), G = require('../generer');
(async () => {
  const ia = IA.creer({ dossier: process.env.SP_DOSSIER || path.join(require('os').tmpdir(), 'studio-posts-ia'), autres: [] });
  let t = Date.now(), dernier = 0;
  await ia.installer(p => { if (p - dernier > 0.1) { dernier = p; console.log(`téléchargement ${Math.round(p * 100)} %`); } });
  console.log(`modèle prêt (${Math.round((Date.now() - t) / 1000)} s) ; puce : ${(await ia.verifier()).gpu}`);
  const gen = G.creer({ demander: m => ia.demander(m) }), ko = [], recents = [];
  for (const marque of ['parvis', 'quentools']) for (const forme of Object.keys(G.FORMES[marque])) {
    t = Date.now();
    try {
      const p = await gen.generer({ marque, forme, recents, etape: e => console.log('  ' + e) });
      recents.push(p.nom);
      console.log(`\n=== ${marque} / ${forme} (${Math.round((Date.now() - t) / 1000)} s) : ${p.nom}`);
      p.slides.forEach((s, i) => console.log(`  ${i + 1}. [${s.type}] ` + ['etiquette', 'label', 'titre', 'sous', 'texte', 'items', 'ref'].filter(k => s[k]).map(k => `${k}: ${String(s[k]).replace(/\n/g, ' / ')}`).join(' | ')));
      console.log('  légende : ' + p.legende.titre + ' — ' + p.legende.texte.replace(/\n+/g, ' / ').slice(0, 400));
    } catch (e) { ko.push(`${marque}/${forme} : ${e.message}`); console.log(`\n=== ${marque} / ${forme} : ÉCHEC ${e.message}`); }
  }
  ia.fermer();
  if (ko.length > 1) { console.log('\nÉchecs : ' + ko.join(' ; ')); process.exit(1); }
  console.log(ko.length ? '\nUne forme a échoué (toléré : l’utilisateur relance) : ' + ko[0] : '\nIA réelle : toutes les formes générées');
})().catch(e => { console.error(e); process.exit(1); });
