// Pax Mythica — lance la « cuisson » des personnages animés (scripts/personnages-cuisson.html) dans un navigateur sans fenêtre
// et enregistre ressources/personnages/<type>.json, .bin (positions de chaque image d'animation) et .jpg (atlas des couleurs).
// Lancer : NODE_PATH=<dossier où three, meshoptimizer et playwright sont installés>/node_modules node scripts/personnages-cuisson.js [types…]
//   (SOURCES=<dossier> pour lire les modèles ailleurs que dans ressources-catalogue/personnages/sources)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const NM = process.env.NODE_PATH.split(':')[0], ICI = __dirname;
const SOURCES = process.env.SOURCES || path.join(ICI, '..', 'ressources-catalogue', 'personnages', 'sources');
const SORTIE = path.join(ICI, '..', 'ressources', 'personnages'); fs.mkdirSync(SORTIE, { recursive: true });
const RACINES = { '/three/': path.join(NM, 'three') + '/', '/meshoptimizer/': path.join(NM, 'meshoptimizer') + '/', '/sources/': SOURCES + '/', '/': ICI + '/' };
const TYPES_MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.wasm': 'application/wasm' };
const serveur = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]), cle = Object.keys(RACINES).find(k => u.startsWith(k)), f = path.join(RACINES[cle], u.slice(cle.length));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES_MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch(), p = await b.newPage();
  p.on('console', m => { if (m.type() === 'error') console.log('page :', m.text().slice(0, 300)); }); p.on('pageerror', e => console.log('erreur :', e.message));
  await p.goto(`http://127.0.0.1:${serveur.address().port}/personnages-cuisson.html`); await p.waitForFunction(() => document.title === 'pret', null, { timeout: 300000 });
  const types = process.argv.slice(2).length ? process.argv.slice(2) : await p.evaluate(() => window.TYPES), bilan = {};
  for (const t of types) {
    const r = await p.evaluate(t => window.cuire(t).catch(e => ({ erreur: e.message + ' ' + e.stack })), t);
    if (r.erreur) { console.log(t, 'ÉCHEC', r.erreur); continue; }
    fs.writeFileSync(path.join(SORTIE, t + '.json'), JSON.stringify(r.meta)); fs.writeFileSync(path.join(SORTIE, t + '.bin'), Buffer.from(r.bin, 'base64')); fs.writeFileSync(path.join(SORTIE, t + '.jpg'), Buffer.from(r.atlas, 'base64'));
    bilan[t] = r.meta; console.log(t, `${r.meta.avant.triangles} → ${r.meta.triangles} triangles, ${r.meta.sommets} sommets, ${r.meta.images} images, ${(fs.statSync(path.join(SORTIE, t + '.bin')).size / 1e6).toFixed(1)} Mo`);
  }
  await b.close(); serveur.close();
});
