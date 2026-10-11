// QuentMovie : fenêtre de l'application Mac (Electron) autour du moteur de montage local.
'use strict';
const { app, BrowserWindow, Menu, shell, dialog, session, systemPreferences } = require('electron');
const path = require('path');
const { create } = require('./server');
const { resolveFfmpeg } = require('./ffmpeg-path');
const { Maj, emplacementApp } = require('./maj');

let win = null, moteur = null;
// Mises à jour automatiques : uniquement pour l'application installée sur Mac
const maj = new Maj({ version: app.getVersion(), dossier: path.join(app.getPath('userData'), 'mises-a-jour'), app: emplacementApp(process.execPath), actif: app.isPackaged && process.platform === 'darwin' && !process.env.QM_AUTOTEST });
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
  const base = process.env.QM_AUTOTEST && process.env.QM_BASE ? process.env.QM_BASE : path.join(app.getPath('home'), 'Movies', 'QuentMovie');
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
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } // le studio et les rendus continuent si la fenêtre passe derrière
  });
  win.loadURL(`http://127.0.0.1:${port}/`);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('closed', () => { win = null; });
  if (process.env.QM_AUTOTEST) return autotest(port);
  setTimeout(() => maj.verifier().then(prevenir), 8000); // recherche discrète après le démarrage
  setInterval(() => maj.verifier().then(prevenir), 6 * 3600 * 1000);
}

// Essai automatique de l'application installée (workflow de construction, sur un vrai Mac) : QM_AUTOTEST=fichier-resultat.json
async function autotest(port) {
  const fs = require('fs'), res = { version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome, macos: process.getSystemVersion(), arch: process.arch };
  const ecrire = () => { fs.writeFileSync(process.env.QM_AUTOTEST, JSON.stringify(res, null, 2)); app.exit(0); };
  setTimeout(() => { res.erreur = 'délai dépassé'; ecrire(); }, 600000);
  try {
    await new Promise(ok => win.webContents.once('did-finish-load', ok));
    const ex = c => win.webContents.executeJavaScript(c, true);
    await ex('new Promise(r => setTimeout(r, 2500))');
    res.page = await ex('({ version: CAT.version_app, hwenc: CAT.hwenc, sorties: CAT.sorties, medias: medias.length })');
    // enregistrement : formats proposés par la fenêtre
    res.enregistrement = await ex(`['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=h264,opus', 'video/webm;codecs=vp8,opus'].filter(t => MediaRecorder.isTypeSupported(t))`);
    // carte graphique, compositeur et détourage dans son fil (image de test de la bibliothèque)
    res.detourage = await ex(`(async () => {
      await chargerScript('/compositeur.js'); const cv = document.createElement('canvas'), comp = Compositeur.creer(cv); if (!comp) return { webgl2: false };
      const im = new Image(); im.src = '/lib/fonds/quentools-led-h.jpg'; await im.decode();
      const w = new Worker('/detoureur.js'), rep = () => new Promise(ok => { w.onmessage = e => ok(e.data); });
      w.postMessage({ type: 'preparer', modele: 'selfie_multiclass_256x256', gpu: true }); const p = await rep(); const t = [];
      for (let i = 0; i < 12; i++) { const b = await createImageBitmap(im, { resizeWidth: 256, resizeHeight: 256 }); const t0 = performance.now(); w.postMessage({ type: 'image', id: i, image: b, t: performance.now(), roiCle: '', seul: true, nettoyage: true, lissage: 0.3 }, [b]); const r = await rep(); t.push(performance.now() - t0); if (r.type !== 'masque') return { webgl2: true, erreur: r.message }; comp.masque(r.octets, r.w, r.h); comp.dessiner(im); }
      w.terminate(); t.sort((a, b) => a - b);
      return { webgl2: true, gl: (() => { const g = cv.getContext('webgl2'), x = g.getExtension('WEBGL_debug_renderer_info'); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : ''; })(), delegue: p.delegue, msMedian: Math.round(t[6]), msMax: Math.round(t[11]) };
    })()`);
    // prise du studio : image dessinée enregistrée en H.264 par la puce, puis convertie par le moteur
    res.prise = await ex(`(async () => {
      const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g = cv.getContext('2d'); let n = 0;
      const tic = setInterval(() => { g.fillStyle = 'hsl(' + (n++ * 7 % 360) + ',70%,50%)'; g.fillRect(0, 0, 1280, 720); g.fillStyle = '#fff'; g.font = '80px sans-serif'; g.fillText('QuentMovie ' + n, 100, 360); }, 33);
      const ac = new AudioContext(), os = ac.createOscillator(), dst = ac.createMediaStreamDestination(); os.connect(dst); os.start();
      const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=h264,opus', 'video/webm;codecs=vp8,opus'], mime = types.find(t => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(new MediaStream([cv.captureStream(30).getVideoTracks()[0], ...dst.stream.getAudioTracks()]), { mimeType: mime, videoBitsPerSecond: 10e6 }), m = [];
      rec.ondataavailable = e => m.push(e.data); rec.start(1000); await new Promise(r => setTimeout(r, 4000)); await new Promise(r => { rec.onstop = r; rec.stop(); }); clearInterval(tic); os.stop();
      const b = new Blob(m, { type: mime }), nom = 'camera-autotest.' + (/mp4/.test(mime) ? 'mp4' : 'webm'), t0 = performance.now();
      const r = await fetch('/api/import?name=' + nom, { method: 'POST', body: b }), j = await r.json();
      return { mime, octets: b.size, import: r.ok, fichier: j.file, duree: j.duration, conversionMs: Math.round(performance.now() - t0), erreur: j.error };
    })()`);
    // voix naturelle (téléchargée une fois) et reconnaissance dans l'application installée
    res.parole = await ex(`(async () => {
      const e = await (await fetch('/api/parole')).json(); const t0 = performance.now();
      const r = await fetch('/api/parole/essai', { method: 'POST', body: JSON.stringify({ voix: 'siwis', texte: 'Bonjour, ceci est un essai de la voix naturelle dans QuentMovie.' }) }), j = await r.json();
      const res = { dispo: e.dispo, voixMac: e.mac.map(v => v.nom), essai: r.ok ? j.file : j.error, ms: Math.round(performance.now() - t0) };
      if (!r.ok) return res;
      // reconnaissance de la phrase lue (sous-titres automatiques), installée une fois
      const suivre = async id => { for (;;) { await new Promise(x => setTimeout(x, 500)); const k = await (await fetch('/api/job?id=' + id)).json(); if (k.error || k.done) return k; } };
      const inst = await suivre((await (await fetch('/api/parole/installer', { method: 'POST', body: JSON.stringify({ quoi: 'ecoute' }) })).json()).id);
      if (inst.error) return { ...res, ecoute: inst.error };
      const t1 = performance.now(), ec = await suivre((await (await fetch('/api/parole/ecouter', { method: 'POST', body: JSON.stringify({ file: j.file, in: 0, out: 0 }) })).json()).id);
      return { ...res, ecoute: ec.error || ec.resultat.mots.map(m => m.m).join(' '), sousTitres: ec.resultat ? ec.resultat.st.phrase.length : 0, ecouteMs: Math.round(performance.now() - t1) };
    })()`);
  } catch (e) { res.erreur = String(e && e.message || e); }
  ecrire();
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
