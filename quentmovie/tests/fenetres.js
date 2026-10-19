// Fenêtres et longs travaux dans un vrai navigateur (Chromium sans fenêtre) : un seul export à la fois, envoi gardé quand la fenêtre se ferme,
// résultat toujours signalé, AirDrop qui garde le fichier, date de programmation dans le futur, micro rendu, demande d'épisode confirmée.
// Les envois en ligne et les longs travaux sont simulés (réponses du moteur interceptées). Ignoré sans Chromium.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function chromium() {
  if (process.env.QM_CHROMIUM && fs.existsSync(process.env.QM_CHROMIUM)) return process.env.QM_CHROMIUM;
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(racine).filter(x => /^chromium-\d+$/.test(x))) for (const sous of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) { const f = path.join(racine, d, sous); if (fs.existsSync(f)) return f; } } catch (e) { /* pas de navigateur */ }
  return null;
}

(async () => {
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { /* module absent */ }
  if (!exe || !pw) { console.log('Fenêtres : ignoré (aucun Chromium disponible)'); return process.exit(0); }
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-fen-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=s=640x360:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'a.mp4')]);
  await fetch(U('/api/import?name=a.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'a.mp4')) });
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [], dialogues = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => { dialogues.push(d.message()); d.accept().catch(() => {}); });
  // réponses simulées du moteur : travaux « faux-… » (en cours tant que fini[id] n'est pas posé), comptes connectés, appels notés
  const fini = {}, appels = [], json = (r, o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  const EP = { nom: 'ep1', titre: 'Épisode essai', video: { youtube: 'ep1.mp4', tiktok: 'ep1-tiktok.mp4' }, tags: [], description: '', commentaire: '', legendeTikTok: '' };
  await pg.route(u => /^\/api\/(publier|publier\/montage|publier\/envoyer|exports\/retirer|partager|parole\/dictee|pico\/episode|pico\/refaire|quentinvest\/brouillon|quentinvest\/auto|animations\/rendre|job)$/.test(u.pathname), async r => {
    const u = new URL(r.request().url()), p = u.pathname; appels.push(p);
    if (p === '/api/publier') return json(r, { episodes: [EP], youtube: { configure: true, connecte: true }, tiktok: { configure: true, connecte: true }, racine: '', dossier: '' });
    if (p === '/api/publier/montage' || p === '/api/publier/envoyer') return json(r, { id: 'faux-envoi' });
    if (p === '/api/exports/retirer' || p === '/api/partager') return json(r, { ok: true });
    if (p === '/api/parole/dictee') return json(r, { id: 'faux-dictee' });
    if (p === '/api/pico/episode') return json(r, { base: 'ep1', titre: 'Épisode essai', scenes: [{ i: 0, texte: 'Bonjour Berkshire et merci', expr: 'neutre' }], expressions: ['neutre', 'content'], difficiles: ['Berkshire'], tiktok: false });
    if (p === '/api/pico/refaire') return json(r, { id: 'faux-refaire' });
    if (p === '/api/quentinvest/brouillon') return json(r, { id: 'faux-brouillon' });
    if (p === '/api/quentinvest/auto') return json(r, { error: 'essai : fabrication simulée' });
    if (p === '/api/animations/rendre') return json(r, { id: 'faux-anim' });
    const id = u.searchParams.get('id') || '';
    if (!id.startsWith('faux-')) return r.continue();
    if (!fini[id]) return json(r, { progress: 0.4, step: 'en cours' });
    return json(r, fini[id]);
  });
  await pg.goto(U('/')); await pg.waitForTimeout(1000);
  const ev = (f, ...a) => pg.evaluate(f, ...a), dort = ms => pg.waitForTimeout(ms), signalTexte = () => ev(() => ($('#signal') || {}).textContent || '');
  await ev(async () => { await chargerMedias(); proj.clips = [newClip(medias.find(x => x.file === 'a.mp4'))]; proj.res = 720; proj.sortie = 'mp4'; commit(); tout(); });

  // 1) demande d'épisode dans la discussion : sujet reconnu, rien lancé sans le clic
  check('épisode : « fais un épisode sur la bourse » reconnu', await ev(() => sujetPico('fais un épisode sur la bourse') === 'la bourse'));
  check('épisode : « fais une vidéo QuentInvest sur … » reconnu', await ev(() => sujetPico('Fais une vidéo QuentInvest sur le krach de 2008') === 'le krach de 2008'));
  check('épisode : « exporte la vidéo de Pico sur YouTube » n’est pas un sujet', await ev(() => sujetPico('exporte la vidéo de Pico sur YouTube') === '' && sujetPico('la vidéo de pico sur youtube') === ''));
  await ev(() => { ouvrirChat(); envoyerChat('fais un épisode sur la bourse'); }); await dort(200);
  check('épisode : proposé avec un bouton, sans ouvrir la fabrication', await ev(() => !$('#fiAuto') && /Fabriquer la vidéo sur « la bourse »/.test([...document.querySelectorAll('#chMsgs .ch-m.ia')].pop().textContent)));
  await pg.click('#chMsgs .ch-m.ia:last-child button.pri'); await pg.waitForFunction(() => /fabrication simulée/.test(($('#fiAutoRes') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
  check('épisode : le bouton ouvre la fenêtre avec le sujet et lance', await ev(() => $('#fiSujet') && $('#fiSujet').value === 'la bourse' && /fabrication simulée/.test($('#fiAutoRes').textContent)));
  check('épisode : l’erreur est aussi signalée', /fabrication simulée/.test(await signalTexte()));

  // 2) brouillon d'épisode : fenêtre fermée pendant le travail → pas d'erreur, résultat signalé
  await ev(() => { $('#fiSujet').value = 'la bourse'; $('#fiBrouillon').click(); }); await dort(300); await ev(() => fermer());
  fini['faux-brouillon'] = { done: true, progress: 1, resultat: { fiche: { numero: 1 }, article: 'Bourse', fichier: 'brouillon.json' } }; await dort(1300);
  check('fiche : fenêtre fermée pendant l’écriture, texte signalé', /Texte de l’épisode écrit/.test(await signalTexte()), await signalTexte());

  // 3) relecture : mots au clavier, fenêtre fermée pendant « Refaire »
  await ev(() => ouvrirRelecturePico('ep1')); await pg.waitForSelector('#rlListe .rlMot');
  check('relecture : mots atteignables au clavier', await ev(() => [...document.querySelectorAll('#rlListe .rlMot')].every(m => m.tabIndex === 0)));
  await pg.focus('#rlListe .rlMot.dur'); await pg.keyboard.press('Enter'); await pg.waitForSelector('.rlPron', { timeout: 5000 }).catch(() => {});
  check('relecture : Entrée sur un mot ouvre sa prononciation', await ev(() => !!document.querySelector('.rlPron') && /Berkshire/.test(document.querySelector('.rlPron').textContent)));
  await pg.selectOption('[data-expr="0"]', 'content'); await pg.click('#rlRefaire'); await dort(300); await ev(() => fermer());
  fini['faux-refaire'] = { done: true, progress: 1, resultat: { versions: ['YouTube'] } }; await dort(1300);
  check('relecture : fenêtre fermée pendant le travail, fin signalée', /mis à jour/.test(await signalTexte()), await signalTexte());

  // 4) doublage : une autre fenêtre ouverte par-dessus rend le micro, les touches ne le pilotent plus
  check('doublage : touches ignorées hors de sa fenêtre, micro rendu', await ev(() => { ouvrirDoublage(); const a = !!dbl; ouvrir('<p id="autre">autre</p>'); const r = dbl ? toucheDoublage(new KeyboardEvent('keydown', { key: ' ' })) : false; const fin = !dbl; fermer(); return a && r === false && fin; }));

  // 5) dictée : changer d'onglet arrête le micro sans envoyer
  await ev(() => ouvrirChat()); await pg.click('#chDictee'); await pg.waitForFunction(() => !!dicteeV2, null, { timeout: 5000 }).catch(() => {});
  const avecMicro = await ev(() => !!dicteeV2);
  await ev(() => panneauDroite('reglages')); await dort(300);
  check('dictée : arrêtée en quittant la discussion, rien envoyé', avecMicro && await ev(() => !dicteeV2 && !$('#chDictee').classList.contains('on')) && !appels.includes('/api/parole/dictee'));

  // 6) publier un épisode : date passée refusée, envoi gardé quand la fenêtre se ferme
  await ev(() => ouvrirPublier()); await pg.waitForSelector('#ytEnv');
  await ev(() => { $('#ytConf').value = 'prog'; $('#ytConf').onchange(); $('#ytDate').value = '2020-01-01T10:00'; $('#ytEnv').click(); });
  check('publier : date de programmation passée refusée', dialogues.some(d => /15 minutes/.test(d)) && !appels.includes('/api/publier/envoyer'));
  await ev(() => { $('#ytConf').value = 'private'; $('#ytEnv').click(); }); await dort(300);
  check('publier : envoi en cours mémorisé', await ev(() => !!envoiPublier && envoiPublier.episode === 'ep1'));
  await ev(() => fermer()); await dort(700); await ev(() => ouvrirPublier()); await pg.waitForSelector('#ytEnv');
  check('publier : fenêtre rouverte → avancement affiché, renvoi bloqué', await ev(() => $('#ytEnv').disabled && $('#ttEnv').disabled && /en cours/.test($('#puEtat').textContent)), await ev(() => $('#puEtat').textContent));
  await ev(() => fermer()); fini['faux-envoi'] = { done: true, progress: 1, resultat: { confidentialite: 'private', message: 'brouillon envoyé' } }; await dort(1000);
  check('publier : fin signalée fenêtre fermée, envoi libéré', /envoyé/.test(await signalTexte()) && await ev(() => !envoiPublier), await signalTexte());

  // 7) exporter et publier : un seul export, l'écran reste pendant l'export, AirDrop garde le fichier
  await ev(() => { pubV2.dest = { mac: false, youtube: true, tiktok: false, airdrop: true }; pubV2.vis = 'prog'; pubV2.date = '2020-01-01T10:00'; proj.publication = { titre: 'Essai', description: '', tags: '' }; exporter(); });
  await pg.waitForSelector('#publierV2 #xGo'); await dort(300);
  await ev(() => lancerPublierV2()); await dort(100);
  check('exporter : date de programmation passée refusée', /15 minutes/.test(await signalTexte()) && await ev(() => !exportEnCours));
  fini['faux-envoi'] = null; appels.length = 0;
  await ev(() => { pubV2.vis = 'private'; dessinerPublierV2(); lancerPublierV2(); }); await pg.waitForFunction(() => exportEnCours, null, { timeout: 5000 }).catch(() => {});
  check('exporter : export lancé', await ev(() => exportEnCours && !!$('#xStop')));
  await ev(() => { ouvrirChat(); exporter(); }); await dort(100);
  check('exporter : ⌘K et un second export laissent l’écran d’export', await ev(() => document.querySelectorAll('#publierV2').length === 1 && !!$('#xStop') && $('#etapes .on').dataset.etape === 'publier'));
  await pg.waitForFunction(() => /YouTube : en cours/.test(($('#xTxt') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
  check('exporter : l’envoi YouTube garde l’export en cours', await ev(() => exportEnCours));
  fini['faux-envoi'] = { done: true, progress: 1, resultat: { confidentialite: 'private' } };
  await pg.waitForSelector('.pv2-fin', { timeout: 20000 }).catch(() => {});
  check('exporter : terminé et signalé', await ev(() => !exportEnCours && /Exporté/.test(($('.pv2-fin') || {}).textContent || '')) && /Export terminé/.test(await signalTexte()));
  check('exporter : AirDrop coché → fichier gardé sur le Mac', appels.includes('/api/partager') && !appels.includes('/api/exports/retirer'), JSON.stringify(appels));
  await ev(() => fermerPublierV2());

  // 8) animations : un redessin pendant la fabrication garde « Poser » désactivé
  await ev(() => { proj.clips = [newClip(medias.find(x => x.file === 'a.mp4'))]; commit(); tout(); });
  await pg.click('#tabs button[data-tab="titres"]'); await pg.click('[data-sous-v2="animations"]'); await pg.waitForSelector('.anim-carte');
  await pg.click('[data-anim="bandeau"] [data-anim-poser]'); await dort(700); await ev(() => dessinerAnimations()); await dort(200);
  check('animations : redessin pendant la fabrication → « Poser » reste désactivé', await ev(() => { const c = document.querySelector('[data-anim="bandeau"]'); return c.querySelector('[data-anim-poser]').disabled && /Fabrication/.test(c.querySelector('.anim-etat').textContent); }));
  fini['faux-anim'] = { error: 'fin de l’essai' }; await dort(1000);
  check('animations : à la fin, « Poser » réactivé', await ev(() => !document.querySelector('[data-anim="bandeau"] [data-anim-poser]').disabled && animEnCours.size === 0));

  check('aucune erreur dans la page', !errs.length, errs.join(' | '));
  await b.close(); app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Fenêtres : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
