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
let surMaj = null;
ipcRenderer.on('maj:etat', (e, etat) => { if (surMaj) surMaj(etat); });
contextBridge.exposeInMainWorld('studioMaj', {
  etat: () => ipcRenderer.invoke('maj:etat'),
  verifier: () => ipcRenderer.invoke('maj:verifier'),
  installer: () => ipcRenderer.invoke('maj:installer'),
  surChangement: cb => { surMaj = cb; }
});
contextBridge.exposeInMainWorld('studioMemoire', {
  lire: () => ipcRenderer.invoke('memoire:lire'), ordre: m => ipcRenderer.invoke('memoire:ordre', m), oublier: id => ipcRenderer.invoke('memoire:oublier', id),
  vider: () => ipcRenderer.invoke('memoire:vider'), corrections: p => ipcRenderer.invoke('memoire:corrections', p)
});
