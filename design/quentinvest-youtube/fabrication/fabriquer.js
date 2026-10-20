// Pico — fabrique l'épisode de bout en bout :
//   1. voix Piper (même modèle que QuentMovie) + réglage de la voix de Pico, 2. images avec bouche synchronisée sur la voix,
//   3. une vidéo par réplique, 4. montage et export par le moteur de QuentMovie (fondus, sous-titres, musique, volume).
// Voix : Piper (upmc, épisode 1) ou Kokoro (voix « siwis » abaissée, à partir de l'épisode 2) — réglées dans la clé `voix` du fichier de l'épisode.
// Écrans animés : les images de chaque écran sont rendues image par image (ecrans.js), Pico est posé par-dessus par FFmpeg (bouche, entrée, rebond).
// Style 2 (clé `style: 2` du fichier de l'épisode, nouveaux épisodes seulement ; les épisodes 1 et 2 gardent leur rendu) :
//   voix rythmée phrase par phrase (pauses, mot lent `lent`), bruitages posés sur les animations, zoom lent du fond, gestes de Pico (`geste`),
//   textes plus gros, contrôle du rythme avant l'export. Clé `format: "vertical"` : vidéo 9:16 (TikTok, Shorts), sous-titres en 3 mots.
// Usage : node fabriquer.js <episode.json> [--voix <dossier du modèle>] [--sortie <dossier>] [--locuteur 0|1] [--vitesse 0.85] [--voix-perso <dossier>] [--controle]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const fichier = process.argv[2];
if (!fichier || fichier.startsWith('--')) { console.log('Usage : node fabriquer.js <episode.json> [--voix <dossier>] [--sortie <dossier>] [--locuteur 0|1] [--vitesse 0.85] [--voix-perso <dossier>] [--controle]'); process.exit(1); }
const EP = JSON.parse(fs.readFileSync(fichier, 'utf8'));
const V = EP.voix || { moteur: 'piper' }; // { moteur: 'piper'|'kokoro', sid, vitesse, hauteur }
const KOKORO = V.moteur === 'kokoro';
const TRAVAIL = path.resolve(arg('sortie', path.join(os.tmpdir(), 'pico-episode')));
const MODELES = path.join(os.homedir(), 'Movies', 'QuentMovie', 'modeles');
const VOIX = arg('voix', path.join(MODELES, KOKORO ? 'kokoro-multi-lang-v1_0' : V.modele || 'vits-piper-fr_FR-upmc-medium')); // Piper : `modele` = dossier du modèle (ex. vits-piper-fr_FR-tom-medium, voix d'homme)
const LOCUTEUR = +arg('locuteur', V.sid != null ? V.sid : 1); // Piper upmc : 0 = Jessica, 1 = Pierre · Kokoro : 30 = voix française « siwis »
const QM = process.env.QI_QM || path.join(__dirname, '..', '..', '..', 'quentmovie'); // QI_* : chemins donnés par QuentMovie quand il lance la fabrication
const PICO = path.join(__dirname, '..', 'personnage', 'png');
const VITESSE = +arg('vitesse', V.vitesse || 0.65); // allure de la voix (1 = normale)
const HAUTEUR = V.hauteur || (KOKORO ? 1 : 1.08); // > 1 : plus aiguë (Pico, fourmi), < 1 : plus grave (durée conservée avec Kokoro)
const STYLE2 = (EP.style | 0) >= 2, VERT = EP.format === 'vertical', LARG = VERT ? 1080 : 1920, HAUT = VERT ? 1920 : 1080;
const FPS = 30, PAUSE = 0.35, PAUSE_SECTION = 0.8, ANIM_MAX = 14;
const SONS = process.env.QI_SONS || path.join(QM, 'bibliotheque', 'sons'); // QI_SONS : bibliothèque hors de l'archive de l'application (lue par FFmpeg)
const FFMPEG = process.env.QI_FFMPEG || 'ffmpeg';
const ff = (...a) => execFileSync(FFMPEG, ['-y', '-v', 'error', ...a], { maxBuffer: 1e8 });
const sh = (n, d = 2) => String(n).padStart(d, '0');
// avancement lu par QuentMovie quand il lance la fabrication (QI_PROGRES : fichier réécrit à chaque étape)
const progres = x => { if (process.env.QI_PROGRES) try { fs.writeFileSync(process.env.QI_PROGRES, JSON.stringify(x)); } catch (e) { /* facultatif */ } };
for (const d of ['audio', 'images', 'clips']) fs.mkdirSync(path.join(TRAVAIL, d), { recursive: true });
const crypto = require('crypto');
const persoDate = i => { const f = arg('voix-perso', '') && path.join(arg('voix-perso', ''), `v${sh(i)}.wav`); try { return f ? fs.statSync(f).mtimeMs : 0; } catch (e) { return 0; } };
// la clé suit le texte tel qu'il est dit (dictionnaire de prononciation compris) : un mot corrigé refait la voix des seules répliques qui le contiennent
const ditPar = (() => { try { return require(path.join(QM, 'voix-texte.js')).pourLaVoix; } catch (e) { return t => t; } })();
const cleVoix = i => crypto.createHash('md5').update(JSON.stringify([ditPar(EP.scenes[i].voix || EP.scenes[i].texte), EP.scenes[i].lent || 0, V, VITESSE, STYLE2, pauseDe(i), arg('voix-perso', ''), ...(arg('voix-perso', '') ? [persoDate(i)] : [])])).digest('hex');
const wavDe = i => path.join(TRAVAIL, 'audio', `v${sh(i)}.wav`);
const pauseDe = i => { const suivante = EP.scenes[i + 1]; return !suivante || suivante.section ? PAUSE_SECTION : PAUSE; };

