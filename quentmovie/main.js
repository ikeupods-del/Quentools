// QuentMovie : fenêtre de l'application Mac (Electron) autour du moteur de montage local.
'use strict';
const { app, BrowserWindow, Menu, shell, dialog, session } = require('electron');
const path = require('path');
const { create } = require('./server');
const { resolveFfmpeg } = require('./ffmpeg-path');

let win = null, moteur = null;
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

async function demarrer() {
  const bins = await resolveFfmpeg();
  const base = path.join(app.getPath('home'), 'Movies', 'QuentMovie');
  let port;
  try { moteur = create({ port: 41730, base, ...bins }); port = await moteur.start(); }
  catch (e) { moteur = create({ port: 0, base, ...bins }); port = await moteur.start(); }

  // Micro (voix off) : autorisé uniquement pour la fenêtre de QuentMovie
  const local = u => /^http:\/\/127\.0\.0\.1:\d+\//.test(u || '');
  session.defaultSession.setPermissionRequestHandler((wc, perm, ok) => ok(perm === 'media' && local(wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((wc, perm, origin) => perm === 'media' && local((origin || '') + '/'));

  win = new BrowserWindow({
    width: 1480, height: 920, minWidth: 1100, minHeight: 700, backgroundColor: '#141518', title: 'QuentMovie',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  win.loadURL(`http://127.0.0.1:${port}/`);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('closed', () => { win = null; });
}

const js = code => () => win && win.webContents.executeJavaScript(code);
function menu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'QuentMovie', submenu: [{ role: 'about', label: 'À propos de QuentMovie' }, { type: 'separator' }, { role: 'hide', label: 'Masquer' }, { role: 'quit', label: 'Quitter QuentMovie' }] },
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
