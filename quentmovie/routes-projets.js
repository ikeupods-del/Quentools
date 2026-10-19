// Tableau des projets : liste calculée en lisant les fichiers .qmovie (aucun rendu), lien export ↔ projet (exports/index.json),
// place prise sur le disque, rangement des caches recréables, duplication et suppression d'un projet.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const NON = Symbol('non traité');

const empreinte = txt => crypto.createHash('sha1').update(String(txt)).digest('hex');
const lireIndex = EXPORTS => { try { const j = JSON.parse(fs.readFileSync(path.join(EXPORTS, 'index.json'), 'utf8')); return j && typeof j === 'object' ? j : {}; } catch (e) { return {}; } };
// à la fin d'un export réussi : { fichier: { projet, date, empreinteProjet, extrait? } } ; les fichiers disparus sont oubliés
function noterExport(EXPORTS, fichier, { projet, empreinteProjet, extrait }) {
  const idx = lireIndex(EXPORTS);
  for (const n of Object.keys(idx)) if (!fs.existsSync(path.join(EXPORTS, n))) delete idx[n];
  idx[fichier] = { projet, date: Date.now(), empreinteProjet, ...(extrait ? { extrait: true } : {}) };
  const f = path.join(EXPORTS, 'index.json'), tmp = f + '.part';
  try { fs.writeFileSync(tmp, JSON.stringify(idx, null, 1)); fs.renameSync(tmp, f); } catch (e) { /* lien facultatif */ }
}
// taille d'un dossier (récursive)
function taille(dir) {
  let t = 0;
  try { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) t += taille(f); else { try { t += fs.statSync(f).size; } catch (er) { /* retiré entre-temps */ } } } } catch (e) { /* absent */ }
  return t;
}
const dureeClip = c => (c.kind === 'image' || c.kind === 'solid') ? (+c.dur || 3) : Math.max(0, (+c.out || 0) - (+c.in || 0)) / (+c.speed || 1);
const infos = new Map(); // fichier → { cle (taille + date), infos } : un projet inchangé n'est pas relu