// ---------- 1. voix ----------
function synthese() {
  // RÈGLE DE LA CHAÎNE : jamais de voix de synthèse, pas même pour une réplique (QI_ESSAI_SYNTHESE=1 : essais automatiques seulement)
  if (!process.env.QI_ESSAI_SYNTHESE) {
    const manquantes = EP.scenes.map((s, i) => ({ i, s })).filter(({ i }) => { const f = arg('voix-perso', '') && path.join(arg('voix-perso', ''), `v${sh(i)}.wav`); return !(f && fs.existsSync(f)); });
    if (manquantes.length) { console.error(`${manquantes.length} réplique(s) sans voix enregistrée (la chaîne n'utilise jamais de voix de synthèse) : enregistre-les dans le Doublage de QuentMovie ou fais-les dire par ta voix clonée.\n` + manquantes.slice(0, 12).map(({ i, s }) => `  v${sh(i)}.wav : « ${String(s.texte).slice(0, 90)} »`).join('\n') + (manquantes.length > 12 ? '\n  …' : '')); process.exit(3); }
  }
  const sherpa = require(process.env.SHERPA || 'sherpa-onnx-node'), { pourLaVoix } = require(path.join(QM, 'voix-texte.js'));
  const modele = () => KOKORO
    ? { kokoro: { model: path.join(VOIX, 'model.onnx'), voices: path.join(VOIX, 'voices.bin'), tokens: path.join(VOIX, 'tokens.txt'), dataDir: path.join(VOIX, 'espeak-ng-data'), dictDir: path.join(VOIX, 'dict'), lexicon: [path.join(VOIX, 'lexicon-gb-en.txt'), path.join(VOIX, 'lexicon-zh.txt')].join(','), lang: 'fr' } }
    : { vits: { model: path.join(VOIX, fs.readdirSync(VOIX).find(n => n.endsWith('.onnx'))), tokens: path.join(VOIX, 'tokens.txt'), dataDir: path.join(VOIX, 'espeak-ng-data') } };
  let tts0 = null; const tts = () => tts0 || (tts0 = new sherpa.OfflineTts({ model: { ...modele(), numThreads: 2, debug: false, provider: 'cpu' }, maxNumSentences: 2 })); // chargée seulement si une réplique n'a pas de voix enregistrée
  EP.scenes.forEach((s, i) => {
    progres({ etape: 'voix', i: i + 1, n: EP.scenes.length });
    const brut = path.join(TRAVAIL, 'audio', `b${sh(i)}.wav`), fin = wavDe(i);
    const cle = path.join(TRAVAIL, 'audio', `v${sh(i)}.cle`);
    if (fs.existsSync(fin) && fs.existsSync(cle) && fs.readFileSync(cle, 'utf8') === cleVoix(i)) return; // voix déjà fabriquée pour ce texte et ce réglage
    fs.writeFileSync(cle, cleVoix(i));
    // voix du propriétaire : un enregistrement par réplique (v00.wav, v01.wav…) dans le dossier donné par --voix-perso, sans réglage de hauteur
    const perso = arg('voix-perso', '') && path.join(arg('voix-perso', ''), `v${sh(i)}.wav`);
    if (perso && fs.existsSync(perso)) { ff('-i', perso, '-af', `aresample=44100,silenceremove=start_periods=1:start_threshold=-45dB,apad=pad_dur=${pauseDe(i)}`, '-ac', '1', fin); return; }
    // `voix` : lecture à voix haute quand elle diffère du texte affiché (nombres, sigles)
    const lire = (t, v) => tts().generate({ text: pourLaVoix(t), sid: Math.min(LOCUTEUR, tts().numSpeakers - 1), speed: v, enableExternalBuffer: false });
    let a;
    if (!STYLE2) a = lire(s.voix || s.texte, VITESSE);
    else { // style 2 : phrase par phrase, avec de vraies respirations (un point, une question, deux-points) et la dernière phrase plus lente si `lent`
      const phrases = (s.voix || s.texte).match(/[^.!?:]+[.!?:]*/g).map(x => x.trim()).filter(x => /[\p{L}\p{N}]/u.test(x)), morceaux = []; let sr0 = 0;
      phrases.forEach((ph, k) => {
        const r = lire(ph, s.lent && k === phrases.length - 1 ? VITESSE * 0.88 : VITESSE); sr0 = r.sampleRate; morceaux.push(r.samples);
        if (k < phrases.length - 1) morceaux.push(new Float32Array(Math.round(r.sampleRate * ({ '?': 0.42, ':': 0.36, '!': 0.28 }[ph.slice(-1)] || 0.26))));
      });
      const tout = new Float32Array(morceaux.reduce((n, m) => n + m.length, 0)); let o = 0; for (const m of morceaux) { tout.set(m, o); o += m.length; }
      a = { samples: tout, sampleRate: sr0 };
    }
    sherpa.writeWave(brut, { samples: a.samples, sampleRate: a.sampleRate });
    // hauteur de la voix de Pico (fiche FICHE-PICO.md) ; Kokoro : durée conservée par atempo ; puis silence de fin
    const sr = a.sampleRate, filtre = `asetrate=${sr}*${HAUTEUR},aresample=44100${KOKORO && HAUTEUR !== 1 ? `,atempo=${(1 / HAUTEUR).toFixed(4)}` : ''},apad=pad_dur=${pauseDe(i)}`;
    ff('-i', brut, '-af', filtre, '-ac', '1', fin);
  });
}
// durée d'un son : lue dans l'en-tête WAV (même valeur que ffprobe, qui n'est pas livré avec QuentMovie), ffprobe pour les autres fichiers
const { dureeWav } = require('./duree');
function duree(f) { const d = dureeWav(f); return d != null ? d : +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim(); }

