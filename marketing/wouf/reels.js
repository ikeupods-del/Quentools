'use strict';
/* Transforme les posts de la file de Make en Reels verticaux (1080×1920, ~8 s, piste audio silencieuse : Instagram veut de l'AAC).
   Scène 1 (2 s) : accroche. Scène 2 (6 s) : le visuel du post avec un léger zoom. Sortie : marketing/wouf/make/<n>.mp4.
   FFMPEG=/chemin/ffmpeg node marketing/wouf/reels.js [n_min] [n_max] */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const FF = process.env.FFMPEG || 'ffmpeg', TMP = process.env.TMPDIR_VIDEO || '/tmp/wouf-reels', OUT = path.join(__dirname, 'make');
const LOGO = fs.readFileSync(path.resolve(__dirname, '../../wouf/icons/icon.svg'), 'utf8');
const cat = require('./catalogue.json').filter(c => c.source === 'make' && !c.status);
const min = +process.argv[2] || 0, max = +process.argv[3] || 1e9;
fs.mkdirSync(TMP, { recursive: true });
const HOOK = {
  fiche: sp => `Ton ${sp} ne doit JAMAIS manger ça`, conseil: sp => `Un conseil santé pour ton ${sp}`,
  secours: sp => `Si ça arrive à ton ${sp}, tu fais quoi ?`, 'leçon': sp => `Ton ${sp} sait faire ça ?`
};
const kindOf = c => c.kind || (c.id.startsWith('fiche') ? 'fiche' : 'leçon'), spOf = c => c.sp || (/chat/.test(c.id) ? 'chat' : 'chien');
const hookScene = (c, sp) => `<body style="margin:0;width:1080px;height:1920px;background:linear-gradient(160deg,#ffab5c,#ee6a1c);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:230px 150px 520px 90px;box-sizing:border-box">
<div style="display:flex;align-items:center;gap:18px;font-weight:900;font-size:50px"><div style="width:72px;height:72px">${LOGO}</div>Wouf</div>
<div style="font-size:116px;line-height:1.03;font-weight:900;margin-top:60px;letter-spacing:-3px">${HOOK[kindOf(c)](sp)} ${kindOf(c) === 'fiche' ? '👇' : '👇'}</div></body>`;
const cardScene = (c, b64) => `<body style="margin:0;width:1080px;height:1920px;background:#231f1b;position:relative;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#fff">
<img src="data:image/png;base64,${b64}" style="position:absolute;left:0;top:285px;width:1080px;height:1350px">
<div style="position:absolute;left:90px;right:150px;bottom:470px;font-size:40px;font-weight:800;opacity:.9">📌 Enregistre · 🔗 woufapp.fr</div></body>`;
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  let done = 0;
  for (const c of cat) {
    if (c.num < min || c.num > max) continue;
    const src = path.join(__dirname, 'images', c.images[0]), a = path.join(TMP, 'a.png'), s = path.join(TMP, 's.png'), out = path.join(OUT, c.num + '.mp4');
    await p.setContent(hookScene(c, spOf(c))); await p.screenshot({ path: a });
    await p.setContent(cardScene(c, fs.readFileSync(src).toString('base64'))); await p.screenshot({ path: s });
    execFileSync(FF, ['-y', '-loglevel', 'error', '-loop', '1', '-t', '2', '-i', a, '-loop', '1', '-t', '6', '-i', s, '-f', 'lavfi', '-t', '8', '-i', 'anullsrc=r=44100:cl=stereo',
      '-filter_complex', '[0:v]scale=1080:1920,setsar=1,fps=30[v0];[1:v]scale=1080:1920,setsar=1,zoompan=z=\'min(zoom+0.0007,1.08)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d=180:s=1080x1920:fps=30[v1];[v0][v1]concat=n=2:v=1:a=0,format=yuv420p[v]',
      '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', out]);
    done++; if (done % 10 === 0) console.log('  …', done, 'reels');
  }
  await b.close(); console.log('✓ ' + done + ' reels dans ' + path.relative(process.cwd(), OUT));
})().catch(e => { console.error(e); process.exit(1); });
