// Pont entre la page et l'IA locale du Mac (la page ne peut pas lancer de programme elle-même).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
let surProgres = null;
ipcRenderer.on('ia:progres', (e, p) => { if (surProgres) surProgres(p); });
contextBridge.exposeInMainWorld('studioIA', {
  etat: () => ipcRenderer.invoke('ia:etat'),
  installer: cb => { surProgres = cb; return ipcRenderer.invoke('ia:installer'); },
  ecrire: msg => ipcRenderer.invoke('ia:ecrire', msg)
});
contextBridge.exposeInMainWorld('studioPartage', {
  envoyer: fichiers => ipcRenderer.invoke('partage:envoyer', fichiers)
});
contextBridge.exposeInMainWorld('studioMaj', {
  verifier: () => ipcRenderer.invoke('maj:verifier'),
  ouvrir: url => ipcRenderer.invoke('maj:ouvrir', url)
});
