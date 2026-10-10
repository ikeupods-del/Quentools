// QuenTools Monteur : serveur local (aucune dépendance, Node 18+ et FFmpeg).
// Lancement : node server.js  →  http://localhost:4173
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PORT = +process.env.QM_PORT || 4173;
const BASE = process.env.QM_DIR || path.join(os.homedir(), 'Movies', 'QuenMonteur');
const MEDIAS = path.join(BASE, 'medias');
const EXPORTS = path.join(BASE, 'exports');
const TMP = path.join(BASE, '.tmp');
[MEDIAS, EXPORTS, TMP].forEach(d => fs.mkdirSync(d, { recursive: true }));

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const FORMATS = { vertical: [1080, 1920], horizontal: [1920, 1080], carre: [1080, 1080] };
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const AUD_EXT = ['.mp3', '.m4a', '.wav', '.aac', '.aif', '.aiff', '.flac', '.ogg'];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/mp4',
  '.webm': 'video/webm', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac'
};
const FONTS = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf',
  '/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'
];
const FONT = FONTS.find(f => fs.existsSync(f)) || '';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d) => (Number.isFinite(+v) ? +v : d);
const safeName = n => path.basename(String(n || 'media')).replace(/[^\w.\- ()]/g, '_').slice(-120) || 'media';
const mediaPath = n => path.join(MEDIAS, safeName(n));
const hex = c => (/^#?[0-9a-f]{6}$/i.test(c || '') ? '0x' + String(c).replace('#', '') : '0x00ff00');

// ---------- Utilitaires FFmpeg ----------
function run(cmd, args, { cwd, onOut, binary } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd });
    const out = [];
    let err = '';
    p.stdout.on('data', d => { if (binary) out.push(d); if (onOut) onOut(d.toString()); });
    p.stderr.on('data', d => { err += d; if (err.length > 8000) err = err.slice(-8000); });
    p.on('error', e => reject(new Error(e.code === 'ENOENT' ? 'FFmpeg est introuvable : installe-le avec « brew install ffmpeg ».' : e.message)));
    p.on('close', code => (code === 0 ? resolve(binary ? Buffer.concat(out) : '') : reject(new Error(err.trim().split('\n').slice(-4).join('\n') || 'Erreur FFmpeg'))));
  });
}

async function probe(file) {
  const ext = path.extname(file).toLowerCase();
  const raw = await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { binary: true });
  const j = JSON.parse(raw.toString());
  const v = (j.streams || []).find(s => s.codec_type === 'video');
  const a = (j.streams || []).find(s => s.codec_type === 'audio');
  let kind = 'video';
  if (IMG_EXT.includes(ext)) kind = 'image';
  else if (!v && a) kind = 'audio';
  else if (!v) throw new Error('Fichier non reconnu');
  return {
    kind, duration: kind === 'image' ? 3 : +(j.format.duration || 0),
    w: v ? v.width : 0, h: v ? v.height : 0, hasAudio: !!a
  };
}

