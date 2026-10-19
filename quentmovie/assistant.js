// QuentMovie : assistant de montage. Une demande en français (« coupe les blancs, ajoute des sous-titres et une musique calme »)
// devient une liste d'actions connues, appliquées par l'interface ; et des suggestions tirées de l'état du projet.
// Aucune IA nécessaire ici : l'IA locale (ia.js) ne sert qu'en complément, quand ces règles ne comprennent pas la demande.
'use strict';

// actions connues : identifiant → libellé (montré avant d'appliquer)
const ACTIONS = {
  couper_blancs: 'Couper les blancs et les « euh »',
  niveau_final: 'Régler le volume final comme les réseaux sociaux',
  sous_titres: 'Ajouter les sous-titres automatiques',
  traduire_sous: 'Traduire les sous-titres',
  musique: 'Ajouter une musique de fond',
  retirer_musique: 'Retirer la musique',
  format: 'Changer le format de la vidéo',
  egaliser: 'Égaliser le volume de tous les clips',
  transitions: 'Mettre une transition sur toutes les coupures',
  retirer_transitions: 'Retirer les transitions',
  dynamiser: 'Dynamiser (zoom un plan sur deux)',
  ameliorer: 'Améliorer la qualité de l’image et du son',
  plans: 'Découper aux changements de plan',
  rythme: 'Caler les photos sur le rythme de la musique',
  reperes_rythme: 'Poser des repères sur les temps de la musique',
  titre: 'Ajouter un écran titre au début',
  montage_sujet: 'Analyser la vidéo et la monter selon son sujet (style, musique, son)',
  chapitres: 'Préparer les chapitres YouTube',
  chapitrer: 'Chapitrer la vidéo : titres à l’écran et bruit de clavier',
  clipping: 'Créer des clips TikTok avec les meilleurs passages',
  detacher: 'Détacher le son des vidéos',
  vitesse: 'Changer la vitesse',
  publication: 'Écrire le titre, la description et les hashtags',
  supprimer_clip: 'Supprimer un clip',
  bruitage: 'Ajouter un bruitage',
  couper_a: 'Couper la vidéo à un instant',
  volume: 'Régler le volume des clips',
  fondus: 'Ajouter des fondus au début et à la fin',
  couleur_titre: 'Changer la couleur du titre',
  titre_ici: 'Écrire un texte à l’écran à cet instant',
  note: 'Garder ce commentaire comme note sur la timeline',
  exporter: 'Exporter la vidéo'
};
// langues des sous-titres traduits : mot de la demande → nom montré (le code est retrouvé par l'interface)
const LANGUES_SOUS = { italien: 'italien', italian: 'italien', anglais: 'anglais', english: 'anglais', espagnol: 'espagnol', allemand: 'allemand', portugais: 'portugais', francais: 'français' };
const AMBIANCES = ['calme', 'douce', 'piano', 'dynamique', 'energique', 'epique', 'cinema', 'hip-hop', 'joyeuse', 'triste', 'suspense', 'lofi', 'electro', 'acoustique', 'pop'];
// couleurs comprises pour les titres (mot de la demande → couleur posée)
const COULEURS = { 'bleu clair': '#7cc4ff', jaune: '#ffd400', dore: '#e6b422', or: '#e6b422', rouge: '#ff3b30', orange: '#ff9500', rose: '#ff4fa3', violet: '#a78bfa', bleu: '#3f8cff', vert: '#34c759', blanc: '#ffffff', noir: '#000000', gris: '#9aa0a6' };
const ORDINAUX = { premier: 1, premiere: 1, deuxieme: 2, second: 2, seconde: 2, troisieme: 3, quatrieme: 4, cinquieme: 5, sixieme: 6, septieme: 7, huitieme: 8, neuvieme: 9, dixieme: 10 };
// actions qui peuvent viser un seul clip (« coupe les blancs de la prise 2 »)
const CIBLABLES = new Set(['couper_blancs', 'sous_titres', 'volume', 'vitesse', 'ameliorer', 'detacher']);
// clip visé par la demande : numéro (« prise 2 », « clip 3 », « la deuxième prise »), « dernier », « selection » (« ce clip »), ou rien
function cibleDe(t) {
  let m = /\b(?:prise|clip|plan|sequence|morceau)s?\s*(?:n[o°]?\s*)?(\d{1,2})\b/.exec(t); if (m) return m[1];
  m = new RegExp(`\\b(${Object.keys(ORDINAUX).join('|')})s?\\s+(?:prise|clip|plan|sequence)`).exec(t); if (m) return String(ORDINAUX[m[1]]);
  if (/\b(derniere|dernier)\s+(prise|clip|plan|sequence)/.test(t)) return 'dernier';
  if (/\b(ce|cette)\s+(clip|prise|plan|sequence)\b|\bclip (selectionne|choisi)\b/.test(t)) return 'selection';
  return '';
}
const nomCible = c => c === 'dernier' ? 'dernier clip' : c === 'selection' ? 'clip sélectionné' : 'clip ' + c;
const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'");

