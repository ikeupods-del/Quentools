// Contrôle des mises à jour automatiques : recherche, téléchargement vérifié, remplacement de l'application.
// Sur Mac, ouvre aussi un vrai .dmg (hdiutil) comme l'application installée.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync, spawn, spawnSync } = require('child_process');
const M = require('../maj');

let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };
const rejette = async (p, motif) => { try { await p; return false; } catch (e) { return motif.test(e.message); } };

(async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-maj-'));
  // Fausse application « installée » (version 1.0.0) et nouvelle version emballée
  const fabriquerApp = (dossier, version) => { const c = path.join(dossier, 'QuentMovie.app', 'Contents'); fs.mkdirSync(c, { recursive: true }); fs.writeFileSync(path.join(c, 'version.txt'), version); return path.join(dossier, 'QuentMovie.app'); };
  const appli = fabriquerApp(path.join(base, 'Applications'), '1.0.0');
  const paquet = path.join(base, 'paquet'); fabriquerApp(paquet, '1.4.0');
  let dmg = path.join(base, 'nouvelle.dmg');
  if (process.platform === 'darwin') execFileSync('hdiutil', ['create', '-quiet', '-fs', 'HFS+', '-volname', 'QuentMovie', '-srcfolder', paquet, dmg]);
  else fs.writeFileSync(dmg, crypto.randomBytes(300000));
  const contenu = fs.readFileSync(dmg), empreinte = crypto.createHash('sha256').update(contenu).digest('hex');

  // Faux service GitHub : liste des versions et fichiers
  let empreintePubliee = empreinte;
  const srv = http.createServer((req, res) => {
    const port = srv.address().port, url = `http://127.0.0.1:${port}`;
    if (req.url.startsWith('/repos/ikeupods-del/Quentools/releases')) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify([
        { draft: false, prerelease: false, body: '## 1.4.0\n- Nouveautés de test', html_url: url, assets: [{ name: 'QuentMovie-1.4.0-arm64.dmg', size: contenu.length, digest: 'sha256:' + empreintePubliee, browser_download_url: url + '/redirection' }] },
        { draft: false, prerelease: false, body: '', assets: [{ name: 'QuentMovie-1.2.0-arm64.dmg', size: 10, browser_download_url: url + '/vieux' }] },
        { draft: true, prerelease: false, body: '', assets: [{ name: 'QuentMovie-9.0.0-arm64.dmg', size: 10, browser_download_url: url + '/brouillon' }] },
        { draft: false, prerelease: false, body: '', assets: [{ name: 'Autre-5.0.0.zip', size: 10, browser_download_url: url + '/autre' }] }
      ]));
    }
    if (req.url === '/redirection') { res.writeHead(302, { Location: '/fichier.dmg' }); return res.end(); }
    if (req.url === '/fichier.dmg') { res.writeHead(200, { 'Content-Length': contenu.length }); return res.end(contenu); }
    res.writeHead(404); res.end();
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const api = `http://127.0.0.1:${srv.address().port}`;

  // Comparaison des versions
  check('1.10.0 plus récente que 1.9.3', M.compare('1.10.0', '1.9.3') > 0);
  check('versions égales', M.compare('1.3.0', '1.3.0') === 0);
  check('2.0.0 plus récente que 1.99.99', M.compare('2.0.0', '1.99.99') > 0);

  // Recherche
  const info = await M.chercher('1.3.0', api);
  check('nouvelle version trouvée (brouillons et autres fichiers ignorés)', info && info.version === '1.4.0' && info.sha256 === empreinte && /Nouveautés/.test(info.notes), JSON.stringify(info));
  check('déjà à jour', (await M.chercher('1.4.0', api)) === null);
  check('adresse non sécurisée refusée', await rejette(M.chercher('1.0.0', 'http://exemple.fr'), /refusée/));

  // Téléchargement vérifié
  const dl = path.join(base, 'telechargements');
  let progres = 0;
  const f = await M.telecharger(info, dl, (r, t) => { progres = Math.round(r / t * 100); });
  check('téléchargement complet et vérifié', fs.readFileSync(f).equals(contenu) && progres === 100);
  check('fichier abîmé refusé', await rejette(M.telecharger({ ...info, sha256: 'a'.repeat(64) }, dl), /abîmé/));
  check('fichier incomplet refusé', await rejette(M.telecharger({ ...info, taille: contenu.length + 1 }, dl), /incomplet/));
  check('pas de fichier partiel laissé', !fs.readdirSync(dl).some(n => n.endsWith('.part')));

  // Emplacement de l'application
  check('emplacement de l’application', M.emplacementApp('/Applications/QuentMovie.app/Contents/MacOS/QuentMovie') === '/Applications/QuentMovie.app');
  check('application déplacée par macOS détectée', /Applications/.test(M.peutRemplacer('/private/var/folders/x/AppTranslocation/y/d/QuentMovie.app')));
  check('application modifiable', M.peutRemplacer(appli) === '', M.peutRemplacer(appli));

  // Remplacement : attend la fermeture de l'application, échange les versions
  const nouvelle = appli + '.nouvelle';
  if (process.platform === 'darwin') {
    const n = await M.extraire(f, appli);
    check('nouvelle application extraite du .dmg', fs.readFileSync(path.join(n, 'Contents', 'version.txt'), 'utf8') === '1.4.0');
  } else fabriquerApp(path.join(base, 'tmp'), '1.4.0') && fs.renameSync(path.join(base, 'tmp', 'QuentMovie.app'), nouvelle);
  const enCours = spawn('sleep', ['1.5']); const t0 = Date.now();
  const script = M.lancerRemplacement({ app: appli, nouvelle, pid: enCours.pid, relancer: false }, path.join(base, 'maj'));
  check('script de remplacement créé', fs.existsSync(script));
  for (let i = 0; i < 40 && fs.existsSync(nouvelle); i++) await new Promise(r => setTimeout(r, 250));
  check('remplacement après la fermeture seulement', Date.now() - t0 >= 1200, Date.now() - t0);
  check('application remplacée par la nouvelle version', fs.readFileSync(path.join(appli, 'Contents', 'version.txt'), 'utf8') === '1.4.0');
  check('aucun reste de l’ancienne version', !fs.existsSync(appli + '.ancienne') && !fs.existsSync(nouvelle));
  // Sans nouvelle version disponible, l'application reste intacte
  const s = M.scriptRemplacement({ app: appli, nouvelle: appli + '.absente', pid: 999999, relancer: false });
  spawnSync('/bin/sh', ['-c', s]);
  check('application intacte sans nouvelle version', fs.readFileSync(path.join(appli, 'Contents', 'version.txt'), 'utf8') === '1.4.0');
  check('chemins avec apostrophe protégés', /'\/Applications\/Pack d'\\''été\/QuentMovie\.app'/.test(M.scriptRemplacement({ app: "/Applications/Pack d'été/QuentMovie.app", nouvelle: '/x', pid: 1 })));

  // Cycle complet de l'application (sur Mac : vrai .dmg)
  if (process.platform === 'darwin') {
    const appli2 = fabriquerApp(path.join(base, 'Applications2'), '1.3.0');
    const maj = new M.Maj({ version: '1.3.0', dossier: path.join(base, 'maj2'), app: appli2, api, actif: true });
    const e = await maj.verifier();
    check('cycle complet : prête à installer', e.etat === 'pret' && e.nouvelle === '1.4.0', JSON.stringify(e));
    check('cycle complet : .dmg supprimé après extraction', !fs.readdirSync(path.join(base, 'maj2')).some(n => n.endsWith('.dmg')));
    empreintePubliee = 'b'.repeat(64);
    const maj3 = new M.Maj({ version: '1.3.0', dossier: path.join(base, 'maj3'), app: fabriquerApp(path.join(base, 'Applications3'), '1.3.0'), api, actif: true });
    const e3 = await maj3.verifier();
    check('cycle complet : fichier abîmé jamais installé', e3.etat === 'erreur' && !fs.existsSync(path.join(base, 'Applications3', 'QuentMovie.app.nouvelle')), JSON.stringify(e3));
  }
  const inactif = new M.Maj({ version: '1.3.0', dossier: base, app: appli, api, actif: false });
  check('hors application Mac : rien n’est fait', (await inactif.verifier()).etat === 'inactif' && inactif.installer(true) === false);

  srv.close();
  fs.rmSync(base, { recursive: true, force: true });
  console.log(`\nMises à jour : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
