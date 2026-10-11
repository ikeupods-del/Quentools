// QuentMovie : fenêtre de l'application Mac (Electron) autour du moteur de montage local.
'use strict';
const { app, BrowserWindow, Menu, shell, dialog, session, systemPreferences } = require('electron');
const path = require('path');
const { create } = require('./server');
const { resolveFfmpeg } = require('./ffmpeg-path');
const { Maj, emplacementApp } = require('./maj');

let win = null, moteur = null;
// Mises à jour automatiques : uniquement pour l'application installée sur Mac
const maj = new Maj({ version: app.getVersion(), dossier: path.join(app.getPath('userData'), 'mises-a-jour'), app: emplacementApp(process.execPath), actif: app.isPackaged && process.platform === 'darwin' });
const hooksMaj = {
  etat: () => maj.etat,
  verifier: () => { maj.verifier().then(prevenir); return maj.etat; },
  installer: () => { if (maj.installer(true)) setTimeout(() => app.quit(), 200); return maj.etat; }
};
const prevenir = e => { if (win && e && e.etat === 'pret') win.webContents.executeJavaScript('window.majPrete && majPrete()').catch(() => {}); };
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

async function demarrer() {
  const bins = await resolveFfmpeg();
  const base = path.join(app.getPath('home'), 'Movies', 'QuentMovie');
  let port;
  try { moteur = create({ port: 41730, base, ...bins, maj: hooksMaj }); port = await moteur.start(); }
  catch (e) { moteur = create({ port: 0, base, ...bins, maj: hooksMaj }); port = await moteur.start(); }

  // Caméra et micro (studio, voix off) : autorisés uniquement pour la fenêtre de QuentMovie
  const local = u => /^http:\/\/127\.0\.0\.1:\d+\//.test(u || '');
  session.defaultSession.setPermissionRequestHandler(async (wc, perm, ok, details) => {
    if (perm !== 'media' || !local(wc.getURL())) return ok(false);
    if (process.platform === 'darwin') { // autorisation de macOS (demandée une seule fois)
      const types = (details && details.mediaTypes) || [];
      try {
        if (types.includes('video') && !(await systemPreferences.askForMediaAccess('camera'))) return ok(false);
        if (types.includes('audio') && !(await systemPreferences.askForMediaAccess('microphone'))) return ok(false);
      } catch (e) { /* macOS ancien : la demande passe par Chromium */ }
    }
    ok(true);
  });
  session.defaultSession.setPermissionCheckHandler((wc, perm, origin) => perm === 'media' && local((origin || '') + '/'));

  win = new BrowserWindow({
    width: 1480, height: 920, minWidth: 1100, minHeight: 700, backgroundColor: '#141518', title: 'QuentMovie',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  win.loadURL(`http://127.0.0.1:${port}/`);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('closed', () => { win = null; });
  setTimeout(() => maj.verifier().then(prevenir), 8000); // recherche discrète après le démarrage
  setInterval(() => maj.verifier().then(prevenir), 6 * 3600 * 1000);
}

const js = code => () => win && win.webContents.executeJavaScript(code);
function menu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'QuentMovie', submenu: [{ role: 'about', label: 'À propos de QuentMovie' }, { label: 'Rechercher les mises à jour…', click: js('verifierMaj(true)') }, { type: 'separator' }, { role: 'hide', label: 'Masquer' }, { role: 'quit', label: 'Quitter QuentMovie' }] },
    { label: 'Édition', submenu: [
      { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', click: js('undo(-1)') },
      { label: 'Rétablir', accelerator: 'Shift+CmdOrCtrl+Z', click: js('undo(1)') },
      { type: 'separator' }, { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }] },
    { label: 'Fenêtre', submenu: [{ role: 'minimize', label: 'Réduire' }, { role: 'togglefullscreen', label: 'Plein écran' }, { role: 'toggleDevTools', label: 'Outils de diagnostic' }] }
  ]));
}

app.whenReady().then(async () => {
  menu();
  try { await demarrer(); }
  catch (e) { dialog.showErrorBox('QuentMovie ne peut pas démarrer', e.message); app.quit(); }
});
app.on('window-all-closed', () => { if (moteur) moteur.stop(); app.quit(); });
// Une mise à jour téléchargée s'installe à la fermeture (relancée au prochain démarrage)
app.on('will-quit', () => { maj.installer(false); });
