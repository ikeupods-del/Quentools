// QuentMovie : chapitres et « clipping » à partir du texte de la vidéo (sous-titres automatiques).
// Tout est calculé par le programme (sans IA) : l'IA locale ne sert qu'à mieux nommer les chapitres et à départager les meilleurs extraits.
// Entrée : segments [{ s, e, t }] (secondes sur la timeline du montage, texte dit) et durée totale.
'use strict';

const ASCII = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'");
const VIDES = new Set(('alors aussi avec avoir avant apres autre autres bien cela cette ces chez comme dans depuis donc elle elles encore entre etre fait faire leur leurs mais meme moins nous notre pour plus pourquoi quand quel quelle ' +
  'sans sont sous tout tous tres vous votre voila comment ainsi parce peut etait ont cest quil quon quelque quelques cet ete suis sommes etes sera seront serait avez avons avait avaient fois peu beaucoup deja toujours jamais souvent ' +
  'tout toute toutes rien chose choses gens les des une aux par sur est pas que qui quoi dont ici voir veux veut peux fais fait dit dire donne donner aller vais vont allez bon ben euh hein voici ceci celui celle ceux ' +
  'faut falloir il y a on se sa son ses ils je tu me te ne en au du de le la un et ou si ca ce mon ton ma ta mes tes nos vos lui eux moi toi soi c\'est j\'ai n\'est l\'on d\'un d\'une qu\'on qu\'il qu\'elle').split(/\s+/));
const mots = t => ASCII(t).split(/[^a-z0-9]+/).filter(m => m.length > 2 && !VIDES.has(m) && !/^\d+$/.test(m)).map(m => m.replace(/(s|x)$/, ''));
const nbMots = t => String(t || '').split(/\s+/).filter(Boolean).length;

