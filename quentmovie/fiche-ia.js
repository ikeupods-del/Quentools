// Brouillon d'une fiche d'épisode QuentInvest à partir d'un sujet : l'article Wikipédia donne les faits, l'IA locale les reformule pour la voix
// (script contrôlé : mêmes noms, dates et chiffres), le programme ajoute la structure (accroche, blocs de 40 mots, écrans, sources, à retenir, TikTok).
// Rien n'est inventé : le piège, la question et le teaser sont des modèles à réécrire ; le contrôle (fiche-quentinvest.js) dit ce qui reste à faire.
'use strict';
const { controler, resumer, resumerDit } = require('./fiche-quentinvest');

const slugDe = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'sujet';
const mots = t => String(t).match(/\S+/g) || [];
const phrases = t => (String(t).match(/[^.!?…]+[.!?…]*/g) || []).map(x => x.trim()).filter(x => x.length > 2);
const maj = t => t.charAt(0).toUpperCase() + t.slice(1);
// n mots au plus (environ 7 caractères par mot) : jamais de phrase coupée au milieu ni de « … » (resumer, fiche-quentinvest.js)
const coupe = (t, n) => (mots(t).length <= n ? String(t) : resumer(t, n * 7)), coupeDit = (t, n) => (mots(t).length <= n ? String(t) : resumerDit(t, n * 7));

// regroupe les phrases d'une scène en blocs de 40 mots au plus (jamais au milieu d'une phrase)
function blocsDe(texte, max = 40) {
  const sortie = []; let cur = [], n = 0;
  for (const p of phrases(texte)) { const k = mots(p).length; if (cur.length && n + k > max) { sortie.push(cur.join(' ')); cur = []; n = 0; } cur.push(p); n += k; }
  if (cur.length) sortie.push(cur.join(' '));
  return sortie;
}
// deux nombres à mettre face à face dans l'accroche (le premier et le plus grand des suivants), pris dans les faits
function chiffreChoc(faits) {
  const nb = []; for (const m of String(faits).matchAll(/(\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,]\d+)?\s?(€|%|euros?|florins?|dollars?|millions?|milliards?)?/g)) { const v = +m[1].replace(/[  ]/g, ''); if (v >= 10 && !(v >= 1000 && v <= 2100 && !m[2])) nb.push({ v, brut: m[0].trim(), u: m[2] || '' }); }
  if (nb.length < 2) return null;
  const a = nb[0], b = nb.slice(1).sort((x, y) => y.v - x.v)[0];
  return a.v === b.v ? null : { avant: a.brut, apres: b.brut, de: a.v, a: b.v };
}

