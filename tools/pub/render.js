/* QuenTools — rend la publicité Paperdecrypt en vidéo : node tools/pub/render.js <port|land> [fps]
   1) ouvre pub.html (animation pilotée à la seconde près), 2) génère la bande son (audio.py) à partir des repères,
   3) photographie chaque image avec Chromium, 4) assemble en H.264 + AAC avec ffmpeg et règle le volume (télé : −23 LUFS, réseaux : −14 LUFS).
   Sorties dans design/pub/ . Nécessite Playwright, ffmpeg et Python avec numpy. */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'design', 'pub');
const fmt = process.argv[2] === 'land' ? 'land' : 'port', fps = +process.argv[3] || (fmt === 'land' ? 25 : 30);
const W = fmt === 'land' ? 1920 : 1080, H = fmt === 'land' ? 1080 : 1920, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-'));
const name = fmt === 'land' ? 'paperdecrypt-pub-30s-tele-16x9.mp4' : 'paperdecrypt-pub-30s-reseaux-9x16.mp4';
const lufs = fmt === 'land' ? { I: -23, TP: -2.0, LRA: 7 } : { I: -14, TP: -1.5, LRA: 9 };
fs.mkdirSync(OUT, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
(async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://localhost:${port}/tools/pub/pub.html?fmt=${fmt}`); await pg.evaluate(() => window.ready);
  const cues = await pg.evaluate(() => window.CUES), dur = await pg.evaluate(() => window.DUR);
  fs.writeFileSync(path.join(tmp, 'cues.json'), JSON.stringify(cues)); fs.writeFileSync(path.join(OUT, 'repères-son.json'), JSON.stringify(cues));
  const wav = path.join(tmp, 'son.wav'); cp.execFileSync('python3', [path.join(__dirname, 'audio.py'), path.join(tmp, 'cues.json'), wav], { stdio: 'inherit' });
  // mesure du volume (1re passe) puis réglage
  const m = cp.spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', `loudnorm=I=${lufs.I}:TP=${lufs.TP}:LRA=${lufs.LRA}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const j = JSON.parse(m.slice(m.lastIndexOf('{'), m.lastIndexOf('}') + 1));
  const norm = path.join(tmp, 'son-norm.wav');
  cp.execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-af', `loudnorm=I=${lufs.I}:TP=${lufs.TP}:LRA=${lufs.LRA}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, '-ar', '48000', norm]);
  // PRORES=1 : copie de travail pour la télévision ou le montage (ProRes 422 HQ, son PCM) au lieu du H.264.
  const pro = !!process.env.PRORES, out = path.join(OUT, pro ? name.replace(/\.mp4$/, '-master.mov') : name);
  const venc = pro ? ['-c:v', 'prores_ks', '-profile:v', '3', '-vendor', 'apl0', '-pix_fmt', 'yuv422p10le', '-c:a', 'pcm_s16le'] : ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'];
  const ff = cp.spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', norm,
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', ...venc, '-r', String(fps), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-ar', '48000', '-t', String(dur), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(dur * fps), t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await pg.evaluate(t => setT(t), i / fps);
    const buf = await pg.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`image ${i}/${frames} (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(errs.length ? 'ERREURS ' + errs.join('|') : 'ok ' + out + ' ' + Math.round(fs.statSync(out).size / 1e6 * 10) / 10 + ' Mo');
  await b.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
