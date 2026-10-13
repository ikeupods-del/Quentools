// QuentMovie : assistant de montage. Une demande en français (« coupe les blancs, ajoute des sous-titres et une musique calme »)
// devient une liste d'actions connues, appliquées par l'interface ; et des suggestions tirées de l'état du projet.
// Aucune IA nécessaire ici : l'IA locale (ia.js) ne sert qu'en complément, quand ces règles ne comprennent pas la demande.
'use strict';

// actions connues : identifiant → libellé (montré avant d'appliquer)
const ACTIONS = {
  couper_blancs: 'Couper les blancs et les « euh »',
  sous_titres: 'Ajouter les sous-titres automatiques',
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
  exporter: 'Exporter la vidéo'
};
const AMBIANCES = ['calme', 'douce', 'piano', 'dynamique', 'energique', 'epique', 'cinema', 'hip-hop', 'joyeuse', 'triste', 'suspense', 'lofi', 'electro', 'acoustique', 'pop'];
const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'");

// Demande en français → [{ action, parametre, libelle }], dans l'ordre logique du montage
function comprendre(demande, projet) {
  const t = ' ' + sansAccents(demande).replace(/[^a-z0-9'«»"%,.:\- ]+/g, ' ') + ' ', l = [];
  const ajoute = (action, parametre = '') => { if (!l.some(x => x.action === action)) l.push({ action, parametre: String(parametre), libelle: ACTIONS[action] + (parametre ? ` (${parametre})` : '') }); };
  // « monte ma vidéo » : l'assistant enchaîne lui-même les étapes utiles à CE montage
  if (/(montage (automatique|auto|complet)|monte[- ]?(la|le|moi|ma|mon|mes|les|cette|ces|tout)\b|fais[- ]moi (le|un|mon) montage|auto-?monte|monte (automatiquement|tout))/.test(t) && !/monte[- ]?(le )?son/.test(t)) return planAuto(projet);
  const non = mot => new RegExp(`(sans|pas de|enleve|retire|supprime|vire)( les?| la| l'| des| de)? ?${mot}`).test(t);
  if (/\b(blancs?|silences?|euh|hesitations?|temps morts?)\b/.test(t) && !/(sans|pas de|garde|laisse|conserve)( les?| la| l'| des| de)? ?(blancs?|silences?|euh|hesitations?|temps morts?)/.test(t)) ajoute('couper_blancs'); // « supprime les blancs » = les couper
  if (/sous[- ]?titr/.test(t) && !non('sous[- ]?titr')) ajoute('sous_titres', /tiktok|gros|grand|anime|karaoke|mot a mot/.test(t) ? 'tiktok' : '');
  if (/\b(plans?|changements? de plan|decoupe automatique)\b/.test(t) && /(decoup|detect|separ|coupe)/.test(t) && !/premier plan|arriere[- ]plan/.test(t)) ajoute('plans');
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
  if (/(ecran titre|titre au debut|ajoute (un|le) titre|mets (un|le) titre)/.test(t) || tit) ajoute('titre', titOrig ? titOrig[1].trim() : '');
  if (/(analyse (la|ma|cette) video|de quoi parle|sujet de la video|monte (la|ma|cette) video selon|monte selon le sujet|montage intelligent|monte (moi )?ca tout seul)/.test(t) && !/chapitr/.test(t)) ajoute('montage_sujet');
  if (/chapitr/.test(t)) ajoute(/(liste|copi|description)/.test(t) && !/(clavier|ecran|titre)/.test(t) ? 'chapitres' : 'chapitrer');
  if (/(hashtags?|description|titre (pour|de la) (publication|video youtube|tiktok)|legende)/.test(t)) ajoute('publication', /youtube/.test(t) ? 'YouTube' : /instagram/.test(t) ? 'Instagram' : /tiktok/.test(t) ? 'TikTok' : '');
  if (/\bexport/.test(t)) ajoute('exporter');
  // ordre du montage : découpe d'abord, habillage ensuite, export à la fin
  const ORDRE = ['supprimer_clip', 'couper_a', 'format', 'plans', 'detacher', 'couper_blancs', 'vitesse', 'dynamiser', 'ameliorer', 'egaliser', 'volume', 'sous_titres', 'bruitage', 'retirer_musique', 'musique', 'rythme', 'reperes_rythme', 'transitions', 'retirer_transitions', 'fondus', 'titre', 'montage_sujet', 'chapitres', 'chapitrer', 'clipping', 'publication', 'exporter'];
  return l.sort((a, b) => ORDRE.indexOf(a.action) - ORDRE.indexOf(b.action));
}

// Montage automatique : les étapes utiles d'après l'état du projet (forme de suggerer), sans rien refaire de déjà fait
function planAuto(p) {
  const l = [], ajoute = (action, parametre = '') => l.push({ action, parametre: String(parametre), libelle: ACTIONS[action] + (parametre ? ` (${parametre})` : '') });
  if (!p || !Array.isArray(p.clips)) { ['couper_blancs', 'sous_titres', 'egaliser', 'musique', 'transitions'].forEach(a => ajoute(a, a === 'musique' ? 'calme' : a === 'transitions' ? 'fade' : '')); return l; }
  const clips = p.clips, total = clips.reduce((a, c) => a + (c.dur || 0), 0), videos = clips.filter(c => c.kind === 'video');
  const parlants = clips.filter(c => (c.kind === 'video' || c.kind === 'audio') && c.hasAudio !== false && !c.sonDetache);
  if (!clips.length) return [];
  if (parlants.length) ajoute('montage_sujet');
  if (videos.some(c => (c.dur || 0) > 45)) ajoute('plans');
  if (parlants.length) ajoute('couper_blancs');
  if (parlants.length && parlants.every(c => !(c.subs || []).length)) ajoute('sous_titres', p.format === 'vertical' ? 'tiktok' : '');
  if (parlants.length >= 2) ajoute('egaliser');
  if (clips.length >= 4 && videos.length >= 3 && parlants.length >= 3) ajoute('dynamiser', '115');
  if (clips.length >= 2 && !clips.some(c => c.transition)) ajoute('transitions', 'fade');
  if (!(p.audio || []).some(a => !a.detache) && total > 15) ajoute('musique', 'calme');
  if (total > 150 && parlants.length) ajoute('chapitrer');
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

module.exports = { ACTIONS, comprendre, planAuto, suggerer, hashtagsSimples, sansAccents };
