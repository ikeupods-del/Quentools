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
function masquerAccueil() { const a = $('#accueil'); if (a) a.remove(); etapeV2('monter'); }
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

$('#eCreer').onclick = afficherAccueil;
$('#eMonter').onclick = masquerAccueil;
$('#bPublier').addEventListener('click', masquerAccueil);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#accueil')) masquerAccueil(); });
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
let ongletInsp = 'decoupe';
const inspV1 = inspecteur;
inspecteur = function () {
  inspV1.apply(this, arguments);
  const parts = [...document.querySelectorAll('#insp > details, #insp .insp > details')];
  if (parts.length < 3) return;
  const de = d => { const t = (d.querySelector('summary') || {}).textContent || ''; const o = ONGLETS_INSP.find(x => x.motif.test(t.trim())); return o ? o.id : 'image'; };
  const presents = ONGLETS_INSP.filter(o => parts.some(d => de(d) === o.id));
  if (!presents.some(o => o.id === ongletInsp)) ongletInsp = presents[0].id;
  parts.forEach(d => { const dans = de(d) === ongletInsp; d.hidden = !dans; if (dans) d.open = true; });
  parts[0].insertAdjacentHTML('beforebegin', `<div class="onglets-insp" role="tablist">${presents.map(o => `<button role="tab" data-oi="${o.id}" class="${o.id === ongletInsp ? 'on' : ''}">${o.nom}</button>`).join('')}</div>`);
};
$('#insp').addEventListener('click', e => { const b = e.target.closest('[data-oi]'); if (b) { ongletInsp = b.dataset.oi; inspecteur(); } });
