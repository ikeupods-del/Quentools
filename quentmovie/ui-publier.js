// Interface de la publication : envoi d'un épisode sur YouTube (vidéo privée ou programmée) et dans les brouillons TikTok, comptes, aides à la publication manuelle.
// Script classique chargé avant le script principal (utilise api, $, esc, ouvrir, fermer, signal, suivreTravail à l'exécution).
// Envoi en cours (épisode, plateforme, travail) : gardé hors de la fenêtre, qui peut être fermée puis rouverte pendant l'envoi.
let envoiPublier = null;
async function ouvrirPublier() {
  if (typeof dbl !== 'undefined' && dbl) dblFin();
  let e; try { e = await (await api('/api/publier')).json(); } catch (er) { return alert(er.message); }
  const ep = e.episodes || [];
  const carte = (id, titre, c) => `<div class="encart" style="margin-top:10px"><h4>${titre} <span class="mut" style="font-weight:400">· ${c.connecte ? '✅ connecté' + (c.nom ? ' (' + esc(c.nom) + ')' : '') : c.configure ? '⚠️ à connecter' : '⚙️ à configurer'}</span></h4><div id="${id}"></div></div>`;
  ouvrir(`<h2>📤 Publier un épisode</h2>
    <p>Choisis un épisode fabriqué par la chaîne QuentInvest. <b>Rien n’est publié sans ton clic</b> : YouTube reçoit une vidéo <b>privée</b> (ou programmée), TikTok reçoit un <b>brouillon</b> dans ton application.</p>
    ${ep.length ? `<select id="puEp" style="width:100%">${ep.map((x, i) => `<option value="${esc(x.nom)}">${esc(x.titre)} — ${esc(x.nom)}</option>`).join('')}</select>` : `<p class="mut">Aucun épisode prêt dans <b>${esc(e.racine)}</b> (il faut le fichier « …-publication.json » et les vidéos produits par la chaîne).</p>`}
    ${carte('puYt', '▶️ YouTube', e.youtube)}${carte('puTt', '🎵 TikTok', e.tiktok)}
    <div id="puEtat" class="mut" style="margin:8px 0"></div>
    <div class="ligne"><button id="puDossier">📂 Ouvrir le dossier</button><button id="puFermer">Fermer</button></div>
    <p class="mut" style="margin:6px 0 0">Les clés restent sur ton Mac${e.chiffre ? ', chiffrées par le trousseau' : ' (fichier réservé à ton compte)'}. ${esc(e.dossier)}</p>`, 'xl');
  const cur = () => ep.find(x => x.nom === ($('#puEp') || {}).value) || ep[0];
  const copie = async (t, n) => { try { await navigator.clipboard.writeText(t || ''); signal(n + ' copié.'); } catch (er) { alert('Copie impossible : ' + er.message); } };
  const fen = $('#puEtat'), etat = t => { const z = $('#puEtat'); if (z) z.textContent = t; }; // fenêtre fermée : rien à afficher
  const ouvrirLien = (cible, ex) => api('/api/publier/ouvrir', { method: 'POST', body: JSON.stringify({ cible, episode: ex ? ex.nom : '' }) });
  $('#puFermer').onclick = fermer;
  $('#puDossier').onclick = () => { const x = cur(); if (x) ouvrirLien('dossier', x).then(r => r.json()).then(j => { if (!j.ok) signal('Dossier : ' + j.dossier); }); };

  const guide = (n, url, champs) => `<details style="margin:6px 0"><summary class="mut">Comment obtenir ces deux clés (une seule fois)</summary><ol style="margin:6px 0 0 18px;padding:0" class="mut">${champs}</ol></details>`;
  const formulaire = (n, nom, aide) => `${aide}<div class="ligne" style="flex-wrap:wrap"><input id="${n}Id" placeholder="Identifiant client" style="flex:1;min-width:180px"><input id="${n}Sec" type="password" placeholder="Clé secrète" style="flex:1;min-width:180px"><button id="${n}Cfg">Enregistrer</button></div>`;
  const aideYt = guide('yt', '', `<li>Ouvre <a href="#" id="ytGoogle">Google Cloud</a>, crée un projet, active « YouTube Data API v3 ».</li><li>« Écran de consentement OAuth » : type Externe, ajoute ton adresse Google comme utilisateur test.</li><li>« Identifiants » → Créer → ID client OAuth → type « Application de bureau ».</li><li>Copie l’identifiant et la clé secrète ici. Les vidéos envoyées restent <b>privées</b> : tu les publies d’un clic dans YouTube Studio (règle de Google pour les projets non audités).</li>`);
  const aideTt = guide('tt', '', `<li>Va sur TikTok for Developers, crée une application, ajoute « Content Posting API » (envoi en brouillon).</li><li>Ajoute l’adresse de retour <code>http://127.0.0.1</code> comme adresse de redirection, et ton compte comme utilisateur test.</li><li>Copie « Client key » et « Client secret » ici. La vidéo arrive en brouillon dans ton application TikTok : tu ajoutes la légende et tu publies.</li>`);

  function dessiner() {
    if (!fen.isConnected) return; // fenêtre fermée ou remplacée
    const x = cur();
    // YouTube
    const y = $('#puYt');
    if (!e.youtube.configure) y.innerHTML = formulaire('yt', 'YouTube', aideYt);
    else if (!e.youtube.connecte) y.innerHTML = `<div class="ligne"><button class="pri" id="ytCo">Se connecter à YouTube</button><button id="ytRaz">Changer les clés</button></div>`;
    else y.innerHTML = `<div class="ligne" style="flex-wrap:wrap;align-items:center"><label>Mise en ligne <select id="ytConf"><option value="private">Privée (je publie moi-même)</option><option value="unlisted">Non répertoriée</option><option value="prog">Programmée…</option></select></label><input id="ytDate" type="datetime-local" style="display:none"><label><input type="checkbox" id="ytSynth" ${x && x.synthese ? 'checked' : ''}> Contenu de synthèse (voix générée)</label></div>
      <div class="ligne"><button class="pri" id="ytEnv" ${x && x.video.youtube ? '' : 'disabled'}>Envoyer la vidéo sur YouTube</button><button id="ytRaz">Déconnecter</button></div>`;
    // TikTok
    const t = $('#puTt');
    if (!e.tiktok.configure) t.innerHTML = formulaire('tt', 'TikTok', aideTt);
    else if (!e.tiktok.connecte) t.innerHTML = `<div class="ligne"><button class="pri" id="ttCo">Se connecter à TikTok</button><button id="ttRaz">Changer les clés</button></div>`;
    else t.innerHTML = `<div class="ligne"><button class="pri" id="ttEnv" ${x && x.video.tiktok ? '' : 'disabled'}>Envoyer le brouillon dans TikTok</button><button id="ttRaz">Déconnecter</button></div>`;
    // aide manuelle, toujours disponible
    for (const [id, html] of [['puYt', `<div class="mut" style="margin-top:6px">À la main : <button class="mini" id="mYtTitre">Copier le titre</button> <button class="mini" id="mYtDesc">Copier la description</button> <button class="mini" id="mYtTags">Copier les mots-clés</button> <button class="mini" id="mYtCom">Copier le commentaire épinglé</button> <button class="mini" id="mYtStudio">Ouvrir YouTube Studio</button></div>`], ['puTt', `<div class="mut" style="margin-top:6px">À la main : <button class="mini" id="mTtLeg">Copier la légende</button> <button class="mini" id="mTtOuvrir">Ouvrir la page d’envoi TikTok</button></div>`]]) $('#' + id).insertAdjacentHTML('beforeend', html);
    const l = (id, f) => { const b = $('#' + id); if (b) b.onclick = f; };
    l('mYtTitre', () => copie(x && x.titre, 'Titre')); l('mYtDesc', () => copie(x && x.description, 'Description')); l('mYtTags', () => copie(x && x.tags.join(', '), 'Mots-clés')); l('mYtCom', () => copie(x && x.commentaire, 'Commentaire'));
    l('mYtStudio', () => ouvrirLien('studio')); l('mTtLeg', () => copie(x && x.legendeTikTok, 'Légende')); l('mTtOuvrir', () => ouvrirLien('tiktok'));
    const g = $('#ytGoogle'); if (g) g.onclick = ev => { ev.preventDefault(); ouvrirLien('reglages'); };
    for (const [n, p] of [['yt', 'youtube'], ['tt', 'tiktok']]) {
      l(n + 'Cfg', async () => { try { Object.assign(e[p], (await (await api('/api/publier/configurer', { method: 'POST', body: JSON.stringify({ plateforme: p, id: $('#' + n + 'Id').value, secret: $('#' + n + 'Sec').value }) })).json())[p]); dessiner(); } catch (er) { alert(er.message); } });
      l(n + 'Raz', async () => { try { if (e[p].connecte && !confirm('Déconnecter ce compte et effacer ses clés ?')) return; Object.assign(e, await (await api('/api/publier/deconnecter', { method: 'POST', body: JSON.stringify({ plateforme: p }) })).json()); dessiner(); } catch (er) { alert(er.message); } });
      l(n + 'Co', async () => {
        try { etat('Autorise l’accès dans la page qui vient de s’ouvrir dans ton navigateur…'); const { id } = await (await api('/api/publier/connecter', { method: 'POST', body: JSON.stringify({ plateforme: p }) })).json();
          Object.assign(e, await suivreTravail(id, j => etat(j.step || ''))); etat('Compte connecté.'); dessiner(); } catch (er) { etat(''); alert(er.message); }
      });
    }
    const conf = $('#ytConf'); if (conf) conf.onchange = () => { $('#ytDate').style.display = conf.value === 'prog' ? '' : 'none'; };
    const html = h => { const z = $('#puEtat'); if (z) z.innerHTML = h; return z; };
    const envoi = async (p, corps) => {
      const x = cur(); if (!x) return;
      if (envoiPublier) return signal('Un envoi est déjà en cours : attends sa fin.');
      const lib = p === 'youtube' ? 'sur YouTube (vidéo privée ou programmée)' : 'dans tes brouillons TikTok', nomP = p === 'youtube' ? 'YouTube' : 'TikTok';
      if (!confirm(`Envoyer « ${x.titre} » ${lib} ?`)) return;
      envoiPublier = { episode: x.nom, titre: x.titre, plateforme: nomP, id: null, etape: 'Envoi…' }; bloquerEnvois();
      try { etat('Envoi…'); const { id } = await (await api('/api/publier/envoyer', { method: 'POST', body: JSON.stringify({ plateforme: p, episode: x.nom, ...corps }) })).json(); envoiPublier.id = id;
        const r = await suivreTravail(id, j => { envoiPublier.etape = `${Math.round((j.progress || 0) * 100)} % · ${j.step || ''}`; etat(`${nomP} : ${envoiPublier.etape}`); });
        const z = html(p === 'youtube' ? `✅ Envoyée (${r.programmation ? 'programmée le ' + esc(new Date(r.programmation).toLocaleString('fr-FR')) : esc(r.confidentialite === 'private' ? 'privée' : 'non répertoriée')}). ${r.miniature === true ? 'Miniature posée. ' : r.miniature ? '⚠️ ' + esc(r.miniature) + ' ' : ''}<a href="#" id="puLien">Ouvrir dans YouTube Studio</a> pour vérifier et publier.` : '✅ ' + esc(r.message));
        const lien = z && z.querySelector('#puLien'); if (lien) lien.onclick = ev => { ev.preventDefault(); ouvrirLien('studio'); };
        signal(`${nomP} : « ${x.titre} » envoyé.`);
      } catch (er) { html('<span style="color:#f87171">' + esc(er.message) + '</span>'); signal(`${nomP} : ${er.message}`); }
      finally { envoiPublier = null; document.querySelectorAll('[data-bloque]').forEach(b => { b.disabled = false; delete b.dataset.bloque; }); }
    };
    l('ytEnv', () => { const c = $('#ytConf').value, d = $('#ytDate').value; if (c === 'prog' && !d) return alert('Choisis la date et l’heure de mise en ligne.');
      if (c === 'prog' && !(new Date(d).getTime() > Date.now() + 15 * 60000)) return alert('Choisis une date de mise en ligne au moins 15 minutes dans le futur.'); envoi('youtube', { confidentialite: c === 'prog' ? 'private' : c, programmation: c === 'prog' ? new Date(d).toISOString() : '', synthese: $('#ytSynth').checked }); });
    l('ttEnv', () => envoi('tiktok', {}));
    if (envoiPublier) { bloquerEnvois(); etat(`${envoiPublier.plateforme} : envoi de « ${envoiPublier.titre} » en cours · ${envoiPublier.etape}`); } // fenêtre rouverte pendant un envoi
  }
  dessiner();
  const sel = $('#puEp'); if (sel) sel.onchange = dessiner;
}
// boutons d'envoi désactivés tant qu'un envoi est en cours (réactivés à sa fin)
function bloquerEnvois() { for (const id of ['ytEnv', 'ttEnv']) { const b = $('#' + id); if (b && !b.disabled) { b.disabled = true; b.dataset.bloque = '1'; } } }
