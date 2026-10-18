// Version TikTok avec la voix du propriétaire, tirée des répliques déjà enregistrées pour la vidéo YouTube (aucun nouvel enregistrement) :
// chaque réplique YouTube est découpée en phrases (coupe dans un silence, d'après la longueur des phrases),
// chaque phrase de la version TikTok est associée à la phrase YouTube la plus proche, les silences trop longs sont raccourcis.
// Le texte affiché (sous-titres) devient celui qui est réellement dit. Une réplique sans correspondance garde la voix de synthèse.
// Usage (via episode.js : --voix-perso <dossier>, sans --voix-perso-tiktok) ou : node tiktok-voix.js <fiche.json> <dossier voix YouTube> <sortie>
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync, spawnSync } = require('child_process');

const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const jetons = t => new Set((sansAccents(t).match(/[a-z0-9]+/g) || []).filter(w => w.length > 2));
const dice = (a, b) => { const A = jetons(a), B = jetons(b); if (!A.size || !B.size) return 0; let c = 0; for (const x of A) if (B.has(x)) c++; return 2 * c / (A.size + B.size); };
const phrases = t => (String(t).match(/[^.!?…]+[.!?…]*/g) || []).map(x => x.trim()).filter(x => /[\p{L}\p{N}]/u.test(x));
const sh = i => String(i).padStart(2, '0');
const DUREE_TIKTOK = 60, SILENCE_ENTRE = 0.25;

// silences d'une réplique : [{ d, f }]
function silences(wav) {
  const r = spawnSync('ffmpeg', ['-i', wav, '-af', 'silencedetect=noise=-33dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '', d = [...r.matchAll(/silence_start: ([\d.]+)/g)].map(x => +x[1]), f = [...r.matchAll(/silence_end: ([\d.]+)/g)].map(x => +x[1]);
  return d.map((x, i) => ({ d: x, f: f[i] != null ? f[i] : Infinity }));
}
const duree = wav => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], { encoding: 'utf8' }).trim();

// découpe d'une réplique en phrases : [{ texte, de, a }] (secondes). La fin d'une phrase est le silence le plus long et le plus proche
// de l'instant attendu (longueur de la phrase rapportée à la durée de la réplique) ; sans silence net, on coupe à l'instant attendu.
function decouper(texte, wav) {
  const ph = phrases(texte), D = duree(wav), sil = silences(wav).filter(x => x.f - x.d >= 0.15 && x.d > 0.3 && x.f < D + 0.01 || (x.f === Infinity && false));
  if (ph.length <= 1) return [{ texte: ph.join(' ') || String(texte), de: 0, a: D }];
  const nb = ph.map(p => (p.match(/[\p{L}\p{N}]+/gu) || []).length), total = nb.reduce((a, b) => a + b, 0), coupes = [0]; let cumul = 0;
  for (let k = 0; k < ph.length - 1; k++) {
    cumul += nb[k]; const attendu = D * cumul / total;
    const s = sil.map(x => ({ x, c: Math.abs((x.d + x.f) / 2 - attendu) - 1.0 * (x.f - x.d) })).filter(y => y.x.d > (coupes[coupes.length - 1] || 0) + 0.4).sort((a, b) => a.c - b.c)[0];
    coupes.push(s && Math.abs((s.x.d + s.x.f) / 2 - attendu) < D * 0.22 ? +((s.x.d + s.x.f) / 2).toFixed(2) : +attendu.toFixed(2));
  }
  coupes.push(D);
  return ph.map((p, k) => ({ texte: p, de: coupes[k], a: coupes[k + 1] }));
}

