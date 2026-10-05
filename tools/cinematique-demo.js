/* QuenTools — génère les images de la démonstration « site cinématique » (demo/cinematique/) : node tools/cinematique-demo.js
   Scène dessinée par programme (aucune IA, aucun droit d'auteur) : des points de lumière convergent en sphère, explosent, puis forment un anneau.
   Écrit demo/cinematique/frames/f_001.webp… (ordinateur, 960×540), frames-mobile/ (une image sur deux, 640×360) et scrub.mp4
   (vidéo « toutes les images sont des images clés », pour la technique de la vidéo pilotée par le défilement).
   Nécessite Playwright (voir tools/audit-express.js) et ffmpeg. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const out = path.join(__dirname, '..', 'demo', 'cinematique'), tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qt-frames-'));
const N = 90, W = 960, H = 540;

const page_html = `<!doctype html><body style="margin:0;background:#07060b"><canvas id="c" width="${W}" height="${H}"></canvas><script>
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=rng(7),P=[];for(let i=0;i<260;i++){const a=R()*6.283,d=260+R()*330,b=R()*6.283,rr=70+R()*34;P.push({a,d,b,rr,s:.8+R()*1.8,h:R()<.22?28:R()<.5?262:200,o:R()})}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,cl=(x,a,b)=>Math.max(0,Math.min(1,(x-a)/(b-a))),mix=(a,b,t)=>a+(b-a)*t;
function draw(p){const c=document.getElementById('c').getContext('2d');c.globalCompositeOperation='source-over';
const g=c.createRadialGradient(${W}/2,${H}/2,0,${W}/2,${H}/2,${W}*.62);g.addColorStop(0,'#15112a');g.addColorStop(1,'#07060b');c.fillStyle=g;c.fillRect(0,0,${W},${H});
c.globalCompositeOperation='lighter';const cx=${W}/2,cy=${H}/2;
const charge=ease(cl(p,0,.4)),burst=cl(p,.4,.62),ring=ease(cl(p,.62,1));
const core=cl(p,.25,.45)*(1-cl(p,.45,.62));
if(core>0){const r=mix(10,120,core),h=c.createRadialGradient(cx,cy,0,cx,cy,r*2.4);h.addColorStop(0,'hsla(35,100%,80%,'+(.9*core)+')');h.addColorStop(.35,'hsla(28,100%,55%,'+(.5*core)+')');h.addColorStop(1,'hsla(262,100%,60%,0)');c.fillStyle=h;c.beginPath();c.arc(cx,cy,r*2.4,0,7);c.fill()}
if(burst>0&&burst<1){const rr=ease(burst)*${W}*.55,al=1-burst;c.lineWidth=3+8*al;c.strokeStyle='hsla(30,100%,70%,'+al*.8+')';c.beginPath();c.arc(cx,cy,rr,0,7);c.stroke();c.lineWidth=1.5;c.strokeStyle='hsla(262,100%,75%,'+al*.6+')';c.beginPath();c.arc(cx,cy,rr*.78,0,7);c.stroke()}
for(const q of P){let x,y,al=1;const wob=Math.sin(p*18+q.o*9)*3;
 const sx=cx+Math.cos(q.a)*q.d,sy=cy+Math.sin(q.a)*q.d*.62;
 const sphX=cx+Math.cos(q.b)*q.rr*Math.cos(q.a*3)*(1-.25*Math.sin(p*20)*charge),sphY=cy+Math.sin(q.b)*q.rr*Math.cos(q.a*3)*.9;
 if(p<.4){x=mix(sx,sphX,charge);y=mix(sy,sphY,charge)}
 else if(p<.62){const e=ease(burst);const dx=Math.cos(q.a+q.o)*(90+q.d*.55),dy=Math.sin(q.a+q.o)*(60+q.d*.35);x=mix(sphX,cx+dx,e);y=mix(sphY,cy+dy,e);al=1-burst*.35}
 else{const ang=q.a*2+p*7*(.6+q.o*.8),rad=190+Math.sin(q.b*5)*14,tx=cx+Math.cos(ang)*rad*1.55,ty=cy+Math.sin(ang)*rad*.52;const bx=cx+Math.cos(q.a+q.o)*(90+q.d*.55),by=cy+Math.sin(q.a+q.o)*(60+q.d*.35);x=mix(bx,tx,ring);y=mix(by,ty,ring);al=.65+.35*ring}
 const sz=q.s*(p<.4?1+charge:1+(1-burst)*.8);const h=c.createRadialGradient(x+wob*.2,y,0,x,y,sz*5);h.addColorStop(0,'hsla('+q.h+',100%,78%,'+al*.95+')');h.addColorStop(1,'hsla('+q.h+',100%,55%,0)');c.fillStyle=h;c.beginPath();c.arc(x,y,sz*5,0,7);c.fill()}
const flash=Math.max(0,1-Math.abs(p-.42)/.04);if(flash>0){c.fillStyle='rgba(255,236,200,'+flash*.4+')';c.fillRect(0,0,${W},${H})}
c.globalCompositeOperation='source-over';const v=c.createRadialGradient(cx,cy,${H}*.4,cx,cy,${W}*.7);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=v;c.fillRect(0,0,${W},${H})}
</script></body>`;

(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent(page_html);
  for (let i = 0; i < N; i++) {
    await p.evaluate(v => draw(v), i / (N - 1));
    await (await p.$('#c')).screenshot({ path: path.join(tmp, `f_${String(i + 1).padStart(3, '0')}.png`) });
  }
  await b.close();
  for (const d of ['frames', 'frames-mobile']) { fs.rmSync(path.join(out, d), { recursive: true, force: true }); fs.mkdirSync(path.join(out, d), { recursive: true }); }
  const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
  /* Ordinateur : toutes les images, 960 px de large ; mobile : une image sur deux, 640 px (suite indépendante, pas la même réduite) */
  ff('-i', path.join(tmp, 'f_%03d.png'), '-c:v', 'libwebp', '-quality', '72', path.join(out, 'frames', 'f_%03d.webp'));
  ff('-i', path.join(tmp, 'f_%03d.png'), '-vf', "select='not(mod(n,2))',scale=640:-1", '-vsync', 'vfr', '-c:v', 'libwebp', '-quality', '70', path.join(out, 'frames-mobile', 'f_%03d.webp'));
  /* Vidéo pilotée : une image clé à chaque image (-g 1), sinon le défilement saccade */
  ff('-framerate', '30', '-i', path.join(tmp, 'f_%03d.png'), '-vf', 'scale=720:-2', '-c:v', 'libx264', '-g', '1', '-crf', '30', '-preset', 'veryslow', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', path.join(out, 'scrub.mp4'));
  const size = d => fs.readdirSync(path.join(out, d)).reduce((n, f) => n + fs.statSync(path.join(out, d, f)).size, 0);
  console.log('ordinateur', fs.readdirSync(path.join(out, 'frames')).length, 'images,', (size('frames') / 1e6).toFixed(2), 'Mo');
  console.log('mobile', fs.readdirSync(path.join(out, 'frames-mobile')).length, 'images,', (size('frames-mobile') / 1e6).toFixed(2), 'Mo');
  console.log('scrub.mp4', (fs.statSync(path.join(out, 'scrub.mp4')).size / 1e6).toFixed(2), 'Mo');
  fs.rmSync(tmp, { recursive: true, force: true });
})();
