/* Contrôle de la publication sur GitHub de Studio Sites (marketing/studio-sites/github.js) : node tools/verifier-github.js
   Un faux serveur GitHub local simule l'API (dépôt, objets git, Pages, connexion « appareil ») : aucune connexion réelle, aucun jeton réel. */
const http = require('http');
const { GitHub, valideNom } = require('../marketing/studio-sites/github.js');
let erreurs = 0;
const ok = m => console.log('ok', m), ko = m => { erreurs++; console.log('ÉCHEC', m); };
const verifie = (c, m, d) => c ? ok(m) : ko(m + (d ? ' : ' + d : ''));

(async () => {
  const etat = { depots: {}, blobs: {}, arbres: {}, commits: { c0: { tree: 't0' } }, refs: {}, pages: {}, appels: [], pendant: 2, refManquant: 1 };
  const srv = http.createServer((req, res) => {
    let corps = ''; req.on('data', d => { corps += d; });
    req.on('end', () => {
      const j = corps ? JSON.parse(corps) : {}, u = new URL(req.url, 'http://x'), p = u.pathname, auth = req.headers.authorization || '';
      etat.appels.push(`${req.method} ${p}`);
      const rep = (s, o) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      // connexion « appareil »
      if (p === '/login/device/code') return j.client_id === 'Iv1.testtest' ? rep(200, { device_code: 'DC', user_code: 'ABCD-1234', verification_uri: 'http://x/login/device', interval: 1, expires_in: 60 }) : rep(400, { error: 'incorrect_client_credentials' });
      if (p === '/login/oauth/access_token') { if (j.device_code !== 'DC') return rep(200, { error: 'bad_verification_code' }); if (etat.pendant-- > 0) return rep(200, { error: etat.pendant === 1 ? 'slow_down' : 'authorization_pending' }); return rep(200, { access_token: 'JETON-APPAREIL' }); }
      // API
      if (!/^Bearer JETON/.test(auth)) return rep(401, { message: 'Bad credentials' });
      if (p === '/user') return rep(200, { login: 'erkan', name: 'Erkan' });
      let m;
      if (req.method === 'GET' && (m = /^\/repos\/erkan\/([^/]+)$/.exec(p))) return etat.depots[m[1]] ? rep(200, etat.depots[m[1]]) : rep(404, { message: 'Not Found' });
      if (req.method === 'POST' && p === '/user/repos') { if (etat.depots[j.name]) return rep(422, { message: 'name already exists on this account' }); etat.depots[j.name] = { html_url: `https://github.com/erkan/${j.name}`, default_branch: 'main', private: j.private }; return rep(201, etat.depots[j.name]); }
      if (req.method === 'GET' && (m = /^\/repos\/erkan\/([^/]+)\/git\/ref\/heads\/main$/.exec(p))) { if (etat.refManquant-- > 0 && !etat.refs[m[1]]) return rep(404, { message: 'Not Found' }); return rep(200, { object: { sha: etat.refs[m[1]] || 'c0' } }); }
      if (req.method === 'GET' && (m = /^\/repos\/erkan\/[^/]+\/git\/commits\/(\w+)$/.exec(p))) return rep(200, { tree: { sha: etat.commits[m[1]].tree } });
      if (req.method === 'POST' && /\/git\/blobs$/.test(p)) { const sha = 'b' + Object.keys(etat.blobs).length; etat.blobs[sha] = Buffer.from(j.content, 'base64'); return rep(201, { sha }); }
      if (req.method === 'POST' && /\/git\/trees$/.test(p)) { const sha = 't' + (Object.keys(etat.arbres).length + 1); etat.arbres[sha] = { base: j.base_tree, tree: j.tree }; return rep(201, { sha }); }
      if (req.method === 'POST' && /\/git\/commits$/.test(p)) { const sha = 'c' + (Object.keys(etat.commits).length); etat.commits[sha] = { tree: j.tree, parents: j.parents, message: j.message }; return rep(201, { sha }); }
      if (req.method === 'PATCH' && (m = /^\/repos\/erkan\/([^/]+)\/git\/refs\/heads\/main$/.exec(p))) { etat.refs[m[1]] = j.sha; return rep(200, {}); }
      if (req.method === 'POST' && (m = /^\/repos\/erkan\/([^/]+)\/pages$/.exec(p))) { if (etat.pages[m[1]]) return rep(409, { message: 'A GitHub Pages site already exists' }); if (etat.depots[m[1]].private) return rep(422, { message: 'Your current plan does not support GitHub Pages for this repository' }); etat.pages[m[1]] = j.source; return rep(201, {}); }
      rep(404, { message: 'Not Found' });
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`, pause = () => Promise.resolve();
  const gh = new GitHub({ jeton: 'JETON-1', api: base, web: base, pause });

  verifie(valideNom('mon-site.fr') && !valideNom('../x') && !valideNom('a b') && !valideNom('x.git') && !valideNom(''), 'noms de dépôt : seuls les noms sûrs sont acceptés');
  verifie((await gh.moi()).login === 'erkan', 'jeton valide : le compte est reconnu');
  verifie(await new GitHub({ jeton: 'mauvais', api: base, web: base, pause }).moi().then(() => false, e => /refuse ce jeton/.test(e.message)), 'mauvais jeton : message clair');

  // connexion appareil
  const ap = await gh.appareilDebut('Iv1.testtest');
  verifie(ap.code === 'ABCD-1234' && /login\/device/.test(ap.url), 'connexion appareil : code à saisir fourni');
  verifie(await gh.appareilDebut('x').then(() => false, e => /client ID/.test(e.message)), 'connexion appareil : identifiant d’application incorrect refusé');
  const jeton = await gh.appareilAttente('Iv1.testtest', ap);
  verifie(jeton === 'JETON-APPAREIL', 'connexion appareil : attente (en cours, ralentir) puis jeton obtenu');
  verifie(await gh.appareilAttente('Iv1.testtest', { ...ap, deviceCode: 'autre' }).then(() => false, e => /échoué/.test(e.message)), 'connexion appareil : code inconnu refusé');
  verifie(await gh.appareilAttente('Iv1.testtest', ap, { annule: () => true }).then(() => false, e => /annulée/.test(e.message)), 'connexion appareil : annulation possible');

  // publication : nouveau dépôt
  const fichiers = [{ chemin: 'index.html', contenu: '<!doctype html><title>é</title>' }, { chemin: 'assets/fonts/x.woff2', contenu: Buffer.from([0, 1, 2, 255, 254]) }, { chemin: 'robots.txt', contenu: 'User-agent: *\n' }];
  const etapes = [];
  const r1 = await gh.publier({ nom: 'kebab-erkan', fichiers, message: 'Premier envoi', surEtape: e => etapes.push(e) });
  verifie(r1.nouveau && r1.depot === 'https://github.com/erkan/kebab-erkan' && r1.site === 'https://erkan.github.io/kebab-erkan/' && r1.pages === 'activé', 'publication : dépôt créé, Pages activé, adresse du site donnée', JSON.stringify(r1));
  const ordre = etat.appels.filter(a => /blobs|trees|commits|refs|pages|user\/repos/.test(a));
  verifie(ordre[0] === 'POST /user/repos' && ordre.filter(a => /blobs/.test(a)).length === 3 && ordre.indexOf('POST /repos/erkan/kebab-erkan/git/trees') > ordre.lastIndexOf('POST /repos/erkan/kebab-erkan/git/blobs') && /refs\/heads\/main/.test(ordre[ordre.length - 2]) && /pages/.test(ordre[ordre.length - 1]), 'publication : ordre des appels (dépôt, fichiers, arbre, commit, branche, Pages)', ordre.join(' | '));
  const blobs = Object.values(etat.blobs);
  verifie(blobs[0].toString('utf8').includes('é') && blobs[1].equals(Buffer.from([0, 1, 2, 255, 254])), 'publication : le contenu (texte accentué et fichier binaire) arrive intact');
  const arbre = etat.arbres.t1;
  verifie(arbre.tree.map(x => x.path).join() === 'index.html,assets/fonts/x.woff2,robots.txt' && arbre.base === 't0', 'publication : les chemins sont conservés, l’arbre part de celui du dépôt');
  verifie(etapes.some(e => /Création/.test(e)) && etapes.some(e => /3\/3/.test(e)), 'publication : étapes annoncées');

  // mise à jour d'un dépôt existant : un seul nouveau commit, Pages déjà actif
  const r2 = await gh.publier({ nom: 'kebab-erkan', fichiers: [{ chemin: 'index.html', contenu: 'v2' }], message: 'Mise à jour' });
  verifie(!r2.nouveau && r2.pages === 'déjà activé' && etat.commits[etat.refs['kebab-erkan']].parents[0] === r1.commit, 'mise à jour : nouveau commit au-dessus du précédent, Pages déjà actif');
  // dépôt privé : Pages impossible expliqué, le dépôt est tout de même publié
  const r3 = await gh.publier({ nom: 'prive', fichiers: [{ chemin: 'index.html', contenu: 'x' }], prive: true });
  verifie(/impossible/.test(r3.pages) && /abonnement|plan/i.test(r3.pages) && r3.depot.endsWith('/prive'), 'dépôt privé : fichiers envoyés, limite de Pages expliquée', r3.pages);
  // refus
  verifie(await gh.publier({ nom: '../x', fichiers }).then(() => false, e => /Nom de dépôt/.test(e.message)), 'nom de dépôt dangereux refusé');
  verifie(await gh.publier({ nom: 'ok', fichiers: [{ chemin: '../secret', contenu: 'x' }] }).then(() => false, e => /Chemin/.test(e.message)), 'chemin hors du dépôt refusé');
  verifie(await gh.publier({ nom: 'ok', fichiers: [] }).then(() => false, e => /Aucun fichier/.test(e.message)), 'aucun fichier : refusé');
  srv.close();
  console.log(erreurs ? `\n${erreurs} problème(s)` : '\nPublication GitHub : tout est bon');
  process.exit(erreurs ? 1 : 0);
})();
