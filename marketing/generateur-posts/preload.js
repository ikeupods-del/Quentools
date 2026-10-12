// Studio Posts : passerelle entre la page et l'IA locale (processus principal), rien d'autre n'est exposé.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studioIA', {
  etat: () => ipcRenderer.invoke('ia:etat'),
  verifier: () => ipcRenderer.invoke('ia:verifier'),
  generer: options => ipcRenderer.invoke('ia:generer', options),
  surEtape: fn => { ipcRenderer.removeAllListeners('ia:etape'); ipcRenderer.on('ia:etape', (e, x) => fn(x)); }
});
