// Pico — fabrique un épisode complet en une commande, à partir d'une fiche courte :
//   node episode.js fiches/03-interets-composes.json [--sortie <dossier>] [--modeles <dossier des voix>] [--sans-tiktok] [--sans-youtube] [--voix-perso <dossier YouTube>] [--voix-perso-tiktok <dossier TikTok>]
// Étapes : composition (YouTube + TikTok) → contrôle du rythme → voix → écrans → montage QuentMovie → miniatures → texte de publication.
// Résultat dans <dossier> (par défaut ~/Movies/QuentInvest/NN-sujet) : vidéos, miniatures et NN-sujet-publication.md. Le fichier d'épisode (JSON) est rangé dans episodes/.
// La sortie est volontairement courte : une ligne par étape, les avertissements du contrôle et la liste des fichiers.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const { compose } = require('./composer'), { publication, publicationDonnees } = require('./publier');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; }, drapeau = n => process.argv.includes('--' + n);
const fichier = process.argv[2];
if (!fichier || fichier.startsWith('--')) { console.log('Usage : node episode.js <fiche.json> [--sortie <dossier>] [--modeles <dossier des voix>] [--sans-tiktok] [--sans-youtube] [--court] [--voix-perso <dossier YouTube>] [--voix-perso-tiktok <dossier TikTok>]'); process.exit(1); }
const F = JSON.parse(fs.readFileSync(fichier, 'utf8')), C = compose(F);
// contrôle de la fiche avant la fabrication (longueur, phrases, chiffres sans source, mots à ajouter au dictionnaire) : avertissements seulement
try { const FQ = require('../../../quentmovie/fiche-quentinvest'); const R = FQ.controler(F, { lexique: require('../../../quentmovie/voix-texte').lexiqueActuel() }); for (const x of R.avertissements) console.log('⚠ ' + x.slice(0, 220)); }
catch (e) { /* contrôle facultatif */ }
const EPISODES = path.join(__dirname, '..', 'episodes'), SORTIE = path.resolve(arg('sortie', path.join(os.homedir(), 'Movies', 'QuentInvest', C.base)));
const MODELES = arg('modeles', path.join(os.homedir(), 'Movies', 'QuentMovie', 'modeles'));
fs.mkdirSync(SORTIE, { recursive: true });
// texte à lire pour le Doublage de QuentMovie (voix du propriétaire) : rangé à côté des vidéos et dans episodes/
{ const L = require('./lecture'); for (const [ep, v] of [[C.long, false], [C.tiktok, true]]) L.ecrire(ep, C.base, v, [SORTIE, EPISODES]); }
const dossierVoix = (EP) => path.join(MODELES, EP.voix.moteur === 'kokoro' ? 'kokoro-multi-lang-v1_0' : EP.voix.modele || 'vits-piper-fr_FR-upmc-medium');
{ const { estimer, DUREE_MINI } = require('./composer'), est = estimer(C.long.scenes, C.long.voix);
  if (!drapeau('sans-youtube') && !drapeau('court') && est < DUREE_MINI) { console.error(`Fiche trop courte : environ ${Math.floor(est / 60)} min ${est % 60} s estimées. Une vidéo YouTube dure au moins 5 minutes : ajoute des blocs à la fiche.`); process.exit(2); } }
const etape = t => console.log('• ' + t);

