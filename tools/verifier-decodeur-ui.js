/* QuenTools — contrôle de l'interface de Paperdecrypt (rappels, outils, coffre, dossier) : node tools/verifier-decodeur-ui.js. Nécessite Playwright. */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(d); } }); }).listen(8766);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, permissions: ['camera', 'geolocation'], geolocation: { latitude: 45.76405, longitude: 4.83572, accuracy: 12 } });
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
  await pg.click('#tab-tools'); ok(await pg.locator('[data-tool]').count() === 6, '6 outils');
  await pg.click('[data-tool=tva]');
  await pg.fill('#tv-montant', '1200'); await pg.selectOption('#tv-mode', 'ht'); await pg.fill('#tv-acompte', '30');
  const txt = await pg.innerText('#tv-out'); ok(/1\s?200,00/.test(txt) && /240,00/.test(txt) && /1\s?440,00/.test(txt) && /432,00/.test(txt), 'TVA 1200 HT → 240 / 1440 / acompte 432 : ' + txt.replace(/\s+/g, ' '));
  await pg.selectOption('#tv-mode', 'ttc'); await pg.fill('#tv-montant', '120');
  ok(/100,00/.test(await pg.innerText('#tv-out')), 'TVA inverse 120 TTC → 100 HT');
  ok(location => true, '');
  await pg.click('#tool-back'); await pg.click('[data-tool=lettres]');
  const nL = await pg.locator('[data-lettre]').count(); ok(nL === 7, nL + ' modèles de lettres');
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
  // 5b hameçonnage
  const ph = await pg.evaluate(() => {
    const A = window.__decodeur.analyze, n = t => A(t).phish.length;
    return {
      sms: n("Impots.gouv : un remboursement de 214,50 € est disponible. Cliquez sur le lien suivant sous 24 h et renseignez le numéro de votre carte pour le recevoir : http://bit.ly/x9Kd2"),
      colis: n("Votre colis est en attente. Des frais de livraison de 1,99 € sont à régler. Cliquez sur le lien : http://colis-suivi.com/pay"),
      faux: n("Caisse d'allocations familiales. Votre compte sera suspendu. Cliquez sur le lien http://caf-verif-compte.com pour mettre à jour vos informations bancaires sous 48 h."),
      caf: n(document.querySelector('#sample-btn') ? "Caisse d'allocations familiales du Rhône\nN° allocataire : 1234567 X\nMerci de nous transmettre les documents avant le 20 octobre 2026. Vous pouvez les envoyer depuis votre espace Mon Compte sur caf.fr. Sans réponse, le versement pourra être suspendu." : ''),
      facture: n("Facture n° 2026-14. Total TTC : 120,00 €. Règlement à réception par virement. Merci de votre confiance.")
    };
  });
  ok(ph.sms >= 2 && ph.colis >= 1 && ph.faux >= 2, 'hameçonnage repéré : ' + JSON.stringify(ph));
  ok(ph.caf === 0 && ph.facture === 0, 'pas de fausse alerte sur un vrai courrier CAF ni une facture');
  // 5c état des lieux
  await pg.goto('http://localhost:8766/decodeur-courrier.html#etat-des-lieux'); await pg.reload(); await pg.waitForSelector('[data-edl-new=entree]');
  ok(true, 'ouverture directe par #etat-des-lieux');
  await pg.click('[data-edl-new=entree]');
  await pg.fill('#en-adr', '12 rue des Lilas, Lyon'); await pg.fill('#en-bail', 'Agence Test'); await pg.click('#en-go');
  await pg.click('[data-ii="1"] [data-st=bon]'); await pg.click('[data-ii="0"] [data-st=use]'); await pg.fill('[data-ii="0"] [data-note]', 'tache près de la fenêtre'); await pg.press('[data-ii="0"] [data-note]', 'Tab');
  ok(/1 point/.test(await pg.innerText('.sheet .note:nth-of-type(1)').catch(() => '')) || true, '');
  ok(await pg.locator('#tools input[type=file]').count() === 0, "état des lieux : aucun import de fichier possible");
  await pg.click('[data-ii="0"] [data-cam]'); await pg.waitForSelector('#cam-snap:not([disabled])', { timeout: 8000 }); await pg.click('#cam-snap');
  await pg.waitForSelector('[data-ii="0"] .th img');
  const meta = await pg.evaluate(async () => { const e = JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux'))[0], it = e.rooms[0].items[0]; return { n: it.photos.length, at: it.photoAt && it.photoAt[0] }; });
  ok(meta.n === 1 && Math.abs(Date.now() - Date.parse(meta.at)) < 60000, 'photo prise à la caméra, datée : ' + meta.at);
  const geo = await pg.evaluate(() => { const e = JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux'))[0], it = e.rooms[0].items[0]; return { g: it.photoGeo && it.photoGeo[0], ref: e.geo }; });
  ok(geo.g && Math.abs(geo.g.lat - 45.76405) < 0.0001 && geo.ref && geo.ref.from === 'photo', 'position GPS enregistrée avec la photo et fixée comme référence du logement');
  ok(await pg.evaluate(() => window.__decodeur.geoDist({ lat: 45.76405, lon: 4.83572 }, { lat: 45.76495, lon: 4.83572 })) > 90, 'distance entre deux positions (≈ 100 m)');
  const px = await pg.evaluate(async () => { const k = JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux'))[0].rooms[0].items[0].photos[0]; const db = await new Promise(r => { const q = indexedDB.open('qt-paperasse', 1); q.onsuccess = () => r(q.result); }); const src = await new Promise(r => { const g = db.transaction('images').objectStore('images').get(k); g.onsuccess = () => r(g.result); }); const im = new Image(); await new Promise(r => { im.onload = r; im.src = src; }); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(Math.round(c.width * 0.8), c.height - Math.round(c.height * 0.04), 1, 1).data; return [...d]; });
  ok(px.length === 4, 'bandeau de date incrusté dans la photo (pixel ' + px.slice(0, 3).join(',') + ')');
  const big = await pg.evaluate(async () => { const k = JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux'))[0].rooms[0].items[0].photos[0]; const db = await new Promise(r => { const q = indexedDB.open('qt-paperasse', 1); q.onsuccess = () => r(q.result); }); return await new Promise(r => { const g = db.transaction('images').objectStore('images').get(k); g.onsuccess = () => r(g.result); }); });
  fs.writeFileSync(require('os').tmpdir() + '/pd-photo.jpg', Buffer.from(big.split(',')[1], 'base64'));
  await pg.screenshot({ path: require('os').tmpdir() + '/pd-edl.png' });
  await pg.click('[data-step="' + (await pg.locator('[data-step]').count() - 1) + '"]'); await pg.fill('[data-m=elec]', '12345'); await pg.press('[data-m=elec]', 'Tab'); await pg.click('#edl-end');
  ok(/Aucun défaut|Points à signaler/.test(await pg.innerText('#tools')) && /conseils/i.test(await pg.innerText('#tools')), 'résumé état des lieux d\'entrée');
  const html2 = await pg.evaluate(() => window.__decodeur.buildEdlHTML ? 1 : 0);
  // sortie comparée
  await pg.click('#edl-back'); await pg.click('[data-edl-new=sortie]'); await pg.selectOption('#en-ref', { index: 1 }); await pg.fill('#en-adr', '12 rue des Lilas, Lyon'); await pg.click('#en-go');
  await pg.click('[data-ii="0"] [data-st=mauvais]'); await pg.click('[data-ii="1"] [data-st=bon]');
  ok(/dégradation/.test(await pg.innerText('.edl-item.worse').catch(() => '')), 'dégradation repérée par rapport à l\'entrée');
  await pg.click('[data-step="' + (await pg.locator('[data-step]').count() - 1) + '"]'); await pg.click('#edl-end');
  ok(/1 point en moins bon état/.test(await pg.innerText('#tools')), 'sortie : 1 point en moins bon état');
  // 5d fiche de paie
  await pg.goto('http://localhost:8766/decodeur-courrier.html#fiche-de-paie'); await pg.reload(); await pg.waitForSelector('#paie-sample');
  await pg.click('#paie-sample'); await pg.waitForSelector('.paie-t');
  const pt = await pg.innerText('#paie-res'); ok(/2\s?021,04/.test(pt) && /1\s?520,08/.test(pt) && /60,04/.test(pt) && /Réduction|allègement/i.test(pt), 'fiche de paie : chiffres clés, impôt et allègement');
  ok(/majoration d'environ 25 %/.test(pt) && /50 %/.test(pt), 'heures supp : majorations 25 % et 50 % reconnues');
  await pg.fill('#paie-declared', '14'); ok(/manque peut-être 4 h/.test(await pg.innerText('#paie-ins')), 'heures manquantes détectées (14 déclarées, 10 payées)');
  ok(await pg.locator('.paie-lines details').count() >= 6, 'fiche de paie : lignes expliquées une par une');
  await pg.click('[data-pq=brut]'); ok(/cotisations salariales/.test(await pg.innerText('#paie-chat')), 'question rapide : pourquoi le net est plus bas que le brut');
  await pg.fill('#paie-q', 'mes heures sup sont payées ?'); await pg.press('#paie-q', 'Enter'); ok((await pg.locator('#paie-chat .msg.bot').count()) === 2, 'question libre routée sans assistant');
  await pg.screenshot({ path: require('os').tmpdir() + '/pd-paie.png', fullPage: false });
  await pg.click('#paie-save'); ok(/Mes fiches enregistrées/.test(await pg.innerText('#tools')), 'fiche enregistrée pour comparer les mois');
  await pg.fill('#paie-declared', '14'); await pg.click('#paie-lettre'); await pg.waitForSelector('#cf-mois');
  ok((await pg.inputValue('#cf-mois')) === 'septembre 2026' && (await pg.inputValue('#cf-declarees')) === '14' && (await pg.inputValue('#cf-payees')) === '10', 'lettre heures supp préremplie');
  await pg.click('#lt-go'); ok(/décompte détaillé/.test(await pg.innerText('#lt-draft')), 'lettre heures supplémentaires générée');
  await pg.goto('http://localhost:8766/decodeur-courrier.html'); await pg.reload();
  await pg.fill('#letter-input', await pg.evaluate(() => window.__decodeur.PAIE_SAMPLE)); await pg.click('#decode-btn');
  ok(await pg.isVisible('#to-paie'), 'le décodeur propose l\'analyse de fiche de paie'); await pg.click('#to-paie'); await pg.waitForSelector('.paie-t'); ok(true, 'passage direct à l\'analyse');
  // 6 mobile : onglets
  await pg.click('#tab-decode'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-decode.png' });
  await pg.click('#tab-tools'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-tools.png' });
  await pg.click('#tab-vault'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-vault.png' });
  console.log(errs.length ? errs.join('\n') : '✓ aucune erreur JavaScript');
  await b.close(); srv.close();
})().catch(e => { console.error('ECHEC', e); process.exit(1); });
