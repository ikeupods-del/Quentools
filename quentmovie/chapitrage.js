// QuentMovie : chapitres et « clipping » à partir du texte de la vidéo (sous-titres automatiques).
// Tout est calculé par le programme (sans IA) : l'IA locale ne sert qu'à mieux nommer les chapitres et à départager les meilleurs extraits.
// Entrée : segments [{ s, e, t }] (secondes sur la timeline du montage, texte dit) et durée totale.
'use strict';

const ASCII = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'");
const VIDES = new Set(('alors aussi avec avoir avant apres autre autres bien cela cette ces chez comme dans depuis donc elle elles encore entre etre fait faire leur leurs mais meme moins nous notre pour plus pourquoi quand quel quelle ' +
  'sans sont sous tout tous tres vous votre voila comment ainsi parce peut etait ont cest quil quon quelque quelques cet ete suis sommes etes sera seront serait avez avons avait avaient fois peu beaucoup deja toujours jamais souvent ' +
  'tout toute toutes rien chose choses gens les des une aux par sur est pas que qui quoi dont ici voir veux veut peux fais fait dit dire donne donner aller vais vont allez bon ben euh hein voici ceci celui celle ceux ' +
  'faut falloir il y a on se sa son ses ils je tu me te ne en au du de le la un et ou si ca ce mon ton ma ta mes tes nos vos lui eux moi toi soi c\'est j\'ai n\'est l\'on d\'un d\'une qu\'on qu\'il qu\'elle').split(/\s+/));
// mots de l'oral qui ne disent rien du sujet (« vraiment », « genre », « truc »…) : écartés des mots-clés et du choix du genre
const ORAL = new Set(('vraiment juste genre truc trucs enfin voila ouais oui non okay merci bonjour salut bienvenue coucou super gros grosse petit petite grand grande assez plutot puis maintenant hui demain hier ' +
  'vas allons allait aurait auraient aura auront fallait faudra faudrait pouvez pouvons pourrait pourriez doit doivent devez devons dois doit sais savez savoir sait pense pensez penser crois croire ' +
  'veux voulez vouloir voulais prendre prend prenez mettre met mettez mis mise dis disait disent parler parle parlez regarder regarde regardez trouve trouver trouvez ' +
  'chaque moment moments annee annees jour jours mois semaine semaines gens personne personnes monde coup coups vrai vraie bonne bon bonnes bons meilleur meilleure ' +
  'premier premiere deuxieme dernier derniere seul seule seulement surtout notamment simplement exactement completement totalement absolument forcement evidemment ' +
  'vais etes etait sommes avons avez avoir etre faites faisons ceux celle celles ensuite aussi autant combien beaucoup trop tant tellement vers pendant lorsque puisque').split(/\s+/));
const mots = t => ASCII(t).split(/[^a-z0-9]+/).filter(m => m.length > 2 && !VIDES.has(m) && !ORAL.has(m) && !/^\d+$/.test(m)).map(m => m.replace(/(s|x)$/, ''));
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

// Résumé d'une partie sans IA : sa phrase la plus parlante (mots propres à cette partie), telle qu'elle est dite
function phraseCle(parties, global) {
  const note = p => { const m = mots(p.t); return m.length ? m.reduce((a, w) => a + Math.log(1 + (global.total || 1) / (1 + (global.df.get(w) || 0))), 0) / Math.sqrt(m.length + 2) : 0; };
  const l = parties.filter(p => p.t.length >= 25 && p.t.length <= 220 && !/^(bonjour|salut|merci|abonnez|a bientot)/.test(ASCII(p.t)));
  const best = (l.length ? l : parties).reduce((a, p) => (note(p) > note(a) ? p : a), (l.length ? l : parties)[0]);
  if (!best) return '';
  const t = best.t.replace(/\s+/g, ' ').trim(); return t.length > 180 ? t.slice(0, 177).replace(/\s+\S*$/, '') + '…' : t;
}