// ---------- 2. bouche synchronisée : enveloppe de la voix → ouverte / fermée ----------
function bouche(wav) {
  const pcm = execFileSync(FFMPEG, ['-v', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '8000', '-'], { maxBuffer: 1e9 }), n = pcm.length / 2, fen = 80; // 10 ms
  const e = []; for (let i = 0; i + fen <= n; i += fen) { let s = 0; for (let k = 0; k < fen; k++) { const v = pcm.readInt16LE((i + k) * 2) / 32768; s += v * v; } e.push(Math.sqrt(s / fen)); }
  const max = Math.max(...e) || 1, seuil = max * 0.12, par = Math.round(1 / FPS * 100), etat = [];
  for (let t = 0; t < e.length; t += par) { const m = Math.max(...e.slice(t, t + par)); etat.push(m > seuil); }
  // pas de papillonnement : une bouche ne change pas d'état en moins de 3 images (0,1 s)
  for (let i = 1; i < etat.length - 1; i++) if (etat[i] !== etat[i - 1] && etat[i] !== etat[i + 1]) etat[i] = etat[i - 1];
  return etat;
}
// ---------- style 2 : Pico vivant ----------
// bouche à trois positions (fermée, mi-ouverte, ouverte) selon la force de la voix, clignements d'yeux à intervalles irréguliers,
// accents de la phrase (syllabes appuyées) qui font hocher la tête ; même voix = même animation (tirage fixé par la réplique)
function vieDePico(wav, i, nb, expr) {
  const pcm = execFileSync(FFMPEG, ['-v', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '8000', '-'], { maxBuffer: 1e9 }), n = pcm.length / 2, fen = Math.round(8000 / FPS);
  const e = []; for (let k = 0; k < nb; k++) { let s2 = 0, c = 0; for (let j = k * fen; j < Math.min(n, (k + 1) * fen); j++) { const v = pcm.readInt16LE(j * 2) / 32768; s2 += v * v; c++; } e.push(c ? Math.sqrt(s2 / c) : 0); }
  const tri = e.filter(x => x > 0).sort((a, b) => a - b), haut = tri[Math.floor(tri.length * 0.97)] || 1;
  const niv = e.map(x => (x > haut * 0.42 ? 2 : x > haut * 0.12 ? 1 : 0));
  for (let k = 1; k < niv.length - 1; k++) if (niv[k] !== niv[k - 1] && niv[k] !== niv[k + 1]) niv[k] = niv[k - 1]; // pas de papillonnement (une image isolée)
  // accents : la voix repart fort après un creux ; les plus marqués, espacés d'au moins 0,7 s, huit au plus
  const accents = []; for (let k = 3; k < nb; k++) if (niv[k] === 2 && niv[k - 3] === 0 && e[k] > haut * 0.55) accents.push({ t: k / FPS, f: e[k] });
  const choisis = []; for (const a of accents.sort((x, y) => y.f - x.f)) if (choisis.length < 8 && choisis.every(c => Math.abs(c.t - a.t) >= 0.7)) choisis.push(a);
  // clignements : toutes les 2,2 à 4,8 s (parfois deux de suite), 3 images ; jamais pour l'expression aux yeux rieurs (déjà fermés)
  const cligne = new Array(nb).fill(false);
  if (expr !== 'content') { let x = (i + 1) * 9301 % 233280, t = 0.5 + (x % 1000) / 1000 * 1.6; const alea = () => (x = (x * 9301 + 49297) % 233280) / 233280;
    while (t * FPS < nb - 3) { const k = Math.round(t * FPS); for (let j = k; j < k + 3 && j < nb; j++) cligne[j] = true; if (alea() < 0.12 && k + 9 < nb) for (let j = k + 6; j < k + 9; j++) cligne[j] = true; t += 2.2 + alea() * 2.6; } }
  return { niv, cligne, accents: choisis.map(a => a.t).sort((a, b) => a - b) };
}
const NIVEAUX = ['ferme', 'mi', 'ouvert'];
function spriteVivant(expr, niv, cligne) {
  const f = (n, c) => path.join(PICO, `pico-${expr}-${NIVEAUX[n]}${c ? '-cligne' : ''}.png`);
  for (const n of [niv, niv === 1 ? 2 : 1, niv === 0 ? 1 : 0, niv === 2 ? 0 : 2]) { if (cligne && fs.existsSync(f(n, true))) return f(n, true); if (fs.existsSync(f(n, false))) return f(n, false); }
  return spritePico(expr, niv > 0);
}
const spritePico = (expr, ouvert) => { const f = (o) => path.join(PICO, `pico-${expr}-${o ? 'ouvert' : 'ferme'}.png`); return fs.existsSync(f(ouvert)) ? f(ouvert) : f(!ouvert); };

