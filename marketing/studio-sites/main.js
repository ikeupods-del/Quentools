// Studio Sites : fenêtre de l'application Mac (Electron) autour de index.html.
// Tout reste sur le Mac : l'IA locale (modèle téléchargé une fois), les modèles et les sites créés ; aucune connexion ensuite.
'use strict';
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let win = null, ia = null;
// Nouvelle version : recherche discrète dans les Releases ; la page propose d'ouvrir la page de téléchargement (rien n'est installé tout seul)
ipcMain.handle('maj:verifier', async e => { garde(e); try { return await require('./nouvelle-version').chercher('studio-sites-v', app.getVersion()); } catch (er) { return null; } });
ipcMain.handle('maj:ouvrir', (e, url) => { garde(e); if (/^https:\/\/github\.com\/ikeupods-del\/Quentools\/releases\//.test(String(url))) shell.openExternal(String(url)); });
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

// Écrit le site dans un dossier choisi par l'utilisateur : index.html, mentions-legales.html, polices et styles utilisés, notes de livraison
ipcMain.handle('site:enregistrer', async (e, site) => {
  garde(e);
  const nom = String(site && site.dossier || 'site').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'site';
  const r = await dialog.showOpenDialog(win, { title: 'Où enregistrer le site ?', defaultPath: app.getPath('documents'), properties: ['openDirectory', 'createDirectory'], buttonLabel: 'Enregistrer ici' });
  if (r.canceled || !r.filePaths[0]) return { annule: true };
  const dest = path.join(r.filePaths[0], nom);
  fs.mkdirSync(path.join(dest, 'assets', 'fonts'), { recursive: true });
  const ecrire = (f, t) => fs.writeFileSync(path.join(dest, f), String(t || ''), 'utf8');
  ecrire('index.html', site.index); ecrire('mentions-legales.html', site.legal); ecrire('LISEZMOI-LIVRAISON.txt', site.notes);
  const lesPolices = new Set(); for (const h of [site.index, site.legal]) for (const m of String(h || '').matchAll(/assets\/fonts\/([\w.-]+\.woff2)/g)) lesPolices.add(m[1]);
  for (const f of lesPolices) { const src = path.join(MODELES, 'polices', f); if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, 'assets', 'fonts', f)); }
  for (const f of ['qt.css', 'qt.js']) if ((String(site.index) + String(site.legal)).includes('assets/' + f)) fs.copyFileSync(path.join(MODELES, 'assets', f), path.join(dest, 'assets', f));
  // fichiers des fonctions (panel, règles Firebase, notes) : chemins relatifs sûrs uniquement
  const AUTORISES = new Set(['admin/index.html', 'REGLES-FIRESTORE.txt', 'LISEZMOI-FIREBASE.txt']);
  for (const f of Array.isArray(site.fichiers) ? site.fichiers.slice(0, 6) : []) {
    if (!f || !AUTORISES.has(f.chemin)) continue;
    fs.mkdirSync(path.dirname(path.join(dest, f.chemin)), { recursive: true }); ecrire(f.chemin, f.contenu);
  }
  const disallow = Array.isArray(site.fichiers) && site.fichiers.some(f => f && f.chemin === 'admin/index.html') ? 'Disallow: /admin/\n' : '';
  ecrire('robots.txt', 'User-agent: *\nAllow: /\n' + disallow);
  return { dossier: dest };
});
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

app.whenReady().then(() => { menu(); ouvrir(); });
app.on('activate', () => { if (!win) ouvrir(); });
app.on('will-quit', () => { if (ia) ia.arreter(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin' || process.env.STUDIO_AUTOTEST) app.quit(); });
void os;
