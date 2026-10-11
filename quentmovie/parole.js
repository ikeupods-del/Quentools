// QuentMovie : voix naturelles et reconnaissance de la parole, en local (sherpa-onnx, modèles libres).
// - voix Piper (françaises) pour le générateur et les voix off ;
// - reconnaissance Parakeet + détecteur de voix Silero : texte et heure de chaque mot
//   → sous-titres automatiques, coupe des blancs et des hésitations.
// Les modèles se téléchargent une seule fois (dans ~/Movies/QuentMovie/modeles), à la demande.
// Le calcul tourne dans un processus séparé (parole-worker.js).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fork, execFile } = require('child_process');
const { requete } = require('./maj');

const DEPOT = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/';
// Voix Piper françaises, converties pour sherpa-onnx (licences : voir LISEZMOI)
const VOIX = [
  { id: 'siwis', nom: 'Siwis — voix de femme, claire', archive: 'vits-piper-fr_FR-siwis-medium', mo: 64 },
  { id: 'tom', nom: 'Tom — voix d’homme, posée', archive: 'vits-piper-fr_FR-tom-medium', mo: 64 },
  { id: 'upmc-jessica', nom: 'Jessica — voix de femme, douce', archive: 'vits-piper-fr_FR-upmc-medium', mo: 77, locuteur: 0 },
  { id: 'upmc-pierre', nom: 'Pierre — voix d’homme, chaleureuse', archive: 'vits-piper-fr_FR-upmc-medium', mo: 77, locuteur: 1 }
];
const ECOUTE = { archive: 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8', mo: 660 };
const VAD = { fichier: 'silero_vad.onnx' };
// Hésitations retirées des sous-titres et coupées au montage
const HESITATION = /^(euh+|heu+|euhm+|hum+|hm+|mmh*|bah|beh|eh)$/i;

const unpack = p => p.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
function dossierSherpa() {
  const nom = `sherpa-onnx-${os.platform() === 'win32' ? 'win' : os.platform()}-${os.arch()}`;
  try { return unpack(path.dirname(require.resolve(nom + '/package.json'))); } catch (e) { return null; }
}

// ---------- Calculs purs (testés par tests/parole.js) ----------
// Morceaux de mots reconnus → mots { m, s, e } (un mot commence par une espace ou « ▁ »)
function motsDe(morceaux) {
  const mots = [];
  morceaux.forEach((x, i) => {
    const t = String(x.t || ''), debut = /^[\s▁]/.test(t) || !mots.length;
    const propre = t.replace(/▁/g, ' ');
    if (debut) mots.push({ m: propre.trim(), s: x.s, e: x.s + (x.d || 0), fin: x.fin });
    else { const w = mots[mots.length - 1]; w.m += propre.trim(); w.e = Math.max(w.e, x.s + (x.d || 0)); }
  });
  mots.forEach((w, i) => { // fin du mot : début du suivant (même passage), sinon durée estimée
    const n = mots[i + 1], lim = n && n.s < w.fin ? n.s : w.fin;
    if (!(w.e > w.s)) w.e = Math.min(lim, w.s + 0.08 + w.m.length * 0.065);
    w.e = Math.min(w.e, lim); w.s = +w.s.toFixed(3); w.e = +Math.max(w.e, w.s + 0.06).toFixed(3); delete w.fin;
  });
  return mots.filter(w => w.m);
}
const sansPonctuation = m => m.replace(/[.,;:!?…«»"“”()]/g, '').trim();
const estHesitation = w => HESITATION.test(sansPonctuation(w.m));

// Sous-titres : « phrase » (lignes de ~6 mots), « mots » (1 à 3 mots à la fois, style TikTok)
function sousTitres(mots, style = 'phrase') {
  const max = style === 'mots' ? 3 : 7, maxCar = style === 'mots' ? 18 : 42, out = [];
  let cur = [];
  const pousser = () => { if (cur.length) out.push({ s: cur[0].s, e: cur[cur.length - 1].e, t: cur.map(w => w.m).join(' ') }); cur = []; };
  for (const w of mots.filter(x => !estHesitation(x))) {
    const prec = cur[cur.length - 1];
    if (prec && (cur.length >= max || (cur.map(x => x.m).join(' ') + ' ' + w.m).length > maxCar || w.s - prec.e > 0.6 || /[.!?…]$/.test(prec.m))) pousser();
    cur.push(w);
  }
  pousser();
  // chaque sous-titre reste affiché jusqu'au suivant s'il est proche (lecture plus confortable)
  out.forEach((x, i) => { const n = out[i + 1]; x.e = +(n && n.s - x.e < 0.5 ? n.s : x.e + 0.25).toFixed(2); x.s = +x.s.toFixed(2); });
  if (style === 'mots') out.forEach(x => { x.t = x.t.toUpperCase(); });
  return out;
}

// Passages à garder : la parole sans les blancs ni les hésitations ; [debut, fin] en secondes
function aGarder(mots, duree, { avant = 0.12, apres = 0.18, trou = 0.35 } = {}) {
  const utiles = mots.filter(w => !estHesitation(w));
  const out = [];
  for (const w of utiles) {
    const s = Math.max(0, w.s - avant), e = Math.min(duree, w.e + apres), d = out[out.length - 1];
    if (d && s - d[1] < trou) d[1] = Math.max(d[1], e); else out.push([s, e]);
  }
  return out.map(([s, e]) => [+s.toFixed(2), +e.toFixed(2)]).filter(([s, e]) => e - s >= 0.2);
}

// ---------- Gestionnaire (dans le moteur) ----------
function creer({ run, FFMPEG, BASE }) {
  const MODELES = path.join(BASE, 'modeles');
  const sherpa = dossierSherpa();
  const installe = archive => fs.existsSync(path.join(MODELES, archive, '.complet'));
  const cours = new Map(); // installations en cours
  let proc = null, attente = new Map(), num = 0;

  function processus() {
    if (proc) return proc;
    if (!sherpa) throw new Error('Moteur de voix indisponible sur cet ordinateur.');
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', DYLD_LIBRARY_PATH: sherpa + (process.env.DYLD_LIBRARY_PATH ? ':' + process.env.DYLD_LIBRARY_PATH : ''), LD_LIBRARY_PATH: sherpa + (process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : '') };
    proc = fork(path.join(__dirname, 'parole-worker.js'), [], { env, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let err = ''; proc.stderr.on('data', d => { err = (err + d).slice(-2000); });
    proc.on('message', m => { const a = attente.get(m.id); if (!a) return; attente.delete(m.id); m.ok ? a.ok(m) : a.ko(new Error(m.erreur)); });
    proc.on('exit', code => {
      for (const a of attente.values()) a.ko(new Error('Le moteur de voix s’est arrêté' + (err ? ' : ' + err.trim().split('\n').pop() : ` (code ${code})`)));
      attente = new Map(); proc = null;
    });
    return proc;
  }
  const demander = msg => new Promise((ok, ko) => { const id = ++num; attente.set(id, { ok, ko }); processus().send({ id, ...msg }); });

  function etat() {
    return {
      dispo: !!sherpa,
      voix: VOIX.map(v => ({ id: v.id, nom: v.nom, mo: v.mo, installee: installe(v.archive) })),
      ecoute: { mo: ECOUTE.mo + 2, installee: installe(ECOUTE.archive) && fs.existsSync(path.join(MODELES, VAD.fichier)) }
    };
  }

  // Téléchargement d'une archive de modèle (.tar.bz2) puis décompression
  async function archive(nom, rubrique, job, part) {
    if (installe(nom)) return;
    fs.mkdirSync(MODELES, { recursive: true });
    const f = path.join(MODELES, nom + '.tar.bz2');
    await requete(`${DEPOT}${rubrique}/${nom}.tar.bz2`, { dest: f, quoi: 'de modèles', onProgress: (r, t) => { if (job && t) job.progress = part[0] + (part[1] - part[0]) * r / t; } });
    if (job) job.step = 'Décompression…';
    fs.rmSync(path.join(MODELES, nom), { recursive: true, force: true });
    await new Promise((ok, ko) => execFile('tar', ['-xjf', f, '-C', MODELES], e => (e ? ko(new Error('Décompression impossible : ' + e.message)) : ok())));
    fs.rmSync(f, { force: true });
    if (!fs.existsSync(path.join(MODELES, nom))) throw new Error('Archive de modèle inattendue');
    fs.writeFileSync(path.join(MODELES, nom, '.complet'), new Date().toISOString());
  }
  // quoi : « voix:siwis » ou « ecoute »
  function installer(quoi, job) {
    if (cours.has(quoi)) return cours.get(quoi);
    const p = (async () => {
      if (!sherpa) throw new Error('Moteur de voix indisponible sur cet ordinateur.');
      if (quoi === 'ecoute') {
        if (job) job.step = 'Téléchargement de la reconnaissance de la voix (≈ 660 Mo, une seule fois)…';
        if (!fs.existsSync(path.join(MODELES, VAD.fichier))) { fs.mkdirSync(MODELES, { recursive: true }); await requete(`${DEPOT}asr-models/${VAD.fichier}`, { dest: path.join(MODELES, VAD.fichier + '.part'), quoi: 'de modèles' }); fs.renameSync(path.join(MODELES, VAD.fichier + '.part'), path.join(MODELES, VAD.fichier)); }
        await archive(ECOUTE.archive, 'asr-models', job, [0.02, 0.97]);
      } else {
        const v = VOIX.find(x => 'voix:' + x.id === quoi); if (!v) throw new Error('Voix inconnue');
        if (job) job.step = `Téléchargement de la voix ${v.nom.split(' —')[0]} (≈ ${v.mo} Mo, une seule fois)…`;
        await archive(v.archive, 'tts-models', job, [0, 0.97]);
      }
    })().finally(() => cours.delete(quoi));
    cours.set(quoi, p);
    return p;
  }

  // Texte → fichier audio m4a (petite respiration à la fin), avec une voix Piper
  async function parler(texte, voixId, sortie, { vitesse = 1 } = {}) {
    const v = VOIX.find(x => x.id === voixId); if (!v) throw new Error('Voix inconnue');
    if (!installe(v.archive)) await installer('voix:' + v.id);
    const wav = path.join(os.tmpdir(), `qm-voix-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.wav`);
    try {
      await demander({ type: 'parler', dossier: path.join(MODELES, v.archive), texte, sortie: wav, vitesse, locuteur: v.locuteur || 0 });
      await run(FFMPEG, ['-y', '-v', 'error', '-i', wav, '-af', 'apad=pad_dur=0.5', '-c:a', 'aac', '-b:a', '160k', '-ar', 48000, sortie]);
    } finally { fs.rmSync(wav, { force: true }); }
  }

  // Écoute d'un média entre debut et fin (secondes) → mots avec leur heure (relative à debut) et passages parlés
  async function ecouter(fichier, debut = 0, fin = 0) {
    if (!etat().ecoute.installee) throw new Error('La reconnaissance de la voix n’est pas installée.');
    const wav = path.join(os.tmpdir(), `qm-ecoute-${process.pid}-${Date.now()}.wav`);
    try {
      await run(FFMPEG, ['-y', '-v', 'error', '-ss', String(debut), ...(fin > debut ? ['-t', String(fin - debut)] : []), '-i', fichier, '-vn', '-ac', '1', '-ar', 16000, '-c:a', 'pcm_s16le', wav]);
      const r = await demander({ type: 'ecouter', dossier: path.join(MODELES, ECOUTE.archive), dossierVad: MODELES, wav });
      return { mots: motsDe(r.morceaux), parole: r.parole, duree: r.duree };
    } finally { fs.rmSync(wav, { force: true }); }
  }

  const arreter = () => { if (proc) proc.kill(); };
  return { etat, installer, parler, ecouter, arreter, VOIX };
}

module.exports = { creer, motsDe, sousTitres, aGarder, estHesitation, VOIX, ECOUTE };