// Prépare la voix et les textes de la version TikTok. C : { long, tiktok } (composer), retourne { episode, dossier, rapport }
function preparer({ C, dossierYoutube, sortie }) {
  const Y = C.long.scenes, base = path.join(sortie, 'voix-tiktok'); fs.mkdirSync(base, { recursive: true }); 
  const pool = []; // phrases YouTube disponibles
  Y.forEach((s, j) => {
    const wav = path.join(dossierYoutube, `v${sh(j)}.wav`); if (!fs.existsSync(wav)) return;
    decouper(s.voix || s.texte, wav).forEach((p, k) => pool.push({ ...p, scene: j, k, wav, type: s.ecran && s.ecran.type, utilisee: false }));
  });
  if (!pool.length) throw new Error('Aucune réplique YouTube trouvée dans ' + dossierYoutube);
  const filtre = 'silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-38dB:stop_silence=0.15';
  const T = JSON.parse(JSON.stringify(C.tiktok)), garde = [], rapport = [];
  T.scenes.forEach((s, i) => {
    const type = s.ecran && s.ecran.type; let choisies = [];
    if (type === 'accroche') choisies = pool.filter(p => p.scene === 0 || (p.type === 'accroche'));
    else if (type === 'abonne') choisies = pool.filter(p => p.type === 'abonne');
    else for (const ph of phrases(s.texte)) { const m = pool.filter(p => !p.utilisee && p.type !== 'accroche' && p.type !== 'abonne').map(p => ({ p, sc: dice(ph, p.texte) })).sort((a, b) => b.sc - a.sc)[0]; if (m && m.sc >= 0.4) { choisies.push(m.p); m.p.utilisee = true; } }
    if (!choisies.length) { rapport.push({ scene: i, texte: s.texte, voix: 'synthèse' }); garde.push({ i, s, wav: null }); return; }
    // morceaux coupés, silences longs raccourcis, recollés avec une respiration
    const morceaux = choisies.map((p, k) => { const f = path.join(base, `p${sh(i)}_${k}.wav`); execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(p.de), '-t', String(Math.max(0.2, p.a - p.de)), '-i', p.wav, '-af', 'aresample=44100,afade=t=in:d=0.01,' + filtre, '-ac', '1', '-c:a', 'pcm_s16le', f]); return f; });
    const liste = path.join(base, `l${sh(i)}.txt`), sil = path.join(base, 'silence.wav');
    if (!fs.existsSync(sil)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(SILENCE_ENTRE), '-c:a', 'pcm_s16le', sil]);
    fs.writeFileSync(liste, morceaux.map((f, k) => `file '${f}'\n` + (k < morceaux.length - 1 ? `file '${sil}'\n` : '')).join(''));
    const tmp = path.join(base, `t${sh(i)}.wav`); execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', liste, '-c:a', 'pcm_s16le', tmp]);
    const d = duree(tmp), texte = choisies.map(p => p.texte).join(' ');
    rapport.push({ scene: i, texte, voix: 'propriétaire', duree: +d.toFixed(1), source: choisies.map(p => `v${sh(p.scene)}`).join('+') });
    garde.push({ i, s: { ...s, texte }, wav: tmp, d, type });
  });
  // durée : une minute environ ; on retire d'abord les répliques de peu de valeur (piège, fragments, voix de synthèse), puis les plus longues parmi les messages
  const total = g => g.reduce((t, x) => t + (x.d || 6) + 0.36, 0);
  const valeur = (x, k, n) => { const t = x.s.ecran && x.s.ecran.type; if (k <= 1 || k === n - 1) return 9; if (!x.wav || x.d < 1.5 || x.s.expr === 'inquiet') return 1; return ['duo', 'chiffre', 'calcul', 'taux', 'courbe', 'croissance', 'resume'].includes(t) ? 3 : 2; };
  let liste = garde.slice();
  while (total(liste) > DUREE_TIKTOK && liste.length > 5) { const n = liste.length, c = liste.map((x, k) => ({ x, k, v: valeur(x, k, n) })).filter(y => y.v < 9).sort((a, b) => a.v - b.v || (b.x.d || 0) - (a.x.d || 0))[0]; if (!c) break; rapport.push({ scene: c.x.i, retiree: true, raison: 'durée' }); liste.splice(c.k, 1); }
  const sortieDossier = path.join(sortie, 'voix-tiktok-final'); fs.rmSync(sortieDossier, { recursive: true, force: true }); fs.mkdirSync(sortieDossier, { recursive: true });
  liste.forEach((x, k) => { if (x.wav) fs.copyFileSync(x.wav, path.join(sortieDossier, `v${sh(k)}.wav`)); });
  T.scenes = liste.map(x => x.s);
  fs.writeFileSync(path.join(sortie, 'tiktok-voix.json'), JSON.stringify({ rapport, duree: +total(liste).toFixed(1) }, null, 1));
  return { episode: T, dossier: sortieDossier, rapport, duree: total(liste) };
}

module.exports = { preparer, decouper, dice, phrases };

if (require.main === module) {
  const [, , fiche, voixYt, sortie] = process.argv;
  if (!fiche || !voixYt || !sortie) { console.log('Usage : node tiktok-voix.js <fiche.json> <dossier voix YouTube> <sortie>'); process.exit(1); }
  const { compose } = require('./composer');
  const r = preparer({ C: compose(JSON.parse(fs.readFileSync(fiche, 'utf8'))), dossierYoutube: voixYt, sortie });
  console.log(JSON.stringify(r.rapport, null, 1)); console.log('Durée estimée : ' + r.duree.toFixed(1) + ' s ; voix : ' + r.dossier);
}
