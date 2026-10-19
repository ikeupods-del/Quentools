// Tableau des projets (⇧⌘O, bouton de la barre du haut et de l'accueil) : chiffres, recherche, filtres, tri, cartes avec vignette,
// état de l'export (à jour, périmé, aucun), ouvrir, revoir le dernier export image par image, dupliquer, supprimer, ranger les caches.
// Liste calculée par le serveur en lisant les fichiers projets (routes-projets.js) ; vignettes chargées à l'affichage.
'use strict';

const TP = { donnees: null, q: '', format: '', etat: '', tri: 'recent', perimes: false, rangement: '' };
const FORMATS_TP = { vertical: ['Vertical', '9:16'], horizontal: ['Horizontal', '16:9'], carre: ['Carré', '1:1'] };
const ETATS_TP = { ajour: 'À jour', perime: 'Périmé', aucun: 'Aucun export' };
const octetsTP = o => o < 1e6 ? Math.max(0, Math.round(o / 1e3)) + ' Ko' : o < 1e9 ? Math.round(o / 1e6) + ' Mo' : (o / 1e9).toFixed(1).replace('.', ',') + ' Go';
const dureeTP = s => { s = Math.round(+s || 0); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`; };
function quandTP(t) {
  const d = (Date.now() - t) / 1000;
  if (d < 60) return 'à l’instant'; if (d < 3600) return `il y a ${Math.floor(d / 60)} min`; if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  if (d < 2 * 86400) return 'hier';
  const x = new Date(t); return x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(x.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}

(function stylesProjets() {
  const s = document.createElement('style');
  s.textContent = `
#boite.tp-boite{width:min(96vw,1180px);max-height:94vh;padding:22px 24px;background:#111318;border-color:#262a33}
.tp-tete{display:flex;align-items:center;gap:12px;margin-bottom:16px}#boite .tp-tete h2{margin:0;font-size:22px;font-weight:600;letter-spacing:-.01em}.tp-tete button{border-radius:9px;padding:6px 12px}.tp-tete .sp{flex:1}
.tp-chiffres{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.tp-ch{background:var(--pan);border:1px solid #22252d;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:3px;min-width:0}
.tp-ch b{font-size:26px;font-weight:650;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.tp-ch span{color:var(--mut);font-size:12.5px}
.tp-ch.alerte b{color:#f5b84b}.tp-ch.ok b{color:#5fd49a}
.tp-ch.disque{flex-direction:row;align-items:center;gap:12px}.tp-ch.disque>div{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.tp-ch.disque small{color:#7d8495;font-size:11.5px;line-height:1.45;white-space:nowrap}
.tp-ranger{flex:none;padding:7px 12px;border-radius:9px;background:#1d2647;border-color:#3a4a8a;color:#dfe5ff}
.tp-gain{margin:-6px 0 14px;font-size:12.5px;color:#5fd49a}.tp-gain.mut{color:var(--mut)}
.tp-outils{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}
.tp-outils input[type=search]{flex:1;min-width:200px;height:34px;padding:0 12px;border-radius:9px;background:var(--pan);border:1px solid #2a2e38}
.tp-outils select{width:auto;height:34px;padding:0 8px;border-radius:9px;background:var(--pan);border:1px solid #2a2e38}
.tp-case{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mut);padding:0 4px;cursor:pointer}
.tp-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.tp-carte{background:var(--pan);border:1px solid #22252d;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s}
.tp-carte:hover{border-color:#3a4050}.tp-carte.courant{border-color:#3f5ef0}
.tp-vig{position:relative;aspect-ratio:16/9;background:#0b0c0f;display:grid;place-items:center;overflow:hidden;cursor:pointer}
.tp-vig img{position:relative;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .25s}.tp-vig img.vu{opacity:1}
.tp-vig.f-vertical img{object-fit:contain}.tp-vig .tp-flou{position:absolute;inset:-20px;background-size:cover;background-position:center;filter:blur(18px) brightness(.45)}
.tp-vig .tp-vide{color:#4a5060}.tp-vig .tp-vide svg{width:34px;height:34px}
.tp-vig .tp-etat,.tp-vig .tp-dur,.tp-vig .tp-fmt{z-index:1}.tp-vig .tp-dur{position:absolute;right:8px;bottom:8px;background:#000b;color:#fff;font-size:11.5px;padding:2px 7px;border-radius:6px;font-variant-numeric:tabular-nums}
.tp-vig .tp-fmt{position:absolute;left:8px;bottom:8px;background:#000b;color:#cfd3dc;font-size:11px;padding:2px 7px;border-radius:6px}
.tp-etat{position:absolute;left:8px;top:8px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;letter-spacing:.01em}
.tp-etat.ajour{background:#123a28;color:#6ee7b7}.tp-etat.perime{background:#3d2a0e;color:#fbbf5b}.tp-etat.aucun{background:#23262e;color:#a0a6b2}
.tp-corps{padding:11px 13px 4px;display:flex;flex-direction:column;gap:3px;min-width:0}
.tp-nom{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tp-corps small{color:var(--mut);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tp-actions{display:flex;gap:6px;padding:10px 13px 13px;margin-top:auto}
.tp-actions button{height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;gap:5px;font-size:12.5px}
.tp-actions .pri{flex:1}.tp-actions .ib2{width:32px;padding:0;background:transparent;border-color:#2a2e38;color:#c8c8ce}
.tp-actions .ib2:hover{border-color:var(--ac)}.tp-actions .ib2.danger:hover{border-color:var(--ko);color:#ff9a9a}
.tp-actions .ic{width:15px;height:15px}
.tp-rien{grid-column:1/-1;text-align:center;padding:40px 10px;color:var(--mut)}
.acc-h3{display:flex;align-items:center;gap:10px}.acc-tous{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:500;font-size:12.5px;color:var(--txt);background:var(--pan);border-color:#2e3340;border-radius:9px;padding:5px 10px;display:inline-flex;gap:8px;align-items:center}
.acc-tous kbd{font-size:10.5px;color:var(--mut)}
@media (max-width:900px){.tp-chiffres{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  document.head.appendChild(s);
  // bouton dans la barre du haut, à côté d'« Ouvrir un projet »
  const b = $('#bOuvrir'); if (b && !$('#bProjets')) b.insertAdjacentHTML('afterend', '<button class="ib" id="bProjets" title="Tableau des projets (⇧⌘O)"><svg class="ic" viewBox="0 0 24 24"><path d="M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z"/></svg></button>');
  const bp = $('#bProjets'); if (bp) bp.onclick = () => ouvrirTableauProjets();
})();

const ICONES_TP = { dupliquer: 'M8 8h12v12H8z M4 16V4h12', supprimer: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13', revoir: 'M3 5h18v14H3z M10 9l5 3-5 3z', film: 'M4 4h16v16H4z M8 4v16 M16 4v16 M4 9h4 M4 15h4 M16 9h4 M16 15h4' };
const icTP = k => `<svg class="ic" viewBox="0 0 24 24"><path d="${ICONES_TP[k]}"/></svg>`;

async function ouvrirTableauProjets() {
  ouvrir(`<div class="tp"><div class="tp-tete"><h2>Projets</h2><span class="mut" id="tpSous"></span><span class="sp"></span><button id="tpNouveau">Nouveau projet</button><button id="tpFermer">Fermer</button></div>
    <div class="tp-chiffres" id="tpChiffres"><div class="tp-ch"><b>…</b><span>Chargement</span></div></div><div id="tpGain"></div>
    <div class="tp-outils">
      <input type="search" id="tpQ" placeholder="Rechercher un projet par son nom" aria-label="Rechercher un projet" value="${esc(TP.q)}">
      <select id="tpFormat" aria-label="Format"><option value="">Tous les formats</option>${Object.entries(FORMATS_TP).map(([k, [n, r]]) => `<option value="${k}" ${TP.format === k ? 'selected' : ''}>${n} ${r}</option>`).join('')}</select>
      <select id="tpEtat" aria-label="État de l’export"><option value="">Tous les états</option><option value="aucun" ${TP.etat === 'aucun' ? 'selected' : ''}>Sans export</option><option value="ajour" ${TP.etat === 'ajour' ? 'selected' : ''}>Export à jour</option><option value="perime" ${TP.etat === 'perime' ? 'selected' : ''}>Export périmé</option></select>
      <select id="tpTri" aria-label="Trier"><option value="recent">Modifiés récemment</option><option value="nom" ${TP.tri === 'nom' ? 'selected' : ''}>Nom (A → Z)</option><option value="duree" ${TP.tri === 'duree' ? 'selected' : ''}>Durée (plus longs d’abord)</option></select>
      <label class="tp-case"><input type="checkbox" id="tpPerimes" ${TP.perimes ? 'checked' : ''}> Périmés seuls</label>
    </div>
    <div class="tp-grille" id="tpGrille"></div></div>`, 'xl');
  $('#boite').classList.add('tp-boite');
  const b = $('#boite');
  finFenetre = () => { b.classList.remove('tp-boite'); b.onclick = null; if (TP.obs) TP.obs.disconnect(); };
  $('#tpFermer').onclick = fermer;
  $('#tpNouveau').onclick = async () => { fermer(); await nouveau(); };
  $('#tpQ').oninput = e => { TP.q = e.target.value; dessinerProjets(); };
  $('#tpFormat').onchange = e => { TP.format = e.target.value; dessinerProjets(); };
  $('#tpEtat').onchange = e => { TP.etat = e.target.value; dessinerProjets(); };
  $('#tpTri').onchange = e => { TP.tri = e.target.value; dessinerProjets(); };
  $('#tpPerimes').onchange = e => { TP.perimes = e.target.checked; dessinerProjets(); };
  b.onclick = actionProjet;
  TP.rangement = '';
  await chargerProjets();
}
async function chargerProjets() {
  try { TP.donnees = await (await api('/api/tableau-projets')).json(); } catch (e) { const g = $('#tpGrille'); if (g) g.innerHTML = `<p class="tp-rien err">Liste indisponible : ${esc(e.message)}</p>`; return; }
  if (!$('#tpGrille')) return; // fenêtre fermée entre-temps
  dessinerChiffres(); dessinerProjets();
}
function dessinerChiffres() {
  const D = TP.donnees, c = D.chiffres, k = D.disque, z = $('#tpChiffres'); if (!z) return;
    z.innerHTML = `<div class="tp-ch"><b>${c.projets}</b><span>${c.projets > 1 ? 'projets enregistrés' : 'projet enregistré'}</span></div>
    <div class="tp-ch ok"><b>${c.avecExport}</b><span>avec un export</span></div>
    <div class="tp-ch ${c.perimes ? 'alerte' : ''}"><b>${c.perimes}</b><span>${c.perimes > 1 ? 'exports périmés · à refaire' : c.perimes ? 'export périmé · à refaire' : 'export périmé'}</span></div>
    <div class="tp-ch disque"><div><b>${octetsTP(k.exports + k.caches)}</b><span>sur le disque</span><small title="${esc(k.detail.map(d => `${d.nom} : ${octetsTP(d.octets)}`).join('\n'))}">Exports ${octetsTP(k.exports)}<br>Caches ${octetsTP(k.caches)}</small></div>
      <button class="tp-ranger" id="tpRanger" title="Libère les rendus en cache, copies de lecture, vignettes et fichiers temporaires (refaits à la demande). Projets, médias et exports ne sont jamais touchés.">Ranger</button></div>`;
  $('#tpSous').textContent = '';
  $('#tpGain').innerHTML = TP.rangement;
  $('#tpRanger').onclick = rangerCaches;
}
const projetsVisibles = () => {
  const q = TP.q.trim().toLowerCase();
  const l = (TP.donnees ? TP.donnees.projets : []).filter(p => (!q || p.nom.toLowerCase().includes(q)) && (!TP.format || p.format === TP.format)
    && (TP.perimes ? p.etat === 'perime' : !TP.etat || p.etat === TP.etat));
  const tri = { recent: (a, b) => b.date - a.date, nom: (a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base', numeric: true }), duree: (a, b) => b.duree - a.duree || b.date - a.date }[TP.tri] || ((a, b) => b.date - a.date);
  return l.sort(tri);
};
function carteProjet(p) {
  const F = FORMATS_TP[p.format] || FORMATS_TP.vertical, v = p.vignette;
  const img = v && v.file ? `<span class="tp-flou" data-flou></span><img alt="" data-src="/api/frame?file=${enc(v.file)}&t=${v.t}&w=480">` : v && v.couleur ? '' : `<span class="tp-vide">${icTP('film')}</span>`;
  const exp = p.dernierExport ? `Exporté ${quandTP(p.dernierExport.date)} · ${octetsTP(p.dernierExport.taille)}` : 'Jamais exporté';
  const titreEtat = { ajour: 'Le dernier export correspond au projet', perime: 'Projet modifié après son dernier export : à refaire', aucun: 'Ce projet n’a pas encore été exporté' }[p.etat];
  return `<article class="tp-carte ${p.nom === projetCourant ? 'courant' : ''}" data-tp="${esc(p.nom)}">
    <div class="tp-vig f-${p.format}" data-tpa="ouvrir" title="Ouvrir « ${esc(p.nom)} »" ${v && v.couleur ? `style="background:${esc(v.couleur)}"` : ''}>${img}
      <span class="tp-etat ${p.etat}" title="${titreEtat}">${ETATS_TP[p.etat]}</span><span class="tp-fmt">${F[1]}</span><span class="tp-dur">${dureeTP(p.duree)}</span></div>
    <div class="tp-corps"><span class="tp-nom" title="${esc(p.nom)}">${esc(p.nom)}${p.lisible ? '' : ' <span class="err">(illisible)</span>'}</span>
      <small>Modifié ${quandTP(p.date)} · ${F[0]} · ${p.clips} clip${p.clips > 1 ? 's' : ''}</small><small>${exp}</small></div>
    <div class="tp-actions"><button class="pri" data-tpa="ouvrir">Ouvrir</button>
      <button class="ib2" data-tpa="revoir" title="${p.revoir ? 'Revoir le dernier export image par image' : 'Aucun export à revoir'}" ${p.revoir ? '' : 'disabled'}>${icTP('revoir')}</button>
      <button class="ib2" data-tpa="dupliquer" title="Dupliquer le projet">${icTP('dupliquer')}</button>
      <button class="ib2 danger" data-tpa="supprimer" title="Supprimer le projet (médias et exports gardés)">${icTP('supprimer')}</button></div></article>`;
}
function dessinerProjets() {
  const g = $('#tpGrille'); if (!g || !TP.donnees) return;
  const l = projetsVisibles(), tous = TP.donnees.projets.length;
  g.innerHTML = l.length ? l.map(carteProjet).join('') : `<p class="tp-rien">${tous ? 'Aucun projet ne correspond à ta recherche.' : 'Aucun projet enregistré pour l’instant : enregistre ton montage avec ⌘S, il apparaîtra ici.'}</p>`;
  $('#tpSous').textContent = l.length !== tous ? `${l.length} sur ${tous}` : '';
  // vignettes chargées quand la carte devient visible (MacBook Air : pas de calcul pour les cartes hors de la fenêtre)
  if (TP.obs) TP.obs.disconnect();
  const charger = im => { im.onload = () => { im.classList.add('vu'); const f = im.parentNode.querySelector('[data-flou]'); if (f && im.closest('.f-vertical')) f.style.backgroundImage = `url("${im.src}")`; }; im.onerror = () => im.remove(); im.src = im.dataset.src; };
  const imgs = [...g.querySelectorAll('img[data-src]')];
  if (!('IntersectionObserver' in window)) return imgs.forEach(charger);
  TP.obs = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { TP.obs.unobserve(e.target); charger(e.target); } }, { root: $('#boite'), rootMargin: '200px' });
  imgs.forEach(im => TP.obs.observe(im));
}
async function actionProjet(e) {
  const a = e.target.closest('[data-tpa]'), c = e.target.closest('[data-tp]'); if (!a || !c || a.disabled) return;
  const p = (TP.donnees.projets || []).find(x => x.nom === c.dataset.tp); if (!p) return;
  const quoi = a.dataset.tpa;
  if (quoi === 'ouvrir') { await ouvrirProjetNomme(p.nom); if (proj.clips.length && typeof masquerAccueil === 'function') masquerAccueil(); return; }
  if (quoi === 'revoir') return ouvrirRevueExport((p.dernierExport && p.dernierExport.fichier) || p.revoir);
  try {
    if (quoi === 'dupliquer') { const r = await (await api('/api/tableau-projets/dupliquer', { method: 'POST', body: JSON.stringify({ nom: p.nom }) })).json(); signal(`Projet dupliqué : « ${r.nom} ».`); }
    if (quoi === 'supprimer') {
      if (!confirm(`Supprimer le projet « ${p.nom} » ?\n\nSeul le fichier du projet est supprimé : tes médias et tes vidéos exportées sont gardés.`)) return;
      await api('/api/tableau-projets/supprimer', { method: 'POST', body: JSON.stringify({ nom: p.nom }) });
      if (p.nom === projetCourant) choisirProjetCourant('');
      signal(`Projet « ${p.nom} » supprimé.`);
    }
  } catch (er) { return signal(er.message); }
  await chargerProjets();
}
async function rangerCaches() {
  const b = $('#tpRanger'); b.disabled = true; b.textContent = 'Rangement…';
  try {
    const r = await (await api('/api/tableau-projets/ranger', { method: 'POST' })).json();
    TP.donnees.disque = r.disque;
    TP.rangement = `<p class="tp-gain ${r.gagne ? '' : 'mut'}">${r.gagne ? `✓ ${octetsTP(r.gagne)} libérés. Les caches se referont tout seuls quand il le faudra.` : 'Rien à ranger : les caches sont déjà vides.'}${r.laisses.length ? ` <span class="mut">(${esc(r.laisses.join(', ').toLowerCase())} gardés : un rendu est en cours)</span>` : ''}</p>`;
    signal(r.gagne ? `${octetsTP(r.gagne)} libérés sur le disque.` : 'Rien à ranger.');
  } catch (er) { TP.rangement = `<p class="tp-gain err">${esc(er.message)}</p>`; }
  dessinerChiffres();
}
