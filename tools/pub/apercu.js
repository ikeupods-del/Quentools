/* QuenTools — aperçu de la publicité : images fixes à quelques instants (planche de contrôle) : node tools/pub/apercu.js [port|land] */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', '..'), fmt = process.argv[2] === 'land' ? 'land' : 'port', W = fmt === 'land' ? 1920 : 1080, H = fmt === 'land' ? 1080 : 1920;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8769);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://localhost:8769/tools/pub/pub.html?fmt=${fmt}`); await pg.evaluate(() => window.ready);
  const times = (process.argv[3] || '1.2,2.6,4.4,5.4,8.0,9.5,11.8,15.0,16.6,18.8,19.9,20.6,22.4,25.5,28.6').split(',').map(Number), dir = os.tmpdir() + '/pub-' + fmt; fs.mkdirSync(dir, { recursive: true });
  for (const t of times) { await pg.evaluate(t => setT(t), t); await pg.screenshot({ path: `${dir}/t${String(t).replace('.', '_')}.jpg`, type: 'jpeg', quality: 80 }); }
  console.log(errs.length ? errs.join('\n') : 'ok ' + dir); await b.close(); srv.close();
})();
