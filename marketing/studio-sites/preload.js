// Pont entre la page et le Mac : IA locale, modèles, enregistrement du site (la page ne peut ni lancer de programme ni écrire sur le disque).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
let surProgres = null;
ipcRenderer.on('ia:progres', (e, p) => { if (surProgres) surProgres(p); });
contextBridge.exposeInMainWorld('studioSites', {
  ia: {
    etat: () => ipcRenderer.invoke('ia:etat'),
    installer: cb => { surProgres = cb; return ipcRenderer.invoke('ia:installer'); },
    ecrire: msg => ipcRenderer.invoke('ia:ecrire', msg)
  },
  modeles: () => ipcRenderer.invoke('modeles:liste'),
  modele: id => ipcRenderer.invoke('modeles:html', id),
  enregistrer: site => ipcRenderer.invoke('site:enregistrer', site),
  ouvrir: dossier => ipcRenderer.invoke('site:ouvrir', dossier)
});
