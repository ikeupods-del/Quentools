// Retours image par image (onglet « Retours » du panneau de droite) : vidéo sur l'image exacte, un retour écrit à cet instant,
// liste des retours (clic = retour à l'image), repères jaunes sur la règle de la timeline, envoi d'un retour à l'assistant
// (il propose les changements à valider à cet instant), copie en texte et fichier .json. Gardés dans le projet : proj.retours.
// Chargé après ui-chat.js : s'appuie sur panneauDroite, envoyerChat, etiquetteInstant, placerTete, lire, stopLecture, commit…
'use strict';

const retoursDe = () => (proj.retours = Array.isArray(proj.retours) ? proj.retours : []);
const imageDe = t => Math.round(t * (proj.fps || 30));
(function ongletRetours() {
  const d = $('#droite'); if (!d) return;
  d.querySelector('.dr-onglets').insertAdjacentHTML('beforeend', '<button role="tab" data-dr="retours">Retours</button>');
  const s = document.createElement('section'); s.id = 'retours'; s.hidden = true;
  s.innerHTML = `<div class="rt-tc"><b id="rtTc">00:00 · image 0</b><span class="mut" id="rtNb"></span></div>
    <div class="rt-nav" role="group" aria-label="Se déplacer image par image">
      <button data-rtn="-1" title="1 seconde avant (⇧←)">−1 s</button><button data-rtn="-i" title="Image précédente (←)">−1 img</button>
      <button data-rtn="lire" class="pri" id="rtLire" title="Lire / pause (Espace)">▶</button>
      <button data-rtn="+i" title="Image suivante (→)">+1 img</button><button data-rtn="+1" title="1 seconde après (⇧→)">+1 s</button></div>
    <p class="mut rt-aide">Mets la vidéo sur l’image exacte, écris ton retour, Entrée pour l’ajouter. ← → image par image, ↑ pour écrire un retour.</p>
    <div class="rt-saisie"><textarea id="rtTexte" rows="2" placeholder="Ton retour sur cette image… (Entrée pour ajouter)" aria-label="Retour sur cette image"></textarea><button class="pri" id="rtAjout">Ajouter</button></div>
    <div id="rtListe" class="rt-liste"></div>
    <button id="rtRevue" class="rt-revue" title="Ouvrir une vidéo exportée en grand et la commenter image par image">🎯 Revoir un rendu exporté</button>
    <div class="rt-actions"><button id="rtCopier" title="Copier la liste en texte (minutage, numéro d’image, retour)">📋 Copier</button><button id="rtJson">⬇ .json</button><button class="pri" id="rtTous" title="L’assistant propose les changements de chaque retour, à son instant ; tu valides">✨ Faire corriger</button></div>`;
  d.appendChild(s);
})();
const panneauRetours0 = panneauDroite;
panneauDroite = function (p) {
  panneauRetours0.call(this, p === 'retours' ? 'reglages' : p);
  document.querySelectorAll('#droite [data-dr]').forEach(b => { b.classList.toggle('on', b.dataset.dr === p); b.setAttribute('aria-selected', b.dataset.dr === p); });
  $('#retours').hidden = p !== 'retours'; if (p === 'retours') { $('#insp').hidden = true; dessinerRetours(); }
};
const retoursOuvert = () => { const r = $('#retours'); return !!r && !r.hidden; };
function majTc() {
  if (!retoursOuvert()) return;
  $('#rtTc').textContent = etiquetteInstant(gt); $('#rtLire').textContent = lecture ? '⏸' : '▶';
}
setInterval(majTc, 200);
function dessinerRetours() {
  const l = retoursDe().slice().sort((a, b) => a.t - b.t), z = $('#rtListe'); if (!z) return;
  const faits = l.filter(r => r.fait).length;
  $('#rtNb').textContent = l.length ? `${l.length} retour${l.length > 1 ? 's' : ''}${faits ? ` · ${faits} fait${faits > 1 ? 's' : ''}` : ''}` : '';
  z.innerHTML = l.length ? l.map(r => `<div class="rt-r ${r.fait ? 'fait' : ''}" data-rt="${esc(r.id)}">
      <button class="rt-t" data-rtgo title="${r.source ? 'Revoir dans le rendu ' + esc(r.source) : 'Aller à cette image'}">${esc(etiquetteInstant(r.t))}${r.source ? ' · 🎬' : ''}</button>
      <div class="rt-txt">${esc(r.texte)}</div>
      <div class="rt-b"><button class="mini" data-rtfaire title="Demander ce changement à l’assistant, à cet instant">✨</button><button class="mini" data-rtfait title="${r.fait ? 'Marquer à faire' : 'Marquer fait'}">${r.fait ? '↺' : '✓'}</button><button class="mini" data-rtsup title="Supprimer ce retour">✕</button></div></div>`).join('')
    : '<p class="mut">Aucun retour pour l’instant.</p>';
  majTc(); if (typeof tlDessin === 'function') tlDessin();
}
function ajouterRetour() {
  const x = $('#rtTexte'), texte = x.value.replace(/\s+/g, ' ').trim(); if (!texte) return x.focus();
  if (!proj.clips.length) return signal('Ajoute d’abord une vidéo au montage.');
  if (lecture) stopLecture();
  retoursDe().push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: +gt.toFixed(3), image: imageDe(gt), texte: texte.slice(0, 1000), fait: false });
  x.value = ''; commit(); dessinerRetours(); x.focus();
}
const texteRetours = () => {
  const l = retoursDe().slice().sort((a, b) => a.t - b.t);
  return `Retours image par image · ${proj.nom || 'montage'} · ${proj.fps || 30} images/s\n` + l.map(r => `${etiquetteInstant(r.t)}${r.fait ? ' (fait)' : ''} — ${r.texte}`).join('\n');
};
// un retour envoyé à l'assistant, à son instant : il propose les actions (boutons à valider dans la discussion)
async function faireCorriger(r) {
  if (lecture) stopLecture();
  placerTete(r.t, { sansSelection: true });
  panneauDroite('chat');
  await envoyerChat(r.texte);
}
$('#retours').addEventListener('click', async e => {
  const n = e.target.closest('[data-rtn]');
  if (n) { const k = n.dataset.rtn, pas = 1 / (proj.fps || 30);
    if (k === 'lire') return lecture ? stopLecture() : lire();
    if (lecture) stopLecture();
    placerTete(Math.max(0, gt + ({ '-1': -1, '+1': 1, '-i': -pas, '+i': pas })[k]), { sansSelection: true }); return majTc(); }
  const ligne = e.target.closest('[data-rt]'); if (!ligne) return;
  const r = retoursDe().find(x => x.id === ligne.dataset.rt); if (!r) return;
  if (e.target.closest('[data-rtsup]')) { proj.retours = retoursDe().filter(x => x !== r); commit(); return dessinerRetours(); }
  if (e.target.closest('[data-rtfait]')) { r.fait = !r.fait; commit(); return dessinerRetours(); }
  if (e.target.closest('[data-rtfaire]')) { r.envoye = true; commit(); return faireCorriger(r); }
  if (r.source && e.target.closest('[data-rtgo]')) return ouvrirRevueExport(r.source);
  if (lecture) stopLecture(); placerTete(r.t, { sansSelection: true });
});
$('#rtAjout').onclick = ajouterRetour;
$('#rtRevue').onclick = () => ouvrirRevueExport();
$('#rtTexte').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ajouterRetour(); } if (e.key === 'Escape') e.target.blur(); });
$('#rtCopier').onclick = async () => { if (!retoursDe().length) return signal('Aucun retour à copier.'); try { await navigator.clipboard.writeText(texteRetours()); signal('Retours copiés : colle-les où tu veux.'); } catch (er) { signal('Copie impossible : ' + er.message); } };
$('#rtJson').onclick = () => {
  if (!retoursDe().length) return signal('Aucun retour à enregistrer.');
  const blob = new Blob([JSON.stringify({ projet: proj.nom || 'montage', fps: proj.fps || 30, retours: retoursDe().slice().sort((a, b) => a.t - b.t).map(r => ({ temps: r.t, image: imageDe(r.t), minutage: etiquetteInstant(r.t), texte: r.texte, fait: !!r.fait })) }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `retours-${String(proj.nom || 'montage').replace(/[^\p{L}\p{N}-]+/gu, '-')}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
// tous les retours à faire, l'un après l'autre : chaque proposition de l'assistant reste à valider dans la discussion
$('#rtTous').onclick = async () => {
  const l = retoursDe().filter(r => !r.fait).sort((a, b) => a.t - b.t); if (!l.length) return signal('Aucun retour à faire.');
  for (const r of l) { r.envoye = true; await faireCorriger(r); }
  commit();
};
// touches de l'onglet : ↑ pour écrire un retour (les flèches ← → et Espace restent celles de la visionneuse)
document.addEventListener('keydown', e => {
  if (!retoursOuvert() || e.key !== 'ArrowUp' || e.metaKey || e.ctrlKey || e.altKey) return;
  const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
  if ($('#modal') && $('#modal').classList.contains('on')) return;
  e.preventDefault(); e.stopImmediatePropagation(); if (lecture) stopLecture(); $('#rtTexte').focus();
}, true);

// ---------- Revoir un rendu exporté, en grand, image par image (les retours vont dans la même liste, avec le nom du fichier) ----------
async function ouvrirRevueExport(fichier) {
  let l = []; try { l = (await (await api('/api/exports')).json()).exports || []; } catch (e) { /* liste indisponible */ }
  l = l.filter(x => /\.(mp4|mov|m4v|webm)$/i.test(x.nom));
  if (!l.length) return signal('Aucune vidéo exportée à revoir : exporte d’abord le montage.');
  const fps = proj.fps || 30, src = fichier && l.some(x => x.nom === fichier) ? fichier : l[0].nom;
  ouvrir(`<h2>🎯 Retours image par image</h2>
    <div class="rv"><div class="rv-g"><video id="rvV" preload="auto" playsinline></video>
      <div class="rv-barre"><div id="rvMk" class="rv-mk"></div><input type="range" id="rvPos" min="0" max="1000" value="0" aria-label="Position dans la vidéo"></div>
      <div class="rt-nav"><button data-rv="-1">−1 s</button><button data-rv="-i">−1 img</button><button data-rv="lire" class="pri" id="rvLire">▶</button><button data-rv="+i">+1 img</button><button data-rv="+1">+1 s</button><b id="rvTc" class="rv-tc"></b></div></div>
    <div class="rv-d"><div class="ligne"><label>Rendu <select id="rvSrc">${l.map(x => `<option value="${esc(x.nom)}" ${x.nom === src ? 'selected' : ''}>${esc(x.nom)}</option>`).join('')}</select></label><span class="sp"></span><button id="rvPlein">Plein écran</button></div>
      <p class="mut">Mets la vidéo sur l’image exacte, écris ton retour, Entrée pour l’ajouter. Clique un retour pour revenir à son image. Espace = lecture · ← → = image par image (⇧ : 1 s) · ↑ = écrire un retour.</p>
      <div class="rt-saisie"><textarea id="rvTexte" rows="2" placeholder="Ton retour sur cette image… (Entrée pour ajouter)"></textarea><button class="pri" id="rvAjout">Ajouter</button></div>
      <div id="rvListe" class="rt-liste"></div>
      <div class="rt-actions"><button id="rvCopier">📋 Copier</button><button id="rvJson">⬇ .json</button><button class="pri" id="rvFaire" title="Ferme la revue ; l’assistant propose les changements de chaque retour à son instant du montage">✨ Faire corriger</button></div></div></div>`, 'xl');
  const v = $('#rvV'), tcDe = t => etiquetteInstant(t), duree = () => v.duration || 0;
  const charger = n => { v.src = '/exports/' + encodeURIComponent(n); v.dataset.nom = n; dessiner(); };
  const ici = () => retoursDe().filter(r => r.source === v.dataset.nom).sort((a, b) => a.t - b.t);
  function dessiner() {
    const z = $('#rvListe'); if (!z) return; const l2 = ici();
    z.innerHTML = l2.length ? l2.map(r => `<div class="rt-r ${r.fait ? 'fait' : ''}" data-rt="${esc(r.id)}"><button class="rt-t" data-rvgo>${esc(tcDe(r.t))}</button><div class="rt-txt">${esc(r.texte)}</div><div class="rt-b"><button class="mini" data-rvfait>${r.fait ? '↺' : '✓'}</button><button class="mini" data-rvsup>✕</button></div></div>`).join('') : '<p class="mut">Aucun retour sur ce rendu.</p>';
    const d = duree(); $('#rvMk').innerHTML = d ? l2.map(r => `<i style="left:${(r.t / d * 100).toFixed(2)}%" title="${esc(r.texte.slice(0, 60))}"></i>`).join('') : '';
  }
  const aller = t => { v.pause(); v.currentTime = Math.max(0, Math.min(duree() || t, t)); };
  const pas = 1 / fps;
  v.addEventListener('loadedmetadata', dessiner);
  v.addEventListener('timeupdate', () => { const p = $('#rvPos'), c = $('#rvTc'); if (p && duree()) p.value = Math.round(v.currentTime / duree() * 1000); if (c) c.textContent = tcDe(v.currentTime); });
  v.addEventListener('play', () => { const b = $('#rvLire'); if (b) b.textContent = '⏸'; }); v.addEventListener('pause', () => { const b = $('#rvLire'); if (b) b.textContent = '▶'; });
  $('#rvPos').oninput = e => aller(+e.target.value / 1000 * duree());
  $('#rvSrc').onchange = e => charger(e.target.value);
  $('#rvPlein').onclick = () => v.requestFullscreen && v.requestFullscreen();
  const ajouter = () => { const x = $('#rvTexte'), t = x.value.replace(/\s+/g, ' ').trim(); if (!t) return x.focus(); v.pause();
    retoursDe().push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: +v.currentTime.toFixed(3), image: Math.round(v.currentTime * fps), texte: t.slice(0, 1000), fait: false, source: v.dataset.nom });
    x.value = ''; commit(); dessiner(); dessinerRetours(); x.focus(); };
  $('#rvAjout').onclick = ajouter;
  $('#rvTexte').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ajouter(); } if (e.key === 'Escape') { e.stopPropagation(); e.target.blur(); } });
  $('#modal').addEventListener('click', e => {
    const n = e.target.closest('[data-rv]');
    if (n) { const k = n.dataset.rv; if (k === 'lire') return v.paused ? v.play() : v.pause(); return aller(v.currentTime + ({ '-1': -1, '+1': 1, '-i': -pas, '+i': pas })[k]); }
    const ligne = e.target.closest('#rvListe [data-rt]'); if (!ligne) return;
    const r = retoursDe().find(x => x.id === ligne.dataset.rt); if (!r) return;
    if (e.target.closest('[data-rvsup]')) { proj.retours = retoursDe().filter(x => x !== r); commit(); dessinerRetours(); return dessiner(); }
    if (e.target.closest('[data-rvfait]')) { r.fait = !r.fait; commit(); dessinerRetours(); return dessiner(); }
    aller(r.t);
  });
  const texte = () => `Retours image par image · ${v.dataset.nom} · ${fps} images/s\n` + ici().map(r => `${tcDe(r.t)}${r.fait ? ' (fait)' : ''} — ${r.texte}`).join('\n');
  $('#rvCopier').onclick = async () => { if (!ici().length) return signal('Aucun retour à copier.'); try { await navigator.clipboard.writeText(texte()); signal('Retours copiés.'); } catch (er) { signal('Copie impossible : ' + er.message); } };
  $('#rvJson').onclick = () => { if (!ici().length) return signal('Aucun retour à enregistrer.');
    const blob = new Blob([JSON.stringify({ rendu: v.dataset.nom, fps, retours: ici().map(r => ({ temps: r.t, image: Math.round(r.t * fps), minutage: tcDe(r.t), texte: r.texte, fait: !!r.fait })) }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `retours-${v.dataset.nom.replace(/\.[^.]+$/, '')}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  $('#rvFaire').onclick = async () => { const l2 = ici().filter(r => !r.fait); if (!l2.length) return signal('Aucun retour à faire.'); v.pause(); fermer(); for (const r of l2) { r.envoye = true; await faireCorriger(r); } commit(); };
  // touches de la revue : Espace, ← →, ⇧ ← →, ↑ (avant les raccourcis du montage, qui ne doivent pas agir derrière la fenêtre)
  const touches = e => {
    if (!$('#rvV')) return document.removeEventListener('keydown', touches, true);
    const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.tagName === 'SELECT')) return;
    const k = e.key; if (![' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(k)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (k === ' ') return v.paused ? v.play() : v.pause();
    if (k === 'ArrowUp') { v.pause(); return $('#rvTexte').focus(); }
    aller(v.currentTime + (k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : pas));
  };
  document.addEventListener('keydown', touches, true);
  charger(src);
}
