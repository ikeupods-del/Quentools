// Contrôle d'une fiche QuentInvest : structure, longueur, phrases, chiffres, conseils, mots difficiles.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { controler, nombres } = require('../fiche-quentinvest');

(async () => {
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const dossier = path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fiches');
  const fiche = n => JSON.parse(fs.readFileSync(path.join(dossier, n), 'utf8'));
  // les fiches de la chaîne sont fabricables et dépassent 5 minutes
  for (const n of fs.readdirSync(dossier).filter(x => /^\d\d-.*\.json$/.test(x))) { const r = controler(fiche(n)); check(`fiche ${n} : fabricable`, r.ok, r.erreurs.join(' | ')); }
  let r = controler(fiche('10-premier-krach-tulipomanie.json'), { lexique: { Goldgar: 'Golgar' } });
  check('longueur calculée (≈ 800 mots, plus de 5 min)', r.mots > 780 && r.secondes > 300, `${r.mots} mots ${r.secondes} s`);
  check('une description n\'est pas un conseil (« on n\'achète pas… »)', !r.avertissements.some(a => /conseil en investissement/.test(a)), r.avertissements.join(' | '));
  check('mots difficiles repérés, ceux du dictionnaire écartés', r.difficiles.includes('Provinces-Unies') && !r.difficiles.includes('Goldgar'), r.difficiles.join());
  // fiche incomplète et trop courte
  r = controler({ numero: 1, slug: 'x', titre: 'T', blocs: [{ texte: 'Un bloc.' }] });
  check('fiche incomplète : erreurs claires', !r.ok && r.erreurs.some(e => /incomplète/.test(e)) && r.erreurs.some(e => /Trop court/.test(e)) && r.erreurs.some(e => /Bloc 1/.test(e)), JSON.stringify(r.erreurs));
  // conseil, lien, chiffre sans source, phrase longue
  const base = fiche('10-premier-krach-tulipomanie.json');
  base.blocs[0].texte = 'Achète des tulipes maintenant, rendement garanti de 87 % : https://exemple.fr. ' + 'mot '.repeat(25) + '.';
  r = controler(base);
  check('ordre d\'acheter et gain garanti signalés', r.avertissements.filter(a => /conseil/.test(a)).length >= 1);
  check('lien signalé', r.avertissements.some(a => /aucun lien/.test(a)));
  check('chiffre sans source signalé', r.avertissements.some(a => /87/.test(a)));
  check('phrase trop longue signalée', r.avertissements.some(a => /phrase\(s\) de plus de 20 mots/.test(a)));
  check('lecture des nombres : 5 000 et 1,5', [...nombres('5 000 florins et 1,5 % en 1637, 3 erreurs')].sort().join() === '1.5,1637,5000');
  // brouillon : sujet → article Wikipédia (faux serveur) → IA (faux) → fiche contrôlée
  const http = require('http'), { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  const EXTRAIT = '== Origines ==\nLa tulipe arrive aux Provinces-Unies en 1593. Elle devient un objet de prestige. Un bulbe rare se vend 5 000 florins alors qu\'un artisan gagne 300 florins par an. Les prix montent très vite en 1636. ' + 'Les marchands achètent des contrats pour des bulbes encore en terre. '.repeat(14) + '\n== Le krach ==\nEn février 1637, les prix s\'effondrent. Le commerce s\'arrête. Les historiens jugent le récit exagéré. ' + 'Peu de personnes ont perdu beaucoup d\'argent. '.repeat(12);
  const srv = http.createServer((req, res) => { const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams); res.setHeader('Content-Type', 'application/json');
    if (q.list === 'search') return res.end(JSON.stringify({ query: { search: [{ title: 'Tulipomanie', snippet: 'La tulipomanie' }] } }));
    if (q.prop === 'extracts') return res.end(JSON.stringify({ query: { pages: [{ title: 'Tulipomanie', extract: EXTRAIT }] } }));
    res.end('{}'); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const mock = `http://127.0.0.1:${srv.address().port}`;
  const iaF = { etat: () => ({ installee: true }), arreter: () => {}, ecrireScript: async a => ({ scenes: a.paragraphes.map(p => ({ section: p.section, texte: p.texte })) }) };
  const bins = await resolveFfmpeg(), racine = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-fiche-')), app = create({ port: 0, base: racine, ...bins, wiki: mock, commons: mock, ia: iaF }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const { id } = await (await fetch(U('/api/quentinvest/brouillon'), { method: 'POST', body: JSON.stringify({ sujet: 'La tulipomanie', numero: 12 }) })).json();
  let j; for (let k = 0; k < 60; k++) { await new Promise(x => setTimeout(x, 200)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) break; }
  check('brouillon : terminé sans erreur', j.done && !j.error, JSON.stringify(j).slice(0, 200));
  const bd = j.resultat && j.resultat.fiche;
  check('brouillon : fiche structurée (accroche, blocs, piège, résumé, sources)', bd && bd.numero === 12 && bd.slug === 'tulipomanie' && bd.blocs.length >= 8 && bd.piege.erreurs.length === 3 && /Wikipédia/.test(bd.sources[0]), JSON.stringify(bd).slice(0, 200));
  check('brouillon : chiffre choc pris dans les faits (300 → 5 000)', bd && bd.accroche.ecran.avant && bd.accroche.ecran.apres, JSON.stringify(bd && bd.accroche.ecran));
  check('brouillon : blocs de 40 mots au plus', bd && bd.blocs.every(b => b.texte.split(/\s+/).length <= 40));
  check('brouillon : fichier gardé et contrôle renvoyé', fs.existsSync(j.resultat.fichier) && j.resultat.controle && Array.isArray(j.resultat.controle.avertissements));
  const { blocsDe } = require('../fiche-ia'); check('blocs : jamais coupés au milieu d\'une phrase', blocsDe('Une phrase de huit mots ici. ' .repeat(8)).every(b => /\.$/.test(b)));
  const { sujetDe, pourAuto } = require('../fiche-ia');
  check('demande → sujet', sujetDe('fais une vidéo sur le krach de 2008') === 'le krach de 2008' && sujetDe('Fais-moi un épisode à propos de l’inflation.') === 'l’inflation' && sujetDe('La tulipomanie') === 'La tulipomanie', sujetDe('Fais-moi un épisode à propos de l’inflation.'));
  const au = pourAuto(bd, 'le krach de 2008');
  check('vidéo tout seul : titre tiré du sujet, rien « à définir » dans le texte dit', /^Le krach de 2008 :/.test(au.titre) && !/définir/.test(au.suite.texte) && !au.aCompleter && au.miniature.lignes.join(' ').includes('KRACH'), JSON.stringify([au.titre, au.suite, au.miniature]));
  { // script collé sans ligne vide entre les paragraphes, terminé par une fin « à la façon d'une vidéo »
    const FQ = require('../fiche-quentinvest');
    const t = 'Imagine un pays où tout le monde devient millionnaire en un an. C’est arrivé au Koweït en 1982.\nLe Souk Al-Manakh était une bourse parallèle. On y payait avec des chèques antidatés.\nPersonne n’avait l’argent. Tout le monde payait plus tard.\nLe trou atteint 94 milliards de dollars.\nCe krach reste une anomalie fascinante de l’histoire moderne.\nDis-moi en commentaire ce que tu aurais fait, active la cloche, c’était Pico, à la prochaine !';
    let f = null; try { f = FQ.ficheDepuisScript(t); } catch (e) { /* refusé */ }
    check('script sans ligne vide : une ligne finie = un paragraphe', f && f.blocs.length >= 3, f ? f.blocs.length : 'refusé');
    check('script : la fin « abonne-toi / la cloche » n’est pas dite deux fois', f && /anomalie/.test(f.resume.texte) && !JSON.stringify(f).includes('cloche'), f && f.resume.texte);
  }
  { // texte des écrans : jamais une phrase coupée au milieu ni « … »
    const { resumer, resumerDit, ficheDepuisScript } = require('../fiche-quentinvest');
    check('écran : énumération trop longue → « etc. »', resumer('Mieux : avec ton chèque en carton, ce même commerçant court s\'acheter une villa, des voitures de sport, des montres en or et des actions.', 90) === 'Mieux : avec ton chèque en carton, ce même commerçant court s\'acheter une villa, etc.');
    const r1 = resumer('Imagine un monde où tu signes un chèque d\'un million de dollars sans avoir un seul dinar sur ton compte en banque.', 50);
    check('écran : jamais « … » ni un petit mot en fin', !/…|\s(?:d'un|de|du|un|et|le|la)$/.test(r1) && r1.length <= 50 && r1.length > 20, r1);
    check('écran : coupé avant « et » plutôt qu\'au milieu', resumer('Tant que les prix montaient, tout le monde se croyait riche et personne ne voyait la catastrophe arriver doucement.', 90) === 'Tant que les prix montaient, tout le monde se croyait riche');
    check('écran : phrases entières gardées', resumer('Une phrase. Deux phrases ici. Trois phrases bien plus longues que les autres pour dépasser.', 30) === 'Une phrase. Deux phrases ici.');
    check('phrase dite : toujours terminée', /\.$/.test(resumerDit('Tant que les prix montaient, tout le monde se croyait riche et personne ne voyait rien venir du tout.', 60)));
    const fs2 = ficheDepuisScript('# Le souk\n\nImagine un monde où tu signes un chèque d\'un million de dollars sans avoir un seul dinar sur ton compte en banque ni aucune garantie. Mieux : avec ton chèque en carton, ce même commerçant court s\'acheter une villa, des voitures de sport, des montres en or et des actions.\n\nPersonne ne vérifiait les chèques. Tout le monde payait plus tard, avec des promesses.\n\nLe trou atteint 94 milliards de dollars.\n\nEn une phrase : une promesse n\'est pas de l\'argent.');
    const fx = { accroche: { ecran: { titre: 'Imagine un monde où tu signes un chèque d’un…' } }, blocs: [{ texte: 'Dit… tel quel…', ecran: { type: 'liste', titre: 'Trois idées et', points: ['Une villa, des…', 'Bien'] } }, { ecran: '=' }] };
    const nf = require('../fiche-quentinvest').finirEcrans(fx);
    check('dernier contrôle : écrans sans « … » ni petit mot final, texte dit inchangé', nf === 3 && fx.accroche.ecran.titre === 'Imagine un monde où tu signes un chèque' && fx.blocs[0].ecran.titre === 'Trois idées' && fx.blocs[0].ecran.points[0] === 'Une villa' && fx.blocs[0].texte === 'Dit… tel quel…', JSON.stringify(fx));
    check('fiche de ton script : aucun écran avec « … »', !/…/.test(JSON.stringify([fs2.accroche, fs2.blocs.map(b => b.ecran)])), JSON.stringify(fs2.blocs.map(b => b.ecran)).slice(0, 400));
  }
  app.stop(); srv.close(); fs.rmSync(racine, { recursive: true, force: true });
  console.log(`Fiches QuentInvest : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
