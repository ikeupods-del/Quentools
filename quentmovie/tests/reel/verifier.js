// Essai réel QuentInvest (workflow) : lit le résultat de l'application installée et contrôle chaque vidéo fabriquée
// (lisible jusqu'au bout, durée, son présent, version TikTok, miniatures). node tests/reel/verifier.js <autotest.json>
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const FF = require('ffmpeg-static'), r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), ko = [];
console.log(JSON.stringify(r, null, 1));
if (r.erreur) ko.push('application : ' + r.erreur);
function dureeWav(f) { // durée lue dans l'en-tête WAV (fmt + data)
  try { const d = fs.readFileSync(f); let o = 12, fmt = null; while (o + 8 <= d.length) { const id = d.toString('latin1', o, o + 4), n = d.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { c: d.readUInt16LE(o + 10), t: d.readUInt32LE(o + 12), b: d.readUInt16LE(o + 22) };
    if (id === 'data' && fmt) return Math.min(n, d.length - o - 8) / (fmt.t * fmt.c * fmt.b / 8); o += 8 + n + (n & 1); } } catch (e) { /* illisible */ }
  return 0;
}
if (!r.etat || !r.etat.assez) ko.push('corpus « Ma voix » non reconnu');
function video(f) {
  const x = spawnSync(FF, ['-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }), e = String(x.stderr || '');
  const d = e.match(/Duration: (\d+):(\d+):([\d.]+)/), duree = d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0, vol = +((e.match(/mean_volume: (-?[\d.]+) dB/) || [])[1] || -99);
  return { lisible: x.status === 0, duree: Math.round(duree), volume: vol, erreurs: e.split('\n').filter(l => /error|invalid/i.test(l)).slice(0, 3) };
}
for (const [nom, k] of [['Mon script', r.script], ['Tout seul', r.seul]]) {
  if (k === undefined) continue;
  if (!k || k.erreur) { ko.push(`${nom} : ${k ? k.erreur : 'pas de résultat'}`); continue; }
  const fichiers = k.fichiers || [], yt = fichiers.find(n => /-youtube\.mp4$/.test(n)), tt = fichiers.find(n => /-tiktok\.mp4$/.test(n));
  if (!yt) { ko.push(`${nom} : pas de vidéo YouTube`); continue; }
  if (!tt && !process.env.QM_QI_DUREE) ko.push(`${nom} : pas de version TikTok`);
  if (!fichiers.some(n => /miniature.*\.png$/.test(n))) ko.push(`${nom} : pas de miniature`);
  for (const n of [yt, tt].filter(Boolean)) {
    const v = video(path.join(k.dossier, n)); console.log(`${nom} · ${n} : ${v.lisible ? 'lisible' : 'ILLISIBLE'}, ${v.duree} s, son moyen ${v.volume} dB${v.erreurs.length ? ', ' + v.erreurs.join(' | ') : ''}`);
    if (!v.lisible) ko.push(`${nom} : ${n} illisible`);
    if (v.duree < (/tiktok/.test(n) || process.env.QM_QI_DUREE ? 20 : 60)) ko.push(`${nom} : ${n} trop courte (${v.duree} s)`);
    if (v.volume < -45) ko.push(`${nom} : ${n} sans voix audible (${v.volume} dB)`);
  }
  // voix clonée : chaque réplique dure à peu près ce que son texte demande (une voix qui « déraille » parle bien trop longtemps ou presque pas)
  for (const d of fs.readdirSync(k.dossier).filter(n => /^ma-voix-/.test(n))) {
    const rep = fs.readdirSync(path.join(k.dossier, d)).filter(n => /^v\d+\.wav$/.test(n)), bizarres = [];
    for (const n of rep) {
      const f = path.join(k.dossier, d, n), texte = fs.existsSync(f + '.txt') ? fs.readFileSync(f + '.txt', 'utf8') : '', s = dureeWav(f), attendu = texte.length / 14;
      if (texte && (s > attendu * 2.5 + 3 || s < attendu * 0.35)) bizarres.push(`${n} : ${s.toFixed(1)} s pour ${texte.length} caractères (≈ ${attendu.toFixed(0)} s attendues)`);
    }
    console.log(`${nom} · ${d} : ${rep.length} répliques dites${bizarres.length ? ', durée anormale : ' + bizarres.join(' | ') : ', durées normales'}`);
    if (bizarres.length > Math.max(1, rep.length * 0.1)) ko.push(`${nom} : voix clonée anormale sur ${bizarres.length} répliques (${d})`);
  }
  console.log(`${nom} : fabriqué en ${Math.round(k.s / 60)} min${k.avertissements && k.avertissements.length ? ' · avertissements : ' + k.avertissements.join(' | ') : ''}`);
}
if (ko.length) { console.log('\nÉchecs :\n- ' + ko.join('\n- ')); process.exit(1); }
console.log('\nVidéos QuentInvest : tout fonctionne avec ta voix clonée.');
