// Pico — texte de publication d'un épisode, prêt à coller : titre, description YouTube (appel à s'abonner en première ligne, chapitres calés sur la vidéo,
// sources, mention de vulgarisation), description courte, légende TikTok, commentaire épinglé, étiquettes, réglages, points à vérifier.
// Les chapitres viennent du rapport de fabrication (rapport.json : début de chaque section).
// Usage : node publier.js <fiche.json> <rapport.json> [sortie.md]
'use strict';
const fs = require('fs'), path = require('path');

const horodate = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const bloc = t => '```\n' + t + '\n```';
const MENTION = "Vulgarisation : cette vidéo explique des idées générales, ce n'est pas un conseil en investissement. Les exemples chiffrés sont des hypothèses pour comprendre. Voix de synthèse.";

function publication(f, r) {
  const NUM = String(f.numero).padStart(2, '0'), ch = [];
  r.scenes.forEach(s => { if (s.section && !ch.some(c => c.t === (s.debutExport ?? s.debut))) ch.push({ t: s.debutExport ?? s.debut, titre: s.section }); });
  if (ch.length) ch[0].t = 0;
  // YouTube exige des chapitres d'au moins 10 secondes : un chapitre trop proche du précédent (ou de la fin) est fondu dans le précédent
  for (let i = ch.length - 1; i > 0; i--) if (ch[i].t - ch[i - 1].t < 10 || r.duree - ch[i].t < 10) ch.splice(i, 1);
  const chapitres = ch.length >= 3 ? ch.map(c => `${horodate(c.t)} ${c.titre}`).join('\n') : '';
  const externes = f.sourcesExternes !== false;
  const sources = (f.sources || []).join('\n') + (externes ? '\nConsultées le : [date de consultation à compléter]' : '');
  const hash = f.hashtags || '#économie #apprendre #QuentInvest';
  const longue = [
    "👉 Abonne-toi pour rejoindre la colonie : une vidéo d'économie simple, régulièrement.", '',
    f.description, '',
    chapitres && 'Chapitres', chapitres, chapitres && '',
    'Sources', sources, '',
    MENTION, '',
    f.question + ' Dis-le en commentaire !', '',
    hash
  ].filter(x => x !== undefined && x !== false).join('\n').replace(/\n{3,}/g, '\n\n');
  const courte = [`${f.promesse} Pico, la petite fourmi de QuentInvest, t'explique.`, '', f.sources && f.sources[0] ? 'Source : ' + f.sources[0].replace(/^S\d+ · /, '') + '.' : '', "Vulgarisation, pas un conseil en investissement. Voix de synthèse.", '', f.question + ' Dis-le en commentaire !', '', hash].filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i)).join('\n');
  const tiktok = `🐜 Abonne-toi pour rejoindre la colonie ! ${f.promesse} Exemple pédagogique, pas un conseil en investissement. Voix de synthèse. Vidéo complète sur la chaîne.\n${hash}`;
  const epingle = `${(f.sources || []).map(s => s.replace(/^S\d+ · /, '')).join(' ; ')}. Les exemples chiffrés sont des hypothèses pour comprendre, pas des taux réels. ${f.question}`;
  return `# Épisode ${f.numero} — ${f.titre}

Statut : prêt à relire, rien n'est publié.
Vidéos : \`${NUM}-${f.slug}-youtube.mp4\` (${horodate(r.duree)}), \`${NUM}-${f.slug}-tiktok.mp4\` (verticale) ; miniatures \`${NUM}-miniature.png\` et \`${NUM}-miniature-tiktok.png\`.

## Titre
${bloc(f.titre)}

## Description YouTube (à coller telle quelle)
${bloc(longue)}

## Description courte (à coller telle quelle)
${bloc(courte)}

## Légende TikTok (à coller telle quelle)
${bloc(tiktok)}

## Commentaire épinglé
${bloc(epingle)}

## Réglages
- Public : pas destiné aux enfants. Langue : français. Catégorie : Éducation.
- Déclarer le contenu de synthèse (voix) selon les règles de la plateforme le jour de la publication.
- Prochain épisode annoncé : ${f.suite && f.suite.titre ? f.suite.titre : 'à définir'}.

## À faire avant de publier
${externes ? "- Vérifier les sources externes et compléter la date de consultation dans la description.\n" : "- Les chiffres sont des calculs de la chaîne (formule en source) : relire le résultat une fois.\n"}- Le propriétaire valide la vidéo (voix, rythme, texte) et la miniature.
- Rien n'est publié sans son accord.
`;
}
module.exports = { publication };

if (require.main === module) {
  const [, , fichier, rapport, sortie] = process.argv;
  if (!fichier || !rapport) { console.log('Usage : node publier.js <fiche.json> <rapport.json> [sortie.md]'); process.exit(1); }
  const md = publication(JSON.parse(fs.readFileSync(fichier, 'utf8')), JSON.parse(fs.readFileSync(rapport, 'utf8')));
  if (sortie) { fs.writeFileSync(sortie, md); console.log(sortie); } else process.stdout.write(md);
}
