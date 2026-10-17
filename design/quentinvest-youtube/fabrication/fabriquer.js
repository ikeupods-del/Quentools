// Pico — fabrique l'épisode de bout en bout :
//   1. voix Piper (même modèle que QuentMovie) + réglage de la voix de Pico, 2. images avec bouche synchronisée sur la voix,
//   3. une vidéo par réplique, 4. montage et export par le moteur de QuentMovie (fondus, sous-titres, musique, volume).
// Voix : Piper (upmc, épisode 1) ou Kokoro (voix « siwis » abaissée, à partir de l'épisode 2) — réglées dans la clé `voix` du fichier de l'épisode.
// Écrans animés : les images de chaque écran sont rendues image par image (ecrans.js), Pico est posé par-dessus par FFmpeg (bouche, entrée, rebond).
// Usage : node fabriquer.js <episode.json> [--voix <dossier du modèle>] [--sortie <dossier>] [--locuteur 0|1] [--vitesse 0.85]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const fichier = process.argv[2];
if (!fichier || fichier.startsWith('--')) { console.log('Usage : node fabriquer.js <episode.json> [--voix <dossier>] [--sortie <dossier>] [--locuteur 0|1] [--vitesse 0.85]'); process.exit(1); }
const EP = JSON.parse(fs.readFileSync(fichier, 'utf8'));
const V = EP.voix || { moteur: 'piper' }; // { moteur: 'piper'|'kokoro', sid, vitesse, hauteur }
const KOKORO = V.moteur === 'kokoro';
const TRAVAIL = path.resolve(arg('sortie', path.join(os.tmpdir(), 'pico-episode')));
const MODELES = path.join(os.homedir(), 'Movies', 'QuentMovie', 'modeles');
const VOIX = arg('voix', path.join(MODELES, KOKORO ? 'kokoro-multi-lang-v1_0' : 'vits-piper-fr_FR-upmc-medium'));
const LOCUTEUR = +arg('locuteur', V.sid != null ? V.sid : 1); // Piper upmc : 0 = Jessica, 1 = Pierre · Kokoro : 30 = voix française « siwis »
const QM = path.join(__dirname, '..', '..', '..', 'quentmovie');
const PICO = path.join(__dirname, '..', 'personnage', 'png');
const VITESSE = +arg('vitesse', V.vitesse || 0.65); // allure de la voix (1 = normale)
const HAUTEUR = V.hauteur || (KOKORO ? 1 : 1.08); // > 1 : plus aiguë (Pico, fourmi), < 1 : plus grave (durée conservée avec Kokoro)
const FPS = 30, PAUSE = 0.35, PAUSE_SECTION = 0.8, ANIM_MAX = 14;
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...a], { maxBuffer: 1e8 });
const sh = (n, d = 2) => String(n).padStart(d, '0');
for (const d of ['audio', 'images', 'clips']) fs.mkdirSync(path.join(TRAVAIL, d), { recursive: true });
const wavDe = i => path.join(TRAVAIL, 'audio', `v${sh(i)}.wav`);
const pauseDe = i => { const suivante = EP.scenes[i + 1]; return !suivante || suivante.section ? PAUSE_SECTION : PAUSE; };

