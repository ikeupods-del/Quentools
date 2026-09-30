'use strict';
/* Monte la vidéo verticale du quiz (1080×1920, ~33 s, sans musique : ajouter un son tendance dans l'app) à partir des images hero-quiz-vid-XX.png (VIDEO=1 node marketing/wouf/hero-quiz.js).
   Compte à rebours 3-2-1 sur chaque question. Nécessite ffmpeg avec libx264 : FFMPEG=/chemin/ffmpeg node marketing/wouf/video-quiz.js  →  videos/quiz-chien.mp4 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const FF = process.env.FFMPEG || 'ffmpeg', IMG = path.join(__dirname, 'images'), TMP = process.env.TMPDIR_VIDEO || '/tmp/wouf-video';
fs.mkdirSync(TMP, { recursive: true });
const tt = n => path.join(IMG, 'hero-quiz-vid-' + String(n).padStart(2, '0') + '.png'), b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const shots = [], plan = [];   // plan : [fichier, secondes]
  const still = async (name, n, badge) => {
    const f = path.join(TMP, name + '.png');
    await p.setContent(`<body style="margin:0;position:relative;width:1080px;height:1920px"><img src="${b64(tt(n))}" style="position:absolute;inset:0;width:1080px;height:1920px">${badge ? `<div style="position:absolute;right:120px;top:250px;width:230px;height:230px;border-radius:50%;background:#ee6a1c;color:#fff;font:900 170px/230px system-ui,sans-serif;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.35);border:10px solid #fff">${badge}</div>` : ''}</body>`);
    await p.screenshot({ path: f }); return f;
  };
  plan.push([await still('intro', 1), 2.5]);
  for (let i = 0; i < 4; i++) {
    const q = 2 + 2 * i, a = q + 1;
    for (const c of [3, 2, 1]) plan.push([await still(`q${i}-${c}`, q, c), 1]);
    plan.push([await still(`a${i}`, a), 3.5]);
  }
  plan.push([await still('outro', 10), 4]);
  await b.close();
  const list = plan.map(([f, s]) => `file '${f}'\nduration ${s}`).join('\n') + `\nfile '${plan[plan.length - 1][0]}'\n`;
  fs.writeFileSync(path.join(TMP, 'list.txt'), list);
  const out = path.join(__dirname, 'videos', 'quiz-chien.mp4');
  execFileSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', path.join(TMP, 'list.txt'), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-movflags', '+faststart', '-an', out], { stdio: 'inherit' });
  console.log('✓ ' + out + ' (' + (fs.statSync(out).size / 1e6).toFixed(1) + ' Mo, ' + plan.reduce((a, [, s]) => a + s, 0) + ' s)');
})();
