// Pax Mythica : fenêtre de l'application Mac (Electron) autour de index.html.
// Le jeu tourne entièrement sur le Mac ; seuls l'oracle (téléchargement unique du modèle) et les mises à jour utilisent internet.
'use strict';
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

let win = null, ia = null;
// oracle : IA locale partagée avec les outils QuenTools (modèle rangé dans ~/Movies/QuentMovie/modeles) ; seule notre page peut l'appeler
const IA = () => ia || (ia = require('./ia-locale').creer());
const depuisNotrePage = e => !!win && e.sender === win.webContents;
ipcMain.handle('ia:etat', e => { if (!depuisNotrePage(e)) throw new Error('refusé'); return IA().etat(); });
ipcMain.handle('ia:installer', async e => { if (!depuisNotrePage(e)) throw new Error('refusé'); await IA().installer(p => { if (!e.sender.isDestroyed()) e.sender.send('ia:progres', p); }); return IA().etat(); });
ipcMain.handle('ia:ecrire', (e, m) => {
  if (!depuisNotrePage(e)) throw new Error('refusé');
  const s = x => String(x || '').slice(0, 12000);
  return IA().ecrire({ systeme: s(m && m.systeme), demande: s(m && m.demande), schema: m && typeof m.schema === 'object' ? m.schema : undefined, maxTokens: Math.min(1200, Math.max(50, +(m && m.maxTokens) || 700)), temperature: Math.min(1, Math.max(0, +(m && m.temperature) || 0.6)) });
});
// mises à jour automatiques (versions publiées dans les Releases) : installées à la fermeture ou au clic sur « Redémarrer »
const { Maj, emplacementApp } = require('./maj');
const maj = new Maj({ nom: 'Pax Mythica', fichier: 'Pax-Mythica', version: app.getVersion(), dossier: path.join(app.getPath('userData'), 'mises-a-jour'), app: emplacementApp(process.execPath), actif: app.isPackaged && process.platform === 'darwin' && !process.env.PAX_AUTOTEST });
const verifierMaj = () => {
  // l'état est envoyé pendant le téléchargement (progression) puis à la fin
  const suivi = setInterval(() => { if (win && !win.isDestroyed()) win.webContents.send('maj:etat', maj.etat); }, 1500);
  return maj.verifier().then(() => { clearInterval(suivi); if (win && !win.isDestroyed()) win.webContents.send('maj:etat', maj.etat); });
};
ipcMain.handle('maj:etat', e => { if (!depuisNotrePage(e)) throw new Error('refusé'); return maj.etat; });
ipcMain.handle('maj:verifier', e => { if (!depuisNotrePage(e)) throw new Error('refusé'); verifierMaj(); return maj.etat; });
ipcMain.handle('maj:installer', e => { if (!depuisNotrePage(e)) throw new Error('refusé'); if (maj.installer(true)) setTimeout(() => app.quit(), 200); return maj.etat; });
app.on('will-quit', () => { maj.installer(false); if (ia) ia.arreter(); });
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

const page = js => win && win.webContents.executeJavaScript(js).catch(() => {});
const act = nom => page(`window.UI && UI.ACT[${JSON.stringify(nom)}] && UI.ACT[${JSON.stringify(nom)}](document.body)`);
function menu() {
  const mac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu', label: 'Pax Mythica' }] : []),
    { label: 'Partie', submenu: [
      { label: 'Nouvelle partie…', accelerator: 'CmdOrCtrl+N', click: () => act('rapide') },
      { label: 'Partie personnalisée…', accelerator: 'CmdOrCtrl+Shift+N', click: () => act('perso') },
      { type: 'separator' },
      { label: 'Enregistrer…', accelerator: 'CmdOrCtrl+S', click: () => page("UI.j && UI.ecran === 'jeu' && !UI.editeur && UI.ACT.sauver()") },
      { label: 'Charger…', accelerator: 'CmdOrCtrl+O', click: () => act('charger') },
      { label: 'Exporter dans un fichier…', accelerator: 'CmdOrCtrl+E', click: () => page("UI.j && UI.ecran === 'jeu' && UI.ACT.exporter()") },
      { label: 'Ouvrir un fichier de partie…', accelerator: 'CmdOrCtrl+Shift+O', click: () => act('importer') },
      { type: 'separator' },
      { label: 'Réglages et oracle…', accelerator: 'CmdOrCtrl+,', click: () => act('reglages') },
      { label: 'Rechercher les mises à jour…', click: () => act('maj-chercher') },
      { label: 'Menu principal', click: () => act('accueil') },
      { type: 'separator' },
      mac ? { role: 'close', label: 'Fermer la fenêtre' } : { role: 'quit', label: 'Quitter' }
    ] },
    { label: 'Édition', submenu: [
      { role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' },
      { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }
    ] },
    { label: 'Présentation', submenu: [
      { role: 'resetZoom', label: 'Taille réelle' }, { role: 'zoomIn', label: 'Agrandir' }, { role: 'zoomOut', label: 'Réduire' },
      { type: 'separator' }, { role: 'togglefullscreen', label: 'Plein écran' }
    ] },
    { role: 'windowMenu', label: 'Fenêtre' },
    { label: 'Aide', submenu: [{ label: 'Comment jouer', click: () => act('aide') }] }
  ]));
}

