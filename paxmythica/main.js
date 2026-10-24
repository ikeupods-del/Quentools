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
// ressources graphiques du jeu (textures, ciels, modèles) : lecture seule, uniquement dans le dossier ressources/ de l'application
ipcMain.handle('fichier:lire', (e, rel) => {
  if (!depuisNotrePage(e)) throw new Error('refusé');
  const base = path.join(__dirname, 'ressources'), p = path.resolve(base, String(rel || '').replace(/^ressources[\\/]/, ''));
  if (!p.startsWith(base + path.sep)) throw new Error('refusé');
  return require('fs').promises.readFile(p);
});
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
  setTimeout(() => { res.erreur = 'délai dépassé'; fin(); }, 300000);
  // Electron récent : un seul objet (level « error ») ; ancien : (événement, niveau 3, message)
  win.webContents.on('console-message', (e, niveau, msg) => { const lv = e && e.level != null ? e.level : niveau, m = e && e.message != null ? e.message : msg; if (lv === 'error' || lv >= 3) (res.erreursConsole = res.erreursConsole || []).push(String(m).slice(0, 600)); });
  win.webContents.once('did-finish-load', async () => {
    try {
      res.jeu = await win.webContents.executeJavaScript(`(async () => {
        await new Promise(ok => { const t = setInterval(() => { if (window.UI && window.PM) { clearInterval(t); ok(); } }, 50); });
        const j = PM.nouvellePartie({ graine: 4242, taille: 'moyenne', nombre: 6, paixInitiale: 600, nations: PM.nationsParDefaut(6, 4242, 'grecs') });
        UI.lancerPartie(j); UI.fermerModal();
        for (let m = 0; m < 120 && UI.j && !UI.j.etat.fin; m++) { UI.unMois(); for (let k = 0; k < 5 && !document.querySelector('#modal').classList.contains('cache'); k++) { const b = document.querySelector('#modalBoite .carte-choix, #modalBoite .choix .btn:not([disabled]), #modalBoite [data-act$=oui], #modalBoite [data-act=fermer]'); if (!b) break; b.click(); } }
        await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
        const v3 = !!(UI.vue3d && UI.mode3d); let packs = 0;
        // packs graphiques et qualités sur le vrai Mac (avec sa carte graphique)
        if (v3) { for (const q of ['ultra', 'haute']) { UI.vue3d.appliquerQualite(q); for (const id of Object.keys(PM.PACKS_GRAPHIQUES)) { UI.vue3d.appliquerPack(id); UI.vue3d.stabiliser(); UI.vue3d.dessiner(16); UI.vue3d.dessiner(16); packs++; } } UI.vue3d.appliquerPack('olympe'); UI.vue3d.appliquerQualite('haute'); }
        if (v3) UI.ACT.vue();
        await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
        const cv = document.querySelector('#carte'), px = cv.getContext('2d').getImageData(cv.width / 2, cv.height / 2, 1, 1).data;
        const d = await PM.decret(UI.j, UI.j.etat.joueur, 'prier les dieux', null);
        const copie = PM.charger(JSON.parse(JSON.stringify(UI.j.etat)));
        return { vue3d: v3, packs, mois: UI.j.etat.mois, provinces: UI.j.etat.provinces.length, carteDessinee: px[3] === 255 && (px[0] + px[1] + px[2]) > 0, decret: d.resultats.length > 0, rechargement: copie.carte.provinces.length === UI.j.etat.provinces.length, oracle: !!window.paxIA, maj: !!window.paxMaj };
      })()`);
      if (res.jeu.oracle) res.oracle = await win.webContents.executeJavaScript('window.paxIA.etat()');
      // captures de la vue 3D sur la vraie carte graphique du Mac, et temps de calcul d'une image (PAX_CAPTURES=dossier)
      if (process.env.PAX_CAPTURES && res.jeu.vue3d) {
        const dir = process.env.PAX_CAPTURES; fs.mkdirSync(dir, { recursive: true }); res.captures = [];
        await win.webContents.executeJavaScript("window.__erreurs = []; window.addEventListener('error', e => window.__erreurs.push(String(e.message) + ' ' + (e.error && e.error.stack || '').slice(0, 500)))");
        const plans = [['antique', 'olympe', 'haute', 70, 0.9], ['antique', 'olympe', 'haute', 260, -0.4], ['antique', 'olympe', 'ultra', 700, 0.2], ['antique', 'nuit', 'haute', 110, 0.5], ['antique', 'hiver', 'haute', 160, 0.3],
          ['antique', 'crepuscule', 'haute', 140, 1.4], ['antique', 'automne', 'haute', 200, -0.8], ['medieval', 'realiste', 'haute', 120, 0.7], ['futur', 'olympe', 'haute', 120, 0.6], ['futur', 'ragnarok', 'moyenne', 300, 0.2]];
        for (const [e, pk, q, d, l] of plans) {
          const ms = await win.webContents.executeJavaScript(`(async () => {
            if (${JSON.stringify(e)} !== window.__epoque) { window.__epoque = ${JSON.stringify(e)}; UI.lancerPartie(PM.nouvellePartie({ graine: 77, nombre: 6, paixInitiale: 600, epoque: ${JSON.stringify(e)}, nations: PM.nationsParDefaut(6, 77, 'grecs') })); UI.fermerModal(); UI.ACT.vitesse({ dataset: { v: 0 } });
              const N = UI.j.etat.nations[0]; N.res = { nourriture: 9e4, bois: 9e4, or: 9e4, faveur: 200 }; N.age = 1; for (const b of ['mine', 'scierie', 'temple', 'ferme', 'remparts']) PM.construire(UI.j, 0, N.capitale, b); PM.developper(UI.j, 0, N.capitale); PM.developper(UI.j, 0, N.capitale); }
            if (!UI.mode3d) UI.ACT.vue(); const v = UI.vue3d; await v.chargement;
            v.appliquerQualite(${JSON.stringify(q)}); v.appliquerPack(${JSON.stringify(pk)}); v.centrerSur(UI.j.etat.nations[0].capitale); v.vise.d = ${d}; v.vise.lacet = ${l}; v.stabiliser();
            await new Promise(r => setTimeout(r, 3000));
            const t = performance.now(); let n = 0; await new Promise(ok => { const f = () => { if (++n < 40) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
            return (performance.now() - t) / 40; })()`);
          const img = await win.webContents.capturePage(), nom = `${e}-${pk}-${q}-${d}.jpg`;
          fs.writeFileSync(path.join(dir, nom), img.toJPEG(80)); res.captures.push({ nom, msParImage: Math.round(ms * 10) / 10, erreurs: await win.webContents.executeJavaScript('(window.__erreurs || []).splice(0)') });
        }
      }
    } catch (e) { res.erreur = e.message; }
    fin();
  });
}

app.whenReady().then(() => { menu(); ouvrir(); setTimeout(verifierMaj, 6000); setInterval(verifierMaj, 6 * 3600 * 1000); });
app.on('activate', () => { if (!win) ouvrir(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin' || process.env.PAX_AUTOTEST) app.quit(); });
