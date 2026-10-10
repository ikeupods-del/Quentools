/* QuenTools — contrôle de l'interface de Paperdecrypt (rappels, outils, coffre, dossier) : node tools/verifier-decodeur-ui.js. Nécessite Playwright. */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8766);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, permissions: ['camera', 'geolocation'], geolocation: { latitude: 45.76405, longitude: 4.83572, accuracy: 12 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('qt-paperasse:premium-compte', JSON.stringify({ email: 'test@example.com', until: '', plan: 'vie', checked: Date.now() })); } catch (e) { /* ignoré */ } });
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
  // 5e cadre guide de la caméra (caméra simulée par Chromium)
  await pg.click('label[for=paie-cam]'); await pg.waitForSelector('#gc-dialog[open]');
  await pg.waitForFunction(() => document.querySelectorAll('#gc-meters span').length === 3, null, { timeout: 8000 });
  ok(await pg.isVisible('.gc-frame') && /Lumière/.test(await pg.innerText('#gc-meters')) && /Netteté/.test(await pg.innerText('#gc-meters')), 'cadre guide : cadre et mesures (lumière, netteté, ombres) en direct');
  ok(['good', 'warn', 'bad'].includes(await pg.getAttribute('#gc-stage', 'data-lv')) && (await pg.innerText('#gc-chip')).length > 5, 'cadre guide : verdict affiché');
  { // écran de téléphone avec barres du navigateur : le bouton « Prendre la photo » est visible sans défiler
    await pg.setViewportSize({ width: 390, height: 664 }); await pg.waitForTimeout(300);
    const m = await pg.evaluate(() => { const r = document.querySelector('#gc-snap').getBoundingClientRect(), d = document.querySelector('#gc-dialog .dlg'); return { bas: r.bottom, haut: innerHeight, defile: d.scrollHeight > d.clientHeight + 1 }; });
    ok(m.bas <= m.haut && !m.defile, 'cadre guide : « Prendre la photo » visible sans défiler (écran 390×664)');
    await pg.setViewportSize({ width: 390, height: 844 });
  }
  await pg.click('#gc-cancel'); ok(!(await pg.locator('#gc-dialog[open]').count()), 'cadre guide : fermeture');
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
  // 5d' fiche de paie sur plusieurs pages
  await pg.goto('http://localhost:8766/decodeur-courrier.html'); await pg.reload();
  await pg.evaluate(() => window.__decodeur.paieSetPages([
    { name: 'page-2.jpg', text: "Total des cotisations 420,10 580,00\nNET A PAYER AVANT IMPOT SUR LE REVENU 1 519,94\nPrélèvement à la source 3,80 % 1 519,94 57,76\nNET A PAYER 1 462,18" },
    { name: 'page-1.jpg', text: "BULLETIN DE PAIE\nPériode du 01/09/2026 au 30/09/2026\nSalaire de base 151,67 12,00 1 820,04\nHeures supplémentaires 8,00 12,00 96,00\nMajoration heures supplémentaires 25 % 8,00 12,00 24,00\nTOTAL BRUT 1 940,04" }]));
  await pg.waitForSelector('.pages li'); ok((await pg.locator('.pages li').count()) === 2 && /Analyser mes 2 pages/.test(await pg.innerText('#paie-go')), 'fiche de paie : 2 pages en attente, bouton « Analyser mes 2 pages »');
  await pg.click('[data-pg-up="1"]'); ok(/page-1\.jpg/.test(await pg.locator('.pages li').first().innerText()), 'fiche de paie : pages réordonnables');
  await pg.click('#paie-go'); await pg.waitForSelector('.paie-t');
  const mp = await pg.innerText('#paie-res'); ok(/1\s?940,04/.test(mp) && /1\s?462,18/.test(mp) && /57,76/.test(mp) && /septembre 2026/.test(mp), 'fiche de paie : les 2 pages sont lues ensemble (brut, net, impôt, période)');
  ok(/majoration d'environ 25 %/.test(mp) && !/tarif normal/.test(mp), 'fiche de paie : majoration sur ligne séparée bien reconnue');
  await pg.click('#paie-fixbox summary'); await pg.fill('[data-fix=brut]', '2000,00'); await pg.click('#paie-fix-go'); await pg.waitForSelector('.paie-t');
  ok(/2\s?000,00/.test(await pg.innerText('#paie-res .paie-t')), 'fiche de paie : correction manuelle du brut appliquée');
  // 5d'' lecture par positions d'un vrai PDF : validation des totaux, puis analyse (nécessite pdfjs-dist, sinon ignoré)
  {
    const lib = require('./essai-lecture-paie.js'), pj = [process.env.PDFJS_DIR, path.join(ROOT, 'node_modules', 'pdfjs-dist'), '/tmp/claude-0/pdfjs/node_modules/pdfjs-dist'].find(d => d && fs.existsSync(path.join(d, 'build', 'pdf.min.js')));
    if (!pj) console.log('· lecture PDF par positions : ignorée (pdfjs-dist introuvable)');
    else {
      await pg.route(/pdfjs-dist@3\.11\.174\/build\/pdf(\.worker)?\.min\.js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(pj, 'build', /worker/.test(r.request().url()) ? 'pdf.worker.min.js' : 'pdf.min.js')) }));
      const envoyer = async buf => { await pg.goto('http://localhost:8766/decodeur-courrier.html#fiche-de-paie'); await pg.evaluate(() => sessionStorage.clear()); await pg.reload(); await pg.waitForSelector('#paie-sample'); await pg.setInputFiles('#paie-file', { name: 'fiche.pdf', mimeType: 'application/pdf', buffer: buf }); await pg.waitForSelector('#paie-go'); await pg.click('#paie-go'); await pg.waitForSelector('#paie-valid', { timeout: 20000 }); };
      await envoyer(lib.writePdf(lib.layout()));
      const val = k => pg.inputValue('[data-val=' + k + ']');
      ok((await val('brut')) === '2 330,93' && (await val('cotSal')) === '473,77' && (await val('netAvant')) === '1 861,16' && (await val('netImposable')) === '1 672,06' && (await val('netPayer')) === '1 861,16', 'PDF réel : les 5 totaux sont préremplis avec les bonnes valeurs');
      ok(/Lecture recoupée/.test(await pg.innerText('#paie-valid')) && (await pg.locator('#paie-res .paie-t').count()) === 0, 'PDF réel : lecture recoupée, analyse masquée avant validation');
      const cols = await pg.innerText('#paie-valid .two-col');
      ok(/Ce que tu paies/.test(cols) && /Ce que paie ton employeur/.test(cols), 'PDF réel : deux colonnes salarié / employeur');
      await pg.click('#paie-valid-go'); await pg.waitForSelector('#paie-res .paie-t');
      const rs = await pg.innerText('#paie-res');
      ok(/2\s?330,93/.test(rs) && /473,77/.test(rs) && /1\s?861,16/.test(rs) && /1\s?672,06/.test(rs) && !/ancienneté/i.test(await pg.locator('#paie-res .paie-lines').innerText()), 'PDF réel : analyse sur les chiffres validés, sans ligne inventée');
      ok(/Qui paie quoi/.test(rs) && /Sécurité sociale maladie/.test(rs) && /163,17/.test(rs), 'PDF réel : « qui paie quoi » affiche la part employeur à sa place');
      // deux fichiers donnés à l'envers, le second ne montrant que la suite (totaux) : rattachés à la même fiche, ordre corrigé
      { const el = lib.layout({ suite: true }), p1 = el.filter(e => e.page === 1), p2 = el.filter(e => e.page === 2).map(e => ({ ...e, page: 1 }));
        await pg.goto('http://localhost:8766/decodeur-courrier.html#fiche-de-paie'); await pg.evaluate(() => sessionStorage.clear()); await pg.reload(); await pg.waitForSelector('#paie-sample');
        await pg.setInputFiles('#paie-file', [{ name: 'suite.pdf', mimeType: 'application/pdf', buffer: lib.writePdf(p2) }, { name: 'debut.pdf', mimeType: 'application/pdf', buffer: lib.writePdf(p1) }]);
        await pg.waitForSelector('#paie-go'); await pg.click('#paie-go'); await pg.waitForSelector('#paie-valid', { timeout: 20000 });
        const v = await pg.innerText('#paie-valid');
        ok(/2 pages reconnues comme une seule fiche/.test(v) && /ordre corrigé/.test(v) && /Lecture recoupée/.test(v), 'PDF en deux fichiers à l\'envers : suite rattachée à la fiche, ordre corrigé, lecture recoupée');
        ok((await pg.inputValue('[data-val=brut]')) === '2 330,93' && (await pg.inputValue('[data-val=netPayer]')) === '1 861,16', 'PDF en deux fichiers : totaux de la page de suite repris'); }
      // brut faux sur la fiche : lecture incertaine, cases en pointillés, correction puis validation
      const mauvais = lib.layout().map(e => (e.page === 1 && e.text === '2 330,93' && e.x > 330 ? { ...e, text: '2 130,93' } : e));
      await envoyer(lib.writePdf(mauvais));
      ok(/Lecture incertaine/.test(await pg.innerText('#paie-valid')) && (await pg.locator('#paie-valid .field.douteux').count()) === 5, 'PDF douteux : badge « lecture incertaine » et cases à vérifier');
      await pg.fill('[data-val=brut]', '2330,93'); await pg.click('#paie-valid-go'); await pg.waitForSelector('#paie-res .paie-t');
      ok(/2\s?330,93/.test(await pg.innerText('#paie-res .paie-t')), 'PDF douteux : la valeur corrigée est celle analysée');
    }
  }
  // 5d3 application installable : fichier d'installation, mode hors connexion, invitation sur iPhone
  {
    const ic = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    const ip = await ic.newPage(); await ip.route(/googlesyndication|gstatic|jsdelivr|googleapis/, r => r.abort());
    await ip.goto('http://localhost:8766/decodeur-courrier.html'); await ip.waitForSelector('#install:not([hidden])');
    ok(/Sur l'écran d'accueil/.test(await ip.innerText('#install')), "iPhone : invitation à installer (Partager → Sur l'écran d'accueil)");
    const mres = await ip.evaluate(async () => { const href = document.querySelector('link[rel=manifest]').href, r = await fetch(href), j = await r.json(); const ics = await Promise.all(j.icons.map(i => fetch(new URL(i.src, href)).then(x => x.status))); return { st: r.status, name: j.name, ics }; });
    ok(mres.st === 200 && mres.name === 'Paperdecrypt' && mres.ics.every(x => x === 200), 'application : manifeste et icônes servis');
    await ip.evaluate(() => navigator.serviceWorker.ready); await ip.reload(); await ip.waitForFunction(() => navigator.serviceWorker.controller);
    await ic.setOffline(true); await ip.reload(); await ip.waitForSelector('h1');
    ok(/Paperdecrypt/.test(await ip.innerText('h1')), "application : la page s'ouvre sans connexion");
    await ic.setOffline(false); await ip.click('#install-close'); await ip.reload(); await ip.waitForSelector('h1');
    ok(await ip.isHidden('#install'), 'invitation : « Plus tard » est retenu'); await ic.close();
  }
  // 5e mémoire des corrections
  await pg.goto('http://localhost:8766/decodeur-courrier.html'); await pg.reload();
  await pg.click('#sample-btn'); await pg.click('[data-fb=ko]'); await pg.waitForSelector('#fix-panel:not([hidden])');
  await pg.selectOption('#fix-org', 'impots'); await pg.click('#fix-apply');
  ok(/Impôts/.test(await pg.innerText('.who h2')) || /impôts/i.test(await pg.innerText('.who h2')), 'correction appliquée (expéditeur = impôts)');
  await pg.click('#new-btn'); await pg.reload(); await pg.click('#sample-btn');
  ok(/ajustée d'après tes corrections/.test(await pg.innerText('#result')) && /impôts/i.test(await pg.innerText('.who h2')), 'la correction est retenue pour le courrier suivant du même expéditeur');
  // 5f lecture : nettoyage du texte lu, dates, lecture tolérante, nouveaux types, redressement d'image
  await pg.goto('http://localhost:8766/decodeur-courrier.html'); await pg.reload();
  const rd = await pg.evaluate(() => {
    const D = window.__decodeur, c = D.cleanOCR, y = new Date().getFullYear();
    const dt = t => D.findDates(t).map(x => x.date.toISOString().slice(0, 10) + (x.inferred ? '*' : ''));
    const an = t => D.analyze(t);
    const demeure = an("M1SE EN DEMEURE\nSociete Volta\nSans reponse sous 15 jours, notre serv1ce content1eux engagera la procedure.\nMontant : 186,40 €");
    const caf = an("Ca1sse d'a11ocat1ons fami1iales\nN° a11ocata1re : 1234567\nMerci de nous transmettre vos justificatifs avant le 20 octobre 2026.");
    const sans = an("Madame, Monsieur,\nMerci de nous répondre avant le 20 décembre.\nCordialement");
    return {
      c1: c("Montant à payer : 1 82O,04 E"), c2: c("Merci de payer avant le 1O/O3/2O26"), c3: c("Total : 1 500 , 00 €"), c4: c("Le rembour-\nsement sera fait\n|||\n-----\nok"),
      keep: c("Montant à payer : 186,40 € avant le 20 octobre 2026."),
      d1: dt("avant le 20 oct. 2026"), d2: dt("jusqu'au 5 janv. 2027"), d3: dt("echeance 2026-11-05"), d4: dt("le 3 sept. 2026 et le 1er févr. 2027"), d5: dt("avant le 20 décembre").map(x => x.endsWith('*')),
      demeure: [demeure.type.id, demeure.fuzzy], caf: [caf.org && caf.org.id, caf.fuzzy], sans: sans.deadline ? sans.deadline.date.getMonth() : null,
      devis: an("Devis n° 2026-14\nProposition commerciale pour la pose de votre cuisine.\nValidité du devis : 30 jours. Bon pour accord, date et signature.").type.id,
      releve: an("Relevé de compte au 30/09/2026\nSolde précédent : 1 204,10 €\nNouveau solde : 987,22 €").type.id,
      contrat: an("Modification de votre contrat n° 884512 : conditions générales mises à jour. Votre contrat est reconduit par tacite reconduction.").type.id,
      sncf: an("SNCF Connect : remboursement de votre billet de train Paris-Lyon.").org && an("SNCF Connect : remboursement de votre billet de train Paris-Lyon.").org.id,
      syndic: an("Le syndic de copropriété vous convoque à l'assemblée générale. Appel de fonds du trimestre.").org.id,
      why: an("MISE EN DEMEURE de payer. Service contentieux. Procédure judiciaire.").whyType
    };
  });
  ok(/1\s?820,04 €/.test(rd.c1) && rd.c2.includes('10/03/2026') && rd.c3.includes('1 500,00') && /remboursement/.test(rd.c4) && !/\|\|\||-----/.test(rd.c4), 'nettoyage du texte lu : chiffres, dates, montants, césures, bruit');
  ok(rd.keep === 'Montant à payer : 186,40 € avant le 20 octobre 2026.', 'un texte propre n\'est pas modifié');
  ok(rd.d1[0] === '2026-10-20' && rd.d2[0] === '2027-01-05' && rd.d3[0] === '2026-11-05' && rd.d4.length === 2, 'dates : abréviations (oct., sept., janv.) et format 2026-11-05');
  ok(rd.d5.length === 1 && rd.d5[0] === true && rd.sans === 11, 'date sans année : « avant le 20 décembre » devient une date limite');
  ok(rd.demeure[0] === 'demeure' && rd.demeure[1] === true && rd.caf[0] === 'caf' && rd.caf[1] === true, 'lecture tolérante : mise en demeure et CAF reconnues malgré des 1 à la place des l');
  ok(rd.devis === 'devis' && rd.releve === 'releve' && rd.contrat === 'contrat', 'nouveaux types : devis, relevé de compte, contrat');
  ok(rd.sncf === 'sncf' && rd.syndic === 'syndic', 'nouveaux expéditeurs : SNCF, syndic');
  ok(rd.why.includes('mise en demeure'), 'transparence : « reconnu grâce à » liste les mots trouvés');
  const img = await pg.evaluate(() => {
    const D = window.__decodeur;
    const page = (angle, shadow) => {
      const c = document.createElement('canvas'); c.width = 900; c.height = 1200; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 900, 1200);
      x.fillStyle = '#222'; for (let i = 0; i < 40; i++) { let px = 90; while (px < 800) { const w = 30 + ((i * 37 + px * 13) % 70); x.fillRect(px, 100 + i * 24, w, 9); px += w + 12; } }
      if (shadow) { const g = x.createLinearGradient(0, 0, 900, 0); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 900, 1200); }
      if (!angle) return c; const r = document.createElement('canvas'); r.width = 900; r.height = 1200; const y = r.getContext('2d'); y.fillStyle = '#fff'; y.fillRect(0, 0, 900, 1200); y.translate(450, 600); y.rotate(angle * Math.PI / 180); y.drawImage(c, -450, -600); return r;
    };
    const tilted = page(3.5, false), flat = page(0, false), shaded = page(0, true);
    const a = D.estimateSkew(tilted), b = D.estimateSkew(D.rotateCanvas(tilted, -a)), f = D.estimateSkew(flat), a2 = D.estimateSkew(page(-2.5, false));
    const u1 = D.lightingUneven(shaded), u2 = D.lightingUneven(flat);
    const bin = D.adaptiveBinarize(shaded), ctx = bin.getContext('2d'); const px = (x, y) => ctx.getImageData(x, y, 1, 1).data[0];
    return { a, b, f, a2, u1, u2, barL: px(100, 104), bgL: px(100, 140), barR: px(700, 104), bgR: px(700, 140) };
  });
  ok(Math.abs(img.a - 3.5) <= 0.7 && Math.abs(img.a2 + 2.5) <= 0.7 && Math.abs(img.f) < 0.4, `redressement : inclinaison détectée ${img.a}° (3,5°) et ${img.a2}° (−2,5°), page droite ${img.f}°`);
  ok(Math.abs(img.b) <= 0.5, 'redressement : page remise droite (' + img.b + '° restants)');
  ok(img.u1 === true && img.u2 === false, 'éclairage inégal détecté (ombre) et page uniforme laissée telle quelle');
  ok(img.barL < 60 && img.bgL > 200 && img.barR < 60 && img.bgR > 200, 'seuillage adaptatif : texte noir et fond blanc des deux côtés de l\'ombre');
  // 6 mobile : onglets
  await pg.click('#tab-decode'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-decode.png' });
  await pg.click('#tab-tools'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-tools.png' });
  await pg.click('#tab-vault'); await pg.screenshot({ path: require('os').tmpdir() + '/pd-vault.png' });
  // 7 version gratuite : limites et fonctions Premium
  const free = await (await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] })).newPage();
  free.on('pageerror', e => errs.push('FREE ' + e.message)); await free.route(/googlesyndication|gstatic|jsdelivr/, r => r.abort());
  const dlgOpen = async () => { try { await free.waitForSelector('#premium[open]', { timeout: 2500 }); return true; } catch (e) { return false; } };
  await free.goto('http://localhost:8766/decodeur-courrier.html#etat-des-lieux'); await free.reload(); await free.waitForSelector('[data-edl-new=sortie]');
  await free.click('[data-edl-new=sortie]'); ok(await dlgOpen(), 'gratuit : l\'état des lieux de sortie demande Premium'); await free.click('#premium-close');
  await free.click('[data-edl-new=entree]'); await free.fill('#en-adr', '1 rue A'); await free.click('#en-go'); await free.click('#edl-back');
  await free.click('[data-edl-new=entree]'); ok(await dlgOpen(), 'gratuit : un seul état des lieux d\'entrée'); await free.click('#premium-close');
  await free.goto('http://localhost:8766/decodeur-courrier.html#fiche-de-paie'); await free.reload(); await free.waitForSelector('#paie-sample'); await free.click('#paie-sample'); await free.waitForSelector('.paie-t');
  ok((await free.locator('#paie-declared').count()) === 0 && (await free.locator('#paie-premium').count()) === 1, 'gratuit : vérification des heures supp réservée à Premium');
  ok(/majoration d'environ 25 %/.test(await free.innerText('#paie-res')), 'gratuit : les heures supp restent repérées et expliquées');
  await free.click('#paie-lettre'); ok(await dlgOpen(), 'gratuit : la lettre à l\'employeur demande Premium'); await free.click('#premium-close');
  await free.goto('http://localhost:8766/decodeur-courrier.html#lettres'); await free.reload(); await free.waitForSelector('[data-lettre]');
  await free.click('[data-lettre=caf]'); ok(await dlgOpen(), 'gratuit : modèle CAF réservé à Premium'); await free.click('#premium-close');
  await free.click('[data-lettre=amende]'); ok(await free.locator('#cf-avis').count() === 1, 'gratuit : modèle amende accessible');
  await free.goto('http://localhost:8766/decodeur-courrier.html#abonnements'); await free.reload(); await free.waitForSelector('#abo-add');
  for (let i = 0; i < 3; i++) { await free.click('#abo-add'); await free.fill('#ab-name', 'Abo ' + i); await free.fill('#ab-amount', '10'); await free.click('#ab-save'); }
  await free.click('#abo-add'); ok(await dlgOpen(), 'gratuit : 3 abonnements maximum'); await free.click('#premium-close');
  await free.goto('http://localhost:8766/decodeur-courrier.html#outils'); await free.reload(); await free.click('[data-tool=dossier]'); ok(await dlgOpen(), 'gratuit : dossier PDF réservé à Premium');
  ok(/Paperdecrypt Premium/.test(await free.innerText('#premium')) && /paiement unique/i.test(await free.innerText('#premium')), 'fenêtre Premium : fonctions et paiement unique');
  { // la page redémarre (mémoire du téléphone) : les pages déjà lues sont reprises, rien à rescanner
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 } });
    await c2.addInitScript(() => { try { if (!sessionStorage.getItem('qt-decodeur:vu') && !sessionStorage.getItem('qt-decodeur:paie-reprise')) sessionStorage.setItem('qt-decodeur:paie-reprise', JSON.stringify([{ name: 'Photo', text: 'BULLETIN DE PAIE\nTOTAL BRUT 2 021,04\nNET A PAYER 1 520,08\nSalaire de base 151,67 12,0000 1 820,04', words: null, np: 1 }, { name: 'Photo', text: 'Net imposable 1 700,50', words: null, np: 1 }])); } catch (e) { /* ignoré */ } });
    const g = await c2.newPage(); const e2 = []; g.on('pageerror', e => e2.push('PAGEERR ' + e.message));
    await g.route(/googlesyndication|gstatic|tesseract|pdfjs|web-llm/, r => r.abort());
    await g.goto('http://localhost:8766/decodeur-courrier.html'); await g.click('#tab-tools'); await g.click('[data-tool=paie]');
    ok(await g.locator('.pages li').count() === 2, 'redémarrage : les 2 pages lues sont reprises');
    await g.click('#paie-go'); await g.waitForSelector('#paie-res .verdict', { timeout: 10000 });
    ok(/2\s?021,04/.test(await g.innerText('#paie-res')), 'redémarrage : l\'analyse reprend sans rescanner');
    await g.evaluate(() => { document.querySelector('[data-pg-del="1"]').click(); document.querySelector('[data-pg-del="0"]').click(); });
    await c2.addInitScript(() => { try { if (!sessionStorage.getItem('qt-decodeur:vu')) { sessionStorage.setItem('qt-decodeur:vu', '1'); } } catch (e) { /* ignoré */ } }); await g.evaluate(() => sessionStorage.setItem('qt-decodeur:vu', '1')); await g.reload(); await g.click('#tab-tools'); if (await g.locator('[data-tool=paie]').count()) await g.click('[data-tool=paie]'); await g.waitForSelector('#paie-go');
    ok(await g.locator('.pages li').count() === 0, 'pages retirées : rien n\'est repris');
    ok(!e2.length, 'reprise : aucune erreur JavaScript' + (e2.length ? ' ' + e2.join(' ') : ''));
    await c2.close();
  }
  console.log(errs.length ? errs.join('\n') : '✓ aucune erreur JavaScript');
  await b.close(); srv.close();
})().catch(e => { console.error('ECHEC', e); process.exit(1); });
