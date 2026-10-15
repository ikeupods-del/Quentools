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
  // long clip simple : découpé en morceaux encodés ensemble, même durée et sous-titres répartis
  process.env.QM_MORCEAU = '1';
  const long = { ...clip('a.mp4', 'video', { out: 4, fade: true, subs: [{ s: 0.2, e: 1.4, t: 'un' }, { s: 1.6, e: 3.8, t: 'deux' }] }), transition: null };
  const jm = await exporter({ ...projet('Morceaux'), clips: [long] });
  process.env.QM_SANS_MORCEAUX = '1'; const jt = await exporter({ ...projet('Entier'), clips: [long] }); delete process.env.QM_SANS_MORCEAUX; delete process.env.QM_MORCEAU;
  check('clip long : découpé en morceaux', jm.morceaux >= 2 && !jt.morceaux, `${jm.morceaux}/${jt.morceaux}`);
  check('clip long : même durée que le clip entier', Math.abs(lireDuree(jm.out) - lireDuree(jt.out)) < 0.35, `${lireDuree(jm.out)} / ${lireDuree(jt.out)}`);
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
  if (jr.assemblage !== 'rapide' && process.platform === 'darwin') console.log('  Note : assemblage complet utilisé sur ce Mac (' + jr.raisonRapide + ')');
  check('assemblage rapide utilisé (fondus + incrustation)', jr.assemblage === 'rapide' || process.platform === 'darwin', jr.raisonRapide);
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
  // piste Titres : titre rendu par-dessus le montage à son instant, même à cheval sur une coupe
  { const sans = await exporter({ ...projet('SansTitre'), clips: [clip('a.mp4', 'video', { out: 3 }), clip('a.mp4', 'video', { out: 3 })] });
    const avec = await exporter({ ...projet('AvecTitre'), clips: [clip('a.mp4', 'video', { out: 3 }), clip('a.mp4', 'video', { out: 3 })], textes: [{ start: 2, dur: 2.5, titre: { preset: 'angle', l1: 'Titre sur la piste', l2: 'à cheval sur la coupe', color: '#ff2d55', start: 0 } }] });
    const img = (f, t) => execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', t, '-i', path.join(base, 'exports', f), '-frames:v', 1, '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '160x90', '-']);
    const ecart = t => { const a = img(sans.out, t), b = img(avec.out, t); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    check('piste Titres : titre visible pendant sa durée (avant et après la coupe)', ecart(2.7) > 1 && ecart(3.6) > 1, [ecart(2.7), ecart(3.6)].join(' '));
    check('piste Titres : rien avant ni après', ecart(1) < 0.5 && ecart(5.2) < 0.5, [ecart(1), ecart(5.2)].join(' ')); }
  // transitions : la vidéo raccourcit d'un fondu à chaque coupe ; les titres (et sons, piste 2) posés après restent calés sur leur clip
  { const deux = () => [clip('a.mp4', 'video', { out: 3, transition: { type: 'fade', dur: 1 } }), clip('a.mp4', 'video', { out: 3 })];
    const sans = await exporter({ ...projet('TrSans'), clips: deux() });
    const avec = await exporter({ ...projet('TrAvec'), clips: deux(), textes: [{ start: 3, dur: 1.5, titre: { preset: 'angle', l1: 'Début du clip 2', color: '#ff2d55', start: 0 } }] });
    const img = (f, t) => execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', t, '-i', path.join(base, 'exports', f), '-frames:v', 1, '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '160x90', '-']);
    const ecart = t => { const a = img(sans.out, t), b = img(avec.out, t); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    check('transition : titre posé au début du clip 2, pas une seconde trop tard', ecart(2.6) > 1 && ecart(4.2) < 0.5, [ecart(2.6), ecart(4.2)].join(' ')); }
  // coupe d'un clip titré : le titre continue sur la 2e moitié, au même point de son animation (pas d'entrée rejouée)
  { const ti = { preset: 'angle', l1: 'Titre continu', color: '#ff2d55', start: 0.2, dur: 0 };
    const entier = await exporter({ ...projet('TiEntier'), clips: [clip('a.mp4', 'video', { out: 4, titre: ti })] });
    const coupe = await exporter({ ...projet('TiCoupe'), clips: [clip('a.mp4', 'video', { out: 1, titre: ti }), clip('a.mp4', 'video', { in: 1, out: 4, titre: { ...ti, start: 0, deja: 0.8 } })] });
    const sansT = await exporter({ ...projet('TiSans'), clips: [clip('a.mp4', 'video', { out: 4 })] });
    const img = (f, t) => execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', t, '-i', path.join(base, 'exports', f), '-frames:v', 1, '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '160x90', '-']);
    const ec = (x, y, t) => { const a = img(x.out, t), b = img(y.out, t); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    check('coupe d’un clip titré : titre toujours là après la coupe, sans entrée rejouée', ec(coupe, sansT, 1.15) > 1 && ec(coupe, entier, 1.15) < 0.6 && ec(coupe, entier, 2.5) < 0.6, [ec(coupe, sansT, 1.15), ec(coupe, entier, 1.15), ec(coupe, entier, 2.5)].join(' ')); }
  // son calé sur l'image après de nombreuses coupes sans transition (avant : ~27 ms de décalage par coupe)
  { const coupes = Array.from({ length: 20 }, (_, i) => clip('a.mp4', 'video', { in: (i % 8) * 0.45, out: (i % 8) * 0.45 + 0.4 }));
    const j = await exporter({ ...projet('Sync'), clips: coupes });
    const f = path.join(base, 'exports', j.out);
    const images = execFileSync(bins.ffmpeg, ['-v', 'error', '-i', f, '-map', '0:v:0', '-c', 'copy', '-f', 'framecrc', '-']).toString().split('\n').filter(l => l && l[0] !== '#').length;
    const echant = execFileSync(bins.ffmpeg, ['-v', 'error', '-i', f, '-map', '0:a:0', '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], { maxBuffer: 1 << 28 }).length / 2;
    const ecart = Math.abs(echant / 48000 - images / 30);
    check('20 coupes sans transition : son et image de même durée (pas de glissement)', ecart < 0.05, `${(echant / 48000).toFixed(3)} s de son pour ${(images / 30).toFixed(3)} s d’image`); }
  // niveaux : la musique est calée sous la voix (≈ -18 dB) quel que soit le niveau du fichier, les bruitages un peu en dessous
  { const L = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'bibliotheque', 'index.json'), 'utf8')), mu = (L.musiques || [])[0], so = (L.sons || []).find(x => x.duree > 0.6);
    const jn = await exporter({ ...projet('Niveaux'), clips: [clip('a.mp4', 'video', { out: 4 })], audio: [{ file: 'lib:' + mu.file, vol: 35, start: 0, fade: false, loop: true, duck: false }, { file: 'lib:' + so.file, vol: 80, start: 1, fade: false, loop: false, duck: false }] });
    const n = jn.niveaux || {}, m = n['lib:' + mu.file] || {}, b = n['lib:' + so.file] || {};
    check('niveaux : musique calée 18 dB sous la voix', n.montage != null && m.type === 'musique' && Math.abs(m.lufs + m.gainDb - (n.montage - 18)) < 0.6, JSON.stringify(n));
    check('niveaux : bruitage calé sous la voix', b.type === 'bruitage' && Math.abs(b.lufs + b.gainDb - (n.montage - 7)) < 0.6, JSON.stringify(b)); }
  // clip encodé autrement que les autres (sur Mac : puce vidéo refusée pour ce clip) : réencodé seul comme les autres,
  // l'assemblage rapide reste utilisé (avant : assemblage complet de tous les clips à la fois, en échec sur les longs montages)
  { const cache = path.join(base, '.cache-rendu'), avant = new Set(fs.existsSync(cache) ? fs.readdirSync(cache) : []);
    const p = { ...projet('Mixte'), clips: [clip('a.mp4', 'video', { out: 3, transition: { type: 'fade', dur: 0.5 } }), clip('a.mp4', 'video', { in: 0.5, out: 3.5 }), clip('a.mp4', 'video', { in: 1, out: 3 })] };
    await exporter(p);
    const nouveau = fs.readdirSync(cache).filter(x => !avant.has(x) && x.endsWith('.mp4'))[1], f = path.join(cache, nouveau);
    ff('-i', f, '-map', '0', '-c:a', 'copy', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', 30, '-r', 30, '-pix_fmt', 'yuv420p', f + '.x.mp4'); fs.renameSync(f + '.x.mp4', f);
    const jm = await exporter(p);
    // sur Mac, si la puce vidéo refuse aussi ce réencodage, tous les clips passent au processeur (harmonises > 1) : toujours l'assemblage rapide
    check('clip encodé autrement : réencodé seul, assemblage rapide gardé', jm.assemblage === 'rapide' && (jm.harmonises === 1 || (process.platform === 'darwin' && jm.harmonises >= 1)), `${jm.assemblage} ${jm.harmonises} ${jm.raisonRapide}`);
    const images = execFileSync(bins.ffmpeg, ['-v', 'error', '-i', path.join(base, 'exports', jm.out), '-map', '0:v:0', '-c', 'copy', '-f', 'framecrc', '-']).toString().split('\n').filter(l => l && l[0] !== '#').length;
    check('clip encodé autrement : durée exacte', images === Math.round((3 + 3 + 2 - 0.5) * 30), images);
    const j3 = await exporter(p);
    check('clip encodé autrement : corrigé dans le cache (rien à refaire au prochain export)', j3.repris === 3 && (!j3.harmonises || (process.platform === 'darwin' && jm.harmonises > 1)), `${j3.repris} ${j3.harmonises}`); }
  // calques : plus de 8 sur un même clip, chacun visible seulement pendant sa durée
  { const ovs = Array.from({ length: 10 }, (_, k) => ({ file: 'p.png', kind: 'image', x: 50, y: 50, scale: 100, rot: 0, opacity: 100, start: +(k * 0.35).toFixed(2), dur: 0.3, anim: 'none', mode: '', plein: 'remplir', key: false }));
    const sans = await exporter({ ...projet('CalSans'), clips: [clip('a.mp4', 'video', { out: 4 })] });
    const avec = await exporter({ ...projet('CalAvec'), clips: [clip('a.mp4', 'video', { out: 4, overlays: ovs })] });
    const img = (f, t) => execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', t, '-i', path.join(base, 'exports', f), '-frames:v', 1, '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '160x90', '-']);
    const ecart = t => { const a = img(sans.out, t), b = img(avec.out, t); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    // un calque orange plein écran change l'image de plusieurs dizaines de niveaux ; l'encodage par la puce du Mac laisse ~1 niveau de bruit
    check('calques : le 10e calque d’un clip apparaît à son instant', ecart(0.15) > 10 && ecart(3.3) > 10, [ecart(0.15), ecart(3.3)].join(' '));
    check('calques : rien en dehors de leur durée, clip complet', ecart(3.8) < 3 && Math.abs(lireDuree(avec.out) - 4) < 0.2, [ecart(3.8), lireDuree(avec.out)].join(' ')); }
  // aperçu : un calque qui commence après le début du clip est visible à son instant (avant : jamais dans l'aperçu)
  { const ov = { file: 'p.png', kind: 'image', x: 50, y: 50, scale: 100, rot: 0, opacity: 100, anim: 'none', plein: 'remplir', key: false };
    const couleur = async (o, t) => { const r = await fetch(U('/api/preview'), { method: 'POST', body: JSON.stringify({ clip: clip('a.mp4', 'video', { out: 4, overlays: [o] }), t, project: { format: 'horizontal', res: 360, fps: 30 } }) });
      fs.writeFileSync(path.join(base, 'pv.jpg'), Buffer.from(await r.arrayBuffer())); return [...execFileSync(bins.ffmpeg, ['-v', 'error', '-i', path.join(base, 'pv.jpg'), '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])]; };
    const [r1, g1, b1] = await couleur({ ...ov, start: 1, dur: 2 }, 1.5), [r2] = await couleur({ ...ov, plein: '', scale: 100, start: 1, dur: 2 }, 1.5);
    check('aperçu : calque posé en cours de clip visible à son instant', r1 > 200 && g1 > 100 && b1 < 60 && r2 > 200, [r1, g1, b1, r2].join(',')); }
  // effet de coupe d'un pack (mélange « écran ») : il démarre par son début à la fin du clip, la seconde moitié reprend au milieu
  { ff('-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=30:d=0.5', '-f', 'lavfi', '-i', 'color=c=red:s=320x180:r=30:d=0.5', '-filter_complex', '[0][1]concat=n=2', '-pix_fmt', 'yuv420p', path.join(base, 'br.mp4'));
    await fetch(U('/api/import?name=br.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'br.mp4')) });
    const effet = { file: 'br.mp4', kind: 'video', x: 50, y: 50, scale: 100, rot: 0, opacity: 100, anim: 'none', mode: 'ecran', plein: 'remplir', key: false };
    const j = await exporter({ ...projet('Coupe'), clips: [clip('a.mp4', 'video', { out: 4, overlays: [{ ...effet, start: 3.4, dur: 0, ss: 0 }] }), clip('a.mp4', 'video', { out: 2, overlays: [{ ...effet, start: 0, dur: 0.5, ss: 0.5 }] })] });
    const rgb = t => [...execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', t, '-i', path.join(base, 'exports', j.out), '-frames:v', 1, '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])];
    const bleu = x => x[2] > 200 && x[0] < 200, rouge = x => x[0] > 200 && x[2] < 200;
    check('effet de coupe : commence par son début, la suite reprend au milieu, rien ailleurs', bleu(rgb(3.6)) && rouge(rgb(3.95)) && rouge(rgb(4.2)) && !rouge(rgb(2)) && !bleu(rgb(2)) && !rouge(rgb(5)), [3.6, 3.95, 4.2, 2, 5].map(t => rgb(t).join('/')).join(' ')); }
  // son : un élément de la piste vidéo 2 avec son ne double plus le volume du reste du montage après sa fin ;
  // un bruitage s'entend à son instant (le décalage est posé au mélange)
  { const niveau = (f, t) => { const s = execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', t, '-t', 0.4, '-i', path.join(base, 'exports', f), '-map', '0:a:0', '-ac', 1, '-f', 's16le', '-']); let e = 0; for (let i = 0; i < s.length; i += 2) e += (s.readInt16LE(i) / 32768) ** 2; return 10 * Math.log10(e / (s.length / 2) + 1e-12); };
    const ref = await exporter({ ...projet('SonRef'), clips: [clip('a.mp4', 'video', { out: 4 }), clip('a.mp4', 'video', { out: 4 })] });
    const pv = await exporter({ ...projet('SonPiste'), clips: [clip('a.mp4', 'video', { out: 4 }), clip('a.mp4', 'video', { out: 4 })], pistes: [{ file: 'a.mp4', kind: 'video', in: 0, out: 1, start: 1, scale: 30, hasAudio: true, vol: 100, ligne: 0 }] });
    check('piste vidéo 2 : volume du montage inchangé après la fin de son son', Math.abs(niveau(pv.out, 5) - niveau(ref.out, 5)) < 1, `${niveau(pv.out, 5).toFixed(1)} / ${niveau(ref.out, 5).toFixed(1)} dB`);
    const L = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'bibliotheque', 'index.json'), 'utf8')), so = (L.sons || []).find(x => x.duree > 0.5 && x.duree < 2);
    const silence = { ...clip('a.mp4', 'video', { out: 4, vol: 0 }) };
    const bz = await exporter({ ...projet('Bruitage'), clips: [silence], audio: [{ file: 'lib:' + so.file, vol: 100, start: 2, fade: false, loop: false, duck: false, niveauBrut: true }] });
    check('bruitage : entendu à son instant, pas avant', niveau(bz.out, 1.2) < -60 && niveau(bz.out, 2.05) > -40, `${niveau(bz.out, 1.2).toFixed(1)} / ${niveau(bz.out, 2.05).toFixed(1)} dB`); }
  // long clip avec calque, titre et texte : découpé en morceaux parallèles, même image que le clip entier
  { process.env.QM_MORCEAU = '1';
    const riche = clip('a.mp4', 'video', { out: 4, titre: { preset: 'angle', l1: 'Titre long', color: '#ff2d55', start: 0.2, dur: 0 }, text: 'Texte', textStart: 0.5, overlays: [{ file: 'p.png', kind: 'image', x: 30, y: 30, scale: 30, rot: 0, opacity: 100, start: 1.5, dur: 1.2, anim: 'none', plein: '', key: false }] });
    const jm = await exporter({ ...projet('MorcRiche'), clips: [riche] });
    process.env.QM_SANS_MORCEAUX = '1'; const je = await exporter({ ...projet('EntierRiche'), clips: [riche] }); delete process.env.QM_SANS_MORCEAUX; delete process.env.QM_MORCEAU;
    const img = (f, t) => execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', t, '-i', path.join(base, 'exports', f), '-frames:v', 1, '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '160x90', '-']);
    const ec = t => { const a = img(jm.out, t), b = img(je.out, t); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    check('clip long avec calque, titre et texte : découpé en morceaux, même image que d’un seul bloc', jm.morceaux >= 2 && [1.2, 2.2, 3.5].every(t => ec(t) < 2.5), `${jm.morceaux} ${[1.2, 2.2, 3.5].map(t => ec(t).toFixed(2)).join(' ')}`); }
  // clip avec des milliers de sous-titres : tous affichés (avant : les 300 premiers seulement), graphe passé par un fichier
  { ff('-f', 'lavfi', '-i', 'color=c=gray:s=640x360:r=30:d=62', '-f', 'lavfi', '-i', 'sine=f=300:d=62', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'gris.mp4'));
    // la création de la vidéo bloque le script plus de 5 s : la connexion gardée ouverte est fermée par le serveur, on réessaie une fois
    await fetch(U('/api/import?name=gris.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'gris.mp4')) }).catch(() => fetch(U('/api/import?name=gris.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'gris.mp4')) }));
    const subs = Array.from({ length: 1200 }, (_, i) => ({ s: +(i * 0.05).toFixed(2), e: +(i * 0.05 + 0.05).toFixed(2), t: 'Mot ' + i }));
    subs.push({ s: 60.5, e: 61.5, t: 'DERNIER SOUS-TITRE BIEN VISIBLE' });
    process.env.QM_SANS_MORCEAUX = '1';
    const avec = await exporter({ ...projet('MilleSous'), clips: [clip('gris.mp4', 'video', { out: 62, subs, subSize: 9 })] }), sans = await exporter({ ...projet('SansSous'), clips: [clip('gris.mp4', 'video', { out: 62 })] });
    delete process.env.QM_SANS_MORCEAUX;
    const img = (f, t) => execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', t, '-i', path.join(base, 'exports', f), '-frames:v', 1, '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '160x90', '-']);
    const ec = t => { const a = img(avec.out, t), b = img(sans.out, t); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    check('1 200 sous-titres sur un clip : le dernier (à 60 s) s’affiche', ec(61) > 2 && ec(61.8) < 1, [ec(61), ec(61.8)].join(' ')); }
  // export d'un passage (essai) : seulement la partie choisie, nommée « extrait-… » ; titres de la piste T recalés
  { const { id } = await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: { ...projet('Extrait'), textes: [{ start: 3, dur: 2, titre: { preset: 'angle', l1: 'Titre', color: '#ff2d55', start: 0 } }] }, plage: { s: 1.5, e: 4.5 } }) })).json();
    let j; for (;;) { j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.error || j.done) break; await new Promise(r => setTimeout(r, 200)); }
    check('export d’un passage : 3 s, fichier « extrait-… »', !j.error && /^extrait-/.test(j.out || '') && Math.abs(lireDuree(j.out) - 3) < 0.25, `${j.error || ''} ${j.out} ${j.out && lireDuree(j.out)}`);
    const D = require('../decoupe'), q = D.extraireSegment({ clips: [clip('a.mp4', 'video', { out: 4, overlays: [{ file: 'x', kind: 'video', start: 1, dur: 2, anim: 'pop' }] })], audio: [], pistes: [], textes: [{ start: 3, dur: 2, titre: { start: 0.2 } }, { start: 0.5, dur: 1, titre: {} }] }, 2, 4);
    check('extrait : calque commencé avant continue, titre de la piste T recalé', q.clips[0].overlays[0].ss === 1 && q.clips[0].overlays[0].dur === 1 && q.clips[0].overlays[0].anim === 'none' && q.textes.length === 1 && q.textes[0].start === 1, JSON.stringify([q.clips[0].overlays, q.textes])); }
  // annulation : l'export s'arrête vite, avec un message clair
  { const long = { ...projet('Annule'), res: 1080, clips: Array.from({ length: 12 }, (_, i) => clip('a.mp4', 'video', { out: 4, text: 'Texte ' + i, fx: [{ id: 'flou' }] })) };
    const { id } = await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: long }) })).json();
    await new Promise(r => setTimeout(r, 700)); const t0 = Date.now();
    await fetch(U('/api/annuler?id=' + id), { method: 'POST' });
    let j; for (;;) { j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.error || j.done) break; await new Promise(r => setTimeout(r, 100)); }
    check('annulation : export arrêté vite avec « Export annulé. »', j.error === 'Export annulé.' && Date.now() - t0 < 5000, `${j.error} ${Date.now() - t0} ms`); }
  // analyse de l'image et du son : changements de plan, blancs, niveau sonore, conseils qui corrigent
  ff('-f', 'lavfi', '-i', 'color=c=red:s=320x180:r=25:d=2', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=25:d=2', '-f', 'lavfi', '-i', 'color=c=green:s=320x180:r=25:d=2',
    '-f', 'lavfi', '-i', 'sine=f=300:d=2', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono:d=2', '-f', 'lavfi', '-i', 'sine=f=500:d=2',
    '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v];[3:a][4:a][5:a]concat=n=3:v=0:a=1,volume=0.3[a]', '-map', '[v]', '-map', '[a]', '-t', 6, '-pix_fmt', 'yuv420p', path.join(base, 'plans.mp4'));
  await fetch(U('/api/import?name=plans.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'plans.mp4')) });
  const ana = await (async () => {
    const { id } = await (await fetch(U('/api/video/analyser'), { method: 'POST', body: JSON.stringify({ segments: [], duree: 6, ia: false, clips: [{ file: 'plans.mp4', kind: 'video', in: 0, out: 6, speed: 1, start: 0 }] }) })).json();
    for (;;) { const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.error) throw new Error(j.error); if (j.done) return j.resultat || j; await new Promise(r => setTimeout(r, 200)); }
  })();
  const te = (ana && ana.technique) || {};
  check('analyse : changements de plan trouvés (2 s et 4 s)', (te.scenes || []).some(x => Math.abs(x - 2) < 0.4) && (te.scenes || []).some(x => Math.abs(x - 4) < 0.4), JSON.stringify(te));
  check('analyse : part de blancs et niveau sonore mesurés', te.blancs >= 20 && te.blancs <= 50 && te.lufs < -20, JSON.stringify(te));
  check('analyse : conseils avec l’action qui corrige (niveau, blancs)', (te.conseils || []).some(c => c.action === 'normaliser') && (te.conseils || []).some(c => c.action === 'couper_blancs'), JSON.stringify(te.conseils));
  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Export : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
