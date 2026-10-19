// Rubrique « Animations » (Texte → Animations) : génériques, chiffres clés, bandeaux, « Abonne-toi », listes et volets (animations.js).
// Chaque modèle se remplit, se prévisualise (une image), puis se fabrique et se pose : générique d'ouverture au début de la vidéo,
// générique de fin à la fin, les autres par-dessus la vidéo à la tête de lecture (piste vidéo 2, transparents).
'use strict';

let catalogueAnim = null;
const valeursAnim = {}; // valeurs écrites, gardées pendant la séance
const animEnCours = new Map(); // modèle → texte d'avancement, pendant sa fabrication (le panneau peut être redessiné entre-temps)
const navV22 = navigateur;
navigateur = function () {
  navV22.apply(this, arguments);
  if (tab === 'animations') dessinerAnimations();
};
async function dessinerAnimations() {
  const z = $('#navbody');
  if (!catalogueAnim) { try { catalogueAnim = await (await api('/api/animations')).json(); } catch (e) { z.insertAdjacentHTML('beforeend', `<p class="err">${esc(e.message)}</p>`); return; } }
  if (tab !== 'animations') return;
  const titre = (proj.publication && proj.publication.titre) || (proj.gen && proj.gen.titre) || '';
  z.querySelectorAll('.anim-liste').forEach(x => x.remove());
  z.insertAdjacentHTML('beforeend', `<div class="anim-liste"><p class="mut">Remplis, regarde l’aperçu, puis « Poser ». Les génériques se mettent au début ou à la fin ; les autres se posent par-dessus la vidéo à la tête de lecture (piste vidéo 2), transparents.${catalogueAnim.pret ? '' : ' <b>Fabrication dans l’application Mac seulement.</b>'}</p>
    ${catalogueAnim.modeles.map(m => { const v = valeursAnim[m.id] || {};
      return `<div class="anim-carte" data-anim="${m.id}"><div class="anim-tete"><b>${esc(m.nom)}</b><small class="mut">${m.type === 'plein' ? 'générique' : 'par-dessus'} · ${String(m.duree).replace('.', ',')} s</small></div>
      <p class="mut">${esc(m.desc)}</p><div class="anim-apercu" hidden></div>
      ${m.champs.map(c => c.cle === 'couleur' || c.options ? `<label class="l">${esc(c.libelle)}</label><select data-champ="${c.cle}">${(c.options || m.couleurs || []).map(x => `<option value="${x}" ${(v[c.cle] || c.defaut) === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`
        : `<label class="l">${esc(c.libelle)}</label><input type="text" data-champ="${c.cle}" value="${esc(v[c.cle] != null ? v[c.cle] : c.cle === 'titre' && titre && m.id === 'intro' ? titre : '')}" placeholder="${esc(c.defaut)}">`).join('')}
      <div class="ligne" style="margin-top:8px"><button class="mini" data-anim-voir>Aperçu</button><span class="sp"></span><button class="mini pri" data-anim-poser ${animEnCours.has(m.id) ? 'disabled' : ''}>Poser</button></div><div class="mut anim-etat">${esc(animEnCours.get(m.id) || '')}</div></div>`; }).join('')}</div>`);
}
const valeursDe = carte => { const v = {}; carte.querySelectorAll('[data-champ]').forEach(x => { v[x.dataset.champ] = x.value; }); valeursAnim[carte.dataset.anim] = v; return v; };
$('#navbody').addEventListener('click', async e => {
  const b = e.target.closest('[data-anim-voir],[data-anim-poser]'); if (!b || tab !== 'animations') return;
  const carte = b.closest('[data-anim]'), id = carte.dataset.anim, v = valeursDe(carte), poser = b.dataset.animPoser !== undefined;
  if (poser && animEnCours.has(id)) return;
  // carte affichée en ce moment (le panneau a pu être redessiné)
  const ici = () => $('#navbody').querySelector(`.anim-liste [data-anim="${id}"]`) || carte;
  const dire = t => { if (poser && animEnCours.has(id)) animEnCours.set(id, t); const e = ici().querySelector('.anim-etat'); if (e) e.textContent = t; };
  b.disabled = true; if (poser) animEnCours.set(id, 'Fabrication…');
  try {
    if (b.dataset.animVoir !== undefined) {
      dire('Aperçu…');
      const r = await api('/api/animations/apercu', { method: 'POST', body: JSON.stringify({ id, valeurs: v, format: proj.format }) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Aperçu impossible');
      const a = ici().querySelector('.anim-apercu'); a.hidden = false; a.classList.toggle('damier', j.type === 'calque'); a.innerHTML = `<img src="${j.image}" alt="Aperçu de l’animation">`; dire('');
    } else {
      dire('Fabrication…');
      const { id: job } = await (await api('/api/animations/rendre', { method: 'POST', body: JSON.stringify({ id, valeurs: v, format: proj.format }) })).json().then(j => { if (j.error) throw new Error(j.error); return j; });
      const r = await suivreTravail(job, k => { dire(`Fabrication… ${k.step || ''} ${Math.round((k.progress || 0) * 100)} %`); });
      animEnCours.delete(id); await chargerMedias(); poserAnimation(r); dire('✅ Posée.');
    }
  } catch (er) { if (poser) animEnCours.delete(id); dire(er.message); }
  b.disabled = false; const p = ici().querySelector(b.dataset.animVoir !== undefined ? '[data-anim-voir]' : '[data-anim-poser]'); if (p) p.disabled = false;
});
$('#navbody').addEventListener('input', e => { const c = e.target.closest('[data-anim]'); if (c && e.target.dataset.champ) valeursDe(c); });
// générique d'ouverture : premier clip ; générique de fin : dernier clip ; le reste : piste vidéo 2 à la tête de lecture, plein écran
function poserAnimation(r) {
  const m = medias.find(x => x.file === r.file) || { file: r.file, kind: 'video', duration: r.duree, hasAudio: false };
  if (r.type === 'plein') {
    const c = newClip(m); c.hasAudio = false; c.vol = 0;
    if (r.id === 'intro' || !proj.clips.length) { suivreV1(() => proj.clips.unshift(c)); sel = 0; }
    else { proj.clips.push(c); sel = proj.clips.length - 1; }
    commit(); tout(); apercu();
    return aide(`🎬 ${r.id === 'intro' ? 'Générique d’ouverture posé au début' : 'Générique de fin posé à la fin'} de la vidéo (${fmt(r.duree)}). ⌘Z pour annuler.`);
  }
  proj.pistes = proj.pistes || [];
  const debut = r.id === 'volet' ? Math.max(0, gt - r.duree / 2) : gt; // volet : centré sur la coupe sous la tête de lecture
  proj.pistes.push({ file: r.file, kind: 'video', start: +debut.toFixed(2), in: 0, out: +r.duree.toFixed(2), dur: +r.duree.toFixed(2), plein: true, x: 50, y: 50, scale: 100, opacity: 100, vol: 0, hasAudio: false, anim: '' });
  selP = proj.pistes.length - 1; sel = selA = selT = selCut = -1;
  commit(); tout(); apercuRetarde();
  aide(`✨ Animation posée à ${fmtChrono(debut)} sur la piste vidéo 2 (par-dessus la vidéo, ${fmt(r.duree)}). Glisse-la pour la déplacer ; ⌘Z pour annuler.`);
}

// « mets un générique d'ouverture », « ajoute un bandeau » (assistant) : le modèle est fabriqué avec ses valeurs par défaut (ou celles écrites dans le panneau)
async function poserAnimationParId(id) {
  const { id: job, error } = await (await api('/api/animations/rendre', { method: 'POST', body: JSON.stringify({ id, valeurs: valeursAnim[id] || (id === 'intro' && proj.publication && proj.publication.titre ? { titre: proj.publication.titre } : {}), format: proj.format }) })).json();
  if (error) throw new Error(error);
  const r = await suivreTravail(job, k => aide(`✨ Animation : ${esc(k.step || '')} ${Math.round((k.progress || 0) * 100)} %`));
  await chargerMedias(); poserAnimation(r);
}
const execV23 = executerAction;
executerAction = async function (a) {
  if (a.action === 'animation') { if (a.instant != null && Number.isFinite(+a.instant)) placerTete(+a.instant, { sansSelection: true }); return poserAnimationParId(a.parametre || 'intro'); }
  return execV23.apply(this, arguments);
};
