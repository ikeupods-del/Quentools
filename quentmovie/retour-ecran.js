// Retour du propriétaire sur un écran d'un épisode QuentInvest (relecture) : seul cet écran change, puis « Refaire » ne refait que sa réplique.
// Règles sûres d'abord (« pas de phrase en dessous », « sans photo », « plus court », « titre seul »), sinon l'IA locale réécrit les textes ;
// tout texte de l'IA est contrôlé : aucun chiffre absent de la phrase ou de l'écran, pas de « … », longueur raisonnable. Rien de valable : rien ne change.
'use strict';
const FQ = require('./fiche-quentinvest');

const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const SECONDAIRES = ['sous', 'legende', 'texte', 'intro']; // textes sous le titre ou le chiffre
const PRINCIPAUX = ['titre', 'mot', 'valeur', 'avant', 'apres'];
const chiffres = t => (String(t || '').match(/\d[\d\s.,]*/g) || []).map(n => n.replace(/[\s.,]+$/, '').replace(/\s/g, ''));

function texteValide(t, source, max) {
  t = String(t || '').trim();
  if (!t) return true; // champ vidé à la demande
  if (t.length > max || /…|\.\.\./.test(t)) return false;
  const dans = chiffres(source).join(' ');
  return chiffres(t).every(n => dans.includes(n));
}

// demande comprise sans IA : { ecran, sansFond, fait } ou null
function regles({ champs, points, demande, photo }) {
  const d = norm(demande), ecran = {}, fait = [];
  let sansFond = false;
  if (/(sans|enleve|retire|supprime|pas de|plus de|vire).{0,12}(photo|image|fond)/.test(d)) { if (photo) { sansFond = true; fait.push('photo de fond retirée'); } }
  if (/(sans|enleve|retire|supprime|pas de|plus de|vire|efface).{0,20}(phrase|texte|legende|sous[- ]?titre|ligne|explication)|(phrase|texte|legende).{0,25}(en dessous|dessous|sert a rien|inutile|aucun sens|n'?a pas de sens|pas de sens)|titre seul|chiffre seul/.test(d)) {
    for (const k of SECONDAIRES) if (typeof champs[k] === 'string' && champs[k]) { ecran[k] = ''; }
    if (Object.keys(ecran).length) fait.push('texte sous le titre retiré');
  }
  if (/plus court|raccourci|trop long|moins de texte|resume/.test(d)) {
    for (const [k, v] of Object.entries(champs)) if (k !== 'source' && typeof v === 'string' && v.length > 25 && !(k in ecran)) { const r = FQ.resumer(v, Math.max(20, Math.round(v.length * 0.6))); if (r && r !== v) ecran[k] = r; }
    if (points) { const l = points.map(x => FQ.resumer(x, Math.max(18, Math.round(x.length * 0.6)))); if (l.join() !== points.join()) ecran.points = l; }
    if (Object.keys(ecran).length) fait.push('textes raccourcis');
  }
  return fait.length ? { ecran, sansFond, fait } : null;
}

async function corriger({ type, champs, points, phrase, demande, photo, sujet }, retoucher) {
  const r = regles({ champs, points, demande, photo });
  if (r) return { ok: true, ecran: r.ecran, sansFond: r.sansFond, message: r.fait.join(', '), ia: false };
  if (!retoucher) return { ok: false, message: 'Je n’ai pas compris sans l’IA locale : dis par exemple « pas de phrase en dessous », « plus court » ou « sans photo », ou corrige le texte avec 🖼.' };
  const x = await retoucher({ type, champs, points, phrase, demande, sujet }).catch(() => ({ ia: false }));
  if (!x || !x.ia) return { ok: false, message: 'L’IA locale n’est pas disponible : corrige le texte avec 🖼, ou dis « pas de phrase en dessous », « plus court », « sans photo ».' };
  const source = [phrase, ...Object.values(champs), ...(points || [])].join(' '), ecran = {}, refus = [];
  for (const [k, v] of Object.entries(x.ecran || {})) {
    if (k === 'points') { if (Array.isArray(v) && points && v.every(p => texteValide(p, source, 90)) && v.filter(Boolean).length) { const l = v.map(p => String(p).trim()).filter(Boolean); if (l.join() !== points.join()) ecran.points = l; } else if (Array.isArray(v)) refus.push(k); continue; }
    if (!(k in champs) || k === 'source' || typeof v !== 'string') continue;
    const t = v.replace(/\s+/g, ' ').trim().replace(/[.;:]+$/, '');
    if (PRINCIPAUX.includes(k) && !t) { refus.push(k); continue; } // le titre ou le chiffre ne disparaît pas
    if (!texteValide(t, source, Math.max(90, String(champs[k]).length * 1.3))) { refus.push(k); continue; }
    if (t !== champs[k]) ecran[k] = t;
  }
  if (!Object.keys(ecran).length) return { ok: false, message: refus.length ? 'La proposition de l’IA ajoutait des chiffres ou des mots absents de la phrase : refusée. Reformule ta demande ou corrige avec 🖼.' : 'L’IA n’a rien changé : reformule ta demande ou corrige avec 🖼.' };
  return { ok: true, ecran, sansFond: false, message: 'écran réécrit par l’IA', ia: true };
}

module.exports = { corriger, regles, texteValide };
