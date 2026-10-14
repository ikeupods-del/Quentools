#!/usr/bin/env node
/* Contrôle d'Infikit (infikit/) dans un navigateur, sur téléphone (390 px) :
   premier lancement, tournée fictive, création d'un patient, parcours des onglets, lien de démonstration (?demo),
   synchronisation Google désactivée (googleSync: false), aucune erreur JavaScript, pas de défilement horizontal.
   Usage : node tools/verifier-infikit.js   (PW=chemin de playwright si besoin) */
const fs = require('fs'), path = require('path'), http = require('http');
const racine = path.join(__dirname, '..');
const PW = [process.env.PW, '/opt/node-tools/node_modules/playwright', '/opt/node22/lib/node_modules/playwright', path.join(racine, 'wouf/node_modules/playwright')].find(p => p && fs.existsSync(p));
const { chromium } = require(PW || 'playwright');
const erreurs = [], ok = (c, m) => { if (!c) erreurs.push(m); };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/json' };
const serveur = http.createServer((q, s) => {
  let f = path.join(racine, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(racine) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
});
const fin = code => { if (erreurs.length) { console.error('✗ Infikit :\n - ' + erreurs.join('\n - ')); } else console.log('✓ Infikit : premier lancement, tournée, patients, démonstration et sécurité contrôlés.'); process.exit(erreurs.length ? 1 : code); };

(async () => {
  await new Promise(r => serveur.listen(0, r));
  const base = `http://localhost:${serveur.address().port}/infikit/`;
  const br = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push('erreur JavaScript : ' + e.message));
  p.on('dialog', d => d.accept());
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort()); // aucune ressource externe : le contrôle reste local
  const largeur = async nom => ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), nom + ' : défilement horizontal');

  // 1. Premier lancement : pas de connexion Google proposée
  await p.goto(base); await p.waitForTimeout(400);
  ok(await p.locator('text=Retrouver mes données avec Google').count() === 0, 'bouton Google affiché alors que la synchronisation Google est désactivée');
  await largeur('premier lancement');

  // 2. Tournée vide puis création d'un patient
  await p.fill('#obn', 'Contrôle'); await p.click('text=Commencer avec une tournée vide'); await p.waitForTimeout(300);
  ok((await p.textContent('#app')).includes('Pour commencer, 3 étapes'), 'tournée vide : étapes de démarrage absentes');
  await p.click('text=+ Ajouter un patient'); await p.waitForTimeout(200);
  await p.fill('#pp', 'Jeanne'); await p.fill('#pn', 'Test'); await p.fill('#pa', '1 rue Exemple, 69003 Lyon');
  await p.click('text=Créer la fiche'); await p.waitForTimeout(300);
  ok((await p.textContent('#app')).includes('Jeanne Test'), 'patient créé absent de la liste');
  await p.evaluate(() => closeSheet());
  await largeur('patient créé');

  // 3. Onglets
  for (const t of ['Patients', 'Cotation', 'Compta', 'Réglages', 'Tournée']) {
    await p.click(`nav >> text=${t}`).catch(() => p.click(`text=${t}`).catch(() => {}));
    await p.waitForTimeout(150);
    ok((await p.textContent('#app')).length > 50, `onglet ${t} vide`);
  }
  await largeur('onglets');

  // 4. Lien de démonstration : tournée fictive ouverte directement, sur un téléphone sans données
  const demoCtx = await br.newContext({ viewport: { width: 390, height: 844 } }); const demo = await demoCtx.newPage(); demo.on('pageerror', e => erreurs.push('erreur JavaScript (démonstration) : ' + e.message));
  await demo.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await demo.goto(base + '?demo'); await demo.waitForTimeout(400);
  ok((await demo.textContent('#app')).includes('Patients fictifs') || (await demo.textContent('#app')).includes('Mme Rose Dupuis'), 'lien ?demo : patients fictifs absents');
  await demoCtx.close();

  await br.close(); serveur.close();
  fin(0);
})().catch(e => { erreurs.push('contrôle interrompu : ' + e.message); fin(1); });
