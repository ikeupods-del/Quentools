/* Contrôle des fonctions de Studio Sites (réservation, devis, assistant de questions, panel, WhatsApp, annonce, FAQ), de la direction artistique
   et du tchat : node tools/verifier-studio-sites-fonctions.js
   Les sites générés sont ouverts dans un navigateur ; Firebase est simulé (aucune connexion réelle). Nécessite Playwright (voir tools/audit-express.js). */
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const dossier = path.join(__dirname, '..', 'marketing', 'studio-sites'), modelesDir = path.join(dossier, 'modeles');
let erreurs = 0;
const ko = m => { erreurs++; console.log('ÉCHEC', m); }, ok = m => console.log('ok', m);
const verifie = (cond, bon, mauvais) => cond ? ok(bon) : ko(mauvais || bon);
const FICHE = { nom: 'Kebab Erkan', metier: 'restaurateur', ville: 'Lyon', zone: 'Lyon et alentours', telephone: '04 78 12 34 56', email: 'contact@erkan-lyon.fr', adresse: '8 rue de la Paix', codePostal: '69002', horaires: 'Du mardi au samedi, 11 h – 14 h et 18 h – 23 h', services: ['Kebab', 'Tacos', 'Panini'], atouts: 'Viande fraîche, pain maison', tarifs: '', ton: 'chaleureux', couleur: '', domaine: '', siret: '', responsable: '' };
const BRIEF = { da: { ambiance: 'luxe', mode: 'sombre', couleur: '#2e7d32', police: 'moderne', arrondi: 'rond', densite: '' }, modules: ['reservation', 'devis', 'chatbot', 'panel', 'whatsapp', 'annonce', 'faq'], options: { reservation: '', firebaseApiKey: 'CLE-PUBLIQUE-TEST', firebaseProjectId: 'projet-test', whatsapp: '' }, faq: [{ q: 'Acceptez-vous les chiens ?', a: 'Oui, ils sont les bienvenus en terrasse.' }], annonce: 'Fermé le 1er mai' };