// ---------- Analyse du sujet : de quoi parle la vidéo, quel genre, quel rythme (calculé par le programme, l'IA locale peut l'affiner) ----------
const GENRES = [
  { id: 'bourse', nom: 'Bourse et investissement', pack: 'bourse', mots: 'bourse action actions etf dividende dividendes portefeuille investir investissement investisseur marche marches cac krach rendement placement courtier bilan trader trading indice obligations' },
  { id: 'economie', nom: 'Économie', pack: 'economie', mots: 'economie inflation croissance chomage pib recession banque centrale taux interet dette deficit budget impot impots salaire prix pouvoir achat croissance' },
  { id: 'crypto', nom: 'Crypto', pack: 'crypto', mots: 'bitcoin crypto ethereum blockchain wallet token minage altcoin binance halving nft' },
  { id: 'finance-perso', nom: 'Finances personnelles', pack: 'finance-perso', mots: 'epargne livret budget economiser depenses retraite assurance vie pel immobilier credit pret revenus patrimoine' },
  { id: 'entrepreneur', nom: 'Entrepreneuriat', pack: 'entrepreneur', mots: 'entreprise entrepreneur startup business clients client chiffre affaires vendre vente marketing levee fonds fondateur freelance auto-entrepreneur' },
  { id: 'tech', nom: 'Tech', pack: 'tech', mots: 'application logiciel smartphone iphone android ordinateur code programmation intelligence artificielle ia ordi mac windows processeur test appareil gadget mise jour' },
  { id: 'gaming', nom: 'Gaming', pack: 'gaming', mots: 'jeu jeux joueur partie niveau boss manette console stream fortnite minecraft fifa ps5 xbox rang victoire defaite' },
  { id: 'tuto', nom: 'Tutoriel', pack: 'tuto', mots: 'tutoriel etape cliquez cliquer ouvrez ouvrir installer parametres astuce methode apprendre expliquer comment montrer exemple outil' },
  { id: 'podcast', nom: 'Podcast et interview', pack: 'podcast-interview', mots: 'invite interview podcast episode question parcours racontez histoire raconter reponse echange discussion rencontre' },
  { id: 'vlog-voyage', nom: 'Voyage', pack: 'vlog-voyage', mots: 'voyage vacances avion hotel plage ville visite visiter decouvrir pays aeroport train randonnee paysage' },
  { id: 'vlog-food', nom: 'Cuisine et food', pack: 'vlog-food', mots: 'recette cuisine restaurant gout plat manger cuire four ingredients repas gateau delicieux saveur' },
  { id: 'vlog-sport', nom: 'Sport', pack: 'vlog-sport', mots: 'sport entrainement musculation course seance muscle match equipe courir salle exercice cardio' },
  { id: 'vlog-quotidien', nom: 'Vlog du quotidien', pack: 'vlog-quotidien', mots: 'journee matin reveil routine maison soiree vlog quotidien semaine aujourd\'hui' },
  { id: 'beaute', nom: 'Mode et beauté', pack: 'beaute', mots: 'maquillage makeup teint fond rouge levres mascara peau soin soins creme cheveux coiffure tenue look mode vetement vetements robe style tendance parfum ongles' },
  { id: 'immobilier', nom: 'Immobilier', pack: 'immobilier', mots: 'appartement maison piece pieces chambre cuisine salon jardin terrasse metre carre surface loyer locataire proprietaire achat acheter vendre notaire agence visite quartier travaux renovation' },
  { id: 'sante', nom: 'Santé et bien-être', pack: 'sante', mots: 'sante medecin docteur maladie symptome symptomes douleur traitement soin soins sommeil stress alimentation nutrition vitamine bien-etre meditation respiration corps mental poids regime' },
  { id: 'ecole', nom: 'École et cours', pack: 'ecole', mots: 'cours lecon eleve eleves professeur prof classe ecole college lycee examen bac controle exercice exercices revision reviser apprendre comprendre chapitre formule definition' },
  { id: 'eglise', nom: 'Église et spiritualité', pack: 'eglise', mots: 'dieu jesus christ seigneur esprit saint bible verset versets priere prier foi eglise pasteur culte evangile grace amen louange paroisse fidele croyant' },
  { id: 'mariage', nom: 'Mariage et événement', pack: 'mariage', mots: 'mariage maries mariee marie noces ceremonie alliance alliances temoin temoins invites fete reception anniversaire bapteme evenement celebration' },
  { id: 'recit', nom: 'Culture et récit', pack: 'podcast-recit', mots: 'histoire siecle guerre roi reine epoque empire revolution ancien antique legende mystere enquete affaire biographie auteur livre roman film culture' }
];
const STOP_SUJET = new Set('aujourd hui parle regardez voir video chaine abonnez abonne like pouce commentaire commentaires lien description cliquez'.split(' '));

