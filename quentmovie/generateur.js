// QuentMovie : générateur de vidéos documentaires à partir d'un sujet (« l'histoire de Michelin »).
// Texte : article Wikipédia en français (faits sourcés, rien d'inventé), découpé en scènes et modifiable avant création.
// Images : images libres de l'article (Wikimedia Commons), complétées par une recherche ; auteurs et licences repris au générique.
// Voix off : voix françaises intégrées à macOS (commande « say »), sans internet ni abonnement.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const MAJ = require('./maj');
// téléchargement vers un fichier : en cas d'échec, le fichier partiel est retiré
const requete = (url, o = {}, ...r) => MAJ.requete(url, o, ...r).catch(e => { if (o.dest) { try { require('fs').rmSync(o.dest, { force: true }); } catch (er) { /* rien à retirer */ } } throw e; });
const IM = require('./images');
const FILTRE_META = 'Artist|LicenseShortName|ImageDescription|ObjectName|Categories';

const UA = 'QuentMovie/1.7 (logiciel de montage personnel ; https://github.com/ikeupods-del/Quentools)';
const MOTS_PAR_SECONDE = 2.6; // débit moyen d'une voix française de macOS à vitesse normale
const VOIX_GADGET = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i;

// « génère moi une vidéo sur l'histoire de Michelin » → titre « L'histoire de Michelin », recherche « Michelin »
function sujetDe(phrase) {
  let t = String(phrase || '').trim().replace(/\s+/g, ' ').replace(/[?!.]+$/, '');
  t = t.replace(/^(peux[- ]tu |pourrais[- ]tu |stp |s'il te pla[iî]t )?/i, '')
    .replace(/^(g[ée]n[èeé]re|fais|fait|cr[ée]e|r[ée]alise|monte|pr[ée]pare)[- ]?(moi|nous)?\s*/i, '')
    .replace(/^(une |un )?(petite |courte |mini[- ])?(vid[ée]o|documentaire|reportage|film)\s*/i, '')
    .replace(/^(sur|à propos de|a propos de|concernant|qui raconte|qui parle de|de)\s+/i, '');
  const titre = t ? t[0].toUpperCase() + t.slice(1) : '';
  const recherche = t.replace(/^(l['’]\s*|la |le |les )?(histoire|vie|biographie|naissance|cr[ée]ation|origine|origines|[ée]volution|saga|secrets?)\s+(de la |du |des |de l['’]\s*|de |d['’]\s*)/i, '').trim() || t;
  return { titre, recherche };
}

// Découpage en phrases, en protégeant les abréviations courantes
function phrases(texte) {
  const prot = String(texte).replace(/\b(M|Mme|MM|St|Ste|av|apr|env|cf|etc|J\.-C|vol|n°|p|ch|art|dir|éd|coll|fig|ibid|op|cit)\./g, '$1§');
  return prot.split(/(?<=[.!?…])\s+(?=[«"A-ZÀ-ÖØ-Þ0-9])/u).map(x => x.replace(/§/g, '.').trim()).filter(Boolean);
}
// Phrase prête à être lue : sans parenthèses explicatives (prononciation, traductions), espaces normalisés
function nettoyerPhrase(p) {
  return p.replace(/\s*\((?![^()]*\b1[0-9]{3}\b)[^()]*\)/g, '') // garde « (1889) » mais retire « (en anglais : …) »
    .replace(/\[[^\]]*\]/g, '').replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
const nbMots = s => s.split(/\s+/).filter(Boolean).length;
const SECTIONS_HISTOIRE = /histoire|historique|biographie|chronologie|origine|cr[ée]ation|fondation|d[ée]buts|carri[èe]re|[ée]volution|d[ée]veloppement|parcours|jeunesse|formation|essor|expansion/i;
const SECTIONS_EXCLUES = /voir aussi|notes|r[ée]f[ée]rences|bibliographie|liens externes|articles connexes|annexes|galerie|filmographie|discographie|palmar[èe]s|sources|distinctions|hommages/i;

// Texte de la vidéo : courte introduction de l'article puis sections historiques, dans l'ordre, jusqu'à la durée voulue.
// Renvoie des scènes { texte, section } (section = titre de la partie de l'article, pour les titres de chapitre)
function construireScenes(extrait, dureeSec) {
  const blocs = []; let titre = 'intro', parent = 'intro', courant = [];
  for (const ligne of String(extrait).split('\n')) {
    const m = /^(=+)\s*(.+?)\s*\1\s*$/.exec(ligne.trim());
    if (m) { blocs.push({ titre, parent, texte: courant.join(' ') }); titre = m[2]; if (m[1].length <= 2) parent = m[2]; courant = []; } else if (ligne.trim()) courant.push(ligne.trim());
  }
  blocs.push({ titre, parent, texte: courant.join(' ') });
  // une sous-partie (« === Le Bibendum === ») suit la section qui la contient (« == Histoire == »)
  const utiles = blocs.filter(b => !SECTIONS_EXCLUES.test(b.titre) && !SECTIONS_EXCLUES.test(b.parent));
  const histoire = utiles.filter(b => b.titre !== 'intro' && (SECTIONS_HISTOIRE.test(b.titre) || SECTIONS_HISTOIRE.test(b.parent)));
  const ordre = [utiles[0], ...(histoire.length ? histoire : utiles.slice(1))].filter(Boolean);
  const budget = Math.max(25, dureeSec * MOTS_PAR_SECONDE), scenes = [];
  let mots = 0;
  for (const b of ordre) {
    // l'introduction présente le sujet en une ou deux phrases, puis on raconte l'histoire (si l'article en a une)
    let dansBloc = 0; const maxBloc = b === utiles[0] && histoire.length ? Math.max(18, budget * 0.22) : Infinity, choisies = [];
    let fini = false;
    for (const p of phrases(b.texte).map(nettoyerPhrase)) {
      const n = nbMots(p);
      if (n < 5 || n > 48) continue;
      if (dansBloc && dansBloc + n > maxBloc) break;
      if (mots + n > budget * 1.1) { fini = true; break; }
      dansBloc += n; choisies.push(p); mots += n;
    }
    const section = b.titre === 'intro' || SECTIONS_HISTOIRE.test(b.titre) && /^(histoire|historique)$/i.test(b.titre) ? '' : b.titre;
    scenes.push(...grouper(choisies).map(texte => ({ texte, section })));
    if (fini) break;
  }
  return scenes;
}
const construireScript = (extrait, dureeSec) => construireScenes(extrait, dureeSec).map(x => x.texte);
// Images choisies pour chaque scène (images déjà connues, ex. celles de l'article) : meilleure note de pertinence, sans répétition
function choisirImages(scenes, images, { seuil = 1, titre = '' } = {}) {
  if (!images.length) return scenes.map(() => -1);
  const ancre = IM.termes(titre), reqs = scenes.map(s => ({ mots: IM.termes((s.texte || '') + ' ' + (s.section || '')).slice(0, 14), ancre }));
  return IM.attribuer(reqs, images, { seuil }).choix;
}
// Scènes : une ou deux phrases (une image par scène)
function grouper(liste) {
  const scenes = []; let cur = [];
  for (const p of liste) {
    cur.push(p);
    const n = nbMots(cur.join(' '));
    if (n >= 16 || (n >= 10 && cur.length >= 2)) { scenes.push(cur.join(' ')); cur = []; }
  }
  if (cur.length) { if (scenes.length && nbMots(cur.join(' ')) < 8) scenes[scenes.length - 1] += ' ' + cur.join(' '); else scenes.push(cur.join(' ')); }
  return scenes;
}

// Images utilisables comme illustration (photos et gravures ; pas de logos, drapeaux, icônes ni cartes vectorielles)
const IMAGE_REFUSEE = /logo|ic[oô]ne?|icon|flag|drapeau|blason|coat[_ ]of[_ ]arms|signature|pictogram|symbol|wiki|commons|edit|question|disambig|portail|portal|star|[ée]toile|\.svg$/i;
function texteSimple(html) { return String(html || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, '’').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
// licences acceptées pour illustrer une vidéo publiée : domaine public, CC0, CC BY, CC BY-SA, licences des banques gratuites (jamais NC, ND ni « tous droits réservés »)
const LICENCE_LIBRE = l => { const t = String(l || '').toLowerCase(); return !/\bnc\b|non[- ]?commercial|\bnd\b|no ?deriv|fair use|copyright|tous droits|all rights|©/.test(t) && /public|cc0|pdm|cc[ -]?by|attribution|pexels|pixabay|unsplash|nasa|gfdl|free art|licence libre/.test(t); };
function imageDe(page) {
  const ii = page && page.imageinfo && page.imageinfo[0]; if (!ii) return null;
  const m = ii.extmetadata || {}, nom = page.title.replace(/^[^:]+:/, '');
  const description = texteSimple(m.ImageDescription && m.ImageDescription.value).slice(0, 240), cats = String(m.Categories && m.Categories.value || '').replace(/\|/g, ' ');
  const texte = IM.normalise(`${nom} ${description} ${texteSimple(m.ObjectName && m.ObjectName.value)} ${cats}`).slice(0, 900), qualite = /Quality images|Featured pictures|Valued images/i.test(cats);
  const video = /^video\/(webm|ogg)$/.test(ii.mime || '') || /^application\/ogg$/.test(ii.mime || '');
  if ((!video && !/^image\/(jpeg|png|webp)$/.test(ii.mime || '')) || ii.width < 800 || ii.height < 450 || IMAGE_REFUSEE.test(nom.replace(/\.(webm|ogv)$/i, ''))) return null;
  if (video && (!(ii.size < 8e7) || !(ii.duration > 2))) return null;
  const url = String(ii.thumburl || ii.url).replace('://thumb.wikimedia.org/', '://upload.wikimedia.org/'); // même fichier, adresse principale
  if (video) return { nom, url: ii.url, apercu: ii.thumburl || '', video: true, duree: ii.duration, largeur: ii.width, hauteur: ii.height, auteur: texteSimple(m.Artist && m.Artist.value).slice(0, 80) || 'auteur inconnu',
    licence: texteSimple(m.LicenseShortName && m.LicenseShortName.value) || 'licence libre', page: ii.descriptionurl || '', description, texte, qualite };
  return { nom, url, largeur: ii.width, hauteur: ii.height, auteur: texteSimple(m.Artist && m.Artist.value).slice(0, 80) || 'auteur inconnu',
    licence: texteSimple(m.LicenseShortName && m.LicenseShortName.value) || 'licence libre', page: ii.descriptionurl || '', description, texte, qualite };
}

function creer({ run, FFMPEG, probe, MEDIAS, wiki = 'https://fr.wikipedia.org', commons = 'https://commons.wikimedia.org', parole = null, banques = null }) {
  const api = async (base, params) => {
    const q = new URLSearchParams({ format: 'json', formatversion: '2', ...params }).toString();
    for (let essai = 0; ; essai++) {
      try { return await requete(`${base}/w/api.php?${q}`, { ua: UA, accept: 'application/json', quoi: 'de Wikipédia' }); }
      catch (e) { if (e.code === 429 && essai < 2) { await new Promise(r => setTimeout(r, 2000 * (essai + 1))); continue; } throw e; }
    }
  };

  async function chercher(phrase) {
    const s = sujetDe(phrase);
    if (!s.recherche) throw new Error('Écris un sujet, par exemple « L’histoire de Michelin ».');
    const j = await api(wiki, { action: 'query', list: 'search', srsearch: s.recherche, srlimit: '6', srprop: 'snippet' });
    const resultats = ((j.query && j.query.search) || []).map(r => ({ titre: r.title, extrait: texteSimple(r.snippet).slice(0, 160) }));
    if (!resultats.length) throw new Error(`Aucun article Wikipédia trouvé pour « ${s.recherche} ».`);
    return { ...s, resultats };
  }

  async function imagesCommons(titres) {
    const out = [];
    for (let i = 0; i < titres.length; i += 40) {
      const j = await api(commons, { action: 'query', titles: titres.slice(i, i + 40).join('|'), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1920', iiextmetadatafilter: FILTRE_META });
      const pages = (j.query && j.query.pages) || [];
      const rang = new Map(titres.map((t, k) => [t.replace(/_/g, ' '), k]));
      out.push(...pages.map(p => ({ p, k: rang.has(p.title) ? rang.get(p.title) : 1e6 })).sort((a, b) => a.k - b.k).map(x => imageDe(x.p)).filter(Boolean));
    }
    return out;
  }

  // Recherche dans Wikimedia Commons : photos (ou vidéos), avec description et catégories pour juger la pertinence
  async function rechercher(q, { video = false, limit = 20 } = {}) {
    const r = await api(commons, { action: 'query', generator: 'search', gsrsearch: `${q} filetype:${video ? 'video' : 'bitmap'}`, gsrnamespace: '6', gsrlimit: String(limit),
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: video ? '1280' : '1920', iiextmetadatafilter: FILTRE_META });
    return ((r.query && r.query.pages) || []).sort((a, b) => (a.index || 0) - (b.index || 0)).map(imageDe).filter(Boolean);
  }

  // Images de l'article (dans l'ordre de l'article, marquées « deArticle »), puis recherche dans Wikimedia Commons si elles ne suffisent pas
  async function constituerImages(page, sujet, nbScenes, videos) {
    const fichiers = (page.images || []).map(x => 'File:' + x.title.replace(/^[^:]+:/, '')).filter(t => !IMAGE_REFUSEE.test(t));
    const images = fichiers.length ? await imagesCommons(fichiers) : [];
    images.forEach(x => { x.deArticle = true; });
    const ajouter = liste => { const vus = new Set(images.map(x => x.nom)); for (const x of liste) if (x && !vus.has(x.nom)) { vus.add(x.nom); images.push(x); } };
    if (images.length < Math.ceil(nbScenes * 0.7)) ajouter(await rechercher(sujet).catch(() => []));
    if (videos) { // vidéos libres de Commons sur le sujet (qualité variable : à la demande seulement)
      const v = await rechercher(sujet, { video: true, limit: 12 }).catch(() => []);
      v.filter(x => x.video && x.hauteur >= 720).slice(0, 4).forEach((x, k) => images.splice(Math.min(images.length, 1 + k * 3), 0, x));
    }
    return images;
  }
  // Photos pour des scènes déjà écrites (mode express avec article) : celles de l'article d'abord, puis des recherches avec les mots de chaque scène
  async function imagesDeScenes({ article, scenes, vertical = false, videos = false }) {
    const j = await api(wiki, { action: 'query', prop: 'images|info', titles: article, imlimit: '80', redirects: '1' });
    const page = j.query && j.query.pages && j.query.pages[0]; if (!page || page.missing) throw new Error('Article introuvable sur Wikipédia.');
    const sujet = page.title.replace(/\s*\(.*\)$/, ''), images = await constituerImages(page, sujet, scenes.length, videos);
    const ancre = IM.termes(sujet), reqs = scenes.map(sc => ({ mots: IM.termes(`${sc.texte} ${sc.section || ''} ${sc.sujet || ''} ${sc.recherche || ''}`).slice(0, 14), ancre }));
    let sel = IM.attribuer(reqs, images, { vertical, obligatoire: true }), essais = 0;
    const vus = new Set(images.map(x => x.nom));
    for (let i = 0; i < scenes.length && essais < 8; i++) {
      if (sel.choix[i] >= 0) continue; essais++;
      const q = `${(scenes[i].sujet || IM.requeteDeScene(scenes[i].texte).join(' '))} ${sujet}`.trim();
      for (const x of await rechercherImages(q, { vertical, limit: 15 }).catch(() => [])) if (!vus.has(x.nom)) { vus.add(x.nom); images.push(x); }
      await new Promise(r => setTimeout(r, 150));
    }
    if (essais) sel = IM.attribuer(reqs, images, { vertical, obligatoire: true });
    return { images, choix: sel.choix, propositions: sel.listes };
  }
  // Texte en scènes + images proposées ; rien n'est téléchargé à ce stade
  async function preparer({ article, duree, titre, videos = false, vertical = false }) {
    const d = Math.min(600, Math.max(20, +duree || 60));
    const j = await api(wiki, { action: 'query', prop: 'extracts|images|info', explaintext: '1', exsectionformat: 'wiki', titles: article, imlimit: '80', inprop: 'url', redirects: '1' });
    const page = j.query && j.query.pages && j.query.pages[0];
    if (!page || page.missing || !page.extract) throw new Error('Article introuvable sur Wikipédia.');
    const scenes = construireScenes(page.extract, d);
    if (!scenes.length) throw new Error('Cet article est trop court pour faire une vidéo.');
    const sujet = page.title.replace(/\s*\(.*\)$/, '');
    let images = await constituerImages(page, sujet, scenes.length, videos);
    const ajouter = liste => { const vus = new Set(images.map(x => x.nom)); for (const x of liste) if (x && !vus.has(x.nom)) { vus.add(x.nom); images.push(x); } };
    // chaque scène reçoit la photo la plus pertinente ; les scènes restées sans bonne photo sont cherchées avec leurs propres mots
    const ancre = IM.termes(sujet), reqs = scenes.map(sc => ({ mots: IM.termes(sc.texte + ' ' + (sc.section || '')).slice(0, 14), ancre }));
    let sel = IM.attribuer(reqs, images, { vertical, obligatoire: true });
    let essais = 0;
    for (let i = 0; i < scenes.length && essais < 6; i++) {
      if (sel.choix[i] >= 0) continue;
      essais++;
      ajouter(await rechercherImages(`${IM.requeteDeScene(scenes[i].texte).join(' ')} ${sujet}`.trim(), { vertical, limit: 15 }).catch(() => []));
      await new Promise(r => setTimeout(r, 150));
    }
    if (essais) sel = IM.attribuer(reqs, images, { vertical, obligatoire: true });
    images = images.slice(0, 60);
    const choix = sel.choix.map(k => (k < images.length ? k : -1));
    return { titre: titre || page.title, article: page.title, source: page.fullurl || `${wiki}/wiki/${encodeURIComponent(page.title)}`,
      scenes: scenes.map((x, i) => ({ texte: x.texte, section: x.section, image: choix[i], propositions: sel.listes[i].filter(k => k < images.length) })), images };
  }

  // Voix françaises de macOS (« say -v ? ») ; ailleurs, aucune
  function voix() {
    return new Promise(ok => execFile('say', ['-v', '?'], (e, out) => {
      if (e) return ok([]);
      const l = String(out).split('\n').map(x => /^(.+?)\s+([a-z]{2}[_-][A-Z0-9]{2,})\s+#/.exec(x)).filter(Boolean).map(m => ({ nom: m[1].trim(), langue: m[2] }));
      // voix « gadget » d'Apple (Eddy, Flo, Grandma, Rocko…) écartées : robotiques et presque identiques
      ok(l.filter(v => /^fr/i.test(v.langue) && !VOIX_GADGET.test(v.nom)).map(v => ({ ...v, premium: /\((Premium|Enhanced|Améliorée|Amélioré)\)/i.test(v.nom) })));
    }));
  }
  // Une phrase lue → fichier audio (m4a) avec une petite respiration à la fin
  async function lire(texte, fichier, { voix: v, vitesse = 175 } = {}, dir) {
    texte = require('./voix-texte').pourLaVoix(texte); // « 9h » → « 9 heures », « 5 € » → « 5 euros »…
    if (String(v || '').startsWith('piper:')) { // voix naturelle intégrée (parole.js)
      if (!parole) throw new Error('Voix naturelles indisponibles');
      await parole.parler(texte, v.slice(6), fichier, { vitesse: vitesse / 175 });
      return { synthese: true };
    }
    if (String(v || '').startsWith('mac:')) v = v.slice(4);
    const txt = path.join(dir, 'texte-' + path.basename(fichier) + '.txt'), aiff = path.join(dir, path.basename(fichier) + '.aiff');
    fs.writeFileSync(txt, texte);
    let ok = false;
    if (process.platform === 'darwin') {
      try { await new Promise((res, rej) => execFile('say', [...(v ? ['-v', v] : []), '-r', String(Math.round(vitesse)), '-o', aiff, '-f', txt], e => (e ? rej(e) : res()))); ok = fs.existsSync(aiff); } catch (e) { ok = false; }
    }
    if (ok) await run(FFMPEG, ['-y', '-v', 'error', '-i', aiff, '-af', 'apad=pad_dur=0.6', '-c:a', 'aac', '-b:a', '160k', '-ar', 48000, fichier]);
    else { // sans voix de synthèse (hors Mac) : silence de la durée de lecture estimée, pour garder le montage
      const d = Math.max(2, nbMots(texte) / MOTS_PAR_SECONDE) + 0.6;
      await run(FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', d.toFixed(2), '-c:a', 'aac', fichier]);
    }
    for (const f of [txt, aiff]) try { fs.unlinkSync(f); } catch (e) { /* déjà retiré */ }
    return { synthese: ok };
  }

  // Téléchargement des images et lecture des scènes ; renvoie les fichiers créés (le montage est fait par la fenêtre)
  async function fabriquer(job, { titre, scenes, images, voix: v, vitesse }) {
    const slug = String(titre || 'video').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';
    const id = slug + '-' + Date.now().toString(36).slice(-4), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-gen-'));
    const fichiersImages = new Map(), sortie = [];
    let synthese = true;
    try {
      const utiles = [...new Set(scenes.map(s => s.image).filter(i => i >= 0 && images[i]))];
      for (let k = 0; k < utiles.length; k++) {
        job.step = `Images ${k + 1} sur ${utiles.length}`; job.progress = Math.round(k / utiles.length * 40);
        const im = images[utiles[k]]; if (banques && im.suivi) { try { await banques().signaler(im); } catch (e) { /* sans importance */ } }
        const ext = im.video ? (/\.ogv($|\?)/i.test(im.url) ? '.ogv' : '.webm') : /\.png($|\?)/i.test(im.url) ? '.png' : '.jpg', f = `gen-${id}-image-${String(k + 1).padStart(2, '0')}${ext}`;
        try { await requete(im.url, { dest: path.join(MEDIAS, f), ua: UA, accept: 'image/*', quoi: 'd’images' }); fichiersImages.set(utiles[k], f); }
        catch (e) { if (e.code === 429) { await new Promise(r => setTimeout(r, 2500)); try { await requete(im.url, { dest: path.join(MEDIAS, f), ua: UA, accept: 'image/*', quoi: 'd’images' }); fichiersImages.set(utiles[k], f); } catch (e2) { /* image ignorée */ } } }
        await new Promise(r => setTimeout(r, 150)); // reste poli avec le serveur d'images
      }
      if (String(v || '').startsWith('piper:') && parole) { // voix naturelle pas encore installée : téléchargée une fois
        const e = parole.etat().voix.find(x => 'piper:' + x.id === v);
        if (e && !e.installee) await parole.installer('voix:' + e.id, { set step(t) { job.step = t; }, get step() { return job.step; }, set progress(p) { job.progress = 40 + Math.round(p * 10); }, get progress() { return job.progress; } });
      }
      for (let i = 0; i < scenes.length; i++) {
        job.step = `Voix off ${i + 1} sur ${scenes.length}`; job.progress = 40 + Math.round(i / scenes.length * 58);
        const f = `gen-${id}-voix-${String(i + 1).padStart(2, '0')}.m4a`;
        const r = await lire(scenes[i].texte, path.join(MEDIAS, f), { voix: v, vitesse }, dir); synthese = synthese && r.synthese;
        const info = await probe(path.join(MEDIAS, f));
        sortie.push({ texte: scenes[i].texte, section: scenes[i].section || '', sujet: scenes[i].sujet || '', video: !!(images[scenes[i].image] || {}).video, voix: f, duree: +info.duration.toFixed(2), image: fichiersImages.get(scenes[i].image) || '' });
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const credits = [...new Set(scenes.map(s => s.image))].filter(i => fichiersImages.has(i)).map(i => images[i]).map(im => `${im.auteur} — ${im.licence}${im.source && im.source !== 'Wikimedia Commons' ? ' (' + im.source + ')' : ''}`);
    return { scenes: sortie, credits, synthese };
  }

  // Une photo par scène, cherchée dans Wikimedia Commons avec les mots de la scène (français et anglais) puis notée :
  // requetes[i] = { fr, en, texte } (ou un simple texte) ; ancre = sujet général de la vidéo. -1 = aucune photo assez bonne.
  async function mediasPour(requetes, { ancre = '', ancreRequete = ancre, vertical = false, videos = false } = {}) {
    const pool = [], vus = new Set(), reqs = [];
    const ajouter = liste => { for (const x of liste) if (x && !vus.has(x.nom)) { vus.add(x.nom); pool.push(x); } };
    const ancreT = IM.termes(ancre);
    for (const r0 of requetes) {
      const r = typeof r0 === 'string' ? { fr: '', en: r0, texte: '' } : (r0 || {});
      const mots = IM.termes([r.fr, r.en].join(' ') || r.texte).slice(0, 8), degage = IM.termes(r.texte).filter(m => m.length > 4).slice(0, 4);
      reqs.push({ mots: [...new Set([...mots, ...degage.slice(0, 2)])], ancre: ancreT });
      const requetesCommons = [[r.fr, ancreRequete].filter(Boolean).join(' '), r.en, r.fr, IM.requeteDeScene(r.texte).join(' ')].map(x => String(x || '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 5).join(' '))
        .filter((x, i, l) => x && l.indexOf(x) === i);
      let bons = 0;
      for (const q of requetesCommons) {
        if (bons >= 4) break;
        try {
          const avant = pool.length; ajouter(await rechercherImages(q, { vertical }));
          if (videos) ajouter((await rechercher(q, { video: true, limit: 8 })).filter(x => x.video && x.hauteur >= 720));
          bons += pool.slice(avant).filter(x => IM.noterImage(x, { ...reqs[reqs.length - 1], vertical }).note >= IM.SEUIL).length;
        } catch (e) { /* recherche suivante */ }
        await new Promise(r => setTimeout(r, 120)); // reste poli avec le serveur d'images
      }
    }
    const sel = IM.attribuer(reqs, pool, { vertical });
    return { images: pool, choix: sel.choix, propositions: sel.listes };
  }
  // Photos qui illustrent des passages (épisodes QuentInvest) : la mieux notée de chaque passage, jamais deux fois la même, téléchargée dans `dossier`
  // avec son crédit ; null quand aucune photo n'est assez pertinente (l'écran reste alors tel quel, plutôt qu'une photo hors sujet)
  async function illustrer(requetes, { ancre = '', dossier, vertical = false, job = {} } = {}) {
    const r = await mediasPour(requetes, { ancre, ancreRequete: '', vertical }), out = [];
    fs.mkdirSync(dossier, { recursive: true });
    for (let i = 0; i < requetes.length; i++) {
      const im = r.images[r.choix[i]]; if (!im || im.video || !LICENCE_LIBRE(im.licence)) { out.push(null); continue; }
      job.step = `Illustrations : photo ${i + 1} sur ${requetes.length}`;
      const f = path.join(dossier, `photo-${String(i + 1).padStart(2, '0')}-${require('crypto').createHash('md5').update(im.url).digest('hex').slice(0, 8)}${/\.png($|\?)/i.test(im.url) ? '.png' : '.jpg'}`);
      try {
        if (!fs.existsSync(f)) await requete(im.url, { dest: f, ua: UA, accept: 'image/*', quoi: 'd’images' });
        if (banques && im.suivi) banques().signaler(im).catch(() => {});
        out.push({ fichier: f, credit: `${im.auteur}, ${im.licence}${im.source ? ', ' + im.source : ''}`, nom: im.nom, page: im.page || '' });
      } catch (e) { out.push(null); } // photo injoignable : passage laissé sans photo
      await new Promise(x => setTimeout(x, 120));
    }
    return out;
  }
  // Photos proposées au propriétaire pour chaque passage (épisodes QuentInvest : il choisit, rien n'est posé sans son accord) :
  // jusqu'à n photos libres de droits par passage, la mieux notée d'abord, jamais de vidéo ni de licence NC/ND
  async function proposerIllustrations(requetes, { ancre = '', vertical = false, n = 4 } = {}) {
    const r = await mediasPour(requetes, { ancre, ancreRequete: '', vertical });
    return requetes.map((_, i) => [...new Set([r.choix[i], ...((r.propositions || [])[i] || [])])].filter(k => k != null && k >= 0).map(k => r.images[k])
      .filter(im => im && !im.video && LICENCE_LIBRE(im.licence)).slice(0, n)
      .map(im => ({ url: im.url, apercu: im.apercu || im.url, nom: im.nom, page: im.page || '', credit: `${im.auteur}, ${im.licence}${im.source ? ', ' + im.source : ''}` })));
  }
  // photo validée par le propriétaire : téléchargée une fois dans `dossier` (adresse https seulement)
  async function garderPhoto(ph, dossier, i = 0) {
    const u = String(ph && ph.url || ''); if (!/^https:\/\/[^\s]+$/i.test(u)) throw new Error('Adresse de photo invalide');
    fs.mkdirSync(dossier, { recursive: true });
    const f = path.join(dossier, `photo-${String(i + 1).padStart(2, '0')}-${require('crypto').createHash('md5').update(u).digest('hex').slice(0, 8)}${/\.png($|\?)/i.test(u) ? '.png' : '.jpg'}`);
    if (!fs.existsSync(f)) await requete(u, { dest: f, ua: UA, accept: 'image/*', quoi: 'd’images' });
    return { fichier: f, credit: String(ph.credit || '').slice(0, 200) };
  }
  // Toutes les banques activées (Commons + Openverse, NASA, Pexels, Pixabay, Unsplash) ; une banque en panne est ignorée
  async function rechercherImages(q, { vertical = false, limit = 20 } = {}) {
    const B = banques ? banques() : null;
    const [a, b] = await Promise.all([!B || B.commonsActif ? rechercher(q, { limit }).catch(() => []) : [], B ? B.chercher(q, { vertical, limit }).catch(() => []) : []]);
    return [...a, ...b];
  }
  // Photos proposées pour une recherche libre (bouton « autre photo » d'une scène) : les mieux notées d'abord, une par série
  async function proposer(q, { vertical = false, videos = false } = {}) {
    const mots = IM.termes(q); if (!mots.length) return [];
    const liste = await rechercherImages(q, { vertical, limit: 30 });
    if (videos) liste.push(...(await rechercher(q, { video: true, limit: 10 }).catch(() => [])).filter(x => x.video && x.hauteur >= 720));
    const vus = new Set();
    return liste.map(im => ({ im, ...IM.noterImage(im, { mots, vertical }) })).filter(x => x.note > -1).sort((a, b) => b.note - a.note)
      .filter(x => { const k = IM.serieDe(x.im.nom); if (vus.has(k)) return false; vus.add(k); return true; }).slice(0, 18).map(x => x.im);
  }
  // Paragraphes de l'article à la durée voulue ({ texte, section }), reformulés un par un par l'IA locale
  async function faits(article, duree) {
    const j = await api(wiki, { action: 'query', prop: 'extracts', explaintext: '1', exsectionformat: 'wiki', titles: article, redirects: '1' });
    const page = j.query && j.query.pages && j.query.pages[0];
    if (!page || !page.extract) throw new Error('Article introuvable sur Wikipédia.');
    return construireScenes(page.extract, Math.min(600, Math.max(20, duree)));
  }
  // Sujet libre : résumés des 3 articles Wikipédia les plus proches, donnés à l'IA comme faits vérifiés (elle n'invente plus, elle s'appuie dessus)
  async function contexte(phrase) {
    try {
      const s = sujetDe(phrase); if (!s.recherche) return { texte: '', articles: [] };
      const j = await api(wiki, { action: 'query', list: 'search', srsearch: s.recherche, srlimit: '3', srprop: '' });
      const titres = ((j.query && j.query.search) || []).map(r => r.title);
      if (!titres.length) return { texte: '', articles: [] };
      const e = await api(wiki, { action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', titles: titres.join('|'), redirects: '1' });
      const pages = ((e.query && e.query.pages) || []).filter(p => p.extract && p.extract.length > 80).sort((a, b) => titres.indexOf(a.title) - titres.indexOf(b.title));
      return { texte: pages.map(p => `${p.title} : ${p.extract.replace(/\s+/g, ' ').slice(0, 900)}`).join('\n'), articles: pages.map(p => p.title) };
    } catch (err) { return { texte: '', articles: [] }; }
  }
  const lireMac = async (texte, fichier, v) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-essai-')); try { return await lire(texte, fichier, { voix: v }, dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); } };
  return { chercher, contexte, preparer, voix, fabriquer, lireMac, faits, mediasPour, illustrer, imagesDeScenes, proposer, proposerIllustrations, garderPhoto };
}

module.exports = { creer, sujetDe, phrases, nettoyerPhrase, construireScript, construireScenes, choisirImages, imageDe };