// ---------- Construction d'un clip ----------
// c : {file, kind, in, out, dur, speed, vol, fade, fit, bw, bright, contrast, sat, text, textPos, textSize, textColor, key:{...}}
// P : {w, h, fps}. o : {preview, t, tdir} (t = position dans le clip en secondes de sortie)
function buildClip(c, P, o = {}) {
  const W = P.w, H = P.h, fps = P.fps || 30;
  const isImg = c.kind === 'image';
  const speed = isImg ? 1 : clamp(num(c.speed, 1), 0.25, 4);
  const srcDur = isImg ? Math.max(0.5, num(c.dur, 3)) : Math.max(0.1, num(c.out, 1) - num(c.in, 0));
  const eff = srcDur / speed;
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  const f = [];
  const key = c.key && c.key.on;
  const t = clamp(num(o.t, 0), 0, Math.max(0, eff - 0.04));

  if (isImg) args.push('-loop', '1', '-framerate', fps, '-t', o.preview ? 1 : eff, '-i', mediaPath(c.file));
  else args.push('-ss', num(c.in, 0) + (o.preview ? t * speed : 0), '-t', o.preview ? 1.5 : srcDur, '-i', mediaPath(c.file));
  let n = 1, bg = -1, sil = -1;
  if (key && c.key.bgType === 'file' && c.key.bgFile) {
    if (c.key.bgKind === 'video') args.push('-stream_loop', '-1', '-i', mediaPath(c.key.bgFile));
    else args.push('-loop', '1', '-framerate', fps, '-i', mediaPath(c.key.bgFile));
    bg = n++;
  }
  if (!o.preview && (isImg || !c.hasAudio)) { args.push('-f', 'lavfi', '-t', eff, '-i', 'anullsrc=r=48000:cl=stereo'); sil = n++; }

  // Premier plan
  const fill = c.fit !== 'fit';
  let fg = '';
  if (!isImg && speed !== 1) fg += `setpts=(PTS-STARTPTS)/${speed},`;
  fg += `fps=${fps},` + (fill
    ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`
    : `scale=${W}:${H}:force_original_aspect_ratio=decrease,setsar=1`);
  let last;
  if (key) {
    const k = c.key;
    fg += `,format=yuv420p,chromakey=color=${hex(k.color)}:similarity=${clamp(num(k.sim, 0.15), 0.01, 0.8)}:blend=${clamp(num(k.blend, 0.08), 0, 0.5)}`;
    if (k.despill) fg += ',format=gbrap,despill=type=green:mix=0.5:expand=0.1,format=yuva420p';
    f.push(`[0:v]${fg}[fg]`);
    if (bg >= 0) f.push(`[${bg}:v]fps=${fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[bg]`);
    else f.push(`color=c=${hex(k.bgColor || '#101820')}:s=${W}x${H}:r=${fps}[bg]`);
    f.push('[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1:format=auto[c0]');
    last = 'c0';
  } else {
    if (!fill) fg += `,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black`;
    f.push(`[0:v]${fg}[c0]`);
    last = 'c0';
  }

  // Couleurs, fondu, texte
  const post = [];
  const bright = clamp(num(c.bright, 0), -50, 50) / 100, contrast = clamp(num(c.contrast, 100), 0, 200) / 100;
  const sat = c.bw ? 0 : clamp(num(c.sat, 100), 0, 300) / 100;
  if (bright !== 0 || contrast !== 1 || sat !== 1) post.push(`eq=brightness=${bright}:contrast=${contrast}:saturation=${sat}`);
  if (c.fade && !o.preview) post.push(`fade=t=in:st=0:d=0.4,fade=t=out:st=${Math.max(0, eff - 0.4).toFixed(3)}:d=0.4`);
  if (c.text && String(c.text).trim() && FONT) {
    const txt = `t${o.tdir ? o.tdir.idx : 0}.txt`;
    const size = Math.round(H * clamp(num(c.textSize, 6), 2, 15) / 100);
    fs.writeFileSync(path.join(o.tdir ? o.tdir.dir : TMP, txt), wrap(String(c.text).slice(0, 300), Math.floor(W * 0.88 / (size * 0.6))));
    const y = c.textPos === 'haut' ? `h*0.12` : c.textPos === 'milieu' ? `(h-text_h)/2` : `h*0.8-text_h`;
    post.push(`drawtext=fontfile='${FONT}':textfile=${txt}:fontsize=${size}:fontcolor=${hex(c.textColor || '#ffffff')}:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.45:boxborderw=${Math.round(size / 3)}`);
  }
  post.push('format=yuv420p');
  f.push(`[${last}]${post.join(',')}[v]`);

  if (o.preview) {
    args.push('-filter_complex', f.join(';'), '-map', '[v]', '-frames:v', 1, '-f', 'mjpeg', '-q:v', 4, 'pipe:1');
    return args;
  }

  // Audio
  const src = sil >= 0 ? `${sil}:a` : '0:a';
  const af = [];
  let s = speed;
  while (s > 2) { af.push('atempo=2'); s /= 2; }
  while (s < 0.5) { af.push('atempo=0.5'); s *= 2; }
  if (s !== 1) af.push(`atempo=${s}`);
  af.push(`volume=${clamp(num(c.vol, 100), 0, 300) / 100}`);
  if (c.fade) af.push(`afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, eff - 0.4).toFixed(3)}:d=0.4`);
  af.push('aresample=48000', 'aformat=sample_fmts=fltp:channel_layouts=stereo');
  f.push(`[${src}]${af.join(',')}[a]`);

  args.push('-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]', '-t', eff.toFixed(3), '-r', fps,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', 18, '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', 48000, '-ac', 2, '-movflags', '+faststart',
    '-progress', 'pipe:1', '-nostats');
  return { args, eff };
}

// Retour à la ligne automatique du texte (drawtext ne le fait pas).
function wrap(text, max) {
  return text.split('\n').map(line => {
    const out = []; let cur = '';
    for (const w of line.split(/\s+/)) {
      if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    }
    out.push(cur);
    return out.join('\n');
  }).join('\n');
}

function sizeOf(project, small) {
  const [w, h] = FORMATS[project.format] || FORMATS.vertical;
  const k = small ? 540 / Math.min(w, h) : 1;
  return { w: Math.round(w * k / 2) * 2, h: Math.round(h * k / 2) * 2, fps: clamp(num(project.fps, 30), 24, 60) };
}

// ---------- Exportation ----------
const jobs = new Map();

async function exportProject(job, project) {
  const clips = (project.clips || []).filter(c => c && c.file);
  if (!clips.length) throw new Error('La timeline est vide.');
  const P = sizeOf(project, false);
  const dir = fs.mkdtempSync(path.join(TMP, 'job-'));
  job.dir = dir;
  const built = clips.map((c, i) => buildClip(c, P, { tdir: { dir, idx: i } }));
  const total = built.reduce((a, b) => a + b.eff, 0);
  let done = 0;
  const segs = [];
  for (let i = 0; i < built.length; i++) {
    const seg = `seg${i}.mp4`;
    job.step = `Clip ${i + 1} sur ${built.length}`;
    await run(FFMPEG, [...built[i].args, seg], {
      cwd: dir,
      onOut: d => { const m = d.match(/out_time_us=(\d+)/g); if (m) { const us = +m[m.length - 1].split('=')[1]; job.progress = clamp((done + us / 1e6) / total, 0, 0.97); } }
    });
    done += built[i].eff;
    segs.push(seg);
  }
  job.step = 'Assemblage';
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const outName = `montage-${stamp}.mp4`;
  const outPath = path.join(EXPORTS, outName);
  let joined = segs[0];
  if (segs.length > 1) {
    fs.writeFileSync(path.join(dir, 'liste.txt'), segs.map(s => `file '${s}'`).join('\n'));
    await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', 0, '-i', 'liste.txt', '-c', 'copy', 'all.mp4'], { cwd: dir });
    joined = 'all.mp4';
  }
  if (project.music && project.music.file) {
    job.step = 'Musique';
    const vol = clamp(num(project.music.vol, 30), 0, 200) / 100;
    await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', joined, '-stream_loop', '-1', '-i', mediaPath(project.music.file),
      '-filter_complex', `[1:a]volume=${vol},aresample=48000[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0,volume=2[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', 'final.mp4'], { cwd: dir });
    joined = 'final.mp4';
  }
  fs.copyFileSync(path.join(dir, joined), outPath);
  fs.rmSync(dir, { recursive: true, force: true });
  job.progress = 1;
  job.out = outName;
}

// ---------- Serveur HTTP ----------
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', d => { s += d; if (s.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { reject(new Error('Requête invalide')); } });
  });
}
function serveFile(req, res, file, download) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Introuvable' });
  const st = fs.statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const h = { 'Content-Type': type, 'Accept-Ranges': 'bytes' };
  if (download) h['Content-Disposition'] = `attachment; filename="${path.basename(file)}"`;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
    res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
    fs.createReadStream(file, { start: a, end: b }).pipe(res);
  } else {
    res.writeHead(200, { ...h, 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return serveFile(req, res, path.join(__dirname, 'index.html'));
    if (req.method === 'GET' && p.startsWith('/media/')) return serveFile(req, res, mediaPath(decodeURIComponent(p.slice(7))));
    if (req.method === 'GET' && p.startsWith('/exports/')) return serveFile(req, res, path.join(EXPORTS, safeName(decodeURIComponent(p.slice(9)))), true);

    if (req.method === 'GET' && p === '/api/medias') {
      const items = [];
      for (const n of fs.readdirSync(MEDIAS).filter(x => !x.startsWith('.'))) {
        try { items.push({ file: n, ...(await probe(path.join(MEDIAS, n))) }); } catch (e) { /* fichier ignoré */ }
      }
      return send(res, 200, { items, folder: BASE, font: !!FONT });
    }
    if (req.method === 'POST' && p === '/api/import') {
      let name = safeName(url.searchParams.get('name')), dest = path.join(MEDIAS, name), i = 2;
      while (fs.existsSync(dest)) { const e = path.extname(name); dest = path.join(MEDIAS, `${path.basename(name, e)}-${i++}${e}`); }
      await new Promise((ok, ko) => { const w = fs.createWriteStream(dest); req.pipe(w); w.on('finish', ok); w.on('error', ko); req.on('error', ko); });
      try { return send(res, 200, { file: path.basename(dest), ...(await probe(dest)) }); }
      catch (e) { fs.unlinkSync(dest); throw new Error('Ce fichier n’est pas un média lisible.'); }
    }
    if (req.method === 'DELETE' && p.startsWith('/api/medias/')) {
      const f = mediaPath(decodeURIComponent(p.slice(12)));
      if (fs.existsSync(f)) fs.unlinkSync(f);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && p === '/api/frame') { // image brute d'un média
      const f = mediaPath(url.searchParams.get('file'));
      const img = await run(FFMPEG, ['-v', 'error', '-ss', num(url.searchParams.get('t'), 0), '-i', f, '-frames:v', 1,
        '-vf', 'scale=720:-2', '-f', 'mjpeg', '-q:v', 4, 'pipe:1'], { binary: true });
      return send(res, 200, img, 'image/jpeg');
    }
    if (req.method === 'POST' && p === '/api/preview') { // image d'un clip avec ses effets
      const body = await readJson(req);
      const P = sizeOf(body.project || {}, true);
      const dir = fs.mkdtempSync(path.join(TMP, 'pv-'));
      try {
        const args = buildClip(body.clip, P, { preview: true, t: body.t, tdir: { dir, idx: 0 } });
        const img = await run(FFMPEG, args, { cwd: dir, binary: true });
        return send(res, 200, img, 'image/jpeg');
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    if (req.method === 'POST' && p === '/api/export') {
      const body = await readJson(req);
      const id = String(Date.now());
      const job = { progress: 0, step: 'Préparation', out: null, error: null };
      jobs.set(id, job);
      exportProject(job, body.project || {}).catch(e => { job.error = e.message; if (job.dir) fs.rmSync(job.dir, { recursive: true, force: true }); });
      return send(res, 200, { id });
    }
    if (req.method === 'GET' && p === '/api/job') {
      const job = jobs.get(url.searchParams.get('id'));
      return job ? send(res, 200, job) : send(res, 404, { error: 'Export inconnu' });
    }
    send(res, 404, { error: 'Introuvable' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log(`QuenTools Monteur : http://localhost:${PORT}\nDossier de travail : ${BASE}`));
}
module.exports = { buildClip, server };
