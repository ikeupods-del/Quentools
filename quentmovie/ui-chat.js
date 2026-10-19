// Interface 2.1 : discussion avec l'assistant, dans le panneau de droite (onglets « Réglages du clip » et « Assistant »).
// Chaque demande reçoit une réponse : ce que l'assistant va faire (boutons pour le faire), une réponse calculée par le programme
// (durée, format…), ou des choix quand la petite IA du Mac n'est pas sûre. Chaque changement fait s'annule par son bouton.
// Chargé après ui-v2.js : s'appuie sur api, executerAction, appliquerPlan, outilParole, basculerDictee, resumeProjet…
'use strict';

// ---------- Panneau de droite : réglages du clip ou discussion ----------
(function droiteV2() {
  const insp = $('#insp'), d = document.createElement('div'); d.id = 'droite';
  insp.parentNode.insertBefore(d, insp);
  d.innerHTML = '<div class="dr-onglets" role="tablist"><button role="tab" data-dr="reglages" class="on">Réglages du clip</button><button role="tab" data-dr="chat">Assistant</button></div>';
  d.appendChild(insp);
  const c = document.createElement('section'); c.id = 'chat'; c.hidden = true;
  c.innerHTML = `<div id="chMsgs" aria-live="polite"></div>
    <div class="ch-saisie"><button id="chDictee" class="dictee ib" title="Dicter ta demande au micro (clique pour arrêter)">🎤</button><input id="chTexte" type="text" placeholder="Écris ce que tu veux changer…" aria-label="Écrire à l’assistant"><button id="chEnvoyer" class="pri ib" aria-label="Envoyer">↑</button></div>`;
  d.appendChild(c);
  d.querySelector('.dr-onglets').onclick = e => { const b = e.target.closest('[data-dr]'); if (b) panneauDroite(b.dataset.dr); };
})();
function panneauDroite(p) {
  document.querySelectorAll('#droite [data-dr]').forEach(b => { b.classList.toggle('on', b.dataset.dr === p); b.setAttribute('aria-selected', b.dataset.dr === p); });
  $('#insp').hidden = p === 'chat'; $('#chat').hidden = p !== 'chat';
  if (p === 'chat') { if (!discussion.length) accueilChat(); dessinerChat(); setTimeout(() => $('#chTexte').focus(), 30); }
}

// ---------- Messages ----------
// { qui: 'moi' | 'ia', texte, boutons: [{ nom, faire, pri }] } ; les boutons ne servent qu'une fois (désactivés après le clic)
const discussion = [];
function direIA(texte, boutons = []) { discussion.push({ qui: 'ia', texte, boutons }); dessinerChat(); return discussion[discussion.length - 1]; }
function dessinerChat() {
  const z = $('#chMsgs'); if (!z) return;
  z.innerHTML = discussion.slice(-40).map((m, k) => {
    const i = discussion.length - Math.min(40, discussion.length) + k;
    return `<div class="ch-m ${m.qui}"><div class="ch-bulle">${esc(m.texte)}</div>${(m.boutons || []).length ? `<div class="ch-b">${m.boutons.map((b, j) => `<button class="mini ${b.pri ? 'pri' : ''}" data-chb="${i}:${j}" ${m.fini ? 'disabled' : ''}>${esc(b.nom)}</button>`).join('')}</div>` : ''}</div>`;
  }).join('');
  z.scrollTop = z.scrollHeight;
}
$('#chMsgs').addEventListener('click', async e => {
  const b = e.target.closest('[data-chb]'); if (!b) return;
  const [i, j] = b.dataset.chb.split(':').map(Number), m = discussion[i], bt = m && m.boutons[j]; if (!bt || m.fini) return;
  if (!bt.garder) { m.fini = true; dessinerChat(); }
  try { await bt.faire(); } catch (er) { direIA('Ça n’a pas marché : ' + (er.message || er)); }
});
async function accueilChat() {
  const m = direIA('Bonjour ! Écris ce que tu veux changer, comme à quelqu’un : « coupe les blancs de la prise 2 », « mets le titre en jaune ». Je te dis ce que je vais faire, tu valides, et chaque changement s’annule d’un clic.');
  try {
    const r = await (await api('/api/assistant/suggestions', { method: 'POST', body: JSON.stringify(resumeProjet()) })).json();
    const l = (r.suggestions || []).filter(s => s.action !== 'aucune').slice(0, 3);
    if (l.length) { m.boutons = l.map(s => ({ nom: s.libelle.replace(/ :.*$/, '').replace(/\.$/, ''), faire: () => proposer([{ ...s, libelle: s.libelle.replace(/ :.*$/, '').replace(/\.$/, '') }], '') })); m.texte += ' Pour ce montage, je te suggère :'; dessinerChat(); }
  } catch (e) { /* suggestions facultatives */ }
}

