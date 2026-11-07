'use strict';
/* Essai du jeu dans Chromium : ordinateur (souris, clavier) puis iPhone (toucher).
   node jeux/aube/outils/essai-navigateur.js [dossier-captures]
   Échoue si une erreur JavaScript apparaît ou si une étape ne se déroule pas comme prévu. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');

const racine = path.join(__dirname, '..');
const captures = process.argv[2] || null;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const serveur = http.createServer((req, res) => {
  const p = path.join(racine, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(racine) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

function attendu(ok, msg) { if (!ok) throw new Error('Échec : ' + msg); console.log('  ✓ ' + msg); }

async function finirTours(page, n, forcer) {
  for (let k = 0; k < n; k++) {
    await page.evaluate(f => finirTour(f), forcer);
    await page.waitForFunction(() => !UI.occupe, null, { timeout: 15000 });
    await page.evaluate(() => { if (!document.querySelector('#modale').hidden && !UI.ville) fermerModale(); });
  }
}

(async () => {
  await new Promise(r => serveur.listen(0, r));
  const url = `http://127.0.0.1:${serveur.address().port}/`;
  const navigateur = await chromium.launch();
  const erreurs = [];
  const ecoute = page => { page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); }); };
  const capture = async (page, nom) => { if (captures) { fs.mkdirSync(captures, { recursive: true }); await page.screenshot({ path: path.join(captures, nom + '.png') }); } };

  try {
    /* ---- Ordinateur ---- */
    console.log('Ordinateur (1440 × 900)');
    const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage(); ecoute(page);
    await page.goto(url);
    await page.waitForFunction(() => typeof G !== 'undefined' && G && UI.titre);
    await capture(page, '01-titre');
    await page.click('#b-nouvelle');
    await page.click('[data-nat="egyptiens"]');
    await page.click('[data-reg="taille:petite"]');
    await page.click('#b-commencer');
    attendu(await page.evaluate(() => !UI.titre && G.joueur === 0 && G.civs[0].id === 'egyptiens'), 'partie lancée avec la nation choisie');
    attendu(await page.isVisible('#modale'), 'message d’accueil affiché');
    await capture(page, '02-accueil');
    await page.click('#m-corps [data-act="fermer"]');
    await page.keyboard.press('Tab');
    attendu(await page.evaluate(() => selU() && selU().type === 'colon'), 'Tab sélectionne le colon');
    await page.keyboard.press('b');
    attendu(await page.evaluate(() => villesDe(0).length === 1 && UI.ville !== null), 'B fonde la capitale et ouvre la ville');
    await capture(page, '03-ville');
    await page.click('[data-item="u:guerrier"]');
    attendu(await page.evaluate(() => villesDe(0)[0].file[0].id === 'guerrier'), 'production choisie dans la fenêtre de la ville');
    await page.keyboard.press('Escape');
    await page.click('#b-sci');
    await capture(page, '04-technologies');
    await page.click('[data-tech="ecriture"]');
    attendu(await page.evaluate(() => G.civs[0].but === 'ecriture' && G.civs[0].rech === 'agriculture'), 'objectif lointain : la recherche passe par les prérequis');
    /* Déplacement de l'éclaireur à la souris. */
    const ok = await page.evaluate(() => {
      const u = unitesDe(0).find(x => x.type === 'eclaireur'); selectionner(u, false);
      const dest = [...R.surbrillance.atteint][0]; const p = centreTuile(dest);
      return { x: (p.x - R.cam.x) * R.cam.z, y: (p.y - R.cam.y) * R.cam.z, dest, id: u.id };
    });
    await page.mouse.move(ok.x, ok.y);
    await page.mouse.click(ok.x, ok.y);
    attendu(await page.evaluate(o => G.unites.find(u => u.id === o.id).i === o.dest, ok), 'clic sur une case : l’éclaireur y va');
    await finirTours(page, 25, true);
    attendu(await page.evaluate(() => G.tour >= 26 && !G.fin), '25 tours joués sans erreur');
    await page.evaluate(() => { const v = villesDe(0)[0]; if (v) centrerSur(v.i, false); });
    await page.waitForTimeout(200);
    await capture(page, '05-carte');
    await page.keyboard.press('d');
    await capture(page, '06-nations');
    await page.keyboard.press('Escape');
    await page.keyboard.press('p');
    await page.keyboard.press('Escape');
    /* Sauvegarde puis reprise. */
    const tour = await page.evaluate(() => G.tour);
    await page.reload();
    await page.waitForFunction(() => typeof G !== 'undefined' && UI.titre);
    attendu(await page.isVisible('#b-continuer'), 'bouton « Continuer » après rechargement');
    await page.click('#b-continuer');
    attendu(await page.evaluate(t => G.tour === t && G.joueur === 0, tour), 'partie reprise au même tour');
    await ctx.close();

    /* ---- iPhone ---- */
    console.log('iPhone 13 (toucher)');
    const ctxM = await navigateur.newContext({ ...devices['iPhone 13'] });
    const pm = await ctxM.newPage(); ecoute(pm);
    await pm.goto(url);
    await pm.waitForFunction(() => typeof G !== 'undefined' && G && UI.titre);
    await capture(pm, '11-titre-iphone');
    await pm.tap('#b-nouvelle');
    await pm.tap('[data-reg="taille:petite"]');
    await pm.tap('#b-commencer');
    await pm.tap('#m-corps [data-act="fermer"]');
    await pm.tap('#b-tour');
    attendu(await pm.evaluate(() => UI.sel !== null || !document.querySelector('#modale').hidden), 'le bouton du bas mène à la tâche suivante');
    await pm.evaluate(() => { if (!document.querySelector('#modale').hidden) fermerModale(); selectionner(unitesDe(0).find(u => u.type === 'colon'), true); });
    await pm.waitForTimeout(400);
    await capture(pm, '12-colon-iphone');
    await pm.tap('#unite [data-act="fonder"]');
    attendu(await pm.evaluate(() => villesDe(0).length === 1), 'fondation au toucher');
    await capture(pm, '13-ville-iphone');
    await pm.tap('[data-item="b:monument"]');
    await pm.waitForTimeout(300);
    /* Toucher deux fois une case pour déplacer le guerrier. */
    const cible = await pm.evaluate(() => {
      const u = unitesDe(0).find(x => x.type === 'guerrier'); selectionner(u, false); centrerSur(u.i, false);
      const dest = [...R.surbrillance.atteint].find(j => !OCC[j].length && !VIL[j]); const p = centreTuile(dest);
      return { x: (p.x - R.cam.x) * R.cam.z, y: (p.y - R.cam.y) * R.cam.z, dest, id: u.id };
    });
    await pm.touchscreen.tap(cible.x, cible.y);
    attendu(await pm.evaluate(o => UI.cible === o.dest && G.unites.find(u => u.id === o.id).i !== o.dest, cible), 'premier toucher : trajet prévu, sans bouger');
    await capture(pm, '14-trajet-iphone');
    await pm.touchscreen.tap(cible.x, cible.y);
    attendu(await pm.evaluate(o => G.unites.find(u => u.id === o.id).i === o.dest, cible), 'second toucher : le guerrier y va');
    await finirTours(pm, 15, true);
    await pm.evaluate(() => { const v = villesDe(0)[0]; if (v) centrerSur(v.i, false); });
    await pm.waitForTimeout(300);
    await capture(pm, '15-carte-iphone');
    await pm.evaluate(() => ouvrirTechs());
    await capture(pm, '16-technologies-iphone');
    const deborde = await pm.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    attendu(!deborde, 'aucun débordement horizontal sur téléphone');
    await ctxM.close();
  } finally {
    await navigateur.close();
    serveur.close();
  }
  if (erreurs.length) { console.error('Erreurs JavaScript :\n' + erreurs.join('\n')); process.exit(1); }
  console.log('Essai navigateur : tout est correct.');
})().catch(e => { console.error(e); serveur.close(); process.exit(1); });