// ---------- 1. voix ----------
function synthese() {
  const sherpa = require(process.env.SHERPA || 'sherpa-onnx-node'), { pourLaVoix } = require(path.join(QM, 'voix-texte.js'));
  const modele = KOKORO
    ? { kokoro: { model: path.join(VOIX, 'model.onnx'), voices: path.join(VOIX, 'voices.bin'), tokens: path.join(VOIX, 'tokens.txt'), dataDir: path.join(VOIX, 'espeak-ng-data'), dictDir: path.join(VOIX, 'dict'), lexicon: [path.join(VOIX, 'lexicon-gb-en.txt'), path.join(VOIX, 'lexicon-zh.txt')].join(','), lang: 'fr' } }
    : { vits: { model: path.join(VOIX, fs.readdirSync(VOIX).find(n => n.endsWith('.onnx'))), tokens: path.join(VOIX, 'tokens.txt'), dataDir: path.join(VOIX, 'espeak-ng-data') } };
  const tts = new sherpa.OfflineTts({ model: { ...modele, numThreads: 2, debug: false, provider: 'cpu' }, maxNumSentences: 2 });
  EP.scenes.forEach((s, i) => {
    const brut = path.join(TRAVAIL, 'audio', `b${sh(i)}.wav`), fin = wavDe(i);
    if (fs.existsSync(fin)) return;
    // `voix` : lecture à voix haute quand elle diffère du texte affiché (nombres, sigles)
    const a = tts.generate({ text: pourLaVoix(s.voix || s.texte), sid: Math.min(LOCUTEUR, tts.numSpeakers - 1), speed: VITESSE, enableExternalBuffer: false });
    sherpa.writeWave(brut, { samples: a.samples, sampleRate: a.sampleRate });
    // hauteur de la voix de Pico (fiche FICHE-PICO.md) ; Kokoro : durée conservée par atempo ; puis silence de fin
    const sr = a.sampleRate, filtre = `asetrate=${sr}*${HAUTEUR},aresample=44100${KOKORO && HAUTEUR !== 1 ? `,atempo=${(1 / HAUTEUR).toFixed(4)}` : ''},apad=pad_dur=${pauseDe(i)}`;
    ff('-i', brut, '-af', filtre, '-ac', '1', fin);
  });
}
function duree(f) { return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim(); }

// ---------- 2. bouche synchronisée : enveloppe de la voix → ouverte / fermée ----------
function bouche(wav) {
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '8000', '-'], { maxBuffer: 1e9 }), n = pcm.length / 2, fen = 80; // 10 ms
  const e = []; for (let i = 0; i + fen <= n; i += fen) { let s = 0; for (let k = 0; k < fen; k++) { const v = pcm.readInt16LE((i + k) * 2) / 32768; s += v * v; } e.push(Math.sqrt(s / fen)); }
  const max = Math.max(...e) || 1, seuil = max * 0.12, par = Math.round(1 / FPS * 100), etat = [];
  for (let t = 0; t < e.length; t += par) { const m = Math.max(...e.slice(t, t + par)); etat.push(m > seuil); }
  // pas de papillonnement : une bouche ne change pas d'état en moins de 3 images (0,1 s)
  for (let i = 1; i < etat.length - 1; i++) if (etat[i] !== etat[i - 1] && etat[i] !== etat[i + 1]) etat[i] = etat[i - 1];
  return etat;
}
const spritePico = (expr, ouvert) => { const f = (o) => path.join(PICO, `pico-${expr}-${o ? 'ouvert' : 'ferme'}.png`); return fs.existsSync(f(ouvert)) ? f(ouvert) : f(!ouvert); };

