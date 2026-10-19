// Interface de la voix : doublage (ta voix réplique par réplique), dictionnaire et contrôle de prononciation, voix clonée (essai), contrôle d'une fiche QuentInvest.
// Sortie de index.html pour le garder lisible : script classique chargé avant le script principal ; il utilise ses fonctions (api, $, ouvrir, signal…) à l'exécution.
// ---------- Doublage : ta voix, réplique par réplique ----------
// Chaque réplique est envoyée au moteur (/api/doublage/prise) qui retire le silence du début et de la fin et la range dans
// ~/Movies/QuentMovie/doublages/<nom>/vNN.wav ; ce dossier est celui que la chaîne QuentInvest lit avec --voix-perso.
let dbl = null;
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
// Contrôle d'une fiche d'épisode QuentInvest : colle ou charge le fichier .json, le rapport dit ce qu'il faut corriger avant la fabrication
function ouvrirFiche() {
  if (dbl) dblFin();
  ouvrir(`<h2>🧾 Contrôle d’une fiche QuentInvest</h2>
    <p>Colle le contenu d’une fiche (ou charge le fichier) : QuentMovie vérifie qu’elle est complète, qu’elle dépasse 5 minutes, que les phrases restent courtes, que les chiffres ont une source, qu’aucun conseil d’investissement ne s’est glissé dedans, et liste les mots à ajouter au dictionnaire de prononciation.</p>
    <div class="encart" style="margin-bottom:8px"><h4>Brouillon automatique</h4><p class="mut" style="margin:0 0 6px">Donne un sujet : QuentMovie lit l’article Wikipédia, l’IA locale reformule les faits pour la voix et la structure de l’épisode est ajoutée. C’est un <b>brouillon</b> : le titre, l’accroche, les erreurs du piège et la question sont à réécrire, et les sources à vérifier.</p>
      <div class="ligne"><input id="fiSujet" placeholder="Ex. : Le krach de 1929" style="flex:1"><button id="fiBrouillon">✍️ Écrire un brouillon</button></div><div id="fiProg" class="mut" style="margin-top:6px"></div></div>
    <div id="fiDeja"></div>
    <div class="encart" style="margin-bottom:8px"><h4>Ton script</h4><p class="mut" style="margin:0 0 6px">Colle ton texte tel que tu l’as écrit : un titre (# Titre), l’accroche, des paragraphes (une ligne courte = un titre de partie, des lignes « - » = une liste), puis « En une phrase : … ». QuentMovie le découpe en répliques et choisit les écrans (chiffres, définitions, listes) sans rien ajouter.</p>
      <textarea id="fiScript" rows="5" style="width:100%" placeholder="# Pourquoi les prix montent ?&#10;&#10;Ton panier coûtait 50 € il y a cinq ans…"></textarea><div class="ligne"><span class="sp"></span><button id="fiDepuisScript">📄 Transformer mon script en fiche</button></div></div>
    <textarea id="fiTexte" rows="9" style="width:100%;font-family:monospace;font-size:12px" placeholder='{ "numero": 12, "slug": "…", … }'></textarea>
    <div class="ligne"><label class="bouton" style="cursor:pointer">📂 Charger un fichier<input type="file" id="fiF" accept=".json,application/json" hidden></label><button class="pri" id="fiGo">Contrôler</button><button id="fiFermer">Fermer</button></div>
    <div id="fiRes" style="margin-top:8px"></div>`, 'xl');
  $('#fiFermer').onclick = fermer;
  api('/api/pico/episodes').then(r => r.json()).then(r => { const l = (r.episodes || []).slice(0, 6), z = $('#fiDeja'); if (!z || !l.length) return;
    z.innerHTML = `<div class="encart" style="margin-bottom:8px"><h4>Épisodes déjà fabriqués</h4><div class="ligne" style="flex-wrap:wrap">${l.map(e => `<button class="mini" data-relire="${esc(e.base)}">🔍 ${esc(e.titre || e.base)}</button>`).join('')}</div></div>`;
    z.onclick = ev => { const b = ev.target.closest('[data-relire]'); if (b) ouvrirRelecturePico(b.dataset.relire); }; }).catch(() => {});
  $('#fiF').onchange = async e => { const f = e.target.files[0]; if (f) $('#fiTexte').value = await f.text(); };
  $('#fiDepuisScript').onclick = async () => {
    const t = $('#fiScript').value, prog = $('#fiProg');
    try { const r = await api('/api/quentinvest/script', { method: 'POST', body: JSON.stringify({ texte: t }) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Script illisible');
      $('#fiTexte').value = JSON.stringify(j.fiche, null, 1); $('#fiGo').click(); $('#fiTexte').scrollIntoView({ block: 'center' }); }
    catch (er) { signal(er.message); }
  };
  $('#fiBrouillon').onclick = async () => {
    const sujet = $('#fiSujet').value.trim(), prog = $('#fiProg'); if (sujet.length < 3) return signal('Écris le sujet de l’épisode.');
    $('#fiBrouillon').disabled = true; prog.textContent = 'Préparation…';
    try {
      const { id } = await (await api('/api/quentinvest/brouillon', { method: 'POST', body: JSON.stringify({ sujet }) })).json();
      const r = await suivreTravail(id, j => { prog.textContent = Math.round((j.progress || 0) * 100) + ' % · ' + (j.step || ''); });
      $('#fiTexte').value = JSON.stringify(r.fiche, null, 1); prog.innerHTML = `Brouillon écrit d’après « ${esc(r.article)} » et gardé dans <b>${esc(r.fichier)}</b>. Réécris ce qui est à compléter, puis contrôle.`;
      $('#fiGo').click();
    } catch (er) { prog.innerHTML = '<span style="color:#f87171">' + esc(er.message) + '</span>'; }
    finally { $('#fiBrouillon').disabled = false; }
  };
  $('#fiGo').onclick = async () => {
    const res = $('#fiRes'); res.textContent = 'Contrôle…';
    try {
      const r = await (await api('/api/quentinvest/controle', { method: 'POST', body: JSON.stringify({ fiche: $('#fiTexte').value }) })).json();
      const li = (c, t) => t.map(x => `<div style="margin:3px 0">${c} ${esc(x)}</div>`).join('');
      res.innerHTML = li('ℹ️', r.infos) + li('❌', r.erreurs) + li('⚠️', r.avertissements) + `<p><b>${r.ok ? '✅ Fiche fabricable.' : '❌ À corriger avant la fabrication.'}</b></p>`
        + (r.ok ? `<div class="encart" id="fiFab"><h4>🎬 Fabriquer l’épisode</h4><p class="mut" style="margin:0 0 6px">Vidéo YouTube, version TikTok, miniatures et texte de publication. Compte environ 15 à 20 minutes ; tu peux continuer à monter pendant ce temps. Rien n’est publié.</p>
          <div class="ligne"><label>Voix <select id="fiVoix"><option value="pico">Voix de synthèse de Pico</option></select></label><label><input type="checkbox" id="fiTiktok" checked> Version TikTok aussi</label><span class="sp"></span><button class="pri" id="fiFabriquer">🎬 Fabriquer</button></div><div id="fiVoixInfo" class="mut"></div><div id="fiFabRes" class="mut" style="margin-top:6px"></div></div>` : '');
      const fb = $('#fiFabriquer'); if (fb) { fb.onclick = () => fabriquerPico($('#fiTexte').value, { sansTiktok: !$('#fiTiktok').checked, voix: $('#fiVoix').value }); choixVoixPico(); }
    } catch (er) { res.innerHTML = '<span style="color:#f87171">' + esc(er.message) + '</span>'; }
  };
}
// voix proposées : ta voix clonée (si l'essai de voix clonée est installé), tes doublages enregistrés, la voix de synthèse de Pico
async function choixVoixPico() {
  const sel = $('#fiVoix'), info = $('#fiVoixInfo'); if (!sel) return;
  let e; try { e = await (await api('/api/pico')).json(); } catch (er) { return; }
  sel.innerHTML = `<option value="ma-voix">Ma voix clonée${e.maVoix.installee ? '' : ' (à installer, plusieurs Go)'}</option>${(e.doublages || []).map(n => `<option value="doublage:${esc(n)}">Mon doublage « ${esc(n)} »</option>`).join('')}<option value="pico">Voix de synthèse de Pico${e.voix && e.voix.installee ? '' : ' (≈ 350 Mo à télécharger)'}</option>`;
  sel.value = e.maVoix.installee ? 'ma-voix' : 'pico';
  const dire = () => { info.textContent = sel.value === 'ma-voix' ? 'Chaque réplique est dite par ta voix clonée (modèle de l’essai « Voix clonée » du Doublage), à partir de tes enregistrements. Plus lent que la synthèse : compte plusieurs minutes de plus.' : sel.value.startsWith('doublage:') ? 'Tes enregistrements du Doublage, réplique par réplique (texte à lire : fichier « …-lecture.txt » de l’épisode). Une réplique sans enregistrement garde la voix de synthèse.' : ''; };
  sel.onchange = dire; dire();
}
// Épisode Pico fabriqué dans QuentMovie (routes-pico.js) : avancement, arrêt possible, puis dossier, publication et avertissements du rythme
async function fabriquerPico(texte, options) {
  const z = $('#fiFabRes'), b = $('#fiFabriquer'); if (!z) return;
  let fiche; try { fiche = JSON.parse(texte); } catch (e) { z.innerHTML = '<span style="color:#f87171">La fiche n’est pas un texte JSON valide.</span>'; return; }
  b.disabled = true; z.innerHTML = 'Démarrage…';
  let id;
  try {
    const r = await api('/api/pico/fabriquer', { method: 'POST', body: JSON.stringify({ fiche, options }) }), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Fabrication impossible'); id = j.id;
    z.innerHTML = '<progress max="100" value="0" style="width:100%"></progress><div id="fiFabEtape"></div><button class="mini" id="fiFabStop" style="margin-top:6px">Arrêter</button>';
    $('#fiFabStop').onclick = () => { $('#fiFabStop').disabled = true; annulerJob(id); };
    const t0 = Date.now(), x = await suivreTravail(id, k => { const p = $('#fiFabRes progress'), e = $('#fiFabEtape'); if (p) p.value = Math.round((k.progress || 0) * 100); if (e) e.textContent = `${k.step || ''}${k.progress > 0.05 ? ` · environ ${Math.max(1, Math.round((Date.now() - t0) / 60000 * (1 - k.progress) / k.progress))} min restantes` : ''}`; });
    z.innerHTML = `<p>✅ <b>${esc(x.titre)}</b> est prêt à relire : ${x.fichiers.filter(n => /\.(mp4|png)$/.test(n)).length} fichiers (vidéos et miniatures) dans <b>${esc(x.dossier)}</b>.</p>
      ${(x.avertissements || []).length ? `<details><summary>${x.avertissements.length} remarque${x.avertissements.length > 1 ? 's' : ''} sur la fiche</summary>${x.avertissements.map(a => `<div style="margin:3px 0">⚠️ ${esc(a)}</div>`).join('')}</details>` : ''}
      <div class="ligne" style="margin-top:6px"><button id="fiFabDossier">📂 Ouvrir le dossier</button><button id="fiFabRelire">🔍 Relire et corriger</button><button class="pri" id="fiFabPublier">📤 Publier…</button></div>
      <p class="mut" style="margin:6px 0 0">Regarde les vidéos avant de publier. « Relire et corriger » change l’expression de Pico, une phrase ou la prononciation d’un mot, et ne refait que ces répliques.</p>`;
    $('#fiFabRelire').onclick = () => ouvrirRelecturePico(x.base);
    $('#fiFabDossier').onclick = () => api('/api/publier/ouvrir', { method: 'POST', body: JSON.stringify({ cible: 'dossier', episode: x.base }) });
    $('#fiFabPublier').onclick = () => ouvrirPublier();
    signal('Épisode prêt à relire : ' + x.titre);
  } catch (er) { z.innerHTML = `<span style="color:#f87171">${esc(er.message)}</span>`; }
  b.disabled = false;
}
// Relecture d'un épisode Pico fabriqué : expression de chaque réplique, phrase, prononciation d'un mot (dictionnaire) ; seules les répliques changées sont refaites
const NOMS_EXPR = { neutre: 'neutre', content: 'content', inquiet: 'inquiet', surpris: 'surpris', curieux: 'curieux', reflechi: 'réfléchi' };
async function ouvrirRelecturePico(base) {
  let E; try { const r = await api('/api/pico/episode?base=' + encodeURIComponent(base)), j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'Épisode introuvable'); E = j; } catch (er) { return alert(er.message); }
  const ch = new Map(), aRefaire = new Set(); let dico = false;
  const difficiles = new Set(E.difficiles.map(m => m.toLowerCase()));
  const motsDe = t => String(t).split(/(\s+)/).map(m => { const nu = m.replace(/^[«(“"']+|[»)”"'.,;:!?…]+$/g, ''); return /\S/.test(m) && nu ? `<span class="rlMot${difficiles.has(nu.toLowerCase()) ? ' dur' : ''}" data-mot="${esc(nu)}">${esc(m)}</span>` : esc(m); }).join('');
  const texteDe = s => (ch.get(s.i) || {}).texte ?? s.texte, exprDe = s => (ch.get(s.i) || {}).expr || s.expr;
  ouvrir(`<h2>🔍 Relire « ${esc(E.titre)} »</h2>
    <p class="mut">Pour chaque réplique : l’expression de Pico, la phrase (✏ pour la modifier) et la prononciation (clic sur un mot ; les mots <span class="rlMot dur">soulignés</span> sont à vérifier). Seules les voix et les écrans des répliques changées sont refaits ; le montage final est refait en entier (quelques minutes).</p>
    <div id="rlListe" class="rlListe"></div>
    <div id="rlPied" class="ligne" style="margin-top:10px"><span class="mut" id="rlEtat">Aucun changement.</span><span class="sp"></span><button id="rlFermer">Fermer</button><button class="pri" id="rlRefaire" disabled>Refaire</button></div>`, 'xl');
  const dessiner = () => {
    $('#rlListe').innerHTML = E.scenes.map(s => `<div class="rlLigne ${aRefaire.has(s.i) ? 'change' : ''}" data-i="${s.i}">
      ${s.section ? `<div class="rlSection">${esc(s.section)}</div>` : ''}
      <div class="rlCorps"><span class="rlNum">${s.i + 1}</span><select data-expr="${s.i}" title="Expression de Pico">${E.expressions.map(x => `<option value="${x}" ${x === exprDe(s) ? 'selected' : ''}>${NOMS_EXPR[x] || x}</option>`).join('')}</select>
      <div class="rlTexte" data-texte="${s.i}">${motsDe(texteDe(s))}</div><button class="mini" data-edit="${s.i}" title="Modifier la phrase">✏</button></div></div>`).join('');
    const n = aRefaire.size; $('#rlEtat').textContent = n ? `${n} réplique${n > 1 ? 's' : ''} à refaire${dico && E.tiktok ? ' · la version TikTok sera aussi refaite (prononciation)' : ''}.` : 'Aucun changement.';
    $('#rlRefaire').disabled = !n; $('#rlRefaire').textContent = n ? `Refaire ${n} réplique${n > 1 ? 's' : ''}` : 'Refaire';
  };
  const changer = (i, k, v) => { const c = ch.get(i) || {}; c[k] = v; ch.set(i, c); aRefaire.add(i); dessiner(); };
  $('#rlFermer').onclick = fermer;
  $('#rlListe').onchange = e => { const t = e.target; if (t.dataset.expr !== undefined) changer(+t.dataset.expr, 'expr', t.value); };
  $('#rlListe').onclick = async e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { const i = +ed.dataset.edit, s = E.scenes[i], z = $(`[data-texte="${i}"]`); z.innerHTML = `<textarea rows="3" style="width:100%">${esc(texteDe(s))}</textarea><div class="ligne"><button class="mini pri" data-ok="${i}">OK</button></div>`; z.querySelector('textarea').focus(); return; }
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
      ch.clear(); aRefaire.clear(); dico = false; Object.assign(E, await (await api('/api/pico/episode?base=' + encodeURIComponent(E.base))).json()); dessiner();
      $('#rlEtat').innerHTML = `✅ ${esc(r.versions.join(' et '))} mis à jour. <a href="#" id="rlDossier">Ouvrir le dossier</a> · <a href="#" id="rlPublier">Publier…</a>`;
      $('#rlDossier').onclick = ev => { ev.preventDefault(); api('/api/publier/ouvrir', { method: 'POST', body: JSON.stringify({ cible: 'dossier', episode: E.base }) }); };
      $('#rlPublier').onclick = ev => { ev.preventDefault(); ouvrirPublier(); };
    } catch (er) { $('#rlEtat').innerHTML = `<span style="color:#f87171">${esc(er.message)}</span>`; $('#rlRefaire').disabled = false; }
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
  dbl = { nom: nom0, lignes: [], prises: {}, cur: 0, enreg: false, auto: true, flux: null, vue: false };
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
      dbl.flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (er) { $('#dbGo').disabled = false; $('#dbMsg').innerHTML = `<span class="err">Micro indisponible : ${esc(er.message)}. Autorise QuentMovie dans Réglages Système → Confidentialité et sécurité → Micro.</span>`; return; }
    try {
      const avant = await (await api('/api/doublage?nom=' + enc(nom))).json(); // prises déjà enregistrées sous ce nom : on reprend
      for (const p of avant.prises) if (p.n < lignes.length) dbl.prises[p.n] = { duree: p.duree, file: p.file };
      dbl.dossier = avant.dossier; dbl.voix = avant.voix;
      await api('/api/doublage/script?nom=' + enc(nom), { method: 'PUT', body: JSON.stringify({ lignes }) });
    } catch (er) { /* le doublage fonctionne aussi sans la liste des anciennes prises */ }
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
    if (dbl.enreg) { const t = $('#dbTemps'); if (t) t.textContent = dblSec((Date.now() - dbl.t0) / 1000); }
    dbl.raf = requestAnimationFrame(boucle);
  };
  boucle();
}
function dblVue() {
  const L = dbl.lignes, n = dbl.cur, fait = Object.keys(dbl.prises).length;
  const liste = L.map((t, i) => { const p = dbl.prises[i]; return `<div class="dblL ${i === n ? 'cur' : ''}" data-n="${i}"><span class="n">${i + 1}</span><span class="t">${esc(t)}</span><span class="d">${p ? '✅ ' + dblSec(p.duree) : '⬜'}</span></div>`; }).join('');
  ouvrir(`<h2>🎙 Doublage : ${esc(dbl.nom)}</h2>
    <div class="mut">Réplique ${n + 1} sur ${L.length} · ${fait} enregistrée${fait > 1 ? 's' : ''}</div>
    <div class="dblTexte">${esc(L[n])}</div>
    <div class="ligne"><button class="pri ${dbl.enreg ? 'enreg' : ''}" id="dbRec" style="min-width:210px">${dbl.enreg ? '■ Arrêter (Espace)' : '● Enregistrer (Espace)'}</button>
      <button id="dbEcoute" ${dbl.prises[n] ? '' : 'disabled'}>▶ Réécouter (L)</button><button id="dbPrec" title="Réplique précédente (←)">←</button><button id="dbSuiv" title="Réplique suivante (→)">→</button>
      <div id="dbVu"><i></i></div><span id="dbTemps"></span></div>
    <div class="sw2"><input type="checkbox" id="dbAuto" ${dbl.auto ? 'checked' : ''}><label for="dbAuto">Passer à la réplique suivante dès que j’arrête</label></div>
    <div class="dblListe" id="dbListe">${liste}</div>
    <div class="ligne"><button class="pri" id="dbPoser" ${fait ? '' : 'disabled'}>Poser sur la timeline (piste audio)</button><button id="dbDossier">📂 Ouvrir le dossier</button><button id="dbTexteRetour">✏️ Modifier le texte</button><button id="dbClone" title="Essayer des modèles qui imitent ta voix">🧬 Voix clonée</button><button id="dbPron" title="Mots que la voix prononce mal">📖 Prononciations</button><button id="dbFiche" title="Vérifier une fiche d’épisode QuentInvest">🧾 Fiche</button><button id="dbFermer">Fermer</button></div>
    <p class="mut" id="dbInfo" style="margin:8px 0 0">Dossier des répliques : <b>${esc(dbl.dossier || '~/Movies/QuentMovie/doublages/' + dbl.nom)}</b> (fichiers v00.wav, v01.wav…). Pour fabriquer un épisode QuentInvest avec ta voix : <code>episode.js &lt;fiche&gt; --voix-perso &lt;ce dossier&gt;</code>.</p>
    ${dbl.voix && dbl.voix.prises ? `<p class="mut" style="margin:4px 0 0">🧬 <b>Ma voix</b> : ${dbl.voix.prises} répliques gardées avec leur texte (${dblDuree(dbl.voix.secondes)}), tous doublages confondus. Chaque réplique enrichit le corpus qui servira à reproduire ta voix. <a href="#" id="dbVoixDossier">Ouvrir le dossier</a></p>` : ''}`, 'xl');
  dbl.vue = true;
  $('#dbRec').onclick = dblBascule; $('#dbEcoute').onclick = dblEcouter; $('#dbPrec').onclick = () => dblAller(n - 1); $('#dbSuiv').onclick = () => dblAller(n + 1);
  $('#dbAuto').onchange = e => { dbl.auto = e.target.checked; };
  $('#dbListe').onclick = e => { const l = e.target.closest('.dblL'); if (l) dblAller(+l.dataset.n); };
  const c = document.querySelector('.dblL.cur'); if (c) c.scrollIntoView({ block: 'nearest' });
  $('#dbPoser').onclick = dblPoser;
  const vd = $('#dbVoixDossier'); if (vd) vd.onclick = async e => { e.preventDefault(); try { const j = await (await api('/api/doublage/dossier?nom=' + enc(dbl.nom) + '&voix=1', { method: 'POST' })).json(); if (!j.ok) signal('Dossier : ' + j.dossier); } catch (er) { alert(er.message); } };
  $('#dbDossier').onclick = async () => { try { const j = await (await api('/api/doublage/dossier?nom=' + enc(dbl.nom), { method: 'POST' })).json(); if (!j.ok) signal('Dossier : ' + j.dossier); } catch (er) { alert(er.message); } };
  $('#dbFiche').onclick = () => { if (dbl.enreg) return; ouvrirFiche(); };
  $('#dbPron').onclick = () => { if (dbl.enreg) return; ouvrirPrononciations(); };
  $('#dbClone').onclick = () => { if (dbl.enreg) return; ouvrirVoixClone(); };
  $('#dbTexteRetour').onclick = () => { if (dbl.enreg) return; const lignes = dbl.lignes.join('\n'), nom = dbl.nom; dblFin(); ouvrirDoublage(); $('#dbTexte').value = lignes; $('#dbNom').value = nom; };
  $('#dbFermer').onclick = fermer;
}
function dblAller(i) { if (!dbl || dbl.enreg) return; dbl.cur = clamp(i, 0, dbl.lignes.length - 1); if (dbl.ap) dbl.ap.pause(); dblVue(); }
function dblEcouter() {
  const p = dbl && dbl.prises[dbl.cur]; if (!p || dbl.enreg) return;
  if (dbl.ap) dbl.ap.pause(); dbl.ap = new Audio('/media/' + enc(p.file) + '?t=' + Date.now()); dbl.ap.play().catch(() => {});
}
function dblBascule() {
  if (!dbl || !dbl.flux) return;
  if (dbl.ap) dbl.ap.pause();
  if (dbl.enreg) { dbl.rec.stop(); return; }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '', morceaux = [], n = dbl.cur;
  const rec = new MediaRecorder(dbl.flux, mime ? { mimeType: mime } : undefined);
  rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
  rec.onstop = async () => {
    if (!dbl) return; dbl.enreg = false; const b = $('#dbRec'); if (b) { b.classList.remove('enreg'); b.textContent = 'Envoi…'; b.disabled = true; }
    try {
      const r = await (await api(`/api/doublage/prise?nom=${enc(dbl.nom)}&n=${n}&texte=${enc(dbl.lignes[n])}`, { method: 'POST', body: new Blob(morceaux, { type: 'audio/webm' }) })).json();
      dbl.prises[n] = { duree: r.duree, file: r.file }; dbl.voix = r.voix;
      if (dbl.auto && n < dbl.lignes.length - 1) dbl.cur = n + 1;
    } catch (er) { alert(er.message); }
    if (dbl) dblVue();
  };
  dbl.rec = rec; dbl.enreg = true; dbl.t0 = Date.now(); rec.start();
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
  cancelAnimationFrame(d.raf); if (d.ap) d.ap.pause();
  if (d.enreg && d.rec) { d.rec.onstop = null; try { d.rec.stop(); } catch (e) { /* déjà arrêté */ } }
  if (d.flux) d.flux.getTracks().forEach(t => t.stop()); if (d.ctx) d.ctx.close().catch(() => {});
}
// touches pendant le doublage ; renvoie vrai quand la touche est prise en charge
function toucheDoublage(e) {
  const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k, tag = (e.target.tagName || '').toLowerCase(), f = fn => { e.preventDefault(); fn(); return true; };
  if (e.metaKey || e.ctrlKey) return false;
  if (k === 'Escape') return f(() => { if (dbl.enreg && !confirm('Un enregistrement est en cours. Le perdre et fermer ?')) return; fermer(); });
  if (!dbl.vue || tag === 'textarea' || (tag === 'input' && e.target.type === 'text')) return true; // préparation du texte : les touches restent à la saisie
  if (k === ' ' || kl === 'r') return f(dblBascule);
  if (kl === 'l') return f(dblEcouter);
  if (k === 'ArrowRight' || k === 'ArrowDown' || (k === 'Enter' && tag !== 'button')) return f(() => dblAller(dbl.cur + 1));
  if (k === 'ArrowLeft' || k === 'ArrowUp') return f(() => dblAller(dbl.cur - 1));
  return true;
}
