// Interface 2.0 : étapes Créer / Monter / Publier, écran d'accueil et rubriques regroupées (6 au lieu de 10).
// Chargé après le script principal d'index.html : s'appuie sur ses fonctions (navigateur, tout, allerOnglet, ouvrirStudio…).
'use strict';

// Rubriques regroupées : l'onglet de tête reste visible dans le rail, les autres deviennent des puces.
const GROUPES_V2 = { voix: ['voix', 'sons', 'musiques'], effets: ['effets', 'transitions', 'stickers'] };
const NOMS_V2 = { voix: 'Voix', sons: 'Sons', musiques: 'Musique', effets: 'Effets', transitions: 'Transitions', stickers: 'Calques' };
const TETE_V2 = {}; Object.entries(GROUPES_V2).forEach(([t, l]) => l.forEach(x => { TETE_V2[x] = t; }));

(function railV2() {
  const rail = $('#tabs'), b = t => rail.querySelector(`[data-tab="${t}"]`);
  b('titres').querySelector('span').textContent = 'Texte';
  b('voix').querySelector('span').textContent = 'Audio';
  ['medias', 'titres', 'voix', 'effets', 'packs', 'outils'].forEach(t => rail.appendChild(b(t))); // nouvel ordre
  ['sons', 'musiques', 'transitions', 'stickers'].forEach(t => { b(t).hidden = true; rail.appendChild(b(t)); });
  const nav = navigateur;
  navigateur = function () {
    nav.apply(this, arguments);
    const tete = TETE_V2[tab];
    if (tete) rail.querySelector(`[data-tab="${tete}"]`).classList.add('on');
    if (!tete) return;
    $('#navbody').insertAdjacentHTML('afterbegin', `<div class="puces-v2">${GROUPES_V2[tete].map(t => `<button data-sous-v2="${t}" class="${t === tab ? 'on' : ''}">${NOMS_V2[t]}</button>`).join('')}</div>`);
  };
  $('#navbody').addEventListener('click', e => { const p = e.target.closest('[data-sous-v2]'); if (p) allerOnglet(p.dataset.sousV2); });
  navigateur();
})();