// ---------- 3. écrans animés (images) ----------
const ANIM = []; // ANIM[i] = nombre d'images d'animation de l'écran de la réplique i (0 : l'écran de la réplique précédente continue)
async function images() {
  let pw; try { pw = require(process.env.PW || 'playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
  const { image } = require('./ecrans'), b = await pw.chromium.launch({ executablePath: process.env.QS_CHROMIUM || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  let ecran = null, section = '';
  for (let i = 0; i < EP.scenes.length; i++) {
    const s = EP.scenes[i], nouveau = s.ecran !== '=', fichierAnim = path.join(TRAVAIL, 'images', `a${sh(i)}.json`);
    if (nouveau) ecran = s.ecran; if (s.section) section = s.section;
    const dVoix = duree(wavDe(i)) - pauseDe(i);
    await p.setContent(image(ecran, { section, mention: EP.mention, chaine: EP.chaine, sources: EP.sources, duree: dVoix }), { waitUntil: 'load' });
    let n = 0;
    if (nouveau) {
      n = Math.ceil(Math.min(await p.evaluate(() => window.FIN), ANIM_MAX) * FPS);
      for (let k = 0; k < n; k++) { await p.evaluate(t => window.setT(t), k / FPS); await p.screenshot({ path: path.join(TRAVAIL, 'images', `i${sh(i)}-${sh(k, 3)}.png`) }); }
    }
    await p.evaluate(() => window.setT(1e3));
    await p.screenshot({ path: path.join(TRAVAIL, 'images', `i${sh(i)}-fin.png`) });
    ANIM[i] = n; fs.writeFileSync(fichierAnim, String(n));
    process.stdout.write(`\rÉcrans ${i + 1}/${EP.scenes.length} (${n} images)   `);
  }
  console.log(); await b.close();
}

// ---------- 4. une vidéo par réplique : écran animé + Pico (bouche, entrée, rebond) ----------
function clip(i, debut) {
  const s = EP.scenes[i], wav = wavDe(i), d = duree(wav), etat = bouche(wav), nb = Math.round(d * FPS), imgs = path.join(TRAVAIL, 'images');
  const fond = [], nAnim = Math.min(ANIM[i], nb);
  for (let k = 0; k < nAnim; k++) fond.push(`file '${path.join(imgs, `i${sh(i)}-${sh(k, 3)}.png`)}'`, `duration ${(1 / FPS).toFixed(5)}`);
  if (nb > nAnim) fond.push(`file '${path.join(imgs, `i${sh(i)}-fin.png`)}'`, `duration ${((nb - nAnim) / FPS).toFixed(5)}`);
  fond.push(fond[fond.length - 2]);
  const runs = []; for (let k = 0; k < nb; k++) { const o = !!etat[Math.min(k, etat.length - 1)] && k < etat.length; if (runs.length && runs[runs.length - 1].o === o) runs[runs.length - 1].n++; else runs.push({ o, n: 1 }); }
  const bouches = []; for (const r of runs) bouches.push(`file '${spritePico(s.expr, r.o)}'`, `duration ${(r.n / FPS).toFixed(5)}`);
  bouches.push(bouches[bouches.length - 2]);
  const lf = path.join(TRAVAIL, 'clips', `fond${sh(i)}.txt`), lb = path.join(TRAVAIL, 'clips', `bouche${sh(i)}.txt`);
  fs.writeFileSync(lf, fond.join('\n')); fs.writeFileSync(lb, bouches.join('\n'));
  // mouvements de Pico : respiration (phase continue d'une réplique à l'autre), rebond quand l'expression change, entrée / sortie sur les côtés
  const entree = (i === 0 || s.entree) ? 'if(lt(t,0.7),900*pow(1-t/0.7,3),0)' : '0';
  const sortie = s.sortie ? `if(gt(t,${(d - pauseDe(i) - 0.5).toFixed(2)}),900*pow((t-${(d - pauseDe(i) - 0.5).toFixed(2)})/0.5,3),0)` : '0';
  const saut = i > 0 && EP.scenes[i - 1].expr !== s.expr || s.saut ? 'if(lt(t,0.35),-26*sin(PI*t/0.35),0)' : '0';
  const respire = `7*sin(2*PI*(t+${debut.toFixed(2)})/2.4)`;
  const filtre = `[0:v]fps=${FPS}[b];[1:v]fps=${FPS},scale=-1:690[p];[b][p]overlay=x='W-w-80+${entree}+${sortie}':y='H-h-240+${respire}+${saut}',format=yuv420p[v]`;
  const out = path.join(TRAVAIL, 'clips', `scene${sh(i)}.mp4`);
  ff('-f', 'concat', '-safe', '0', '-i', lf, '-f', 'concat', '-safe', '0', '-i', lb, '-i', wav, '-filter_complex', filtre, '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-t', d.toFixed(3), '-movflags', '+faststart', out);
  return { out, d };
}

// ---------- sous-titres : phrases coupées en morceaux courts, répartis selon la longueur du texte ----------
function sousTitres(texte, voixDuree) {
  const morceaux = []; for (const ph of texte.match(/[^.!?:]+[.!?:]*/g) || [texte]) { const mots = ph.trim().split(/\s+/).filter(Boolean); for (let k = 0; k < mots.length; k += 8) morceaux.push(mots.slice(k, k + 8).join(' ')); }
  const total = morceaux.reduce((a, m) => a + m.length, 0); let t = 0;
  return morceaux.map(m => { const dd = voixDuree * m.length / total, o = { s: +t.toFixed(2), e: +(t + dd).toFixed(2), t: m.replace(/[:]$/, '') }; t += dd; return o; });
}

// ---------- 4. montage et export par QuentMovie ----------
async function montage(clips) {
  const { create } = require(path.join(QM, 'server.js')), { resolveFfmpeg } = require(path.join(QM, 'ffmpeg-path.js'));
  const base = path.join(TRAVAIL, 'quentmovie'); fs.mkdirSync(base, { recursive: true });
  const app = create({ port: 0, base, ...(await resolveFfmpeg()) }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const liste = [];
  EP.scenes.forEach((s, i) => {
    const nom = `pico-${sh(i)}.mp4`; fs.copyFileSync(clips[i].out, path.join(base, 'medias', nom));
    const suivante = EP.scenes[i + 1];
    liste.push({ nom, d: clips[i].d, subs: sousTitres(s.texte, Math.max(0.5, clips[i].d - (suivante && !suivante.section ? PAUSE : PAUSE_SECTION))), fondu: !!(suivante && suivante.section) });
  });
  return { app, port, U, liste, base };
}
async function exporter() {
  let t0 = 0; const clips = EP.scenes.map((_, i) => { const c = clip(i, t0); t0 += c.d; return c; }), M = await montage(clips);
  await Promise.all(M.liste.map(async c => { await fetch(M.U('/api/import?name=' + c.nom), { method: 'POST', body: fs.readFileSync(path.join(M.base, 'medias', c.nom)) }); }));
  const projet = {
    format: 'horizontal', res: 1080, fps: FPS, quality: 'rapide', sortie: 'mp4', normaliser: true, pistes: [], textes: [], markers: [],
    clips: M.liste.map(c => ({ file: c.nom, kind: 'video', in: 0, out: +c.d.toFixed(3), dur: +c.d.toFixed(3), speed: 1, vol: 100, hasAudio: true, fx: [], afx: [], overlays: [], key: { on: false }, subs: c.subs, subStyle: 'bandeau', subSize: 4,
      transition: c.fondu ? { type: 'fade', dur: 0.5 } : null })),
    audio: [{ file: 'lib:' + EP.musique, vol: 35, start: 0, fade: true, loop: true, duck: true }]
  };
  projet.clips[projet.clips.length - 1].transition = null;
  fs.writeFileSync(path.join(TRAVAIL, 'projet-quentmovie.json'), JSON.stringify(projet));
  const { id } = await (await fetch(M.U('/api/export'), { method: 'POST', body: JSON.stringify({ project: projet }) })).json();
  for (;;) {
    const j = await (await fetch(M.U('/api/job?id=' + id))).json();
    if (j.error) throw new Error(j.error);
    if (j.done) { const dest = path.join(TRAVAIL, 'episode.mp4'); fs.copyFileSync(path.join(M.base, 'exports', j.out), dest); console.log('Vidéo :', dest, '·', j.duree ? Math.round(j.duree) + ' s' : ''); break; }
    process.stdout.write(`\r${j.step || ''} ${j.progress ? Math.round(j.progress * 100) + ' %' : ''}   `); await new Promise(r => setTimeout(r, 1000));
  }
  await M.app.stop?.(); process.exit(0);
}

(async () => { synthese(); await images(); await exporter(); })().catch(e => { console.error(e); process.exit(1); });
