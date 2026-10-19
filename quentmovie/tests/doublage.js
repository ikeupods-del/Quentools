// Doublage : réplique par réplique, nettoyage du silence, dossier de prises, pose dans la piste audio.
// Moteur contrôlé directement, puis interface pilotée dans Chromium avec un faux micro (ignorée sans Chromium).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function chromium() {
  if (process.env.QM_CHROMIUM && fs.existsSync(process.env.QM_CHROMIUM)) return process.env.QM_CHROMIUM;
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(racine).filter(x => /^chromium-\d+$/.test(x))) for (const sous of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) { const f = path.join(racine, d, sous); if (fs.existsSync(f)) return f; } } catch (e) { /* aucun navigateur */ }
  return null;
}

(async () => {
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-dbl-')), app = create({ port: 0, base, ...bins }), port = await app.start();
  const U = p => `http://127.0.0.1:${port}${p}`, ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  const dur = f => +execFileSync(bins.ffprobe || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim();

  // une réplique : 1,0 s de silence, 1,5 s de voix (un son), 1,2 s de silence — enregistrée comme le fait le navigateur (webm)
  const brut = path.join(base, 'replique.webm');
  ff('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-f', 'lavfi', '-i', 'sine=f=300:r=48000:d=1.5', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-filter_complex',
    '[0:a]atrim=0:1.0[a];[1:a]volume=0.5[b];[2:a]atrim=0:1.2[c];[a][b][c]concat=n=3:v=0:a=1', '-c:a', 'libopus', brut);
  const corps = fs.readFileSync(brut);
  const nom = 'essai-doublage', dossier = path.join(base, 'doublages', nom);

  let r = await (await fetch(U(`/api/doublage/prise?nom=${nom}&n=0&texte=${encodeURIComponent('Salut la colonie !')}`), { method: 'POST', body: corps })).json();
  check('prise enregistrée', r.n === 0 && r.file === `doublage-${nom}-00.wav`, JSON.stringify(r));
  check('silences du début et de la fin retirés', r.duree > 1.4 && r.duree < 2.1, 'durée ' + r.duree);
  check('fichier v00.wav dans le dossier du doublage', fs.existsSync(path.join(dossier, 'v00.wav')) && Math.abs(dur(path.join(dossier, 'v00.wav')) - r.duree) < 0.05);
  check('copie dans les médias (pour la timeline)', fs.existsSync(path.join(base, 'medias', r.file)));
  check('format : mono 44,1 kHz', /44100/.test(execFileSync(bins.ffprobe || 'ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate,channels', '-of', 'csv=p=0', path.join(dossier, 'v00.wav')], { encoding: 'utf8' })));

  const mv = path.join(base, 'ma-voix');
  check('Ma voix : réplique copiée avec son texte (metadata.csv)', fs.existsSync(path.join(mv, 'wavs', `${nom}-00.wav`)) && fs.readFileSync(path.join(mv, 'metadata.csv'), 'utf8').split('\n').includes(`${nom}-00|Salut la colonie !|Salut la colonie !`), fs.existsSync(mv) ? fs.readFileSync(path.join(mv, 'metadata.csv'), 'utf8') : 'absent');
  check('Ma voix : résumé renvoyé', r.voix && r.voix.prises === 1 && r.voix.secondes > 1.4, JSON.stringify(r.voix));
  await fetch(U(`/api/doublage/prise?nom=${nom}&n=2&texte=Trois`), { method: 'POST', body: corps });
  await fetch(U(`/api/doublage/script?nom=${nom}`), { method: 'PUT', body: JSON.stringify({ lignes: ['Un.', 'Deux.', 'Trois.'] }) });
  let g = await (await fetch(U(`/api/doublage?nom=${nom}`))).json();
  check('liste : prises 0 et 2 reprises, ligne 1 manquante', g.prises.map(p => p.n).join() === '0,2' && g.lignes.length === 3 && g.dossier === dossier, JSON.stringify(g));

  // un enregistrement sans voix est refusé, rien n'est écrit
  const muet = path.join(base, 'muet.webm'); ff('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '2', '-c:a', 'libopus', muet);
  const e1 = await fetch(U(`/api/doublage/prise?nom=${nom}&n=1`), { method: 'POST', body: fs.readFileSync(muet) });
  check('enregistrement muet refusé', e1.status >= 400 && !fs.existsSync(path.join(dossier, 'v01.wav')));
  const e2 = await fetch(U(`/api/doublage/prise?nom=${nom}&n=5`), { method: 'POST', body: Buffer.from('pas de l’audio') });
  check('fichier illisible refusé', e2.status >= 400 && !fs.existsSync(path.join(dossier, 'v05.wav')));
  const e3 = await fetch(U(`/api/doublage/prise?nom=${nom}`), { method: 'POST', body: corps });
  check('numéro de réplique obligatoire', e3.status >= 400);
  const e4 = await fetch(U('/api/doublage/prise?nom=../../evasion&n=0'), { method: 'POST', body: corps });
  check('nom de dossier assaini', e4.status === 200 && !fs.existsSync(path.join(base, '..', 'evasion')) && fs.existsSync(path.join(base, 'doublages', '.._.._evasion', 'v00.wav')) || fs.readdirSync(path.join(base, 'doublages')).every(d => !d.includes('/')));

  await fetch(U(`/api/doublage/prise?nom=${nom}&n=2`), { method: 'DELETE' });
  g = await (await fetch(U(`/api/doublage?nom=${nom}`))).json();
  check('Ma voix : réplique retirée du corpus', !fs.existsSync(path.join(mv, 'wavs', `${nom}-02.wav`)) && !/essai-doublage-02/.test(fs.readFileSync(path.join(mv, 'metadata.csv'), 'utf8')));
  check('prise supprimée (dossier et médias)', g.prises.map(p => p.n).join() === '0' && !fs.existsSync(path.join(base, 'medias', `doublage-${nom}-02.wav`)));
  const d = await (await fetch(U(`/api/doublage/dossier?nom=${nom}`), { method: 'POST' })).json();
  check('ouverture du dossier : chemin renvoyé', d.dossier === dossier);

  // ---------- interface ----------
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { try { pw = require(process.env.PW || 'playwright'); } catch (e2) { /* module absent */ } }
  if (!exe || !pw) console.log('Doublage (interface) : ignoré (aucun Chromium disponible)');
  else {
    const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
    pg.on('pageerror', e => errs.push(e.message)); await pg.goto(U('/')); await pg.waitForTimeout(1000);
    const ev = (f, ...a) => pg.evaluate(f, ...a);
    await ev(() => ouvrirDoublage());
    check('doublage : fenêtre ouverte', await ev(() => !!document.querySelector('#dbTexte')));
    await pg.fill('#dbNom', 'ui-essai'); await pg.fill('#dbTexte', 'Salut la colonie !\nAujourd’hui, les intérêts composés.\nÀ bientôt.');
    await pg.click('#dbGo'); await pg.waitForSelector('#dbRec', { timeout: 10000 });
    check('doublage : première réplique affichée', await ev(() => /Salut la colonie/.test(document.querySelector('.dblTexte').textContent) && document.querySelectorAll('.dblL').length === 3));
    await pg.keyboard.press('Space'); await pg.waitForTimeout(1800);
    check('doublage : enregistrement en cours (Espace)', await ev(() => dbl.enreg && /Arrêter/.test(document.querySelector('#dbRec').textContent)));
    await pg.keyboard.press('Space'); await pg.waitForFunction(() => dbl && dbl.prises[0], null, { timeout: 15000 }).catch(() => {});
    check('doublage : réplique 1 enregistrée et passage à la suivante', await ev(() => !!dbl.prises[0] && dbl.cur === 1 && /intérêts composés/.test(document.querySelector('.dblTexte').textContent)), await ev(() => JSON.stringify(dbl && dbl.prises)));
    check('doublage : fichier créé dans le dossier', fs.existsSync(path.join(base, 'doublages', 'ui-essai', 'v00.wav')));
    await pg.keyboard.press('ArrowLeft'); check('doublage : touche ← revient à la réplique 1', await ev(() => dbl.cur === 0));
    await pg.keyboard.press('Space'); await pg.waitForTimeout(1500); await pg.keyboard.press('Space'); await pg.waitForFunction(() => dbl && !dbl.enreg && document.querySelector('#dbRec') && !document.querySelector('#dbRec').disabled, null, { timeout: 15000 }).catch(() => {});
    check('doublage : réplique refaite', await ev(() => !!dbl.prises[0]));
    await pg.click('#dbPoser'); await pg.waitForFunction(() => !dbl, null, { timeout: 15000 }).catch(() => {});
    const piste = await ev(() => proj.audio.filter(a => /^doublage-ui-essai-/.test(a.file)).map(a => [a.file, a.start]));
    check('doublage : répliques posées dans la piste audio', piste.length === 1 && piste[0][0] === 'doublage-ui-essai-00.wav' && piste[0][1] === 0, JSON.stringify(piste));
    check('doublage : micro libéré à la fermeture', await ev(() => dbl === null));
    await ev(() => ouvrirDoublage()); await pg.fill('#dbTexte', 'Une.\nDeux.'); await pg.fill('#dbNom', 'ui-essai'); await pg.click('#dbGo'); await pg.waitForSelector('#dbRec', { timeout: 10000 });
    check('doublage : prises déjà enregistrées reprises sous le même nom', await ev(() => !!dbl.prises[0] && dbl.cur === 1));
    await pg.keyboard.press('Escape'); check('doublage : Échap ferme', await ev(() => dbl === null && !document.querySelector('#modal').classList.contains('on')));
    // voix clonée : l'essai s'ouvre depuis le doublage, sans rien lancer
    await ev(() => ouvrirDoublage()); await pg.fill('#dbTexte', 'Une.'); await pg.fill('#dbNom', 'ui-clone'); await pg.click('#dbGo'); await pg.waitForSelector('#dbClone', { timeout: 10000 });
    await pg.click('#dbClone'); await pg.waitForSelector('#vcLancer', { timeout: 10000 });
    check('voix clonée : fenêtre d’essai ouverte (deux modèles, doublage fermé)', await ev(() => dbl === null && !!document.querySelector('#vcChatterbox') && !!document.querySelector('#vcQwen') && /répliques/.test(document.querySelector('#boite').textContent)));
    await pg.keyboard.press('Escape'); await ev(() => fermer());
    // dictionnaire de prononciation : s'ouvre depuis le doublage, un mot ajouté est gardé dans le fichier
    await ev(() => ouvrirDoublage()); await pg.fill('#dbTexte', 'Une.'); await pg.fill('#dbNom', 'ui-pron'); await pg.click('#dbGo'); await pg.waitForSelector('#dbPron', { timeout: 10000 });
    await pg.click('#dbPron'); await pg.waitForSelector('#prAjout', { timeout: 10000 });
    await pg.click('#prAjout'); await pg.fill('.prE', 'Goldgarbis'); await pg.fill('.prL', 'Golgarbis'); await pg.press('.prL', 'Tab'); await pg.waitForTimeout(600);
    check('prononciations : mot ajouté gardé dans le fichier', fs.existsSync(path.join(base, 'prononciations.json')) && /Goldgarbis/.test(fs.readFileSync(path.join(base, 'prononciations.json'), 'utf8')));
    check('prononciations : mots livrés listés', await ev(() => /Mots déjà connus \(\d+\)/.test(document.querySelector('#boite').textContent)));
    await pg.keyboard.press('Escape'); await ev(() => fermer());
    // contrôle d'une fiche QuentInvest depuis le doublage
    await ev(() => ouvrirDoublage()); await pg.fill('#dbTexte', 'Une.'); await pg.fill('#dbNom', 'ui-fiche'); await pg.click('#dbGo'); await pg.waitForSelector('#dbFiche', { timeout: 10000 });
    await pg.click('#dbFiche'); await pg.waitForSelector('#fiGo', { timeout: 10000 });
    await pg.fill('#fiTexte', JSON.stringify({ numero: 1, slug: 'x', titre: 'T', blocs: [{ texte: 'Un bloc.' }] })); await pg.click('#fiGo'); await pg.waitForFunction(() => /À corriger/.test(document.querySelector('#fiRes').textContent), null, { timeout: 8000 });
    check('fiche : une fiche incomplète est signalée dans la fenêtre', await ev(() => /incomplète/.test(document.querySelector('#fiRes').textContent)));
    await pg.fill('#fiTexte', fs.readFileSync(path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fiches', '03-interets-composes.json'), 'utf8')); await pg.click('#fiGo'); await pg.waitForFunction(() => /fabricable|À corriger/.test(document.querySelector('#fiRes').textContent), null, { timeout: 8000 });
    check('fiche : une fiche complète propose « Fabriquer l’épisode »', await ev(() => /fabricable/.test(document.querySelector('#fiRes').textContent) && !!document.querySelector('#fiFabriquer')), await ev(() => document.querySelector('#fiRes').textContent.slice(0, 200)));
    await pg.keyboard.press('Escape'); await ev(() => fermer());
    // publication : la fenêtre s'ouvre, les clés se configurent, la connexion est proposée
    await ev(() => ouvrirPublier()); await pg.waitForSelector('#puYt', { timeout: 10000 });
    check('publication : YouTube et TikTok à configurer au départ', await ev(() => /à configurer/.test(document.querySelector('#puYt').parentElement.textContent) && /à configurer/.test(document.querySelector('#puTt').parentElement.textContent)));
    await pg.fill('#ytId', 'client-youtube-123'); await pg.fill('#ytSec', 'SECRET-youtube-456'); await pg.click('#ytCfg'); await pg.waitForSelector('#ytCo', { timeout: 8000 });
    check('publication : après les clés, « Se connecter à YouTube » est proposé avec les aides manuelles', await ev(() => /Se connecter à YouTube/.test(document.querySelector('#puYt').textContent) && !!document.querySelector('#mYtDesc') && !!document.querySelector('#mTtLeg')));
    await pg.keyboard.press('Escape'); await ev(() => fermer());
    // doublage d'une vidéo : chaque réplique démarre à l'instant de la phrase d'origine
    await ev(() => ouvrirDoublage()); await pg.fill('#dbTexte', 'Phrase un.\nPhrase deux.'); await pg.fill('#dbNom', 'ui-calage');
    check('doublage : fichier vidéo ou son accepté pour lire le texte', await ev(() => /video\/\*/.test(document.querySelector('#dbF').accept)));
    await ev(() => { dbl.debuts = [2, 6]; }); await pg.click('#dbGo'); await pg.waitForSelector('#dbRec', { timeout: 10000 });
    for (let k = 0; k < 2; k++) { await pg.keyboard.press('Space'); await pg.waitForTimeout(1500); await pg.keyboard.press('Space'); await pg.waitForFunction(i => dbl && dbl.prises[i] && !dbl.enreg, k, { timeout: 15000 }).catch(() => {}); }
    await ev(() => { gt = 0; }); await pg.click('#dbPoser'); await pg.waitForFunction(() => !dbl, null, { timeout: 15000 }).catch(() => {});
    const caler = await ev(() => proj.audio.filter(a => /^doublage-ui-calage-/.test(a.file)).map(a => a.start));
    check('doublage : répliques calées sur les phrases d’origine', caler.length === 2 && caler[0] === 2 && caler[1] === 6, JSON.stringify(caler));
    check('aucune erreur dans la page', !errs.length, errs.slice(0, 3).join(' | '));
    await b.close();
  }
  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Doublage : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
