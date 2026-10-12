// Studio Sites : fenêtre de l'application Mac (Electron) autour de index.html.
// Tout reste sur le Mac : l'IA locale (modèle téléchargé une fois), les modèles et les sites créés ; aucune connexion ensuite.
'use strict';
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let win = null, ia = null;
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
  ecrire('robots.txt', 'User-agent: *\nAllow: /\n');
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
        ok({ modeles: modeles.length, pont: !!pont, sorties }); } }, 100); })`);
    } catch (e) { res.erreur = e.message; }
    fin();
  });
}

app.whenReady().then(() => { menu(); ouvrir(); });
app.on('activate', () => { if (!win) ouvrir(); });
app.on('will-quit', () => { if (ia) ia.arreter(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin' || process.env.STUDIO_AUTOTEST) app.quit(); });
void os;