// → { genre:{id,nom,pack,confiance}, motsCles[], sujet, rythme:'rapide'|'normal'|'calme', debit, nbMots, theme:[{mot,n}] } ou null si pas de parole
function analyserSujet(segments, duree) {
  const ph = phrases(segments);
  if (!ph.length) return null;
  const txt = ph.map(p => p.t).join(' '), tousMots = mots(txt).filter(m => !STOP_SUJET.has(m));
  const freq = new Map(); for (const m of tousMots) freq.set(m, (freq.get(m) || 0) + 1);
  const theme = [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([mot, n]) => ({ mot, n }));
  // genre : nombre d'occurrences des mots du lexique (radicaux comparés)
  const rad = m => m.replace(/(s|x)$/, '');
  let meilleur = null;
  for (const g of GENRES) {
    const lex = new Set(ASCII(g.mots).split(/\s+/).map(rad)); let pts = 0;
    for (const [m, n] of freq) if (lex.has(m)) pts += Math.min(n, 6);
    if (!meilleur || pts > meilleur.pts) meilleur = { g, pts };
  }
  const total = Math.max(1, tousMots.length), confiance = meilleur ? Math.min(1, meilleur.pts / Math.max(6, total * 0.04)) : 0;
  const genre = meilleur && meilleur.pts >= 4 ? { id: meilleur.g.id, nom: meilleur.g.nom, pack: meilleur.g.pack, confiance: +confiance.toFixed(2) } : { id: 'general', nom: 'Vidéo générale', pack: 'vlog-quotidien', confiance: 0 };
  const D = Math.max(1, +duree || ph[ph.length - 1].e), nb = nbMots(txt), debit = nb / D;
  const forme = r => (String(txt).match(/[\p{L}-]+/gu) || []).find(w => ASCII(w).replace(/(s|x)$/, '') === r) || r; // « d'affaires » → « affaires »
  // expressions de deux mots répétées (« assurance vie », « intelligence artificielle ») : plus parlantes qu'un mot seul
  // (mots vraiment côte à côte dans une phrase, éventuellement reliés par « de » : « chiffre d'affaires », « pouvoir d'achat »)
  const paires = new Map(), utile = w => w && w.length > 2 && !VIDES.has(w) && !ORAL.has(w) && !STOP_SUJET.has(w.replace(/(s|x)$/, '')) && !/^\d+$/.test(w);
  for (const p of ph) {
    const r = ASCII(p.t).replace(/\b([a-z])'/g, '$1 ').split(/[^a-z0-9]+/).filter(Boolean);
    for (let i = 0; i < r.length - 1; i++) {
      const j = ['de', 'd', 'du'].includes(r[i + 1]) ? i + 2 : i + 1;
      if (!utile(r[i]) || !utile(r[j])) continue;
      const k = rad(r[i]) + ' ' + rad(r[j]); if (rad(r[i]) !== rad(r[j])) paires.set(k, (paires.get(k) || 0) + 1);
    }
  }
  const expressions = [...paires.entries()].filter(([k, n]) => { const [a, b] = k.split(' '); return n >= 3 && n >= 0.5 * Math.min(freq.get(a) || n, freq.get(b) || n); })
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k.split(' '));
  const cles = [], pris = new Set();
  for (const [a, b] of expressions) { cles.push(`${forme(a)} ${forme(b)}`); pris.add(a); pris.add(b); }
  for (const t of theme) { if (cles.length >= 6) break; if (!pris.has(t.mot)) { cles.push(forme(t.mot)); pris.add(t.mot); } }
  const second = GENRES.map(g => { const lex = new Set(ASCII(g.mots).split(/\s+/).map(rad)); let pts = 0; for (const [m, n] of freq) if (lex.has(m)) pts += Math.min(n, 6); return { g, pts }; }).sort((a, b) => b.pts - a.pts)[1];
  return { genre, genreProche: second && second.pts >= 4 ? { id: second.g.id, nom: second.g.nom, pack: second.g.pack } : null, motsCles: cles.slice(0, 6).map(w => w.toLowerCase()), theme,
    sujet: cles.slice(0, 3).join(', '), rythme: debit > 2.8 ? 'rapide' : debit < 1.6 ? 'calme' : 'normal', debit: +debit.toFixed(2), nbMots: nb };
}

