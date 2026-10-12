// Studio Posts : fenêtre de l'application Mac (Electron) autour de index.html.
// Tout reste sur le Mac : projets enregistrés dans le stockage de l'application ; seule connexion : le téléchargement
// unique du modèle de l'IA locale (sauf s'il est déjà là grâce à QuentMovie).
'use strict';
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

// Génération automatique par l'IA locale (ia.js : modèle, generer.js : textes et règles)
let ia = null, gen = null;
function iaPrete() {
  if (!ia) { ia = require('./ia').creer({ dossier: app.getPath('userData') }); gen = require('./generer').creer({ demander: m => ia.demander(m) }); }
  return ia;
}
const etapeVers = sender => x => { try { sender.send('ia:etape', x); } catch (e) { /* fenêtre fermée */ } };
ipcMain.handle('ia:etat', () => iaPrete().etat());
ipcMain.handle('ia:verifier', async () => { try { return await iaPrete().verifier(); } catch (e) { return { ok: false, erreur: e.message }; } });
ipcMain.handle('ia:generer', async (e, options = {}) => {
  const etape = etapeVers(e.sender);
  try {
    if (!iaPrete().etat().installee) {
      etape({ texte: 'Téléchargement de l’IA locale (≈ 2,5 Go, une seule fois)…', progres: 0 });
      await ia.installer(p => etape({ texte: `Téléchargement de l’IA locale (une seule fois) : ${Math.round(p * 100)} %`, progres: p }));
    }
    etape({ texte: 'Démarrage de l’IA locale…' });
    return { ok: true, publication: await gen.generer({ ...options, etape: texte => etape({ texte }) }) };
  } catch (err) { return { ok: false, erreur: err.message }; }
});
app.on('will-quit', () => { if (ia) ia.fermer(); });

let win = null;
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

// Annuler / rétablir : dans un champ de texte, l'annulation du champ ; ailleurs, celle de la publication
const page = js => win && win.webContents.executeJavaScript(js).catch(() => {});
function menu() {
  const mac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu', label: 'Studio Posts' }] : []),
    { label: 'Fichier', submenu: [
      { label: 'Générer une publication', accelerator: 'CmdOrCtrl+G', click: () => page("document.querySelector('#bGenerer').click()") },
      { label: 'Nouvelle publication…', accelerator: 'CmdOrCtrl+N', click: () => page("document.querySelector('#bNouveau').click()") },
      { label: 'Bibliothèque…', accelerator: 'CmdOrCtrl+B', click: () => page("document.querySelector('#bBiblio').click()") },
      { type: 'separator' },
      { label: 'Ouvrir un projet…', accelerator: 'CmdOrCtrl+O', click: () => page("document.querySelector('#bOuvrir').click()") },
      { label: 'Enregistrer le projet…', accelerator: 'CmdOrCtrl+Shift+S', click: () => page("document.querySelector('#bJson').click()") },
      { type: 'separator' },
      { label: 'Exporter l’image', accelerator: 'CmdOrCtrl+E', click: () => page("document.querySelector('#bJpg').click()") },
      { label: 'Exporter tout le carrousel', accelerator: 'CmdOrCtrl+Shift+E', click: () => page("document.querySelector('#bZip').click()") },
      { type: 'separator' },
      mac ? { role: 'close', label: 'Fermer la fenêtre' } : { role: 'quit', label: 'Quitter' }
    ] },
    { label: 'Édition', submenu: [
      { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', click: () => page('window.studioAnnuler && studioAnnuler(false)') },
      { label: 'Rétablir', accelerator: 'Shift+CmdOrCtrl+Z', click: () => page('window.studioAnnuler && studioAnnuler(true)') },
      { type: 'separator' },
      { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' },
      { role: 'selectAll', label: 'Tout sélectionner' },
      { type: 'separator' },
      { label: 'Dupliquer l’image', accelerator: 'CmdOrCtrl+D', click: () => page("document.activeElement.matches('input,textarea,select') || document.querySelector('#iDupliquer').click()") }
    ] },
    { label: 'Présentation', submenu: [
      { role: 'resetZoom', label: 'Taille réelle' }, { role: 'zoomIn', label: 'Agrandir' }, { role: 'zoomOut', label: 'Réduire' },
      { type: 'separator' }, { role: 'togglefullscreen', label: 'Plein écran' }
    ] },
    { role: 'windowMenu', label: 'Fenêtre' }
  ]));
}

function ouvrir() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 680, backgroundColor: '#0f0f13', title: 'Studio Posts',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.on('closed', () => { win = null; });
  if (process.env.STUDIO_AUTOTEST) autotest();
}

// Essai automatique de l'application construite (workflow, sur un vrai Mac) : STUDIO_AUTOTEST=resultat.json
function autotest() {
  const fs = require('fs'), res = { version: app.getVersion(), electron: process.versions.electron, arch: process.arch };
  const fin = () => { fs.writeFileSync(process.env.STUDIO_AUTOTEST, JSON.stringify(res, null, 2)); app.exit(0); };
  setTimeout(() => { res.erreur = 'délai dépassé'; fin(); }, 60000);
  win.webContents.on('console-message', (e, niveau, msg) => { if (niveau >= 3) (res.erreursConsole = res.erreursConsole || []).push(msg); });
  win.webContents.once('did-finish-load', async () => {
    try {
      res.page = await win.webContents.executeJavaScript(`new Promise(ok => { const t = setInterval(() => { if (window.studio) { clearInterval(t);
        const trop = [];
        for (const m of ['parvis', 'quentools']) for (const x of studio.MODELES[m]) for (const f of ['45', '11', '916']) x.slides.forEach((s, i) => { if (studio.rendre({ ...x, marque: m, format: f }, i).trop) trop.push(m + ' ' + x.nom + ' ' + f); });
        studioIA.verifier().then(ia => ok({ ia, polices: document.fonts.check('800 40px QBric') && document.fonts.check('italic 500 40px QPlay'), modeles: studio.MODELES.parvis.length + studio.MODELES.quentools.length, bibliotheque: BIBLIOTHEQUE.parvis.length + BIBLIOTHEQUE.quentools.length, captures: Object.keys(window.CAPTURES || {}).length, bouton: !document.querySelector('#genGroupe').hidden, trop })); } }, 100); })`);
    } catch (e) { res.erreur = e.message; }
    fin();
  });
}

app.whenReady().then(() => { menu(); ouvrir(); });
app.on('activate', () => { if (!win) ouvrir(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin' || process.env.STUDIO_AUTOTEST) app.quit(); });
