// Tableau des projets (ui-projets.js + routes-projets.js) dans un vrai navigateur : 3 projets (exporté puis modifié = périmé,
// exporté à jour, jamais exporté), chiffres, filtres et tri, vignette, « Ranger » (caches seulement), revoir, dupliquer, ouvrir, supprimer.
// Ignoré sans Chromium.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

function chromium() {
  if (process.env.QM_CHROMIUM && fs.existsSync(process.env.QM_CHROMIUM)) return process.env.QM_CHROMIUM;
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(racine).filter(x => /^chromium-\d+$/.test(x))) for (const sous of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) { const f = path.join(racine, d, sous); if (fs.existsSync(f)) return f; } } catch (e) { /* aucun */ }
  return null;
}
const liste = d => { try { return fs.readdirSync(d).sort(); } catch (e) { return []; } };

(async () => {
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { /* module absent */ }
  if (!exe || !pw) { console.log('Projets : ignoré (aucun Chromium disponible)'); return process.exit(0); }
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-pr-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  ff('-f', 'lavfi', '-i', 'testsrc=s=320x180:r=30:d=2', '-f', 'lavfi', '-i', 'sine=f=440:d=2', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'a.mp4'));
  ff('-f', 'lavfi', '-i', 'color=c=orange:s=320x180:d=1', '-frames:v', '1', path.join(base, 'photo.png'));
  for (const f of ['a.mp4', 'photo.png']) await fetch(U('/api/import?name=' + f), { method: 'POST', body: fs.readFileSync(path.join(base, f)) });
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept().catch(() => {}));
  await pg.addInitScript(() => { try { localStorage.setItem('qm:fond', 'non'); } catch (e) { /* aperçu de fond coupé : « Ranger » sans rendu en cours */ } });
  await pg.goto(U('/')); await pg.waitForTimeout(1000);
  const ev = (f, ...a) => pg.evaluate(f, ...a);
  const PR = path.join(base, 'projets'), EX = path.join(base, 'exports');

  // trois projets enregistrés (Alpha 16:9, Beta 9:16 de 2 clips, Gamma carré d'une photo de 5 s)
  await ev(async () => {
    await chargerMedias(); const v = medias.find(x => x.file === 'a.mp4'), im = medias.find(x => x.file === 'photo.png');
    const enr = async (n, format, clips) => { proj = { ...JSON.parse(PROJ0), format, clips }; await api('/api/projets/' + enc(n), { method: 'PUT', body: snap() }); };
    await enr('Alpha', 'horizontal', [newClip(v)]); await enr('Beta', 'vertical', [newClip(v), newClip(v)]);
    const g = newClip(im); g.dur = 5; await enr('Gamma', 'carre', [g]);
  });
  check('trois projets enregistrés', liste(PR).filter(n => n.endsWith('.qmovie')).length === 3, liste(PR).join(','));
  check('bouton « Projets » dans la barre du haut', await ev(() => !!$('#bProjets')));

  // export depuis l'écran « Exporter et publier » : le nom du projet ouvert est envoyé et retenu dans exports/index.json
  const exporterUI = async n => {
    await ev(async n => { await ouvrirProjetNomme(n); exporter(); }, n); await pg.waitForSelector('#publierV2 #xGo', { timeout: 5000 });
    await pg.click('[data-qv2="720"]'); await pg.click('#xGo'); await pg.waitForSelector('.pv2-fin', { timeout: 120000 });
    await ev(() => fermerPublierV2());
  };
  await exporterUI('Alpha'); await pg.waitForTimeout(30); await exporterUI('Beta');
  let idx = {}; try { idx = JSON.parse(fs.readFileSync(path.join(EX, 'index.json'), 'utf8')); } catch (e) { /* absent */ }
  check('lien export ↔ projet dans exports/index.json', Object.values(idx).filter(e => e.projet === 'Alpha').length === 1 && Object.values(idx).filter(e => e.projet === 'Beta').length === 1 && Object.values(idx).every(e => e.date && /^[0-9a-f]{40}$/.test(e.empreinteProjet)), JSON.stringify(idx));
  check('index.json absent de la liste des vidéos exportées', !((await (await fetch(U('/api/exports'))).json()).exports || []).some(x => x.nom === 'index.json'));
  // Alpha modifié puis enregistré (⌘S propose le nom du projet ouvert) : export périmé
  await ev(async () => { await ouvrirProjetNomme('Alpha'); proj.clips[0].out = 1.5; commit(); sauver(); }); await pg.waitForSelector('#saisie');
  check('⌘S propose le nom du projet ouvert', await ev(() => $('#saisie').value === 'Alpha'));
  await pg.click('#sOk'); await pg.waitForTimeout(300);
  check('copie .bak gardée à l’enregistrement', fs.existsSync(path.join(PR, 'Alpha.qmovie.bak')));

  // tableau
  await ev(() => ouvrirTableauProjets()); await pg.waitForSelector('.tp-carte');
  const chiffres = await ev(() => [...document.querySelectorAll('.tp-ch b')].map(x => x.textContent));
  check('chiffres : 3 projets, 2 avec un export, 1 périmé', chiffres[0] === '3' && chiffres[1] === '2' && chiffres[2] === '1', chiffres.join(' | '));
  check('place sur le disque affichée', /[0-9] (Ko|Mo|Go)/.test(chiffres[3] || ''), chiffres[3]);
  const etat = n => ev(n => { const c = document.querySelector(`.tp-carte[data-tp="${n}"] .tp-etat`); return c ? c.textContent : null; }, n);
  check('Alpha : périmé', await etat('Alpha') === 'Périmé', await etat('Alpha'));
  check('Beta : à jour', await etat('Beta') === 'À jour', await etat('Beta'));
  check('Gamma : aucun export', await etat('Gamma') === 'Aucun export', await etat('Gamma'));
  check('carte : format, durée et nombre de clips', await ev(() => { const t = document.querySelector('.tp-carte[data-tp="Beta"]').textContent; return /9:16/.test(t) && /0:04/.test(t) && /2 clips/.test(t) && /Vertical/.test(t); }));
  const ordre = () => ev(() => [...document.querySelectorAll('.tp-carte')].map(c => c.dataset.tp).join(','));
  check('tri par défaut : modifiés récemment', await ordre() === 'Alpha,Gamma,Beta', await ordre());
  await pg.selectOption('#tpTri', 'nom'); check('tri par nom', await ordre() === 'Alpha,Beta,Gamma', await ordre());
  await pg.selectOption('#tpTri', 'duree'); check('tri par durée', await ordre() === 'Gamma,Beta,Alpha', await ordre());
  await pg.selectOption('#tpFormat', 'carre'); check('filtre format carré', await ordre() === 'Gamma', await ordre());
  await pg.selectOption('#tpFormat', ''); await pg.selectOption('#tpEtat', 'aucun'); check('filtre « sans export »', await ordre() === 'Gamma', await ordre());
  await pg.selectOption('#tpEtat', 'ajour'); check('filtre « à jour »', await ordre() === 'Beta', await ordre());
  await pg.selectOption('#tpEtat', ''); await pg.check('#tpPerimes'); check('case « périmés seuls »', await ordre() === 'Alpha', await ordre());
  await pg.uncheck('#tpPerimes'); await pg.fill('#tpQ', 'bet'); check('recherche par nom', await ordre() === 'Beta', await ordre());
  await pg.fill('#tpQ', 'zzz'); check('recherche sans résultat : message', /Aucun projet ne correspond/.test(await ev(() => $('#tpGrille').textContent)));
  await pg.fill('#tpQ', ''); await pg.selectOption('#tpTri', 'recent');
  await pg.waitForFunction(() => { const i = document.querySelector('.tp-carte[data-tp="Alpha"] img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
  check('vignette du premier clip chargée', await ev(() => { const i = document.querySelector('.tp-carte[data-tp="Alpha"] img'); return !!i && i.naturalWidth > 0 && /\/api\/frame\?file=a\.mp4/.test(i.src); }));
  if (process.env.QM_CAPTURE) await pg.screenshot({ path: process.env.QM_CAPTURE });

  // Ranger : caches factices supprimés, projets, médias et exports intacts
  const factices = [['.cache-rendu', 'clip.mp4'], ['.tmp/proxies', 'lecture.mp4'], ['cache-vignettes', 'v.jpg'], ['.cache-timeline', 'img']].map(([d, n]) => { fs.mkdirSync(path.join(base, d), { recursive: true }); const f = path.join(base, d, n); fs.writeFileSync(f, Buffer.alloc(400000)); return f; });
  const avant = { pr: liste(PR), me: liste(path.join(base, 'medias')), ex: liste(EX) };
  await pg.click('#tpRanger'); await pg.waitForSelector('.tp-gain', { timeout: 10000 });
  check('Ranger : caches factices supprimés', factices.every(f => !fs.existsSync(f)), factices.filter(f => fs.existsSync(f)).join(','));
  check('Ranger : place gagnée affichée', /libérés/.test(await ev(() => $('.tp-gain').textContent)), await ev(() => $('.tp-gain').textContent));
  check('Ranger : projets, médias et exports intacts', JSON.stringify(avant) === JSON.stringify({ pr: liste(PR), me: liste(path.join(base, 'medias')), ex: liste(EX) }));

  // revoir le dernier export image par image
  await pg.click('.tp-carte[data-tp="Beta"] [data-tpa="revoir"]'); await pg.waitForSelector('#rvSrc');
  const expBeta = Object.entries(idx).find(([, e]) => e.projet === 'Beta')[0];
  check('Revoir : dernier export du projet ouvert en revue', await ev(() => $('#rvSrc').value) === expBeta, await ev(() => $('#rvSrc').value) + ' ≠ ' + expBeta);
  check('Revoir : fenêtre du tableau remplacée proprement', await ev(() => !$('#boite').classList.contains('tp-boite')));
  check('Revoir désactivé sans export', await ev(async () => { await ouvrirTableauProjets(); return document.querySelector('.tp-carte[data-tp="Gamma"] [data-tpa="revoir"]').disabled; }));

  // dupliquer
  await pg.click('.tp-carte[data-tp="Gamma"] [data-tpa="dupliquer"]'); await pg.waitForSelector('.tp-carte[data-tp="Gamma (copie)"]', { timeout: 5000 }).catch(() => {});
  check('Dupliquer : copie créée et listée', fs.existsSync(path.join(PR, 'Gamma (copie).qmovie')) && await ev(() => !!document.querySelector('.tp-carte[data-tp="Gamma (copie)"]')));
  check('Dupliquer : 4 projets comptés', await ev(() => $('.tp-ch b').textContent) === '4');

  // ouvrir
  await pg.click('.tp-carte[data-tp="Beta"] .tp-actions [data-tpa="ouvrir"]'); await pg.waitForTimeout(400);
  check('Ouvrir : projet chargé, fenêtre fermée', await ev(() => projetCourant === 'Beta' && proj.clips.length === 2 && proj.format === 'vertical' && !$('#modal').classList.contains('on')));

  // supprimer (le projet et sa copie .bak, jamais les exports)
  const exAvant = liste(EX);
  await pg.keyboard.press('Control+Shift+O'); await pg.waitForSelector('.tp-carte', { timeout: 5000 }).catch(() => {});
  check('⇧⌘O ouvre le tableau', await ev(() => !!document.querySelector('.tp-carte')));
  await pg.click('.tp-carte[data-tp="Alpha"] [data-tpa="supprimer"]'); await pg.waitForTimeout(500);
  check('Supprimer : fichier et .bak retirés', !fs.existsSync(path.join(PR, 'Alpha.qmovie')) && !fs.existsSync(path.join(PR, 'Alpha.qmovie.bak')));
  check('Supprimer : carte retirée du tableau', await ev(() => !document.querySelector('.tp-carte[data-tp="Alpha"]') && $('.tp-ch b').textContent === '3'));
  check('Supprimer : exports gardés', JSON.stringify(exAvant) === JSON.stringify(liste(EX)));
  check('nom de projet hors du dossier refusé', (await fetch(U('/api/tableau-projets/supprimer'), { method: 'POST', body: JSON.stringify({ nom: '../reglages' }) })).status === 404);

  // accès depuis l'accueil (la fenêtre s'ouvre par-dessus, l'accueil reste)
  await ev(() => { fermer(); afficherAccueil(); }); await pg.waitForSelector('[data-acc="projets"]');
  await pg.click('[data-acc="projets"]'); await pg.waitForSelector('.tp-carte', { timeout: 5000 }).catch(() => {});
  check('accueil : bouton « Tableau des projets »', await ev(() => !!document.querySelector('.tp-carte') && !!$('#accueil')));
  await ev(() => fermer());
  check('aucune erreur dans la page', !errs.length, errs.join(' | '));
  await b.close(); app.stop && app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Projets : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