// Écran d'accueil (étape « Créer »)
const CARTES_V2 = [
  { id: 'importer', titre: 'Importer des vidéos', texte: 'Vidéos, photos et sons : tous les formats.', touche: '⌘I', couleur: '#8FA3FF', fond: '#1D2647', icone: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4' },
  { id: 'filmer', titre: 'Me filmer', texte: 'Caméra, micro et prompteur, fond virtuel et animations en direct.', touche: '⇧⌘R', couleur: '#FF8A8A', fond: '#3A1F24', icone: 'M3 7h12v10H3z M15 10l6-3v10l-6-3z' },
  { id: 'generer', titre: 'Générer une vidéo', texte: 'Un sujet : texte, images et voix off.', touche: '⇧⌘G', couleur: '#C3A4FF', fond: '#2D2147', icone: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z' },
  { id: 'doublage', titre: 'Doublage', texte: 'Ta voix réplique par réplique, ou le doublage d’une vidéo.', touche: '⇧⌘D', couleur: '#6EE7B7', fond: '#173329', icone: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z M5 11a7 7 0 0014 0 M12 18v3' },
  { id: 'podcast', titre: 'Podcast', texte: 'Plusieurs micros, niveaux égalisés, chapitres et extraits.', touche: '', couleur: '#FBBF5B', fond: '#3A2A14', icone: 'M3 12h2 M7 8v8 M11 5v14 M15 9v6 M19 11v2' },
  { id: 'fiche', titre: 'Épisode QuentInvest', texte: 'Contrôle ou brouillon de la fiche d’un épisode de Pico.', touche: '', couleur: '#34D399', fond: '#123026', icone: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6' }
];
const ACTIONS_V2 = {
  importer: () => $('#fichiers').click(), filmer: () => ouvrirStudio(), generer: () => ouvrirGenerateur(), doublage: () => ouvrirDoublage(),
  podcast: () => allerOnglet('outils'), fiche: () => ouvrirFiche()
};

function etapeV2(e) { document.querySelectorAll('#etapes [data-etape]').forEach(b => b.classList.toggle('on', b.dataset.etape === e)); }
function masquerAccueil() { const a = $('#accueil'); if (a) a.remove(); if (!$('#publierV2')) etapeV2('monter'); }
async function afficherAccueil() {
  masquerAccueil(); etapeV2('creer');
  const a = document.createElement('div'); a.id = 'accueil';
  a.innerHTML = `<div class="acc-int">
    <h2>Qu’est-ce qu’on crée aujourd’hui ?</h2>
    <button class="acc-demande" data-acc="assistant"><svg class="ic"><use href="#i-assistant"/></svg><span>Décris ce que tu veux faire : « coupe les blancs », « sous-titres en italien »…</span><kbd>⌘K</kbd></button>
    <h3>Commencer</h3>
    <div class="acc-cartes">${CARTES_V2.map(c => `<button class="acc-carte" data-acc="${c.id}"><span class="acc-ic" style="background:${c.fond}"><svg viewBox="0 0 24 24" fill="none" stroke="${c.couleur}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${c.icone}"/></svg></span><span class="acc-t"><b>${c.titre}</b><small>${c.texte}</small></span>${c.touche ? `<kbd>${c.touche}</kbd>` : ''}</button>`).join('')}</div>
    <h3>Reprendre un projet</h3><div class="acc-recents"><p class="mut">Chargement…</p></div>
  </div>`;
  document.body.appendChild(a);
  a.onclick = e => {
    const b = e.target.closest('[data-acc],[data-acc-pr]'); if (!b) return;
    if (b.dataset.accPr !== undefined) return reprendreV2(b.dataset.accPr);
    masquerAccueil();
    if (b.dataset.acc === 'assistant') ouvrirAssistant(); else ACTIONS_V2[b.dataset.acc]();
  };
  try {
    const { items } = await (await api('/api/projets')).json();
    a.querySelector('.acc-recents').innerHTML = items.length ? items.slice(-8).reverse().map(n => `<button class="acc-projet" data-acc-pr="${esc(n)}"><svg class="ic"><use href="#i-film"/></svg>${esc(n)}</button>`).join('') : '<p class="mut">Aucun projet enregistré pour l’instant.</p>';
  } catch (e) { a.querySelector('.acc-recents').innerHTML = ''; }
}
async function reprendreV2(n) { // même chargement que « Ouvrir un projet »
  proj = reparerProjet(await (await api('/api/projets/' + enc(n))).json());
  proj.markers = proj.markers || []; proj.audio = proj.audio || []; proj.pistes = proj.pistes || []; proj.textes = proj.textes || []; proj.clips.forEach(normaliser);
  $('#format').value = proj.format; sel = proj.clips.length ? 0 : -1; selA = selCut = selP = selT = -1; rendu = null;
  masquerAccueil(); commit(); tout(); apercu();
}

$('#eCreer').onclick = () => { if ($('#publierV2') && !exportEnCours) fermerPublierV2(); afficherAccueil(); };
$('#eMonter').onclick = () => { if ($('#publierV2') && !exportEnCours) fermerPublierV2(); masquerAccueil(); };
$('#bPublier').onclick = () => exporter();
document.addEventListener('keydown', e => { if (e.key !== 'Escape' || $('#modal').classList.contains('on')) return; if ($('#publierV2') && !exportEnCours) fermerPublierV2(); else if ($('#accueil')) masquerAccueil(); });
const toutV1 = tout;
tout = function () { toutV1.apply(this, arguments); if (proj.clips.length && $('#accueil')) masquerAccueil(); };
setTimeout(() => { if (!proj.clips.length && !$('#modal').classList.contains('on')) afficherAccueil(); }, 600);

// Réglages du clip rangés en onglets : seules les parties de l'onglet choisi sont affichées (et ouvertes).
const ONGLETS_INSP = [
  { id: 'decoupe', nom: 'Découpe', motif: /^(Découpe|Fond uni)/ },
  { id: 'image', nom: 'Image', motif: /^(Zoom|Effets image|Calques|Titre)/ },
  { id: 'son', nom: 'Son', motif: /^(Effets sonores|Podcast)/ },
  { id: 'couleur', nom: 'Couleur', motif: /^(Couleurs|Look)/ }
];
let ongletInsp = 'decoupe', clipInsp = null;
const inspV1 = inspecteur;
inspecteur = function () {
  inspV1.apply(this, arguments);
  const parts = [...document.querySelectorAll('#insp > details, #insp .insp > details')];
  if (parts.length < 3) return;
  const de = d => { const t = (d.querySelector('summary') || {}).textContent || ''; const o = ONGLETS_INSP.find(x => x.motif.test(t.trim())); return o ? o.id : 'image'; };
  const presents = ONGLETS_INSP.filter(o => parts.some(d => de(d) === o.id));
  const c = proj.clips[sel];
  if (c !== clipInsp) { clipInsp = c; ongletInsp = c && (c.kind === 'solid' || c.text) ? 'image' : 'decoupe'; } // nouveau clip : un écran titre s'ouvre sur son texte
  if (!presents.some(o => o.id === ongletInsp)) ongletInsp = presents[0].id;
  parts.forEach(d => { const dans = de(d) === ongletInsp; d.hidden = !dans; if (dans) d.open = true; });
  parts[0].insertAdjacentHTML('beforebegin', `<div class="onglets-insp" role="tablist">${presents.map(o => `<button role="tab" data-oi="${o.id}" class="${o.id === ongletInsp ? 'on' : ''}">${o.nom}</button>`).join('')}</div><div id="inspConseil"></div>`);
  if (c && $('#insp').dataset.root === 'c') conseilInsp(c);
};
$('#insp').addEventListener('click', e => { const b = e.target.closest('[data-oi]'); if (b) { ongletInsp = b.dataset.oi; inspecteur(); } });

// Dictée vocale dans l'assistant : un clic pour parler, un clic pour arrêter ; la reconnaissance de la voix du Mac écrit la demande.
let dicteeV2 = null;
async function basculerDictee(bouton, champ) {
  if (dicteeV2) { dicteeV2.stop(); return; }
  let flux;
  try { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { aide('🎤 Micro indisponible : autorise QuentMovie dans Réglages Système → Confidentialité → Micro.'); return; }
  const morceaux = [], rec = new MediaRecorder(flux); dicteeV2 = rec;
  bouton.classList.add('on'); bouton.textContent = '⏹ Arrêter';
  rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
  rec.onstop = async () => {
    flux.getTracks().forEach(t => t.stop()); dicteeV2 = null; bouton.classList.remove('on'); bouton.textContent = '⏳ J’écris…'; bouton.disabled = true;
    try {
      const { id } = await (await api('/api/parole/dictee', { method: 'POST', body: new Blob(morceaux, { type: 'audio/webm' }) })).json();
      const r = await suivreTravail(id, () => {});
      if (r && r.texte) { champ.value = (champ.value.trim() ? champ.value.trim() + ' ' : '') + r.texte; champ.focus(); }
      else aide('🎤 Je n’ai rien entendu : parle un peu plus près du micro.');
    } catch (e) { aide('🎤 ' + esc(e.message || e) + ' (Outils → Voix et parole pour installer la reconnaissance de la voix).'); }
    bouton.disabled = false; bouton.textContent = '🎤 Dicter';
  };
  rec.start();
}
document.addEventListener('click', e => { const b = e.target.closest('#asDictee'); if (b) basculerDictee(b, $('#asDemande')); });

// Suggestion en haut des réglages du clip, tirée des mesures du média (blancs, lumière, niveau) ou du genre de la vidéo (look conseillé)
const analysesMedia = new Map(); // fichier → promesse des mesures (une seule analyse par fichier)
function mesuresMedia(file) {
  if (!file || /^(lib|pack):/.test(file)) return Promise.resolve(null);
  if (!analysesMedia.has(file)) analysesMedia.set(file, api('/api/clip/analyse', { method: 'POST', body: JSON.stringify({ file }) }).then(r => r.json()).then(j => j.analyse || null).catch(() => null));
  return analysesMedia.get(file);
}
// blancs d'au moins 1 s dans la partie gardée du clip
function blancsDuClip(c, a) {
  if (!a || !a.silences) return { n: 0, s: 0 };
  const l = a.silences.map(([x, y]) => [Math.max(x, c.in), Math.min(y, c.out)]).filter(([x, y]) => y - x >= 1);
  return { n: l.length, s: l.reduce((t, [x, y]) => t + (y - x) / (c.speed || 1), 0) };
}
function lookConseille() {
  const g = proj.analyse && proj.analyse.pack, P = g && (CAT.packs || []).find(x => x.id === g);
  return P && P.look ? { file: 'lib:' + P.look, nom: nomOf(P.look.replace(/^luts\//, '').replace(/\.cube$/, '')), genre: proj.analyse.genre } : null;
}
async function conseilInsp(c) {
  const z = $('#inspConseil'); if (!z) return;
  const o = ongletInsp, sourceVideo = c.kind === 'video' || c.kind === 'audio';
  const a = sourceVideo || c.kind === 'image' ? await mesuresMedia(c.file) : null;
  if (curClip() !== c || ongletInsp !== o || !$('#inspConseil')) return; // sélection ou onglet changés pendant l'analyse
  let conseil = null;
  if (o === 'image') {
    if (a && a.luminosite != null && a.luminosite < 70 && !(c.bright > 0)) conseil = ['Ce clip est un peu sombre.', 'Éclaircir', () => { c.bright = 12; c.contrast = Math.max(c.contrast || 100, 108); }];
    else if (c.kind === 'video' && c.fit !== 'fit' && c.fit !== 'flou' && partVisible(c) < 0.8 && !c.cadrage) conseil = ['Une grande partie de l’image est recadrée.', 'Suivre la personne', () => { const b = $('#bSuivre'); if (b) b.click(); }, true];
  } else if (o === 'son') {
    const b = blancsDuClip(c, a);
    if (c.hasAudio !== false && sourceVideo && b.n) conseil = [`${b.n} blanc${b.n > 1 ? 's' : ''} d’au moins 1 s dans ce clip (${fmt(b.s)} en tout).`, 'Couper', () => outilParole('clip', { couper: true, sous: false, apercu: true }, null), true];
    else if (a && a.lufs != null && a.lufs > -70 && a.lufs < -22 && c.hasAudio !== false && !(c.afx || []).some(e => e.id === 'normaliser' || e.id === 'qualite')) conseil = [`Son plutôt faible (${Math.round(a.lufs)} LUFS).`, 'Égaliser', () => { proj.normaliser = true; }];
  } else if (o === 'decoupe') {
    if (sourceVideo && (c.speed || 1) !== 1) conseil = [`Ce clip est lu à ${String(c.speed).replace('.', ',')}×.`, 'Revenir à 1×', () => vitesseSelection(1), true];
    else if (sourceVideo && effDur(c) > 8 && a && blancsDuClip(c, a).s > 0.3 * effDur(c)) conseil = ['Beaucoup de passages sans voix dans ce clip.', 'Accélérer à 1,25×', () => vitesseSelection(1.25), true];
  } else if (o === 'couleur' && c.kind !== 'audio') {
    const L = lookConseille();
    if (L && (!c.lut || c.lut.file !== L.file)) conseil = [`Look conseillé${L.genre ? ' pour « ' + L.genre + ' »' : ''} : « ${L.nom} ».`, 'Appliquer', () => { c.lut = { file: L.file, amount: 100 }; }];
    else if (a && a.luminosite != null && a.luminosite > 200 && !(c.bright < 0)) conseil = ['Image très claire.', 'Assombrir', () => { c.bright = -10; }];
  }
  if (!conseil) { z.innerHTML = ''; return; }
  const [texte, bouton, faire, seul] = conseil;
  z.innerHTML = `<div class="conseilI"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg><span>${esc(texte)}</span><button class="pri mini">${esc(bouton)}</button></div>`;
  z.querySelector('button').onclick = () => { if (seul) return faire(); faire(); commit(); inspecteur(); tlDessin(); apercu(); aide(`${bouton} : fait. Annule avec ${MAC ? '⌘Z' : 'Ctrl+Z'} si besoin.`); };
}
// rôle d'un son de la piste audio, pour sa couleur : voix (voix off, doublage, son détaché) en vert, musique en orange, bruitages en orange clair
function roleSon(a) {
  const f = String(a.file || '').replace(/^lib:/, ''), L = LIB();
  if ((L.musiques || []).some(x => x.file === f) || (a.duck && a.loop)) return 'musique';
  if ((L.sons || []).some(x => x.file === f)) return 'son';
  return 'voix';
}

// Écran « Exporter et publier » (étape « Publier ») : la qualité, puis où envoyer (Mac, YouTube, TikTok, AirDrop), les textes juste en dessous, un seul bouton.
// Rien n'est mis en ligne sans le clic : YouTube reçoit une vidéo privée, non répertoriée ou programmée, TikTok un brouillon.
const QUALITES_V2 = [
  { id: '720', nom: '720p', info: 'Rapide, léger', res: 720, sortie: 'mp4', mbps: 5 },
  { id: '1080', nom: '1080p', info: 'Conseillé', res: 1080, sortie: 'mp4', mbps: 10 },
  { id: '2160', nom: '4K', info: 'Qualité maximale', res: 2160, sortie: 'mp4', mbps: 40 },
  { id: 'son', nom: 'Son seul', info: 'MP3 du montage', sortie: 'mp3', mbps: 0.192 }
];
const DESTS_V2 = [
  { id: 'mac', nom: 'Enregistrer sur le Mac', info: 'Dossier Films › QuentMovie › exports', fond: '#1D2647', couleur: '#8FA3FF', icone: 'M3 5h18v11H3z M8 20h8 M12 16v4' },
  { id: 'youtube', nom: 'YouTube', info: 'Privée, non répertoriée ou programmée', fond: '#3A1F24', couleur: '#FF8A8A', icone: 'M3 7a3 3 0 013-3h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3z M10 9l5 3-5 3z' },
  { id: 'tiktok', nom: 'TikTok', info: 'Dans tes brouillons, tu publies depuis l’app', fond: '#14303A', couleur: '#67D3F0', icone: 'M14 3v11a4 4 0 11-4-4 M14 3c0 3 2 5 5 5' },
  { id: 'airdrop', nom: 'AirDrop', info: 'Vers ton iPhone', fond: '#173329', couleur: '#6EE7B7', icone: 'M12 14a2 2 0 100-4 2 2 0 000 4z M8 16a6 6 0 118 0 M5 19a10 10 0 1114 0' }
];
const VISIBILITES_V2 = [['private', 'Privée'], ['unlisted', 'Non répertoriée'], ['prog', 'Programmée']];
const FORMATS_V2 = { vertical: '9:16', horizontal: '16:9', carre: '1:1' };
const pubV2 = { dest: { mac: true, youtube: false, tiktok: false, airdrop: false }, vis: 'private', comptes: null };
const qualiteV2 = () => proj.sortie === 'mp3' ? 'son' : (QUALITES_V2.find(q => q.res === +proj.res) || QUALITES_V2[1]).id;
const textesV2 = () => (proj.publication = proj.publication || { titre: '', description: '', tags: '' });
const enLigneV2 = () => pubV2.dest.youtube || pubV2.dest.tiktok;
function fermerPublierV2() { const x = $('#publierV2'); if (x) x.remove(); etapeV2($('#accueil') ? 'creer' : 'monter'); }
function exporter() {
  if (!proj.clips.length) return alert('La timeline est vide.'); stopLecture();
  masquerAccueil(); fermerPublierV2(); etapeV2('publier');
  const x = document.createElement('div'); x.id = 'publierV2'; document.body.appendChild(x);
  const premier = proj.clips.find(c => c.kind === 'video' || c.kind === 'image');
  const apercuV2 = rendu && rendu.url && !rendu.perime ? `<video src="${esc(rendu.url)}" controls preload="metadata" playsinline></video>`
    : premier ? `<img alt="Première image du montage" src="${premier.kind === 'image' ? '/media/' + enc(premier.file) : `/api/frame?file=${enc(premier.file)}&t=${(premier.in + 0.5).toFixed(2)}&w=720`}">` : '<div class="pv2-vide">Aperçu</div>';
  x.innerHTML = `<div class="pv2-int">
    <section class="pv2-apercu"><div class="pv2-ecran f-${esc(proj.format)}">${apercuV2}</div>
      <div class="pv2-stats"><div><span>Durée</span><b>${fmtChrono(total())}</b></div><div><span>Format</span><b>${FORMATS_V2[proj.format] || ''}</b></div><div><span>Taille</span><b id="pvTaille"></b></div></div>
      <p class="mut pv2-lien"><a href="#" id="pvEpisodes">Publier un épisode QuentInvest déjà fabriqué</a></p></section>
    <section class="pv2-reglages">
      <div><h1>Exporter et publier</h1><p class="mut">Choisis la qualité et où envoyer la vidéo. Rien n’est mis en ligne sans ton clic.</p></div>
      <div><h2>Qualité</h2><div class="pv2-qualites" id="pvQualites"></div></div>
      <div><h2>Où l’envoyer</h2><div class="pv2-dests" id="pvDests"></div><div id="pvComptes" class="mut"></div></div>
      <div class="pv2-textes" id="pvTextes"></div>
      <details class="pv2-avance"><summary>Réglages avancés</summary>
        <label class="l">Type de fichier</label><select id="xSortie">${CAT.sorties.map(f => `<option value="${f}" ${proj.sortie === f ? 'selected' : ''}>${SORTIES[f] || f}</option>`).join('')}</select>
        <label class="l">Images par seconde</label><select id="xFps">${opts([['24', '24'], ['30', '30'], ['60', '60']], String(proj.fps))}</select>
        <label class="l">Encodage</label><select id="xQ">${opts(CAT.hwenc ? [['rapide', 'Puce vidéo du Mac : le plus rapide (recommandé)'], ['max', 'Puce vidéo du Mac : qualité maximale (fichier plus lourd)'], ['haute', 'Processeur (beaucoup plus lent)']] : [['rapide', 'Rapide'], ['haute', 'Qualité (plus lent)']], ['rapide', 'max', 'haute'].includes(proj.quality) ? proj.quality : 'rapide')}</select>
        <div class="sw2"><input type="checkbox" id="xNorm" ${proj.normaliser ? 'checked' : ''}><label for="xNorm">Égaliser le volume (recommandé pour un podcast)</label></div>
        <label class="l">Partie à exporter</label><select id="xPartie">${partiesExport().map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select>
        ${CAT.hwenc ? '<p class="mut">L’export utilise la puce du Mac, encode plusieurs clips à la fois et réutilise les clips qui n’ont pas changé depuis le dernier export.</p>' : ''}
      </details>
      <div class="pv2-action" id="expo"><button class="pri" id="xGo"></button><span class="mut" id="pvResume"></span><span class="sp"></span><button id="xAnn">Retour au montage</button></div>
    </section></div>`;
  $('#xAnn').onclick = fermerPublierV2;
  $('#pvEpisodes').onclick = ev => { ev.preventDefault(); ouvrirPublier(); };
  $('#xSortie').onchange = () => { proj.sortie = $('#xSortie').value; dessinerPublierV2(); };
  dessinerPublierV2();
  x.onclick = ev => {
    const q = ev.target.closest('[data-qv2]'), d = ev.target.closest('[data-dv2]'), v = ev.target.closest('[data-visv2]');
    if (q) { const Q = QUALITES_V2.find(y => y.id === q.dataset.qv2); proj.sortie = Q.sortie; if (Q.res) proj.res = Q.res; $('#xSortie').value = proj.sortie; if (Q.id === 'son') { pubV2.dest.youtube = pubV2.dest.tiktok = false; } dessinerPublierV2(); }
    if (d && !d.disabled) { pubV2.dest[d.dataset.dv2] = !pubV2.dest[d.dataset.dv2]; dessinerPublierV2(); }
    if (v) { pubV2.vis = v.dataset.visv2; dessinerPublierV2(); }
    if (ev.target.id === 'pvComptesReg') { ev.preventDefault(); ouvrirPublier(); }
    if (ev.target.id === 'pvRediger') redigerV2();
  };
  x.oninput = ev => { const t = ev.target, T = textesV2(); if (t.id === 'pvTitre') T.titre = t.value; if (t.id === 'pvDesc') T.description = t.value; if (t.id === 'pvTags') T.tags = t.value; if (t.id === 'pvDate') pubV2.date = t.value; };
  $('#xGo').onclick = lancerPublierV2;
  // état des comptes (connectés ou non) pour prévenir avant l'export
  api('/api/publier').then(r => r.json()).then(e => { pubV2.comptes = e; if ($('#publierV2')) dessinerPublierV2(); }).catch(() => {});
}
function dessinerPublierV2() {
  const q = qualiteV2(), Q = QUALITES_V2.find(y => y.id === q), son = /^(mp3|m4a|wav)$/.test(proj.sortie), T = textesV2(), D = pubV2.dest;
  if (son) D.youtube = D.tiktok = false;
  const mo = total() * (son ? 0.192 : Q.mbps) / 8;
  $('#pvTaille').textContent = '≈ ' + (mo < 1 ? '1 Mo' : mo < 1000 ? Math.round(mo) + ' Mo' : (mo / 1000).toFixed(1).replace('.', ',') + ' Go');
  $('#pvQualites').innerHTML = QUALITES_V2.map(y => `<button data-qv2="${y.id}" aria-pressed="${y.id === q}" class="${y.id === q ? 'on' : ''}">${y.nom}<span>${y.info}</span></button>`).join('');
  $('#pvDests').innerHTML = DESTS_V2.map(d => { const on = !!D[d.id], off = son && (d.id === 'youtube' || d.id === 'tiktok');
    return `<button class="pv2-dest ${on ? 'on' : ''}" data-dv2="${d.id}" aria-pressed="${on}" ${off ? 'disabled title="Une vidéo est nécessaire"' : ''}><span class="pv2-ic" style="background:${d.fond}"><svg viewBox="0 0 24 24" fill="none" stroke="${d.couleur}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d.icone}"/></svg></span><span class="pv2-t"><b>${d.nom}</b><small>${d.info}</small></span><span class="pv2-case">${on ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>' : ''}</span></button>`; }).join('');
  // comptes à connecter
  const C = pubV2.comptes, manque = C ? ['youtube', 'tiktok'].filter(p => D[p] && !(C[p] && C[p].connecte)) : [];
  $('#pvComptes').innerHTML = (manque.length ? `⚠️ ${manque.map(p => p === 'youtube' ? 'YouTube' : 'TikTok').join(' et ')} : compte à connecter (une seule fois). <a href="#" id="pvComptesReg">Régler les comptes</a>` : '')
    + (D.tiktok && proj.format !== 'vertical' ? `${manque.length ? '<br>' : ''}ℹ TikTok préfère les vidéos verticales (9:16) : change le format en haut à droite si besoin.` : '');
  // textes de publication, juste en dessous, seulement si on met en ligne
  const z = $('#pvTextes');
  if (!enLigneV2()) z.innerHTML = '';
  else if (!$('#pvTitre')) z.innerHTML = `<div class="pv2-tete"><h2>Textes de publication</h2><button id="pvRediger" class="mini">✨ Rédiger depuis la vidéo</button></div>
      <label class="l">Titre</label><input type="text" id="pvTitre" maxlength="100" value="${esc(T.titre)}" placeholder="ex. : L’inflation, c’est quoi ? Expliqué en 1 minute">
      <label class="l">Description</label><textarea id="pvDesc" rows="4" placeholder="De quoi parle la vidéo, chapitres…">${esc(T.description)}</textarea>
      <label class="l">Mots-clés et hashtags</label><input type="text" id="pvTags" value="${esc(T.tags)}" placeholder="#économie #inflation">
      <div id="pvVis"></div><p class="mut" id="pvRedigerEtat"></p>`;
  const vz = $('#pvVis');
  if (vz) vz.innerHTML = D.youtube ? `<div class="pv2-vis"><span class="mut">YouTube :</span>${VISIBILITES_V2.map(([id, nom]) => `<button data-visv2="${id}" class="${id === pubV2.vis ? 'on' : ''}" aria-pressed="${id === pubV2.vis}">${nom}</button>`).join('')}${pubV2.vis === 'prog' ? `<input type="datetime-local" id="pvDate" value="${esc(pubV2.date || '')}">` : ''}<label class="pv2-synth"><input type="checkbox" id="pvSynth" ${pubV2.synthese ? 'checked' : ''}> Voix de synthèse</label></div>` : '<p class="mut">TikTok reçoit la vidéo en brouillon : la légende (titre et hashtags) est copiée pour que tu la colles dans l’application.</p>';
  const s = $('#pvSynth'); if (s) s.onchange = () => { pubV2.synthese = s.checked; };
  const noms = DESTS_V2.filter(d => D[d.id]).map(d => d.id === 'mac' ? 'Mac' : d.nom);
  $('#xGo').textContent = enLigneV2() || (noms.length && !D.mac) ? 'Exporter et publier' : 'Exporter';
  $('#xGo').disabled = !noms.length;
  $('#pvResume').textContent = noms.length ? 'Destinations : ' + noms.join(', ') : 'Choisis au moins une destination';
}
async function redigerV2() {
  const b = $('#pvRediger'), e = $('#pvRedigerEtat'), texte = texteVideo(), an = proj.analyse && proj.analyse.sujet ? proj.analyse : null, sujet = (proj.gen && proj.gen.titre) || textesV2().titre || '';
  if (!texte && !an && !sujet) { e.textContent = 'Écris d’abord le titre, ou ajoute les sous-titres automatiques : rien n’est inventé.'; return; }
  const pf = pubV2.dest.youtube ? 'YouTube' : 'TikTok', chap = pf === 'YouTube' && chapitres().length >= 3 ? chapitres() : [];
  b.disabled = true;
  try {
    const { id } = await (await api('/api/assistant/publication', { method: 'POST', body: JSON.stringify({ texte, titre: sujet, plateforme: pf, analyse: an, chapitres: chap }) })).json();
    const r = await suivreTravail(id, j => { e.textContent = j.step || 'Rédaction…'; });
    const T = textesV2(); T.titre = (r.titres || [])[0] || T.titre; T.description = r.description || T.description; T.tags = (r.hashtags || []).join(' ') || T.tags;
    $('#pvTitre').value = T.titre; $('#pvDesc').value = T.description; $('#pvTags').value = T.tags;
    e.textContent = (r.titres || []).length > 1 ? 'Autres titres possibles : ' + r.titres.slice(1, 3).join(' · ') + '. Relis avant de publier.' : 'Relis les textes avant de publier.';
    if (!r.ia) e.textContent += ' (Textes simples : l’IA locale n’est pas installée.)';
  } catch (er) { e.textContent = er.message; }
  b.disabled = false;
}
async function lancerPublierV2() {
  const D = { ...pubV2.dest }, T = textesV2(), C = pubV2.comptes;
  if (D.youtube && !String(T.titre || '').trim()) { $('#pvTitre').focus(); return signal('Écris le titre de la vidéo pour YouTube.'); }
  if (D.youtube && pubV2.vis === 'prog' && !pubV2.date) return signal('Choisis la date et l’heure de mise en ligne.');
  const manque = ['youtube', 'tiktok'].filter(p => D[p] && !(C && C[p] && C[p].connecte));
  if (manque.length) return signal(`Connecte d’abord ${manque.map(p => p === 'youtube' ? 'YouTube' : 'TikTok').join(' et ')} : lien « Régler les comptes ».`);
  const ex = textesExemple();
  if (ex.length && !confirm(`Ces titres contiennent encore le texte d’exemple :\n\n${ex.slice(0, 8).join('\n')}\n\nExporter quand même ? (Annuler pour les corriger d’abord.)`)) return;
  if (enLigneV2() && !confirm(`Exporter puis envoyer « ${T.titre || 'la vidéo'} » ${[D.youtube ? 'sur YouTube (' + { private: 'privée', unlisted: 'non répertoriée', prog: 'programmée' }[pubV2.vis] + ')' : '', D.tiktok ? 'dans tes brouillons TikTok' : ''].filter(Boolean).join(' et ')} ?`)) return;
  proj.sortie = $('#xSortie').value; proj.fps = +$('#xFps').value; proj.quality = $('#xQ').value; proj.normaliser = $('#xNorm').checked; commit();
  const partie = $('#xPartie').value || '', [ps, pe] = partie.split('-').map(Number), plage = partie ? { s: ps, e: pe } : undefined;
  const z = $('#expo'); z.innerHTML = '<div class="pv2-prog"><div id="xTxt">Préparation…</div><div id="barreExp"><i></i></div><button id="xStop">Annuler l’export</button></div>';
  exportEnCours = true; if (fond.cours) annulerJob(fond.id);
  let idExp = null; $('#xStop').onclick = () => { $('#xStop').disabled = true; $('#xStop').textContent = 'Arrêt…'; annulerJob(idExp); };
  const t0 = Date.now(), reste = p => { if (p < 0.04 || p >= 0.99) return ''; const r = (Date.now() - t0) / 1000 * (1 - p) / p; return r < 45 ? ' · moins d’une minute' : ` · environ ${Math.round(r / 60)} min restante${r >= 90 ? 's' : ''}`; };
  const barre = (p, t) => { const b = $('#barreExp i'); if (b) b.style.width = Math.round(p * 100) + '%'; const x = $('#xTxt'); if (x) x.textContent = t; };
  let j;
  try { j = await lancerJob('/api/export', { project: proj, plage }, (p, s) => barre(p, `${s} — ${Math.round(p * 100)} %${reste(p)}`), id => { idExp = id; }); }
  catch (e) { exportEnCours = false; z.innerHTML = `<p class="${/annulé/.test(e.message) ? 'mut' : 'err'}">${esc(e.message)}</p><button id="xFin">Revenir</button>`; $('#xFin').onclick = () => exporter(); preparerEnFond(); return; }
  exportEnCours = false;
  const lignes = [`✅ Exporté${j.duree ? ` en ${fmt(j.duree)}` : ''} : <b>${esc(j.out)}</b>${j.repris ? ` <span class="mut">(${j.repris} clip${j.repris > 1 ? 's' : ''} inchangé${j.repris > 1 ? 's' : ''} repris)</span>` : ''}${j.avertissement ? `<br><span class="mut">ℹ ${esc(j.avertissement)}</span>` : ''}`];
  let envoisOk = true;
  const envoyer = async (plateforme, corps) => {
    const { id } = await (await api('/api/publier/montage', { method: 'POST', body: JSON.stringify({ plateforme, fichier: j.out, ...corps }) })).json();
    return suivreTravail(id, k => barre(k.progress || 0, `${plateforme === 'youtube' ? 'YouTube' : 'TikTok'} : ${k.step || 'envoi…'}`));
  };
  const tags = String(T.tags || '').split(/[\s,]+/).map(t => t.replace(/^#/, '')).filter(Boolean);
  if (D.youtube) {
    try { const r = await envoyer('youtube', { titre: T.titre, description: T.description, tags, confidentialite: pubV2.vis === 'prog' ? 'private' : pubV2.vis, programmation: pubV2.vis === 'prog' ? new Date(pubV2.date).toISOString() : '', synthese: !!pubV2.synthese });
      lignes.push(`✅ YouTube : vidéo ${r.programmation ? 'programmée le ' + esc(new Date(r.programmation).toLocaleString('fr-FR')) : r.confidentialite === 'private' ? 'privée' : 'non répertoriée'}. <a href="#" data-ouvrir="studio">Ouvrir YouTube Studio</a> pour vérifier et publier.`); }
    catch (e) { envoisOk = false; lignes.push(`<span class="err">YouTube : ${esc(e.message)}</span>`); }
  }
  if (D.tiktok) {
    try { const r = await envoyer('tiktok', {}); const leg = [T.titre, tags.map(t => '#' + t).join(' ')].filter(Boolean).join('\n');
      let copie = false; if (leg) { try { await navigator.clipboard.writeText(leg); copie = true; } catch (e) { /* copie refusée */ } }
      lignes.push(`✅ TikTok : ${esc(r.message || 'brouillon envoyé')}${copie ? ' La légende est copiée : colle-la dans l’application.' : ''}`); }
    catch (e) { envoisOk = false; lignes.push(`<span class="err">TikTok : ${esc(e.message)}</span>`); }
  }
  if (D.airdrop) { partagerFichiers([j.out]); lignes.push('📲 AirDrop : choisis ton iPhone dans la fenêtre de partage.'); }
  if (!D.mac && enLigneV2() && envoisOk) { await api('/api/exports/retirer', { method: 'POST', body: JSON.stringify({ file: j.out }) }).catch(() => {}); lignes.push('<span class="mut">Fichier retiré du Mac après l’envoi (case « Enregistrer sur le Mac » décochée).</span>'); }
  else lignes.push('<span class="mut">Dossier : Films → QuentMovie → exports</span>');
  if (document.hidden || Date.now() - t0 > 60000) { try { new Notification(enLigneV2() ? 'Export et envoi terminés' : 'Export terminé', { body: j.out, silent: false }); } catch (er) { /* notifications indisponibles */ } }
  const garde = D.mac || !enLigneV2() || !envoisOk;
  z.innerHTML = `<div class="pv2-fin">${lignes.map(l => `<p>${l}</p>`).join('')}<div class="ligne">${garde ? `<button id="xFind">Afficher dans le Finder</button>${D.airdrop ? '' : '<button id="xAir">Envoyer par AirDrop</button>'}` : ''}<button class="pri" id="xFin">Retour au montage</button></div></div>`;
  const l = (id, f) => { const b = $('#' + id); if (b) b.onclick = f; };
  l('xFin', fermerPublierV2); l('xAir', () => partagerFichiers([j.out])); l('xFind', () => api('/api/reveal', { method: 'POST', body: JSON.stringify({ file: j.out }) }));
  z.querySelectorAll('[data-ouvrir]').forEach(a => { a.onclick = ev => { ev.preventDefault(); api('/api/publier/ouvrir', { method: 'POST', body: JSON.stringify({ cible: a.dataset.ouvrir }) }); }; });
}
$('#bExport').onclick = () => exporter();
