// Régénère les PNG des personnages QuentInvest à partir des SVG de ce dossier.
// Usage (une seule fois après modification d'un SVG) : node persos/generer.js
// Nécessite playwright-core et un Chromium (QS_CHROMIUM=chemin si besoin) ; l'application n'utilise que les PNG.
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright-core'); } catch (e) { pw = require(path.join(__dirname, '../../quentmovie/node_modules/playwright-core')); }
const TAILLES = { max: [460, 660], pepite: [340, 376] };
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.QS_CHROMIUM || undefined });
  const p = await b.newPage();
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.svg'))) {
    const [w, h] = TAILLES[f.split('-')[0]];
    await p.setViewportSize({ width: w, height: h });
    const svg = fs.readFileSync(path.join(__dirname, f), 'utf8').replace('<svg ', `<svg width="${w}" height="${h}" `);
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, f.replace('.svg', '.png')), omitBackground: true });
    console.log(f, '→', w + '×' + h);
  }
  await b.close();
})();