// ---------- Envoi d'une demande ----------
async function envoyerChat(texte) {
  texte = String(texte == null ? $('#chTexte').value : texte).trim(); if (!texte) return;
  $('#chTexte').value = ''; discussion.push({ qui: 'moi', texte }); dessinerChat();
  const attente = direIA('…');
  let r;
  try { r = await (await api('/api/assistant/comprendre', { method: 'POST', body: JSON.stringify({ demande: texte, ia: true, discussion: true, projet: { ...resumeProjet(), normaliser: !!proj.normaliser } }) })).json(); }
  catch (e) { discussion.splice(discussion.indexOf(attente), 1); return direIA('Je n’arrive pas à joindre le moteur de QuentMovie : ' + e.message); }
  discussion.splice(discussion.indexOf(attente), 1);
  if (r.memoire) return direIA('🧠 ' + r.memoire);
  if (r.reponse) return direIA(r.reponse);
  if ((r.actions || []).length) return proposer(r.actions, r.ia ? 'compris par l’IA du Mac' : '');
  const choix = r.choix || [];
  if (choix.length) return direIA('Je ne suis pas sûr de comprendre. Tu veux dire :', [...choix.map(a => ({ nom: a.libelle, faire: () => proposer([a], '') })), { nom: 'Autre chose', faire: () => { direIA('D’accord : dis-le avec d’autres mots, par exemple « ajoute une musique calme » ou « coupe à 10 secondes ».'); $('#chTexte').focus(); } }]);
  direIA('Je n’ai pas compris cette demande. Essaie avec des mots simples : « coupe les blancs », « ajoute une musique calme », « passe en vertical ».');
}
$('#chEnvoyer').onclick = () => envoyerChat();
$('#chTexte').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); envoyerChat(); } e.stopPropagation(); });
$('#chDictee').onclick = e => basculerDictee(e.currentTarget, $('#chTexte'));

