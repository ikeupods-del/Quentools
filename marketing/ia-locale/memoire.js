// Mémoire des IA locales de QuenTools (QuentMovie, Studio Posts, Studio Sites) : un seul fichier partagé sur le Mac, ~/Movies/QuentMovie/memoire-ia.json.
// « Entraîner » une IA locale ici ne modifie pas le modèle : on lui apprend (1) des consignes permanentes (« retiens que… ») et (2) les corrections
// que l'utilisateur apporte à ses textes ; tout est relu et injecté dans chaque demande à l'IA. Les règles des outils (aucun prix inventé, versets de
// la bibliothèque, etc.) passent toujours avant la mémoire. Source unique : marketing/ia-locale/ ; copies par `node tools/synchro-ia-locale.js`.
(function (racine) {
  'use strict';
  const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const MAX_CONSIGNES = 40, MAX_CORRECTIONS = 24;
  const propre = (t, n = 220) => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

  // Reconnaît une instruction de mémoire dans un message : « retiens que… », « n'oublie pas que… », « oublie… », « que retiens-tu ? », « efface ta mémoire »
  function detecter(message) {
    const t = String(message || '').trim(), n = sansAccents(t).replace(/['’]/g, "'");
    if (/^(?:efface|vide|supprime|r[ée]initialise)\s+(?:toute\s+)?(?:ta|la|ma)\s+m[ée]moire\b/.test(n) || /^oublie\s+tout\b/.test(n)) return { type: 'vider' };
    if (/\b(?:que\s+(?:retiens|sais)-tu|qu'as-tu\s+retenu|quelle(?:s)?\s+(?:sont\s+)?(?:les\s+)?consignes?|montre(?:-moi)?\s+(?:ta|la)\s+m[ée]moire|liste\s+(?:de\s+)?(?:ta|la)\s+m[ée]moire)/.test(n)) return { type: 'liste' };
    let m = /^(?:oublie|(?:enl[eè]ve|retire|supprime)\s+(?:de\s+ta\s+m[ée]moire\s+|la\s+consigne\s+|le\s+num[ée]ro\s+))\s*(?:la\s+consigne\s+|le\s+num[ée]ro\s+|n[°o]\s*)?(.{1,160})$/.exec(n);
    if (m && !/\b(?:image|slide|texte|titre|animation|clip|musique|son|fond|calque|piste|bandeau|fonction|page)\b/.test(m[1])) return { type: 'oublier', cible: propre(m[1], 160) };
    m = /^(?:retiens|souviens-toi|rappelle-toi|note|m[ée]morise|n'oublie\s+pas|noublie\s+pas|garde\s+en\s+t[eê]te)\s*(?:bien\s+)?(?:que|qu'|:)?\s*(.{6,400})$/i.exec(t.replace(/’/g, "'"));
    if (m) return { type: 'retenir', texte: propre(m[1].replace(/^(?:que|qu')\s*/i, ''), 220) };
    return null;
  }
  // Bloc ajouté à la consigne système de l'IA ; max : nombre de caractères au plus
  function pourPrompt(memoire, max = 800) {
    const m = memoire || {}, c = (m.consignes || []).map(x => '- ' + x.texte), e = (m.corrections || []).slice(-6).map(x => `- « ${x.avant} » devient « ${x.apres} »`);
    if (!c.length && !e.length) return '';
    let s = 'Mémoire du propriétaire (ses préférences, à respecter tant qu’elles ne contredisent pas les règles ci-dessus : aucun prix, lien, chiffre, verset ou fait inventé) :';
    if (c.length) s += '\n' + c.slice(-12).join('\n');
    if (e.length) s += '\nCorrections qu’il a apportées à des textes écrits par l’IA (imite ce style, ne recopie pas) :\n' + e.join('\n');
    while (s.length > max && (c.length > 1 || e.length > 0)) { if (e.length) e.shift(); else c.shift(); s = 'Mémoire du propriétaire (ses préférences, à respecter tant qu’elles ne contredisent pas les règles ci-dessus : aucun prix, lien, chiffre, verset ou fait inventé) :' + (c.length ? '\n' + c.slice(-12).join('\n') : '') + (e.length ? '\nCorrections qu’il a apportées à des textes écrits par l’IA (imite ce style, ne recopie pas) :\n' + e.join('\n') : ''); }
    return s.slice(0, max + 120);
  }
  // une phrase de mémoire correspond à la demande d'oubli si elle la contient ou si tous ses mots importants s'y trouvent
  function correspondTexte(texte, cible) {
    const t = sansAccents(texte), c = sansAccents(cible).trim(); if (!c) return false; if (t.includes(c)) return true;
    const mots = c.split(/[^a-z0-9]+/).filter(w => w.length > 3); return !!mots.length && mots.every(w => t.includes(w.slice(0, Math.max(4, w.length - 2))));
  }
  // Paires « avant → après » à retenir : seulement de vrais changements de rédaction, courts, sans prix ni lien
  function pairesUtiles(paires) {
    return (paires || []).map(p => ({ avant: propre(p.avant, 160), apres: propre(p.apres, 160) })).filter(p => p.avant.length >= 8 && p.apres.length >= 4 && sansAccents(p.avant) !== sansAccents(p.apres) && !/https?:\/\/|www\.|€|\d{4,}/.test(p.apres));
  }

  // Stockage (Node, processus principal ou serveur local) : un fichier JSON, écriture atomique
  function creerStockage({ fichier }) {
    const fs = require('fs'), path = require('path');
    const vide = () => ({ version: 1, consignes: [], corrections: [] });
    const lire = () => { try { const d = JSON.parse(fs.readFileSync(fichier, 'utf8')); return { ...vide(), ...d, consignes: Array.isArray(d.consignes) ? d.consignes : [], corrections: Array.isArray(d.corrections) ? d.corrections : [] }; } catch (e) { return vide(); } };
    // nom temporaire propre à chaque écriture : deux logiciels qui écrivent en même temps ne mélangent pas leurs fichiers
    const ecrire = d => { fs.mkdirSync(path.dirname(fichier), { recursive: true }); const tmp = `${fichier}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`; try { fs.writeFileSync(tmp, JSON.stringify(d, null, 1)); fs.renameSync(tmp, fichier); } catch (e) { try { fs.unlinkSync(tmp); } catch (e2) { /* rien à retirer */ } throw e; } return d; };
    // relu juste avant d'écrire : une consigne ajoutée entre-temps par un autre logiciel n'est pas perdue
    const modifier = fn => { const d = lire(); const r = fn(d); ecrire(d); return r === undefined ? d : r; };
    const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    return {
      fichier, lire,
      ajouter(texte, source = '') { const t = propre(texte); if (t.length < 6) throw new Error('Phrase trop courte à retenir.'); return modifier(d => { if (!d.consignes.some(x => sansAccents(x.texte) === sansAccents(t))) d.consignes.push({ id: id(), texte: t, source: propre(source, 40), date: new Date().toISOString().slice(0, 10) }); d.consignes = d.consignes.slice(-MAX_CONSIGNES); }); },
      // cible : numéro (1 = première de la liste) ou morceau de phrase ; retourne { memoire, retirees }
      correspond(cible) { const c = String(cible || '').trim(); return lire().consignes.filter((x, i) => /^\d+$/.test(c) ? i === +c - 1 : correspondTexte(x.texte, c)); },
      oublier(cible) { const c = String(cible || '').trim(), n = /^\d+$/.test(c) ? +c : 0; return modifier(d => { const avant = d.consignes.length; d.consignes = d.consignes.filter((x, i) => !(n ? i === n - 1 : correspondTexte(x.texte, c))); return { memoire: d, retirees: avant - d.consignes.length }; }); },
      oublierId(idc) { return modifier(d => { d.consignes = d.consignes.filter(x => x.id !== idc); }); },
      vider() { return ecrire(vide()); },
      corrections(paires, source = '') { const p = pairesUtiles(paires); if (!p.length) return lire(); return modifier(d => { for (const x of p) if (!d.corrections.some(y => sansAccents(y.apres) === sansAccents(x.apres))) d.corrections.push({ ...x, source: propre(source, 40), date: new Date().toISOString().slice(0, 10) }); d.corrections = d.corrections.slice(-MAX_CORRECTIONS); }); }
    };
  }
  // Applique une instruction détectée au stockage et renvoie la phrase à dire à l'utilisateur
  function appliquer(stockage, ordre, source) {
    if (!ordre) return null;
    if (ordre.type === 'retenir') { stockage.ajouter(ordre.texte, source); return `C’est retenu : « ${ordre.texte} ». Je le prendrai en compte dans tous les logiciels.`; }
    if (ordre.type === 'oublier') { if (!stockage.correspond(ordre.cible).length) return null; /* pas une instruction de mémoire : « oublie les blancs » parle du montage */ const r = stockage.oublier(ordre.cible); return `C’est oublié (${r.retirees} consigne${r.retirees > 1 ? 's' : ''} retirée${r.retirees > 1 ? 's' : ''}).`; }
    if (ordre.type === 'vider') { stockage.vider(); return 'Ma mémoire est vide : toutes les consignes et corrections sont effacées.'; }
    if (ordre.type === 'liste') { const d = stockage.lire(); return d.consignes.length || d.corrections.length ? 'Voici ce que je retiens :\n' + d.consignes.map((x, i) => `${i + 1}. ${x.texte}`).join('\n') + (d.corrections.length ? `\n(et ${d.corrections.length} correction${d.corrections.length > 1 ? 's' : ''} de textes apprises)` : '') : 'Je ne retiens encore aucune consigne. Dis par exemple : « retiens que je tutoie toujours ».'; }
    return null;
  }
  const api = { detecter, pourPrompt, pairesUtiles, creerStockage, appliquer, propre };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else racine.Memoire = api;
})(typeof window !== 'undefined' ? window : globalThis);
