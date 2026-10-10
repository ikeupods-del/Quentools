/* QuenTools — contrôle de l'interface de Paperdecrypt (rappels, outils, coffre, dossier) : node tools/verifier-decodeur-ui.js. Nécessite Playwright. */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(d); } }); }).listen(8766);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.route(/googlesyndication|gstatic|jsdelivr/, r => r.abort());
  await pg.goto('http://localhost:8766/decodeur-courrier.html');
  const ok = (c, m) => console.log((c ? '✓ ' : '✗ ') + m);
  // 1 decode sample
  await pg.click('#sample-btn');
  ok(await pg.isVisible('#share-btn'), 'bouton partager visible');
  await pg.click('#share-btn'); ok(await pg.isVisible('#share-box'), 'boîte de partage ouverte');
  ok((await pg.locator('#more-letters').count()) === 1, 'lien vers tous les modèles');
  await pg.click('#save-btn');
  await pg.click('#tab-decode'); 
  const rem = await pg.locator('#reminders li').count(); ok(rem >= 1, 'rappel affiché après enregistrement (' + rem + ')');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#r-ics')]);
  const ics = fs.readFileSync(await dl.path(), 'utf8'); ok(/BEGIN:VEVENT/.test(ics) && /TRIGGER:-P3D/.test(ics), 'agenda .ics avec alertes');
  // 2 outils
  await pg.click('#tab-tools'); ok(await pg.locator('[data-tool]').count() === 4, '4 outils');
  await pg.click('[data-tool=tva]');
  await pg.fill('#tv-montant', '1200'); await pg.selectOption('#tv-mode', 'ht'); await pg.fill('#tv-acompte', '30');
  const txt = await pg.innerText('#tv-out'); ok(/1\s?200,00/.test(txt) && /240,00/.test(txt) && /1\s?440,00/.test(txt) && /432,00/.test(txt), 'TVA 1200 HT → 240 / 1440 / acompte 432 : ' + txt.replace(/\s+/g, ' '));
  await pg.selectOption('#tv-mode', 'ttc'); await pg.fill('#tv-montant', '120');
  ok(/100,00/.test(await pg.innerText('#tv-out')), 'TVA inverse 120 TTC → 100 HT');
  ok(location => true, '');
  await pg.click('#tool-back'); await pg.click('[data-tool=lettres]');
  const nL = await pg.locator('[data-lettre]').count(); ok(nL === 6, nL + ' modèles de lettres');
  await pg.click('[data-lettre=resiliation]');
  await pg.fill('#cf-societe', 'Opérateur Test'); await pg.fill('#cf-contrat', 'C-123'); await pg.fill('#cf-fin', '2026-12-31');
  await pg.click('#lt-go'); const draft = await pg.innerText('#lt-draft'); ok(/Résiliation du contrat n° C-123/.test(draft) && /Opérateur Test/.test(draft) && /31 décembre 2026/.test(draft), 'lettre de résiliation générée');
  // abos
  await pg.click('#tool-back'); await pg.click('#tool-back'); await pg.click('[data-tool=abos]');
  await pg.click('#abo-add'); await pg.fill('#ab-name', 'Box internet'); await pg.fill('#ab-amount', '29.99'); await pg.selectOption('#ab-period', 'mois');
  const soon = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10); await pg.fill('#ab-next', soon); await pg.selectOption('#ab-notice', '30');
  await pg.click('#ab-save'); const at = await pg.innerText('#tools'); ok(/Box internet/.test(at) && /29,99/.test(at) && /359,88/.test(at), 'abonnement ajouté, total annuel 359,88');
  await pg.click('[data-abo-renew]'); ok(await pg.locator('[data-abo]').count() === 1, 'abonnement renouvelé');
  await pg.click('[data-abo-stop]'); ok(/Résilier un abonnement|Résiliation/.test(await pg.innerText('#tools')), 'bouton résilier ouvre la lettre');
  // 3 coffre
  await pg.click('#tab-vault'); await pg.uncheck('#vault-read');
  await pg.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 400); x.fillStyle = '#000'; x.fillText('Facture EDF', 20, 40);
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); const f = new File([blob], 'facture-edf.png', { type: 'image/png' });
    const dt = new DataTransfer(); dt.items.add(f); const i = document.querySelector('#vault-input'); i.files = dt.files; i.dispatchEvent(new Event('change'));
  });
  await pg.waitForSelector('[data-vd]'); ok(/facture-edf/.test(await pg.innerText('#vault')), 'document ajouté au coffre');
  await pg.fill('#vault-q', 'edf'); ok(await pg.locator('[data-vd]').count() === 1, 'recherche par nom');
  await pg.fill('#vault-q', 'zzzz'); ok(await pg.locator('[data-vd]').count() === 0, 'recherche sans résultat');
  await pg.fill('#vault-q', '');
  await pg.click('[data-vd-edit]'); await pg.selectOption('#vd-cat', 'facture'); await pg.fill('#vd-note', 'électricité'); await pg.click('#vd-save');
  await pg.fill('#vault-q', 'electricite'); ok(await pg.locator('[data-vd]').count() === 1, 'recherche dans la note (sans accent)');
  await pg.fill('#vault-q', '');
  await pg.click('[data-vd-open]'); await pg.waitForSelector('#img-dialog[open]', { timeout: 3000 }).catch(() => {}); ok(await pg.isVisible('#img-dialog'), 'ouverture de la photo'); await pg.click('#img-close');
  // 4 dossier
  const html = await pg.evaluate(() => window.__decodeur.buildDossier({ courriers: true, reclamations: true, garanties: true, abos: true, coffre: true, coffreImages: true }));
  ok(/<h2>Courriers<\/h2>/.test(html) && /Box internet/.test(html) && /facture-edf/.test(html) && /<img src="data:image/.test(html), 'dossier PDF : courriers, abonnements, coffre et image');
  await pg.click('#tab-list'); await pg.click('#list-dossier'); ok(await pg.isVisible('#dossier'), 'fenêtre dossier'); await pg.click('#do-close');
  // 5 recadrage
  const crop = await pg.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 1400; const x = c.getContext('2d'); x.fillStyle = '#3a2a1a'; x.fillRect(0, 0, 1000, 1400); x.fillStyle = '#e8e8e0'; x.fillRect(150, 200, 700, 1000); x.fillStyle = '#222'; for (let i = 0; i < 20; i++) x.fillRect(190, 260 + i * 40, 600, 12);
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); const o = await window.__decodeur.fileToCanvas(new File([blob], 'a.png', { type: 'image/png' }));
    return { w: o.width, h: o.height };
  });
  ok(crop.w < 900 && crop.h < 1200 && crop.w > 650, 'recadrage automatique 1000×1400 → ' + crop.w + '×' + crop.h);
  // 6 mobile : onglets
  await pg.click('#tab-decode'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-decode.png' });
  await pg.click('#tab-tools'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-tools.png' });
  await pg.click('#tab-vault'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-vault.png' });
  console.log(errs.length ? errs.join('\n') : '✓ aucune erreur JavaScript');
  await b.close(); srv.close();
})().catch(e => { console.error('ECHEC', e); process.exit(1); });