// ---------- Proposer, faire, annuler ----------
// ce que l'assistant va faire, avec les boutons ; « Voir d'abord » pour la coupe des blancs (passages en rouge sur la timeline)
function proposer(actions, note) {
  const liste = actions.map(a => a.libelle).join(' · ');
  const boutons = [{ nom: 'Faire', pri: true, faire: () => faire(actions) }];
  if (actions.length === 1 && actions[0].action === 'couper_blancs') boutons.push({ nom: 'Voir d’abord', faire: () => voirCoupe(actions[0]) });
  if (actions.length > 1) boutons.push({ nom: 'Choisir les étapes', faire: () => ouvrirAssistant(actions.map(a => a.libelle).join(', ')) });
  boutons.push({ nom: 'Non merci', faire: () => direIA('D’accord, je ne change rien.') });
  direIA(`${actions.length > 1 ? 'Je vais faire, dans l’ordre : ' : 'Je vais : '}${liste}.${note ? ` (${note})` : ''} Je le fais ?`, boutons);
}
// index du clip visé (« 2 », « dernier », « selection ») ; erreur claire s'il n'existe pas
function indexCible(c) {
  if (!c) return -1;
  const n = proj.clips.length, i = c === 'dernier' ? n - 1 : c === 'selection' ? (proj.clips[sel] ? sel : proj.clips.indexOf(clipCible())) : +c - 1;
  if (!proj.clips[i]) throw new Error(c === 'selection' ? 'Sélectionne d’abord un clip dans la timeline.' : `Il n’y a pas de clip ${c} : le montage en a ${n}.`);
  return i;
}
async function voirCoupe(a) {
  const i = indexCible(a.cible);
  if (i >= 0) { sel = i; selObjs.clear(); }
  await outilParole(i >= 0 ? 'clip' : 'tout', { couper: true, sous: false, apercu: true, style: paroleOpts().style }, null);
  direIA(previsuCoupe ? 'Les passages en rouge sur la timeline seront coupés. Clique sur un passage pour le garder, puis « Couper » dans la barre en haut.' : 'Aucun blanc à couper avec le réglage actuel.');
}
// actions qui visent un clip ou changent la couleur d'un titre : faites ici ; les autres passent par executerAction
const execV20 = executerAction;
executerAction = async function (a) {
  const i = indexCible(a.cible), c = proj.clips[i], p = a.parametre || '';
  if (a.action === 'couleur_titre') return couleurTitre(p, a.couleur);
  if (i < 0) return execV20.apply(this, arguments);
  sel = i; selObjs.clear();
  switch (a.action) {
    case 'couper_blancs': return outilParole('clip', { sous: (c.subs || []).length > 0, couper: true, style: paroleOpts().style });
    case 'sous_titres': return outilParole('clip', { sous: true, couper: false, style: p === 'tiktok' ? 'tiktok' : paroleOpts().style });
    case 'volume': { if (c.hasAudio === false || c.kind === 'image' || c.kind === 'solid') throw new Error(`Le clip ${i + 1} n’a pas de son.`); c.vol = clamp(+p, 0, 200); commit(); tout(); apercu(); return aide(`🔈 Volume du clip ${i + 1} réglé à ${c.vol} %.`); }
    case 'vitesse': { const v = clamp(+p || 1, 0.25, 4); vitesseSelection(v); return aide(`Vitesse ×${String(v).replace('.', ',')} sur le clip ${i + 1}.`); }
    case 'ameliorer': return ameliorerClips([i]);
    case 'detacher': return detacherSon(i);
  }
  return execV20.apply(this, arguments);
};
function couleurTitre(nom, hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) throw new Error(`Je ne connais pas la couleur « ${nom} ».`);
  const cibles = [];
  if (selT >= 0 && proj.textes[selT]) cibles.push(proj.textes[selT].titre);
  else { const c = proj.clips[sel]; if (c && (c.titre || c.text)) cibles.push(c); }
  if (!cibles.length) { (proj.textes || []).forEach(x => cibles.push(x.titre)); proj.clips.forEach(c => { if (c.titre || c.text) cibles.push(c); }); }
  if (!cibles.length) throw new Error('Il n’y a pas encore de titre : demande par exemple « ajoute un titre « Mon voyage » ».');
  cibles.forEach(x => { if (x.titre) x.titre.color = hex; else if (x.text !== undefined && !x.preset) x.textColor = hex; else x.color = hex; });
  commit(); tout(); apercu();
  aide(`🎨 ${cibles.length > 1 ? cibles.length + ' titres passés' : 'Titre passé'} en ${nom}.`);
}
const texteBarre = () => { const d = document.createElement('div'); d.innerHTML = $('#bar').innerHTML; return d.textContent.trim(); };
async function faire(actions) {
  const avant = snap(), bilan = [], attente = direIA('Je m’en occupe…');
  // le bouton « Faire » vaut validation (et « Annuler » défait tout) : pas de panneau « À valider » en plus pour ces demandes
  for (const a of actions.filter(x => !MODALES.includes(x.action))) {
    try { $('#bar').innerHTML = ''; await executerAction(a); bilan.push(texteBarre() || '✔ ' + a.libelle); } catch (e) { bilan.push(`✖ ${e.message || e}`); }
  }
  const modale = actions.find(x => MODALES.includes(x.action)); if (modale) { await executerAction(modale); bilan.push('✔ ' + modale.libelle); }
  discussion.splice(discussion.indexOf(attente), 1);
  const apres = snap();
  if (apres === avant) return direIA(bilan.length ? bilan.join('\n') : 'C’est fait (rien n’a changé dans le montage).');
  direIA(`Fait.\n${bilan.join('\n')}`, [{ nom: 'Annuler', faire: () => annulerDepuis(avant, apres) }]);
}
// revenir à l'état d'avant une demande ; si d'autres changements ont suivi, ils partent aussi (après confirmation)
function annulerDepuis(avant, apres) {
  if (snap() !== apres && !confirm('D’autres changements ont été faits depuis : ils seront annulés aussi. Continuer ?')) { direIA('D’accord, je garde tout.'); return; }
  if (typeof revue !== 'undefined' && revue) fermerRevue();
  proj = reparerProjet(JSON.parse(avant)); proj.clips.forEach(normaliser); $('#format').value = proj.format;
  sel = Math.min(sel, proj.clips.length - 1); selA = selP = selT = -1; selObjs.clear();
  commit(); tout(); apercu(); direIA('C’est annulé : le montage est revenu comme avant.');
}

// ---------- Ouverture : ⌘K, bouton « Demander… », carte de l'accueil ----------
function ouvrirChat(demande) { masquerAccueil(); if (typeof fermerPublierV2 === 'function' && $('#publierV2')) fermerPublierV2(); panneauDroite('chat'); if (demande) envoyerChat(demande); }
$('#bAssistant').onclick = () => ouvrirChat();
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k' && !$('#modal').classList.contains('on')) { e.preventDefault(); e.stopImmediatePropagation(); ouvrirChat(); } }, true);
document.addEventListener('click', e => { const b = e.target.closest('#accueil [data-acc="assistant"]'); if (b) { e.stopImmediatePropagation(); masquerAccueil(); ouvrirChat(); } }, true);
