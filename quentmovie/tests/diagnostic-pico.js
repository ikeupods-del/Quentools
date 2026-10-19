// Diagnostic d'un épisode Pico fabriqué (lancé par le workflow quand l'essai de l'application échoue) :
// pour chaque vidéo du dossier de travail, nombre d'images et changements de taille, de format ou de proportions des pixels ;
// pour chaque suite d'écrans PNG, tailles, types de couleur et densité (pHYs).
// node tests/diagnostic-pico.js <dossier> [ffmpeg]
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');

const racine = process.argv[2], FF = process.argv[3] || require('ffmpeg-static');
const fichiers = [];
(function parcourir(d) { let l = []; try { l = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } for (const x of l) { const f = path.join(d, x.name); if (x.isDirectory()) { if (x.name !== 'modeles') parcourir(f); } else fichiers.push(f); } })(racine);

function video(f) {
  const r = spawnSync(FF, ['-hide_banner', '-i', f, '-map', '0:v:0', '-vf', 'showinfo', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const sortie = String(r.stderr || '') + (r.status ? '\nERREUR code ' + r.status : '');
  const lignes = sortie.split('\n'), images = lignes.filter(l => /\] n:\s*\d+/.test(l));
  const props = images.map(l => [(l.match(/fmt:(\S+)/) || [])[1], (l.match(/sar:(\S+)/) || [])[1], (l.match(/ s:(\S+)/) || [])[1]].join(' '));
  const changements = props.map((p, i) => i && p !== props[i - 1] ? `image ${i} : ${props[i - 1]} → ${p}` : null).filter(Boolean);
  const pts = images.map(l => +(l.match(/pts_time:(\S+)/) || [])[1]);
  const flux = lignes.filter(l => /Stream #0:\d/.test(l)).map(l => l.trim().replace(/\s+/g, ' ').slice(0, 170));
  const erreurs = lignes.filter(l => /error|invalid|ERREUR/i.test(l)).slice(0, 4);
  console.log(`\n${path.relative(racine, f)} : ${images.length} images, ${props[0] || '?'}, pts ${pts[0]} → ${pts[pts.length - 1]}`);
  flux.forEach(l => console.log('   ', l));
  changements.slice(0, 6).forEach(c => console.log('    CHANGEMENT', c));
  erreurs.forEach(l => console.log('    !', l.trim().slice(0, 200)));
}
function png(liste) {
  const groupes = new Map();
  for (const f of liste) {
    const d = fs.readFileSync(f); if (d.length < 26) { groupes.set('vide ' + path.basename(f), 1); continue; }
    const cle = `${path.basename(f).slice(0, 3)} ${d.readUInt32BE(16)}x${d.readUInt32BE(20)} prof ${d[24]} couleur ${d[25]}${d.includes(Buffer.from('pHYs')) ? ' pHYs' : ''}${d.includes(Buffer.from('iCCP')) ? ' iCCP' : ''}${d.includes(Buffer.from('sRGB')) ? ' sRGB' : ''}`;
    groupes.set(cle, (groupes.get(cle) || 0) + 1);
  }
  console.log('\nÉcrans PNG :'); for (const [k, n] of groupes) console.log(`    ${k} : ${n}`);
}
png(fichiers.filter(f => /[\\/]images[\\/]i\d+-.*\.png$/.test(f)));
for (const f of fichiers.filter(f => /\.(mp4|mov)$/.test(f)).sort()) video(f);
for (const f of fichiers.filter(f => /(journal|log|rapport)[^/]*\.(txt|json)$/.test(f))) console.log(`\n${path.relative(racine, f)} :\n${fs.readFileSync(f, 'utf8').slice(-3000)}`);
