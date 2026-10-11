// QuentMovie : générateur de vidéos documentaires à partir d'un sujet (« l'histoire de Michelin »).
// Texte : article Wikipédia en français (faits sourcés, rien d'inventé), découpé en scènes et modifiable avant création.
// Images : images libres de l'article (Wikimedia Commons), complétées par une recherche ; auteurs et licences repris au générique.
// Voix off : voix françaises intégrées à macOS (commande « say »), sans internet ni abonnement.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { requete } = require('./maj');

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
// Images choisies pour chaque scène : celle dont le nom partage le plus de mots (ou une année) avec le texte, sans répétition tant que possible
const motsCles = t => new Set(String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(m => m.length > 3 || /^\d{4}$/.test(m)));
function choisirImages(scenes, images) {
  if (!images.length) return scenes.map(() => -1);
  const cles = images.map(im => motsCles(im.nom.replace(/\.\w+$/, '')));
  const vues = new Map(), out = [];
  scenes.forEach((s, i) => {
    const m = motsCles(s.texte); let best = 0, score = -Infinity;
    images.forEach((im, k) => {
      let sc = 0; for (const x of cles[k]) if (m.has(x)) sc += /^\d{4}$/.test(x) ? 3 : 2;
      sc -= (vues.get(k) || 0) * 4; if (k === (i % images.length)) sc += 0.5; // à égalité : l'ordre de l'article
      if (sc > score) { score = sc; best = k; }
    });
    vues.set(best, (vues.get(best) || 0) + 1); out.push(best);
  });
  return out;
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
function imageDe(page) {
  const ii = page && page.imageinfo && page.imageinfo[0]; if (!ii) return null;
  const m = ii.extmetadata || {}, nom = page.title.replace(/^[^:]+:/, '');
  if (!/^image\/(jpeg|png|webp)$/.test(ii.mime || '') || ii.width < 640 || ii.height < 400 || IMAGE_REFUSEE.test(nom)) return null;
  const url = String(ii.thumburl || ii.url).replace('://thumb.wikimedia.org/', '://upload.wikimedia.org/'); // même fichier, adresse principale
  return { nom, url, largeur: ii.width, hauteur: ii.height, auteur: texteSimple(m.Artist && m.Artist.value).slice(0, 80) || 'auteur inconnu',
    licence: texteSimple(m.LicenseShortName && m.LicenseShortName.value) || 'licence libre', page: ii.descriptionurl || '' };
}

function creer({ run, FFMPEG, probe, MEDIAS, wiki = 'https://fr.wikipedia.org', commons = 'https://commons.wikimedia.org', parole = null }) {
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
      const j = await api(commons, { action: 'query', titles: titres.slice(i, i + 40).join('|'), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1920', iiextmetadatafilter: 'Artist|LicenseShortName' });
      const pages = (j.query && j.query.pages) || [];
      const rang = new Map(titres.map((t, k) => [t.replace(/_/g, ' '), k]));
      out.push(...pages.map(p => ({ p, k: rang.has(p.title) ? rang.get(p.title) : 1e6 })).sort((a, b) => a.k - b.k).map(x => imageDe(x.p)).filter(Boolean));
    }
    return out;
  }

  // Texte en scènes + images proposées ; rien n'est téléchargé à ce stade
  async function preparer({ article, duree, titre }) {
    const d = Math.min(600, Math.max(20, +duree || 60));
    const j = await api(wiki, { action: 'query', prop: 'extracts|images|info', explaintext: '1', exsectionformat: 'wiki', titles: article, imlimit: '80', inprop: 'url', redirects: '1' });
    const page = j.query && j.query.pages && j.query.pages[0];
    if (!page || page.missing || !page.extract) throw new Error('Article introuvable sur Wikipédia.');
    const scenes = construireScenes(page.extract, d);
    if (!scenes.length) throw new Error('Cet article est trop court pour faire une vidéo.');
    // images de l'article (dans l'ordre de l'article), puis recherche dans Wikimedia Commons si elles ne suffisent pas
    const fichiers = (page.images || []).map(x => 'File:' + x.title.replace(/^[^:]+:/, '')).filter(t => !IMAGE_REFUSEE.test(t));
    let images = fichiers.length ? await imagesCommons(fichiers) : [];
    if (images.length < Math.ceil(scenes.length * 0.7)) {
      const r = await api(commons, { action: 'query', generator: 'search', gsrsearch: `${page.title.replace(/\s*\(.*\)$/, '')} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '30',
        prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1920', iiextmetadatafilter: 'Artist|LicenseShortName' });
      const vus = new Set(images.map(x => x.nom));
      const autres = ((r.query && r.query.pages) || []).sort((a, b) => (a.index || 0) - (b.index || 0)).map(imageDe).filter(x => x && !vus.has(x.nom));
      images = images.concat(autres);
    }
    images = images.slice(0, 40);
    const choix = choisirImages(scenes, images);
    return { titre: titre || page.title, article: page.title, source: page.fullurl || `${wiki}/wiki/${encodeURIComponent(page.title)}`,
      scenes: scenes.map((x, i) => ({ texte: x.texte, section: x.section, image: choix[i] })), images };
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
        const im = images[utiles[k]], ext = /\.png($|\?)/i.test(im.url) ? '.png' : '.jpg', f = `gen-${id}-image-${String(k + 1).padStart(2, '0')}${ext}`;
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
        sortie.push({ texte: scenes[i].texte, section: scenes[i].section || '', voix: f, duree: +info.duration.toFixed(2), image: fichiersImages.get(scenes[i].image) || '' });
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const credits = [...new Set(scenes.map(s => s.image))].filter(i => fichiersImages.has(i)).map(i => images[i]).map(im => `${im.auteur} — ${im.licence}`);
    return { scenes: sortie, credits, synthese };
  }

  const lireMac = async (texte, fichier, v) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-essai-')); try { return await lire(texte, fichier, { voix: v }, dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); } };
  return { chercher, preparer, voix, fabriquer, lireMac };
}

module.exports = { creer, sujetDe, phrases, nettoyerPhrase, construireScript, construireScenes, choisirImages, imageDe };
