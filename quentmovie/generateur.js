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

const UA = 'QuentMovie/1.6 (logiciel de montage personnel ; https://github.com/ikeupods-del/Quentools)';
const MOTS_PAR_SECONDE = 2.6; // débit moyen d'une voix française de macOS à vitesse normale

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

// Texte de la vidéo : introduction de l'article puis sections historiques, dans l'ordre, jusqu'à la durée voulue
function construireScript(extrait, dureeSec) {
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
  const budget = Math.max(25, dureeSec * MOTS_PAR_SECONDE), choisies = [];
  let mots = 0;
  for (const b of ordre) {
    for (const p of phrases(b.texte).map(nettoyerPhrase)) {
      const n = nbMots(p);
      if (n < 5 || n > 48) continue;
      if (mots + n > budget * 1.1) return grouper(choisies);
      choisies.push(p); mots += n;
    }
  }
  return grouper(choisies);
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

function creer({ run, FFMPEG, probe, MEDIAS, wiki = 'https://fr.wikipedia.org', commons = 'https://commons.wikimedia.org' }) {
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
    const scenes = construireScript(page.extract, d);
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
    return { titre: titre || page.title, article: page.title, source: page.fullurl || `${wiki}/wiki/${encodeURIComponent(page.title)}`,
      scenes: scenes.map((texte, i) => ({ texte, image: images.length ? i % images.length : -1 })), images };
  }

  // Voix françaises de macOS (« say -v ? ») ; ailleurs, aucune
  function voix() {
    return new Promise(ok => execFile('say', ['-v', '?'], (e, out) => {
      if (e) return ok([]);
      const l = String(out).split('\n').map(x => /^(.+?)\s+([a-z]{2}[_-][A-Z0-9]{2,})\s+#/.exec(x)).filter(Boolean).map(m => ({ nom: m[1].trim(), langue: m[2] }));
      ok(l.filter(v => /^fr/i.test(v.langue)));
    }));
  }
  // Une phrase lue → fichier audio (m4a) avec une petite respiration à la fin
  async function lire(texte, fichier, { voix: v, vitesse = 175 } = {}, dir) {
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
      for (let i = 0; i < scenes.length; i++) {
        job.step = `Voix off ${i + 1} sur ${scenes.length}`; job.progress = 40 + Math.round(i / scenes.length * 58);
        const f = `gen-${id}-voix-${String(i + 1).padStart(2, '0')}.m4a`;
        const r = await lire(scenes[i].texte, path.join(MEDIAS, f), { voix: v, vitesse }, dir); synthese = synthese && r.synthese;
        const info = await probe(path.join(MEDIAS, f));
        sortie.push({ texte: scenes[i].texte, voix: f, duree: +info.duration.toFixed(2), image: fichiersImages.get(scenes[i].image) || '' });
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const credits = [...new Set(scenes.map(s => s.image))].filter(i => fichiersImages.has(i)).map(i => images[i]).map(im => `${im.auteur} — ${im.licence}`);
    return { scenes: sortie, credits, synthese };
  }

  return { chercher, preparer, voix, fabriquer };
}

module.exports = { creer, sujetDe, phrases, nettoyerPhrase, construireScript, imageDe };