// Demande en français → [{ action, parametre, libelle }], dans l'ordre logique du montage
// instant : moment de la vidéo en pause quand la demande a été écrite (commentaire « ici », « à ce moment »)
function comprendre(demande, projet, instant) {
  const t = ' ' + sansAccents(demande).replace(/[^a-z0-9'«»"%,.:\- ]+/g, ' ') + ' ', l = [];
  const ajoute = (action, parametre = '') => { if (!l.some(x => x.action === action)) l.push({ action, parametre: String(parametre), libelle: ACTIONS[action] + (parametre ? ` (${parametre})` : '') }); };
  // « monte ma vidéo » : l'assistant enchaîne lui-même les étapes utiles à CE montage
  if (/(montage (automatique|auto|complet)|monte[- ]?(la|le|moi|ma|mon|mes|les|cette|ces|tout)\b|fais[- ]moi (le|un|mon) montage|auto-?monte|monte (automatiquement|tout))/.test(t) && !/monte[- ]?(le )?son/.test(t)) return planAuto(projet);
  // couleur d'un titre : « mets le titre en jaune », « texte en rouge » (pas un nouvel écran titre)
  const coul = /\b(titres?|textes?)\b/.test(t) && !/sous[- ]?titr/.test(t) && Object.keys(COULEURS).find(k => new RegExp(`\\b(?:en|couleur) ${k}s?\\b`).test(t));
  if (coul) ajoute('couleur_titre', coul);
  const non = mot => new RegExp(`(sans|pas de|enleve|retire|supprime|vire)( les?| la| l'| des| de)? ?${mot}`).test(t);
  if (/\b(blancs?|silences?|euh|hesitations?|temps morts?)\b/.test(t) && !/(sans|pas de|garde|laisse|conserve)( les?| la| l'| des| de)? ?(blancs?|silences?|euh|hesitations?|temps morts?)/.test(t)) ajoute('couper_blancs'); // « supprime les blancs » = les couper
  // « sous-titres en italien », « traduis les sous-titres en anglais » : traduction (créés d'abord s'il n'y en a pas) ; « en français » seul = la langue parlée
  const lg = /(?:sous[- ]?titr|tradu)/.test(t) && Object.keys(LANGUES_SOUS).find(m => new RegExp(`\\b(?:en |in )?${m}s?\\b`).test(t) && (m !== 'francais' || /tradu/.test(t)));
  if (lg && !non('sous[- ]?titr')) ajoute('traduire_sous', LANGUES_SOUS[lg]);
  else if (/sous[- ]?titr/.test(t) && !non('sous[- ]?titr')) ajoute('sous_titres', /tiktok|gros|grand|anime|karaoke|mot a mot/.test(t) ? 'tiktok' : '');
  if (/\b(plans?|changements? de plan|decoupe automatique)\b/.test(t) && /(decoup|detect|separ|coupe)/.test(t) && !/premier plan|arriere[- ]plan|\bplans?\s*(n[o°]?\s*)?\d/.test(t) && !cibleDe(t)) ajoute('plans');
  if (/(detach|separ|extrai)\w* (le |la |du )?(son|audio|piste audio)/.test(t)) ajoute('detacher');
  if (/(ameliore|nettete|debruit|plus net|qualite)/.test(t)) ajoute('ameliorer');
  if (/(egalis|normalis|meme (volume|niveau)|niveau sonore|volume regulier)/.test(t)) ajoute('egaliser');
  if (non('musique')) ajoute('retirer_musique');
  else if (/\b(musique|son de fond|fond sonore|ambiance sonore)\b/.test(t)) ajoute('musique', AMBIANCES.find(a => t.includes(a.replace('-', ''))) || AMBIANCES.find(a => t.includes(a)) || '');
  if (/(rythme|tempo|beat|temps forts?|en musique)/.test(t) && /(cal|synchro|sur le|au rythme)/.test(t)) ajoute(/repere/.test(t) ? 'reperes_rythme' : 'rythme');
  if (non('transitions?')) ajoute('retirer_transitions');
  else if (/\btransitions?\b|\bfondus? enchaines?\b/.test(t)) ajoute('transitions', /glisse|slide/.test(t) ? 'slideleft' : /zoom/.test(t) ? 'zoomin' : /noir/.test(t) ? 'fadeblack' : 'fade');
  if (/(dynamis|plus de rythme|jump ?cut|zooms? altern|punch)/.test(t)) ajoute('dynamiser', /fort|beaucoup/.test(t) ? '135' : /leger|peu/.test(t) ? '110' : '120');
  const vit = /(accelere|ralenti)\w*\s*(?:x|×|fois)?\s*(\d+(?:[.,]\d+)?)?/.exec(t);
  if (vit) ajoute('vitesse', vit[2] ? vit[2].replace(',', '.') : /ralenti/.test(vit[1]) ? '0.5' : '2');
  // retirer un clip : « supprime le dernier clip », « enlève le premier plan », « supprime le clip 2 »
  const sup = /(?:supprim|enlev|retir|vire|efface)\w*\s+(?:le|la|l')?\s*(dernier|derniere|premier|premiere|(?:clip|plan|video)\s*(?:n[o°]?\s*)?(\d{1,2}))\s*(?:clip|plan|video)?/.exec(t);
  if (sup && !/(musique|son\b|transition|titre|sous[- ]?titr|blanc|fondu|zoom|effet)/.test(sup[0]) && /(clip|plan|video)/.test(sup[0])) ajoute('supprimer_clip', sup[2] ? sup[2] : /dernier/.test(sup[1]) ? 'dernier' : 'premier');
  // bruitage : « ajoute un bruit de clavier », « mets un applaudissement », « un whoosh », « un ding »
  const bru = /(?:bruit(?:age)?|son|effet sonore|sound|applaudissements?|whoosh|ding|clic|sonnerie|rire|explosion|tonnerre|gong|cymbale|bip|clavier|camera|appareil photo|jackpot|fanfare|sirene)\b/.exec(t);
  if (bru && /(ajoute|mets|met|insere|colle|place|rajoute|joue|avec)/.test(t) && !/(chapitr|musique|volume|egalis|normalis|detach|extrai|separ|sous[- ]?titr|retire|supprim)/.test(t) && /(bruit|applaudi|whoosh|ding|clic|sonnerie|rire|explosion|tonnerre|gong|cymbale|bip|clavier|appareil|jackpot|fanfare|sirene|effet sonore)/.test(t)) ajoute('bruitage', (/(clavier|applaudi\w*|whoosh|ding|clic|sonnerie|rire|explosion|tonnerre|gong|cymbale|bip|appareil photo|jackpot|fanfare|sirene|hausse|baisse|pieces)/.exec(t) || ['', 'whoosh'])[1]);
  // couper à un instant : « coupe à 10 secondes », « coupe à 1:30 »
  const ICI = /\b(ici|la|a ce moment(?: la)?|a cet (?:endroit|instant)|maintenant|cette image|ce moment|a cette image)\b/;
  const aInstant = instant != null && Number.isFinite(+instant) && +instant >= 0;
  if (aInstant && /(?:coupe|decoupe|separe|scinde|divise)\w*\s+(?:la video\s+|le clip\s+)?(ici|la|a ce moment|maintenant|a cet endroit|a cet instant)\b/.test(t)) ajoute('couper_a', String(+(+instant).toFixed(2)));
  const txtIci = /(?:mets|met|ajoute|ecris|affiche|pose)\w*\s+(?:un |le |du )?(?:titre|texte)\s*(?:«|"|:)\s*([^»"]{1,80})/i.exec(String(demande || ''));
  if (aInstant && txtIci && ICI.test(t)) ajoute('titre_ici', txtIci[1].trim());
  const cou = /(?:coupe|decoupe|separe|scinde|divise)\w*\s+(?:la video\s+|le montage\s+)?(?:a|au|vers)\s+(?:(\d{1,2}):(\d{2})|(\d+(?:[.,]\d+)?)\s*(?:s\b|sec|secondes?)|(\d+)\s*(?:min|minutes?)(?:\s*(\d{1,2}))?)/.exec(t);
  if (cou) ajoute('couper_a', cou[1] ? String(+cou[1] * 60 + +cou[2]) : cou[3] ? cou[3].replace(',', '.') : String(+cou[4] * 60 + (+cou[5] || 0)));
  // volume : « mets le volume à 50 % », « coupe le son », « baisse le volume », « monte le son »
  const volp = /volume|le son\b|niveau sonore/.exec(t) && /(?:a|sur|=)\s*(\d{1,3})\s*(?:%|pour ?cent)?/.exec(t);
  if (/(coupe|mets?|passe)\s+(?:le\s+)?(?:son|volume)\s+(?:a\s+)?(?:zero|0|muet)|\bcoupe\s+le\s+son\b|\b(mute|muet|sans le son)\b/.test(t) && !/musique/.test(t)) ajoute('volume', '0');
  else if (volp && /(volume|le son)/.test(t) && !/musique|egalis|normalis/.test(t)) ajoute('volume', String(Math.min(200, +volp[1])));
  else if (/(baisse|diminue|reduis)\w*\s+(?:un peu\s+)?le\s+(volume|son)/.test(t) && !/musique/.test(t)) ajoute('volume', '60');
  else if (/(monte|augmente|booste)\w*\s+(?:un peu\s+)?le\s+(volume|son)/.test(t) && !/musique/.test(t)) ajoute('volume', '140');
  if (/\bfondus?\b/.test(t) && /(debut|fin|entree|sortie|noir|ouverture|ferm)/.test(t) && !/enchaine/.test(t)) ajoute('fondus');
  if (/\bzoom/.test(t) && !/transition|zoom ?(in|out)? ?(sur|vers)/.test(t) && !l.some(x => x.action === 'dynamiser')) ajoute('dynamiser', /fort|beaucoup/.test(t) ? '135' : '120');
  const veutClips = /\b(clips?|clipping|extraits?|moments? forts?|meilleurs? (passages?|moments?)|shorts)\b/.test(t) && /(cree|genere|fais|sors|extrais|decoupe|trouve|propose|tiktok|reels?|shorts)/.test(t);
  if (veutClips) ajoute('clipping');
  else if (/(vertical|tiktok|reels?|shorts?|9 ?\/ ?16|story|stories)/.test(t) && /(format|passe|mets|en |pour )/.test(t)) ajoute('format', 'vertical');
  else if (/(horizontal|youtube|16 ?\/ ?9|paysage)/.test(t) && /(format|passe|mets|en )/.test(t)) ajoute('format', 'horizontal');
  else if (/\bcarre\b|1 ?\/ ?1/.test(t)) ajoute('format', 'carre');
  const tit = /(?:titre|ecran titre)\s*(?:«|"|:)\s*([^»"]{2,60})/.exec(demande ? sansAccents(demande) : '');
  const titOrig = /(?:titre|écran titre)\s*(?:«|"|:)\s*([^»"]{2,60})/i.exec(String(demande || ''));
  if (!coul && !l.some(x => x.action === 'titre_ici') && (/(ecran titre|titre au debut|ajoute (un|le) titre|mets (un|le) titre)/.test(t) || tit)) ajoute('titre', titOrig ? titOrig[1].trim() : '');
  if (/(analyse (la|ma|cette) video|de quoi parle|sujet de la video|monte (la|ma|cette) video selon|monte selon le sujet|montage intelligent|monte (moi )?ca tout seul)/.test(t) && !/chapitr/.test(t)) ajoute('montage_sujet');
  if (/chapitr/.test(t)) ajoute(/(liste|copi|description)/.test(t) && !/(clavier|ecran|titre)/.test(t) ? 'chapitres' : 'chapitrer');
  if (/(hashtags?|description|titre (pour|de la) (publication|video youtube|tiktok)|legende)/.test(t)) ajoute('publication', /youtube/.test(t) ? 'YouTube' : /instagram/.test(t) ? 'Instagram' : /tiktok/.test(t) ? 'TikTok' : '');
  if (/\bexport/.test(t)) ajoute('exporter');
  // ordre du montage : découpe d'abord, habillage ensuite, export à la fin
  const ORDRE = ['supprimer_clip', 'couper_a', 'format', 'plans', 'detacher', 'couper_blancs', 'vitesse', 'dynamiser', 'ameliorer', 'egaliser', 'volume', 'sous_titres', 'traduire_sous', 'bruitage', 'retirer_musique', 'musique', 'rythme', 'reperes_rythme', 'transitions', 'retirer_transitions', 'fondus', 'titre', 'titre_ici', 'couleur_titre', 'montage_sujet', 'chapitres', 'chapitrer', 'clipping', 'niveau_final', 'publication', 'exporter'];
  const cible = cibleDe(t);
  if (cible) l.forEach(a => { if (CIBLABLES.has(a.action)) { a.cible = cible; a.libelle += ` — ${nomCible(cible)}`; } });
  return l.sort((a, b) => ORDRE.indexOf(a.action) - ORDRE.indexOf(b.action));
}

// Questions sur le montage, répondues par le programme (jamais d'invention) : durée, nombre de clips, format, ce que l'assistant sait faire
function repondre(demande, p) {
  const t = ' ' + sansAccents(demande) + ' ', clips = (p && p.clips) || [], total = clips.reduce((a, c) => a + (c.dur || 0), 0);
  const duree = s => { s = Math.round(s); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
  if (/(combien de temps|quelle duree|duree (de la|du) (video|montage)|dure combien|combien dure|la video dure)/.test(t)) return clips.length ? `Le montage dure ${duree(total)}, en ${clips.length} clip${clips.length > 1 ? 's' : ''}.` : 'La timeline est vide pour l’instant.';
  if (/combien (de|d') ?(clips?|prises?|plans?|sequences?)/.test(t)) return `Il y a ${clips.length} clip${clips.length > 1 ? 's' : ''} sur la timeline${clips.length ? ` (${duree(total)})` : ''}.`;
  if (/(quel format|en quel format|c'?est quel format)/.test(t)) return `Le format est ${({ vertical: 'vertical 9:16 (TikTok, Reels, Shorts)', horizontal: 'horizontal 16:9 (YouTube)', carre: 'carré 1:1' })[p && p.format] || 'non choisi'}.`;
  if (/(que sais[- ]tu faire|tu (sais|peux) faire quoi|qu'?est[- ]ce que tu (sais|peux) faire|aide[- ]moi|comment ca marche|\baide\b)/.test(t)) return 'Je comprends les demandes de montage simples : « coupe les blancs de la prise 2 », « mets le titre en jaune », « ajoute une musique calme », « sous-titres en italien », « passe en vertical », « exporte ». Je te montre ce que je vais faire, tu valides, et chaque changement s’annule d’un clic. Je retiens aussi tes consignes : « retiens que… ».';
  if (/^ ?(bonjour|salut|coucou|hello|bonsoir|merci)\b/.test(t)) return /merci/.test(t) ? 'Avec plaisir ! Autre chose à changer ?' : 'Bonjour ! Dis-moi ce que tu veux changer dans le montage.';
  return '';
}

// réglage proposé avec une action devinée (jamais un volume à zéro par défaut) : « trop fort » → 70 %, « trop faible » → 140 %…
function parDefaut(id, t) {
  if (id === 'volume') return /(faibl|bas\b|pas assez fort|monte|plus fort|entend pas)/.test(t) ? '140' : '70';
  if (id === 'vitesse') return /(rapide|vite|presse)/.test(t) ? '0.85' : '1.25';
  if (id === 'musique') return AMBIANCES.find(a => t.includes(a)) || 'calme';
  if (id === 'transitions') return 'fade';
  if (id === 'dynamiser') return '120';
  if (id === 'format') return /(horizontal|youtube)/.test(t) ? 'horizontal' : 'vertical';
  return '';
}
// Demande non comprise : les actions les plus proches (mots en commun avec leur libellé), sinon les suggestions du montage
const RACINE = m => m.slice(0, 5);
// mots courants qui désignent une action sans reprendre son libellé
const SYNONYMES = { fort: 'volume', faibl: 'volume', bruit: 'ameliorer', clair: 'ameliorer', propr: 'ameliorer', sombr: 'ameliorer', flou: 'ameliorer', ennuy: 'dynamiser', rythm: 'dynamiser', vivan: 'dynamiser', lente: 'vitesse', rapid: 'vitesse', lisib: 'sous_titres', texte: 'sous_titres', sourd: 'sous_titres', youtu: 'publication', court: 'clipping', silen: 'couper_blancs', pause: 'couper_blancs', ambia: 'musique', fond: 'musique' };
function proches(demande, p, n = 3) {
  const t = sansAccents(demande);
  const mots = new Set(sansAccents(demande).split(/[^a-z0-9]+/).filter(m => m.length > 3 && !VIDES.has(m)).map(RACINE));
  const notes = Object.entries(ACTIONS).filter(([id]) => !['exporter', 'supprimer_clip', 'couper_a', 'couleur_titre'].includes(id))
    .map(([id, lib]) => ({ id, lib, n: sansAccents(lib).split(/[^a-z0-9]+/).filter(m => m.length > 3).map(RACINE).filter(m => mots.has(m)).length }))
    .map(x => ({ ...x, n: x.n + [...mots].filter(m => SYNONYMES[m] === x.id).length }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, n).map(x => { const p = parDefaut(x.id, t); return { action: x.id, parametre: p, libelle: x.lib + (p ? ` (${p}${x.id === 'volume' ? ' %' : x.id === 'vitesse' ? '×' : ''})` : '') }; });
  if (notes.length) return notes;
  return suggerer(p || {}).filter(s => s.action !== 'aucune').slice(0, n);
}

// Montage automatique : les étapes utiles d'après l'état du projet (forme de suggerer), sans rien refaire de déjà fait
function planAuto(p) {
  const l = [], ajoute = (action, parametre = '') => l.push({ action, parametre: String(parametre), libelle: ACTIONS[action] + (parametre ? ` (${parametre})` : '') });
  if (!p || !Array.isArray(p.clips)) { ['couper_blancs', 'sous_titres', 'egaliser', 'musique', 'transitions'].forEach(a => ajoute(a, a === 'musique' ? 'calme' : a === 'transitions' ? 'fade' : '')); return l; }
  const clips = p.clips, total = clips.reduce((a, c) => a + (c.dur || 0), 0), videos = clips.filter(c => c.kind === 'video');
  const parlants = clips.filter(c => (c.kind === 'video' || c.kind === 'audio') && c.hasAudio !== false && !c.sonDetache);
  if (!clips.length) return [];
  if (videos.some(c => (c.dur || 0) > 45)) ajoute('plans');
  const sansSous = parlants.length && parlants.every(c => !(c.subs || []).length);
  // couper les blancs et sous-titrer en une seule écoute ; les étapes suivantes regardent le résultat de la coupe
  if (parlants.length) ajoute('couper_blancs', sansSous ? (p.format === 'vertical' ? 'avec sous-titres tiktok' : 'avec sous-titres') : '');
  if (p.format === 'vertical' && videos.some(c => c.w && c.h && c.w / c.h > 1.2 && !c.cadrage && c.fit !== 'fit' && c.fit !== 'flou')) ajoute('format', 'vertical');
  if (parlants.length) ajoute('egaliser');
  if (videos.length && parlants.length) ajoute('dynamiser', '115'); // ne fait rien s'il n'y a pas de saut d'image après la coupe
  if ((clips.length >= 2 || videos.length >= 1) && !clips.some(c => c.transition)) ajoute('transitions', 'fade'); // seulement aux vrais changements de plan
  if (!(p.audio || []).some(a => !a.detache) && total > 15) ajoute('musique', 'calme');
  if (total > 150 && parlants.length) ajoute('chapitrer');
  if (!p.normaliser) ajoute('niveau_final');
  return l;
}

// Suggestions d'après le projet (forme simplifiée : { format, clips:[{kind, hasAudio, subs, afx, transition, dur, w, h, cadrage, fit}], audio:[{detache}], markers })
function suggerer(p) {
  const s = [], clips = p.clips || [], total = clips.reduce((a, c) => a + (c.dur || 0), 0);
  const parlants = clips.filter(c => (c.kind === 'video' || c.kind === 'audio') && c.hasAudio !== false && !c.sonDetache);
  if (!clips.length) return [{ action: 'aucune', libelle: 'Importe tes vidéos (⌘I) ou utilise « Générer » pour commencer.' }];
  if (parlants.length && parlants.every(c => !(c.subs || []).length)) s.push({ action: 'sous_titres', libelle: 'Ajouter des sous-titres : la plupart des vidéos sont regardées sans le son.' });
  if (parlants.some(c => (c.dur || 0) > 20) && !p.blancsCoupes) s.push({ action: 'couper_blancs', libelle: 'Couper les blancs et les « euh » des prises longues.' });
  if (clips.some(c => c.kind === 'video' && (c.dur || 0) > 45)) s.push({ action: 'plans', libelle: 'Découper la longue vidéo à chaque changement de plan.' });
  if (p.format === 'vertical' && clips.some(c => c.kind === 'video' && c.w && c.h && c.w / c.h > 1.2 && !c.cadrage && c.fit !== 'fit' && c.fit !== 'flou')) s.push({ action: 'format', parametre: 'vertical', libelle: 'Faire suivre la personne dans les vidéos horizontales (recadrage automatique).' });
  if (parlants.length >= 2 && !parlants.every(c => (c.afx || []).some(e => e.id === 'normaliser'))) s.push({ action: 'egaliser', libelle: 'Égaliser le volume : même niveau d’un clip à l’autre.' });
  if (!(p.audio || []).some(a => !a.detache) && total > 15) s.push({ action: 'musique', parametre: 'calme', libelle: 'Ajouter une musique de fond discrète (baissée quand on parle).' });
  if (clips.length >= 4 && clips.filter(c => c.kind === 'video').length >= 3 && parlants.length >= 3 && !clips.some(c => (c.zoom || 100) > 100)) s.push({ action: 'dynamiser', parametre: '115', libelle: 'Dynamiser la vidéo parlée (zoom léger un plan sur deux).' });
  if (parlants.length && total > 20) s.push({ action: 'montage_sujet', libelle: 'Analyser la vidéo et la monter selon son sujet : style, musique et son adaptés.' });
  if (total > 150 && parlants.length) s.push({ action: 'chapitrer', libelle: 'Chapitrer la vidéo : titres à l’écran, bruit de clavier et liste pour YouTube.' });
  if (total > 90 && parlants.length) s.push({ action: 'clipping', libelle: 'Créer des clips TikTok avec les meilleurs passages de la vidéo.' });
  if ((p.markers || []).length >= 2 && total > 60) s.push({ action: 'chapitres', libelle: 'Préparer les chapitres YouTube à partir des repères.' });
  s.push({ action: 'publication', libelle: 'Écrire le titre, la description et les hashtags de publication.' });
  return s.map(x => ({ parametre: '', ...x }));
}

// Repli sans IA : mots-clés les plus fréquents du texte → hashtags
const VIDES = new Set('alors aussi avec avoir avant apres autre bien cela cette ces chez comme dans depuis donc elle elles encore entre etre fait faire leur leurs mais meme moins nous notre pour plus pourquoi quand quel quelle sans sont sous tout tous tres vous votre voila comment ainsi parce peut plus etait ont fait cest quil quon'.split(' '));
function hashtagsSimples(texte, n = 8) {
  const f = new Map();
  for (const m of sansAccents(texte).split(/[^a-z0-9]+/)) if (m.length > 3 && !VIDES.has(m) && !/^\d+$/.test(m)) f.set(m, (f.get(m) || 0) + 1);
  return [...f.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n).map(([m]) => '#' + m);
}

module.exports = { ACTIONS, COULEURS, comprendre, repondre, proches, planAuto, suggerer, hashtagsSimples, sansAccents };