function ouvrir() {
  win = new BrowserWindow({
    width: 1480, height: 920, minWidth: 1100, minHeight: 700, backgroundColor: '#120f0b', title: 'Pax Mythica', titleBarStyle: 'hiddenInset',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.on('closed', () => { win = null; });
  if (process.env.PAX_AUTOTEST) autotest();
}

// essai automatique de l'application construite (workflow, sur un vrai Mac) : PAX_AUTOTEST=resultat.json
function autotest() {
  const fs = require('fs'), res = { version: app.getVersion(), electron: process.versions.electron, arch: process.arch };
  const fin = () => { fs.writeFileSync(process.env.PAX_AUTOTEST, JSON.stringify(res, null, 2)); app.exit(0); };
  setTimeout(() => { res.erreur = 'délai dépassé'; fin(); }, 90000);
  win.webContents.on('console-message', (e, niveau, msg) => { if (niveau >= 3) (res.erreursConsole = res.erreursConsole || []).push(msg); });
  win.webContents.once('did-finish-load', async () => {
    try {
      res.jeu = await win.webContents.executeJavaScript(`(async () => {
        await new Promise(ok => { const t = setInterval(() => { if (window.UI && window.PM) { clearInterval(t); ok(); } }, 50); });
        const j = PM.nouvellePartie({ graine: 4242, taille: 'moyenne', nombre: 6, paixInitiale: 600, nations: PM.nationsParDefaut(6, 4242, 'grecs') });
        UI.lancerPartie(j); UI.fermerModal();
        for (let m = 0; m < 120 && UI.j && !UI.j.etat.fin; m++) { UI.unMois(); for (let k = 0; k < 5 && !document.querySelector('#modal').classList.contains('cache'); k++) { const b = document.querySelector('#modalBoite .carte-choix, #modalBoite .choix .btn:not([disabled]), #modalBoite [data-act$=oui], #modalBoite [data-act=fermer]'); if (!b) break; b.click(); } }
        await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
        const v3 = !!(UI.vue3d && UI.mode3d); if (v3) UI.ACT.vue();
        await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
        const cv = document.querySelector('#carte'), px = cv.getContext('2d').getImageData(cv.width / 2, cv.height / 2, 1, 1).data;
        const d = await PM.decret(UI.j, UI.j.etat.joueur, 'prier les dieux', null);
        const copie = PM.charger(JSON.parse(JSON.stringify(UI.j.etat)));
        return { vue3d: v3, mois: UI.j.etat.mois, provinces: UI.j.etat.provinces.length, carteDessinee: px[3] === 255 && (px[0] + px[1] + px[2]) > 0, decret: d.resultats.length > 0, rechargement: copie.carte.provinces.length === UI.j.etat.provinces.length, oracle: !!window.paxIA, maj: !!window.paxMaj };
      })()`);
      if (res.jeu.oracle) res.oracle = await win.webContents.executeJavaScript('window.paxIA.etat()');
    } catch (e) { res.erreur = e.message; }
    fin();
  });
}

app.whenReady().then(() => { menu(); ouvrir(); setTimeout(verifierMaj, 6000); setInterval(verifierMaj, 6 * 3600 * 1000); });
app.on('activate', () => { if (!win) ouvrir(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin' || process.env.PAX_AUTOTEST) app.quit(); });
