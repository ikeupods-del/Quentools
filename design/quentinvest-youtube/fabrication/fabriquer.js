// Pico — fabrique l'épisode de bout en bout :
//   1. voix Piper (même modèle que QuentMovie) + réglage de la voix de Pico, 2. images avec bouche synchronisée sur la voix,
//   3. une vidéo par réplique, 4. montage et export par le moteur de QuentMovie (fondus, sous-titres, musique, volume).
// Usage : node fabriquer.js <episode.json> [--voix <dossier du modèle>] [--sortie <dossier>] [--locuteur 0|1]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const fichier = process.argv[2];
if (!fichier || fichier.startsWith('--')) { console.log('Usage : node fabriquer.js <episode.json> [--voix <dossier>] [--sortie <dossier>] [--locuteur 0|1]'); process.exit(1); }
const EP = JSON.parse(fs.readFileSync(fichier, 'utf8'));
const TRAVAIL = path.resolve(arg('sortie', path.join(os.tmpdir(), 'pico-episode')));
const VOIX = arg('voix', path.join(os.homedir(), 'Movies', 'QuentMovie', 'modeles', 'vits-piper-fr_FR-upmc-medium'));
const LOCUTEUR = +arg('locuteur', 1); // 0 = Jessica, 1 = Pierre (voix du modèle upmc)
const QM = path.join(__dirname, '..', '..', '..', 'quentmovie');
const PICO = path.join(__dirname, '..', 'personnage', 'png');
const VITESSE = +arg('vitesse', 0.65); // allure de la voix (1 = normale) : ~175 mots par minute au final
const FPS = 30, PAUSE = 0.35, PAUSE_SECTION = 0.8;
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...a], { maxBuffer: 1e8 });
const sh = (n, d = 2) => String(n).padStart(d, '0');
for (const d of ['audio', 'images', 'clips']) fs.mkdirSync(path.join(TRAVAIL, d), { recursive: true });

// ---------- 1. voix ----------
function synthese() {
  const sherpa = require(process.env.SHERPA || 'sherpa-onnx-node'), { pourLaVoix } = require(path.join(QM, 'voix-texte.js'));
  const onnx = fs.readdirSync(VOIX).find(n => n.endsWith('.onnx'));
  const tts = new sherpa.OfflineTts({ model: { vits: { model: path.join(VOIX, onnx), tokens: path.join(VOIX, 'tokens.txt'), dataDir: path.join(VOIX, 'espeak-ng-data') }, numThreads: 2, debug: false, provider: 'cpu' }, maxNumSentences: 2 });
  EP.scenes.forEach((s, i) => {
    const brut = path.join(TRAVAIL, 'audio', `b${sh(i)}.wav`), fin = path.join(TRAVAIL, 'audio', `v${sh(i)}.wav`);
    if (fs.existsSync(fin)) return;
    const a = tts.generate({ text: pourLaVoix(s.texte), sid: Math.min(LOCUTEUR, tts.numSpeakers - 1), speed: VITESSE, enableExternalBuffer: false });
    sherpa.writeWave(brut, { samples: a.samples, sampleRate: a.sampleRate });
    // voix de Pico : un peu plus aiguë (fiche FICHE-PICO.md), puis silence de fin
    const sr = a.sampleRate, suivante = EP.scenes[i + 1], pause = !suivante || suivante.section ? PAUSE_SECTION : PAUSE;
    ff('-i', brut, '-af', `asetrate=${sr}*1.08,aresample=44100,apad=pad_dur=${pause}`, '-ac', '1', fin);
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

// ---------- 3. images et clips ----------
async function images() {
  let pw; try { pw = require(process.env.PW || 'playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
  const { image, b64 } = require('./ecrans'), b = await pw.chromium.launch({ executablePath: process.env.QS_CHROMIUM || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  let ecran = null, section = '';
  for (let i = 0; i < EP.scenes.length; i++) {
    const s = EP.scenes[i]; if (s.ecran !== '=') ecran = s.ecran; if (s.section) section = s.section;
    for (const ouvert of [false, true]) {
      const out = path.join(TRAVAIL, 'images', `i${sh(i)}-${ouvert ? 'o' : 'f'}.png`);
      await p.setContent(image(ecran, { pico: b64(spritePico(s.expr, ouvert), 'image/png'), section, mention: EP.mention, chaine: EP.chaine, sources: EP.sources }), { waitUntil: 'load' });
      await p.screenshot({ path: out });
    }
  }
  await b.close();
}
function clip(i) {
  const s = EP.scenes[i], wav = path.join(TRAVAIL, 'audio', `v${sh(i)}.wav`), d = duree(wav), etat = bouche(wav), liste = path.join(TRAVAIL, 'clips', `c${sh(i)}.txt`), nb = Math.round(d * FPS);
  const lignes = []; let debut = 0;
  for (let k = 1; k <= nb; k++) if (k === nb || etat[k] !== etat[debut] && k < etat.length || (k >= etat.length && debut < k && etat[Math.min(debut, etat.length - 1)] !== undefined && k === nb)) {
    if (k > debut) { lignes.push(`file '${path.join(TRAVAIL, 'images', `i${sh(i)}-${(etat[debut] ?? false) ? 'o' : 'f'}.png`)}'`, `duration ${((k - debut) / FPS).toFixed(4)}`); debut = k; }
  }
  lignes.push(lignes[lignes.length - 2]);
  fs.writeFileSync(liste, lignes.join('\n'));
  const out = path.join(TRAVAIL, 'clips', `scene${sh(i)}.mp4`);
  ff('-f', 'concat', '-safe', '0', '-i', liste, '-i', wav, '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out);
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
  const clips = EP.scenes.map((_, i) => clip(i)), M = await montage(clips);
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