// voix du propriétaire (doublage de QuentMovie) : un dossier par version, v00.wav, v01.wav… une réplique chacun
// version TikTok avec ta voix : sans dossier dédié (--voix-perso-tiktok), elle est montée à partir des répliques de la vidéo YouTube (tiktok-voix.js) ; --tiktok-synthese la garde en voix de synthèse
let tiktokEpisode = C.tiktok, tiktokPerso = arg('voix-perso-tiktok', '');
if (!drapeau('sans-tiktok') && !drapeau('tiktok-synthese') && arg('voix-perso', '') && !tiktokPerso) {
  etape('Version TikTok : voix tirée de la vidéo YouTube');
  const T = require('./tiktok-voix').preparer({ C, dossierYoutube: path.resolve(arg('voix-perso')), sortie: path.join(SORTIE, 'travail-tiktok-voix') });
  tiktokEpisode = T.episode; tiktokPerso = T.dossier;
  for (const r of T.rapport) console.log('  ' + (r.retiree ? `réplique ${r.scene + 1} retirée (${r.raison})` : `réplique ${r.scene + 1} : ${r.voix}${r.source ? ' (' + r.source + ')' : ''}`));
}
const persoDe = nom => { const d = nom ? tiktokPerso : arg('voix-perso', ''); return d ? ['--voix-perso', path.resolve(d)] : []; };
function fabriquer(nom, EP) {
  const json = path.join(EPISODES, `${C.base}${nom}.json`); fs.writeFileSync(json, JSON.stringify(EP, null, 1) + '\n');
  const trav = path.join(SORTIE, 'travail' + nom);
  const r = spawnSync('node', [path.join(__dirname, 'fabriquer.js'), json, '--voix', dossierVoix(EP), '--sortie', trav, ...persoDe(nom)], { encoding: 'utf8', maxBuffer: 1e9, env: process.env });
  const sortie = (r.stdout || '').replace(/\r/g, '\n').split('\n');
  const controle = sortie.filter(l => /^Contrôle du rythme| · /.test(l));
  if (r.status !== 0 || !fs.existsSync(path.join(trav, 'episode.mp4'))) { console.error((r.stderr || '').split('\n').filter(l => !/csrc/.test(l)).slice(-15).join('\n')); throw new Error('Fabrication échouée : ' + json); }
  const video = path.join(SORTIE, `${C.base}-${nom ? 'tiktok' : 'youtube'}.mp4`); fs.copyFileSync(path.join(trav, 'episode.mp4'), video);
  console.log(controle.map(l => '  ' + l.trim()).join('\n'));
  return { video, rapport: JSON.parse(fs.readFileSync(path.join(trav, 'rapport.json'), 'utf8')), json };
}

let long = null;
if (!drapeau('sans-youtube')) { etape('Vidéo YouTube'); long = fabriquer('', C.long); }
if (!drapeau('sans-tiktok')) { etape('Version TikTok'); fabriquer('-tiktok', tiktokEpisode); }
fs.writeFileSync(path.join(EPISODES, `${C.base}.json`), JSON.stringify(C.long, null, 1) + '\n'); // la miniature lit le fichier d'épisode, même sans vidéo YouTube
etape('Miniatures');
const mini = (extra, nom) => { const r = spawnSync('node', [path.join(__dirname, 'miniature.js'), path.join(EPISODES, `${C.base}.json`), 'surpris-ouvert', path.join(SORTIE, nom), ...extra], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); };
mini([], `${C.NUM}-miniature.png`); mini(['--tiktok'], `${C.NUM}-miniature-tiktok.png`);
if (long) {
  etape('Texte de publication');
  fs.writeFileSync(path.join(SORTIE, `${C.base}-publication.md`), publication(F, long.rapport, { voixPerso: !!arg('voix-perso', '') }));
  fs.copyFileSync(path.join(SORTIE, `${C.base}-publication.md`), path.join(EPISODES, `${C.base}-publication.md`));
  fs.writeFileSync(path.join(SORTIE, `${C.base}-publication.json`), JSON.stringify(publicationDonnees(F, long.rapport, { voixPerso: !!arg('voix-perso', '') }), null, 1)); // même contenu, pour la programmation automatique des publications
}
fs.copyFileSync(path.join(SORTIE, `${C.NUM}-miniature.png`), path.join(EPISODES, `${C.NUM}-miniature.png`)); fs.copyFileSync(path.join(SORTIE, `${C.NUM}-miniature-tiktok.png`), path.join(EPISODES, `${C.NUM}-miniature-tiktok.png`));
// un seul fichier à déposer sur le Mac : dézippé dans ~/Movies/QuentInvest (ou Téléchargements), l'épisode apparaît dans « Publier » de QuentMovie
{ const noms = fs.readdirSync(SORTIE).filter(n => /\.(mp4|png)$/.test(n) || /-publication\.(json|md)$/.test(n));
  const z = path.join(SORTIE, `${C.base}.zip`); fs.rmSync(z, { force: true });
  const rz = spawnSync('zip', ['-q', '-r', z, ...noms.map(n => n)], { cwd: SORTIE });
  if (rz.status === 0) { // le dossier de l'archive porte le nom de l'épisode
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qi-zip-')), dossier = path.join(tmp, C.base); fs.mkdirSync(dossier);
    for (const n of noms) fs.copyFileSync(path.join(SORTIE, n), path.join(dossier, n)); fs.rmSync(z, { force: true });
    spawnSync('zip', ['-q', '-r', z, C.base], { cwd: tmp }); fs.rmSync(tmp, { recursive: true, force: true });
  }
}
console.log('\nPrêt à relire, rien n\'est publié. Dossier : ' + SORTIE);
for (const f of fs.readdirSync(SORTIE).filter(n => /\.(mp4|png|md)$/.test(n))) console.log('  ' + f);