// ---------- 3. écrans animés (images) ----------
// ---------- photos et vidéos en fond (clé `fond` d'une réplique : { fichier | url, credit, sombre, debut }) ----------
// `fichier` : chemin absolu ou relatif au dossier medias/ ; `url` : téléchargée une fois dans medias/cache. Le média reste jusqu'au prochain nouvel écran.
const MEDIAS = process.env.QI_MEDIAS || path.join(__dirname, '..', 'medias'), FONDS = [];
function resoudreFond(f, type) {
  if (!f) return null;
  let fichier = f.fichier ? (path.isAbsolute(f.fichier) ? f.fichier : path.join(MEDIAS, f.fichier)) : null;
  if (!fichier && f.url) {
    const ext = (f.url.split('?')[0].match(/\.(jpe?g|png|webp|mp4|webm|mov|m4v)$/i) || ['', '.jpg'])[0].toLowerCase();
    fichier = path.join(MEDIAS, 'cache', crypto.createHash('md5').update(f.url).digest('hex').slice(0, 12) + ext);
    if (!fs.existsSync(fichier)) { fs.mkdirSync(path.dirname(fichier), { recursive: true }); execFileSync('curl', ['-sSL', '-m', '120', '-A', 'QuentInvestBot/1.0 (educational video project)', '-o', fichier, f.url]); }
  }
  if (!fichier || !fs.existsSync(fichier)) throw new Error('Média de fond introuvable : ' + (f.fichier || f.url));
  return { fichier, video: /\.(mp4|webm|mov|m4v)$/i.test(fichier), sombre: f.sombre != null ? !!f.sombre : type !== 'visuel', debut: +f.debut || 0 };
}
function preparerFonds() { let courant = null; EP.scenes.forEach((s, i) => { if (s.ecran !== '=' || i === 0) courant = resoudreFond(s.fond, s.ecran && s.ecran.type); else if (s.fond) courant = resoudreFond(s.fond, null); FONDS[i] = courant; }); }
const EVENTS = []; // EVENTS[i] = instants (s) où un élément apparaît dans l'écran de la réplique i (style 2 : posent les bruitages)
const ANIM = []; // ANIM[i] = nombre d'images d'animation de l'écran de la réplique i (0 : l'écran de la réplique précédente continue)
async function images() {
  const { image } = require('./ecrans');
  // navigateur ouvert seulement si un écran est à dessiner : les écrans déjà dessinés pour le même contenu sont gardés (clé = page + réglages)
  let b = null, p = null;
  const page = async () => {
    if (p) return p;
    let pw; try { pw = require(process.env.PW || 'playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
    b = await pw.chromium.launch({ executablePath: process.env.QS_CHROMIUM || undefined, args: ['--no-sandbox'] });
    p = await b.newPage({ viewport: { width: LARG, height: HAUT } }); return p;
  };
  preparerFonds();
  let ecran = null, section = '', gardes = 0;
  for (let i = 0; i < EP.scenes.length; i++) {
    const s = EP.scenes[i], nouveau = s.ecran !== '=', fichierAnim = path.join(TRAVAIL, 'images', `a${sh(i)}.json`);
    if (nouveau) ecran = s.ecran; if (s.section) section = s.section;
    const dVoix = duree(wavDe(i)) - pauseDe(i);
    const html = image(ecran, { section, mention: EP.mention, chaine: EP.chaine, sources: EP.sources, duree: dVoix, style: EP.style, vertical: VERT, transp: !!FONDS[i] });
    const cle = crypto.createHash('md5').update(JSON.stringify([html, nouveau, STYLE2, ANIM_MAX, FPS, LARG, HAUT, !!FONDS[i]])).digest('hex'), fCle = path.join(TRAVAIL, 'images', `i${sh(i)}.cle`);
    const deja = (() => { try { return fs.readFileSync(fCle, 'utf8') === cle && JSON.parse(fs.readFileSync(path.join(TRAVAIL, 'images', `e${sh(i)}.json`), 'utf8')); } catch (e) { return null; } })();
    if (deja && fs.existsSync(path.join(TRAVAIL, 'images', `i${sh(i)}-fin.png`))) {
      ANIM[i] = deja.n; EVENTS[i] = deja.events; gardes++;
      process.stdout.write(`\rÉcrans ${i + 1}/${EP.scenes.length} (gardé)   `); progres({ etape: 'ecrans', i: i + 1, n: EP.scenes.length }); continue;
    }
    fs.rmSync(fCle, { force: true });
    const pg = await page();
    await pg.setContent(html, { waitUntil: 'load' });
    await pg.evaluate(() => window.PRET);
    let n = 0; EVENTS[i] = STYLE2 && nouveau ? await pg.evaluate(() => window.EVENTS || []) : [];
    if (nouveau) {
      n = Math.ceil(Math.min(await pg.evaluate(() => window.FIN), ANIM_MAX) * FPS);
      for (let k = 0; k < n; k++) { await pg.evaluate(t => window.setT(t), k / FPS); await pg.screenshot({ path: path.join(TRAVAIL, 'images', `i${sh(i)}-${sh(k, 3)}.png`), omitBackground: !!FONDS[i] }); }
    }
    await pg.evaluate(() => window.setT(1e3));
    await pg.screenshot({ path: path.join(TRAVAIL, 'images', `i${sh(i)}-fin.png`), omitBackground: !!FONDS[i] });
    ANIM[i] = n; fs.writeFileSync(fichierAnim, String(n));
    fs.writeFileSync(path.join(TRAVAIL, 'images', `e${sh(i)}.json`), JSON.stringify({ n, events: EVENTS[i] })); fs.writeFileSync(fCle, cle);
    process.stdout.write(`\rÉcrans ${i + 1}/${EP.scenes.length} (${n} images)   `); progres({ etape: 'ecrans', i: i + 1, n: EP.scenes.length });
  }
  console.log(gardes ? `\n${gardes} écran(s) gardé(s) de la fabrication précédente` : ''); if (b) await b.close();
}

// ---------- 4. une vidéo par réplique : écran animé + Pico (bouche, entrée, rebond) ----------
// Niveau des bruitages : mesuré par rapport à la voix de chaque réplique (et non réglé « à l'oreille » : les fichiers de bruitage sont bien plus forts que la voix de synthèse).
// Demande du propriétaire : bruitages bien plus discrets que la voix. Réglages successifs : −5 dB (30 % de moins), −10 dB, puis −20 dB
// (la sensation de volume est divisée par deux tous les −10 dB). Réglable : clé `sons.effetsDb` du fichier d'épisode.
const EFFETS_DB = EP.sons && EP.sons.effetsDb != null ? EP.sons.effetsDb : -20;
const { spawnSync } = require('child_process');
const rmsDb = (f, filtre) => { const r = spawnSync(FFMPEG, ['-v', 'info', '-i', f, '-af', `${filtre ? filtre + ',' : ''}astats=metadata=0`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1e8 }), m = [...(r.stderr || '').matchAll(/RMS level dB:\s*(-?[\d.]+)/g)]; return m.length ? +m[m.length - 1][1] : -30; };
const RMS_SON = {}, rmsSon = f => RMS_SON[f] != null ? RMS_SON[f] : (RMS_SON[f] = rmsDb(f, 'silenceremove=stop_periods=-1:stop_threshold=-50dB'));
const rmsVoix = wav => rmsDb(wav, 'silenceremove=stop_periods=-1:stop_threshold=-40dB:stop_duration=0.15'); // niveau de la voix quand elle parle (sans les silences)
const SFX = { baisse: 'baisse', hausse: 'hausse', pieces: 'pieces', ding: 'ding-cloche', succes: 'succes', impact: 'impact-leger' };
// style 2 : bruitages discrets posés sur les animations (pop quand un élément arrive, whoosh à chaque nouvel écran, effet choisi pour la révélation)
function bruitages(i, d) {
  const s = EP.scenes[i], l = [];
  if (i > 0 && s.ecran !== '=') l.push(['whoosh-court', 0.02, 0.8]);
  let dernier = -1, n = 0;
  for (const t of EVENTS[i] || []) if (t > 0.25 && t - dernier >= 0.45 && n < 6 && t < d - 0.4) { l.push(['pop', t, 0.8]); dernier = t; n++; }
  if (s.effet && SFX[s.effet]) l.push([SFX[s.effet], s.effetT != null ? s.effetT : 0.9, 1]);
  const voix = rmsVoix(wavDe(i)); // chaque son est calé à (niveau de la voix + EFFETS_DB), quel que soit son niveau d'origine ; v = poids relatif (1 = niveau cible)
  return l.map(([nom, t, v]) => ({ f: path.join(SONS, nom + '.mp3'), t, v })).filter(x => fs.existsSync(x.f)).map(x => ({ ...x, db: +(voix + EFFETS_DB + 20 * Math.log10(x.v) - rmsSon(x.f)).toFixed(2) }));
}
// Pico : angle (rad) selon le geste de la réplique ; `pointe` se penche vers l'écran, `hoche` acquiesce, `penche` est intrigué
const angleDe = (s, debut, accents = []) => {
  const vie = `0.022*sin(2*PI*(t+${debut.toFixed(2)})/3.3)${accents.map(a => `+0.03*exp(-pow((t-${a.toFixed(2)})/0.16,2))`).join('')}`;
  return { pointe: `${vie}-0.11*min(1,t/0.35)`, hoche: `${vie}+if(lt(t,2.7),0.07*sin(2*PI*t/0.9)*min(1,t/0.3),0)`, penche: `${vie}+0.12*min(1,t/0.4)` }[s.geste] || vie;
};

// groupes d'écrans : le zoom lent du fond continue d'une réplique à l'autre tant que l'écran reste le même
let GROUPES = [];
function groupes(durees) {
  const g = []; let debut = 0, t = 0;
  EP.scenes.forEach((s, i) => { if (s.ecran !== '=' || i === 0) { debut = i; t = 0; } g[i] = { debut, t0: t }; t += durees[i]; });
  const tot = {}; EP.scenes.forEach((s, i) => { tot[g[i].debut] = (tot[g[i].debut] || 0) + durees[i]; });
  EP.scenes.forEach((s, i) => { g[i].T = tot[g[i].debut]; });
  return g;
}

// une réplique déjà encodée avec exactement la même commande, la même voix et les mêmes écrans est gardée (refaire une réplique ne refait pas les autres)
function ffClip(i, out, ...args) { // args : la commande FFmpeg complète (fichier de sortie compris)
  const lire = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return ''; } };
  const cle = crypto.createHash('md5').update(JSON.stringify([args, lire(path.join(TRAVAIL, 'audio', `v${sh(i)}.cle`)), lire(path.join(TRAVAIL, 'images', `i${sh(i)}.cle`))])).digest('hex');
  const fCle = path.join(TRAVAIL, 'clips', `scene${sh(i)}.cle`);
  if (fs.existsSync(out) && lire(fCle) === cle) return;
  fs.rmSync(fCle, { force: true }); ff(...args); fs.writeFileSync(fCle, cle);
}
function clip(i, debut) {
  const s = EP.scenes[i], wav = wavDe(i), d = duree(wav), nb = Math.round(d * FPS), etat = STYLE2 ? null : bouche(wav), vie = STYLE2 ? vieDePico(wav, i, nb, s.expr) : null, imgs = path.join(TRAVAIL, 'images');
  const fond = [], nAnim = Math.min(ANIM[i], nb);
  for (let k = 0; k < nAnim; k++) fond.push(`file '${path.join(imgs, `i${sh(i)}-${sh(k, 3)}.png`)}'`, `duration ${(1 / FPS).toFixed(5)}`);
  if (nb > nAnim) fond.push(`file '${path.join(imgs, `i${sh(i)}-fin.png`)}'`, `duration ${((nb - nAnim) / FPS).toFixed(5)}`);
  fond.push(fond[fond.length - 2]);
  const runs = []; for (let k = 0; k < nb; k++) {
    const o = vie ? spriteVivant(s.expr, vie.niv[k] || 0, vie.cligne[k]) : spritePico(s.expr, !!etat[Math.min(k, etat.length - 1)] && k < etat.length);
    if (runs.length && runs[runs.length - 1].o === o) runs[runs.length - 1].n++; else runs.push({ o, n: 1 }); }
  const bouches = []; for (const r of runs) bouches.push(`file '${r.o}'`, `duration ${(r.n / FPS).toFixed(5)}`);
  bouches.push(bouches[bouches.length - 2]);
  const lf = path.join(TRAVAIL, 'clips', `fond${sh(i)}.txt`), lb = path.join(TRAVAIL, 'clips', `bouche${sh(i)}.txt`);
  fs.writeFileSync(lf, fond.join('\n')); fs.writeFileSync(lb, bouches.join('\n'));
  // mouvements de Pico : respiration (phase continue d'une réplique à l'autre), rebond quand l'expression change, entrée / sortie sur les côtés
  const entree = (i === 0 || s.entree) ? 'if(lt(t,0.7),900*pow(1-t/0.7,3),0)' : '0';
  const sortie = s.sortie ? `if(gt(t,${(d - pauseDe(i) - 0.5).toFixed(2)}),900*pow((t-${(d - pauseDe(i) - 0.5).toFixed(2)})/0.5,3),0)` : '0';
  const saut = i > 0 && EP.scenes[i - 1].expr !== s.expr || s.saut ? 'if(lt(t,0.35),-26*sin(PI*t/0.35),0)' : '0';
  // style 2 : la tête plonge légèrement sur chaque syllabe appuyée (comme quelqu'un qui insiste sur un mot)
  const hoche = vie && vie.accents.length ? vie.accents.map(a => `+9*exp(-pow((t-${a.toFixed(2)})/0.14,2))`).join('') : '';
  const respire = `7*sin(2*PI*(t+${debut.toFixed(2)})/2.4)${hoche}`;
  const out = path.join(TRAVAIL, 'clips', `scene${sh(i)}.mp4`);
  if (!STYLE2) { // épisodes 1 et 2 : rendu d'origine
    const filtre = `[0:v]fps=${FPS}[b];[1:v]fps=${FPS},scale=-1:690[p];[b][p]overlay=x='W-w-80+${entree}+${sortie}':y='H-h-240+${respire}+${saut}',format=yuv420p[v]`;
    ffClip(i, out, '-f', 'concat', '-safe', '0', '-i', lf, '-f', 'concat', '-safe', '0', '-i', lb, '-i', wav, '-filter_complex', filtre, '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-t', d.toFixed(3), '-movflags', '+faststart', out);
    return { out, d };
  }
  // style 2 : zoom lent du fond (de 1 à 1,03 sur la durée de l'écran), Pico qui se penche / hoche, bruitages
  // durée calée sur un nombre entier d'images : le montage de QuentMovie recolle alors les répliques sans réencoder (sinon une image d'écart bascule sur l'assemblage complet)
  const dImages = nb / FPS;
  const g = GROUPES[i], z = `(1+0.03*min(1,(${g.t0.toFixed(3)}+t)/${g.T.toFixed(3)}))`;
  const F = FONDS[i], fondZ = `[0:v]fps=${FPS},scale=w='trunc(${LARG}*${z}/2)*2':h='trunc(${HAUT}*${z}/2)*2':eval=frame,crop=${LARG}:${HAUT}${F ? ',format=rgba' : ''}[b]`;
  const hp = VERT ? 480 : 690, marge = 40, px = VERT ? 'W-w' : 'W-w-40', py = VERT ? '840' : 'H-h-200'; // position de Pico (marge transparente de 40 px autour pour la rotation)
  const px2 = `${px}+${entree}+${sortie}${s.geste === 'pointe' ? '-40*min(1,t/0.35)' : ''}`;
  const pico = `[1:v]fps=${FPS},scale=-1:${hp},format=rgba,pad=w=iw+${marge * 2}:h=ih+${marge * 2}:x=${marge}:y=${marge}:color=black@0,rotate=a='${angleDe(s, debut, vie ? vie.accents : [])}':c=none[p]`;
  const sons = bruitages(i, d), entrees = [], mix = [`[2:a]aformat=sample_rates=44100:channel_layouts=mono[v0]`];
  sons.forEach((x, k) => { entrees.push('-i', x.f); mix.push(`[${3 + k}:a]aformat=sample_rates=44100:channel_layouts=mono,adelay=${Math.round(x.t * 1000)},volume=${x.db}dB[s${k}]`); });
  const audio = sons.length ? `${mix.join(';')};[v0]${sons.map((_, k) => `[s${k}]`).join('')}amix=inputs=${sons.length + 1}:duration=first:normalize=0[a]` : mix[0].replace('[v0]', '[a]');
  // photo ou vidéo en fond : cadrée plein écran (assombrie sous le texte), zoom lent sur une photo, lecture en boucle pour une vidéo ; l'écran transparent est posé dessus
  let entreeFond = [], composition = '[b]', fondMedia = '';
  if (F) {
    const iFond = 3 + sons.length, sombre = F.sombre ? ',eq=brightness=-0.2:contrast=0.9:saturation=0.85,gblur=sigma=1' : '' /* photo un peu adoucie ; le voile dégradé de l'écran (ecrans.js) garde le texte lisible */, f0 = Math.round(g.t0 * FPS), fT = Math.max(1, Math.round(g.T * FPS));
    if (F.video) { entreeFond = ['-stream_loop', '-1', '-ss', (F.debut + g.t0).toFixed(2), '-i', F.fichier]; fondMedia = `[${iFond}:v]fps=${FPS},scale=${LARG}:${HAUT}:force_original_aspect_ratio=increase,crop=${LARG}:${HAUT}${sombre}[m]`; }
    else { entreeFond = ['-loop', '1', '-framerate', String(FPS), '-t', d.toFixed(3), '-i', F.fichier]; fondMedia = `[${iFond}:v]scale=${LARG * 2}:${HAUT * 2}:force_original_aspect_ratio=increase,crop=${LARG * 2}:${HAUT * 2},zoompan=z='1+0.12*(${f0}+on)/${fT}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${LARG}x${HAUT}:fps=${FPS}${sombre}[m]`; }
    composition = '[m][b]overlay=0:0:format=auto[bm];[bm]';
  }
  const filtre = `${F ? fondMedia + ';' : ''}${fondZ};${pico};${composition}[p]overlay=x='${px2}':y='${py}+${respire}+${saut}',setsar=1,format=yuv420p[v];${audio}`;
  ffClip(i, out, '-f', 'concat', '-safe', '0', '-i', lf, '-f', 'concat', '-safe', '0', '-i', lb, '-i', wav, ...entrees, ...entreeFond, '-filter_complex', filtre, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-t', dImages.toFixed(5), '-movflags', '+faststart', out);
  return { out, d: dImages };
}

// ---------- contrôle du rythme (style 2) : accroche, appel à s'abonner, écrans qui durent, phrases longues ----------
function controle(durees) {
  const alertes = [], tc = []; let t = 0; EP.scenes.forEach((s, i) => { tc[i] = t; t += durees[i]; });
  const g = groupes(durees), mots = s => (s.texte.match(/\S+/g) || []).length;
  if (durees[0] > 9) alertes.push(`Accroche trop longue (${durees[0].toFixed(1)} s) : vise 8 s au plus avant le premier changement d'écran.`);
  const chiffre = JSON.stringify(EP.scenes[0].ecran) + EP.scenes[0].texte;
  if (!/\d/.test(chiffre) && !/\?/.test(EP.scenes[0].texte)) alertes.push('La première réplique n’a ni chiffre ni question : mets le chiffre choc à l’écran dès la première seconde.');
  const ia = EP.scenes.findIndex(s => (s.ecran !== '=' && s.ecran.type === 'abonne') || /abonne/i.test(s.texte));
  if (ia < 0) alertes.push('Aucun appel à s’abonner : place-le dans les 20 premières secondes.');
  else if (tc[ia] > 20) alertes.push(`L’appel à s’abonner arrive à ${tc[ia].toFixed(0)} s : avance-le avant 20 s.`);
  const vus = new Set(); EP.scenes.forEach((s, i) => { if (!vus.has(g[i].debut)) { vus.add(g[i].debut); if (g[i].T > 18) alertes.push(`L’écran de la réplique ${g[i].debut + 1} reste ${g[i].T.toFixed(0)} s : coupe-le en deux écrans ou ajoute un exemple.`); } });
  EP.scenes.forEach((s, i) => { if (mots(s) > 45) alertes.push(`Réplique ${i + 1} : ${mots(s)} mots, c’est long ; une idée par réplique.`); });
  const total = durees.reduce((a, b) => a + b, 0);
  console.log(`Contrôle du rythme : ${Math.floor(total / 60)} min ${Math.round(total % 60)} s, ${EP.scenes.length} répliques.`);
  console.log(alertes.length ? alertes.map(a => ' · ' + a).join('\n') : ' · Rien à signaler.');
}

// ---------- sous-titres : phrases coupées en morceaux courts, répartis selon la longueur du texte ----------
// style 2 : morceaux de taille égale, coupés de préférence à une virgule et jamais après un petit mot (« au début des | années » → « au début | des années »)
const PETIT_MOT = /^(?:de|du|des|un|une|le|la|les|à|au|aux|en|et|ou|où|ce|cet|cette|ces|son|sa|ses|mon|ma|mes|ton|ta|tes|nos|vos|leur|leurs|qui|que|dont|pour|par|sur|avec|dans|sans|ne|pas|se|y|il|elle|on|tu|je|nous|vous|ils|elles|plus|très|mais|car|si|tout|toute|tous|[dlnsjcm]['’]\p{L}{0,4}|qu['’]\p{L}{0,4})$/iu;
function decouperPhrase(mots, par) {
  const k = Math.ceil(mots.length / par), coupes = [0];
  for (let j = 1; j < k; j++) {
    const prec = coupes[coupes.length - 1], cible = Math.round(j * mots.length / k); let c = cible;
    for (const d of [0, 1, -1, 2, -2]) { const x = cible + d; if (x > prec + 1 && x < mots.length && /[,;]$/.test(mots[x - 1])) { c = x; break; } }
    while (c > prec + 2 && PETIT_MOT.test(mots[c - 1].replace(/[,;:.!?…]+$/, ''))) c--;
    coupes.push(c);
  }
  return coupes.map((c, j) => mots.slice(c, coupes[j + 1] || mots.length).join(' ')).filter(Boolean);
}
function sousTitres(texte, voixDuree, par = 8) {
  const morceaux = []; for (const ph of texte.match(/[^.!?:]+[.!?:]*/g) || [texte]) { const mots = ph.trim().split(/\s+/).filter(Boolean);
    if (STYLE2) morceaux.push(...decouperPhrase(mots, par)); else for (let k = 0; k < mots.length; k += par) morceaux.push(mots.slice(k, k + par).join(' ')); }
  const total = morceaux.reduce((a, m) => a + m.length, 0); let t = 0;
  return morceaux.map(m => { const dd = voixDuree * m.length / total, o = { s: +t.toFixed(2), e: +(t + dd).toFixed(2), t: m.replace(/[:]$/, '') }; t += dd; return o; });
}

// ---------- 4. montage et export par QuentMovie ----------
async function montage(clips) {
  const { create } = require(path.join(QM, 'server.js')), { resolveFfmpeg } = require(path.join(QM, 'ffmpeg-path.js'));
  const base = path.join(TRAVAIL, 'quentmovie'); fs.mkdirSync(base, { recursive: true });
  // montage par le processeur : la lecture par la puce perdait une image et faisait échouer l'assemblage sur Mac
  const app = create({ port: 0, base, ...(await resolveFfmpeg()), sansPuce: true }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const liste = [];
  EP.scenes.forEach((s, i) => {
    const nom = `pico-${sh(i)}.mp4`; fs.copyFileSync(clips[i].out, path.join(base, 'medias', nom));
    const suivante = EP.scenes[i + 1];
    liste.push({ nom, d: clips[i].d, subs: sousTitres(s.texte, Math.max(0.5, clips[i].d - (suivante && !suivante.section ? PAUSE : PAUSE_SECTION)), VERT ? 3 : 8), fondu: !!(suivante && suivante.section) });
  });
  return { app, port, U, liste, base };
}
async function exporter() {
  const durees = EP.scenes.map((_, i) => duree(wavDe(i)));
  if (STYLE2) { GROUPES = groupes(durees); controle(durees); }
  // rapport de fabrication : début et durée de chaque réplique (chapitres de la description : `debutExport` tient compte des fondus de 0,5 s entre sections, qui raccourcissent la vidéo)
  const debuts = []; durees.reduce((t, d, i) => (debuts[i] = t, t + d), 0);
  fs.writeFileSync(path.join(TRAVAIL, 'rapport.json'), JSON.stringify({ duree: +durees.reduce((a, b) => a + b, 0).toFixed(2), scenes: EP.scenes.map((s, i) => ({ debut: +debuts[i].toFixed(2), debutExport: +(debuts[i] - 0.5 * EP.scenes.slice(1, i + 1).filter(x => x.section).length).toFixed(2), duree: +durees[i].toFixed(2), section: s.section || '' })) }));
  let t0 = 0; const clips = EP.scenes.map((_, i) => { progres({ etape: 'clips', i: i + 1, n: EP.scenes.length }); const c = clip(i, t0); t0 += c.d; return c; }), M = await montage(clips);
  await Promise.all(M.liste.map(async c => { await fetch(M.U('/api/import?name=' + c.nom), { method: 'POST', body: fs.readFileSync(path.join(M.base, 'medias', c.nom)) }); }));
  // musique de la bibliothèque de QuentMovie : la fiche donne son nom (« documentaire-doux »), le montage lit « lib:musiques/documentaire-doux.mp3 »
  // (le nom seul n'était pas trouvé et la musique disparaissait sans prévenir ; épisodes 1 et 2 : rendu d'origine gardé)
  const lib = id => 'lib:' + (STYLE2 && !/\//.test(id) ? `musiques/${id}.mp3` : id);
  const projet = {
    format: VERT ? 'vertical' : 'horizontal', res: 1080, fps: FPS, quality: 'rapide', sortie: 'mp4', normaliser: true, pistes: [], textes: [], markers: [],
    clips: M.liste.map(c => ({ file: c.nom, kind: 'video', in: 0, out: +c.d.toFixed(STYLE2 ? 6 : 3), dur: +c.d.toFixed(STYLE2 ? 6 : 3), speed: 1, vol: 100, hasAudio: true, fx: [], afx: [], overlays: [], key: { on: false }, subs: c.subs, subStyle: VERT ? 'tiktok' : 'bandeau', subSize: VERT ? 5.6 : STYLE2 ? 4.6 : 4, ...(VERT && STYLE2 ? { subY: 0.755 } : {}), // vertical : sous Pico (au milieu de l'image), au-dessus de la légende de TikTok
      transition: c.fondu ? { type: 'fade', dur: 0.5 } : null })),
    audio: EP.musiqueRevelation && STYLE2 // la musique change au chiffre clé : douce avant, plus vivante après
      ? [{ file: lib(EP.musique), vol: 15, start: 0, dur: +debuts[EP.musiqueRevelation.scene].toFixed(2), fade: true, loop: true, duck: true },
         { file: lib(EP.musiqueRevelation.id), vol: 15, start: +debuts[EP.musiqueRevelation.scene].toFixed(2), fade: true, loop: true, duck: true }]
      : [{ file: lib(EP.musique), vol: 15, start: 0, fade: true, loop: true, duck: true }]
  };
  projet.clips[projet.clips.length - 1].transition = null;
  fs.writeFileSync(path.join(TRAVAIL, 'projet-quentmovie.json'), JSON.stringify(projet));
  // montage par le processeur (serveur créé avec sansPuce)
  projet.quality = 'rapide';
  const { id } = await (await fetch(M.U('/api/export'), { method: 'POST', body: JSON.stringify({ project: projet }) })).json();
  await suivreExport(M, id);
  await M.app.stop?.(); process.exit(0);
}
async function suivreExport(M, id) {
  for (;;) {
    const j = await (await fetch(M.U('/api/job?id=' + id))).json();
    if (j.error) throw new Error(j.error);
    if (j.done) { const dest = path.join(TRAVAIL, 'episode.mp4'); fs.copyFileSync(path.join(M.base, 'exports', j.out), dest); console.log('Vidéo :', dest, '·', j.duree ? Math.round(j.duree) + ' s' : '', j.assemblage ? '· assemblage ' + j.assemblage + (j.raisonRapide ? ' (' + j.raisonRapide + ')' : '') : ''); break; }
    process.stdout.write(`\r${j.step || ''} ${j.progress ? Math.round(j.progress * 100) + ' %' : ''}   `); progres({ etape: 'export', p: j.progress || 0, step: j.step || '' }); await new Promise(r => setTimeout(r, 1000));
  }
}

(async () => {
  synthese();
  // une vidéo YouTube (16:9, style 2) fait au moins 5 minutes : on s'arrête avant le montage, long et inutile, si la voix est plus courte
  if (STYLE2 && !VERT && !process.argv.includes('--court')) { const total = EP.scenes.reduce((t, _, i) => t + duree(wavDe(i)), 0); if (total < 300) { console.error(`Vidéo trop courte : ${Math.floor(total / 60)} min ${Math.round(total % 60)} s. Une vidéo YouTube dure au moins 5 minutes : ajoute du contenu à la fiche (ou --court pour passer outre).`); process.exit(2); } }
  if (process.argv.includes('--controle')) { controle(EP.scenes.map((_, i) => duree(wavDe(i)))); return; }
  await images(); await exporter();
})().catch(e => { console.error(e); process.exit(1); });
