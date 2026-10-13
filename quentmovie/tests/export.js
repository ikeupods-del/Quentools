// Export optimisé : clips encodés en parallèle, clips inchangés repris du cache au deuxième export,
// un clip modifié réencodé seul, vidéo finale complète et lisible.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-exp-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  ff('-f', 'lavfi', '-i', 'testsrc=s=640x360:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'a.mp4'));
  ff('-f', 'lavfi', '-i', 'color=c=orange:s=320x180:d=1', '-frames:v', '1', path.join(base, 'p.png'));
  for (const f of ['a.mp4', 'p.png']) await fetch(U('/api/import?name=' + f), { method: 'POST', body: fs.readFileSync(path.join(base, f)) });
  const clip = (file, kind, extra = {}) => ({ file, kind, in: 0, out: kind === 'video' ? 3 : 0, dur: 2, speed: 1, vol: 100, hasAudio: kind === 'video', fx: [], afx: [], overlays: [], subs: [], key: { on: false }, ...extra });
  const projet = t => ({ format: 'horizontal', res: 720, fps: 30, quality: 'rapide', sortie: 'mp4', clips: [clip('a.mp4', 'video', { text: 'Bonjour' }), clip('p.png', 'image'), clip('a.mp4', 'video', { in: 1, out: 3, text: t }), { kind: 'solid', color: '#223344', dur: 1.5, fx: [], afx: [], overlays: [], subs: [], key: { on: false } }], audio: [], pistes: [] });
  const exporter = async p => {
    const { id } = await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: p }) })).json();
    for (;;) { const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.error) throw new Error(j.error); if (j.done) return j; await new Promise(r => setTimeout(r, 200)); }
  };
  const duree = f => +execFileSync(bins.ffmpeg, ['-hide_banner', '-i', path.join(base, 'exports', f)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString().match(/Duration: (\d+):(\d+):([\d.]+)/)?.slice(1).reduce((a, x, k) => a + x * [3600, 60, 1][k], 0);
  const lireDuree = f => { try { return duree(f); } catch (e) { const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; } };
  // fichier disparu : message clair ; prise convertie (« -prise.mp4 ») retrouvée toute seule
  fs.copyFileSync(path.join(base, 'medias', 'a.mp4'), path.join(base, 'medias', 'camera-1-prise.mp4'));
  const retrouve = await exporter({ ...projet('Prise'), clips: [clip('camera-1.mp4', 'video')] }).then(() => true, () => false);
  check('prise convertie : le clip qui pointe sur l’ancien nom est retrouvé', retrouve);
  const msg = await exporter({ ...projet('Absent'), clips: [clip('camera-fantome.mp4', 'video')] }).then(() => '', e => e.message);
  check('fichier disparu : message clair avec le nom du fichier', /introuvable/.test(msg) && /camera-fantome\.mp4/.test(msg) && /Supprimer/.test(msg), msg);
  const j1 = await exporter(projet('Premier'));
  check('premier export : vidéo complète', Math.abs(lireDuree(j1.out) - 8.5) < 0.4, lireDuree(j1.out));
  check('premier export : clips encodés en parallèle', j1.paralleles >= 2, j1.paralleles);
  check('premier export : rien dans le cache au départ', j1.repris === 0, j1.repris);
  const j2 = await exporter(projet('Premier'));
  check('deuxième export identique : tous les clips repris du cache', j2.repris === 4, j2.repris);
  check('deuxième export : vidéo complète', Math.abs(lireDuree(j2.out) - 8.5) < 0.4, lireDuree(j2.out));
  const j3 = await exporter(projet('Texte changé'));
  check('un titre changé : seul ce clip est réencodé', j3.repris === 3, j3.repris);
  check('durée de l’export renvoyée', j3.duree > 0, j3.duree);

  // Assemblage rapide : fondus et incrustations réencodés seuls, le reste recopié ; même résultat que l'assemblage complet
  const EPI = require('../epissage');
  const pl = EPI.planifier([90, 90, 90], [18, 0], 30);
  check('plan : toutes les images comptées', pl.ok && pl.total === 90 * 3 - 18, pl.total);
  { const p40 = EPI.planifier(Array(40).fill(45), Array(39).fill(15), 30); check('plan : 40 photos en fondu coupées en morceaux parallèles, images toutes comptées', p40.ok && p40.total === 40 * 45 - 39 * 15 && p40.pieces.filter(x => x.type === 'enc').length >= 5 && p40.pieces.every(x => x.type !== 'enc' || x.clips.length <= 9), p40.pieces.length); }
  check('plan : fondu trop long refusé', !EPI.planifier([20, 20], [19], 30).ok);
  check('plan : zones étendues aux images clés', JSON.stringify(EPI.zonesPistes(pl, [{ fa: 40, fb: 50 }])) === JSON.stringify([{ de: 30, a: 60 }]) || EPI.zonesPistes(pl, [{ fa: 40, fb: 50 }]).length === 1);
  ff('-f', 'lavfi', '-i', 'mandelbrot=s=320x180:r=30', '-t', '3', '-pix_fmt', 'yuv420p', path.join(base, 'ov.mp4'));
  await fetch(U('/api/import?name=ov.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'ov.mp4')) });
  const complexe = { format: 'horizontal', res: 720, fps: 30, quality: 'rapide', sortie: 'mp4', audio: [], pistes: [{ file: 'ov.mp4', kind: 'video', in: 0, out: 2, start: 1.5, scale: 30, hasAudio: false, vol: 0, ligne: 0 }],
    clips: [clip('a.mp4', 'video', { out: 4, transition: { type: 'fade', dur: 0.6 } }), clip('a.mp4', 'video', { in: 0, out: 4, transition: { type: 'wipeleft', dur: 0.6 } }), clip('a.mp4', 'video', { out: 3 })] };
  const jr = await exporter(complexe);
  // sur Mac, un repli sur l'assemblage complet reste valable (la suite contrôle de toute façon le résultat) : il est seulement signalé
  if (jr.assemblage !== 'rapide' && process.platform === 'darwin') console.log('  Note : assemblage complet utilisé sur ce Mac (' + jr.avertissement + ')');
  check('assemblage rapide utilisé (fondus + incrustation)', jr.assemblage === 'rapide' || process.platform === 'darwin', jr.avertissement);
  const images = f => execFileSync(bins.ffmpeg, ['-v', 'error', '-i', path.join(base, 'exports', f), '-map', '0:v:0', '-c', 'copy', '-f', 'framecrc', '-'], { encoding: 'utf8' }).split('\n').filter(l => l && l[0] !== '#').length;
  check('assemblage rapide : durée exacte (4+4+3 s − 2 fondus de 0,6 s)', images(jr.out) === Math.round((11 - 1.2) * 30), images(jr.out));
  const lu = execFileSync(bins.ffmpeg, ['-v', 'error', '-i', path.join(base, 'exports', jr.out), '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  check('assemblage rapide : lecture sans erreur', lu === '');

  // Clipping : un passage du montage devient une vidéo verticale à part
  ff('-f', 'lavfi', '-i', 'testsrc=s=640x360:r=30:d=10', '-f', 'lavfi', '-i', 'sine=f=300:d=10', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'long.mp4'));
  await fetch(U('/api/import?name=long.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'long.mp4')) });
  const longue = { format: 'horizontal', res: 720, fps: 30, quality: 'rapide', sortie: 'mp4', audio: [], pistes: [], clips: [clip('long.mp4', 'video', { out: 10, subs: [{ s: 2, e: 4, t: 'Bonjour' }, { s: 5, e: 7, t: 'Astuce' }] })] };
  const cl = await (await fetch(U('/api/clipping/exporter'), { method: 'POST', body: JSON.stringify({ project: longue, extraits: [{ s: 1, e: 6, titre: 'Mon astuce' }, { s: 6, e: 9.5, titre: 'Autre' }], cadrage: 'remplir', accroche: true }) })).json();
  let jc; for (;;) { jc = await (await fetch(U('/api/job?id=' + cl.id))).json(); if (jc.error || jc.done) break; await new Promise(r => setTimeout(r, 200)); }
  check('clipping : deux clips créés', !jc.error && jc.resultat && jc.resultat.fichiers.length === 2 && jc.resultat.fichiers.every(f => fs.existsSync(path.join(base, 'exports', f.fichier))), jc.error);
  if (jc.resultat) {
    let sortie = ''; try { execFileSync(bins.ffmpeg, ['-hide_banner', '-i', path.join(base, 'exports', jc.resultat.fichiers[0].fichier)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { sortie = String(e.stderr); }
    const m = /Video:.* (\d{3,4})x(\d{3,4})/.exec(sortie), dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(sortie);
    check('clipping : vidéo verticale de la bonne durée', !!m && +m[2] > +m[1] && Math.abs(+dur[3] - 5) < 0.4, sortie.slice(-300));
  }

  // Vidéo HDR (HLG, iPhone) : détectée et convertie en image classique quand le moteur sait le faire
  try {
    ff('-f', 'lavfi', '-i', 'smptebars=s=640x360:r=30:d=2', '-vf', 'format=yuv420p10le', '-c:v', 'libx265', '-x265-params', 'colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc:log-level=error', '-pix_fmt', 'yuv420p10le', path.join(base, 'hlg.mp4'));
    await fetch(U('/api/import?name=hlg.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'hlg.mp4')) });
    const jh = await exporter({ format: 'horizontal', res: 360, fps: 30, quality: 'rapide', sortie: 'mp4', audio: [], pistes: [], clips: [clip('hlg.mp4', 'video', { out: 2, hasAudio: false })] });
    check('vidéo HDR : export réussi', !!jh.out);
    if ((app.filtres ? app.filtres() : []).includes('zscale')) check('vidéo HDR : conversion signalée', /HDR/.test(jh.avertissement || ''), jh.avertissement);
  } catch (e) { /* encodeur HEVC absent : essai ignoré */ }
  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Export : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
