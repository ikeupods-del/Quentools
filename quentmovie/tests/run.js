// Contrôle complet du moteur : chaque effet, transition, incrustation, texte, fond vert et export.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { create } = require('../server');
const FX = require('../effects');
const { resolveFfmpeg } = require('../ffmpeg-path');

let ok = 0, ko = 0, skip = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

(async () => {
  const bins = await resolveFfmpeg();
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-test-'));
  const app = create({ port: 0, base, ...bins });
  const port = await app.start();
  const U = p => `http://127.0.0.1:${port}${p}`;
  console.log('Serveur de test sur', port, '—', bins.ffmpeg);

  // Médias de test
  const gen = path.join(base, 'gen'); fs.mkdirSync(gen);
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  ff('-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=330:d=4', '-shortest', '-pix_fmt', 'yuv420p', path.join(gen, 'demo.mp4'));
  ff('-f', 'lavfi', '-i', 'color=c=0x00b140:s=1280x720:r=30:d=4', '-f', 'lavfi', '-i', 'color=c=orange:s=300x300:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4',
    '-filter_complex', "[0][1]overlay=x='100+200*t':y=200[o]", '-map', '[o]', '-map', '2:a', '-shortest', '-pix_fmt', 'yuv420p', path.join(gen, 'vert.mp4'));
  ff('-f', 'lavfi', '-i', 'testsrc2=s=800x800', '-frames:v', 1, path.join(gen, 'photo.png'));
  ff('-f', 'lavfi', '-i', 'sine=f=220:d=12', path.join(gen, 'musique.mp3'));
  for (const n of ['demo.mp4', 'vert.mp4', 'photo.png', 'musique.mp3']) {
    const r = await fetch(U('/api/import?name=' + n), { method: 'POST', body: fs.readFileSync(path.join(gen, n)) });
    const txt = await r.text(); check('import ' + n, r.ok, txt);
  }
  // Formats variés : .mov, .mkv, .avi, .webm, audio .wav / .m4a / .flac / .ogg, photo .tiff
  const encs = execFileSync(bins.ffmpeg, ['-hide_banner', '-encoders']).toString();
  const variantes = [['mov-h264.mov', ['-c:v', 'libx264', '-c:a', 'aac']], ['clip.mkv', ['-c:v', 'libx264', '-c:a', 'aac']], ['clip.avi', ['-c:v', 'mpeg4', '-c:a', 'mp3']], ['clip.webm', encs.includes('libvpx ') ? ['-c:v', 'libvpx', '-c:a', 'libvorbis'] : null],
    ['prores.mov', encs.includes('prores_ks') ? ['-c:v', 'prores_ks', '-c:a', 'pcm_s16le'] : null], ['hevc.mov', encs.includes('libx265') ? ['-c:v', 'libx265', '-tag:v', 'hvc1', '-c:a', 'aac'] : null]];
  for (const [nom, codecs] of variantes) {
    if (!codecs) { skip++; continue; }
    ff('-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=30:d=2', '-f', 'lavfi', '-i', 'sine=f=300:d=2', '-shortest', '-pix_fmt', 'yuv420p', ...codecs, path.join(gen, nom));
    const r = await fetch(U('/api/import?name=' + nom), { method: 'POST', body: fs.readFileSync(path.join(gen, nom)) });
    const j = await r.json();
    check('import ' + nom + ' reconnu comme vidéo', r.ok && j.kind === 'video' && j.duration > 1.5, JSON.stringify(j));
  }
  for (const [nom, args] of [['son.wav', []], ['son.m4a', ['-c:a', 'aac']], ['son.flac', ['-c:a', 'flac']], ['son.ogg', ['-c:a', 'libvorbis']]]) {
    ff('-f', 'lavfi', '-i', 'sine=f=300:d=2', ...args, path.join(gen, nom));
    const r = await fetch(U('/api/import?name=' + nom), { method: 'POST', body: fs.readFileSync(path.join(gen, nom)) }); const j = await r.json();
    check('import audio ' + nom, r.ok && j.kind === 'audio', JSON.stringify(j));
  }
  ff('-f', 'lavfi', '-i', 'testsrc2=s=400x300', '-frames:v', 1, path.join(gen, 'photo.tiff'));
  { const r = await fetch(U('/api/import?name=photo.tiff'), { method: 'POST', body: fs.readFileSync(path.join(gen, 'photo.tiff')) }); const j = await r.json(); check('import photo .tiff', r.ok && j.kind === 'image', JSON.stringify(j)); }
  { const r = await fetch(U('/api/import?name=faux.mov'), { method: 'POST', body: Buffer.from('ce nest pas une video') }); check('fichier invalide refusé proprement', r.status === 500); }
  { const j = await (await fetch(U('/api/proxy?file=mov-h264.mov'))).json(); const v = await fetch(U(j.url)); check('copie de lecture d’un .mov', v.ok && (await v.arrayBuffer()).byteLength > 3000); }
  { const w = await fetch(U('/api/wave?file=musique.mp3&w=600&h=60')); check('forme d’onde', w.ok && (await w.arrayBuffer()).byteLength > 100); }
  const cat = await (await fetch(U('/api/catalogue'))).json();
  check('catalogue', cat.video.length >= 30 && cat.audio.length >= 8 && cat.transitions.length >= 15);
  console.log(`Banque : ${cat.video.length} effets image, ${cat.audio.length} effets son, ${cat.transitions.length} transitions`);

  const clip = (extra = {}) => ({ file: 'demo.mp4', kind: 'video', in: 0, out: 4, speed: 1, vol: 100, hasAudio: true, fit: 'fill', fx: [], key: {}, ...extra });
  const project = (clips, extra = {}) => ({ format: 'vertical', fps: 30, res: 480, clips, ...extra });
  const preview = async (c, t = 1) => fetch(U('/api/preview'), { method: 'POST', body: JSON.stringify({ project: project([c]), clip: c, t }) });
  // Lit la réponse une seule fois ; en cas d'échec, garde le message d'erreur du serveur.
  const lastErr = { v: '' };
  const isJpeg = async r => {
    const b = Buffer.from(await r.arrayBuffer());
    const bon = r.ok && b[0] === 0xff && b[1] === 0xd8 && b.length > 2000;
    lastErr.v = bon ? '' : b.toString('utf8').slice(0, 400);
    return bon;
  };

  // 1) Chaque effet image, en aperçu et avec ses valeurs extrêmes
  for (const d of cat.video) {
    if (!d.dispo) { skip++; console.log('  (ignoré, filtre absent) ' + d.id); continue; }
    for (const mode of ['défaut', 'min', 'max']) {
      const p = {}; if (mode !== 'défaut') d.params.forEach(q => { p[q.k] = mode === 'min' ? q.min : q.max; });
      const r = await preview(clip({ fx: [{ id: d.id, p }] }));
      check(`effet ${d.id} (${mode})`, await isJpeg(r), lastErr.v);
    }
  }
  // Effet sur une photo, et vignettes
  check('effet sur photo', await isJpeg(await preview({ file: 'photo.png', kind: 'image', dur: 3, fit: 'fill', fx: [{ id: 'zoomavant' }, { id: 'vignette' }], key: {} })));
  check('vignette d’effet', await isJpeg(await fetch(U('/api/fxthumb?file=demo.mp4&kind=video&t=1&fx=glitch'))));

  // 2) Texte : styles et animations
  for (const style of ['simple', 'bandeau', 'contour', 'ombre']) for (const anim of ['aucune', 'apparition', 'glisse']) {
    const r = await preview(clip({ text: 'Bonjour : le monde, "test" (1/2)', textStyle: style, textAnim: anim, textPos: 'milieu', textStart: 0.5, textDur: 2 }));
    check(`texte ${style}/${anim}`, await isJpeg(r), lastErr.v);
  }
  // 2b) Titres de reportage (début, milieu et fin de leur animation) et générateurs
  for (const r of cat.reportage) for (const [t, dur] of [[0.2, 0], [1.5, 3], [2.8, 3]]) {
    const rr = await preview(clip({ titre: { preset: r.id, l1: r.l1, l2: r.l2, color: r.color, start: 0, dur } }), t);
    check(`titre reportage ${r.id} (t=${t})`, await isJpeg(rr), lastErr.v);
  }
  check('générateur fond uni + titre', await isJpeg(await preview({ kind: 'solid', color: '#0b1d3a', dur: 4, fx: [], key: {}, titre: { preset: 'chapitre', l1: 'CHAPITRE 1', l2: 'Début', color: '#ffffff', start: 0, dur: 0 } })), lastErr.v);
  // 2c) Calques animés, sous-titres, polices
  for (const anim of ['none', 'pop', 'fade', 'glisse', 'monte', 'rebond']) for (const rot of [0, 15]) {
    const rr = await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: project([clip({ out: 2, overlays: [{ file: 'lib:stickers/coeur.png', kind: 'image', x: 70, y: 30, scale: 25, rot, opacity: 90, start: 0.3, dur: 1.2, anim }] })]) }) });
    const { id } = await rr.json(); let j; for (let i = 0; i < 200; i++) { await new Promise(r => setTimeout(r, 250)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) break; }
    check(`calque animé ${anim} rot ${rot}`, j && j.done, j && j.error);
  }
  check('calque en aperçu', await isJpeg(await preview(clip({ overlays: [{ file: 'lib:stickers/etoile.png', kind: 'image', x: 50, y: 50, scale: 30, start: 0, dur: 0, anim: 'pop' }] }), 1)), lastErr.v);
  check('sous-titres', await isJpeg(await preview(clip({ subs: [{ s: 0, e: 3, t: 'Bonjour à tous, bienvenue : c’est parti !' }], subStyle: 'bandeau' }))), lastErr.v);
  for (const f of (cat.polices || []).slice(0, 6)) check('police ' + f.id, await isJpeg(await preview(clip({ text: 'Essai', textFont: f.id, titre: { preset: 'tiers', l1: 'Nom', l2: 'Fonction', font: f.id, start: 0, dur: 0, color: '#c8102e' } }))), lastErr.v);
  // 2d) Podcast : clip audio avec fond et visualiseur
  for (const type of ['ligne', 'ondes', 'points', 'barres', 'none']) {
    check('podcast visualiseur ' + type, await isJpeg(await preview({ file: 'musique.mp3', kind: 'audio', in: 0, out: 6, speed: 1, vol: 100, hasAudio: true, fx: [], key: {}, bgColor: '#102040', viz: { type, color: '#ffd400', pos: 'centre', h: 30 }, titre: { preset: 'souligne', l1: 'Épisode 1', l2: 'Mon podcast', color: '#ffb400', start: 0, dur: 0 } }, 1)), lastErr.v);
  }
  check('podcast avec pochette', await isJpeg(await preview({ file: 'musique.mp3', kind: 'audio', in: 0, out: 6, speed: 1, hasAudio: true, fx: [], key: {}, bgFile: 'photo.png', viz: { type: 'ligne', color: '#ffffff', pos: 'bas', h: 20 } })), lastErr.v);
  // 2e) Silences
  { const sj = await (await fetch(U('/api/silences?file=musique.mp3&in=0&out=10&db=-40&min=0.3'))).json(); check('détection des silences', Array.isArray(sj.silences)); }
  // 3) Incrustation, fond vert, cadrage flou
  check('incrustation', await isJpeg(await preview(clip({ pip: { on: true, file: 'photo.png', kind: 'image', pos: 'tr', scale: 30, opacity: 80 } }))));
  check('incrustation vidéo', await isJpeg(await preview(clip({ pip: { on: true, file: 'vert.mp4', kind: 'video', pos: 'mc', scale: 40, opacity: 100 } }))));
  check('fond vert + image', await isJpeg(await preview(clip({ file: 'vert.mp4', key: { on: true, color: '#00b140', sim: 0.15, blend: 0.08, despill: true, bgType: 'file', bgFile: 'photo.png', bgKind: 'image' } }))));
  check('cadrage flou', await isJpeg(await preview(clip({ fit: 'flou' }))));

  // 3b) Bibliothèque : looks (LUT), effets animés, cadres, décors, animations sur fond vert, Mes packs
  const L = cat.bibliotheque;
  check('bibliothèque complète', L.luts.length >= 30 && L.calques.length >= 15 && L.cadres.length >= 10 && L.fonds.length >= 15 && L.fondvert.length >= 9 && L.sons.length >= 60,
    JSON.stringify(Object.fromEntries(Object.entries(L).map(([k, v]) => [k, v.length]))));
  for (const k of ['sons', 'musiques', 'stickers', 'luts', 'calques', 'cadres', 'fonds', 'fondvert']) {
    const manquants = L[k].filter(x => !fs.existsSync(app.mediaPath('lib:' + x.file)) || (/-h\.(png|jpg)$/.test(x.file) && !fs.existsSync(app.mediaPath('lib:' + x.file.replace('-h.', '-v.')))));
    check('fichiers de la bibliothèque : ' + k, !manquants.length, manquants.map(x => x.file).join(', '));
  }
  for (const x of L.luts) check('look ' + x.id, await isJpeg(await preview(clip({ lut: { file: 'lib:' + x.file, amount: 100 } }))), lastErr.v);
  check('look à 40 %', await isJpeg(await preview(clip({ lut: { file: 'lib:' + L.luts[0].file, amount: 40 } }))), lastErr.v);
  check('vignette de look', await isJpeg(await fetch(U('/api/fxthumb?file=demo.mp4&kind=video&t=1&lut=' + encodeURIComponent('lib:' + L.luts[1].file)))), lastErr.v);
  for (const x of L.calques) check('effet animé ' + x.id, await isJpeg(await preview(clip({ overlays: [{ file: 'lib:' + x.file, kind: 'video', mode: 'ecran', plein: 'remplir', opacity: 90, start: 0, dur: 0 }] }))), lastErr.v);
  for (const m of ['ecran', 'addition', 'eclaircir', 'produit', 'incrustation', 'lumiere']) check('mélange ' + m, await isJpeg(await preview(clip({ overlays: [{ file: 'lib:' + L.calques[0].file, kind: 'video', mode: m, opacity: 70 }] }))), lastErr.v);
  for (const x of L.cadres) for (const format of ['vertical', 'horizontal', 'carre']) {
    const c = clip({ overlays: [{ file: 'lib:' + x.file, kind: 'image', plein: 'cadre', anim: 'none', opacity: 100 }] });
    const rr = await fetch(U('/api/preview'), { method: 'POST', body: JSON.stringify({ project: project([c], { format }), clip: c, t: 1 }) });
    check(`cadre ${x.id} (${format})`, await isJpeg(rr), lastErr.v);
  }
  for (const x of L.fonds) {
    check('décor derrière le fond vert ' + x.id, await isJpeg(await preview(clip({ file: 'vert.mp4', key: { on: true, color: '#00b140', sim: 0.15, blend: 0.08, bgType: 'file', bgFile: 'lib:' + x.file, bgKind: x.kind || 'image' } }))), lastErr.v);
  }
  check('décor seul dans la timeline', await isJpeg(await preview({ file: 'lib:' + L.fonds[0].file, kind: 'image', dur: 3, fit: 'fill', fx: [], key: {} })), lastErr.v);
  for (const x of L.fondvert) check('animation fond vert ' + x.id, await isJpeg(await preview(clip({ overlays: [{ file: 'lib:' + x.file, kind: 'video', key: true, keySim: 0.3, x: 50, y: 50, scale: 60, anim: 'none', start: 0, dur: 0 }] }))), lastErr.v);
  { // export : look + effet animé + cadre + animation fond vert sur le même clip
    const rr = await (async () => { const { id } = await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: project([clip({ out: 2, lut: { file: 'lib:' + L.luts[0].file, amount: 80 },
      overlays: [{ file: 'lib:' + L.calques[0].file, kind: 'video', mode: 'ecran', opacity: 80, start: 0.5, dur: 1 }, { file: 'lib:' + L.cadres[0].file, kind: 'image', plein: 'cadre', anim: 'fade', start: 0, dur: 0 },
        { file: 'lib:' + L.fondvert[0].file, kind: 'video', key: true, x: 50, y: 70, scale: 50, anim: 'pop', start: 0.2, dur: 1.5 }] })]) }) })).json();
      let j; for (let i = 0; i < 300; i++) { await new Promise(r => setTimeout(r, 250)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) break; } return j; })();
    check('export look + effet animé + cadre + fond vert', rr && rr.done, rr && rr.error);
  }
  // Studio : module de détourage (fond virtuel) servi en local
  for (const f of ['selfie_segmentation.js', 'selfie_segmentation_solution_simd_wasm_bin.wasm', 'selfie_segmentation_landscape.tflite', 'selfie_segmentation.binarypb']) {
    const rr = await fetch(U('/vendor/selfie/' + f)); check('fond virtuel : ' + f, rr.ok && (await rr.arrayBuffer()).byteLength > 100);
  }
  check('fond virtuel : seuls ses fichiers sont servis', (await fetch(U('/vendor/selfie/' + encodeURIComponent('../../../package.json')))).status === 404);
  // Mes packs : un dossier rangé par l'utilisateur est reconnu
  const packs = path.join(base, 'packs', 'Pack test', 'Sons'); fs.mkdirSync(packs, { recursive: true });
  ff('-f', 'lavfi', '-i', 'sine=f=500:d=1.5', path.join(packs, 'bip_test.wav'));
  ff('-f', 'lavfi', '-i', 'color=c=0x00ff00:s=320x320:r=30:d=2', '-f', 'lavfi', '-i', 'color=c=red:s=80x80:r=30:d=2', '-filter_complex', '[0][1]overlay=120:120', '-pix_fmt', 'yuv420p', path.join(base, 'packs', 'Pack test', 'cercle vert.mp4'));
  fs.copyFileSync(app.mediaPath('lib:' + L.luts[2].file), path.join(base, 'packs', 'Pack test', 'mon look.cube'));
  fs.copyFileSync(app.mediaPath('lib:stickers/coeur.png'), path.join(base, 'packs', 'Pack test', 'coeur.png'));
  const pk = await (await fetch(U('/api/packs'))).json();
  check('Mes packs : sons, vidéos, images, looks', pk.sons.length === 1 && pk.videos.length === 1 && pk.images.length === 1 && pk.luts.length === 1 && pk.sons[0].cat === 'Pack test' && pk.sons[0].duree > 1, JSON.stringify(pk));
  check('Mes packs : look appliqué', await isJpeg(await preview(clip({ lut: { file: pk.luts[0].file, amount: 100 } }))), lastErr.v);
  check('Mes packs : vidéo fond vert en calque', await isJpeg(await preview(clip({ overlays: [{ file: pk.videos[0].file, kind: 'video', key: true, x: 50, y: 50, scale: 40, start: 0, dur: 0 }] }))), lastErr.v);
  check('Mes packs : son lisible', (await fetch(U('/media/' + encodeURIComponent(pk.sons[0].file)))).ok);
  check('Mes packs : sortie du dossier refusée', (await fetch(U('/media/' + encodeURIComponent('pack:../projet-auto.json')))).status >= 400);
  { const rr = await fetch(U('/api/import?name=import.cube'), { method: 'POST', body: fs.readFileSync(app.mediaPath('lib:' + L.luts[3].file)) }); const j = await rr.json(); check('import d’un look .cube', rr.ok && j.kind === 'lut' && j.file.startsWith('pack:'), JSON.stringify(j)); }
  { const rr = await fetch(U('/api/import?name=faux.cube'), { method: 'POST', body: 'pas un lut' }); check('faux .cube refusé', rr.status === 500); }
  { // prise du studio (fichier WebM du navigateur) : convertie en MP4 propre
    const webm = encs.includes('libvpx ') && encs.includes('libopus'), nom = webm ? 'camera-essai.webm' : 'camera-essai.mkv';
    ff('-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=30:d=2', '-f', 'lavfi', '-i', 'sine=f=300:d=2', '-shortest', ...(webm ? ['-c:v', 'libvpx', '-c:a', 'libopus'] : ['-c:v', 'mpeg4', '-c:a', 'aac']), path.join(gen, nom));
    const rr = await fetch(U('/api/import?name=' + nom), { method: 'POST', body: fs.readFileSync(path.join(gen, nom)) }); const j = await rr.json();
    check('prise du studio convertie en MP4', rr.ok && j.kind === 'video' && j.file.endsWith('-prise.mp4') && j.duration > 1.5 && j.hasAudio, JSON.stringify(j));
  }
  { await fetch(U('/api/medias/' + encodeURIComponent('lib:' + L.sons[0].file)), { method: 'DELETE' }); check('la bibliothèque ne peut pas être supprimée', fs.existsSync(app.mediaPath('lib:' + L.sons[0].file))); }

  // 4) Export complet : transitions, effets son, musique, vitesse, inverse
  const job = async (url, proj) => {
    const { id } = await (await fetch(U(url), { method: 'POST', body: JSON.stringify({ project: proj }) })).json();
    for (let i = 0; i < 400; i++) {
      await new Promise(r => setTimeout(r, 300));
      const j = await (await fetch(U('/api/job?id=' + id))).json();
      if (j.error) return { error: j.error };
      if (j.done) return j;
    }
    return { error: 'délai dépassé' };
  };
  const probeDur = f => parseFloat(execFileSync(bins.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

  const afxAll = cat.audio.filter(a => a.dispo).map(a => ({ id: a.id, p: {} }));
  let r = await job('/api/export', project([
    clip({ out: 2, afx: afxAll.slice(0, 5), transition: { type: 'fade', dur: 0.5 }, text: 'Titre', textStyle: 'contour', fx: [{ id: 'vhs' }] }),
    clip({ file: 'photo.png', kind: 'image', dur: 2, fx: [{ id: 'zoomavant' }], transition: { type: 'slideleft', dur: 0.5 }, hasAudio: false }),
    clip({ file: 'vert.mp4', speed: 2, fade: true, afx: afxAll.slice(5), key: { on: true, color: '#00b140', sim: 0.15, blend: 0.08, bgType: 'color', bgColor: '#223388' } }),
    clip({ out: 2, fx: [{ id: 'inverse' }] })
  ], { audio: [{ file: 'musique.mp3', vol: 30, start: 0, fade: true }, { file: 'musique.mp3', vol: 60, start: 3 }] }));
  check('export avec transitions et musique', !r.error && r.out, r.error);
  if (r.out) {
    const f = path.join(base, 'exports', r.out), d = probeDur(f);
    const st = execFileSync(bins.ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'csv=p=0', f]).toString();
    check('durée attendue (≈ 2+2+2+2 − 1 de transitions)', d > 6 && d < 8, d);
    check('format vertical', /1080|480/.test(st) && st.includes('h264'), st);
  }
  // Toutes les transitions
  for (const t of cat.transitions) {
    const rr = await job('/api/export', project([clip({ out: 1.5, transition: { type: t.id, dur: 0.5 } }), clip({ file: 'vert.mp4', out: 1.5 })]));
    check('transition ' + t.id, !rr.error && rr.out, rr.error);
  }
  // Générateur + titre + bruitage de la bibliothèque dans un export
  const lib = cat.bibliotheque || { sons: [], musiques: [] };
  r = await job('/api/export', project([
    { kind: 'solid', color: '#000000', dur: 3, fx: [], key: {}, titre: { preset: 'compte', l1: '3', start: 0, dur: 0 } },
    clip({ out: 2, titre: { preset: 'tiers', l1: 'Jeanne Martin', l2: 'Reporter', color: '#c8102e', start: 0.2, dur: 1.5 } })
  ], { audio: lib.sons.length ? [{ file: 'lib:' + lib.sons[0].file, vol: 100, start: 0.5 }, ...(lib.musiques.length ? [{ file: 'lib:' + lib.musiques[0].file, vol: 40, start: 0, fade: true, loop: true }] : [])] : [] }));
  check('export générateur + titre + bibliothèque', !r.error && r.out, r.error);
  // Formats d'export, normalisation, baisse automatique de la musique sous la voix
  for (const sortie of cat.sorties) {
    const rr = await job('/api/export', project([clip({ out: 1.5, file: 'demo.mp4' })], { sortie, normaliser: sortie === 'mp3', audio: [{ file: 'lib:' + lib.musiques[0].file, vol: 60, start: 0, duck: true, loop: true, fade: true }] }));
    check('export ' + sortie, !rr.error && rr.out && rr.out.endsWith('.' + sortie), rr.error);
    if (rr.out) { const sz = fs.statSync(path.join(base, 'exports', rr.out)).size; check('fichier ' + sortie + ' non vide', sz > 2000, sz); }
  }
  r = await job('/api/export', project([{ file: 'musique.mp3', kind: 'audio', in: 0, out: 4, speed: 1, vol: 100, hasAudio: true, fx: [], key: {}, bgColor: '#102040', viz: { type: 'barres', color: '#ffffff', pos: 'centre', h: 30 }, afx: [{ id: 'podcast', p: {} }, { id: 'gate', p: {} }, { id: 'deesser', p: {} }],
    titre: { preset: 'machine', l1: 'Épisode 1 : le début', start: 0, dur: 0, speed: 12 } }]));
  check('export podcast (visualiseur + voix pro + machine à écrire)', !r.error && r.out, r.error);
  // Aperçu animé
  r = await job('/api/apercu', project([clip({ out: 2, fx: [{ id: 'glitch' }] }), clip({ out: 2 })]));
  check('aperçu animé', !r.error && r.url, r.error);
  if (r.url) { const v = await fetch(U(r.url)); check('lecture aperçu', v.ok && (await v.arrayBuffer()).byteLength > 5000); }

  // 5) Projets et sécurité
  await fetch(U('/api/projets/essai'), { method: 'PUT', body: JSON.stringify({ clips: [1] }) });
  check('projet enregistré', (await (await fetch(U('/api/projets'))).json()).items.includes('essai'));
  check('projet relu', (await (await fetch(U('/api/projets/essai'))).json()).clips[0] === 1);
  const evil = await fetch(U('/api/catalogue'), { headers: { Origin: 'https://exemple.fr' } });
  check('origine étrangère refusée', evil.status === 403);

  console.log(`\n${ok} contrôles réussis, ${ko} échecs, ${skip} effets ignorés (filtre absent)`);
  app.stop();
  fs.rmSync(base, { recursive: true, force: true });
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
