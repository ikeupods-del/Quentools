// QuentMovie : moteur de montage local (serveur HTTP + FFmpeg). Aucune dépendance.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const FX = require('./effects');

const FORMATS = { vertical: [9, 16], horizontal: [16, 9], carre: [1, 1] };
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.webm': 'video/webm',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac'
};
const FONTS = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'
];
const FONT = FONTS.find(f => fs.existsSync(f)) || '';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d) => (Number.isFinite(+v) ? +v : d);
const safeName = n => path.basename(String(n || 'media')).replace(/[^\w.\- ()]/g, '_').slice(-120) || 'media';
const hex = c => (/^#?[0-9a-f]{6}$/i.test(c || '') ? '0x' + String(c).replace('#', '') : '0x00ff00');
const even = n => Math.max(2, Math.round(n / 2) * 2);

function create(opts = {}) {
  const PORT = opts.port || 0;
  const BASE = opts.base || path.join(os.homedir(), 'Movies', 'QuentMovie');
  const MEDIAS = path.join(BASE, 'medias'), EXPORTS = path.join(BASE, 'exports'), TMP = path.join(BASE, '.tmp'), PROJETS = path.join(BASE, 'projets');
  [MEDIAS, EXPORTS, TMP, PROJETS].forEach(d => fs.mkdirSync(d, { recursive: true }));
  const APERCUS = path.join(TMP, 'apercus'); fs.mkdirSync(APERCUS, { recursive: true });
  let FFMPEG = opts.ffmpeg || 'ffmpeg', FFPROBE = opts.ffprobe || 'ffprobe';
  let filters = new Set(), encoders = new Set(), version = '';
  const mediaPath = n => path.join(MEDIAS, safeName(n));

  // ---------- FFmpeg ----------
  function run(cmd, args, { cwd, onOut, binary } = {}) {
    return new Promise((resolve, reject) => {
      const p = spawn(cmd, args, { cwd });
      const out = []; let err = '';
      p.stdout.on('data', d => { if (binary) out.push(d); if (onOut) onOut(d.toString()); });
      p.stderr.on('data', d => { err += d; if (err.length > 8000) err = err.slice(-8000); });
      p.on('error', e => reject(new Error(e.code === 'ENOENT' ? 'FFmpeg est introuvable.' : e.message)));
      p.on('close', code => (code === 0 ? resolve(binary ? Buffer.concat(out) : '') : reject(new Error(err.trim().split('\n').slice(-4).join('\n') || 'Erreur FFmpeg'))));
    });
  }
  async function detect() {
    const f = (await run(FFMPEG, ['-hide_banner', '-filters'], { binary: true })).toString();
    filters = new Set(f.split('\n').map(l => l.trim().split(/\s+/)[1]).filter(Boolean));
    const e = (await run(FFMPEG, ['-hide_banner', '-encoders'], { binary: true })).toString();
    encoders = new Set(e.split('\n').map(l => l.trim().split(/\s+/)[1]).filter(Boolean));
    version = (await run(FFMPEG, ['-version'], { binary: true })).toString().split('\n')[0];
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
    return { kind, duration: kind === 'image' ? 3 : +(j.format.duration || 0), w: v ? v.width : 0, h: v ? v.height : 0, hasAudio: !!a };
  }

  // ---------- Construction d'un clip ----------
  // c : clip ; P : {w, h, fps} ; o : {preview, t, tdir, proxy}
  function buildClip(c, P, o = {}) {
    const W = P.w, H = P.h, fps = P.fps;
    const isImg = c.kind === 'image';
    const stack = (c.fx || []).filter(e => e && FX.VIDEO.find(d => d.id === e.id));
    const rev = !isImg && stack.some(e => e.id === 'inverse') && filters.has('reverse');
    const speed = isImg ? 1 : clamp(num(c.speed, 1), 0.25, 4);
    const srcDur = isImg ? Math.max(0.5, num(c.dur, 3)) : Math.max(0.1, num(c.out, 1) - num(c.in, 0));
    const eff = srcDur / speed;
    const t = clamp(num(o.t, 0), 0, Math.max(0, eff - 0.04));
    const ctx = { W, H, fps, eff, t0: o.preview ? t : 0 };
    const key = c.key && c.key.on;
    const args = ['-y', '-hide_banner', '-loglevel', 'error'];
    const f = [];
    let n = 1, bg = -1, pip = -1, sil = -1, uid = 0;
    const lab = () => 'x' + (uid++);

    if (isImg) args.push('-loop', '1', '-framerate', fps, '-t', o.preview ? 1 : eff, '-i', mediaPath(c.file));
    else args.push('-ss', num(c.in, 0) + (o.preview ? t * speed : 0), '-t', o.preview ? 1.5 : srcDur, '-i', mediaPath(c.file));
    if (key && c.key.bgType === 'file' && c.key.bgFile) {
      if (c.key.bgKind === 'video') args.push('-stream_loop', '-1', '-i', mediaPath(c.key.bgFile));
      else args.push('-loop', '1', '-framerate', fps, '-i', mediaPath(c.key.bgFile));
      bg = n++;
    }
    const hasPip = c.pip && c.pip.on && c.pip.file;
    if (hasPip) {
      if (c.pip.kind === 'video') args.push('-stream_loop', '-1', '-i', mediaPath(c.pip.file));
      else args.push('-loop', '1', '-framerate', fps, '-i', mediaPath(c.pip.file));
      pip = n++;
    }
    if (!o.preview && (isImg || !c.hasAudio)) { args.push('-f', 'lavfi', '-t', eff, '-i', 'anullsrc=r=48000:cl=stereo'); sil = n++; }

    // Premier plan : lecture, vitesse, cadrage
    const fill = c.fit !== 'fit' && c.fit !== 'flou';
    let pre = '';
    if (rev) pre += 'reverse,';
    if (!isImg && speed !== 1) pre += `setpts=(PTS-STARTPTS)/${speed},`;
    pre += `fps=${fps},`;
    const scFill = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;
    const scFit = `scale=${W}:${H}:force_original_aspect_ratio=decrease,setsar=1`;
    let cur = lab();
    if (key) {
      const k = c.key;
      let fg = pre + (c.fit === 'fit' ? scFit : scFill) + `,format=yuv420p,chromakey=color=${hex(k.color)}:similarity=${clamp(num(k.sim, 0.15), 0.01, 0.8)}:blend=${clamp(num(k.blend, 0.08), 0, 0.5)}`;
      if (k.despill && filters.has('despill')) fg += ',format=gbrap,despill=type=green:mix=0.5:expand=0.1,format=yuva420p';
      f.push(`[0:v]${fg}[fg]`);
      if (bg >= 0) f.push(`[${bg}:v]fps=${fps},${scFill}[bg]`);
      else f.push(`color=c=${hex(k.bgColor || '#101820')}:s=${W}x${H}:r=${fps}[bg]`);
      f.push(`[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1:format=auto[${cur}]`);
    } else if (c.fit === 'flou') {
      const a = lab(), b = lab();
      f.push(`[0:v]${pre}format=yuv420p,split[${a}][${b}]`);
      f.push(`[${b}]${scFill},gblur=sigma=30[${b}g]`);
      f.push(`[${a}]${scFit}[${a}f]`);
      f.push(`[${b}g][${a}f]overlay=(W-w)/2:(H-h)/2[${cur}]`);
    } else {
      f.push(`[0:v]${pre}${fill ? scFill : scFit + `,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black`}[${cur}]`);
    }
    const lin = frag => { const out = lab(); f.push(`[${cur}]${frag}[${out}]`); cur = out; };

    // Réglages de base
    const bright = clamp(num(c.bright, 0), -50, 50) / 100, contrast = clamp(num(c.contrast, 100), 0, 200) / 100;
    const sat = c.bw ? 0 : clamp(num(c.sat, 100), 0, 300) / 100;
    if (bright !== 0 || contrast !== 1 || sat !== 1) lin(`eq=brightness=${bright}:contrast=${contrast}:saturation=${sat}`);

    // Pile d'effets
    for (const e of stack) {
      const d = FX.VIDEO.find(x => x.id === e.id);
      if (d.id === 'inverse' || !d.needs.every(x => filters.has(x))) continue;
      const q = FX.defaults(d);
      for (const pr of d.params) if (e.p && e.p[pr.k] !== undefined) q[pr.k] = clamp(num(e.p[pr.k], pr.def), pr.min, pr.max);
      const frag = d.make(q, ctx);
      if (typeof frag !== 'string') { const out = lab(); f.push(frag.graph(cur, out)); cur = out; }
      else if (d.blend && q.amount < 99) {
        const a = lab(), b = lab(), m = lab(), out = lab();
        f.push(`[${cur}]format=yuv420p,split[${a}][${b}]`, `[${b}]${frag},format=yuv420p[${m}]`,
          `[${a}][${m}]blend=all_mode=normal:all_opacity=${(q.amount / 100).toFixed(2)}[${out}]`);
        cur = out;
      } else lin(frag);
    }

    // Incrustation (image dans l'image, logo)
    if (hasPip) {
      const sc = clamp(num(c.pip.scale, 30), 5, 100), op = clamp(num(c.pip.opacity, 100), 5, 100) / 100;
      const pos = FX.POSITIONS.includes(c.pip.pos) ? c.pip.pos : 'br', m = Math.round(W * 0.04);
      const x = { l: `${m}`, c: '(W-w)/2', r: `W-w-${m}` }[pos[1]], y = { t: `${m}`, m: '(H-h)/2', b: `H-h-${m}` }[pos[0]];
      f.push(`[${pip}:v]fps=${fps},scale=${even(W * sc / 100)}:-2,format=rgba,colorchannelmixer=aa=${op}[pp]`);
      const out = lab(); f.push(`[${cur}][pp]overlay=${x}:${y}:shortest=1:format=auto[${out}]`); cur = out;
    }

    // Texte
    if (c.text && String(c.text).trim() && FONT && filters.has('drawtext')) {
      const idx = o.tdir ? o.tdir.idx : 0, file = `t${idx}.txt`;
      const size = Math.round(H * clamp(num(c.textSize, 6), 2, 15) / 100);
      fs.writeFileSync(path.join(o.tdir ? o.tdir.dir : TMP, file), wrap(String(c.text).slice(0, 300), Math.floor(W * 0.88 / (size * 0.6))));
      const T = `(t+${ctx.t0})`, S = clamp(num(c.textStart, 0), 0, 600), D = num(c.textDur, 0);
      const base = c.textPos === 'haut' ? 'h*0.12' : c.textPos === 'milieu' ? '(h-text_h)/2' : 'h*0.8-text_h';
      const anim = c.textAnim || 'aucune', ap = `min(1,max(0,(${T}-${S})/0.5))`;
      let style = '';
      if (c.textStyle === 'bandeau') style = `:box=1:boxcolor=black@0.45:boxborderw=${Math.round(size / 3)}`;
      else if (c.textStyle === 'contour') style = `:borderw=${Math.max(2, Math.round(size / 12))}:bordercolor=black`;
      else if (c.textStyle === 'ombre') style = `:shadowx=${Math.max(2, Math.round(size / 18))}:shadowy=${Math.max(2, Math.round(size / 18))}:shadowcolor=black@0.7`;
      const yexp = anim === 'glisse' ? `${base}+(1-${ap})*${Math.round(H * 0.05)}` : base;
      const alpha = anim === 'aucune' ? '' : `:alpha='${ap}'`;
      const en = (S > 0 || D > 0) ? `:enable='between(${T},${S},${D > 0 ? S + D : 100000})'` : '';
      lin(`drawtext=fontfile='${FONT}':textfile=${file}:fontsize=${size}:fontcolor=${hex(c.textColor || '#ffffff')}:x=(w-text_w)/2:y='${yexp}'${style}${alpha}${en}`);
    }
    if (c.fade && !o.preview) lin(`fade=t=in:st=0:d=0.4,fade=t=out:st=${Math.max(0, eff - 0.4).toFixed(3)}:d=0.4`);
    f.push(`[${cur}]format=yuv420p[v]`);

    if (o.preview) {
      args.push('-filter_complex', f.join(';'), '-map', '[v]', '-frames:v', 1, '-f', 'mjpeg', '-q:v', 4, 'pipe:1');
      return args;
    }

    // Son : vitesse, volume, effets sonores, fondu
    const src = sil >= 0 ? `${sil}:a` : '0:a';
    const af = [];
    if (rev) af.push('areverse');
    let s = speed;
    while (s > 2) { af.push('atempo=2'); s /= 2; }
    while (s < 0.5) { af.push('atempo=0.5'); s *= 2; }
    if (s !== 1) af.push(`atempo=${s}`);
    af.push(`volume=${clamp(num(c.vol, 100), 0, 300) / 100}`);
    for (const e of (c.afx || [])) {
      const d = FX.AUDIO.find(x => x.id === (e && e.id));
      if (!d || !d.needs.every(x => filters.has(x))) continue;
      const q = FX.defaults(d);
      for (const pr of d.params) if (e.p && e.p[pr.k] !== undefined) q[pr.k] = clamp(num(e.p[pr.k], pr.def), pr.min, pr.max);
      af.push(d.make(q));
    }
    if (c.fade) af.push(`afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, eff - 0.4).toFixed(3)}:d=0.4`);
    af.push('aresample=48000', 'aformat=sample_fmts=fltp:channel_layouts=stereo');
    f.push(`[${src}]${af.join(',')}[a]`);

    const proxy = !!o.proxy;
    args.push('-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]', '-t', eff.toFixed(3), '-r', fps,
      '-c:v', 'libx264', '-preset', proxy ? 'ultrafast' : 'veryfast', '-crf', proxy ? 30 : 16, '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', proxy ? '96k' : '192k', '-ar', 48000, '-ac', 2, '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats');
    return { args, eff };
  }

  function wrap(text, max) {
    return text.split('\n').map(line => {
      const out = []; let cur = '';
      for (const w of line.split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
      out.push(cur);
      return out.join('\n');
    }).join('\n');
  }

  function sizeOf(project, mode) {
    const [a, b] = FORMATS[project.format] || FORMATS.vertical;
    const short = mode === 'proxy' ? 360 : mode === 'thumb' ? 200 : clamp(num(project.res, 1080), 480, 2160);
    const k = short / Math.min(a, b);
    return { w: even(a * k), h: even(b * k), fps: mode === 'proxy' ? 24 : clamp(num(project.fps, 30), 24, 60) };
  }

  // ---------- Exportation ----------
  const jobs = new Map();
  const progressOf = (job, done, total) => d => {
    const m = d.match(/out_time_us=(\d+)/g);
    if (m) job.progress = clamp((done() + (+m[m.length - 1].split('=')[1]) / 1e6) / total, 0, 0.96);
  };

  async function exportProject(job, project, { proxy } = {}) {
    const clips = (project.clips || []).filter(c => c && c.file);
    if (!clips.length) throw new Error('La timeline est vide.');
    const P = sizeOf(project, proxy ? 'proxy' : 'full');
    const dir = fs.mkdtempSync(path.join(TMP, 'job-'));
    job.dir = dir;
    try {
      const built = clips.map((c, i) => buildClip(c, P, { tdir: { dir, idx: i }, proxy }));
      const total = built.reduce((a, b) => a + b.eff, 0) * 1.1;
      let done = 0;
      const segs = [];
      for (let i = 0; i < built.length; i++) {
        job.step = `Clip ${i + 1} sur ${built.length}`;
        await run(FFMPEG, [...built[i].args, `seg${i}.mp4`], { cwd: dir, onOut: progressOf(job, () => done, total) });
        done += built[i].eff; segs.push(`seg${i}.mp4`);
      }

      // Assemblage (avec transitions si besoin)
      job.step = 'Assemblage';
      const trans = clips.map((c, i) => (i < clips.length - 1 && c.transition && c.transition.type && c.transition.type !== 'none' && FX.TRANSITIONS.some(t => t.id === c.transition.type) && filters.has('xfade')) ? c.transition : null);
      let joined = segs[0];
      const lens = built.map(b => b.eff);
      if (segs.length > 1 && !trans.some(Boolean)) {
        fs.writeFileSync(path.join(dir, 'liste.txt'), segs.map(s => `file '${s}'`).join('\n'));
        await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', 0, '-i', 'liste.txt', '-c', 'copy', 'all.mp4'], { cwd: dir });
        joined = 'all.mp4';
      } else if (segs.length > 1) {
        const inArgs = segs.flatMap(s => ['-i', s]);
        const g = []; const norm = `settb=AVTB,fps=${P.fps},format=yuv420p`;
        let cv = 'v0', ca = 'a0', len = lens[0];
        g.push(`[0:v]${norm}[v0]`, '[0:a]aresample=48000[a0]');
        for (let i = 1; i < segs.length; i++) {
          g.push(`[${i}:v]${norm}[vi${i}]`, `[${i}:a]aresample=48000[ai${i}]`);
          const tr = trans[i - 1], nv = `v${i}x`, na = `a${i}x`;
          if (tr) {
            const d = clamp(num(tr.dur, 0.6), 0.2, Math.max(0.2, Math.min(len, lens[i]) * 0.9));
            g.push(`[${cv}][vi${i}]xfade=transition=${tr.type}:duration=${d.toFixed(2)}:offset=${(len - d).toFixed(3)},${norm}[${nv}]`,
              `[${ca}][ai${i}]acrossfade=d=${d.toFixed(2)}[${na}]`);
            len += lens[i] - d;
          } else {
            g.push(`[${cv}][${ca}][vi${i}][ai${i}]concat=n=2:v=1:a=1[${nv}][${na}]`);
            len += lens[i];
          }
          cv = nv; ca = na;
        }
        const enc = proxy ? ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', 30]
          : (process.platform === 'darwin' && encoders.has('h264_videotoolbox') && project.quality === 'rapide')
            ? ['-c:v', 'h264_videotoolbox', '-b:v', P.h >= 1500 ? '30M' : '14M'] : ['-c:v', 'libx264', '-preset', 'medium', '-crf', 17];
        await run(FFMPEG, ['-y', '-loglevel', 'error', ...inArgs, '-filter_complex', g.join(';'), '-map', `[${cv}]`, '-map', `[${ca}]`, ...enc,
          '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', proxy ? '96k' : '192k', '-movflags', '+faststart', 'all.mp4'], { cwd: dir });
        joined = 'all.mp4';
      }

      // Pistes audio (musique, voix off, bruitages)
      const audios = (project.audio || []).filter(a => a && a.file && fs.existsSync(mediaPath(a.file)));
      if (audios.length) {
        job.step = 'Mixage du son';
        const dur = parseFloat((await run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, joined)], { binary: true })).toString()) || 1;
        const ins = ['-i', joined], g = []; let mix = '[0:a]';
        audios.forEach((a, i) => {
          if (a.loop) ins.push('-stream_loop', '-1');
          ins.push('-i', mediaPath(a.file));
          const st = clamp(num(a.start, 0), 0, 3600), ms = Math.round(st * 1000);
          const fd = a.fade ? `,afade=t=in:d=1.2,afade=t=out:st=${Math.max(0, dur - st - 1.5).toFixed(2)}:d=1.5` : '';
          g.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${clamp(num(a.vol, 50), 0, 200) / 100}${fd},adelay=${ms}|${ms}[m${i}]`);
          mix += `[m${i}]`;
        });
        g.push(`${mix}amix=inputs=${audios.length + 1}:duration=first:dropout_transition=0,volume=${audios.length + 1},alimiter=limit=0.95[a]`);
        await run(FFMPEG, ['-y', '-loglevel', 'error', ...ins, '-filter_complex', g.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', dur.toFixed(3), 'final.mp4'], { cwd: dir });
        joined = 'final.mp4';
      }

      if (proxy) {
        for (const old of fs.readdirSync(APERCUS)) { try { fs.unlinkSync(path.join(APERCUS, old)); } catch (e) { /* ignoré */ } }
        const name = `apercu-${Date.now()}.mp4`;
        fs.copyFileSync(path.join(dir, joined), path.join(APERCUS, name));
        job.url = '/apercu/' + name;
      } else {
        const name = `montage-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.mp4`;
        fs.copyFileSync(path.join(dir, joined), path.join(EXPORTS, name));
        job.out = name;
      }
      job.progress = 1; job.done = true;
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }

  // ---------- HTTP ----------
  function send(res, code, body, type = 'application/json; charset=utf-8', cache = 'no-store') {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': cache });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  }
  function readJson(req) {
    return new Promise((resolve, reject) => {
      let s = '';
      req.on('data', d => { s += d; if (s.length > 2e7) req.destroy(); });
      req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { reject(new Error('Requête invalide')); } });
    });
  }
  function serveFile(req, res, file, download) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Introuvable' });
    const st = fs.statSync(file);
    const h = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    if (download) h['Content-Disposition'] = `attachment; filename="${path.basename(file)}"`;
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
    } else { res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(file).pipe(res); }
  }
  const projFile = n => path.join(PROJETS, safeName(n).replace(/\.qmovie$/, '') + '.qmovie');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    // Protection : seule cette application (localhost) peut appeler le serveur
    const port = server.address() && server.address().port;
    const okHost = h => !h || h === `127.0.0.1:${port}` || h === `localhost:${port}`;
    const origin = req.headers.origin;
    if (!okHost(req.headers.host) || (origin && !okHost(origin.replace(/^https?:\/\//, '')))) return send(res, 403, { error: 'Accès refusé' });
    try {
      if (req.method === 'GET' && (p === '/' || p === '/index.html')) return serveFile(req, res, path.join(__dirname, 'index.html'));
      if (req.method === 'GET' && p.startsWith('/media/')) return serveFile(req, res, mediaPath(decodeURIComponent(p.slice(7))));
      if (req.method === 'GET' && p.startsWith('/exports/')) return serveFile(req, res, path.join(EXPORTS, safeName(decodeURIComponent(p.slice(9)))), true);
      if (req.method === 'GET' && p.startsWith('/apercu/')) return serveFile(req, res, path.join(APERCUS, safeName(decodeURIComponent(p.slice(8)))));

      if (req.method === 'GET' && p === '/api/catalogue') return send(res, 200, { ...FX.catalogue(filters), font: !!FONT && filters.has('drawtext'), version, folder: BASE, hwenc: process.platform === 'darwin' && encoders.has('h264_videotoolbox') });
      if (req.method === 'GET' && p === '/api/medias') {
        const items = [];
        for (const n of fs.readdirSync(MEDIAS).filter(x => !x.startsWith('.'))) {
          try { items.push({ file: n, ...(await probe(path.join(MEDIAS, n))) }); } catch (e) { /* fichier ignoré */ }
        }
        return send(res, 200, { items });
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
      if (req.method === 'GET' && p === '/api/frame') {
        const img = await run(FFMPEG, ['-v', 'error', '-ss', num(url.searchParams.get('t'), 0), '-i', mediaPath(url.searchParams.get('file')), '-frames:v', 1,
          '-vf', 'scale=480:-2', '-f', 'mjpeg', '-q:v', 5, 'pipe:1'], { binary: true });
        return send(res, 200, img, 'image/jpeg', 'max-age=3600');
      }
      if (req.method === 'POST' && p === '/api/preview') {
        const body = await readJson(req);
        const dir = fs.mkdtempSync(path.join(TMP, 'pv-'));
        try {
          const args = buildClip(body.clip, sizeOf(body.project || {}, 'thumb' === body.mode ? 'thumb' : 'proxy'), { preview: true, t: body.t, tdir: { dir, idx: 0 } });
          return send(res, 200, await run(FFMPEG, args, { cwd: dir, binary: true }), 'image/jpeg');
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
      }
      if (req.method === 'GET' && p === '/api/fxthumb') { // vignette d'un effet sur l'image du clip choisi
        const q = url.searchParams, id = q.get('fx'), kind = q.get('kind') === 'image' ? 'image' : 'video';
        const isA = FX.AUDIO.some(a => a.id === id);
        if (isA) return send(res, 404, { error: 'Pas de vignette' });
        const clip = { file: q.get('file'), kind, in: num(q.get('t'), 0), out: num(q.get('t'), 0) + 2, dur: 3, speed: 1, fit: 'fill', fx: [{ id }], key: {} };
        const dir = fs.mkdtempSync(path.join(TMP, 'th-'));
        try {
          const args = buildClip(clip, sizeOf({ format: 'carre' }, 'thumb'), { preview: true, t: 0.8, tdir: { dir, idx: 0 } });
          return send(res, 200, await run(FFMPEG, args, { cwd: dir, binary: true }), 'image/jpeg', 'max-age=600');
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
      }
      if (req.method === 'POST' && (p === '/api/export' || p === '/api/apercu')) {
        const body = await readJson(req);
        const id = String(Date.now()) + Math.floor(Math.random() * 1000);
        const job = { progress: 0, step: 'Préparation', out: null, url: null, error: null, done: false };
        jobs.set(id, job);
        exportProject(job, body.project || {}, { proxy: p === '/api/apercu' }).catch(e => { job.error = e.message; });
        return send(res, 200, { id });
      }
      if (req.method === 'GET' && p === '/api/job') {
        const job = jobs.get(url.searchParams.get('id'));
        return job ? send(res, 200, { progress: job.progress, step: job.step, out: job.out, url: job.url, error: job.error, done: job.done }) : send(res, 404, { error: 'Export inconnu' });
      }
      // Projets
      if (p === '/api/projet') { // enregistrement automatique
        const f = path.join(BASE, 'projet-auto.json');
        if (req.method === 'PUT') { fs.writeFileSync(f, JSON.stringify(await readJson(req))); return send(res, 200, { ok: true }); }
        return send(res, 200, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : 'null');
      }
      if (req.method === 'POST' && p === '/api/reveal') { // afficher un export dans le Finder
        const f = path.join(EXPORTS, safeName((await readJson(req)).file));
        if (process.platform === 'darwin' && fs.existsSync(f)) spawn('open', ['-R', f]);
        return send(res, 200, { ok: true, folder: EXPORTS });
      }
      if (req.method === 'GET' && p === '/api/projets') return send(res, 200, { items: fs.readdirSync(PROJETS).filter(n => n.endsWith('.qmovie')).map(n => n.replace(/\.qmovie$/, '')) });
      if (p.startsWith('/api/projets/')) {
        const f = projFile(decodeURIComponent(p.slice(13)));
        if (req.method === 'PUT') { fs.writeFileSync(f, JSON.stringify(await readJson(req))); return send(res, 200, { ok: true }); }
        if (req.method === 'GET') return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f, 'utf8')) : send(res, 404, { error: 'Projet introuvable' });
        if (req.method === 'DELETE') { if (fs.existsSync(f)) fs.unlinkSync(f); return send(res, 200, { ok: true }); }
      }
      send(res, 404, { error: 'Introuvable' });
    } catch (e) { send(res, 500, { error: e.message }); }
  });

  return {
    server, buildClip, sizeOf, mediaPath, probe, get filters() { return filters; },
    async start() {
      await detect();
      await new Promise((ok, ko) => { server.once('error', ko); server.listen(PORT, '127.0.0.1', ok); });
      return server.address().port;
    },
    stop() { server.close(); }
  };
}

module.exports = { create };

if (require.main === module) {
  const { resolveFfmpeg } = require('./ffmpeg-path');
  (async () => {
    const bins = await resolveFfmpeg();
    const app = create({ port: +process.env.QM_PORT || 4173, base: process.env.QM_DIR, ...bins });
    const port = await app.start();
    console.log(`QuentMovie : http://localhost:${port}`);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
