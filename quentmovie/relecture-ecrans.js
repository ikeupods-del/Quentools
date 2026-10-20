// Relecture automatique des écrans d'un épisode QuentInvest, juste avant la fabrication : ce que le propriétaire faisait à l'œil.
// Règles du programme (sûres) : aucun texte qui finit par « … » ou par un petit mot, pas de sous-titre qui répète le titre, pas de titre trop long.
// Puis l'IA locale (si elle est installée) réécrit en quelques mots le titre d'un écran dont la phrase était trop longue ;
// chaque titre proposé est contrôlé : aucun chiffre ni nom absent de la phrase, l'essentiel de ses mots repris d'elle. Sinon le titre du programme reste.
'use strict';
const FQ = require('./fiche-quentinvest'), IM = require('./images');

const phrasesDe = t => (String(t || '').replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]+["»”)]*|[^.!?…]+$/g) || []).map(x => x.trim()).filter(Boolean);
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const PETIT_FINAL = /\s(?:de|du|des|d['’]un|d['’]une|un|une|le|la|les|et|ou|à|au|aux|en|pour|par|avec|dans|que|qui)$/i;

// un titre de l'IA est gardé s'il n'apporte rien qui ne soit dans la phrase
function titreValide(titre, phrase) {
  const t = String(titre || '').trim();
  if (t.length < 8 || t.length > 75 || /…|\.\.\./.test(t) || PETIT_FINAL.test(t) || /["«»]/.test(t)) return false;
  const p = norm(phrase);
  for (const n of t.match(/\d[\d\s.,]*/g) || []) if (!p.includes(norm(n))) return false; // chiffres et dates : seulement ceux de la phrase
  for (const m of t.split(/\s+/).slice(1)) if (/^[A-ZÀ-ÖØ-Þ]/.test(m) && !p.split(' ').includes(norm(m))) return false; // noms propres : seulement ceux de la phrase
  const mots = IM.termes(t), dans = IM.termes(phrase);
  return mots.length > 0 && mots.filter(m => dans.includes(m)).length / mots.length >= 0.6;
}

// écrans de la fiche, avec le texte dit en même temps (accroche, blocs)
function ecransDe(fiche) {
  const l = [];
  if (fiche.accroche && fiche.accroche.ecran && typeof fiche.accroche.ecran === 'object') l.push({ e: fiche.accroche.ecran, texte: fiche.accroche.texte || '', section: '' });
  for (const b of fiche.blocs || []) if (b && b.ecran && typeof b.ecran === 'object') l.push({ e: b.ecran, texte: b.texte || '', section: b.section || '' });
  return l;
}

// titrer(phrases, sujet) → { titres } (IA locale) ; renvoie la liste des corrections, en clair
async function relire(fiche, { titrer = null, job = {} } = {}) {
  const corrections = [];
  const n = FQ.finirEcrans(fiche); if (n) corrections.push(`${n} texte${n > 1 ? 's' : ''} d’écran terminé${n > 1 ? 's' : ''} proprement (sans « … » ni petit mot)`);
  const ecrans = ecransDe(fiche), aTitrer = [];
  let doublons = 0, longs = 0;
  for (const x of ecrans) {
    const e = x.e;
    if (typeof e.titre === 'string' && typeof e.sous === 'string' && e.sous && norm(e.sous).startsWith(norm(e.titre))) { e.sous = ''; doublons++; }
    if (typeof e.titre === 'string' && e.titre.length > 90) { e.titre = FQ.resumer(e.titre, 75); longs++; }
    // titre raccourci par le programme (ni la phrase entière, ni le titre de la partie) : l'IA peut mieux dire l'idée
    const p0 = phrasesDe(x.texte)[0] || '';
    // (un titre écrit à la main, autre chose qu'un morceau de la phrase, est gardé tel quel)
    const morceau = t => { const m = IM.termes(t), d = IM.termes(p0); return norm(p0).startsWith(norm(t)) || (m.length > 0 && m.filter(w => d.includes(w)).length / m.length >= 0.8); };
    if ((!e.type || e.type === 'message') && e.titre && e.titre !== x.section && !/[.!?]$/.test(e.titre) && norm(p0) !== norm(e.titre) && p0.length > e.titre.length + 15 && morceau(e.titre)) aTitrer.push({ e, phrase: p0 });
  }
  // grand chiffre : la légende dit ce que mesure le chiffre en quelques mots, pas toute la phrase dite (recopiée, coupée de son contexte)
  const aLegender = []; let legendes = 0;
  for (const x of ecrans) {
    const e = x.e; if (e.type !== 'chiffre' || typeof e.valeur !== 'string') continue;
    const p = phrasesDe(x.texte).find(t => t.includes(e.valeur.trim())) || phrasesDe(x.texte)[0] || '';
    if (typeof e.legende === 'string' && e.legende.length > 70 && norm(p).includes(norm(e.legende).slice(0, 40))) { e.legende = FQ.legendeChiffre(p, e.valeur.trim()); legendes++; }
    if (p.length > 70 && (!e.legende || norm(p).includes(norm(e.legende)))) aLegender.push({ e, phrase: p });
  }
  if (legendes) corrections.push(`${legendes} légende${legendes > 1 ? 's' : ''} de chiffre raccourcie${legendes > 1 ? 's' : ''} (plus la phrase entière sous le chiffre)`);
  if (doublons) corrections.push(`${doublons} sous-titre${doublons > 1 ? 's' : ''} d’écran qui répétai${doublons > 1 ? 'en' : ''}t le titre retiré${doublons > 1 ? 's' : ''}`);
  if (longs) corrections.push(`${longs} titre${longs > 1 ? 's' : ''} trop long${longs > 1 ? 's' : ''} raccourci${longs > 1 ? 's' : ''}`);
  if (titrer && aTitrer.length) {
    job.step = 'Relecture des écrans par l’IA…';
    let r = null; try { r = await titrer({ phrases: aTitrer.map(x => x.phrase), sujet: fiche.titre || '' }); } catch (e) { r = null; }
    let k = 0; (r && r.titres || []).forEach((t, i) => { if (t && titreValide(t, aTitrer[i].phrase) && t !== aTitrer[i].e.titre) { aTitrer[i].e.titre = t.charAt(0).toUpperCase() + t.slice(1); k++; } });
    if (k) corrections.push(`${k} titre${k > 1 ? 's' : ''} d’écran réécrit${k > 1 ? 's' : ''} par l’IA (idée principale de la phrase)`);
  }
  if (titrer && aLegender.length) {
    job.step = 'Légendes des chiffres par l’IA…';
    let r = null; try { r = await titrer({ phrases: aLegender.map(x => x.phrase), sujet: fiche.titre || '', chiffres: aLegender.map(x => x.e.valeur) }); } catch (e) { r = null; }
    let k = 0; (r && r.titres || []).forEach((t, i) => { if (t && t.length <= 70 && titreValide(t, aLegender[i].phrase) && t !== aLegender[i].e.legende) { aLegender[i].e.legende = t.charAt(0).toUpperCase() + t.slice(1); k++; } });
    if (k) corrections.push(`${k} légende${k > 1 ? 's' : ''} de chiffre écrite${k > 1 ? 's' : ''} par l’IA (ce que mesure le chiffre)`);
  }
  return corrections;
}

module.exports = { relire, titreValide };
