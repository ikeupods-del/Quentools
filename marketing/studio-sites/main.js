// Studio Sites : fenêtre de l'application Mac (Electron) autour de index.html.
// Tout reste sur le Mac : l'IA locale (modèle téléchargé une fois), les modèles et les sites créés ; aucune connexion ensuite.
'use strict';
const { app, BrowserWindow, Menu, shell, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let win = null, ia = null;
// Mises à jour automatiques (versions publiées dans les Releases) : téléchargement en arrière-plan, installation quand l'application se ferme ou au clic sur « Redémarrer »
const { Maj, emplacementApp } = require('./maj');
const maj = new Maj({ nom: 'Studio Sites', fichier: 'Studio-Sites', version: app.getVersion(), dossier: path.join(app.getPath('userData'), 'mises-a-jour'), app: emplacementApp(process.execPath), actif: app.isPackaged && process.platform === 'darwin' && !process.env.STUDIO_AUTOTEST });
const verifierMaj = () => { maj.verifier().then(() => { if (win && !win.isDestroyed()) win.webContents.send('maj:etat', maj.etat); }); };
ipcMain.handle('maj:etat', e => { garde(e); return maj.etat; });
ipcMain.handle('maj:verifier', e => { garde(e); verifierMaj(); return maj.etat; });
ipcMain.handle('maj:installer', e => { garde(e); if (maj.installer(true)) setTimeout(() => app.quit(), 200); return maj.etat; });
app.on('will-quit', () => { maj.installer(false); });
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

const MODELES = path.join(__dirname, 'modeles');
const IA = () => ia || (ia = require('./ia-locale').creer());
const depuisNotrePage = e => !!win && e.sender === win.webContents;
const garde = e => { if (!depuisNotrePage(e)) throw new Error('refusé'); };

ipcMain.handle('ia:etat', e => { garde(e); return IA().etat(); });
ipcMain.handle('ia:installer', async e => { garde(e); await IA().installer(p => { if (!e.sender.isDestroyed()) e.sender.send('ia:progres', p); }); return IA().etat(); });
ipcMain.handle('ia:ecrire', (e, m) => {
  garde(e);
  const s = x => String(x || '').slice(0, 16000);
  return IA().ecrire({ systeme: s(m && m.systeme), demande: s(m && m.demande), schema: m && typeof m.schema === 'object' ? m.schema : undefined, maxTokens: Math.min(1800, Math.max(50, +(m && m.maxTokens) || 700)), temperature: Math.min(1, Math.max(0, +(m && m.temperature) || 0.5)) });
});

ipcMain.handle('modeles:liste', e => { garde(e); return JSON.parse(fs.readFileSync(path.join(MODELES, 'index.json'), 'utf8')); });
ipcMain.handle('modeles:html', (e, id) => {
  garde(e);
  if (!/^[a-z0-9-]+$/.test(String(id))) throw new Error('Modèle inconnu');
  const f = path.join(MODELES, 'html', id + '.html');
  if (!fs.existsSync(f)) throw new Error('Modèle inconnu');
  return { html: fs.readFileSync(f, 'utf8'), legal: fs.readFileSync(path.join(MODELES, 'html', 'legal.html'), 'utf8') };
});

// Écrit le site dans un dossier choisi par l'utilisateur : index.html, mentions-legales.html, polices et styles utilisés, fonctions, notes de livraison
const { composerSite, nomDossier } = require('./composition');
ipcMain.handle('site:enregistrer', async (e, site) => {
  garde(e);
  const nom = nomDossier(site && site.dossier);
  const r = await dialog.showOpenDialog(win, { title: 'Où enregistrer le site ?', defaultPath: app.getPath('documents'), properties: ['openDirectory', 'createDirectory'], buttonLabel: 'Enregistrer ici' });
  if (r.canceled || !r.filePaths[0]) return { annule: true };
  const dest = path.join(r.filePaths[0], nom);
  for (const f of composerSite(site, MODELES)) { const c = path.join(dest, f.chemin); fs.mkdirSync(path.dirname(c), { recursive: true }); fs.writeFileSync(c, f.contenu); }
  return { dossier: dest };
});
// ───────── Mémoire des IA (fichier partagé avec QuentMovie et Studio Posts) ─────────
const Memoire = require('./memoire');
const MEMOIRE = Memoire.creerStockage({ fichier: path.join(os.homedir(), 'Movies', 'QuentMovie', 'memoire-ia.json') });
ipcMain.handle('memoire:lire', e => { garde(e); return MEMOIRE.lire(); });
ipcMain.handle('memoire:ordre', (e, message) => { garde(e); const o = Memoire.detecter(String(message || '').slice(0, 600)); const rep = o ? Memoire.appliquer(MEMOIRE, o, 'Studio Sites') : null; return rep ? { reponse: rep, memoire: MEMOIRE.lire() } : null; });
ipcMain.handle('memoire:oublier', (e, id) => { garde(e); return MEMOIRE.oublierId(String(id)); });
ipcMain.handle('memoire:vider', e => { garde(e); return MEMOIRE.vider(); });
ipcMain.handle('memoire:corrections', (e, paires) => { garde(e); return MEMOIRE.corrections(Array.isArray(paires) ? paires.slice(0, 12) : [], 'Studio Sites'); });

// ───────── GitHub : connexion (jeton ou code « appareil ») et publication du site ─────────
// Le jeton est chiffré par le trousseau de macOS (safeStorage) et ne quitte jamais ce processus : la page ne reçoit que le nom du compte.
const { GitHub } = require('./github');
const FICHIER_GH = () => path.join(app.getPath('userData'), 'github.json');
const lireGh = () => { try { return JSON.parse(fs.readFileSync(FICHIER_GH(), 'utf8')); } catch (er) { return {}; } };
const ecrireGh = o => fs.writeFileSync(FICHIER_GH(), JSON.stringify(o), { mode: 0o600 });
function jetonGh() {
  const o = lireGh(); if (!o.jeton) return '';
  try { return o.chiffre ? safeStorage.decryptString(Buffer.from(o.jeton, 'base64')) : o.jeton; } catch (er) { return ''; }
}
function garderJeton(jeton, login) {
  const o = lireGh();
  if (safeStorage.isEncryptionAvailable()) { o.jeton = safeStorage.encryptString(jeton).toString('base64'); o.chiffre = true; } else { o.jeton = jeton; o.chiffre = false; }
  o.login = login; ecrireGh(o);
}
const etatGh = () => { const o = lireGh(); return { connecte: !!(o.jeton && o.login), login: o.login || '', clientId: o.clientId || '' }; };
let connexionGh = null;
const envoyerGh = (canal, d) => { if (win && !win.isDestroyed()) win.webContents.send(canal, d); };
ipcMain.handle('gh:etat', e => { garde(e); return etatGh(); });
ipcMain.handle('gh:jeton', async (e, jeton) => {
  garde(e); jeton = String(jeton || '').trim();
  if (!/^[\w-]{20,255}$/.test(jeton)) throw new Error('Ce jeton ne ressemble pas à un jeton GitHub.');
  const { login } = await new GitHub({ jeton }).moi(); garderJeton(jeton, login); return etatGh();
});
ipcMain.handle('gh:clientId', (e, id) => { garde(e); id = String(id || '').trim(); if (id && !/^[A-Za-z0-9._-]{8,60}$/.test(id)) throw new Error('Identifiant d’application incorrect.'); const o = lireGh(); o.clientId = id; ecrireGh(o); return etatGh(); });
ipcMain.handle('gh:connecter', async e => {
  garde(e); const id = lireGh().clientId; if (!id) throw new Error('Renseigne d’abord l’identifiant de l’application GitHub (client ID), ou utilise un jeton.');
  const gh = new GitHub(), ap = await gh.appareilDebut(id); connexionGh = { annule: false };
  const suivi = connexionGh;
  if (/^https:\/\/github\.com\//.test(ap.url)) shell.openExternal(ap.url);
  gh.appareilAttente(id, ap, { annule: () => suivi.annule }).then(async jeton => { const { login } = await new GitHub({ jeton }).moi(); garderJeton(jeton, login); envoyerGh('gh:connecte', etatGh()); })
    .catch(er => envoyerGh('gh:connecte', { erreur: er.message }));
  return { code: ap.code, url: ap.url };
});
ipcMain.handle('gh:annuler', e => { garde(e); if (connexionGh) connexionGh.annule = true; return true; });
ipcMain.handle('gh:deconnecter', e => { garde(e); const o = lireGh(); delete o.jeton; delete o.login; delete o.chiffre; ecrireGh(o); return etatGh(); });
ipcMain.handle('gh:publier', async (e, o) => {
  garde(e); const jeton = jetonGh(); if (!jeton) throw new Error('Connecte-toi d’abord à GitHub.');
  const fichiers = composerSite(o && o.site, MODELES).filter(f => !f.local);
  return new GitHub({ jeton }).publier({ nom: String(o && o.nom || ''), fichiers, prive: !!(o && o.prive), pages: !(o && o.pages === false), message: 'Site généré avec Studio Sites', surEtape: t => envoyerGh('gh:etape', t) });
});
ipcMain.handle('gh:ouvrir', (e, url) => { garde(e); if (/^https:\/\/([\w-]+\.github\.io|github\.com)\//.test(String(url))) shell.openExternal(String(url)); });
ipcMain.handle('site:ouvrir', (e, dossier) => { garde(e); if (fs.existsSync(String(dossier))) shell.showItemInFolder(path.join(String(dossier), 'index.html')); });

const page = js => win && win.webContents.executeJavaScript(js).catch(() => {});
function menu() {
  const mac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu', label: 'Studio Sites' }] : []),
    { label: 'Fichier', submenu: [
      { label: 'Générer le site', accelerator: 'CmdOrCtrl+G', click: () => page("document.querySelector('#bGenerer').click()") },
      { label: 'Enregistrer le site…', accelerator: 'CmdOrCtrl+S', click: () => page("document.querySelector('#bEnregistrer').click()") },
      { type: 'separator' }, mac ? { role: 'close', label: 'Fermer la fenêtre' } : { role: 'quit', label: 'Quitter' }] },
    { label: 'Édition', submenu: [{ role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' }, { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }] },
    { label: 'Présentation', submenu: [{ role: 'resetZoom', label: 'Taille réelle' }, { role: 'zoomIn', label: 'Agrandir' }, { role: 'zoomOut', label: 'Réduire' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Plein écran' }] },
    { role: 'windowMenu', label: 'Fenêtre' }
  ]));
}

function ouvrir() {
  win = new BrowserWindow({
    width: 1480, height: 920, minWidth: 1100, minHeight: 680, backgroundColor: '#0f0f13', title: 'Studio Sites',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js'), webviewTag: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.on('closed', () => { win = null; });
  if (process.env.STUDIO_AUTOTEST) autotest();
}

// Essai automatique de l'application construite (workflow, sur un vrai Mac) : STUDIO_AUTOTEST=resultat.json
function autotest() {
  const res = { version: app.getVersion(), electron: process.versions.electron, arch: process.arch };
  const fin = () => { fs.writeFileSync(process.env.STUDIO_AUTOTEST, JSON.stringify(res, null, 2)); app.exit(0); };
  setTimeout(() => { res.erreur = 'délai dépassé'; fin(); }, 120000);
  win.webContents.on('console-message', (e, niveau, msg) => { if (niveau >= 3) (res.erreursConsole = res.erreursConsole || []).push(msg); });
  win.webContents.once('did-finish-load', async () => {
    try {
      res.page = await win.webContents.executeJavaScript(`new Promise(ok => { const t = setInterval(async () => { if (window.sites) { clearInterval(t);
        const modeles = await window.studioSites.modeles(), pont = await window.studioSites.ia.etat(), sorties = [];
        for (const m of modeles) { const r = await window.sites.essai(m.id); sorties.push({ id: m.id, ...r }); }
        const brief = { da: { ambiance: 'luxe', mode: 'sombre', couleur: '#2e7d32', police: 'moderne', arrondi: 'rond', densite: '' }, modules: ['reservation', 'devis', 'chatbot', 'panel', 'whatsapp', 'annonce', 'faq'], options: { reservation: '', firebaseApiKey: 'cle', firebaseProjectId: 'projet', whatsapp: '' }, faq: [], annonce: 'Annonce' };
        const f = { nom: 'Essai', metier: 'restaurateur', ville: 'Lyon', telephone: '04 78 12 34 56', email: 'a@b.fr', services: ['Kebab'], horaires: 'Du mardi au samedi, 11 h - 14 h' };
        const g = await window.sites.genererSite({ fiche: f, modeleId: 'restaurant', ecrire: null, brief }), tour = await Conseiller.tour({ message: 'Ajoute un chatbot, en bleu nuit', historique: [], fiche: f, brief: Conseiller.BRIEF_VIDE(), ecrire: null });
        const fonctions = { modules: !!(window.Modules && Modules.CATALOGUE.length === 7), config: !!(g.html && g.html.includes('qs-config') && g.html.includes('qs-reservation')), admin: Modules.fichiers(f, brief).some(x => x.chemin === 'admin/index.html'), tchat: tour.brief.modules.includes('chatbot') && tour.brief.da.couleur === '#14284b' };
        ok({ modeles: modeles.length, pont: !!pont, sorties, fonctions }); } }, 100); })`);
    } catch (e) { res.erreur = e.message; }
    fin();
  });
}

app.whenReady().then(() => { menu(); ouvrir(); setTimeout(verifierMaj, 8000); setInterval(verifierMaj, 6 * 3600 * 1000); });
app.on('activate', () => { if (!win) ouvrir(); });
app.on('will-quit', () => { if (ia) ia.arreter(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin' || process.env.STUDIO_AUTOTEST) app.quit(); });
void os;
