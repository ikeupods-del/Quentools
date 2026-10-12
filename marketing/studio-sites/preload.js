// Pont entre la page et le Mac : IA locale, modèles, enregistrement du site (la page ne peut ni lancer de programme ni écrire sur le disque).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
let surProgres = null, surMaj = null, surGh = null, surEtapeGh = null;
ipcRenderer.on('gh:connecte', (e, d) => { if (surGh) surGh(d); });
ipcRenderer.on('gh:etape', (e, t) => { if (surEtapeGh) surEtapeGh(t); });
ipcRenderer.on('maj:etat', (e, etat) => { if (surMaj) surMaj(etat); });
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
  ouvrir: dossier => ipcRenderer.invoke('site:ouvrir', dossier),
  memoire: { lire: () => ipcRenderer.invoke('memoire:lire'), ordre: m => ipcRenderer.invoke('memoire:ordre', m), oublier: id => ipcRenderer.invoke('memoire:oublier', id), vider: () => ipcRenderer.invoke('memoire:vider'), corrections: p => ipcRenderer.invoke('memoire:corrections', p) },
  github: {
    etat: () => ipcRenderer.invoke('gh:etat'), jeton: j => ipcRenderer.invoke('gh:jeton', j), clientId: id => ipcRenderer.invoke('gh:clientId', id),
    connecter: () => ipcRenderer.invoke('gh:connecter'), annuler: () => ipcRenderer.invoke('gh:annuler'), deconnecter: () => ipcRenderer.invoke('gh:deconnecter'),
    publier: o => ipcRenderer.invoke('gh:publier', o), ouvrir: url => ipcRenderer.invoke('gh:ouvrir', url),
    surConnexion: cb => { surGh = cb; }, surEtape: cb => { surEtapeGh = cb; }
  },
  maj: { etat: () => ipcRenderer.invoke('maj:etat'), verifier: () => ipcRenderer.invoke('maj:verifier'), installer: () => ipcRenderer.invoke('maj:installer'), surChangement: cb => { surMaj = cb; } }
});
