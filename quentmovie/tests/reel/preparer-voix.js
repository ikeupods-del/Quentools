// Essai réel QuentInvest (workflow) : corpus « Ma voix » de référence pour le modèle de clonage, comme après quelques prises du Doublage.
// Sur le Mac du workflow, les phrases sont lues par « say » (il n'y a personne pour parler) : ce son ne sert que de voix à imiter, jamais de voix d'épisode.
// node tests/reel/preparer-voix.js <dossier QuentMovie>
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const FF = require('ffmpeg-static'), base = process.argv[2], dir = path.join(base, 'ma-voix', 'wavs'); fs.mkdirSync(dir, { recursive: true });
const voix = (() => { try { const l = execFileSync('say', ['-v', '?'], { encoding: 'utf8' }).split('\n').find(x => /fr_FR/.test(x)); return l ? l.split(/\s{2,}/)[0].trim() : ''; } catch (e) { return ''; } })();
const PHRASES = ['Salut la colonie, aujourd’hui on parle d’argent, simplement et sans détour.', 'Une banque centrale fixe le prix auquel les banques empruntent de l’argent.', 'Quand ce prix baisse, ton crédit immobilier peut devenir moins cher.', 'Un grain après l’autre, on comprend comment fonctionne l’économie.', 'Les intérêts composés, c’est de l’argent qui rapporte sur de l’argent.'];
const index = {};
PHRASES.forEach((t, k) => {
  const id = 'reel-' + String(k).padStart(2, '0'), aiff = path.join(dir, id + '.aiff'), wav = path.join(dir, id + '.wav');
  execFileSync('say', [...(voix ? ['-v', voix] : []), '-o', aiff, t]);
  execFileSync(FF, ['-y', '-v', 'error', '-i', aiff, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', wav]); fs.rmSync(aiff);
  const st = fs.statSync(wav).size; index[id] = { texte: t, duree: +((st - 44) / 48000).toFixed(2) };
});
fs.writeFileSync(path.join(base, 'ma-voix', 'index.json'), JSON.stringify(index, null, 1));
console.log(`Corpus « Ma voix » : ${PHRASES.length} phrases (${voix || 'voix par défaut'}), durées ${Object.values(index).map(x => x.duree).join(' / ')} s`);
