// Pont entre la page du jeu et le Mac : oracle (IA locale) et mises à jour (la page ne peut pas lancer de programme elle-même).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
let surProgres = null, surMaj = null, surEnergie = null, batterie = null;
ipcRenderer.on('ia:progres', (e, p) => { if (surProgres) surProgres(p); });
ipcRenderer.on('maj:etat', (e, etat) => { if (surMaj) surMaj(etat); });
ipcRenderer.on('energie', (e, b) => { batterie = !!b; if (surEnergie) surEnergie(batterie); });
contextBridge.exposeInMainWorld('paxIA', {
  etat: () => ipcRenderer.invoke('ia:etat'),
  installer: cb => { surProgres = cb; return ipcRenderer.invoke('ia:installer'); },
  ecrire: msg => ipcRenderer.invoke('ia:ecrire', msg)
});
contextBridge.exposeInMainWorld('paxMaj', {
  etat: () => ipcRenderer.invoke('maj:etat'),
  verifier: () => ipcRenderer.invoke('maj:verifier'),
  installer: () => ipcRenderer.invoke('maj:installer'),
  surChangement: cb => { surMaj = cb; }
});
contextBridge.exposeInMainWorld('paxFichiers', { lire: rel => ipcRenderer.invoke('fichier:lire', rel) });
// alimentation du Mac (batterie ou secteur) : le jeu allège son image sur batterie
contextBridge.exposeInMainWorld('paxEnergie', { surChangement: cb => { surEnergie = cb; if (batterie != null) cb(batterie); } });
