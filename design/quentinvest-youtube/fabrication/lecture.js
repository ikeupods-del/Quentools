// Pico — texte à lire pour le Doublage de QuentMovie (voix du propriétaire) :
//   NN-sujet-lecture.txt        une réplique par ligne (YouTube), à charger dans Doublage → « Charger un épisode ou un texte »
//   NN-sujet-lecture-tiktok.txt idem pour la version verticale
//   NN-sujet-lecture.md         guide de lecture (numéro, section, ton conseillé, durée approximative, commande de fabrication)
// Écrit automatiquement par episode.js ; à la main : node lecture.js <fiche.json> [dossier]
'use strict';
const fs = require('fs'), path = require('path');

const TONS = { curieux: 'curieux, la voix monte un peu', content: 'souriant, chaleureux', inquiet: 'plus grave, prudent', surpris: 'étonné, marque le chiffre', reflechi: 'posé, un peu plus lent', neutre: 'naturel' };
// même règle de nom que le Doublage de QuentMovie (dblNom) : le dossier des répliques porte le nom du fichier chargé
const nomDoublage = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'doublage';
const secondes = t => Math.max(1, Math.round((t.match(/\S+/g) || []).length / 2.6)); // lecture naturelle : environ 2,6 mots par seconde

function lignes(episode) { return episode.scenes.map(s => String(s.texte).replace(/\s+/g, ' ').trim()); }

// base = « NN-slug » ; vertical = version TikTok
function guide(episode, base, vertical) {
  const nom = base + '-lecture' + (vertical ? '-tiktok' : ''), L = lignes(episode);
  let section = '', total = 0;
  const rows = episode.scenes.map((s, i) => {
    if (s.section) section = s.section;
    total += secondes(L[i]);
    return `| ${i + 1} | ${section || '—'} | ${TONS[s.expr] || TONS.neutre} | ${secondes(L[i])} s | ${L[i].replace(/\|/g, '/')} |`;
  });
  return `# Texte à lire — ${episode.titre}

Version ${vertical ? 'TikTok (verticale, une minute)' : 'YouTube'} · ${L.length} répliques · environ ${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s de lecture.

## Comment faire
1. QuentMovie → **Doublage** (⇧⌘D) → **Charger un épisode ou un texte** → \`${nom}.txt\`.
2. Pour chaque ligne : Espace pour enregistrer, relis la phrase naturellement (comme à un ami), Espace pour arrêter. L réécoute, les flèches changent de ligne. Le silence au début et à la fin est retiré tout seul.
3. Garde l'ordre et ne saute pas de ligne : chaque ligne correspond à un écran de la vidéo.
4. Quand tout est enregistré, fabrique la vidéo avec ta voix (le montage, les écrans, les sons et les sous-titres restent automatiques) :
\`\`\`
node design/quentinvest-youtube/fabrication/episode.js design/quentinvest-youtube/fiches/${base}.json --voix-perso${vertical ? '-tiktok' : ''} ~/Movies/QuentMovie/doublages/${nomDoublage(nom)}
\`\`\`

## Conseils de lecture
- Souris en parlant, ça s'entend. Garde le même volume et la même distance du micro d'une ligne à l'autre.
- Marque une courte pause aux points. Ne lis pas les numéros ni les noms de sections, seulement le texte.
- Les chiffres : dis-les comme tu les dirais à l'oral (« cinq mille florins »).
- Une erreur ? Ne recommence pas tout : refais seulement la ligne (flèches puis Espace).

## Répliques
| N° | Section | Ton conseillé | Durée | Texte à lire |
|---|---|---|---|---|
${rows.join('\n')}
`;
}

function ecrire(episode, base, vertical, dossiers) {
  const nom = base + '-lecture' + (vertical ? '-tiktok' : '');
  for (const d of dossiers) {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, nom + '.txt'), lignes(episode).join('\n') + '\n');
    fs.writeFileSync(path.join(d, nom + '.md'), guide(episode, base, vertical));
  }
  return nom;
}

module.exports = { lignes, guide, ecrire, nomDoublage };

if (require.main === module) {
  const fichier = process.argv[2], dossier = path.resolve(process.argv[3] || path.join(__dirname, '..', 'episodes'));
  if (!fichier) { console.log('Usage : node lecture.js <fiche.json> [dossier]'); process.exit(1); }
  const { compose } = require('./composer'), C = compose(JSON.parse(fs.readFileSync(fichier, 'utf8')));
  console.log(ecrire(C.long, C.base, false, [dossier]), ecrire(C.tiktok, C.base, true, [dossier]));
}
