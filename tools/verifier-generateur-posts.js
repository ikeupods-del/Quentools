/* Contrôle de Studio Posts (marketing/generateur-posts/) : node tools/verifier-generateur-posts.js [--captures dossier]
   Ouvre la page depuis le disque (comme le propriétaire), vérifie : aucune erreur, chaque modèle des deux marques tient
   dans les trois formats, la bibliothèque s'affiche, l'export ZIP contient les bonnes images à la bonne taille,
   les alertes de contenu QuenTools (prix, lien) se déclenchent. Nécessite Playwright (voir tools/audit-express.js). */
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const page = path.join(__dirname, '..', 'marketing', 'generateur-posts', 'index.html');
const iCapt = process.argv.indexOf('--captures'), captures = iCapt > 0 ? process.argv[iCapt + 1] : null;
let erreurs = 0;
const ko = m => { erreurs++; console.log('ÉCHEC', m); }, ok = m => console.log('ok', m);

// lit un ZIP sans compression : [{ nom, data }]
function lireZip(buf) {
  const out = []; let o = 0;
  while (buf.readUInt32LE(o) === 0x04034b50) {
    const n = buf.readUInt32LE(o + 18), ln = buf.readUInt16LE(o + 26), lx = buf.readUInt16LE(o + 28);
    const nom = buf.slice(o + 30, o + 30 + ln).toString('utf8'), deb = o + 30 + ln + lx;
    out.push({ nom, data: buf.slice(deb, deb + n) }); o = deb + n;
  }
  return out;
}
// dimensions d'un JPEG (marqueur SOF)
function tailleJpg(b) {
  let o = 2;
  while (o < b.length) { const m = b[o + 1], l = b.readUInt16BE(o + 2); if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(o + 5), w: b.readUInt16BE(o + 7) }; o += 2 + l; }
  return null;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => ko('erreur JavaScript : ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') ko('console : ' + m.text()); });
  await pg.goto('file://' + page);
  await pg.waitForFunction(() => window.studio, null, { timeout: 15000 });
  ok('page ouverte, polices chargées');

  // 1. chaque modèle, chaque format : rien ne déborde
  const res = await pg.evaluate(() => {
    const out = [];
    for (const marque of ['parvis', 'quentools']) for (const m of studio.MODELES[marque]) for (const format of ['45', '11', '916']) {
      const p = { ...m, marque, format, points: true };
      p.slides.forEach((s, i) => { const r = studio.rendre(p, i); if (r.trop) out.push(`${marque} « ${m.nom} » ${format} image ${i + 1}`); });
    }
    return out;
  });
  res.length ? res.forEach(r => ko('texte trop long : ' + r)) : ok('modèles : tout tient dans les 3 formats');

  // 2. bibliothèque : chaque publication tient en 4:5 (format d'origine)
  const biblio = await pg.evaluate(() => {
    const out = [], n = { parvis: 0, quentools: 0 };
    for (const [marque, l] of Object.entries(window.BIBLIOTHEQUE)) for (const p of l) { n[marque]++; p.slides.forEach((s, i) => { if (studio.rendre({ ...p, format: '45' }, i).trop) out.push(`${p.nom} image ${i + 1}`); }); }
    return { out, n };
  });
  biblio.out.length ? biblio.out.forEach(r => ko('bibliothèque, texte trop long : ' + r)) : ok(`bibliothèque : ${biblio.n.parvis} Parvis + ${biblio.n.quentools} QuenTools tiennent en 4:5`);

  // 3. parcours réel : modèle QuenTools 5 images, format 9:16, export ZIP
  await pg.click('#bNouveau'); await pg.click('#mOnglets button[data-o=quentools]');
  await pg.click('#mGrille .carte >> nth=0');
  const nb = await pg.locator('#liste .vignette').count();
  nb === 5 ? ok('modèle QuenTools ouvert (5 images)') : ko('modèle QuenTools : ' + nb + ' images');
  await pg.selectOption('#format', '916');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#bZip')]);
  const fz = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-')), 'c.zip'); await dl.saveAs(fz);
  const z = lireZip(fs.readFileSync(fz)), jpgs = z.filter(f => f.nom.endsWith('.jpg'));
  const tailles = jpgs.map(f => tailleJpg(f.data));
  jpgs.length === 5 && tailles.every(t => t && t.w === 1080 && t.h === 1920) && z.some(f => f.nom === 'legende.txt')
    ? ok('export ZIP : 5 images 1080×1920 + légende') : ko('export ZIP : ' + JSON.stringify({ fichiers: z.map(f => f.nom), tailles }));
  if (!/^.+-9x16\.zip$/.test(dl.suggestedFilename())) ko('nom du ZIP : ' + dl.suggestedFilename());

  // 4. alerte de contenu QuenTools : prix et lien
  await pg.click('#liste .vignette >> nth=0');
  await pg.fill('#iChamps textarea >> nth=0', 'Un site à 299 € sur www.exemple.fr');
  const al = await pg.locator('#alertes').innerText();
  /prix/.test(al) && /lien/.test(al) ? ok('alertes prix et lien') : ko('alertes : ' + al);
  await pg.keyboard.press('Escape'); await pg.locator('body').click({ position: { x: 5, y: 880 } });
  await pg.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  const titre = await pg.evaluate(() => studio.projet.slides[0].titre);
  /299/.test(titre) ? ko('annuler (⌘Z) sans effet') : ok('annuler (⌘Z)');

  // 5. bascule de marque et export d'une image Parvis 4:5
  await pg.click('#marques button[data-marque=parvis]'); await pg.selectOption('#format', '45');
  const [dj] = await Promise.all([pg.waitForEvent('download'), pg.click('#bJpg')]);
  const fj = path.join(path.dirname(fz), 'i.jpg'); await dj.saveAs(fj);
  const tj = tailleJpg(fs.readFileSync(fj));
  tj && tj.w === 1080 && tj.h === 1350 ? ok('bascule Le Parvis + export JPG 1080×1350') : ko('export JPG : ' + JSON.stringify(tj));

  // 6. enregistrement : la publication est retrouvée après rechargement
  await pg.waitForTimeout(500); await pg.reload(); await pg.waitForFunction(() => window.studio);
  const apres = await pg.evaluate(() => studio.projet.marque + ' ' + studio.projet.slides.length);
  apres === 'parvis 5' ? ok('projet retrouvé après rechargement') : ko('rechargement : ' + apres);

  // captures pour relecture visuelle
  if (captures) {
    fs.mkdirSync(captures, { recursive: true });
    await pg.screenshot({ path: path.join(captures, 'interface.png') });
    const planches = await pg.evaluate(() => {
      const out = [];
      for (const marque of ['parvis', 'quentools']) studio.MODELES[marque].forEach((m, k) => ['45', '11', '916'].forEach(format => out.push({ nom: `${marque}-${k}-${format}`, url: studio.planche({ ...m, marque, format, points: true }) })));
      for (const [marque, l] of Object.entries(window.BIBLIOTHEQUE)) l.slice(0, 4).forEach((p, k) => out.push({ nom: `biblio-${marque}-${k}`, url: studio.planche({ ...p, format: '45', points: true }) }));
      return out;
    });
    for (const p of planches) fs.writeFileSync(path.join(captures, p.nom + '.png'), Buffer.from(p.url.split(',')[1], 'base64'));
    ok(`${planches.length} planches dans ${captures}`);
  }
  await b.close();
  console.log(erreurs ? `\n${erreurs} problème(s)` : '\nStudio Posts : tout est bon');
  process.exit(erreurs ? 1 : 0);
})();