(async () => {
  const modeles = JSON.parse(fs.readFileSync(path.join(modelesDir, 'index.json'), 'utf8'));
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage(); let sauvegarde = null;
  pg.on('pageerror', e => ko('erreur JavaScript : ' + e.message));
  await pg.exposeFunction('lireModele', id => ({ html: fs.readFileSync(path.join(modelesDir, 'html', id + '.html'), 'utf8'), legal: fs.readFileSync(path.join(modelesDir, 'html', 'legal.html'), 'utf8') }));
  await pg.exposeFunction('noterSauvegarde', s => { sauvegarde = s; });
  await pg.addInitScript(modelesJson => {
    // IA simulée : répond au tchat, avec une invention volontaire (téléphone absent du message) que le programme doit refuser
    window.studioSites = {
      modeles: async () => modelesJson, modele: id => window.lireModele(id),
      ia: { etat: async () => ({ installee: true, mo: 2500 }), installer: async () => ({}),
        ecrire: async m => {
          window.__sys = m.systeme;
          if (!/assistant de Studio Sites/.test(m.systeme)) return { textes: [] };
          return { reponse: 'J’ai réglé une ambiance luxe en mode sombre, ajouté la réservation et le panel.', fiche: { nom: 'Kebab Erkan', metier: 'restaurateur', ville: 'Lyon', zone: '', telephone: '01 02 03 04 05', email: '', adresse: '', codePostal: '', horaires: '', services: ['Kebab', 'Tacos'], atouts: '', tarifs: '9 € le kebab' },
            style: { ambiance: 'luxe', mode: 'sombre', couleur: 'or', police: 'elegante', arrondi: '', densite: '' }, ajouter: ['reservation', 'panel'], retirer: [], faq: [], annonce: '', questions: ['Quels sont ses horaires ?'] };
        } },
      memoire: (() => { const mem = { consignes: [], corrections: [] }; window.__mem = mem; return {
        lire: async () => mem, ordre: async m => { const o = window.Memoire.detecter(m); if (!o) return null; if (o.type === 'retenir') mem.consignes.push({ id: 'c' + mem.consignes.length, texte: o.texte, source: 'Studio Sites', date: '2026-10-12' }); return { reponse: o.type === 'retenir' ? 'C’est retenu : « ' + o.texte + ' ».' : 'ok', memoire: mem }; },
        oublier: async id => { mem.consignes = mem.consignes.filter(x => x.id !== id); return mem; }, vider: async () => { mem.consignes = []; mem.corrections = []; return mem; }, corrections: async p => { window.__corr = p; mem.corrections.push(...p); return mem; } }; })(),
      github: (() => { const g = { etat: { connecte: false, login: '', clientId: '' }, appels: [] }; window.__gh = g; return {
        etat: async () => g.etat, jeton: async j => { g.appels.push('jeton'); if (!/^ghp_/.test(j)) throw new Error("Error invoking remote method 'gh:jeton': Error: Ce jeton ne ressemble pas à un jeton GitHub."); g.etat = { connecte: true, login: 'erkan', clientId: '' }; return g.etat; },
        clientId: async id => { g.etat = { ...g.etat, clientId: id }; return g.etat; }, connecter: async () => { g.appels.push('connecter'); setTimeout(() => g.cb && g.cb({ connecte: true, login: 'erkan', clientId: g.etat.clientId }), 300); return { code: 'ABCD-1234', url: 'https://github.com/login/device' }; },
        annuler: async () => true, deconnecter: async () => { g.etat = { ...g.etat, connecte: false, login: '' }; return g.etat; }, ouvrir: async u => { g.appels.push('ouvrir ' + u); },
        publier: async o => { g.publie = o; g.cbEtape && g.cbEtape('Envoi des fichiers (1/3)…'); return { depot: 'https://github.com/erkan/' + o.nom, site: 'https://erkan.github.io/' + o.nom + '/', pages: 'activé', nouveau: true }; },
        surConnexion: cb => { g.cb = cb; }, surEtape: cb => { g.cbEtape = cb; } }; })(),
      maj: (() => { let e = { etat: 'telechargement', nouvelle: '9.9.9', progres: 40 }; setTimeout(() => { e = { ...e, etat: 'pret' }; }, 2500); window.__majInstall = false; return { verifier: async () => e, etat: async () => e, installer: async () => { window.__majInstall = true; return e; }, surChangement: () => {} }; })(),
      enregistrer: async s => { await window.noterSauvegarde({ dossier: s.dossier, fichiers: (s.fichiers || []).map(f => f.chemin), notes: s.notes }); return { dossier: '/tmp/site' }; }, ouvrir: async () => {}
    };
  }, modeles);
  await pg.goto('file://' + path.join(dossier, 'index.html'));
  await pg.waitForFunction(() => window.sites && window.sites.modeles().length, null, { timeout: 15000 });

  /* ── 1. Tchat : la fiche et le cahier des charges se remplissent, les inventions sont refusées ── */
  await pg.evaluate(() => window.sites.onglet('chat'));
  await pg.fill('#chatSaisie', 'Un site pour Kebab Erkan, un kebab à Lyon. Ambiance sombre et luxe, noir et or, avec réservation en ligne et un panel pour gérer les réservations. Services : kebab, tacos.');
  await pg.click('#chatEnvoi'); await pg.waitForFunction(() => !document.querySelector('#chatEnvoi').disabled && document.querySelectorAll('#fil .msg.assistant').length >= 2, null, { timeout: 15000 });
  const c1 = await pg.evaluate(() => ({ fiche: window.sites.lireFiche(), brief: window.sites.lireBrief(), fil: document.querySelector('#fil').innerText, cahier: document.querySelector('#cahier').innerText }));
  verifie(c1.fiche.nom === 'Kebab Erkan' && c1.fiche.ville === 'Lyon', 'tchat : nom et ville remplis dans la fiche', 'tchat : fiche ' + JSON.stringify(c1.fiche));
  verifie(!c1.fiche.telephone && !/9 €|tarif/i.test(c1.fiche.tarifs), 'tchat : téléphone et prix inventés par l’IA refusés');
  verifie(c1.brief.da.ambiance === 'luxe' && c1.brief.da.mode === 'sombre' && c1.brief.da.couleur === '#c9a15b' && c1.brief.da.police === 'elegante', 'tchat : direction artistique comprise (luxe, sombre, or, police élégante)', JSON.stringify(c1.brief.da));
  verifie(['reservation', 'panel'].every(x => c1.brief.modules.includes(x)), 'tchat : fonctions ajoutées (réservation, panel)', JSON.stringify(c1.brief.modules));
  verifie(/Quels sont ses horaires/.test(c1.fil) && /téléphone ou son e-mail/.test(c1.fil), 'tchat : questions utiles posées (horaires, téléphone)');
  verifie(/luxe/i.test(c1.cahier), 'tchat : cahier des charges affiché');
  // sans IA : analyse par mots-clés
  const sansIA = await pg.evaluate(async () => { const r = await Conseiller.tour({ message: 'Ajoute un chatbot et passe en bleu nuit. Sans panel. Tel : 06 12 34 56 78', historique: [], fiche: {}, brief: { modules: ['panel'] }, ecrire: null }); return { m: r.brief.modules, c: r.brief.da.couleur, t: r.fiche.telephone, s: r.source }; });
  verifie(sansIA.m.includes('chatbot') && !sansIA.m.includes('panel') && sansIA.c === '#14284b' && sansIA.t === '06 12 34 56 78' && sansIA.s === 'mots', 'tchat sans IA : fonctions, retrait (« sans panel »), couleur et téléphone compris', JSON.stringify(sansIA));
  // le choix du design suit l'ambiance : sombre + luxe → restaurant
  verifie(await pg.evaluate(() => { window.sites.lireFiche(); return window.Moteur.modeleConseille('', window.sites.modeles(), { ambiance: 'luxe', mode: 'sombre' }).id; }) === 'restaurant', 'design choisi d’après l’ambiance et le mode (luxe sombre → restaurant)');

  /* ── 2. Génération avec toutes les fonctions ── */
  const gen = async (id, brief, fiche = FICHE) => pg.evaluate(async ({ id, brief, fiche }) => { const r = await window.sites.genererSite({ fiche, modeleId: id, ecrire: null, brief }); return r.erreur ? { erreur: r.erreur } : { html: r.html, notes: r.notes }; }, { id, brief, fiche });
  const sortie = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-fonctions-'));
  const ecrireSite = (nom, html, extra = []) => {
    const d = path.join(sortie, nom); fs.mkdirSync(path.join(d, 'assets', 'fonts'), { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), html);
    for (const f of new Set([...html.matchAll(/assets\/fonts\/([\w.-]+\.woff2)/g)].map(x => x[1]))) fs.copyFileSync(path.join(modelesDir, 'polices', f), path.join(d, 'assets', 'fonts', f));
    for (const f of ['qt.css', 'qt.js']) if (html.includes('assets/' + f)) fs.copyFileSync(path.join(modelesDir, 'assets', f), path.join(d, 'assets', f));
    for (const f of extra) { fs.mkdirSync(path.dirname(path.join(d, f.chemin)), { recursive: true }); fs.writeFileSync(path.join(d, f.chemin), f.contenu); }
    return d;
  };
  const FIRESTORE = /firestore\.googleapis\.com/, AUTH = /identitytoolkit\.googleapis\.com/;
  for (const id of ['restaurant', 'plombier', 'coach', 'fleuriste', 'modele-vitrine', 'modele-rendez-vous']) {
    const r = await gen(id, BRIEF); if (r.erreur) { ko(`${id} : ${r.erreur}`); continue; }
    const p = [], h = r.html;
    for (const x of ['id="qs-reservation"', 'id="qs-devis"', 'id="qs-faq"', 'id="qs-config"', 'class="qs-annonce"', 'href="https://wa.me/33478123456"']) if (!h.includes(x)) p.push('manque ' + x);
    if (/<script[^>]+src=["']https?:/i.test(h)) p.push('script externe');
    if (id !== 'modele-vitrine' && id !== 'modele-rendez-vous' && /#c9a15b|#c6ff00|#0b3d91|#e8588d/i.test(h.replace(/<script[\s\S]*?<\/script>/g, ''))) p.push('couleur d’origine restée après recoloration');
    if (!/@font-face\{font-family:"QS Titre"/.test(h)) p.push('police choisie non appliquée');
    const d = ecrireSite(id, h), page = await ctx.newPage(), erreursPage = [], req = [];
    page.on('pageerror', e => erreursPage.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|CORS policy/.test(m.text())) erreursPage.push(m.text()); });
    await page.route(FIRESTORE, async route => {
      const rq = route.request(); req.push({ m: rq.method(), u: rq.url(), b: rq.postData() });
      if (rq.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ fields: { annonce: { stringValue: 'Annonce de la base' }, annonceActive: { booleanValue: true } } }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    for (const [w, hh] of [[390, 844], [1280, 800]]) {
      await page.setViewportSize({ width: w, height: hh }); await page.goto('file://' + path.join(d, 'index.html')); await page.waitForTimeout(500);
      const info = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, bandeau: (document.querySelector('.qs-annonce') || {}).textContent }));
      if (info.sw > w + 1) p.push(`défilement horizontal à ${w} px (${info.sw})`);
      if (w === 1280 && info.bandeau !== 'Annonce de la base') p.push('annonce de la base non affichée : ' + info.bandeau);
    }
    // réservation : validation, jour fermé, envoi à la base
    await page.goto('file://' + path.join(d, 'index.html')); await page.evaluate(() => localStorage.removeItem('qs-dernier'));
    await page.fill('#qs-reservation [name=nom]', 'Camille'); await page.click('#qs-reservation button[type=submit]');
    if (!/téléphone ou un e-mail/.test(await page.innerText('#qs-reservation .qs-msg'))) p.push('réservation : champs manquants non signalés');
    await page.fill('#qs-reservation [name=telephone]', '06 11 22 33 44');
    const lundi = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7 || 7)); return d.toISOString().slice(0, 10); });
    await page.fill('#qs-reservation [name=date]', lundi); await page.selectOption('#qs-reservation [name=heure]', { index: 1 }); await page.click('#qs-reservation button[type=submit]');
    if (!/fermés ce jour/.test(await page.innerText('#qs-reservation .qs-msg'))) p.push('réservation : jour de fermeture (lundi) accepté');
    const mercredi = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7)); return d.toISOString().slice(0, 10); });
    await page.fill('#qs-reservation [name=date]', mercredi); await page.click('#qs-reservation button[type=submit]'); await page.waitForTimeout(400);
    const post = req.find(x => x.m === 'POST' && /\/demandes\?key=CLE-PUBLIQUE-TEST/.test(x.u));
    const champs = post && JSON.parse(post.b).fields;
    if (!post || champs.type.stringValue !== 'reservation' || champs.statut.stringValue !== 'nouvelle' || champs.nom.stringValue !== 'Camille' || champs.date.stringValue !== mercredi || !champs.heure) p.push('réservation : demande non envoyée à la base ou champs incorrects ' + JSON.stringify(champs));
    else if (!/bien envoyée/.test(await page.innerText('#qs-reservation .qs-msg'))) p.push('réservation : pas de confirmation affichée');
    // piège anti-robot
    const avant = req.filter(x => x.m === 'POST').length; await page.evaluate(() => { localStorage.removeItem('qs-dernier'); });
    await page.fill('#qs-devis [name=nom]', 'Robot'); await page.fill('#qs-devis [name=email]', 'a@b.fr'); await page.fill('#qs-devis [name=message]', 'x'); await page.evaluate(() => { document.querySelector('#qs-devis [name=site]').value = 'http://spam'; }); await page.click('#qs-devis button[type=submit]');
    if (req.filter(x => x.m === 'POST').length !== avant) p.push('champ piège ignoré : une demande de robot est partie');
    await page.evaluate(() => { document.querySelector('#qs-devis [name=site]').value = ''; localStorage.removeItem('qs-dernier'); }); await page.fill('#qs-devis [name=message]', 'Je voudrais un devis pour 30 personnes'); await page.click('#qs-devis button[type=submit]'); await page.waitForTimeout(400);
    const dv = req.filter(x => x.m === 'POST').map(x => JSON.parse(x.b).fields).find(f => f.type.stringValue === 'devis');
    if (!dv || !/30 personnes/.test(dv.message.stringValue)) p.push('devis : demande non envoyée');
    // assistant de questions
    await page.click('.qs-bulle'); await page.fill('.qs-chat input', 'Quels sont vos horaires ?'); await page.click('.qs-chat-form button'); await page.waitForTimeout(500);
    const rep = await page.innerText('.qs-chat-fil');
    if (!/Du mardi au samedi, 11 h – 14 h et 18 h – 23 h/.test(rep)) p.push('assistant : horaires non donnés : ' + rep.slice(-120));
    await page.fill('.qs-chat input', 'acceptez vous les chiens ?'); await page.click('.qs-chat-form button'); await page.waitForTimeout(500);
    if (!/terrasse/.test(await page.innerText('.qs-chat-fil'))) p.push('assistant : question fréquente personnalisée non reconnue');
    await page.fill('.qs-chat input', 'combien coûte la livraison de la moto'); await page.click('.qs-chat-form button'); await page.waitForTimeout(500);
    const dernier = await page.evaluate(() => [...document.querySelectorAll('.qs-bot')].pop().innerText);
    if (/€/.test(dernier)) p.push('assistant : un prix a été inventé : ' + dernier);
    await page.keyboard.press('Escape'); if (await page.isVisible('.qs-chat')) p.push('assistant : Échap ne ferme pas la fenêtre');
    if (erreursPage.length) p.push('erreur dans la page : ' + erreursPage[0]);
    await page.close();
    p.length ? p.forEach(x => ko(`${id} (avec fonctions) : ${x}`)) : ok(`${id} : réservation, devis, assistant, FAQ, annonce, WhatsApp, couleur et police appliqués, pas de défilement horizontal`);
  }

  /* ── 3. Sans base Firebase : repli par e-mail, aucun appel réseau ── */
  {
    const r = await gen('modele-vitrine', { ...BRIEF, modules: ['reservation', 'chatbot'], options: { ...BRIEF.options, firebaseApiKey: '', firebaseProjectId: '' } });
    const d = ecrireSite('sans-base', r.html), page = await ctx.newPage(); let reseau = 0; page.on('request', q => { if (/^https?:/.test(q.url())) reseau++; });
    await page.goto('file://' + path.join(d, 'index.html')); await page.evaluate(() => localStorage.removeItem('qs-dernier'));
    await page.fill('#qs-reservation [name=nom]', 'Camille'); await page.fill('#qs-reservation [name=telephone]', '0611223344'); const mer = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); });
    await page.fill('#qs-reservation [name=date]', mer);
    const h = page.locator('#qs-reservation [name=heure]'); if (await h.evaluate(e => e.tagName) === 'SELECT') await h.selectOption({ index: 1 }); else await h.fill('19:00');
    await page.click('#qs-reservation button[type=submit]'); await page.waitForTimeout(300);
    const msg = await page.innerText('#qs-reservation .qs-msg');
    verifie(/messagerie|fermés/.test(msg) && reseau === 0, 'sans Firebase : repli par e-mail, aucun appel réseau', msg + ' / appels : ' + reseau);
    await page.close();
  }

  /* ── 4. Espace professionnel : connexion, demandes, statut, annonce (Firebase simulé) ── */
  {
    const fichiersSite = await pg.evaluate(({ f, br }) => window.Modules.fichiers(f, br).map(x => ({ chemin: x.chemin, contenu: x.contenu })), { f: FICHE, br: BRIEF });
    verifie(['admin/index.html', 'REGLES-FIRESTORE.txt', 'LISEZMOI-FIREBASE.txt'].every(c => fichiersSite.some(f => f.chemin === c)), 'panel : admin/index.html, règles Firestore et notes générés');
    const regles = fichiersSite.find(f => f.chemin === 'REGLES-FIRESTORE.txt').contenu;
    verifie(/token\.email == 'contact@erkan-lyon\.fr'/.test(regles) && /allow create/.test(regles) && /allow read, update, delete: if proprietaire\(\)/.test(regles), 'règles Firestore : création publique contrôlée, lecture réservée au professionnel');
    const admin = fichiersSite.find(f => f.chemin === 'admin/index.html').contenu;
    verifie(/Content-Security-Policy/.test(admin) && /noindex/.test(admin) && !/<script[^>]+src=/.test(admin), 'panel : sécurité (CSP, noindex, aucun script externe)');
    const d = ecrireSite('panel', '<!doctype html><title>x</title>', fichiersSite), page = await ctx.newPage(), erreursPage = [], req = [];
    page.on('pageerror', e => erreursPage.push(e.message));
    const DEMANDES = [{ document: { name: 'projects/p/databases/(default)/documents/demandes/abc1', fields: { type: { stringValue: 'reservation' }, statut: { stringValue: 'nouvelle' }, nom: { stringValue: '<img src=x onerror=window.XSS=1>' }, telephone: { stringValue: '0611223344' }, date: { stringValue: '2030-01-02' }, heure: { stringValue: '19:30' }, couverts: { stringValue: '4' }, message: { stringValue: '=cmd()' }, envoye: { stringValue: new Date().toISOString() } } } }, { document: { name: 'projects/p/databases/(default)/documents/demandes/abc2', fields: { type: { stringValue: 'devis' }, statut: { stringValue: 'confirmee' }, nom: { stringValue: 'Sam' }, email: { stringValue: 'sam@exemple.fr' }, envoye: { stringValue: new Date().toISOString() } } } }];
    await page.route(AUTH, async route => { const j = JSON.parse(route.request().postData()); req.push({ m: 'AUTH', b: j }); if (j.password === 'bon-mdp') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ idToken: 'JETON', refreshToken: 'R', expiresIn: '3600' }) }); return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: 'INVALID_PASSWORD' } }) }); });
    await page.route(FIRESTORE, async route => {
      const rq = route.request(); req.push({ m: rq.method(), u: rq.url(), b: rq.postData(), a: rq.headers().authorization });
      if (/runQuery/.test(rq.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEMANDES) });
      if (rq.method() === 'GET') return route.fulfill({ status: 404, body: '{}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('file://' + path.join(d, 'admin', 'index.html'));
    verifie(await page.isVisible('#co'), 'panel : écran de connexion affiché');
    await page.fill('[name=email]', 'contact@erkan-lyon.fr'); await page.fill('[name=mdp]', 'mauvais'); await page.click('#co button'); await page.waitForTimeout(300);
    verifie(/incorrect/.test(await page.innerText('#co .err')), 'panel : mauvais mot de passe refusé avec un message clair');
    await page.fill('[name=email]', 'contact@erkan-lyon.fr'); await page.fill('[name=mdp]', 'bon-mdp'); await page.click('#co button'); await page.waitForSelector('.carte', { timeout: 5000 }).catch(async e => { console.log('DEBUG', (await page.innerText('body')).slice(0, 300), JSON.stringify(req.map(x => [x.m, x.u && x.u.slice(-40)])), erreursPage); throw e; });
    verifie((await page.locator('.carte').count()) === 2, 'panel : les demandes de la base sont listées');
    verifie(await page.evaluate(() => window.XSS === undefined), 'panel : le texte saisi par un visiteur est affiché sans exécution (XSS)');
    verifie(req.some(x => x.a === 'Bearer JETON' && /runQuery/.test(x.u || '')), 'panel : requêtes envoyées avec le jeton de connexion');
    await page.click('[data-id=abc1][data-v=confirmee]'); await page.waitForTimeout(400);
    const patch = req.find(x => x.m === 'PATCH' && /demandes\/abc1/.test(x.u));
    verifie(patch && /updateMask\.fieldPaths=statut/.test(patch.u) && JSON.parse(patch.b).fields.statut.stringValue === 'confirmee', 'panel : « Confirmer » met le statut à jour dans la base');
    await page.fill('#rech', 'Sam'); verifie((await page.locator('.carte').count()) === 1, 'panel : recherche');
    await page.fill('#rech', ''); await page.click('[data-a=vue][data-v=annonce]'); await page.fill('#an', 'Fermé le 1er mai'); await page.click('[data-a=annonce]'); await page.waitForTimeout(400);
    const pa = req.find(x => x.m === 'PATCH' && /site\/config/.test(x.u));
    verifie(pa && JSON.parse(pa.b).fields.annonce.stringValue === 'Fermé le 1er mai', 'panel : l’annonce du site est enregistrée dans la base');
    await page.click('[data-a=vue][data-v=demandes]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a=csv]')]);
    const csv = fs.readFileSync(await dl.path(), 'utf8'); verifie(/"'=cmd\(\)"/.test(csv), 'panel : export CSV protégé contre les formules');
    if (erreursPage.length) ko('panel : erreur dans la page : ' + erreursPage[0]);
    // mode démonstration (sans clés)
    const sans = await pg.evaluate(({ f, br }) => window.Modules.pageAdmin(f, { ...br, options: { ...br.options, firebaseApiKey: '', firebaseProjectId: '' } }), { f: FICHE, br: BRIEF });
    fs.mkdirSync(path.join(sortie, 'demo'), { recursive: true }); fs.writeFileSync(path.join(sortie, 'demo', 'admin.html'), sans);
    const pd = await ctx.newPage(); await pd.goto('file://' + path.join(sortie, 'demo', 'admin.html')); await pd.waitForSelector('.carte');
    verifie(/mode démonstration/i.test(await pd.innerText('.bandeau')) && (await pd.locator('.carte').count()) === 2, 'panel sans clés : mode démonstration avec des demandes fictives signalées');
    await pd.click('[data-a=statut][data-v=refusee]'); await pd.waitForTimeout(100); verifie(/Refusée/.test(await pd.innerText('.carte')), 'panel démonstration : changement de statut');
    await pd.close(); await page.close();
  }

  /* ── 5. Les textes écrits par l'IA ne sont plus perdus quand on corrige un texte, et le style se met à jour en direct ── */
  {
    await pg.reload(); await pg.waitForFunction(() => window.sites && window.sites.modeles().length);
    const res = await pg.evaluate(async fiche => {
      window.sites.ecrireFiche(fiche); document.querySelector('#f_modele').value = 'plombier';
      const ecrire = async m => { if (/Texte d’un site/.test(m.demande)) return { texte: 'Texte propre' }; const l = [...m.demande.matchAll(/^(\d+)\. \((.*?), (\d+) caractères\) (.*)$/gm)]; return l.length ? { textes: l.map(x => ({ n: +x[1], texte: 'Texte écrit ' + x[1] })) } : { description: 'Description.' }; };
      await window.sites.genererSite({ fiche, modeleId: 'plombier', ecrire });
      const avant = window.sites.etat.resultat.html.includes('Texte écrit 3'); window.__dbg = window.sites.etat.resultat.slots.slice(0, 5).map(s => [s.etat, s.raison, s.texte]);
      window.sites.etat.textes[0] = 'Mon titre corrigé'; window.sites.rafraichir();
      const h = window.sites.etat.resultat.html;
      return { avant, apres: h.includes('Texte écrit 3') && h.includes('Mon titre corrigé') };
    }, FICHE);
    verifie(res.avant && res.apres, 'correction d’un texte : les autres textes écrits par l’IA sont conservés', 'correction d’un texte : ' + JSON.stringify(res) + JSON.stringify(await pg.evaluate(() => window.__dbg)));
    await pg.evaluate(() => { window.sites.ecrireBrief({ da: { couleur: '#2e7d32', arrondi: 'carre' }, modules: ['chatbot'] }); window.sites.rafraichir(); });
    const h2 = await pg.evaluate(() => window.sites.etat.resultat.html);
    verifie(/id="qs-config"/.test(h2) && !/#0b3d91/i.test(h2.replace(/<script[\s\S]*?<\/script>/g, '')) && /Texte écrit 3/.test(h2), 'style et fonctions modifiés après la génération : le site se recompose sans réécrire les textes');
    await pg.evaluate(() => { window.sites.onglet('style'); });
    await pg.click('#p_style [data-mod=whatsapp]'); await pg.waitForTimeout(700);
    verifie((await pg.evaluate(() => window.sites.etat.resultat.html)).includes('qs-wa'), 'cocher une fonction met l’aperçu à jour');
    await pg.click('#bEnregistrer'); await pg.waitForTimeout(400);
    verifie(sauvegarde && /LIVRAISON DU SITE/.test(sauvegarde.notes) && /FONCTIONS AJOUTÉES/.test(sauvegarde.notes), 'enregistrement : notes de livraison avec les fonctions');
  }
  /* ── 6. Publication sur GitHub (pont simulé) et mise à jour automatique ── */
  {
    await pg.reload(); await pg.waitForFunction(() => window.sites && window.sites.modeles().length);
    const maj = await pg.waitForSelector('#bMajGo:not([hidden])', { timeout: 10000 }).then(() => true, () => false);
    verifie(maj && /9\.9\.9/.test(await pg.innerText('#bMajTexte')), 'mise à jour automatique : bandeau, puis « Redémarrer pour installer »'); if (maj) { await pg.click('#bMajGo'); verifie(await pg.evaluate(() => window.__majInstall), 'mise à jour : le bouton lance l’installation'); }
    verifie(await pg.evaluate(() => document.querySelector('#bPublier').disabled), 'publier : bouton inactif tant que le site n’est pas généré');
    await pg.evaluate(async fiche => { window.sites.ecrireFiche(fiche); document.querySelector('#f_modele').value = 'plombier'; window.sites.ecrireBrief({ modules: ['reservation', 'panel'], options: { firebaseApiKey: 'k', firebaseProjectId: 'p' } }); await window.sites.genererSite({ fiche, modeleId: 'plombier', ecrire: null, brief: window.sites.lireBrief() }); }, FICHE);
    verifie(await pg.evaluate(() => !document.querySelector('#bPublier').disabled), 'publier : bouton actif après la génération');
    await pg.fill('#chatSaisie', 'publie le site'); await pg.click('#chatEnvoi'); await pg.waitForSelector('#modalGh.ouvert', { timeout: 5000 }).catch(() => {});
    verifie(await pg.isVisible('#modalGh'), 'tchat : « publie le site » ouvre la publication GitHub');
    await pg.fill('#ghJeton', 'mauvais'); await pg.click('#ghJetonOk'); await pg.waitForTimeout(200);
    verifie(/ne ressemble pas/.test(await pg.innerText('#ghErr')) && !/Error invoking/.test(await pg.innerText('#ghErr')), 'jeton incorrect : message clair, sans texte technique');
    await pg.fill('#ghJeton', 'ghp_' + 'a'.repeat(30)); await pg.click('#ghJetonOk'); await pg.waitForSelector('#ghPublier');
    verifie(/@erkan/.test(await pg.innerText('#ghCorps')) && /kebab|erkan|boulangerie/i.test(await pg.inputValue('#ghNom')), 'connexion par jeton : compte affiché, nom du dépôt proposé');
    pg.once('dialog', d => d.accept()); await pg.fill('#ghNom', 'plomberie-test'); await pg.click('#ghPublier'); await pg.waitForSelector('#ghSite', { timeout: 5000 }).catch(() => {});
    const pub = await pg.evaluate(() => ({ o: window.__gh.publie && { nom: window.__gh.publie.nom, prive: window.__gh.publie.prive, pages: window.__gh.publie.pages, chemins: window.__gh.publie.site.fichiers.map(f => f.chemin), index: window.__gh.publie.site.index.length }, texte: document.querySelector('#ghCorps').innerText }));
    verifie(pub.o && pub.o.nom === 'plomberie-test' && !pub.o.prive && pub.o.pages && pub.o.index > 5000 && pub.o.chemins.includes('admin/index.html'), 'publication : le site et les fichiers du panel sont transmis', JSON.stringify(pub.o));
    verifie(/erkan\.github\.io\/plomberie-test/.test(pub.texte) && /github\.com\/erkan\/plomberie-test/.test(pub.texte), 'publication : adresses du site et du dépôt affichées');
    await pg.click('#ghSite'); verifie(await pg.evaluate(() => window.__gh.appels.includes('ouvrir https://erkan.github.io/plomberie-test/')), 'publication : le lien ouvre le site');
    await pg.click('#ghDeco'); await pg.waitForSelector('#ghConnecter');
    await pg.fill('#ghClient', 'Iv1.testtest'); await pg.click('#ghConnecter'); await pg.waitForSelector('#ghCode');
    verifie(/ABCD-1234/.test(await pg.innerText('#ghCode')), 'connexion « appareil » : code à saisir affiché');
    await pg.waitForSelector('#ghPublier', { timeout: 5000 }); verifie(true, 'connexion « appareil » : connecté après validation sur GitHub');
    await pg.click('#ghFermer');
  }
  /* ── 7. Mémoire de l'IA : consignes retenues, injectées dans les demandes, corrections apprises ── */
  {
    await pg.reload(); await pg.waitForFunction(() => window.sites && window.sites.modeles().length);
    await pg.fill('#chatSaisie', 'Retiens que je tutoie toujours mes clients'); await pg.click('#chatEnvoi'); await pg.waitForFunction(() => /C’est retenu/.test(document.querySelector('#fil').innerText), null, { timeout: 5000 }).catch(() => {});
    verifie(await pg.evaluate(() => window.__mem.consignes.length === 1 && /tutoie toujours/.test(window.__mem.consignes[0].texte)), 'mémoire : « retiens que… » dans le tchat enregistre la consigne');
    await pg.click('#bMemoire'); verifie(/tutoie toujours/.test(await pg.innerText('#memCorps')), 'mémoire : la consigne est visible dans la fenêtre « Mémoire »');
    await pg.click('#memFermer');
    await pg.evaluate(async fiche => {
      window.sites.ecrireFiche(fiche); document.querySelector('#f_modele').value = 'plombier';
      const ecrire = async m => { window.__sys = m.systeme; const l = [...m.demande.matchAll(/^(\d+)\. \((.*?), (\d+) caractères\) (.*)$/gm)]; return /Texte d’un site/.test(m.demande) ? { texte: 'Texte propre' } : l.length ? { textes: l.map(x => ({ n: +x[1], texte: 'Texte écrit ' + x[1] + ' pour vous' })) } : { description: 'Description.' }; };
      await window.sites.genererSite({ fiche, modeleId: 'plombier', ecrire });
    }, FICHE);
    verifie(await pg.evaluate(() => /Mémoire du propriétaire/.test(window.__sys) && /tutoie toujours/.test(window.__sys)), 'mémoire : les consignes sont ajoutées aux demandes envoyées à l’IA');
    await pg.evaluate(() => { const s = window.sites.etat.resultat.slots.find(x => x.etat === 'ia'); window.sites.etat.textes[s.i] = 'Une phrase corrigée à la main'; });
    await pg.click('#bEnregistrer'); await pg.waitForTimeout(500);
    verifie(await pg.evaluate(() => (window.__corr || []).some(p => p.apres === 'Une phrase corrigée à la main' && /Texte écrit/.test(p.avant))), 'mémoire : un texte de l’IA corrigé à la main devient un exemple appris');
    await pg.click('#bMemoire'); await pg.click('[data-oublier]'); verifie(await pg.evaluate(() => window.__mem.consignes.length === 0), 'mémoire : une consigne peut être oubliée'); await pg.click('#memFermer');
  }
  await b.close();
  console.log(erreurs ? `\n${erreurs} problème(s)` : '\nStudio Sites (fonctions) : tout est bon');
  process.exit(erreurs ? 1 : 0);
})();
