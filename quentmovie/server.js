// QuentMovie : moteur de montage local (serveur HTTP + FFmpeg). Aucune dépendance.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const FX = require('./effects');

const FORMATS = { vertical: [9, 16], horizontal: [16, 9], carre: [1, 1] };
// modes de mélange des calques (nom affiché → filtre blend)
const MODES = { ecran: 'screen', addition: 'addition', eclaircir: 'lighten', produit: 'multiply', incrustation: 'overlay', lumiere: 'softlight' };
const VERSION_APP = require('./package.json').version;
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.avif', '.jfif'];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.webm': 'video/webm',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac', '.gif': 'image/gif', '.mkv': 'video/x-matroska', '.json': 'application/json',
  '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm'
};
const S = '/System/Library/Fonts/Supplemental/';
const FONT_CANDS = [
  ['arial', 'Arial Gras', [S + 'Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf']],
  ['impact', 'Impact', [S + 'Impact.ttf']], ['arialblack', 'Arial Black', [S + 'Arial Black.ttf']],
  ['helvetica', 'Helvetica Neue', ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc']],
  ['futura', 'Futura', [S + 'Futura.ttc']], ['trebuchet', 'Trebuchet Gras', [S + 'Trebuchet MS Bold.ttf']], ['verdana', 'Verdana Gras', [S + 'Verdana Bold.ttf']],
  ['georgia', 'Georgia Gras', [S + 'Georgia Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf']],
  ['didot', 'Didot (magazine)', [S + 'Didot.ttc']], ['copperplate', 'Copperplate (élégant)', [S + 'Copperplate.ttc']],
  ['courier', 'Courier (machine)', [S + 'Courier New Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf']],
  ['typewriter', 'American Typewriter', [S + 'AmericanTypewriter.ttc']],
  ['markerfelt', 'Marker Felt (feutre)', ['/System/Library/Fonts/MarkerFelt.ttc']], ['chalkduster', 'Chalkduster (craie)', [S + 'Chalkduster.ttf']],
  ['brush', 'Brush Script (manuscrit)', [S + 'Brush Script.ttf']], ['papyrus', 'Papyrus', [S + 'Papyrus.ttc']]
];
const FONTS_OK = [];
for (const [id, nom, paths] of FONT_CANDS) { const file = paths.find(p => fs.existsSync(p)); if (file && !FONTS_OK.some(x => x.file === file)) FONTS_OK.push({ id, nom, file }); }
const FONT = (FONTS_OK[0] || {}).file || '';
const fontFile = id => ((FONTS_OK.find(x => x.id === id) || FONTS_OK[0] || {}).file) || '';

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
  const APERCUS = path.join(TMP, 'apercus'), PROXIES = path.join(TMP, 'proxies'); fs.mkdirSync(APERCUS, { recursive: true }); fs.mkdirSync(PROXIES, { recursive: true });
  let FFMPEG = opts.ffmpeg || 'ffmpeg', FFPROBE = opts.ffprobe || 'ffprobe';
  let filters = new Set(), encoders = new Set(), version = '';
  const LIB = (opts.lib || path.join(__dirname, 'bibliotheque')).replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
  const LIB_LISTES = ['sons', 'musiques', 'stickers', 'marque', 'luts', 'calques', 'cadres', 'fonds', 'fondvert'];
  const libIndex = () => { let j = {}; try { j = JSON.parse(fs.readFileSync(path.join(LIB, 'index.json'), 'utf8')); } catch (e) { /* bibliothèque absente */ } LIB_LISTES.forEach(k => { j[k] = j[k] || []; }); return j; };
  // Packs ajoutés par l'utilisateur (LUT, sons, images, vidéos) : dossier « Mes packs »
  const PACKS = path.join(BASE, 'packs'); fs.mkdirSync(PACKS, { recursive: true });
  // « lib:sons/clavier.mp3 » = bibliothèque ; « pack:Dossier/fichier.wav » = Mes packs ; sinon fichier importé
  const mediaPath = n => {
    const s = String(n || '');
    const m = /^lib:(sons|musiques|stickers|luts|calques|cadres|fonds|fondvert)\/([\w.\-]+)$/.exec(s);
    if (m) return path.join(LIB, m[1], m[2]);
    if (s.startsWith('pack:')) {
      const f = path.resolve(PACKS, s.slice(5));
      if (!f.startsWith(PACKS + path.sep)) throw new Error('Chemin refusé');
      return f;
    }
    return path.join(MEDIAS, safeName(n));
  };
  // Cadres et décors existent en horizontal (-h) et vertical (-v) : on prend celui du format du projet
  const orient = (n, W, H) => /^lib:(cadres|fonds)\/[\w\-]+-[hv]\.(png|jpg)$/.test(String(n || '')) ? String(n).replace(/-[hv]\.(png|jpg)$/, (x, e) => (W >= H ? '-h.' : '-v.') + e) : n;
  // Chemin utilisable dans un filtre FFmpeg (sinon copie sous un nom simple)
  const cheminFiltre = f => {
    if (/^[\w\-./ ]+$/.test(f)) return f;
    const dest = path.join(TMP, 'lut-' + require('crypto').createHash('md5').update(f).digest('hex') + path.extname(f));
    if (!fs.existsSync(dest)) fs.copyFileSync(f, dest);
    return dest;
  };
  const PACK_TYPES = { '.cube': 'luts', '.mp3': 'sons', '.wav': 'sons', '.m4a': 'sons', '.aif': 'sons', '.aiff': 'sons', '.flac': 'sons', '.ogg': 'sons', '.caf': 'sons',
    '.png': 'images', '.webp': 'images', '.jpg': 'images', '.jpeg': 'images', '.mp4': 'videos', '.mov': 'videos', '.m4v': 'videos', '.webm': 'videos' };
  const packCache = new Map();
  async function scanPacks() {
    const files = [];
    const walk = (dir, depth) => {
      let l = []; try { l = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const e of l) {
        if (e.name.startsWith('.') || files.length > 3000) continue;
        const f = path.join(dir, e.name);
        if (e.isDirectory()) { if (depth < 5) walk(f, depth + 1); } else if (PACK_TYPES[path.extname(e.name).toLowerCase()]) files.push(f);
      }
    };
    walk(PACKS, 0);
    const out = { luts: [], sons: [], images: [], videos: [] };
    const todo = files.map(f => async () => {
      const rel = path.relative(PACKS, f).split(path.sep).join('/'), type = PACK_TYPES[path.extname(f).toLowerCase()];
      const it = { file: 'pack:' + rel, nom: path.basename(f, path.extname(f)).replace(/[_-]+/g, ' '), cat: rel.includes('/') ? rel.split('/')[0] : 'Mes packs' };
      if (type === 'sons' || type === 'videos') {
        const st = fs.statSync(f), k = f + ':' + st.size + ':' + st.mtimeMs;
        if (!packCache.has(k)) { try { const i = await probe(f); packCache.set(k, { duree: +i.duration.toFixed(2), son: i.hasAudio }); } catch (e) { packCache.set(k, null); } }
        const i = packCache.get(k); if (!i) return; it.duree = i.duree; it.son = i.son;
      }
      out[type].push(it);
    });
    for (let i = 0; i < todo.length; i += 8) await Promise.all(todo.slice(i, i + 8).map(f => f()));
    for (const k of Object.keys(out)) out[k].sort((a, b) => a.file.localeCompare(b.file, 'fr'));
    return out;
  }

  // ---------- FFmpeg ----------
  function run(cmd, args, { cwd, onOut, binary, wantErr } = {}) {
    return new Promise((resolve, reject) => {
      const p = spawn(cmd, args, { cwd });
      const out = []; let err = '';
      p.stdout.on('data', d => { if (binary) out.push(d); if (onOut) onOut(d.toString()); });
      p.stderr.on('data', d => { err += d; if (!wantErr && err.length > 8000) err = err.slice(-8000); });
      p.on('error', e => reject(new Error(e.code === 'ENOENT' ? 'FFmpeg est introuvable.' : e.message)));
      p.on('close', code => (code === 0 ? resolve(wantErr ? err : binary ? Buffer.concat(out) : '') : reject(new Error(err.trim().split('\n').slice(-4).join('\n') || 'Erreur FFmpeg'))));
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
    const streams = j.streams || [];
    const v = streams.find(x => x.codec_type === 'video' && !(x.disposition && x.disposition.attached_pic)); // une pochette d'album n'est pas une vidéo
    const a = streams.find(x => x.codec_type === 'audio');
    const fmtName = String((j.format && j.format.format_name) || '');
    const dur = +((j.format && j.format.duration) || 0);
    let kind;
    if (v && (IMG_EXT.includes(ext) || /image2|_pipe|ppm|pgm/.test(fmtName) || (dur < 0.05 && !a))) kind = 'image';
    else if (v) kind = 'video';
    else if (a) kind = 'audio';
    else throw new Error('Fichier non reconnu');
    // lisible directement par la fenêtre (sinon une copie légère est préparée pour la lecture)
    const native = kind === 'video' && ['.mp4', '.m4v'].includes(ext) && v.codec_name === 'h264' && (!a || ['aac', 'mp3'].includes(a.codec_name));
    return { kind, duration: kind === 'image' ? 3 : dur, w: v ? v.width : 0, h: v ? v.height : 0, hasAudio: !!a, native, codec: v ? v.codec_name : (a ? a.codec_name : '') };
  }

  // ---------- Construction d'un clip ----------
  // c : clip ; P : {w, h, fps} ; o : {preview, t, tdir, proxy}
  function buildClip(c, P, o = {}) {
    const W = P.w, H = P.h, fps = P.fps;
    const isGen = c.kind === 'solid';
    const isAud = c.kind === 'audio'; // podcast : une piste sonore avec fond et visualiseur
    const isImg = c.kind === 'image' || isGen;
    const stack = (c.fx || []).filter(e => e && FX.VIDEO.find(d => d.id === e.id));
    const rev = !isImg && !isAud && stack.some(e => e.id === 'inverse') && filters.has('reverse');
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

    let covIdx = -1;
    if (isAud) {
      args.push('-ss', num(c.in, 0) + (o.preview ? t * speed : 0), '-t', o.preview ? 1.5 : srcDur, '-i', mediaPath(c.file));
      if (c.bgFile) { args.push('-loop', '1', '-framerate', fps, '-i', mediaPath(c.bgFile)); covIdx = n++; }
    } else if (isGen) args.push('-f', 'lavfi', '-t', o.preview ? 1 : eff, '-i', `color=c=${hex(c.color || '#000000')}:s=${W}x${H}:r=${fps}`);
    else if (isImg) args.push('-loop', '1', '-framerate', fps, '-t', o.preview ? 1 : eff, '-i', mediaPath(orient(c.file, W, H)));
    else args.push('-ss', num(c.in, 0) + (o.preview ? t * speed : 0), '-t', o.preview ? 1.5 : srcDur, '-i', mediaPath(orient(c.file, W, H)));
    if (key && c.key.bgType === 'file' && c.key.bgFile) {
      const bgf = mediaPath(orient(c.key.bgFile, W, H));
      if (c.key.bgKind === 'video') args.push('-stream_loop', '-1', '-i', bgf);
      else args.push('-loop', '1', '-framerate', fps, '-i', bgf);
      bg = n++;
    }
    const hasPip = c.pip && c.pip.on && c.pip.file;
    if (hasPip) {
      if (c.pip.kind === 'video') args.push('-stream_loop', '-1', '-i', mediaPath(c.pip.file));
      else args.push('-loop', '1', '-framerate', fps, '-i', mediaPath(c.pip.file));
      pip = n++;
    }
    if (!o.preview && !isAud && (isImg || !c.hasAudio)) { args.push('-f', 'lavfi', '-t', eff, '-i', 'anullsrc=r=48000:cl=stereo'); sil = n++; }

    // Premier plan : lecture, vitesse, cadrage
    const fill = c.fit !== 'fit' && c.fit !== 'flou';
    let pre = '';
    if (rev) pre += 'reverse,';
    if (!isImg && speed !== 1) pre += `setpts=(PTS-STARTPTS)/${speed},`;
    pre += `fps=${fps},`;
    const scFill = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;
    const scFit = `scale=${W}:${H}:force_original_aspect_ratio=decrease,setsar=1`;
    let cur = lab();
    let aSrc = '0:a';
    if (isAud) {
      if (covIdx >= 0) f.push(`[${covIdx}:v]fps=${fps},${scFill}[${cur}]`);
      else f.push(`color=c=${hex(c.bgColor || '#101820')}:s=${W}x${H}:r=${fps}[${cur}]`);
      const vz = c.viz || {};
      if (vz.type && vz.type !== 'none') {
        const vh = Math.round(H * clamp(num(vz.h, 25), 5, 100) / 200) * 2, col = hex(vz.color || '#ffffff');
        const y = vz.pos === 'haut' ? Math.round(H * 0.08) : vz.pos === 'bas' ? Math.round(H * 0.74) : Math.round((H - vh) / 2);
        const gen = { ligne: `showwaves=s=${W}x${vh}:mode=cline:rate=${fps}:colors=${col}:scale=sqrt`, ondes: `showwaves=s=${W}x${vh}:mode=line:rate=${fps}:colors=${col}:scale=sqrt`,
          points: `showwaves=s=${W}x${vh}:mode=point:rate=${fps}:colors=${col}:scale=sqrt`,
          barres: `showfreqs=s=${W}x${vh}:mode=bar:fscale=log:ascale=sqrt:colors=${col}:win_size=1024` }[vz.type] || '';
        if (gen && filters.has(gen.split('=')[0])) {
          const wv = lab();
          if (o.preview) f.push(`[0:a]${gen},format=rgba${vz.type === 'barres' ? ',colorkey=black:0.25:0.1' : ''}[${wv}]`);
          else { f.push(`[0:a]asplit=2[avz][aout]`); f.push(`[avz]${gen},format=rgba${vz.type === 'barres' ? ',colorkey=black:0.25:0.1' : ''}[${wv}]`); aSrc = 'aout'; }
          const out = lab(); f.push(`[${cur}][${wv}]overlay=x=0:y=${y}:shortest=1:format=auto[${out}]`); cur = out;
        }
      }
    } else if (key) {
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
    // mélange d'un filtre avec l'image d'origine (intensité en %)
    const dose = (frag, pct) => {
      if (pct >= 99) return lin(frag);
      if (pct <= 0) return;
      const a = lab(), b = lab(), m = lab(), out = lab();
      f.push(`[${cur}]format=yuv420p,split[${a}][${b}]`, `[${b}]${frag},format=yuv420p[${m}]`, `[${a}][${m}]blend=all_mode=normal:all_opacity=${(pct / 100).toFixed(2)}[${out}]`);
      cur = out;
    };

    // Look d'étalonnage (fichier LUT .cube de la bibliothèque ou d'un pack)
    if (c.lut && c.lut.file && filters.has('lut3d')) {
      let lp = null; try { lp = mediaPath(c.lut.file); } catch (e) { /* chemin refusé */ }
      if (lp && /\.cube$/i.test(lp) && fs.existsSync(lp)) dose(`lut3d=file='${cheminFiltre(lp)}':interp=tetrahedral`, clamp(num(c.lut.amount, 100), 0, 100));
    }

    // Pile d'effets
    for (const e of stack) {
      const d = FX.VIDEO.find(x => x.id === e.id);
      if (d.id === 'inverse' || !d.needs.every(x => filters.has(x))) continue;
      const q = FX.defaults(d);
      for (const pr of d.params) if (e.p && e.p[pr.k] !== undefined) q[pr.k] = clamp(num(e.p[pr.k], pr.def), pr.min, pr.max);
      const frag = d.make(q, ctx);
      if (typeof frag !== 'string') { const out = lab(); f.push(frag.graph(cur, out)); cur = out; }
      else if (d.blend) dose(frag, q.amount);
      else lin(frag);
    }

    // Incrustation (image dans l'image, logo)
    if (hasPip) {
      const sc = clamp(num(c.pip.scale, 30), 5, 100), op = clamp(num(c.pip.opacity, 100), 5, 100) / 100;
      const pos = FX.POSITIONS.includes(c.pip.pos) ? c.pip.pos : 'br', m = Math.round(W * 0.04);
      const x = { l: `${m}`, c: '(W-w)/2', r: `W-w-${m}` }[pos[1]], y = { t: `${m}`, m: '(H-h)/2', b: `H-h-${m}` }[pos[0]];
      f.push(`[${pip}:v]fps=${fps},scale=${even(W * sc / 100)}:-2,format=rgba,colorchannelmixer=aa=${op}[pp]`);
      const out = lab(); f.push(`[${cur}][pp]overlay=${x}:${y}:shortest=1:format=auto[${out}]`); cur = out;
    }

    // Calques : images, vidéos, stickers ; position, taille, rotation, apparition animée
    for (const ov of (c.overlays || []).slice(0, 8)) {
      if (!ov || !ov.file || ov.on === false) continue;
      const S0 = clamp(num(ov.start, 0), 0, 3600), Dd = num(ov.dur, 0), E0 = Dd > 0 ? S0 + Dd : eff + 10;
      if (o.preview && !(t >= S0 && t < E0)) continue; // l'aperçu d'une image n'affiche que ce qui est visible à cet instant
      const isVid = ov.kind === 'video', ovf = mediaPath(orient(ov.file, W, H));
      if (isVid) args.push(...(o.preview && t > S0 ? ['-ss', Math.min(t - S0, 1.8).toFixed(2)] : []), '-stream_loop', '-1', '-i', ovf); else args.push('-loop', '1', '-framerate', fps, '-i', ovf);
      const idx = n++, id = lab(), sc = clamp(num(ov.scale, 30), 2, 150) / 100;
      const op = clamp(num(ov.opacity, 100), 5, 100) / 100, en = o.preview ? '' : `:enable='between(t,${S0},${E0})'`;
      // fond vert de l'élément (animations « fond vert ») : la couleur verte devient transparente
      const cle = ov.key ? `,colorkey=0x00ff00:${clamp(num(ov.keySim, 0.3), 0.05, 0.7)}:0.12` : '';
      const mode = MODES[ov.mode] && filters.has('blend') ? MODES[ov.mode] : null;
      if (mode) { // calque plein écran mélangé à l'image (fuites de lumière, poussière, grain…)
        f.push(`[${idx}:v]fps=${fps},${ov.plein === 'cadre' ? `scale=${W}:${H},setsar=1` : scFill},format=gbrp[${id}]`);
        const a = lab(), out = lab();
        f.push(`[${cur}]format=gbrp[${a}]`, `[${a}][${id}]blend=all_mode=${mode}:all_opacity=${op}:shortest=1${en},format=yuv420p[${out}]`);
        cur = out; continue;
      }
      if (ov.plein) { // cadre ou décor plein écran
        let ch = `[${idx}:v]fps=${fps},setpts=PTS-STARTPTS+${S0}/TB,${ov.plein === 'cadre' ? `scale=${W}:${H},setsar=1` : scFill},format=rgba${cle}`;
        if (op < 1) ch += `,colorchannelmixer=aa=${op}`;
        if (!o.preview && ov.anim === 'fade') ch += `,fade=t=in:st=${S0}:d=0.4:alpha=1` + (Dd > 0 ? `,fade=t=out:st=${Math.max(S0, E0 - 0.4)}:d=0.4:alpha=1` : '');
        f.push(`${ch}[${id}]`);
        const out = lab(); f.push(`[${cur}][${id}]overlay=0:0:shortest=1:format=auto${en}[${out}]`); cur = out; continue;
      }
      const anim = o.preview ? 'none' : (ov.anim || 'none'), Tt = 't';
      const ease = (a, d) => `(1-pow(1-min(1,max(0,(${Tt}-(${a}))/${d})),3))`;
      const px = clamp(num(ov.x, 50), -20, 120) / 100, py = clamp(num(ov.y, 50), -20, 120) / 100;
      const baseW = W * sc;
      const w = anim === 'pop' ? `trunc(${baseW}*max(0.02,min(1.15,1-exp(-7*(${Tt}-${S0}))*cos(18*(${Tt}-${S0}))))/2)*2` : `${even(baseW)}`;
      let chain = `[${idx}:v]fps=${fps},setpts=PTS-STARTPTS+${S0}/TB,format=rgba${cle}`;
      chain += anim === 'pop' ? `,scale=w='${w}':h=-2:eval=frame` : `,scale=${w}:-2`;
      if (num(ov.rot, 0)) chain += `,rotate=${(num(ov.rot, 0) * Math.PI / 180).toFixed(4)}:ow='hypot(iw,ih)':oh='hypot(iw,ih)':c=none`;
      if (op < 1) chain += `,colorchannelmixer=aa=${op}`;
      if (anim === 'fade' || anim === 'pop') chain += `,fade=t=in:st=${S0}:d=0.3:alpha=1`;
      if ((anim === 'fade') && Dd > 0) chain += `,fade=t=out:st=${Math.max(S0, E0 - 0.3)}:d=0.3:alpha=1`;
      f.push(`${chain}[${id}]`);
      let xe = `W*${px}-w/2`, ye = `H*${py}-h/2`;
      if (anim === 'glisse') xe = `${xe}-(1-${ease(S0, 0.5)})*W`;
      if (anim === 'monte') ye = `${ye}+(1-${ease(S0, 0.5)})*H*0.4`;
      if (anim === 'rebond') ye = `${ye}-abs(sin((${Tt}-${S0})*9))*H*0.04*exp(-(${Tt}-${S0})*1.5)`;
      const out = lab();
      f.push(`[${cur}][${id}]overlay=x='${xe}':y='${ye}':shortest=1:format=auto${en}[${out}]`); cur = out;
    }

    // Sous-titres (une ligne par repère, en bas)
    const subs = (c.subs || []).filter(x => x && String(x.t || '').trim()).slice(0, 300);
    if (subs.length && fontFile(c.textFont) && filters.has('drawtext')) {
      const idx = o.tdir ? o.tdir.idx : 0, dir = o.tdir ? o.tdir.dir : TMP, u = Math.min(W, H) / 100, size = Math.round(u * clamp(num(c.subSize, 4.4), 2, 10));
      const T = `(t+${ctx.t0})`, col = c.subStyle === 'jaune' ? '0xffe600' : 'white';
      const st = c.subStyle === 'bandeau' ? `:box=1:boxcolor=black@0.6:boxborderw=${Math.round(size / 3)}` : `:borderw=${Math.max(2, Math.round(size / 10))}:bordercolor=black`;
      const parts = subs.map((x, k) => {
        const file = `s${idx}_${k}.txt`; fs.writeFileSync(path.join(dir, file), wrap(String(x.t).slice(0, 200), Math.floor(W * 0.9 / (size * 0.58))));
        return `drawtext=fontfile='${fontFile(c.textFont)}':textfile=${file}:expansion=none:fontsize=${size}:fontcolor=${col}:x=(w-text_w)/2:y=h*0.84-text_h:line_spacing=${Math.round(size * 0.2)}${st}:enable='between(${T},${num(x.s, 0)},${num(x.e, 0)})'`;
      });
      lin(parts.join(','));
    }

    // Texte
    if (c.text && String(c.text).trim() && fontFile(c.textFont) && filters.has('drawtext')) {
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
      lin(`drawtext=fontfile='${fontFile(c.textFont)}':textfile=${file}:expansion=none:fontsize=${size}:fontcolor=${hex(c.textColor || '#ffffff')}:x=(w-text_w)/2:y='${yexp}'${style}${alpha}${en}`);
    }
    if (c.titre && c.titre.preset && fontFile(c.titre.font) && filters.has('drawtext')) cur = reportage(c, ctx, f, cur, lab, o);
    if (c.fade && !o.preview) lin(`fade=t=in:st=0:d=0.4,fade=t=out:st=${Math.max(0, eff - 0.4).toFixed(3)}:d=0.4`);
    f.push(`[${cur}]format=yuv420p[v]`);

    if (o.preview) {
      args.push('-filter_complex', f.join(';'), '-map', '[v]', '-frames:v', 1, '-f', 'mjpeg', '-q:v', 4, 'pipe:1');
      return args;
    }

    // Son : vitesse, volume, effets sonores, fondu
    const src = sil >= 0 ? `${sil}:a` : aSrc;
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

  // Titres de reportage : barres colorées (filtre overlay) et textes animés (drawtext), tout en expressions de temps.
  function reportage(c, ctx, f, cur, lab, o) {
    const ti = c.titre, { W, H, fps, eff } = ctx, u = Math.min(W, H) / 100;
    const dir = o.tdir ? o.tdir.dir : TMP, idx = o.tdir ? o.tdir.idx : 0;
    const T = `(t+${ctx.t0})`, S = clamp(num(ti.start, 0), 0, 3600), D = num(ti.dur, 0);
    const E = D > 0 ? S + D : eff + 10, OUT = D > 0 ? 1 : 0;
    const ease = (a, d) => `(1-pow(1-min(1,max(0,(${T}-(${a}))/${d})),3))`;
    const fin = ease(S, 0.5), fout = D > 0 ? ease(E - 0.5, 0.5) : '0';
    const F = `(${fin}*(1-${fout}))`; // 0 = caché, 1 = en place
    const en = `enable='between(${T},${S},${E})'`;
    const acc = hex(ti.color || '#c8102e'), id = String(ti.preset);
    const txt = (name, content) => { const file = `r${idx}${name}.txt`; fs.writeFileSync(path.join(dir, file), String(content).slice(0, 600)); return file; };
    const l1 = String(ti.l1 || ''), l2 = String(ti.l2 || '');
    const font = `fontfile='${fontFile(ti.font)}'`;
    const dt = (file, size, color, x, y, extra = '') =>
      `drawtext=${font}:textfile=${file}:expansion=none:fontsize=${Math.round(size)}:fontcolor=${color}:x='${x}':y='${y}':${en}${extra}`;
    const box = (color, w, h, x, y) => {
      const src = lab(), out = lab();
      f.push(`color=c=${color}:s=${Math.max(2, Math.round(w))}x${Math.max(2, Math.round(h))}:r=${fps},format=rgba[${src}]`);
      f.push(`[${cur}][${src}]overlay=x='${x}':y='${y}':shortest=1:format=auto:${en}[${out}]`);
      cur = out;
    };
    const text = chain => { const out = lab(); f.push(`[${cur}]${chain.join(',')}[${out}]`); cur = out; };

    if (id === 'tiers') {
      const bw = W * 0.78, bh = 11.5 * u, y = H * 0.74, BX = `(-${bw}+(${3 * u}+${bw})*${F})`;
      box('0x101828@0.9', bw, bh, BX, y); box(acc, 1.3 * u, bh, BX, y);
      text([dt(txt('a', l1), 4.6 * u, 'white', `${BX}+${3.4 * u}`, `${y + 1.3 * u}`),
        ...(l2 ? [dt(txt('b', l2), 3 * u, '0xd0d6e0', `${BX}+${3.4 * u}`, `${y + 6.4 * u}`)] : [])]);
    } else if (id === 'minimal') {
      const BX = `(-${W}*0.5+(${5 * u}+${W}*0.5)*${F})`, y = H * 0.78;
      box(acc, 0.9 * u, 9.5 * u, BX, y);
      text([dt(txt('a', l1), 4.6 * u, 'white', `${BX}+${2.6 * u}`, `${y}`, `:borderw=2:bordercolor=black`),
        ...(l2 ? [dt(txt('b', l2), 3 * u, 'white', `${BX}+${2.6 * u}`, `${y + 5.8 * u}`, `:borderw=2:bordercolor=black`)] : [])]);
    } else if (id === 'flash') {
      const bh = 8.5 * u, y = H * 0.85, lw = 24 * u;
      box('0x0a1a44@0.95', W, bh, '0', y);
      const tick = txt('a', l1);
      text([dt(tick, 3.6 * u, 'white', `${W}-mod(${T}*${W * 0.12}\,${W}+text_w)`, `${y + 2.4 * u}`)]);
      box(acc, lw, bh, '0', y);
      text([dt(txt('b', l2 || 'FLASH INFO'), 3.3 * u, 'white', `(${lw}-text_w)/2`, `${y + 2.6 * u}`)]);
    } else if (id === 'lieu') {
      const BX = `(-${W * 0.6}+(${4 * u}+${W * 0.6})*${F})`;
      text([dt(txt('a', l1.toUpperCase()), 3.8 * u, 'white', BX, `${H * 0.06}`, `:box=1:boxcolor=${acc}@0.95:boxborderw=${Math.round(1.4 * u)}`),
        ...(l2 ? [dt(txt('b', l2), 2.6 * u, 'white', BX, `${H * 0.06 + 6.6 * u}`, `:box=1:boxcolor=black@0.7:boxborderw=${Math.round(1 * u)}`)] : [])]);
    } else if (id === 'tv') {
      const bh = 9 * u, y = H * 0.82;
      box(`${acc}@0.78`, W, bh, '0', y);
      text([dt(txt('a', l1), 4 * u, 'white', '(w-text_w)/2', `${y + (bh - 4 * u) / 2 - 0.4 * u}`, `:alpha='${F}'`)]);
    } else if (id === 'chapitre') {
      box(acc, W * 0.18, Math.max(2, 0.45 * u), `(W-w)/2`, `${H * 0.5 + 6 * u}`);
      text([dt(txt('a', l1), 9 * u, acc, '(w-text_w)/2', `${H * 0.5 - 9 * u}`, `:alpha='${F}':borderw=2:bordercolor=black@0.6`),
        ...(l2 ? [dt(txt('b', l2), 3.6 * u, 'white', '(w-text_w)/2', `${H * 0.5 + 9 * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'citation') {
      const wrapped = wrap(l1, Math.floor(W * 0.8 / (4.4 * u * 0.6)));
      text([dt(txt('q', '“'), 16 * u, acc, '(w-text_w)/2', `${H * 0.5 - 22 * u}`, `:alpha='${F}'`),
        dt(txt('a', wrapped), 4.4 * u, 'white', '(w-text_w)/2', `${H * 0.5 - 6 * u}`, `:alpha='${F}':borderw=2:bordercolor=black@0.7`),
        ...(l2 ? [dt(txt('b', l2), 3 * u, acc, '(w-text_w)/2', `${H * 0.5 + 14 * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'compte') {
      // un chiffre par seconde, chacun affiché pendant sa seconde
      const N = clamp(Math.round(num(l1, 5)) || 5, 1, 30);
      const parts = [];
      for (let k = 0; k < N; k++) {
        const file = `r${idx}c${k}.txt`; fs.writeFileSync(path.join(dir, file), String(N - k));
        parts.push(`drawtext=${font}:textfile=${file}:expansion=none:fontsize=${Math.round(26 * u)}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:borderw=4:bordercolor=black@0.7:enable='between(${T},${S + k},${S + k + 1})'`);
      }
      text(parts);
    } else if (id === 'machine') { // texte qui s'écrit lettre par lettre
      const cps = clamp(num(ti.speed, 14), 4, 40), size = 5 * u;
      const full = wrap(l1.slice(0, 120), Math.floor(W * 0.84 / (size * 0.6))), n = full.length, parts = [];
      for (let k = 1; k <= n; k++) {
        const file = txt('m' + k, full.slice(0, k) + (k < n ? '|' : ''));
        const from = S + (k - 1) / cps, to = k < n ? S + k / cps : E;
        parts.push(`drawtext=${font}:textfile=${file}:expansion=none:fontsize=${Math.round(size)}:fontcolor=white:x=${Math.round(W * 0.08)}:y=${Math.round(H * 0.42)}:borderw=3:bordercolor=black@0.8:enable='between(${T},${from.toFixed(3)},${to.toFixed(3)})'`);
      }
      text(parts);
    } else if (id === 'souligne') { // titre avec une barre qui s'étire dessous
      const bw = even(W * 0.5), bh = even(Math.max(4, 0.9 * u)), src = lab(), out = lab();
      f.push(`color=c=${acc}:s=${bw}x${bh}:r=${fps},format=rgba,scale=w='max(2,${bw}*${ease(S, 0.7)})':h=${bh}:eval=frame[${src}]`);
      f.push(`[${cur}][${src}]overlay=x='(W-w)/2':y='${Math.round(H * 0.46 + 8 * u)}':shortest=1:format=auto:${en}[${out}]`); cur = out;
      text([dt(txt('a', l1), 6 * u, 'white', '(w-text_w)/2', `${Math.round(H * 0.46 - 2 * u)}`, `:alpha='${F}':borderw=3:bordercolor=black@0.7`),
        ...(l2 ? [dt(txt('b', l2), 3.2 * u, 'white', '(w-text_w)/2', `${Math.round(H * 0.46 + 12 * u)}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'progression') { // barre de progression de la séquence
      const bh = even(Math.max(4, 1.1 * u)), src = lab(), out = lab();
      f.push(`color=c=${acc}:s=${even(W)}x${bh}:r=${fps},format=rgba,scale=w='max(2,${even(W)}*min(1,${T}/${Math.max(0.5, eff).toFixed(2)}))':h=${bh}:eval=frame[${src}]`);
      f.push(`[${cur}][${src}]overlay=x=0:y=${l2 === 'bas' ? H - bh : 0}:shortest=1:format=auto:${en}[${out}]`); cur = out;
    } else if (id === 'generique') {
      const size = 4.4 * u, speed = H * 0.11;
      text([dt(txt('a', l1), size, 'white', '(w-text_w)/2', `h-(${T}-${S})*${speed.toFixed(1)}`, `:line_spacing=${Math.round(size * 0.6)}`)]);
    }
    return cur;
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
  const jobs = new Map(), proxyJobs = new Map();
  const progressOf = (job, done, total) => d => {
    const m = d.match(/out_time_us=(\d+)/g);
    if (m) job.progress = clamp((done() + (+m[m.length - 1].split('=')[1]) / 1e6) / total, 0, 0.96);
  };

  async function exportProject(job, project, { proxy } = {}) {
    const clips = (project.clips || []).filter(c => c && (c.file || c.kind === 'solid'));
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
            const def = FX.TRANSITIONS.find(t => t.id === tr.type), ty = def.expr ? `custom:expr='${def.expr}'` : tr.type;
            g.push(`[${cv}][vi${i}]xfade=transition=${ty}:duration=${d.toFixed(2)}:offset=${(len - d).toFixed(3)},${norm}[${nv}]`,
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

      // Pistes audio (musique, voix off, bruitages) ; « baisser quand on parle » = compression pilotée par la voix
      const audios = (project.audio || []).filter(a => a && a.file && fs.existsSync(mediaPath(a.file)));
      if (audios.length) {
        job.step = 'Mixage du son';
        const dur = parseFloat((await run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, joined)], { binary: true })).toString()) || 1;
        const ins = ['-i', joined], g = [];
        const canDuck = filters.has('sidechaincompress'), ducks = audios.filter(a => a.duck && canDuck).length;
        let prog = '[0:a]';
        if (ducks) { g.push(`[0:a]asplit=${ducks + 1}[prog]${Array.from({ length: ducks }, (_, k) => `[side${k}]`).join('')}`); prog = '[prog]'; }
        let mix = prog, dk = 0;
        audios.forEach((a, i) => {
          if (a.loop) ins.push('-stream_loop', '-1');
          ins.push('-i', mediaPath(a.file));
          const st = clamp(num(a.start, 0), 0, 3600), ms = Math.round(st * 1000);
          const fd = a.fade ? `,afade=t=in:d=1.2,afade=t=out:st=${Math.max(0, dur - st - 1.5).toFixed(2)}:d=1.5` : '';
          g.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${clamp(num(a.vol, 50), 0, 200) / 100}${fd},adelay=${ms}|${ms}[m${i}]`);
          if (a.duck && canDuck) { g.push(`[m${i}][side${dk++}]sidechaincompress=threshold=0.03:ratio=10:attack=30:release=600:makeup=1[m${i}d]`); mix += `[m${i}d]`; }
          else mix += `[m${i}]`;
        });
        g.push(`${mix}amix=inputs=${audios.length + 1}:duration=first:dropout_transition=0,volume=${audios.length + 1},alimiter=limit=0.95[a]`);
        await run(FFMPEG, ['-y', '-loglevel', 'error', ...ins, '-filter_complex', g.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', dur.toFixed(3), 'final.mp4'], { cwd: dir });
        joined = 'final.mp4';
      }

      // Format de sortie
      const sortie = sortiesDispo().includes(project.sortie) ? project.sortie : 'mp4';
      const norm = project.normaliser ? ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11'] : [];
      let final = joined;
      if (!proxy && (sortie !== 'mp4' || norm.length)) {
        job.step = 'Encodage final';
        final = 'sortie.' + sortie;
        const o2 = {
          mp4: ['-c:v', 'copy', ...norm, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'],
          mov: ['-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', ...norm, '-c:a', 'pcm_s16le'],
          webm: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', ...norm, '-c:a', 'libopus', '-b:a', '128k'],
          gif: ['-an', '-t', '60', '-vf', "fps=15,scale='min(540,iw)':-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse"],
          mp3: ['-vn', ...norm, '-c:a', 'libmp3lame', '-b:a', '192k'], m4a: ['-vn', ...norm, '-c:a', 'aac', '-b:a', '192k'], wav: ['-vn', ...norm, '-c:a', 'pcm_s16le']
        }[sortie];
        await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', joined, ...o2, final], { cwd: dir });
      }

      if (proxy) {
        for (const old of fs.readdirSync(APERCUS)) { try { fs.unlinkSync(path.join(APERCUS, old)); } catch (e) { /* ignoré */ } }
        const name = `apercu-${Date.now()}.mp4`;
        fs.copyFileSync(path.join(dir, final), path.join(APERCUS, name));
        job.url = '/apercu/' + name;
      } else {
        const name = `montage-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.${sortie}`;
        fs.copyFileSync(path.join(dir, final), path.join(EXPORTS, name));
        job.out = name;
      }
      job.progress = 1; job.done = true;
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }

  function sortiesDispo() {
    const l = ['mp4'];
    if (encoders.has('prores_ks')) l.push('mov');
    if (encoders.has('libvpx-vp9') && encoders.has('libopus')) l.push('webm');
    l.push('gif');
    if (encoders.has('libmp3lame')) l.push('mp3');
    l.push('m4a', 'wav');
    return l;
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
      if (req.method === 'GET' && p.startsWith('/lib/')) return serveFile(req, res, mediaPath('lib:' + decodeURIComponent(p.slice(5))));
      if (req.method === 'GET' && p.startsWith('/vendor/selfie/')) { // détourage de la personne (fond virtuel du studio), sans internet
        const n = decodeURIComponent(p.slice(15));
        if (!/^selfie_segmentation[\w.]*$/.test(n)) return send(res, 404, { error: 'Introuvable' });
        return serveFile(req, res, path.join(path.dirname(require.resolve('@mediapipe/selfie_segmentation/package.json')), n));
      }
      if (req.method === 'GET' && p.startsWith('/proxy/')) return serveFile(req, res, path.join(PROXIES, safeName(decodeURIComponent(p.slice(7)))));
      if (req.method === 'GET' && p.startsWith('/exports/')) return serveFile(req, res, path.join(EXPORTS, safeName(decodeURIComponent(p.slice(9)))), true);
      if (req.method === 'GET' && p.startsWith('/apercu/')) return serveFile(req, res, path.join(APERCUS, safeName(decodeURIComponent(p.slice(8)))));

      if (req.method === 'GET' && p === '/api/catalogue') return send(res, 200, { ...FX.catalogue(filters), version_app: VERSION_APP, font: !!FONT && filters.has('drawtext'), version, folder: BASE, bibliotheque: libIndex(), polices: FONTS_OK.map(x => ({ id: x.id, nom: x.nom })), sorties: sortiesDispo(), duck: filters.has('sidechaincompress'), hwenc: process.platform === 'darwin' && encoders.has('h264_videotoolbox') });
      // Mises à jour (application Mac uniquement)
      if (p === '/api/maj') return send(res, 200, opts.maj ? opts.maj.etat() : { etat: 'inactif', version: VERSION_APP });
      if (req.method === 'POST' && p === '/api/maj/verifier') return send(res, 200, opts.maj ? opts.maj.verifier() : { etat: 'inactif', version: VERSION_APP });
      if (req.method === 'POST' && p === '/api/maj/installer') return send(res, 200, opts.maj ? opts.maj.installer() : { etat: 'inactif' });
      if (req.method === 'GET' && p === '/api/packs') return send(res, 200, { ...(await scanPacks()), dossier: PACKS });
      if (req.method === 'POST' && p === '/api/packs/ouvrir') { // ouvrir le dossier « Mes packs » dans le Finder
        if (process.platform === 'darwin') spawn('open', [PACKS]);
        return send(res, 200, { ok: true, dossier: PACKS });
      }
      if (req.method === 'GET' && p === '/api/medias') {
        const items = [];
        for (const n of fs.readdirSync(MEDIAS).filter(x => !x.startsWith('.'))) {
          try { items.push({ file: n, ...(await probe(path.join(MEDIAS, n))) }); } catch (e) { /* fichier ignoré */ }
        }
        return send(res, 200, { items });
      }
      if (req.method === 'POST' && p === '/api/import' && /\.cube$/i.test(url.searchParams.get('name') || '')) { // look LUT : rangé dans Mes packs
        const dir = path.join(PACKS, 'LUT importés'); fs.mkdirSync(dir, { recursive: true });
        const name = safeName(url.searchParams.get('name')), dest = path.join(dir, name);
        const txt = await new Promise((ok, ko) => { let b = ''; req.on('data', d => { b += d; if (b.length > 6e7) req.destroy(); }); req.on('end', () => ok(b)); req.on('error', ko); });
        if (!/LUT_3D_SIZE\s+\d+/.test(txt)) throw new Error('Ce fichier .cube n’est pas un LUT 3D.');
        fs.writeFileSync(dest, txt);
        return send(res, 200, { file: 'pack:LUT importés/' + name, kind: 'lut' });
      }
      if (req.method === 'POST' && p === '/api/import') {
        let name = safeName(url.searchParams.get('name')), dest = path.join(MEDIAS, name), i = 2;
        while (fs.existsSync(dest)) { const e = path.extname(name); dest = path.join(MEDIAS, `${path.basename(name, e)}-${i++}${e}`); }
        await new Promise((ok, ko) => { const w = fs.createWriteStream(dest); req.pipe(w); w.on('finish', ok); w.on('error', ko); req.on('error', ko); });
        if (/\.(heic|heif)$/i.test(dest)) { // photos iPhone : conversion par l'outil intégré à macOS
          if (process.platform !== 'darwin') { fs.unlinkSync(dest); throw new Error('Les photos HEIC ne sont lues que sur Mac : exporte-les en JPG.'); }
          const jpg = dest.replace(/\.(heic|heif)$/i, '.jpg');
          try { await run('sips', ['-s', 'format', 'jpeg', dest, '--out', jpg]); fs.unlinkSync(dest); dest = jpg; }
          catch (e) { try { fs.unlinkSync(dest); } catch (e2) { /* ignoré */ } throw new Error('Impossible de convertir cette photo HEIC.'); }
        }
        try {
          let info = await probe(dest);
          if (info.kind === 'audio' && !(info.duration > 0)) { // enregistrement du micro : durée absente, on convertit
            const m4a = dest.replace(/\.[^.]+$/, '') + '.m4a';
            await run(FFMPEG, ['-y', '-v', 'error', '-i', dest, '-vn', '-c:a', 'aac', '-b:a', '192k', m4a]); if (m4a !== dest) fs.unlinkSync(dest);
            dest = m4a; info = await probe(dest);
          }
          if (info.kind === 'video' && (/^camera-/.test(path.basename(dest)) || !(info.duration > 0))) { // prise de la caméra : fichier propre (durée, images régulières)
            const mp4 = dest.replace(/\.[^.]+$/, '') + '-prise.mp4';
            await run(FFMPEG, ['-y', '-v', 'error', '-i', dest, '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', 18, '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-ar', 48000, '-movflags', '+faststart', mp4]);
            fs.unlinkSync(dest); dest = mp4; info = await probe(dest);
          }
          return send(res, 200, { file: path.basename(dest), ...info });
        }
        catch (e) { fs.unlinkSync(dest); throw new Error('Ce fichier n’est pas un média lisible.'); }
      }
      if (req.method === 'DELETE' && p.startsWith('/api/medias/')) {
        const f = path.join(MEDIAS, safeName(decodeURIComponent(p.slice(12)))); // jamais la bibliothèque ni les packs
        if (fs.existsSync(f)) fs.unlinkSync(f);
        return send(res, 200, { ok: true });
      }
      if (req.method === 'GET' && p === '/api/proxy') { // copie légère H.264 pour lire n'importe quel format dans la fenêtre
        const src = mediaPath(url.searchParams.get('file')), st = fs.statSync(src);
        const info = await probe(src), audioOnly = info.kind === 'audio';
        const name = `${safeName(url.searchParams.get('file'))}-${st.size}-${Math.round(st.mtimeMs)}.${audioOnly ? 'm4a' : 'mp4'}`, dest = path.join(PROXIES, name);
        if (!fs.existsSync(dest)) {
          if (!proxyJobs.has(name)) {
            const tmp = dest + '.part.' + (audioOnly ? 'm4a' : 'mp4');
            const a = audioOnly ? ['-vn', '-c:a', 'aac', '-b:a', '128k'] : ['-vf', 'scale=-2:540,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', 27, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart'];
            proxyJobs.set(name, run(FFMPEG, ['-y', '-v', 'error', '-i', src, ...a, tmp]).then(() => fs.renameSync(tmp, dest)).finally(() => proxyJobs.delete(name)));
          }
          await proxyJobs.get(name);
        }
        return send(res, 200, { url: '/proxy/' + encodeURIComponent(name) });
      }
      if (req.method === 'GET' && p === '/api/wave') { // forme d'onde d'un son
        const w = clamp(Math.round(num(url.searchParams.get('w'), 800)), 50, 4000), h = clamp(Math.round(num(url.searchParams.get('h'), 80)), 20, 400);
        const img = await run(FFMPEG, ['-v', 'error', '-i', mediaPath(url.searchParams.get('file')), '-filter_complex', `aformat=channel_layouts=mono,showwavespic=s=${w}x${h}:colors=white`,
          '-frames:v', 1, '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { binary: true });
        return send(res, 200, img, 'image/png', 'max-age=86400');
      }
      if (req.method === 'GET' && p === '/api/silences') { // trouve les silences d'un extrait pour les couper
        const q = url.searchParams, from = Math.max(0, num(q.get('in'), 0)), to = num(q.get('out'), 0), db = clamp(num(q.get('db'), -35), -70, -10), min = clamp(num(q.get('min'), 0.5), 0.15, 5);
        const dur = to > from ? to - from : 0;
        const log = await run(FFMPEG, ['-hide_banner', '-nostats', '-ss', from, ...(dur ? ['-t', dur] : []), '-i', mediaPath(q.get('file')), '-vn', '-af', `silencedetect=noise=${db}dB:d=${min}`, '-f', 'null', '-'], { wantErr: true });
        const sil = []; let cur = null;
        for (const line of log.split('\n')) {
          let m = /silence_start: (-?[\d.]+)/.exec(line); if (m) cur = { s: Math.max(0, +m[1]) };
          m = /silence_end: ([\d.]+)/.exec(line); if (m && cur) { cur.e = +m[1]; sil.push(cur); cur = null; }
        }
        if (cur) sil.push({ s: cur.s, e: dur || 1e9 });
        return send(res, 200, { silences: sil.map(x => ({ s: +(from + x.s).toFixed(2), e: +(from + x.e).toFixed(2) })) });
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
        const clip = { file: q.get('file'), kind, in: num(q.get('t'), 0), out: num(q.get('t'), 0) + 2, dur: 3, speed: 1, fit: 'fill', fx: id ? [{ id }] : [], key: {}, lut: q.get('lut') ? { file: q.get('lut'), amount: 100 } : null };
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
