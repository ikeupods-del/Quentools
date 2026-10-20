// Interface de la voix : doublage (ta voix réplique par réplique), dictionnaire et contrôle de prononciation, voix clonée (essai), contrôle d'une fiche QuentInvest.
// Sortie de index.html pour le garder lisible : script classique chargé avant le script principal ; il utilise ses fonctions (api, $, ouvrir, signal…) à l'exécution.
// ---------- Doublage : ta voix, réplique par réplique ----------
// Chaque réplique est envoyée au moteur (/api/doublage/prise) qui retire le silence du début et de la fin et la range dans
// ~/Movies/QuentMovie/doublages/<nom>/vNN.wav ; ce dossier est celui que la chaîne QuentInvest lit avec --voix-perso.
let dbl = null;
// bruit du clavier : la touche qui lance la prise (enfoncée puis relâchée) et celle qui l'arrête s'entendent dans le micro ;
// le moteur coupe le début jusqu'au relâchement de la touche et la fin à partir de l'appui (paramètres debut et fin de la prise)
const dblMaintenant = () => (performance.now() - dbl.t0) / 1000;
document.addEventListener('keyup', e => { if (dbl && dbl.enreg && dbl.relache == null && (e.key === ' ' || e.key.toLowerCase() === 'r')) dbl.relache = dblMaintenant(); });
const dblNom = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'doublage';
const dblLignes = txt => String(txt || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
// un épisode QuentInvest (scenes[].texte), une liste de textes ou un simple texte : une ligne par réplique, dans l'ordre
function dblLire(txt) {
  try { const j = JSON.parse(txt); if (Array.isArray(j)) return j.map(x => typeof x === 'string' ? x : (x && x.texte) || '').filter(Boolean); if (j && Array.isArray(j.scenes)) return j.scenes.map(x => (x && x.texte) || '').filter(Boolean); } catch (e) { /* texte simple */ }
  return dblLignes(txt);
}
const dblDuree = s => s < 90 ? Math.round(s) + ' s' : Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s';
const dblSec = s => String(s.toFixed(1)).replace('.', ',') + ' s';
// la voix d'une vidéo ou d'un son est écoutée (reconnaissance locale) : une phrase par ligne, avec l'instant où elle est dite
async function dblLireMedia(file, nom) {
  const m = medias.find(x => x.file === file), msg = $('#dbMsg'); if (!m) { msg.innerHTML = '<span class="err">Média introuvable.</span>'; return; }
  const go = $('#dbGo'); go.disabled = true;
  try {
    await assurerEcoute(t => { msg.textContent = t; });
    const r = await ecouterClip({ file: m.file, in: 0, out: m.duration }, t => { msg.textContent = t; });
    const phrases = (r.st.phrase || []).map(x => ({ t: String(x.t || '').trim(), s: +x.s })).filter(x => x.t);
    if (!phrases.length) { msg.innerHTML = '<span class="err">Aucune parole reconnue dans ce média.</span>'; return; }
    $('#dbTexte').value = phrases.map(x => x.t).join('\n'); $('#dbNom').value = dblNom(nom); dbl.debuts = phrases.map(x => x.s);
    msg.textContent = `${phrases.length} phrases lues dans « ${file} ». Relis et corrige le texte si besoin ; ta voix sera posée à l’endroit où elles étaient dites.`;
  } catch (er) { msg.innerHTML = `<span class="err">${esc(er.message)}</span>`; }
  finally { go.disabled = false; }
}
// « fais une vidéo sur le krach de 2008 » → « le krach de 2008 » (même règle que sujetDe de fiche-ia.js, refaite côté serveur)
const sujetDemande = t => String(t || '').replace(/\s+/g, ' ').trim().replace(/^(?:peux-tu |tu peux |pourrais-tu )?(?:(?:me )?(?:fais|fait|faire|crée|créer|cree|prépare|préparer|fabrique|fabriquer|réalise|réaliser)(?:-moi| moi)? |je veux |je voudrais |j['’]aimerais )?(?:une |la |un )?(?:nouvelle )?(?:vidéo|video|épisode|episode)(?: quentinvest| youtube| de pico)? (?:sur|à propos d[eu']|a propos d[eu']|au sujet d[eu']|concernant|qui explique|pour expliquer|expliquant) ?/i, '').replace(/[.!?\s]+$/, '').trim();
// élément de la fenêtre ouverte ; fenêtre fermée pendant un long travail : rien à faire
const siLa = (sel, f) => { const e = $(sel); if (e) f(e); return e; };
// zone du résultat : la sienne si la fenêtre est restée ouverte, sinon celle de la fenêtre rouverte (si elle ne suit pas un autre travail)
const zoneFin = (z, sel) => { const n = $(sel); return z.isConnected || !n || n.querySelector('progress') ? z : n; };
const fiMemo = { script: '', doublage: '', fiche: '', episode: null }; // script ou fiche en cours gardés pendant l'enregistrement du Doublage
// épisode en cours (fiche, répliques, réglages) gardé sur ce Mac jusqu'à la fin de sa fabrication : fenêtre ou QuentMovie fermés,
// « Reprendre » repart de la première réplique manquante, ou relance la fabrication (le travail déjà fait est réutilisé)
const EP_COURS = 'qm:episode-en-cours';
function garderEpisode(e) { fiMemo.episode = e; try { if (e) localStorage.setItem(EP_COURS, JSON.stringify(e)); else localStorage.removeItem(EP_COURS); } catch (er) { /* gardé en mémoire seulement */ } }
try { fiMemo.episode = JSON.parse(localStorage.getItem(EP_COURS) || 'null'); } catch (er) { fiMemo.episode = null; }
// ta vraie voix : les répliques exactes de la vidéo (découpées comme à la fabrication) envoyées au Doublage ; la fiche et les réglages de
// l'épisode sont gardés (`fiMemo.episode`) : dès la dernière réplique enregistrée, la vidéo se fabrique toute seule avec ce doublage
async function doublerRepliques(corps, reglages = {}) {
  const r = await api('/api/pico/repliques', { method: 'POST', body: JSON.stringify(corps) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Texte illisible');
  if (corps.script) fiMemo.script = corps.script; fiMemo.fiche = corps.fiche ? JSON.stringify(corps.fiche, null, 1) : ''; fiMemo.doublage = j.nom;
  garderEpisode({ nom: j.nom, titre: j.titre, fiche: j.fiche || corps.fiche, lignes: j.lignes, n: j.lignes.length, tiktok: reglages.tiktok !== false, sous: !!reglages.sous, illustrer: !!reglages.illustrer, le: Date.now() });
  fermer(); ouvrirDoublage();
  siLa('#dbTexte', e => { e.value = j.lignes.map(x => String(x).replace(/\s+/g, ' ').trim()).join('\n'); }); siLa('#dbNom', e => { e.value = j.nom; });
  siLa('#dbMsg', e => { e.textContent = `${j.lignes.length} répliques de ta vidéo, dans l’ordre. Clique « Commencer l’enregistrement » et lis-les une par une : dès la dernière enregistrée, la vidéo (Pico, animations, écrans) se fabrique toute seule.`; });
}
// reprise de l'épisode en cours : le Doublage s'ouvre avec ses répliques et repart de la première manquante ; tout enregistré → bouton Fabriquer
function reprendreEpisode() {
  const e = fiMemo.episode; if (!e || !Array.isArray(e.lignes)) return;
  fiMemo.doublage = e.nom; fermer(); ouvrirDoublage();
  siLa('#dbTexte', x => { x.value = e.lignes.map(l => String(l).replace(/\s+/g, ' ').trim()).join('\n'); }); siLa('#dbNom', x => { x.value = e.nom; });
  siLa('#dbGo', b => b.click());
}
// carte de la fenêtre Épisode : l'épisode commencé, où il en est, reprendre ou abandonner
async function carteReprise(z) {
  const e = fiMemo.episode; if (!z || !e || !Array.isArray(e.lignes)) return;
  let fait = 0; try { fait = ((await (await api('/api/doublage?nom=' + enc(e.nom))).json()).prises || []).filter(p => p.n < e.n).length; } catch (er) { /* inconnu */ }
  if (!z.isConnected) return;
  z.innerHTML = `<div class="encart" style="margin-bottom:8px"><h4>⏯ Épisode en cours : ${esc(e.titre || e.nom)}</h4><p class="mut" style="margin:0 0 6px">${fait >= e.n ? 'Toutes les répliques sont enregistrées : il reste à fabriquer la vidéo (le travail déjà fait est gardé).' : `${fait} réplique${fait > 1 ? 's' : ''} enregistrée${fait > 1 ? 's' : ''} sur ${e.n}. Tu reprends à la première qui manque, rien n’est à refaire.`}</p>
    <div class="ligne"><button class="pri" id="fiReprendre">⏯ Reprendre</button><button id="fiAbandon">Abandonner cet épisode</button></div></div>`;
  $('#fiReprendre').onclick = reprendreEpisode;
  $('#fiAbandon').onclick = () => { if (!confirm('Abandonner l’épisode « ' + (e.titre || e.nom) + ' » ? Tes enregistrements restent dans le dossier du doublage.')) return; garderEpisode(null); z.innerHTML = ''; };
}
// réglages de la fenêtre Épisode (lus avant qu'elle se ferme pour le Doublage)
const reglagesEpisode = () => ({ tiktok: !!(($('#fiAutoTiktok') || $('#fiTiktok') || {}).checked ?? true), sous: !!($('#fiAutoSous') || {}).checked, illustrer: ((document.querySelector('[name="fiPhotos"]:checked') || {}).value || 'choix') === 'auto' });
// doublage ouvert pour un épisode : le sien seulement (même nom, même nombre de répliques)
const episodeDuDoublage = () => { const e = fiMemo.episode; return e && dbl && e.nom === dbl.nom && e.n === dbl.lignes.length ? e : null; };
// toutes les répliques enregistrées : la vidéo est fabriquée avec ce doublage, sans autre réglage
function dblFabriquer() {
  const e = episodeDuDoublage(); if (!e || dbl.enreg) return;
  clearTimeout(dbl.minuteur); fiMemo.script = ''; // l'épisode reste gardé jusqu'à la fin de la fabrication (« Reprendre » si elle est arrêtée)
  ouvrir(`<h2>🎬 ${esc(e.titre || 'Ton épisode')}</h2><p class="mut">Fabriqué avec ta voix : Pico, animations, écrans, miniatures et texte de publication. Compte environ 15 à 20 minutes ; tu peux continuer à monter pendant ce temps. Rien n’est publié.</p>
    <div id="fiFabRes" class="mut" style="margin-top:6px"></div><div class="ligne" style="margin-top:10px"><span class="sp"></span><button id="fiFabriquer" hidden></button><button id="fiFermer">Fermer</button></div>`, 'xl');
  $('#fiFermer').onclick = fermer;
  fabriquerPico(JSON.stringify(e.fiche), { voix: 'doublage:' + e.nom, sansTiktok: !e.tiktok, sousTitres: e.sous, illustrer: e.illustrer });
}
// Contrôle d'une fiche d'épisode QuentInvest : colle ou charge le fichier .json, le rapport dit ce qu'il faut corriger avant la fabrication
function ouvrirFiche() {
  if (dbl) dblFin();
  ouvrir(`<h2>🎬 Épisode QuentInvest</h2>
    <div id="fiReprise"></div>
    <div class="encart" id="fiAuto" style="margin-bottom:8px">
      <h4 class="fiEtape"><span>1</span> Le texte</h4>
      <div class="ligne fiModes" role="radiogroup" aria-label="Façon de faire">${[['seul', '🤖 QuentMovie l’écrit', 'Tu donnes le sujet, QuentMovie écrit le texte d’après Wikipédia, le contrôle et fabrique la vidéo.'], ['relire', '👀 Écrit, puis je relis', 'Le texte est écrit d’après Wikipédia, tu le relis et le corriges avant la fabrication.'], ['script', '✍️ J’écris mon texte', 'Tu écris le texte toi-même : idéal pour un sujet d’actualité, que Wikipédia ne connaît pas encore.']].map(([id, nom, aide]) => `<label class="fiMode" title="${aide}"><input type="radio" name="fiMode" value="${id}" ${id === 'seul' ? 'checked' : ''}> ${nom}</label>`).join('')}</div>
      <p class="mut" id="fiModeAide" style="margin:6px 0"></p>
      <div id="fiZoneSujet" class="ligne"><input id="fiSujet" placeholder="Le sujet, par exemple : le krach de 2008" style="flex:1"></div>
      <div id="fiZoneScript" hidden><p class="mut" style="margin:0 0 6px">Un titre (# Titre), l’accroche, des paragraphes (une ligne courte = un titre de partie, des lignes « - » = une liste), puis « En une phrase : … ». QuentMovie le découpe en répliques et choisit les écrans (chiffres, définitions, listes) sans rien ajouter.</p>
        <textarea id="fiScript" rows="6" style="width:100%" placeholder="# Pourquoi les prix montent ?&#10;&#10;Ton panier coûtait 50 € il y a cinq ans…"></textarea></div>
      <div id="fiZoneVoix">
        <h4 class="fiEtape"><span>2</span> La voix</h4>
        <select id="fiAutoVoix" style="width:100%"><option value="moi">🎙 Ma vraie voix (je lis les répliques)</option></select><div id="fiAutoVoixInfo" class="mut" style="margin-top:4px"></div>
        <h4 class="fiEtape"><span>3</span> Les photos</h4>
        <div class="ligne fiModes" role="radiogroup" aria-label="Photos d’illustration">${[['choix', '👆 Je choisis', 'QuentMovie cherche des photos libres de droits pour chaque écran et te les propose ; seules celles que tu valides sont intégrées.'], ['auto', '🤖 Automatiques', 'QuentMovie pose seul la photo la plus pertinente sur chaque écran de texte.'], ['aucune', '🚫 Sans photo', 'Écrans sur fond uni.']].map(([id, nom, aide]) => `<label class="fiMode" title="${aide}"><input type="radio" name="fiPhotos" value="${id}" ${id === 'choix' ? 'checked' : ''}> ${nom}</label>`).join('')}</div>
        <details style="margin-top:6px"><summary class="mut">Plus d’options</summary><div class="ligne" style="margin-top:4px;flex-wrap:wrap"><label><input type="checkbox" id="fiAutoTiktok" checked> Version TikTok aussi</label><label title="Le texte dit, incrusté en bas de la vidéo. Inutile la plupart du temps : l’écran explique déjà."><input type="checkbox" id="fiAutoSous"> Sous-titres incrustés</label></div></details>
      </div>
      <div class="ligne" style="margin-top:10px"><span class="sp"></span><button id="fiDoubler" hidden title="Ouvre le Doublage avec exactement les répliques de la vidéo, dans l’ordre">🎙 Enregistrer ces répliques</button><button id="fiDepuisScript" hidden>📄 Voir la fiche d’abord</button><button id="fiBrouillon" hidden>✍️ Écrire le texte</button><button class="pri" id="fiLancer">🎬 Faire la vidéo</button></div>
      <div id="fiProg" class="mut" style="margin-top:6px"></div><div id="fiAutoRes" style="margin-top:6px"></div></div>
    <div id="fiDeja"></div>
    <details id="fiAvance"><summary>Fiche détaillée (texte de l’épisode, contrôle)</summary><p class="mut">Le texte complet de l’épisode : QuentMovie vérifie qu’il est complet, qu’il dépasse 5 minutes, que les phrases restent courtes, que les chiffres ont une source, qu’aucun conseil d’investissement ne s’est glissé dedans, et liste les mots à ajouter au dictionnaire de prononciation.</p>
    <textarea id="fiTexte" rows="9" style="width:100%;font-family:monospace;font-size:12px" placeholder='{ "numero": 12, "slug": "…", … }'></textarea>
    <div class="ligne"><label class="bouton" style="cursor:pointer">📂 Charger un fichier<input type="file" id="fiF" accept=".json,application/json" hidden></label><button class="pri" id="fiGo">Contrôler</button><button id="fiFermer">Fermer</button></div>
    <div id="fiRes" style="margin-top:8px"></div></details>`, 'xl');
  $('#fiFermer').onclick = fermer;
  carteReprise($('#fiReprise'));
  api('/api/pico/episodes').then(r => r.json()).then(r => { const l = (r.episodes || []).slice(0, 6), z = $('#fiDeja'); if (!z || !l.length) return;
    z.innerHTML = `<div class="encart" style="margin-bottom:8px"><h4>Épisodes déjà fabriqués</h4><div class="ligne" style="flex-wrap:wrap">${l.map(e => `<button class="mini" data-relire="${esc(e.base)}">🔍 ${esc(e.titre || e.base)}</button>`).join('')}</div></div>`;
    z.onclick = ev => { const b = ev.target.closest('[data-relire]'); if (b) ouvrirRelecturePico(b.dataset.relire); }; }).catch(() => {});
  const AIDES = { seul: 'Tu donnes le sujet : QuentMovie lit l’article Wikipédia, l’IA locale écrit le texte de Pico sans rien inventer, le contrôle, puis fabrique la vidéo (YouTube, TikTok, miniatures, texte de publication). Rien n’est publié : tu regardes avant.', relire: 'Le texte est écrit d’après Wikipédia et s’affiche dans la fiche : tu corriges ce que tu veux, puis tu lances la fabrication.', script: 'Tu écris le texte toi-même : idéal pour un sujet d’actualité, que Wikipédia ne connaît pas encore. QuentMovie le découpe en répliques et fabrique la vidéo, sans rien ajouter.' };
  const mode = () => (document.querySelector('[name="fiMode"]:checked') || {}).value || 'seul';
  const majMode = () => { const m = mode(); $('#fiModeAide').textContent = AIDES[m]; $('#fiZoneSujet').hidden = m === 'script'; $('#fiZoneScript').hidden = m !== 'script'; $('#fiDepuisScript').hidden = m !== 'script'; $('#fiDoubler').hidden = m !== 'script'; $('#fiZoneVoix').hidden = m === 'relire'; $('#fiAutoVoixInfo').hidden = m === 'relire'; $('#fiLancer').textContent = m === 'relire' ? '✍️ Écrire le texte' : '🎬 Faire la vidéo'; };
  document.querySelectorAll('[name="fiMode"]').forEach(x => { x.onchange = majMode; });
  if (fiMemo.script && !fiMemo.fiche) { $('#fiScript').value = fiMemo.script; const r = document.querySelector('[name="fiMode"][value="script"]'); if (r) r.checked = true; } // retour du Doublage : ton script est gardé
  majMode();
  $('#fiScript').oninput = () => { fiMemo.script = $('#fiScript').value; };
  // ton script lu avec ta voix : le Doublage reçoit les répliques telles que la fabrication les découpe (accroche, salut, blocs, fin)
  $('#fiDoubler').onclick = async () => {
    const script = $('#fiScript').value; if (script.trim().length < 80) return signal('Écris d’abord ton script : une accroche, quelques paragraphes et une conclusion.');
    try { await doublerRepliques({ script }, reglagesEpisode()); } catch (er) { signal(er.message); }
  };
  choixVoixPico('#fiAutoVoix', '#fiAutoVoixInfo');
  $('#fiSujet').onkeydown = e => { if (e.key === 'Enter') $('#fiLancer').click(); };
  const photosMode = () => (document.querySelector('[name="fiPhotos"]:checked') || {}).value || 'choix';
  // texte de la vidéo prêt à relire ou à illustrer : écrit d'après Wikipédia (même texte que « Tout seul ») ou découpé depuis ton script
  const ficheDuTexte = async (m, corps) => {
    if (m === 'script') { const r = await api('/api/quentinvest/script', { method: 'POST', body: JSON.stringify({ texte: corps.script }) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Script illisible'); return j.fiche; }
    const { id } = await (await api('/api/quentinvest/brouillon', { method: 'POST', body: JSON.stringify({ sujet: sujetDemande(corps.demande), auto: true }) })).json();
    return (await suivreTravail(id, j => { siLa('#fiProg', e => { e.textContent = Math.round((j.progress || 0) * 100) + ' % · ' + (j.step || ''); }); })).fiche;
  };
  $('#fiLancer').onclick = async () => {
    const m = mode(); if (m === 'relire') return $('#fiBrouillon').click();
    const corps = m === 'script' ? { script: $('#fiScript').value } : { demande: $('#fiSujet').value };
    if (m === 'seul' && sujetDemande(corps.demande).length < 3) return signal('Écris le sujet de la vidéo, par exemple « le krach de 2008 ».');
    if (m === 'script' && corps.script.trim().length < 80) return signal('Écris ton script : une accroche, quelques paragraphes et une conclusion.');
    const voix = $('#fiAutoVoix').value, ph = photosMode();
    // ta vraie voix : le texte est écrit (ou découpé), les photos choisies, puis le Doublage s'ouvre avec les répliques à lire ;
    // la fabrication part toute seule après la dernière réplique
    const z = $('#fiAutoRes'), b = $('#fiLancer'); b.disabled = true; $('#fiProg').textContent = '';
    try {
      let fiche = null;
      if (voix === 'moi' || ph === 'choix') {
        $('#fiProg').textContent = m === 'script' ? 'Découpage de ton texte…' : 'Écriture du texte…';
        fiche = await ficheDuTexte(m, corps); siLa('#fiProg', e => { e.textContent = ''; });
        if (voix === 'moi') { const rg = reglagesEpisode(); if (ph === 'choix') { fiche = await choisirPhotos(fiche, zoneFin(z, '#fiAutoRes')); if (!fiche) return; } return await doublerRepliques({ fiche }, rg); }
        fiche = await choisirPhotos(fiche, zoneFin(z, '#fiAutoRes')); if (!fiche) return;
      }
      const options = { voix, sansTiktok: !$('#fiAutoTiktok').checked, illustrer: !fiche && ph === 'auto', sousTitres: $('#fiAutoSous').checked, court: m === 'script' };
      const r = await api('/api/quentinvest/auto', { method: 'POST', body: JSON.stringify(fiche ? { fiche, options } : { ...corps, options }) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Impossible de lancer la vidéo');
      const zz = zoneFin(z, '#fiAutoRes');
      zz.innerHTML = '<progress max="100" value="0" style="width:100%"></progress><div id="fiAutoEtape"></div><button class="mini" id="fiAutoStop" style="margin-top:6px">Arrêter</button>';
      $('#fiAutoStop').onclick = () => { $('#fiAutoStop').disabled = true; annulerJob(j.id); };
      const t0 = Date.now(), x = await suivreTravail(j.id, k => { const p = $('#fiAutoRes progress'), e = $('#fiAutoEtape'); if (p) p.value = Math.round((k.progress || 0) * 100); if (e) e.textContent = `${k.step || ''}${k.progress > 0.08 ? ` · environ ${Math.max(1, Math.round((Date.now() - t0) / 60000 * (1 - k.progress) / k.progress))} min restantes` : ''}`; });
      if (x.fiche) siLa('#fiTexte', e => { e.value = JSON.stringify(x.fiche, null, 1); });
      finPico(zoneFin(z, '#fiAutoRes'), x, x.article ? `Texte écrit d’après l’article Wikipédia « ${x.article} » : vérifie les faits en regardant la vidéo.` : '');
    } catch (er) { zoneFin(z, '#fiAutoRes').innerHTML = `<span style="color:#f87171">${esc(er.message)}</span>`; signal('Épisode QuentInvest : ' + er.message); }
    finally { siLa('#fiLancer', e => { e.disabled = false; }); }
  };
  // retour du Doublage avec le texte écrit d'après Wikipédia : la fiche est reprise, prête à fabriquer avec ton doublage
  if (fiMemo.fiche) { $('#fiTexte').value = fiMemo.fiche; $('#fiAvance').open = true; $('#fiProg').textContent = `Ton texte est repris ci-dessous. Tes répliques enregistrées dans « ${fiMemo.doublage} » : choisis « Mon doublage « ${fiMemo.doublage} » » puis « 🎬 Fabriquer » (ou retourne au Doublage : la vidéo part toute seule après la dernière réplique).`; setTimeout(() => siLa('#fiGo', e => e.click()), 0); }
  $('#fiF').onchange = async e => { const f = e.target.files[0]; if (f) $('#fiTexte').value = await f.text(); };
  $('#fiDepuisScript').onclick = async () => {
    const t = $('#fiScript').value, prog = $('#fiProg');
    try { const r = await api('/api/quentinvest/script', { method: 'POST', body: JSON.stringify({ texte: t }) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Script illisible');
      if (!siLa('#fiTexte', e => { e.value = JSON.stringify(j.fiche, null, 1); })) return; $('#fiAvance').open = true; $('#fiGo').click(); $('#fiTexte').scrollIntoView({ block: 'center' }); }
    catch (er) { signal(er.message); }
  };
  $('#fiBrouillon').onclick = async () => {
    const sujet = sujetDemande($('#fiSujet').value), prog = $('#fiProg'); if (sujet.length < 3) return signal('Écris le sujet de l’épisode.');
    $('#fiBrouillon').disabled = true; prog.textContent = 'Préparation…';
    try {
      const { id } = await (await api('/api/quentinvest/brouillon', { method: 'POST', body: JSON.stringify({ sujet }) })).json();
      const r = await suivreTravail(id, j => { prog.textContent = Math.round((j.progress || 0) * 100) + ' % · ' + (j.step || ''); });
      signal('Texte de l’épisode écrit : ' + r.fichier);
      if (!siLa('#fiTexte', e => { e.value = JSON.stringify(r.fiche, null, 1); })) return; // fenêtre fermée : le texte reste dans son fichier
      $('#fiAvance').open = true; siLa('#fiProg', e => { e.innerHTML = `Texte écrit d’après l’article Wikipédia « ${esc(r.article)} » et gardé dans <b>${esc(r.fichier)}</b>. Relis-le et réécris ce qui est à compléter (titre, accroche, piège, question, suite) dans la fiche ci-dessous, puis « Contrôler » et « Fabriquer ».`; });
      $('#fiGo').click();
    } catch (er) { siLa('#fiProg', e => { e.innerHTML = '<span style="color:#f87171">' + esc(er.message) + '</span>'; }); signal('Texte de l’épisode : ' + er.message); }
    finally { siLa('#fiBrouillon', e => { e.disabled = false; }); }
  };
  $('#fiGo').onclick = async () => {
    const res = $('#fiRes'); res.textContent = 'Contrôle…';
    try {
      const r = await (await api('/api/quentinvest/controle', { method: 'POST', body: JSON.stringify({ fiche: $('#fiTexte').value }) })).json();
      const li = (c, t) => t.map(x => `<div style="margin:3px 0">${c} ${esc(x)}</div>`).join('');
      res.innerHTML = li('ℹ️', r.infos) + li('❌', r.erreurs) + li('⚠️', r.avertissements) + `<p><b>${r.ok ? '✅ Fiche fabricable.' : '❌ À corriger avant la fabrication.'}</b></p>`
        + (r.ok ? `<div class="encart" id="fiFab"><h4>🎬 Fabriquer l’épisode</h4><p class="mut" style="margin:0 0 6px">Vidéo YouTube, version TikTok, miniatures et texte de publication. Compte environ 15 à 20 minutes ; tu peux continuer à monter pendant ce temps. Rien n’est publié.</p>
          <div class="ligne"><label>Voix <select id="fiVoix"><option value="ma-voix">Ma voix clonée</option></select></label><label><input type="checkbox" id="fiTiktok" checked> Version TikTok aussi</label><span class="sp"></span><button class="pri" id="fiFabriquer">🎬 Fabriquer</button></div><div id="fiVoixInfo" class="mut"></div><div id="fiFabRes" class="mut" style="margin-top:6px"></div></div>` : '');
      const fb = $('#fiFabriquer'); if (fb) { fb.onclick = () => $('#fiVoix').value === 'moi' ? (() => { let f; try { f = JSON.parse($('#fiTexte').value); } catch (er) { return signal('La fiche n’est pas un texte JSON valide.'); } doublerRepliques({ fiche: f }, reglagesEpisode()).catch(er => signal(er.message)); })() : (async () => { // photos au choix : proposées et validées avant la fabrication
          const ph = (document.querySelector('[name="fiPhotos"]:checked') || {}).value || 'choix', o = { sansTiktok: !$('#fiTiktok').checked, voix: $('#fiVoix').value, sousTitres: !!($('#fiAutoSous') || {}).checked, illustrer: ph === 'auto' };
          let texte = $('#fiTexte').value;
          if (ph === 'choix') { let f; try { f = JSON.parse(texte); } catch (er) { return signal('La fiche n’est pas un texte JSON valide.'); } f = await choisirPhotos(f, $('#fiFabRes')); if (!f) return; texte = JSON.stringify(f, null, 1); siLa('#fiTexte', e => { e.value = texte; }); }
          fabriquerPico(texte, o); })(); choixVoixPico(); }
    } catch (er) { res.innerHTML = '<span style="color:#f87171">' + esc(er.message) + '</span>'; }
  };
}
// voix proposées : ta vraie voix (par défaut : tu lis les répliques dans le Doublage), tes doublages enregistrés, puis ta voix clonée
// (essai : son rendu ne valait pas ta vraie voix) ; jamais de voix de synthèse pour la chaîne
async function choixVoixPico(selId = '#fiVoix', infoId = '#fiVoixInfo') {
  const sel = $(selId), info = $(infoId); if (!sel) return;
  let e; try { e = await (await api('/api/pico')).json(); } catch (er) { return; }
  // jamais de voix de synthèse sur la chaîne : ta voix clonée ou un de tes doublages
  const mv = e.maVoix || {}, sansVoix = mv.assez === false;
  sel.innerHTML = `<option value="moi">🎙 Ma vraie voix (je lis les répliques)</option>${(e.doublages || []).map(n => `<option value="doublage:${esc(n)}">Mon doublage « ${esc(n)} »</option>`).join('')}<option value="ma-voix">Ma voix clonée (essai)${sansVoix ? ' (enregistre d’abord ta voix)' : mv.installee ? '' : ' (à installer, plusieurs Go)'}</option>`;
  sel.value = fiMemo.doublage && (e.doublages || []).includes(fiMemo.doublage) ? 'doublage:' + fiMemo.doublage : 'moi';
  // la voix clonée imite ta voix à partir de tes enregistrements du Doublage : sans eux, rien à imiter
  const dire = () => {
    if (sel.value === 'moi') { info.textContent = 'Le meilleur rendu : tu lis toi-même chaque réplique. QuentMovie prépare le texte et les photos, puis ouvre le Doublage avec les répliques dans l’ordre. Dès la dernière enregistrée, la vidéo se fabrique toute seule.'; return; }
    if (sel.value !== 'ma-voix') { info.textContent = 'Tes enregistrements du Doublage, réplique par réplique. Il faut une prise pour chaque réplique : s’il en manque, la fabrication s’arrête et liste celles à enregistrer.'; return; }
    if (sansVoix) { info.innerHTML = `<b style="color:#fbbf24">Pas encore assez de ta voix enregistrée</b> (${mv.secondes || 0} s sur ${mv.min || 8} s). La voix clonée imite ta voix à partir de tes enregistrements : ouvre le Doublage, lis 3 ou 4 phrases à voix haute (3 à 10 secondes chacune), une seule fois. Ensuite, toutes tes vidéos peuvent être dites par ta voix clonée. <button class="mini" type="button" data-ouvre-doublage>🎙 Enregistrer ma voix</button>`;
      const b = info.querySelector('[data-ouvre-doublage]'); if (b) b.onclick = () => ouvrirDoublage(); return; }
    info.textContent = `Chaque réplique est dite par ta voix clonée, imitée à partir de ${mv.secondes} s de tes enregistrements du Doublage. Compte plusieurs minutes de plus que le montage seul.`;
  };
  sel.onchange = dire; dire();
}
// Photos d'illustration au choix : QuentMovie cherche quelques photos libres de droits pour chaque écran de texte, tu cliques celles qui te
// conviennent (« Aucune » garde l'écran uni) ; seules les photos validées sont téléchargées et posées en fond (`fond` du bloc). → fiche, ou null si abandon
async function choisirPhotos(fiche, z) {
  if (!z) return null;
  z.innerHTML = '<progress style="width:100%"></progress><div class="mut">Recherche de photos libres de droits pour chaque écran…</div>';
  let r;
  try { const { id, error } = await (await api('/api/pico/photos', { method: 'POST', body: JSON.stringify({ fiche }) })).json(); if (error) throw new Error(error);
    r = await suivreTravail(id, k => { const e = z.querySelector('.mut'); if (e && k.step) e.textContent = k.step; }); }
  catch (er) { r = { ecrans: [], erreur: er.message }; }
  const l = (r.ecrans || []).filter(e => e.propositions.length);
  if (!l.length) { signal(r.erreur ? 'Photos : ' + r.erreur + ' — vidéo faite sans photo.' : 'Aucune photo assez pertinente trouvée : vidéo faite sans photo.'); z.innerHTML = ''; return fiche; }
  const choix = {}; l.forEach(e => { choix[e.i] = e.actuelle ? -2 : 0; }); // première proposition cochée ; photo déjà posée gardée
  return new Promise(ok => {
    const dessiner = () => {
      z.innerHTML = `<div class="encart"><h4>🖼 Photos proposées (${l.length} écran${l.length > 1 ? 's' : ''})</h4><p class="mut" style="margin:0">Clique la photo qui illustre le mieux chaque écran, ou « Aucune ». Seules les photos validées sont intégrées (libres de droits, crédit affiché).</p>
        ${l.map(e => `<div class="phEcran"><b>${esc(e.section ? e.section + ' · ' : '')}${esc(e.ecran || '')}</b><div class="mut" style="font-size:12px">« ${esc(e.texte)} »</div><div class="phGrille">
          ${e.actuelle ? `<div class="phChoix ${choix[e.i] === -2 ? 'on' : ''}" data-ph="${e.i}:-2">Photo actuelle</div>` : ''}
          ${e.propositions.map((p, k) => `<div class="phChoix ${choix[e.i] === k ? 'on' : ''}" data-ph="${e.i}:${k}" title="${esc(p.credit)}"><img loading="lazy" alt="" src="${petiteImage(p.apercu || p.url)}"></div>`).join('')}
          <div class="phChoix ${choix[e.i] === -1 ? 'on' : ''}" data-ph="${e.i}:-1">Aucune</div></div></div>`).join('')}
        <div class="ligne" style="margin-top:8px"><button id="phAucune">Continuer sans photo</button><span class="sp"></span><button class="pri" id="phValider">✅ Valider ces photos et fabriquer</button></div></div>`;
      z.querySelectorAll('[data-ph]').forEach(d => { d.onclick = () => { const [i, k] = d.dataset.ph.split(':').map(Number); choix[i] = k; dessiner(); }; });
      z.querySelector('#phAucune').onclick = () => { l.forEach(e => { if (!e.actuelle) choix[e.i] = -1; }); valider(); };
      z.querySelector('#phValider').onclick = valider;
    };
    const valider = async () => {
      const pris = l.filter(e => choix[e.i] >= 0).map(e => ({ i: e.i, ...e.propositions[choix[e.i]] }));
      l.filter(e => choix[e.i] === -1).forEach(e => { delete fiche.blocs[e.i].fond; });
      if (!pris.length) { z.innerHTML = ''; return ok(fiche); }
      z.innerHTML = `<progress style="width:100%"></progress><div class="mut">Intégration de ${pris.length} photo${pris.length > 1 ? 's' : ''}…</div>`;
      try {
        const j = await (await api('/api/pico/photos/garder', { method: 'POST', body: JSON.stringify({ slug: fiche.slug || 'episode', choix: pris }) })).json();
        const rates = (j.fonds || []).filter(f => !f.fichier).length;
        (j.fonds || []).forEach(f => { if (f.fichier && fiche.blocs[f.i]) fiche.blocs[f.i].fond = { fichier: f.fichier, credit: f.credit }; });
        if (rates) signal(`${rates} photo${rates > 1 ? 's' : ''} injoignable${rates > 1 ? 's' : ''} : écran${rates > 1 ? 's' : ''} laissé${rates > 1 ? 's' : ''} sans photo.`);
      } catch (er) { signal('Photos : ' + er.message); }
      z.innerHTML = ''; ok(fiche);
    };
    dessiner();
  });
}
// Épisode Pico fabriqué dans QuentMovie (routes-pico.js) : avancement, arrêt possible, puis dossier, publication et avertissements du rythme
async function fabriquerPico(texte, options) {
  const z = $('#fiFabRes'), b = $('#fiFabriquer'); if (!z) return;
  let fiche; try { fiche = JSON.parse(texte); } catch (e) { z.innerHTML = '<span style="color:#f87171">La fiche n’est pas un texte JSON valide.</span>'; return; }
  b.disabled = true; z.innerHTML = 'Démarrage…'; fiMemo.fiche = ''; // fiche fabriquée : la prochaine fenêtre repart de zéro
  let id;
  try {
    const r = await api('/api/pico/fabriquer', { method: 'POST', body: JSON.stringify({ fiche, options }) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Fabrication impossible'); id = j.id;
    z.innerHTML = '<progress max="100" value="0" style="width:100%"></progress><div id="fiFabEtape"></div><button class="mini" id="fiFabStop" style="margin-top:6px">Arrêter</button>';
    $('#fiFabStop').onclick = () => { $('#fiFabStop').disabled = true; annulerJob(id); };
    const t0 = Date.now(), x = await suivreTravail(id, k => { const p = $('#fiFabRes progress'), e = $('#fiFabEtape'); if (p) p.value = Math.round((k.progress || 0) * 100); if (e) e.textContent = `${k.step || ''}${k.progress > 0.05 ? ` · environ ${Math.max(1, Math.round((Date.now() - t0) / 60000 * (1 - k.progress) / k.progress))} min restantes` : ''}`; });
    finPico(zoneFin(z, '#fiFabRes'), x);
    if (fiMemo.episode && options.voix === 'doublage:' + fiMemo.episode.nom) garderEpisode(null); // vidéo faite : plus rien à reprendre
  } catch (er) { zoneFin(z, '#fiFabRes').innerHTML = `<span style="color:#f87171">${esc(er.message)}</span>`; signal('Fabrication de l’épisode : ' + er.message); }
  b.disabled = false;
}
// fin d'une fabrication : dossier, relecture, publication et remarques sur la fiche
function finPico(z, x, note = '') {
  z.innerHTML = `<p>✅ <b>${esc(x.titre)}</b> est prêt à relire${note ? ' · ' + esc(note) : ''} : ${x.fichiers.filter(n => /\.(mp4|png)$/.test(n)).length} fichiers (vidéos et miniatures) dans <b>${esc(x.dossier)}</b>.${(x.relecture || []).length ? ` 🔎 Relecture automatique des écrans : ${esc(x.relecture.join(' ; '))}.` : ''}${x.illustrations ? ` 🖼 ${x.illustrations} photo${x.illustrations > 1 ? 's' : ''} libre${x.illustrations > 1 ? 's' : ''} de droits ajoutée${x.illustrations > 1 ? 's' : ''} en fond (crédit à l’écran).` : ''}</p>
    ${(x.avertissements || []).length ? `<details><summary>${x.avertissements.length} remarque${x.avertissements.length > 1 ? 's' : ''} sur la fiche</summary>${x.avertissements.map(a => `<div style="margin:3px 0">⚠️ ${esc(a)}</div>`).join('')}</details>` : ''}
    <div class="ligne" style="margin-top:6px;flex-wrap:wrap"><button data-fin="dossier">📂 Ouvrir le dossier</button><button data-fin="relire">🔍 Relire et corriger</button>${boutonsMontage(x.fichiers.some(n => /-youtube\.mp4$/.test(n)), x.fichiers.some(n => /-tiktok\.mp4$/.test(n)))}<button class="pri" data-fin="publier">📤 Publier…</button></div>
    <p class="mut" style="margin:6px 0 0">Regarde les vidéos avant de publier. « Relire et corriger » change l’expression de Pico, une phrase ou la prononciation d’un mot, et ne refait que ces répliques. « Monter dans la timeline » pose la vidéo réplique par réplique sur ta timeline : coupe, remplace un plan, ajoute un titre ou une image par-dessus, puis exporte.</p>`;
  z.onclick = ev => { const b = ev.target.closest('[data-monter]'); if (b) monterPico(x.base, b.dataset.monter); };
  z.querySelector('[data-fin=relire]').onclick = () => ouvrirRelecturePico(x.base);
  z.querySelector('[data-fin=dossier]').onclick = () => api('/api/publier/ouvrir', { method: 'POST', body: JSON.stringify({ cible: 'dossier', episode: x.base }) });
  z.querySelector('[data-fin=publier]').onclick = () => ouvrirPublier();
  signal('Épisode prêt à relire : ' + x.titre);
  if (!proj.clips.length && x.fichiers.some(n => /-youtube\.mp4$/.test(n))) monterPico(x.base, 'youtube'); // timeline vide : la vidéo y est posée tout de suite
}
// Épisode fabriqué posé sur la timeline (routes-pico.js, /api/pico/montage) : une réplique = un clip, avec ses sous-titres et la musique
const boutonsMontage = (youtube, tiktok) => (youtube ? '<button data-monter="youtube" title="Chaque réplique devient un clip de ta timeline">🎞 Monter dans la timeline</button>' : '') + (tiktok ? `<button data-monter="tiktok" title="La version verticale, réplique par réplique">🎞 ${youtube ? 'TikTok' : 'Monter la version TikTok'}</button>` : '');
async function monterPico(base, version = 'youtube') {
  try {
    const r = await api('/api/pico/montage', { method: 'POST', body: JSON.stringify({ base, version }) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Montage impossible');
    let items = []; try { items = (await (await api('/api/projets')).json()).items || []; } catch (e) { /* liste indisponible */ }
    if (items.includes(j.nom) && confirm(`Tu as déjà commencé le montage « ${j.nom} ». Le rouvrir tel que tu l’as laissé ?\n\n(Annuler : repartir de la vidéo fabriquée, ton montage actuel reste enregistré.)`)) return ouvrirProjetNomme(j.nom);
    if (proj.clips.length && projetCourant !== j.nom && !confirm('Remplacer le montage affiché par cet épisode ? Pense à enregistrer ton projet actuel s’il n’est pas enregistré.')) return;
    let nom = j.nom; for (let k = 2; items.includes(nom); k++) nom = `${j.nom} (${k})`;
    stopLecture(); await chargerMedias(); const manque = poserProjet(j.projet);
    sel = proj.clips.length ? 0 : -1; selA = selCut = selP = selT = -1; selObjs.clear(); gt = 0; rendu = null; $('#boite').onclick = null; fermer(); commit(); tout(); fitZoom(); placerTete(0); apercu();
    try { await api('/api/projets/' + enc(nom), { method: 'PUT', body: snap() }); choisirProjetCourant(nom); } catch (e) { /* enregistrement automatique quand même */ }
    signal(`Épisode posé sur la timeline : ${proj.clips.length} répliques.`);
    aide(`🎞 « ${esc(nom)} » est sur ta timeline : <b>un clip par réplique</b> (écran, Pico et ta voix), les sous-titres et la musique. Coupe ou supprime un plan, mets une photo, une vidéo ou un titre par-dessus sur la piste vidéo 2, puis exporte avec ${MAC ? '⌘E' : 'Ctrl+E'}.${manque ? ` ${manque} élément(s) introuvable(s) retiré(s).` : ''}`);
  } catch (er) { alert(er.message); }
}
// Relecture d'un épisode Pico fabriqué : expression de chaque réplique, phrase, prononciation d'un mot (dictionnaire) ; seules les répliques changées sont refaites
const NOMS_CHAMP = { titre: 'Titre', sous: 'Sous-titre', legende: 'Légende', texte: 'Texte', mot: 'Mot', intro: 'Introduction', avant: 'Avant', apres: 'Après', suffixe: 'Unité', source: 'Source', label: 'Étiquette', numero: 'Numéro', resultat: 'Résultat', points: 'Points (un par ligne)' };
const NOMS_EXPR = { neutre: 'neutre', content: 'content', inquiet: 'inquiet', surpris: 'surpris', curieux: 'curieux', reflechi: 'réfléchi' };
async function ouvrirRelecturePico(base) {
  let E; try { const r = await api('/api/pico/episode?base=' + encodeURIComponent(base)), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Épisode introuvable'); E = j; } catch (er) { return alert(er.message); }
  const ch = new Map(), aRefaire = new Set(); let dico = false;
  const difficiles = new Set(E.difficiles.map(m => m.toLowerCase()));
  const motsDe = t => String(t).split(/(\s+)/).map(m => { const nu = m.replace(/^[«(“"']+|[»)”"'.,;:!?…]+$/g, ''); return /\S/.test(m) && nu ? `<span class="rlMot${difficiles.has(nu.toLowerCase()) ? ' dur' : ''}" data-mot="${esc(nu)}" tabindex="0" role="button">${esc(m)}</span>` : esc(m); }).join('');
  const texteDe = s => (ch.get(s.i) || {}).texte ?? s.texte, exprDe = s => (ch.get(s.i) || {}).expr || s.expr;
  // écran de la réplique : ses textes (titre, sous-titre, légende, points…), corrigés à la main avant « Refaire »
  const ecranDe = s => { const e = s.ecran, c = (ch.get(s.i) || {}).ecran || {}; return { champs: { ...e.champs, ...Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'points')) }, points: c.points || e.points }; };
  const apercuEcran = s => { const e = ecranDe(s); return [...Object.entries(e.champs).filter(([k]) => k !== 'source').map(([, v]) => v), ...(e.points || [])].filter(Boolean).join(' · '); };
  ouvrir(`<h2>🔍 Relire « ${esc(E.titre)} »</h2>
    <p class="mut">Pour chaque réplique : l’expression de Pico, la phrase (✏ pour la modifier), le texte écrit sur l’écran (🖼 ; 💬 pour dire à l’IA ce qui ne va pas, elle corrige l’écran et le refait aussitôt) et la prononciation (clic sur un mot ; les mots <span class="rlMot dur">soulignés</span> sont à vérifier). Seules les voix et les écrans des répliques changées sont refaits ; le montage final est refait en entier (quelques minutes).</p>
    <div id="rlListe" class="rlListe"></div>
    <div id="rlPied" class="ligne" style="margin-top:10px;flex-wrap:wrap"><span class="mut" id="rlEtat">Aucun changement.</span><span class="sp"></span><span id="rlMonter">${boutonsMontage(true, E.tiktok)}</span><button id="rlFermer">Fermer</button><button class="pri" id="rlRefaire" disabled>Refaire</button></div>`, 'xl');
  const fen = $('#rlListe'), ouverte = () => fen.isConnected; // fenêtre de relecture encore affichée
  const dessiner = () => {
    if (!ouverte()) return;
    $('#rlListe').innerHTML = E.scenes.map(s => `<div class="rlLigne ${aRefaire.has(s.i) ? 'change' : ''}" data-i="${s.i}">
      ${s.section ? `<div class="rlSection">${esc(s.section)}</div>` : ''}
      <div class="rlCorps"><span class="rlNum">${s.i + 1}</span><select data-expr="${s.i}" title="Expression de Pico">${E.expressions.map(x => `<option value="${x}" ${x === exprDe(s) ? 'selected' : ''}>${NOMS_EXPR[x] || x}</option>`).join('')}</select>
      <div class="rlTexte" data-texte="${s.i}">${motsDe(texteDe(s))}</div><button class="mini" data-edit="${s.i}" title="Modifier la phrase">✏</button>${s.ecran ? `<button class="mini" data-ecran="${s.i}" title="Corriger le texte écrit sur l’écran">🖼</button><button class="mini" data-retour="${s.i}" title="Dire à l’IA ce qui ne va pas sur cet écran : elle le corrige et seule cette réplique est refaite">💬</button>` : ''}</div>
      ${s.ecran ? `<div class="rlEcran mut" data-ecranvu="${s.i}">🖼 ${esc(apercuEcran(s))}${(ch.get(s.i) || {}).sansFond ? ' · sans photo' : s.photo ? ' · 📷 photo en fond' : ''}</div>` : ''}</div>`).join('');
    const n = aRefaire.size; $('#rlEtat').textContent = n ? `${n} réplique${n > 1 ? 's' : ''} à refaire${dico && E.tiktok ? ' · la version TikTok sera aussi refaite (prononciation)' : ''}.` : 'Aucun changement.';
    $('#rlRefaire').disabled = !n; $('#rlRefaire').textContent = n ? `Refaire ${n} réplique${n > 1 ? 's' : ''}` : 'Refaire';
  };
  const changer = (i, k, v) => { const c = ch.get(i) || {}; c[k] = v; ch.set(i, c); aRefaire.add(i); dessiner(); };
  $('#rlFermer').onclick = fermer;
  $('#rlMonter').onclick = ev => { const b = ev.target.closest('[data-monter]'); if (b) monterPico(E.base, b.dataset.monter); };
  $('#rlListe').onkeydown = e => { const m = e.target.closest('[data-mot]'); if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); m.click(); } }; // mots au clavier : Entrée ou Espace
  $('#rlListe').onchange = e => { const t = e.target; if (t.dataset.expr !== undefined) changer(+t.dataset.expr, 'expr', t.value); };
  $('#rlListe').onclick = async e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { const i = +ed.dataset.edit, s = E.scenes[i], z = $(`[data-texte="${i}"]`); z.innerHTML = `<textarea rows="3" style="width:100%">${esc(texteDe(s))}</textarea><div class="ligne"><button class="mini pri" data-ok="${i}">OK</button></div>`; z.querySelector('textarea').focus(); return; }
    const be = e.target.closest('[data-ecran]');
    if (be) { const i = +be.dataset.ecran, s = E.scenes[i], x = ecranDe(s), z = $(`[data-ecranvu="${i}"]`);
      z.innerHTML = `<div class="rlEcranEdit">${Object.entries(x.champs).map(([k, v]) => `<label>${esc(NOMS_CHAMP[k] || k)} <input data-champ="${esc(k)}" value="${esc(v)}" style="width:100%"></label>`).join('')}
        ${x.points ? `<label>${NOMS_CHAMP.points} <textarea data-champ="points" rows="${Math.min(8, x.points.length + 1)}" style="width:100%">${esc(x.points.join('\n'))}</textarea></label>` : ''}
        <div class="ligne"><button class="mini pri" data-ecranok="${i}">OK</button><span class="mut">Le texte écrit sur l’écran (la voix ne change pas).</span></div></div>`; z.querySelector('input,textarea').focus(); return; }
    // retour à l'IA sur cet écran : corrigé tout de suite, puis seule cette réplique (et celles déjà changées) est refaite
    const br = e.target.closest('[data-retour]');
    if (br) { const i = +br.dataset.retour, ligne = br.closest('.rlLigne'); document.querySelectorAll('.rlRetour').forEach(x => x.remove());
      ligne.insertAdjacentHTML('beforeend', `<div class="rlRetour rlPron"><input id="rlDemande" style="flex:1;min-width:240px" placeholder="Ce qui ne va pas (ex. : la phrase en dessous n’a aucun sens, plus court, sans photo)"><button class="mini pri" id="rlCorriger">Corriger maintenant</button><span class="mut" id="rlRetourEtat"></span></div>`);
      const go = async () => { const d = $('#rlDemande').value.trim(), et = $('#rlRetourEtat'); if (d.length < 3) return $('#rlDemande').focus();
        const s = E.scenes[i], x = ecranDe(s); $('#rlCorriger').disabled = true; et.textContent = 'Correction de l’écran…';
        try { const r = await (await api('/api/pico/ecran-ia', { method: 'POST', body: JSON.stringify({ base: E.base, i, demande: d, champs: x.champs, points: x.points, texte: texteDe(s) }) })).json();
          if (r.error || !r.ok) { et.textContent = r.error || r.message; $('#rlCorriger').disabled = false; return; }
          const c = ch.get(i) || {}; if (Object.keys(r.ecran || {}).length) c.ecran = { ...(c.ecran || {}), ...r.ecran }; if (r.sansFond) c.sansFond = true; ch.set(i, c); aRefaire.add(i);
          signal(`Écran ${i + 1} : ${r.message}. Seule cette réplique est refaite.`); dessiner(); if (!$('#rlRefaire').disabled) $('#rlRefaire').click();
        } catch (er) { et.textContent = er.message; siLa('#rlCorriger', b => { b.disabled = false; }); } };
      $('#rlCorriger').onclick = go; $('#rlDemande').onkeydown = ev => { if (ev.key === 'Enter') go(); }; $('#rlDemande').focus(); return; }
    const eo = e.target.closest('[data-ecranok]');
    if (eo) { const i = +eo.dataset.ecranok, s = E.scenes[i], v = {}; let change = false;
      $(`[data-ecranvu="${i}"]`).querySelectorAll('[data-champ]').forEach(c => { const k = c.dataset.champ;
        if (k === 'points') { const l = c.value.split('\n').map(x => x.trim()).filter(Boolean); if (l.join('\n') !== (s.ecran.points || []).join('\n')) { v.points = l; change = true; } }
        else { const t = c.value.replace(/\s+/g, ' ').trim(); if (t !== s.ecran.champs[k]) { v[k] = t; change = true; } } });
      if (change) changer(i, 'ecran', v); else { const c = ch.get(i); if (c) delete c.ecran; dessiner(); } return; }
    const ok = e.target.closest('[data-ok]');
    if (ok) { const i = +ok.dataset.ok, v = $(`[data-texte="${i}"] textarea`).value.replace(/\s+/g, ' ').trim(); if (v && v !== E.scenes[i].texte) changer(i, 'texte', v); else dessiner(); return; }
    const m = e.target.closest('[data-mot]'); if (!m || e.target.closest('textarea')) return;
    const mot = m.dataset.mot, ligne = m.closest('.rlLigne'), i = +ligne.dataset.i;
    document.querySelectorAll('.rlPron').forEach(x => x.remove());
    let dit = ''; try { const d = await (await api('/api/prononciations')).json(); dit = (d.perso || {})[mot] || (d.livre || {})[mot] || ''; } catch (er) { /* dictionnaire indisponible */ }
    ligne.insertAdjacentHTML('beforeend', `<div class="rlPron"><b>« ${esc(mot)} »</b> se dit <input id="rlDit" value="${esc(dit)}" placeholder="comme tu le dirais, en lettres françaises"><button class="mini" id="rlEcouter">▶ Écouter</button><button class="mini pri" id="rlAjouter">➕ Ajouter au dictionnaire</button><span class="mut" id="rlPronEtat"></span></div>`);
    $('#rlDit').focus();
    $('#rlEcouter').onclick = async () => {
      const v = $('#rlDit').value.trim(), et = $('#rlPronEtat'), phrase = texteDe(E.scenes[i]).split(mot).join(v || mot); et.textContent = 'La voix de Pico prépare la phrase…'; $('#rlEcouter').disabled = true;
      try { const { id } = await (await api('/api/pico/ecouter', { method: 'POST', body: JSON.stringify({ base: E.base, texte: phrase }) })).json(); const r = await suivreTravail(id, k => { et.textContent = k.step || '…'; }); et.textContent = ''; new Audio('/media/' + encodeURIComponent(r.file)).play(); }
      catch (er) { et.textContent = er.message; }
      $('#rlEcouter').disabled = false;
    };
    $('#rlAjouter').onclick = async () => {
      const v = $('#rlDit').value.trim(), et = $('#rlPronEtat'); if (!v) return $('#rlDit').focus();
      try { const d = await (await api('/api/prononciations')).json(), mots = { ...(d.perso || {}), [mot]: v }; const r = await api('/api/prononciations', { method: 'PUT', body: JSON.stringify({ mots }) }); if (!r.ok) throw new Error((await r.json()).error || 'Dictionnaire non enregistré');
        dico = true; const re = new RegExp(`(^|[^\\p{L}])${mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^\\p{L}]|$)`, 'iu'); E.scenes.forEach(s => { if (re.test(texteDe(s))) aRefaire.add(s.i); }); difficiles.delete(mot.toLowerCase()); dessiner(); signal(`« ${mot} » ajouté au dictionnaire.`); }
      catch (er) { et.textContent = er.message; }
    };
  };
  $('#rlRefaire').onclick = async () => {
    const changements = [...aRefaire].map(i => ({ i, ...(ch.get(i) || {}) }));
    $('#rlRefaire').disabled = true; $('#rlEtat').innerHTML = '<progress max="100" value="0" style="width:260px"></progress> <span id="rlProg">Démarrage…</span>';
    try {
      const { id } = await (await api('/api/pico/refaire', { method: 'POST', body: JSON.stringify({ base: E.base, changements, tiktok: dico }) })).json();
      const r = await suivreTravail(id, k => { const p = $('#rlEtat progress'), t = $('#rlProg'); if (p) p.value = Math.round((k.progress || 0) * 100); if (t) t.textContent = k.step || ''; });
      ch.clear(); aRefaire.clear(); dico = false; signal(`Épisode « ${E.titre} » mis à jour : ${r.versions.join(' et ')}.`);
      if (!ouverte()) return; Object.assign(E, await (await api('/api/pico/episode?base=' + encodeURIComponent(E.base))).json()); dessiner();
      if (!ouverte()) return;
      $('#rlEtat').innerHTML = `✅ ${esc(r.versions.join(' et '))} mis à jour. <a href="#" id="rlDossier">Ouvrir le dossier</a> · <a href="#" id="rlPublier">Publier…</a>`;
      $('#rlDossier').onclick = ev => { ev.preventDefault(); api('/api/publier/ouvrir', { method: 'POST', body: JSON.stringify({ cible: 'dossier', episode: E.base }) }); };
      $('#rlPublier').onclick = ev => { ev.preventDefault(); ouvrirPublier(); };
    } catch (er) { signal('Relecture : ' + er.message); if (ouverte()) { $('#rlEtat').innerHTML = `<span style="color:#f87171">${esc(er.message)}</span>`; $('#rlRefaire').disabled = false; } }
  };
  dessiner();
}
// Dictionnaire de prononciation : « mot écrit → comme il se dit », pour toutes les voix de synthèse (les sous-titres gardent l'orthographe)
async function ouvrirPrononciations() {
  if (dbl) dblFin();
  let e; try { e = await (await api('/api/prononciations')).json(); } catch (er) { return alert(er.message); }
  const lst = Object.entries(e.perso || {}).map(([k, v]) => [k, v]);
  const livres = Object.entries(e.livre || {}).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  const garder = async () => { const mots = {}; for (const [k, v] of lst) if (k.trim()) mots[k.trim()] = (v || '').trim(); await api('/api/prononciations', { method: 'PUT', body: JSON.stringify({ mots }) }); };
  const lignes = () => lst.map(([k, v], i) => `<div class="prLig"><input class="prE" data-i="${i}" value="${esc(k)}" placeholder="mot écrit"> <span class="mut">→ se dit</span> <input class="prL" data-i="${i}" value="${esc(v)}" placeholder="comme tu le dirais (ex. : Maquaï)"> <button class="mini" data-pe="${i}" title="Écouter">▶</button><button class="mini" data-ps="${i}" title="Retirer">✕</button></div>`).join('') || '<p class="mut">Aucun mot à toi pour l’instant. Ajoute ceux que la voix prononce mal.</p>';
  ouvrir(`<h2>📖 Dictionnaire de prononciation</h2>
    <p>Écris le mot tel qu’il apparaît dans tes textes, puis comme il doit se dire (en lettres françaises : « Goldgar » → « Golgar »). Les voix le prononcent ainsi dans tes vidéos ; les sous-titres gardent l’orthographe. Pour un sigle, sépare les lettres : « PEA » → « P E A ». Une case « se dit » vide retire le mot du dictionnaire livré.</p>
    <div id="prListe">${lignes()}</div>
    <div class="ligne"><button class="pri" id="prAjout">+ Ajouter un mot</button><button id="prFermer">Fermer</button></div>
    <div class="encart" style="margin-top:10px"><h4>Vérifier un texte</h4><p class="mut" style="margin:0 0 6px">Colle un passage : la voix le lit, puis la reconnaissance le réécoute. Les mots qu’elle n’a pas compris sont proposés pour le dictionnaire (une seule voix, sans internet).</p>
      <textarea id="prTexte" rows="3" style="width:100%" placeholder="Ex. : Warren Buffett dirige Berkshire Hathaway depuis Omaha."></textarea>
      <div class="ligne"><button id="prVerif">🔎 Vérifier la prononciation</button></div><div id="prRes" class="mut" style="margin-top:6px"></div></div>
    <details style="margin-top:10px"><summary class="mut">Mots déjà connus (${livres.length})</summary><div id="prLivres" style="max-height:220px;overflow:auto;margin-top:6px">${livres.map(([k, v]) => `<div class="prLig"><span><b>${esc(k)}</b> <span class="mut">→ ${esc(v)}</span></span> <button class="mini" data-pc="${esc(k)}" title="Modifier pour toi">✎</button></div>`).join('')}</div></details>
    <p class="mut" id="prInfo" style="margin:8px 0 0">Fichier : <b>${esc(e.fichier || '')}</b>. Pour les vidéos fabriquées par la chaîne QuentInvest, envoie ce fichier pour qu’il soit pris en compte.</p>`, 'xl');
  const liste = $('#prListe');
  const redessiner = () => { liste.innerHTML = lignes(); };
  $('#prFermer').onclick = fermer;
  $('#prAjout').onclick = () => { lst.push(['', '']); redessiner(); const l = liste.querySelectorAll('.prE'); if (l.length) l[l.length - 1].focus(); };
  liste.onchange = async ev => { const i = ev.target.dataset.i; if (i == null) return; lst[+i][ev.target.classList.contains('prE') ? 0 : 1] = ev.target.value; try { await garder(); } catch (er) { alert(er.message); } };
  liste.onclick = async ev => {
    const d = ev.target.dataset;
    if (d.ps != null) { lst.splice(+d.ps, 1); redessiner(); try { await garder(); } catch (er) { alert(er.message); } }
    if (d.pe != null) {
      const [k, v] = lst[+d.pe]; if (!k.trim()) return;
      try { await garder(); const p = await (await api('/api/parole')).json(), vp = (p.voix || []).find(x => x.installee), voix = vp ? 'piper:' + vp.id : ((p.mac || [])[0] || {}).nom;
        if (!voix) return alert('Installe d’abord une voix (Voix naturelles) pour écouter.');
        essaiVoix(voix, 'On parle de ' + k + ' aujourd’hui. ' + k + '.', 1, ev.target); } catch (er) { alert(er.message); }
    }
  };
  $('#prVerif').onclick = async () => {
    const texte = $('#prTexte').value.trim(), res = $('#prRes'); if (texte.length < 10) return signal('Colle au moins une phrase.');
    $('#prVerif').disabled = true; res.textContent = 'Préparation…';
    try {
      const { id } = await (await api('/api/prononciations/controle', { method: 'POST', body: JSON.stringify({ texte }) })).json();
      const r = await suivreTravail(id, j => { res.textContent = Math.round((j.progress || 0) * 100) + ' % · ' + (j.step || ''); });
      res.innerHTML = r.suspects.length ? `<b>${r.suspects.length} mot(s) à vérifier</b> (écrit → entendu) :<br>` + r.suspects.map(x => `<span class="prSus">${esc(x.ecrit)} → ${esc(x.entendu)} <button class="mini" data-pa="${esc(x.ecrit)}">+ ajouter</button></span>`).join(' ') : 'Tous les mots ont été compris : rien à corriger.';
      res.onclick = async ev => { const k = ev.target.dataset.pa; if (!k) return; if (!lst.some(x => x[0] === k)) lst.push([k, '']); redessiner(); const l = liste.querySelectorAll('.prL'); if (l.length) l[l.length - 1].focus(); };
    } catch (er) { res.innerHTML = '<span style="color:#f87171">' + esc(er.message) + '</span>'; }
    finally { $('#prVerif').disabled = false; }
  };
  $('#prLivres').onclick = ev => { const k = ev.target.dataset.pc; if (!k) return; if (!lst.some(x => x[0] === k)) { lst.push([k, (e.livre || {})[k] || '']); garder().catch(() => {}); } redessiner(); signal('Ajouté à ton dictionnaire : modifie-le ci-dessus.'); };
}
// Voix clonée (essai) : des modèles imitent ta voix à partir du corpus « Ma voix » ; on écoute les mêmes phrases dites par chacun
const VC_PHRASES = ['Salut la colonie ! Abonne-toi pour ne rien rater.', 'En 1637, un seul bulbe de tulipe aurait été payé 5 000 florins, alors qu’un artisan en gagnait environ 300 par an.', 'Imaginons un contrat à 100 florins, revendu cinq fois, avec 50 pour cent de hausse à chaque revente.', 'Un grain après l’autre, à bientôt dans la fourmilière !'];
let vcEnCours = false;
async function ouvrirVoixClone() {
  if (dbl) dblFin();
  let e; try { e = await (await api('/api/voix-clone')).json(); } catch (er) { return alert(er.message); }
  const mac = e.arch !== 'autre', sec = (e.corpus && e.corpus.secondes) || 0;
  const nomF = f => f === 'reel.wav' ? 'Ta vraie voix (extrait de référence)' : (f.startsWith('chatterbox') ? 'Chatterbox' : 'Qwen3-TTS') + ' — phrase ' + /-(\d+)\.wav/.exec(f)[1];
  const calcul = f => { const r = (e.rapports || []).find(x => x.fichier === f); return r ? ` <span class="mut">(calculé en ${r.calcul} s pour ${r.duree} s de voix)</span>` : ''; };
  const sons = (e.fichiers || []).map(f => `<div class="vcSon"><div><b>${esc(nomF(f))}</b>${calcul(f)}${f === 'reel.wav' ? '' : `<div class="mut">« ${esc(VC_PHRASES[+/-(\d+)\.wav/.exec(f)[1] - 1] || '')} »</div>`}</div><audio controls preload="none" src="/api/voix-clone/audio?f=${enc(f)}&v=${Date.now()}"></audio></div>`).join('');
  ouvrir(`<h2>🧬 Voix clonée — essai</h2>
    <p>Cet essai fait dire quatre phrases par deux modèles qui imitent ta voix, pour que tu juges s’ils sont assez naturels. Il utilise tes enregistrements du Doublage (<b>${(e.corpus && e.corpus.prises) || 0}</b> répliques, ${dblDuree(sec)}). Rien n’est publié ni envoyé : tout se passe sur ton Mac.</p>
    ${mac ? '' : '<p class="mut">Cet essai est prévu pour l’application Mac.</p>'}
    <div class="sw2"><input type="checkbox" id="vcChatterbox" checked><label for="vcChatterbox">Chatterbox (multilingue) — environ ${e.moteurs[0].go} Go${e.moteurs[0].installe ? ' · déjà installé' : ''}</label></div>
    <div class="sw2"><input type="checkbox" id="vcQwen" checked><label for="vcQwen">Qwen3-TTS — environ ${e.moteurs[1].go} Go${e.moteurs[1].installe ? ' · déjà installé' : ''}</label></div>
    <p class="mut" style="margin:6px 0">La première fois, l’installation et les téléchargements prennent de 15 à 40 minutes (jusqu’à 8 Go d’espace libre). Garde l’application ouverte et le Mac branché. Les essais suivants sont rapides.</p>
    <div class="ligne"><button class="pri" id="vcLancer" ${mac ? '' : 'disabled'}>Lancer l’essai</button><button id="vcAnnuler" style="display:none">Arrêter</button><button id="vcRapport" title="Copie le rapport d’installation pour le coller dans un message">📋 Copier le rapport</button><button id="vcDossier">📂 Ouvrir le dossier</button><button id="vcFermer">Fermer</button></div>
    <div id="vcEtat" class="mut" style="margin:8px 0"></div>
    <div id="vcSons">${sons}</div>`, 'xl');
  $('#vcFermer').onclick = fermer;
  $('#vcRapport').onclick = async () => { try { const j = await (await api('/api/voix-clone/journal')).json(), t = 'Rapport voix clonée\n' + JSON.stringify({ ...j.etat, fichiers: undefined, rapports: undefined }) + '\n\n' + j.texte; await navigator.clipboard.writeText(t); signal('Rapport copié : colle-le dans un message.'); } catch (er) { alert('Copie impossible : ' + er.message); } };
  $('#vcDossier').onclick = async () => { try { const j = await (await api('/api/voix-clone/dossier', { method: 'POST' })).json(); if (!j.ok) signal('Dossier : ' + j.dossier); } catch (er) { alert(er.message); } };
  let jobId = null;
  $('#vcAnnuler').onclick = () => { if (jobId) api('/api/annuler?id=' + enc(jobId), { method: 'POST' }); };
  $('#vcLancer').onclick = async () => {
    if (vcEnCours) return;
    const moteurs = [$('#vcChatterbox').checked && 'chatterbox', $('#vcQwen').checked && 'qwen'].filter(Boolean);
    if (!moteurs.length) return alert('Choisis au moins un modèle.');
    vcEnCours = true; $('#vcLancer').disabled = true; $('#vcAnnuler').style.display = '';
    const etat = $('#vcEtat');
    try {
      const { id } = await (await api('/api/voix-clone/essai', { method: 'POST', body: JSON.stringify({ moteurs }) })).json(); jobId = id;
      await suivreTravail(id, j => { if (etat.isConnected) etat.textContent = Math.round((j.progress || 0) * 100) + ' % · ' + (j.step || ''); });
      if (etat.isConnected) { etat.textContent = 'Terminé : écoute et compare.'; ouvrirVoixClone(); }
    } catch (er) { if ($('#vcEtat')) $('#vcEtat').innerHTML = '<span style="color:#f87171">' + esc(er.message) + '</span> <span class="mut">Le détail est dans le dossier (journal.txt).</span>'; }
    finally { vcEnCours = false; const l = $('#vcLancer'); if (l) l.disabled = false; const a = $('#vcAnnuler'); if (a) a.style.display = 'none'; }
  };
}
function ouvrirDoublage() {
  if (dbl) return;
  stopLecture();
  const dblMedias = medias.filter(m => m.kind === 'video' || m.kind === 'audio'), nom0 = dblNom((proj.gen && proj.gen.titre) || proj.sujet || ''), texteVideo = (proj.gen && proj.gen.texte) || '';
  dbl = { nom: nom0, lignes: [], prises: {}, cur: 0, enreg: false, auto: true, arretAuto: true, flux: null, vue: false };
  ouvrir(`<h2>🎙 Doublage : ta voix, phrase par phrase</h2>
    <p class="mut">Colle le texte à lire (une réplique par ligne) ou charge un épisode QuentInvest. Tu enregistres chaque ligne, tu la réécoutes, tu la refais si besoin : le silence du début et de la fin est retiré tout seul. Ensuite les répliques se posent dans la piste audio, ou la chaîne QuentInvest les utilise à la place de la voix de Pico.</p>
    <label class="l">Nom du doublage (un dossier à ce nom est créé)</label><input type="text" id="dbNom" value="${esc(nom0)}">
    <label class="l">Texte à lire</label><textarea id="dbTexte" rows="9" placeholder="Une réplique par ligne. Exemple :&#10;Salut la colonie !&#10;Aujourd’hui, on parle des intérêts composés."></textarea>
    <div class="ligne" style="margin-top:6px"><button id="dbFichier">📂 Charger un épisode ou un texte…</button>${texteVideo ? '<button id="dbVideo">Utiliser le texte de la vidéo</button>' : ''}<input type="file" id="dbF" accept=".json,.txt,.md,text/plain,application/json,video/*,audio/*,.mp4,.mov,.m4a,.mp3,.wav" hidden></div>
    ${dblMedias.length ? `<div class="ligne" style="margin-top:6px"><select id="dbMedia" style="flex:1">${dblMedias.map(m => `<option value="${esc(m.file)}">${esc(m.file)}</option>`).join('')}</select><button id="dbLire">🎧 Lire le texte de cette vidéo</button></div>` : ''}
    <p class="mut" id="dbMsg" style="margin:6px 0 0"></p>
    <div class="ligne" style="margin-top:10px"><button class="pri" id="dbGo" style="flex:1">Commencer l’enregistrement</button><button id="dbAnnuler">Fermer</button></div>`, 'xl');
  $('#dbTexte').focus();
  $('#dbFichier').onclick = () => $('#dbF').click();
  $('#dbF').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (/^(video|audio)\//.test(f.type) || /\.(mp4|mov|m4v|mkv|webm|m4a|mp3|wav|aac|flac|ogg)$/i.test(f.name)) { // une vidéo ou un son : sa voix est transcrite pour servir de texte
      $('#dbMsg').textContent = 'Import de ' + f.name + '…';
      try { const r = await (await api('/api/import?name=' + enc(f.name), { method: 'POST', body: f })).json(); await chargerMedias(); await dblLireMedia(r.file || f.name, f.name.replace(/\.[^.]+$/, '')); }
      catch (er) { $('#dbMsg').innerHTML = `<span class="err">${esc(er.message)}</span>`; }
      return;
    }
    const l = dblLire(await f.text()); $('#dbTexte').value = l.join('\n'); $('#dbNom').value = dblNom(f.name.replace(/\.[^.]+$/, ''));
    $('#dbMsg').textContent = `${l.length} réplique${l.length > 1 ? 's' : ''} chargée${l.length > 1 ? 's' : ''}. Garde leur ordre : chaque ligne correspond à une réplique de l’épisode.`;
  };
  if (texteVideo) $('#dbVideo').onclick = () => { const l = texteVideo.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean); $('#dbTexte').value = l.join('\n'); $('#dbMsg').textContent = `${l.length} phrases reprises du texte de la vidéo.`; };
  const bl = $('#dbLire'); if (bl) bl.onclick = () => dblLireMedia($('#dbMedia').value, $('#dbMedia').value.replace(/\.[^.]+$/, ''));
  $('#dbAnnuler').onclick = fermer;
  $('#dbGo').onclick = async () => {
    const lignes = dblLignes($('#dbTexte').value), nom = dblNom($('#dbNom').value);
    if (!lignes.length) return alert('Écris ou charge d’abord le texte à lire.');
    dbl.nom = nom; dbl.lignes = lignes; if (dbl.debuts && dbl.debuts.length !== lignes.length) dbl.debuts = null; $('#dbGo').disabled = true; $('#dbMsg').textContent = 'Préparation du micro…';
    try {
      const d = dbl, flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (dbl !== d) { flux.getTracks().forEach(t => t.stop()); return; } dbl.flux = flux;
    } catch (er) { if (!$('#dbGo')) return; $('#dbGo').disabled = false; $('#dbMsg').innerHTML = `<span class="err">Micro indisponible : ${esc(er.message)}. Autorise QuentMovie dans Réglages Système → Confidentialité et sécurité → Micro.</span>`; return; }
    try {
      const avant = await (await api('/api/doublage?nom=' + enc(nom))).json(); // prises déjà enregistrées sous ce nom : on reprend
      for (const p of avant.prises) if (p.n < lignes.length) dbl.prises[p.n] = { duree: p.duree, file: p.file };
      dbl.dossier = avant.dossier; dbl.voix = avant.voix;
      await api('/api/doublage/script?nom=' + enc(nom), { method: 'PUT', body: JSON.stringify({ lignes }) });
    } catch (er) { /* le doublage fonctionne aussi sans la liste des anciennes prises */ }
    if (!dbl || !$('#dbGo')) { if (dbl) dblFin(); return; } // fenêtre fermée pendant la préparation du micro : micro rendu
    const premiere = lignes.findIndex((_, i) => !dbl.prises[i]); dbl.cur = premiere < 0 ? 0 : premiere;
    dblMicroVu(); dbl.vue = true; dblVue();
  };
}
// vu-mètre et chronomètre
function dblMicroVu() {
  const ctx = new AudioContext(), an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(dbl.flux).connect(an); dbl.ctx = ctx;
  const buf = new Uint8Array(an.fftSize);
  const boucle = () => {
    if (!dbl) return; an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128));
    const i = document.querySelector('#dbVu i'); if (i) i.style.width = Math.min(100, m / 128 * 140) + '%';
    if (dbl.enreg) {
      const t = $('#dbTemps'), now = dblMaintenant(); if (t) t.textContent = dblSec(now);
      // fin de la phrase : 1,3 s de silence après au moins 0,3 s de voix (le clic de la touche du début ne compte pas) → arrêt sans toucher le clavier
      if (now > Math.max(0.35, (dbl.relache || 0) + 0.1) && m > 8) { dbl.voixDuree += 1 / 60; dbl.dernierSon = now; }
      if (dbl.arretAuto && dbl.voixDuree > 0.3 && now - dbl.dernierSon > 1.3 && !dbl.arretDemande) { dbl.fin = dbl.dernierSon + 0.35; dbl.arretDemande = true; dbl.rec.stop(); }
    }
    dbl.raf = requestAnimationFrame(boucle);
  };
  boucle();
}
function dblVue() {
  const L = dbl.lignes, n = dbl.cur, fait = Object.keys(dbl.prises).length, ep = episodeDuDoublage(), fini = fait >= L.length;
  // doublage d'un épisode : une seule chose à faire, lire ; la vidéo se fabrique toute seule après la dernière réplique
  const bandeau = !ep ? '' : fini
    ? `<div class="encart" id="dbEpisode" style="margin:6px 0"><b>✅ Toutes tes répliques sont enregistrées.</b> ${dbl.minuteur ? 'La vidéo se fabrique dans quelques secondes…' : 'Tu peux réécouter ou refaire une réplique avant.'}<div class="ligne" style="margin-top:6px"><button class="pri" id="dbFabriquer" style="flex:1">🎬 Fabriquer la vidéo maintenant</button>${dbl.minuteur ? '<button id="dbAttendre">Attendre, je réécoute</button>' : ''}</div></div>`
    : `<div class="encart" id="dbEpisode" style="margin:6px 0">🎬 <b>${esc(ep.titre || 'Ton épisode')}</b> : lis les ${L.length} répliques. Dès la dernière enregistrée, la vidéo (Pico, animations, écrans) se fabrique toute seule. Rien d’autre à régler.<progress max="${L.length}" value="${fait}" style="width:100%;margin-top:6px"></progress></div>`;
  const liste = L.map((t, i) => { const p = dbl.prises[i]; return `<div class="dblL ${i === n ? 'cur' : ''}" data-n="${i}"><span class="n">${i + 1}</span><span class="t">${esc(t)}</span><span class="d">${p ? '✅ ' + dblSec(p.duree) : '⬜'}</span></div>`; }).join('');
  ouvrir(`<h2>🎙 Doublage : ${esc(dbl.nom)}</h2>
    <div class="mut">Réplique ${n + 1} sur ${L.length} · ${fait} enregistrée${fait > 1 ? 's' : ''}</div>${bandeau}
    <div class="dblTexte">${esc(L[n])}</div>
    <div class="ligne"><button class="pri ${dbl.enreg ? 'enreg' : ''}" id="dbRec" style="min-width:210px">${dbl.enreg ? '■ Arrêter (Espace)' : '● Enregistrer (Espace)'}</button>
      <button id="dbEcoute" ${dbl.prises[n] ? '' : 'disabled'}>▶ Réécouter (L)</button><button id="dbPrec" title="Réplique précédente (←)">←</button><button id="dbSuiv" title="Réplique suivante (→)">→</button>
      <div id="dbVu"><i></i></div><span id="dbTemps"></span></div>
    <div class="sw2"><input type="checkbox" id="dbAuto" ${dbl.auto ? 'checked' : ''}><label for="dbAuto">Passer à la réplique suivante dès que j’arrête</label></div>
    <div class="sw2"><input type="checkbox" id="dbArretAuto" ${dbl.arretAuto ? 'checked' : ''}><label for="dbArretAuto">Arrêter tout seul quand je me tais (pas besoin de toucher le clavier à la fin)</label></div>
    <div class="dblListe" id="dbListe">${liste}</div>
    <div class="ligne"><button class="${ep ? '' : 'pri'}" id="dbPoser" ${fait ? '' : 'disabled'}>Poser sur la timeline (piste audio)</button><button id="dbDossier">📂 Ouvrir le dossier</button><button id="dbTexteRetour">✏️ Modifier le texte</button><button id="dbClone" title="Essayer des modèles qui imitent ta voix">🧬 Voix clonée</button><button id="dbPron" title="Mots que la voix prononce mal">📖 Prononciations</button><button id="dbFiche" title="Vérifier une fiche d’épisode QuentInvest">🧾 Fiche</button><button id="dbFermer">Fermer</button></div>
    <p class="mut" id="dbInfo" style="margin:8px 0 0" ${ep ? 'hidden' : ''}>Dossier des répliques : <b>${esc(dbl.dossier || '~/Movies/QuentMovie/doublages/' + dbl.nom)}</b> (fichiers v00.wav, v01.wav…). Pour fabriquer un épisode QuentInvest avec ta voix : <code>episode.js &lt;fiche&gt; --voix-perso &lt;ce dossier&gt;</code>.</p>
    ${dbl.voix && dbl.voix.prises ? `<p class="mut" style="margin:4px 0 0">🧬 <b>Ma voix</b> : ${dbl.voix.prises} répliques gardées avec leur texte (${dblDuree(dbl.voix.secondes)}), tous doublages confondus. Chaque réplique enrichit le corpus qui servira à reproduire ta voix. <a href="#" id="dbVoixDossier">Ouvrir le dossier</a></p>` : ''}`, 'xl');
  dbl.vue = true;
  $('#dbRec').onclick = dblBascule; $('#dbEcoute').onclick = dblEcouter; $('#dbPrec').onclick = () => dblAller(n - 1); $('#dbSuiv').onclick = () => dblAller(n + 1);
  $('#dbAuto').onchange = e => { dbl.auto = e.target.checked; };
  $('#dbArretAuto').onchange = e => { dbl.arretAuto = e.target.checked; };
  $('#dbListe').onclick = e => { const l = e.target.closest('.dblL'); if (l) dblAller(+l.dataset.n); };
  const c = document.querySelector('.dblL.cur'); if (c) c.scrollIntoView({ block: 'nearest' });
  $('#dbPoser').onclick = dblPoser;
  siLa('#dbFabriquer', b => { b.onclick = dblFabriquer; }); siLa('#dbAttendre', b => { b.onclick = () => { clearTimeout(dbl.minuteur); dbl.minuteur = null; dblVue(); }; });
  const vd = $('#dbVoixDossier'); if (vd) vd.onclick = async e => { e.preventDefault(); try { const j = await (await api('/api/doublage/dossier?nom=' + enc(dbl.nom) + '&voix=1', { method: 'POST' })).json(); if (!j.ok) signal('Dossier : ' + j.dossier); } catch (er) { alert(er.message); } };
  $('#dbDossier').onclick = async () => { try { const j = await (await api('/api/doublage/dossier?nom=' + enc(dbl.nom), { method: 'POST' })).json(); if (!j.ok) signal('Dossier : ' + j.dossier); } catch (er) { alert(er.message); } };
  $('#dbFiche').onclick = () => { if (dbl.enreg) return; ouvrirFiche(); };
  $('#dbPron').onclick = () => { if (dbl.enreg) return; ouvrirPrononciations(); };
  $('#dbClone').onclick = () => { if (dbl.enreg) return; ouvrirVoixClone(); };
  $('#dbTexteRetour').onclick = () => { if (dbl.enreg) return; const lignes = dbl.lignes.join('\n'), nom = dbl.nom; dblFin(); ouvrirDoublage(); $('#dbTexte').value = lignes; $('#dbNom').value = nom; };
  $('#dbFermer').onclick = fermer;
}
function dblAller(i) { if (!dbl || dbl.enreg) return; if (dbl.minuteur) { clearTimeout(dbl.minuteur); dbl.minuteur = null; } dbl.cur = clamp(i, 0, dbl.lignes.length - 1); if (dbl.ap) dbl.ap.pause(); dblVue(); }
function dblEcouter() {
  const p = dbl && dbl.prises[dbl.cur]; if (!p || dbl.enreg) return;
  if (dbl.minuteur) { clearTimeout(dbl.minuteur); dbl.minuteur = null; dblVue(); } // réécoute : la fabrication attend ton clic
  if (dbl.ap) dbl.ap.pause(); dbl.ap = new Audio('/media/' + enc(p.file) + '?t=' + Date.now()); dbl.ap.play().catch(() => {});
}
function dblBascule() {
  if (!dbl || !dbl.flux) return;
  if (dbl.ap) dbl.ap.pause();
  if (dbl.enreg) { if (dbl.arretDemande) return; dbl.fin = dblMaintenant(); dbl.arretDemande = true; dbl.rec.stop(); return; }
  if (dbl.minuteur) { clearTimeout(dbl.minuteur); dbl.minuteur = null; } // une prise refaite : la fabrication attend ton clic
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '', morceaux = [], n = dbl.cur;
  const rec = new MediaRecorder(dbl.flux, mime ? { mimeType: mime } : undefined);
  rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
  rec.onstop = async () => {
    if (!dbl) return; dbl.enreg = false; const b = $('#dbRec'); if (b) { b.classList.remove('enreg'); b.textContent = 'Envoi…'; b.disabled = true; }
    try {
      const debut = Math.max(0.12, (dbl.relache != null ? dbl.relache : 0) + 0.08), fin = Math.max(0, dbl.fin - 0.06); // sans les clics des touches
      const r = await (await api(`/api/doublage/prise?nom=${enc(dbl.nom)}&n=${n}&texte=${enc(dbl.lignes[n])}&debut=${debut.toFixed(2)}&fin=${fin.toFixed(2)}`, { method: 'POST', body: new Blob(morceaux, { type: 'audio/webm' }) })).json();
      const avant = Object.keys(dbl.prises).length; dbl.prises[n] = { duree: r.duree, file: r.file }; dbl.voix = r.voix;
      const reste = dbl.lignes.findIndex((_, i) => !dbl.prises[i]);
      if (dbl.auto && reste >= 0) dbl.cur = reste > n || n >= dbl.lignes.length - 1 ? reste : n + 1;
      // la dernière réplique manquante vient d'être enregistrée : fabrication dans 6 s (le temps de dire « attendre »)
      if (reste < 0 && avant < dbl.lignes.length && episodeDuDoublage()) dbl.minuteur = setTimeout(() => { if (dbl && !dbl.enreg) { dbl.minuteur = null; dblFabriquer(); } }, 6000);
    } catch (er) { alert(er.message); }
    if (dbl) dblVue();
  };
  dbl.rec = rec; dbl.enreg = true; dbl.t0 = performance.now(); dbl.relache = null; dbl.fin = 0; dbl.voixDuree = 0; dbl.dernierSon = 0; dbl.arretDemande = false;
  rec.onstart = () => { if (dbl && dbl.rec === rec) { const dec = (performance.now() - dbl.t0) / 1000; dbl.t0 = performance.now(); if (dbl.relache != null) dbl.relache -= dec; } }; // horloge calée sur le vrai début du son
  rec.start();
  const b = $('#dbRec'); b.classList.add('enreg'); b.textContent = '■ Arrêter (Espace)';
  for (const id of ['dbPrec', 'dbSuiv', 'dbEcoute', 'dbPoser', 'dbTexteRetour']) { const x = $('#' + id); if (x) x.disabled = true; }
}
// les répliques enregistrées, à la suite dans la piste audio, à partir de la tête de lecture ; une pose précédente du même doublage est remplacée
async function dblPoser() {
  if (!dbl || dbl.enreg) return;
  const prises = Object.entries(dbl.prises).map(([n, p]) => ({ n: +n, ...p })).sort((a, b) => a.n - b.n); if (!prises.length) return;
  await chargerMedias();
  const prefixe = `doublage-${dbl.nom}-`; proj.audio = proj.audio.filter(a => !String(a.file).startsWith(prefixe));
  const deb = dbl.debuts; let t = gt; // doublage d'une vidéo : chaque réplique démarre quand la phrase d'origine était dite, sans chevaucher la précédente
  for (const p of prises) { if (deb && deb[p.n] !== undefined) t = Math.max(t, gt + deb[p.n]); proj.audio.push({ file: p.file, vol: 100, start: +t.toFixed(2), fade: false, loop: false, duck: false }); t += p.duree + 0.25; }
  selA = proj.audio.length - 1; selP = -1; sel = -1; selT = -1; selCut = -1; commit(); tout(); navigateur();
  signal(`🎙 ${prises.length} réplique${prises.length > 1 ? 's' : ''} posée${prises.length > 1 ? 's' : ''} dans la piste audio (${fmt(t - gt)}).`);
  fermer();
}
function dblFin() {
  const d = dbl; if (!d) return; dbl = null;
  clearTimeout(d.minuteur); cancelAnimationFrame(d.raf); if (d.ap) d.ap.pause();
  if (d.enreg && d.rec) { d.rec.onstop = null; try { d.rec.stop(); } catch (e) { /* déjà arrêté */ } }
  if (d.flux) d.flux.getTracks().forEach(t => t.stop()); if (d.ctx) d.ctx.close().catch(() => {});
}
// touches pendant le doublage ; renvoie vrai quand la touche est prise en charge
function toucheDoublage(e) {
  const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k, tag = (e.target.tagName || '').toLowerCase(), f = fn => { e.preventDefault(); fn(); return true; };
  if (!$('#dbRec') && !$('#dbGo')) { dblFin(); return false; } // une autre fenêtre a remplacé le doublage : micro rendu
  if (e.metaKey || e.ctrlKey) return false;
  if (k === 'Escape') return f(() => { if (dbl.enreg && !confirm('Un enregistrement est en cours. Le perdre et fermer ?')) return; fermer(); });
  if (!dbl.vue || tag === 'textarea' || (tag === 'input' && e.target.type === 'text')) return true; // préparation du texte : les touches restent à la saisie
  if (k === ' ' || kl === 'r') return f(() => { if (!e.repeat) dblBascule(); }); // touche gardée enfoncée : pas d'arrêt involontaire
  if (kl === 'l') return f(dblEcouter);
  if (k === 'ArrowRight' || k === 'ArrowDown' || (k === 'Enter' && tag !== 'button')) return f(() => dblAller(dbl.cur + 1));
  if (k === 'ArrowLeft' || k === 'ArrowUp') return f(() => dblAller(dbl.cur - 1));
  return true;
}