// dépendances injectées : article (titre), faits (article, duree) → [{ section, texte }], ecrire ({ titre, paragraphes, duree }) → { scenes }, source (url)
async function brouillon({ sujet, numero = 99, article, faits, ecrire, url = '' }, job = {}) {
  const etape = (t, p) => { job.step = t; if (p != null) job.progress = p; };
  etape('Lecture de l’article Wikipédia…', 0.05);
  const paragraphes = await faits(article, 380);
  if (!paragraphes.length) throw new Error('Cet article ne contient pas assez de texte pour un épisode.');
  const brut = paragraphes.map(p => p.texte).join(' ');
  etape('L’IA locale reformule les faits pour la voix…', 0.15);
  const r = await ecrire({ titre: article, paragraphes, duree: +process.env.QM_QI_DUREE || 380 }, job); // QM_QI_DUREE : texte plus court pour l'essai réel du workflow (Mac sans puce graphique, voix clonée lente)
  const scenes = (r && r.scenes && r.scenes.length ? r.scenes : paragraphes).filter(s => s.texte);
  etape('Construction de la fiche…', 0.9);
  const blocs = [];
  for (const s of scenes) blocsDe(s.texte).forEach((texte, k) => blocs.push({ section: k === 0 ? coupe(String(s.section || article), 5) : undefined, texte, court: undefined, section0: s.section }));
  const premier = blocs.shift() || { texte: '' }, choc = chiffreChoc(brut), phr = phrases(brut)[0] || '';
  const accrocheTexte = (premier.texte.match(/\?/) ? premier.texte : `${coupeDit(phr, 22)} Est-ce vraiment aussi simple ?`);
  const titre = `${maj(article)} : ce qu'il faut vraiment savoir`;
  const fiche = {
    numero, slug: slugDe(article), titre,
    promesse: coupe(phrases(scenes[0].texte)[0] || titre, 22), description: `Pico explique ${article} d'après Wikipédia : les faits, les chiffres cités par les sources, et ce qu'il faut retenir.`,
    hashtags: `#${slugDe(article).replace(/-/g, '')} #économie #apprendre #QuentInvest`, musique: 'documentaire-doux', musiqueRevelation: 'corporate-lumineux',
    accroche: { texte: accrocheTexte, court: coupeDit(accrocheTexte, 16), ecran: { intro: coupe(phr, 14), avant: choc ? choc.avant : '', apres: choc ? choc.apres : '', ...(choc ? { de: choc.de, a: choc.a } : {}), legende: `Chiffres cités par Wikipédia (${article}).`, source: 'S1 · Wikipédia' }, effet: 'hausse' },
    intro: { texte: `Au programme : ${scenes.slice(0, 4).map(s => String(s.section || '').toLowerCase()).filter(Boolean).join(', ') || 'les faits essentiels'}.`, ecran: { type: 'liste', titre: 'Au programme', points: scenes.slice(0, 4).map(s => coupe(String(s.section || article), 5)) } },
    blocs: blocs.map((b, i) => ({ ...(b.section ? { section: b.section } : {}), texte: b.texte, ...(i % 3 === 0 ? { court: coupeDit(b.texte, 20) } : {}), ecran: b.section || i === 0 ? { type: 'message', titre: coupe(String(b.section || article), 6), sous: coupe(phrases(b.texte)[0] || b.texte, 12), source: 'S1 · Wikipédia' } : '=' })),
    piege: { intro: 'Attention, grain de sable. Il y a trois erreurs courantes.', court: 'Attention, grain de sable : une histoire spectaculaire n\'est pas forcément vraie.', erreurs: [
      { titre: 'Croire sans vérifier', texte: 'Un : croire une histoire spectaculaire sans vérifier ses sources.' }, { titre: 'Généraliser un cas', texte: 'Deux : prendre un cas célèbre pour la règle générale.' }, { titre: 'Confondre prix et valeur', texte: 'Trois : confondre le prix et la valeur.' }] },
    recap: { texte: `Pour résumer. ${scenes.slice(0, 3).map((s, i) => `${['Un', 'Deux', 'Trois'][i]} : ${coupeDit(phrases(s.texte)[0] || '', 18)}`).join(' ')}`, points: scenes.slice(0, 3).map(s => coupe(String(s.section || article), 6)) },
    resume: { texte: `En une phrase : ${coupeDit((phrases(scenes[scenes.length - 1].texte).pop() || '').replace(/^./, c => c.toLowerCase()), 28)}`, court: `En une phrase : ${coupeDit((phrases(scenes[scenes.length - 1].texte).pop() || '').replace(/^./, c => c.toLowerCase()), 16)}` },
    question: 'Et toi, quelle histoire d\'argent aimerais-tu qu\'on vérifie ensuite ?', suite: { titre: 'À définir', texte: 'La prochaine fois : à définir.' },
    sources: [`S1 · Wikipédia, « ${article} »${url ? ' (' + url + ')' : ''}`], sourcesExternes: true,
    miniature: { lignes: titre.toUpperCase().split(' ').reduce((l, w) => { const d = l[l.length - 1]; if (d && (d + ' ' + w).length <= 14 && l.length <= 3) l[l.length - 1] = d + ' ' + w; else l.push(w); return l; }, []).slice(0, 3), accent: article.split(' ')[0].toUpperCase(), bas: choc ? [choc.avant, '→ ' + choc.apres] : ['À compléter'] },
    aCompleter: ['titre', 'accroche (chiffre choc)', 'erreurs du piège', 'question', 'suite']
  };
  // la chaîne attend un écran « = » sans clé superflue ; le contrôle dit tout de suite ce qui manque
  const controle = controler(fiche, { faits: brut });
  etape('Terminé', 1);
  return { fiche, controle, faits: brut.slice(0, 20000) };
}

// « fais une vidéo sur le krach de 2008 » → « le krach de 2008 » (la demande peut aussi être le sujet seul)
function sujetDe(demande) {
  return String(demande || '').replace(/\s+/g, ' ').trim()
    .replace(/^(?:peux-tu |tu peux |pourrais-tu )?(?:(?:me )?(?:fais|fait|faire|crée|créer|cree|prépare|préparer|fabrique|fabriquer|réalise|réaliser)(?:-moi| moi)? |je veux |je voudrais |j['’]aimerais )?(?:une |la |un )?(?:nouvelle )?(?:vidéo|video|épisode|episode)(?: quentinvest| youtube| de pico)? (?:sur|à propos d[eu']|a propos d[eu']|au sujet d[eu']|concernant|qui explique|pour expliquer|expliquant) ?/i, '')
    .replace(/[.!?\s]+$/, '').trim();
}
const lignesMiniature = titre => String(titre).toUpperCase().split(' ').reduce((l, w) => { const d = l[l.length - 1]; if (d && (d + ' ' + w).length <= 14 && l.length <= 3) l[l.length - 1] = d + ' ' + w; else l.push(w); return l; }, []).slice(0, 3);
// Vidéo faite sans relecture : titre tiré du sujet demandé, rien de « à définir » dans le texte dit (la suite devient un appel à s'abonner)
function pourAuto(fiche, sujet) {
  const s = String(sujet || '').trim(), f = { ...fiche };
  if (s.length >= 3) {
    const nom = s.charAt(0).toUpperCase() + s.slice(1);
    f.titre = `${nom} : ce qu'il faut vraiment savoir`;
    f.miniature = { ...f.miniature, lignes: lignesMiniature(nom), accent: (nom.split(' ').find(w => w.length > 3) || nom.split(' ')[0]).toUpperCase() };
  }
  f.suite = { titre: 'La suite', texte: 'Abonne-toi : un nouveau sujet arrive bientôt.' };
  delete f.aCompleter;
  return f;
}

module.exports = { brouillon, blocsDe, chiffreChoc, slugDe, sujetDe, pourAuto };