// Phrases : on recolle les segments jusqu'à une ponctuation forte ou un long silence
function phrases(segments) {
  const seg = (segments || []).filter(x => x && String(x.t || '').trim() && Number.isFinite(+x.s) && Number.isFinite(+x.e) && +x.e > +x.s).map(x => ({ s: +x.s, e: +x.e, t: String(x.t).trim() })).sort((a, b) => a.s - b.s);
  const out = []; let cur = null;
  for (const x of seg) {
    if (cur && (x.s - cur.e > 0.9 || /[.!?…]["»”)]*$/.test(cur.t) || cur.e - cur.s > 14)) { out.push(cur); cur = null; }
    if (!cur) cur = { s: x.s, e: x.e, t: x.t, pauseAvant: out.length ? Math.max(0, x.s - out[out.length - 1].e) : 0 };
    else { cur.e = x.e; cur.t += ' ' + x.t; }
  }
  if (cur) out.push(cur);
  return out;
}

const cosinus = (a, b) => {
  let p = 0, na = 0, nb = 0;
  for (const [k, v] of a) { na += v * v; if (b.has(k)) p += v * b.get(k); }
  for (const v of b.values()) nb += v * v;
  return na && nb ? p / Math.sqrt(na * nb) : 0;
};
const sac = liste => { const m = new Map(); for (const p of liste) for (const w of mots(p.t)) m.set(w, (m.get(w) || 0) + 1); return m; };

const SIGNAUX_PARTIE = /^(?:(?:alors |et |bon |donc )?(?:passons|passez|venons|abordons|parlons|attaquons|commen[cç]ons|maintenant|ensuite|apres|deuxiemement|troisiemement|premierement|pour finir|pour terminer|enfin|en conclusion|en resume|dernier|derniere|prochaine?|etape|conseil|astuce|point|partie|numero|numéro|premiere|premier|deuxieme|troisieme|quatrieme|cinquieme|sixieme)\b)/;

function titre(texte, rang, total, global) {
  const t = ASCII(texte);
  if (rang === 0 && /(bonjour|salut|bienvenue|aujourd'hui|dans cette video|je vais vous|on va voir)/.test(t.slice(0, 220))) return 'Introduction';
  if (rang === total - 1 && /(en conclusion|pour conclure|pour terminer|pour finir|en resume|n'oubliez pas|abonn|a bientot|merci d'avoir)/.test(t)) return 'Conclusion';
  const f = new Map(); for (const w of mots(texte)) f.set(w, (f.get(w) || 0) + 1);
  const note = [...f.entries()].map(([w, n]) => [w, n * Math.log(1 + (global.total || 1) / (1 + (global.df.get(w) || 0)))]).sort((a, b) => b[1] - a[1]);
  const gardes = note.slice(0, 2).map(x => x[0]);
  if (!gardes.length) return rang === 0 ? 'Introduction' : `Partie ${rang + 1}`;
  // forme lisible : on retrouve un mot entier du texte qui commence par le radical
  const entiers = gardes.map(r => (String(texte).match(/[\p{L}'’-]+/gu) || []).find(w => ASCII(w).replace(/(s|x)$/, '').startsWith(r)) || r);
  const j = entiers.map(w => w.toLowerCase()).join(' et ');
  return j.charAt(0).toUpperCase() + j.slice(1);
}

// → [{ t, titre }] ; le premier chapitre est à 0. nb : nombre souhaité (sinon environ un chapitre par minute et demie)
function proposerChapitres(segments, duree, o = {}) {
  const ph = phrases(segments), D = Math.max(0, +duree || (ph.length ? ph[ph.length - 1].e : 0));
  if (!ph.length || D < 30) return [];
  const voulu = Math.max(3, Math.min(12, Math.round(+o.nb || D / 90)));
  const minLong = Math.max(12, Math.min(40, D / (voulu * 1.6)));
  // coupures possibles : entre deux phrases, notées par la rupture de vocabulaire, le silence et les mots de passage
  const cand = [];
  for (let i = 1; i < ph.length; i++) {
    const g = sac(ph.slice(Math.max(0, i - 4), i)), d = sac(ph.slice(i, i + 4));
    let score = (1 - cosinus(g, d)) + Math.min(1.5, ph[i].pauseAvant) * 0.25;
    if (SIGNAUX_PARTIE.test(ASCII(ph[i].t).replace(/^[^a-z0-9]+/, ''))) score += 0.6;
    cand.push({ i, t: ph[i].s, score });
  }
  const choisis = [{ i: 0, t: 0, score: 9 }];
  for (const c of cand.sort((a, b) => b.score - a.score)) {
    if (choisis.length >= voulu) break;
    if (c.t < minLong || D - c.t < minLong) continue;
    if (choisis.some(x => Math.abs(x.t - c.t) < minLong)) continue;
    choisis.push(c);
  }
  choisis.sort((a, b) => a.t - b.t);
  const global = { total: choisis.length, df: new Map() };
  const parties = choisis.map((c, k) => { const fin = k + 1 < choisis.length ? choisis[k + 1].t : D + 1; return ph.filter(p => p.s >= (k ? c.t : 0) && p.s < fin); });
  parties.forEach(p => { for (const w of new Set(mots(p.map(x => x.t).join(' ')))) global.df.set(w, (global.df.get(w) || 0) + 1); });
  const vus = new Set();
  return choisis.map((c, k) => {
    let nom = titre(parties[k].map(x => x.t).join(' '), k, choisis.length, global);
    if (vus.has(nom)) nom = `${nom} (${k + 1})`; vus.add(nom);
    return { t: k ? +c.t.toFixed(2) : 0, titre: nom, texte: parties[k].map(x => x.t).join(' ').slice(0, 700) };
  });
}

const ACCROCHES = /\b(saviez[- ]vous|attention|erreur|secret|astuce|jamais|personne|pourquoi|comment|voici|regardez|incroyable|surprenant|le plus important|la verite|stop|arretez|gratuit|facile|simple|rapide|vraiment|exactement|meilleure?|pire|danger|piege|conseil)\b/;
const DEPEND = /^(et|mais|donc|alors|parce que|car|puis|ou|du coup|enfin|bref|ensuite|apres|ca|ce|cela)\b/;

// → [{ s, e, t, score, titre }] : meilleurs extraits (de min à max secondes), commençant et finissant sur une phrase entière, sans chevauchement
function proposerMoments(segments, duree, o = {}) {
  const ph = phrases(segments), min = Math.max(8, +o.min || 20), max = Math.max(min + 5, +o.max || 60), nb = Math.max(1, Math.min(12, Math.round(+o.nb || 5)));
  if (!ph.length) return [];
  const globalSac = sac(ph), N = ph.length;
  const cands = [];
  for (let i = 0; i < N; i++) {
    let j = i;
    while (j < N && ph[j].e - ph[i].s < min) j++;
    for (; j < N && ph[j].e - ph[i].s <= max; j++) {
      const f = ph.slice(i, j + 1), s = ph[i].s, e = ph[j].e, d = e - s, txt = f.map(x => x.t).join(' ');
      const parole = f.reduce((a, x) => a + (x.e - x.s), 0), debit = nbMots(txt) / Math.max(1, parole), couverture = parole / d;
      const premiere = ASCII(f[0].t), diff = new Set(mots(txt)).size / Math.max(1, nbMots(txt));
      let score = 0;
      if (/\?/.test(f[0].t) || ACCROCHES.test(premiere)) score += 2.2;
      if (/\d/.test(f[0].t)) score += 0.6;
      if (DEPEND.test(premiere)) score -= 2.5;
      score += Math.min(2, (txt.match(ACCROCHES) ? 1 : 0) + (ASCII(txt).match(new RegExp(ACCROCHES.source, 'g')) || []).length * 0.4);
      score += debit >= 2 && debit <= 4.2 ? 1.2 : debit > 4.2 ? 0.4 : -0.5;
      score += (couverture - 0.6) * 3;
      score += diff * 2.5;
      if (/[.!?…]["»”)]*$/.test(f[f.length - 1].t)) score += 0.8;
      const suite = ph[j + 1]; if (suite && SIGNAUX_PARTIE.test(ASCII(suite.t))) score += 0.6; // finit juste avant une nouvelle partie
      score -= Math.abs(d - Math.min(max, 40)) / 40; // durée proche de 40 s (sans dépasser le maximum)
      cands.push({ s: +s.toFixed(2), e: +e.toFixed(2), t: txt, score: +score.toFixed(3), i, j });
    }
  }
  const pris = [];
  for (const c of cands.sort((a, b) => b.score - a.score)) {
    if (pris.length >= nb) break;
    if (pris.some(p => c.s < p.e + 1 && c.e > p.s - 1)) continue;
    pris.push(c);
  }
  pris.sort((a, b) => a.s - b.s);
  return pris.map((c, k) => ({ ...c, titre: titreAccroche(c.t, k) }));
}

// titre court tiré de la première phrase (retiré des mots de liaison), 60 caractères maximum
function titreAccroche(texte, k = 0) {
  let p = String(texte).split(/(?<=[.!?…])\s+/)[0].replace(/^(et|mais|donc|alors|bon|ben|euh|du coup|en fait|voila)[,\s]+/i, '').trim();
  if (p.length > 60) { p = p.slice(0, 60); p = p.slice(0, Math.max(20, p.lastIndexOf(' '))).replace(/[,;:\s]+$/, '') + '…'; }
  p = p.replace(/[.!]+$/, '');
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : `Extrait ${k + 1}`;
}

// segments de la timeline à partir des clips du projet (sous-titres), en secondes de la timeline
function segmentsDuProjet(proj) {
  const out = []; let st = 0;
  for (const c of proj.clips || []) {
    const d = (c.kind === 'image' || c.kind === 'solid') ? (c.dur || 3) : (c.out - c.in) / (c.speed || 1);
    for (const x of c.subs || []) if (x && String(x.t || '').trim()) out.push({ s: st + +x.s, e: st + Math.min(+x.e, d), t: String(x.t) });
    st += d;
  }
  return out;
}

module.exports = { phrases, proposerChapitres, proposerMoments, titreAccroche, segmentsDuProjet, mots };