function creer({ BASE, EXPORTS, PROJETS, TMP, send, readJson, mediaPath, projFile, occupe }) {
  const CACHES = () => [
    { id: 'rendu', nom: 'Rendus en cache', dir: path.join(BASE, '.cache-rendu'), occupe: true },
    { id: 'lecture', nom: 'Copies de lecture', dir: path.join(TMP, 'proxies'), occupe: false },
    { id: 'timeline', nom: 'Images de la timeline', dir: path.join(BASE, '.cache-timeline'), occupe: false },
    { id: 'vignettes', nom: 'Vignettes de photos', dir: path.join(BASE, 'cache-vignettes'), occupe: false },
    { id: 'apercus', nom: 'Aperçus', dir: path.join(TMP, 'apercus'), occupe: true }
  ];
  const nomValide = n => { if (!String(n || '').trim()) return null; const f = projFile(String(n)); return path.dirname(f) === PROJETS ? f : null; };
  function lireProjet(n) {
    const f = path.join(PROJETS, n + '.qmovie'), st = fs.statSync(f), cle = st.size + ':' + st.mtimeMs, c = infos.get(f);
    if (c && c.cle === cle) return { ...c.infos, date: st.mtimeMs };
    let p = null, txt = ''; try { txt = fs.readFileSync(f, 'utf8'); p = JSON.parse(txt); } catch (e) { /* illisible */ }
    const clips = p && Array.isArray(p.clips) ? p.clips : [], c0 = clips.find(x => x && x.kind !== 'audio') || null;
    let vignette = null;
    if (c0 && c0.kind === 'solid') vignette = { couleur: String(c0.color || c0.bgColor || '#20242c').slice(0, 20) };
    else if (c0 && c0.file) { let ok = false; try { ok = fs.existsSync(mediaPath(c0.file)); } catch (e) { /* chemin refusé */ } if (ok) vignette = { file: String(c0.file), t: c0.kind === 'image' ? 0 : +((+c0.in || 0) + 0.5).toFixed(2) }; }
    const r = { nom: n, lisible: !!p && Array.isArray(p.clips), format: p && ['vertical', 'horizontal', 'carre'].includes(p.format) ? p.format : 'vertical',
      duree: +clips.reduce((a, x) => a + dureeClip(x || {}), 0).toFixed(2), clips: clips.length, vignette, empreinte: txt ? empreinte(txt) : '', taille: st.size };
    infos.set(f, { cle, infos: r });
    return { ...r, date: st.mtimeMs };
  }
  function tableau() {
    let noms = []; try { noms = fs.readdirSync(PROJETS).filter(n => n.endsWith('.qmovie')).map(n => n.slice(0, -7)); } catch (e) { /* aucun projet */ }
    const idx = lireIndex(EXPORTS), parProjet = {};
    for (const [fichier, e] of Object.entries(idx)) {
      if (!e || !e.projet) continue; let st; try { st = fs.statSync(path.join(EXPORTS, fichier)); } catch (er) { continue; } // export retiré
      const x = { fichier, date: +e.date || st.mtimeMs, empreinte: e.empreinteProjet || '', extrait: !!e.extrait, taille: st.size };
      const l = parProjet[e.projet] || (parProjet[e.projet] = []); l.push(x);
    }
    const projets = noms.map(n => {
      let p; try { p = lireProjet(n); } catch (e) { return null; }
      const l = (parProjet[n] || []).sort((a, b) => b.date - a.date), complet = l.find(x => !x.extrait) || null;
      // périmé : projet enregistré après son dernier export ; un enregistrement au contenu identique (même empreinte) ne compte pas
      const perime = !!complet && p.date > complet.date && !(complet.empreinte && complet.empreinte === p.empreinte);
      return { ...p, etat: !complet ? 'aucun' : perime ? 'perime' : 'ajour', dernierExport: complet && { fichier: complet.fichier, date: complet.date, taille: complet.taille }, revoir: (l[0] || {}).fichier || null, exports: l.length };
    }).filter(Boolean);
    const caches = CACHES().map(c => ({ id: c.id, nom: c.nom, octets: taille(c.dir) }));
    const exportsOctets = taille(EXPORTS);
    return { projets, chiffres: { projets: projets.length, avecExport: projets.filter(p => p.etat !== 'aucun').length, perimes: projets.filter(p => p.etat === 'perime').length },
      disque: { exports: exportsOctets, caches: caches.reduce((a, c) => a + c.octets, 0), detail: caches } };
  }
  // caches recréables seulement (jamais projets, médias ni exports) ; pendant un rendu, ceux qu'il lit sont laissés
  function ranger() {
    const busy = !!(occupe && occupe()), avant = Date.now(); let gagne = 0, laisses = [];
    const retirer = f => { try { const st = fs.statSync(f); if (st.isDirectory()) { const t = taille(f); fs.rmSync(f, { recursive: true, force: true }); gagne += t; } else { fs.unlinkSync(f); gagne += st.size; } } catch (e) { /* déjà retiré */ } };
    for (const c of CACHES()) {
      if (busy && c.occupe) { laisses.push(c.nom); continue; }
      let l = []; try { l = fs.readdirSync(c.dir); } catch (e) { continue; }
      if (c.id === 'apercus') { // l'aperçu le plus récent peut être en lecture : gardé
        l = l.map(n => ({ n, t: fs.statSync(path.join(c.dir, n)).mtimeMs })).sort((a, b) => b.t - a.t).slice(1).map(x => x.n);
      }
      for (const n of l) if (!/\.part(\.|$)/.test(n)) retirer(path.join(c.dir, n)); // fichier en cours d'écriture : laissé
    }
    // dossiers de travail oubliés (fermeture brutale) : seulement s'ils ont plus de 10 minutes et qu'aucun rendu ne tourne
    if (!busy) { try { for (const n of fs.readdirSync(TMP)) if (/^(job|pv|th)-/.test(n) && avant - fs.statSync(path.join(TMP, n)).mtimeMs > 600e3) retirer(path.join(TMP, n)); } catch (e) { /* rien */ } }
    return { gagne, laisses };
  }
  return async function traiter(req, res, p) {
    if (!p.startsWith('/api/tableau-projets')) return NON;
    if (req.method === 'GET' && p === '/api/tableau-projets') return send(res, 200, tableau());
    if (req.method === 'POST' && p === '/api/tableau-projets/ranger') { const r = ranger(); return send(res, 200, { ...r, disque: tableau().disque }); }
    if (req.method === 'POST' && p === '/api/tableau-projets/dupliquer') {
      const n = String((await readJson(req)).nom || ''), f = nomValide(n);
      if (!f || !fs.existsSync(f)) return send(res, 404, { error: 'Projet introuvable' });
      const racine = path.basename(f, '.qmovie').slice(0, 100); let nom = `${racine} (copie)`;
      for (let k = 2; fs.existsSync(path.join(PROJETS, nom + '.qmovie')); k++) nom = `${racine} (copie ${k})`;
      fs.copyFileSync(f, path.join(PROJETS, nom + '.qmovie'), fs.constants.COPYFILE_EXCL);
      return send(res, 200, { ok: true, nom });
    }
    if (req.method === 'POST' && p === '/api/tableau-projets/supprimer') { // le projet et sa copie .bak ; médias et exports gardés
      const f = nomValide((await readJson(req)).nom);
      if (!f || !fs.existsSync(f)) return send(res, 404, { error: 'Projet introuvable' });
      fs.unlinkSync(f); try { fs.unlinkSync(f + '.bak'); } catch (e) { /* pas de copie */ }
      infos.delete(f);
      return send(res, 200, { ok: true });
    }
    return NON;
  };
}

module.exports = { creer, NON, noterExport, empreinte };
