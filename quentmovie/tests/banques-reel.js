// Banques de photos sur internet (Mac de construction) : Wikimedia Commons, Openverse, NASA. Une banque en panne ou limitée est signalée
// mais n'échoue pas seule ; l'essai échoue si aucune banque sans clé ne répond ou si une vignette ne s'affiche pas.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { create } = require('../server');
const { resolveFfmpeg } = require('../ffmpeg-path');

(async () => {
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-banques-reel-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const requetes = [['bicycle city street', 'horizontal'], ['moon surface', 'horizontal'], ['dinner table family', 'vertical']];
  let total = 0, vignettes = 0, essais = 0;
  for (const [q, format] of requetes) {
    const r = await (await fetch(U('/api/generer/images'), { method: 'POST', body: JSON.stringify({ q, format }) })).json();
    const par = {}; for (const x of r.images || []) par[x.source || 'Wikimedia Commons'] = (par[x.source || 'Wikimedia Commons'] || 0) + 1;
    console.log(`« ${q} » (${format}) : ${(r.images || []).length} photos —`, JSON.stringify(par));
    total += (r.images || []).length;
    for (const src of Object.keys(par)) { const im = r.images.find(x => (x.source || 'Wikimedia Commons') === src); essais++;
      const v = await fetch(U('/api/vignette?w=330&u=' + encodeURIComponent(im.apercu || im.url))), n = (await v.arrayBuffer()).byteLength;
      console.log(`   vignette ${src} : ${v.status} ${Math.round(n / 1000)} Ko — ${im.nom.slice(0, 50)} (${im.auteur}, ${im.licence})`); if (v.status === 200 && n > 1000) vignettes++; }
  }
  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Banques de photos (internet) : ${total} photos trouvées, ${vignettes}/${essais} vignettes affichées`);
  process.exit(total > 0 && vignettes === essais ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