// Extraits de toute la vidéo pour l'IA : la parole est découpée en parts égales dans le temps (début, milieu, fin…),
// chacune résumée par ses premières phrases et datée [mm:ss]. Avant, seul le début d'une longue vidéo était lu.
function echantillon(segments, duree, budget = 4200, parts = 10) {
  const ph = phrases(segments); if (!ph.length) return '';
  const D = Math.max(+duree || 0, ph[ph.length - 1].e), mmss = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const tout = ph.map(p => p.t).join(' ');
  if (tout.length <= budget) return ph.map(p => `[${mmss(p.s)}] ${p.t}`).join('\n');
  const n = Math.max(3, Math.min(parts, Math.round(D / 60) || parts)), part = Math.floor(budget / n) - 10, out = [];
  for (let k = 0; k < n; k++) {
    const a = D * k / n, b = D * (k + 1) / n, dans = ph.filter(p => p.s >= a && p.s < b); if (!dans.length) continue;
    // dernière part : ses dernières phrases (la conclusion) ; les autres : leurs premières phrases
    const fin = k === n - 1, l = fin ? dans.slice().reverse() : dans; let t = '', d0 = l[0];
    for (const p of l) { if (t.length + p.t.length > part) { if (!t) t = p.t.slice(0, part); break; } t = fin ? p.t + (t ? ' ' + t : '') : t + (t ? ' ' : '') + p.t; d0 = p; }
    out.push(`[${mmss((fin ? d0 : dans[0]).s)}] ${t}`);
  }
  return out.join('\n');
}
// Part des mots importants d'une phrase de l'IA qui sont vraiment dans la vidéo (0 à 1) : écarte ce qui serait inventé
function ancrage(phrase, segments) {
  const m = mots(phrase); if (!m.length) return 1;
  const dits = new Set(mots((segments || []).map(x => x.t).join(' ')));
  return m.filter(w => dits.has(w)).length / m.length;
}

// pondération par le sujet : part des mots-clés de la vidéo présents dans un texte (0 à 1)
function pertinence(texte, analyse) {
  if (!analyse || !analyse.theme || !analyse.theme.length) return 0;
  const m = new Set(mots(texte)); let p = 0, tot = 0;
  analyse.theme.forEach((t, i) => { const w = 1 - i * 0.06; tot += w; if (m.has(t.mot)) p += w; });
  return tot ? p / tot : 0;
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
    return { t: k ? +c.t.toFixed(2) : 0, titre: nom, resume: phraseCle(parties[k], global), texte: parties[k].map(x => x.t).join(' ').slice(0, 700) };
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
      if (o.analyse) score += pertinence(txt, o.analyse) * 2.4; // extraits qui portent le sujet de la vidéo
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

module.exports = { analyserSujet, pertinence, echantillon, ancrage, GENRES, phrases, proposerChapitres, proposerMoments, titreAccroche, segmentsDuProjet, mots };
