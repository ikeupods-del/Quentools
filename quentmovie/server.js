// QuentMovie : moteur de montage local (serveur HTTP + FFmpeg). Aucune dépendance.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const FX = require('./effects');
const EPI = require('./epissage');

const FORMATS = { vertical: [9, 16], horizontal: [16, 9], carre: [1, 1] };
// modes de mélange des calques (nom affiché → filtre blend)
const MODES = { ecran: 'screen', addition: 'addition', eclaircir: 'lighten', produit: 'multiply', incrustation: 'overlay', lumiere: 'softlight' };
const VERSION_APP = require('./package.json').version;
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.avif', '.jfif'];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.webm': 'video/webm',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac', '.gif': 'image/gif', '.mkv': 'video/x-matroska', '.json': 'application/json',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm'
};
const S = '/System/Library/Fonts/Supplemental/';
const FONT_CANDS = [
  ['arial', 'Arial Gras', [S + 'Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf']],
  ['impact', 'Impact', [S + 'Impact.ttf']], ['arialblack', 'Arial Black', [S + 'Arial Black.ttf']],
  ['helvetica', 'Helvetica Neue', ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc']],
  ['futura', 'Futura', [S + 'Futura.ttc']], ['trebuchet', 'Trebuchet Gras', [S + 'Trebuchet MS Bold.ttf']], ['verdana', 'Verdana Gras', [S + 'Verdana Bold.ttf']],
  ['georgia', 'Georgia Gras', [S + 'Georgia Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf']],
  ['didot', 'Didot (magazine)', [S + 'Didot.ttc']], ['copperplate', 'Copperplate (élégant)', [S + 'Copperplate.ttc']],
  ['courier', 'Courier (machine)', [S + 'Courier New Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf']],
  ['typewriter', 'American Typewriter', [S + 'AmericanTypewriter.ttc']],
  ['markerfelt', 'Marker Felt (feutre)', ['/System/Library/Fonts/MarkerFelt.ttc']], ['chalkduster', 'Chalkduster (craie)', [S + 'Chalkduster.ttf']],
  ['brush', 'Brush Script (manuscrit)', [S + 'Brush Script.ttf']], ['papyrus', 'Papyrus', [S + 'Papyrus.ttc']]
];
const FONTS_OK = [];
for (const [id, nom, paths] of FONT_CANDS) { const file = paths.find(p => fs.existsSync(p)); if (file && !FONTS_OK.some(x => x.file === file)) FONTS_OK.push({ id, nom, file }); }
const FONT = (FONTS_OK[0] || {}).file || '';
const fontFile = id => ((FONTS_OK.find(x => x.id === id) || FONTS_OK[0] || {}).file) || '';

// Styles de sous-titres des packs : police, capitales, taille relative, place, et calques de texte (couleur, bord, décalage)
const SUBDEF = {
  hormozi: { font: 'impact', up: 1, k: 1.25, y: 'h*0.60-text_h/2', layers: (s, k) => [{ col: ['white', '0xffd400', 'white', '0x19d38a'][k % 4], ex: `:borderw=${Math.round(s / 5)}:bordercolor=black:shadowx=${Math.round(s / 12)}:shadowy=${Math.round(s / 10)}:shadowcolor=black@0.6` }] },
  neon: { font: 'arialblack', up: 1, k: 1, y: 'h*0.64-text_h/2', layers: s => [{ col: '0x19d3ff@0.35', ex: `:borderw=${Math.round(s / 4)}:bordercolor=0x19d3ff@0.3` }, { col: 'white', ex: '' }] },
  boite: { font: 'arialblack', up: 1, k: 1, y: 'h*0.68-text_h/2', layers: s => [{ col: 'black', ex: `:box=1:boxcolor=white@0.96:boxborderw=${Math.round(s / 3)}` }] },
  rouge: { font: 'arialblack', up: 1, k: 1, y: 'h*0.74-text_h/2', layers: s => [{ col: 'white', ex: `:box=1:boxcolor=0xd4001a@0.97:boxborderw=${Math.round(s / 3)}` }] },
  pop: { font: 'markerfelt', up: 0, k: 1.1, y: 'h*0.64-text_h/2', layers: s => [{ col: '0xffe600', ex: `:borderw=${Math.round(s / 6)}:bordercolor=black` }] },
  gaming: { font: 'futura', up: 1, k: 1.05, y: 'h*0.64-text_h/2', layers: s => [{ col: '0xff2d95', dx: -Math.round(s / 14) }, { col: '0x19d3ff', dx: Math.round(s / 14) }, { col: 'white', ex: `:borderw=${Math.round(s / 14)}:bordercolor=black@0.5` }] },
  cinema: { font: 'didot', up: 0, k: 0.95, y: 'h*0.86-text_h', layers: s => [{ col: 'white', ex: `:shadowx=${Math.round(s / 16)}:shadowy=${Math.round(s / 16)}:shadowcolor=black@0.7` }] },
  minimal: { font: 'helvetica', up: 0, k: 0.9, y: 'h*0.88-text_h', layers: s => [{ col: 'white', ex: `:box=1:boxcolor=black@0.55:boxborderw=${Math.round(s / 3.5)}` }] }
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d) => (Number.isFinite(+v) ? +v : d);
const safeName = n => path.basename(String(n || 'media')).replace(/[^\w.\- ()]/g, '_').slice(-120) || 'media';
const hex = c => (/^#?[0-9a-f]{6}$/i.test(c || '') ? '0x' + String(c).replace('#', '') : '0x00ff00');
const even = n => Math.max(2, Math.round(n / 2) * 2);

function create(opts = {}) {
  const PORT = opts.port || 0;
  const BASE = opts.base || path.join(os.homedir(), 'Movies', 'QuentMovie');
  const MEDIAS = path.join(BASE, 'medias'), EXPORTS = path.join(BASE, 'exports'), TMP = path.join(BASE, '.tmp'), PROJETS = path.join(BASE, 'projets');
  [MEDIAS, EXPORTS, TMP, PROJETS].forEach(d => fs.mkdirSync(d, { recursive: true }));
  const APERCUS = path.join(TMP, 'apercus'), PROXIES = path.join(TMP, 'proxies'); fs.mkdirSync(APERCUS, { recursive: true }); fs.mkdirSync(PROXIES, { recursive: true });
  let FFMPEG = opts.ffmpeg || 'ffmpeg', FFPROBE = opts.ffprobe === null ? null : opts.ffprobe || 'ffprobe';
  let filters = new Set(), encoders = new Set(), hwaccels = new Set(), version = '';
  const ffmpegMajeur = () => { const m = /version (?:n)?(\d+)\./.exec(version); return m ? +m[1] : 99; }; // compilation de développement (« N-… ») : récente
  const LIB = (opts.lib || path.join(__dirname, 'bibliotheque')).replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
  const LIB_LISTES = ['sons', 'musiques', 'stickers', 'marque', 'luts', 'calques', 'cadres', 'fonds', 'fondvert'];
  const libIndex = () => { let j = {}; try { j = JSON.parse(fs.readFileSync(path.join(LIB, 'index.json'), 'utf8')); } catch (e) { /* bibliothèque absente */ } LIB_LISTES.forEach(k => { j[k] = j[k] || []; }); return j; };
  // Vignettes et ondes sonores de la timeline gardées sur le disque : un projet rouvert s'affiche sans relancer FFmpeg.
  // Clé = fichier (chemin, taille, date de modification) + réglages ; une même image demandée deux fois à la fois n'est calculée qu'une fois.
  const CACHE_TL = path.join(BASE, '.cache-timeline'), calculsTl = new Map(); let ecritsTl = 0;
  const elaguerTl = () => { // au-delà de 250 Mo, les plus anciennes partent
    try {
      const l = fs.readdirSync(CACHE_TL).map(n => { const st = fs.statSync(path.join(CACHE_TL, n)); return { n, t: st.atimeMs > st.mtimeMs ? st.atimeMs : st.mtimeMs, o: st.size }; }).sort((a, b) => b.t - a.t);
      let tot = 0; for (const x of l) { tot += x.o; if (tot > 250e6) fs.unlinkSync(path.join(CACHE_TL, x.n)); }
    } catch (e) { /* cache facultatif */ }
  };
  const enCache = async (fichier, reglages, fabriquer) => {
    let st; try { st = fs.statSync(fichier); } catch (e) { return fabriquer(); }
    const cle = require('crypto').createHash('sha1').update(JSON.stringify([fichier, st.size, Math.round(st.mtimeMs), reglages])).digest('hex'), f = path.join(CACHE_TL, cle);
    try { const b = fs.readFileSync(f); const t = new Date(); fs.utimes(f, t, t, () => {}); return b; } catch (e) { /* pas encore calculé */ }
    if (!calculsTl.has(cle)) calculsTl.set(cle, fabriquer().then(b => {
      try { fs.mkdirSync(CACHE_TL, { recursive: true }); fs.writeFileSync(f + '.part', b); fs.renameSync(f + '.part', f); if (++ecritsTl % 300 === 0) elaguerTl(); } catch (e) { /* disque plein : l'image est quand même affichée */ }
      return b;
    }).finally(() => calculsTl.delete(cle)));
    return calculsTl.get(cle);
  };
  // Packs ajoutés par l'utilisateur (LUT, sons, images, vidéos) : dossier « Mes packs »
  const PACKS = path.join(BASE, 'packs'); fs.mkdirSync(PACKS, { recursive: true });
  // « lib:sons/clavier.mp3 » = bibliothèque ; « pack:Dossier/fichier.wav » = Mes packs ; sinon fichier importé
  const mediaPath = n => {
    const s = String(n || '');
    const m = /^lib:(sons|musiques|stickers|luts|calques|cadres|fonds|fondvert)\/([\w.\-]+)$/.exec(s);
    if (m) return path.join(LIB, m[1], m[2]);
    if (s.startsWith('pack:')) {
      const f = path.resolve(PACKS, s.slice(5));
      if (!f.startsWith(PACKS + path.sep)) throw new Error('Chemin refusé');
      return f;
    }
    const f = path.join(MEDIAS, safeName(n));
    if (!fs.existsSync(f)) { // prise du studio convertie : le fichier d'origine est remplacé par « …-prise.mp4 »
      const e = path.extname(f), alt = [f.slice(0, -e.length || undefined) + '-prise.mp4', f.slice(0, -e.length || undefined) + '.mp4'].find(x => x !== f && fs.existsSync(x));
      if (alt) return alt;
    }
    return f;
  };
  // Cadres et décors existent en horizontal (-h) et vertical (-v) : on prend celui du format du projet
  // Animations plein écran sur fond vert (« Breaking news ») : version verticale « -v » pour les formats 9:16, 4:5 et carré
  const orient = (n, W, H) => {
    const s = String(n || '');
    if (/^lib:(cadres|fonds)\/[\w\-]+-[hv]\.(png|jpg)$/.test(s)) return s.replace(/-[hv]\.(png|jpg)$/, (x, e) => (W >= H ? '-h.' : '-v.') + e);
    const m = /^lib:fondvert\/([\w\-]+)\.mp4$/.exec(s);
    if (m && W / H < 1.25 && !/-v$/.test(m[1])) { const v = `lib:fondvert/${m[1]}-v.mp4`; try { if (fs.existsSync(mediaPath(v))) return v; } catch (e) { /* pas de version verticale */ } }
    return n;
  };
  // Chemin utilisable dans un filtre FFmpeg (sinon copie sous un nom simple)
  const cheminFiltre = f => {
    if (/^[\w\-./ ]+$/.test(f)) return f;
    const dest = path.join(TMP, 'lut-' + require('crypto').createHash('md5').update(f).digest('hex') + path.extname(f));
    if (!fs.existsSync(dest)) fs.copyFileSync(f, dest);
    return dest;
  };
  const PACK_TYPES = { '.cube': 'luts', '.mp3': 'sons', '.wav': 'sons', '.m4a': 'sons', '.aif': 'sons', '.aiff': 'sons', '.flac': 'sons', '.ogg': 'sons', '.caf': 'sons',
    '.png': 'images', '.webp': 'images', '.jpg': 'images', '.jpeg': 'images', '.mp4': 'videos', '.mov': 'videos', '.m4v': 'videos', '.webm': 'videos' };
  const packCache = new Map();
  let gen = null;
  // téléchargement des vignettes : 4 à la fois, nouvel essai si Wikimedia répond « trop de demandes »
  const vigAttente = []; let vigActifs = 0;
  const vignetteFile = (u, f) => new Promise((ok, ko) => { vigAttente.push({ u, f, ok, ko }); vigPompe(); });
  function vigPompe() {
    while (vigActifs < 4 && vigAttente.length) {
      const t = vigAttente.shift(); vigActifs++;
      (async () => {
        for (let essai = 0; ; essai++) {
          try { await require('./maj').requete(t.u, { dest: t.f + '.part', ua: 'QuentMovie/1.7 (logiciel de montage personnel; https://github.com/ikeupods-del/Quentools)', accept: 'image/*', quoi: 'd’images' }); fs.renameSync(t.f + '.part', t.f); return; }
          catch (e) { if (e.code === 429 && essai < 3) { await new Promise(r => setTimeout(r, 1500 * (essai + 1))); continue; } throw e; }
        }
      })().then(t.ok, t.ko).finally(() => { vigActifs--; vigPompe(); });
    }
  }
  let parole = null, ia = opts.ia || null; // opts.ia : IA de remplacement pour les essais
  const MEM = require('./memoire'), MEMOIRE = MEM.creerStockage({ fichier: path.join(BASE, 'memoire-ia.json') }); // consignes et corrections retenues, partagées avec Studio Posts et Studio Sites
  const IA = () => ia || (ia = require('./ia').creer({ BASE, FFMPEG, memoire: () => MEM.pourPrompt(MEMOIRE.lire(), 600) }));
  // Analyse d'une vidéo à partir de son texte : calcul du programme (genre, mots-clés, rythme) puis, si l'IA locale est installée, sujet et idées fortes
  // Analyse de l'image et du son de chaque média (gardée en cache) : changements de plan, luminosité, niveau sonore, blancs
  async function analyseFichier(f) {
    let st; try { st = fs.statSync(f); } catch (e) { return null; }
    const cle = require('crypto').createHash('sha1').update(`a2|${f}|${st.size}|${st.mtimeMs}`).digest('hex'), cache = path.join(BASE, '.analyses', cle + '.json');
    try { return JSON.parse(fs.readFileSync(cache, 'utf8')); } catch (e) { /* à calculer */ }
    let m; try { m = await probe(f); } catch (e) { return null; }
    const video = m.kind === 'video', audio = m.kind === 'audio' || (video && m.hasAudio !== false), g = [], maps = [];
    if (video) { g.push(`[0:v]fps=5,scale=160:-2,signalstats${filters.has('scdet') ? ',scdet=threshold=12' : ''},metadata=print[v]`); maps.push('-map', '[v]'); }
    if (audio) { g.push('[0:a]ebur128=framelog=quiet,silencedetect=n=-35dB:d=0.7[a]'); maps.push('-map', '[a]'); }
    if (!g.length) return null;
    let e = '';
    try { e = await run(FFMPEG, ['-hide_banner', '-nostats', '-i', f, '-filter_complex', g.join(';'), ...maps, '-f', 'null', '-'], { wantErr: true }); } catch (err) { return null; }
    const tous = (re, conv = Number) => [...e.matchAll(re)].map(x => conv(x[1]));
    const y = tous(/lavfi\.signalstats\.YAVG=([\d.]+)/g), deb = tous(/silence_start: (-?[\d.]+)/g), fin = tous(/silence_end: ([\d.]+)/g);
    const I = tous(/\bI:\s+(-?[\d.]+) LUFS/g), LRA = tous(/\bLRA:\s+([\d.]+) LU/g);
    const r = {
      duree: m.duration || 0, scenes: tous(/lavfi\.scd\.time=([\d.]+)/g),
      luminosite: y.length ? Math.round(y.reduce((a, b) => a + b, 0) / y.length) : null,
      lufs: I.length ? I[I.length - 1] : null, lra: LRA.length ? LRA[LRA.length - 1] : null,
      silences: deb.map((d, i) => [Math.max(0, d), fin[i] !== undefined ? fin[i] : (m.duration || d)])
    };
    try { fs.mkdirSync(path.dirname(cache), { recursive: true }); fs.writeFileSync(cache, JSON.stringify(r)); } catch (err) { /* sans cache */ }
    return r;
  }
  // Analyse technique de la timeline : mesures ramenées au temps du montage, et conseils avec l'action qui corrige
  async function analyseTechnique(job, clips) {
    const l = (Array.isArray(clips) ? clips : []).filter(c => c && c.file && !/^(lib|pack):/.test(c.file)).slice(0, 40);
    if (!l.length) return null;
    job.step = 'Analyse de l’image et du son…';
    let t = 0; const scenes = [], lums = [], niveaux = []; let blanc = 0, total = 0;
    for (const c of l) {
      const a = await analyseFichier(mediaPath(c.file)); const sp = clamp(num(c.speed, 1), 0.25, 4), de = num(c.in, 0), a0 = num(c.out, de);
      const deb = Number.isFinite(+c.start) ? +c.start : t, dur = Math.max(0, (a0 - de) / sp);
      t = deb + dur; total += dur;
      if (!a) continue;
      a.scenes.filter(x => x > de + 0.3 && x < a0 - 0.3).forEach(x => scenes.push(+(deb + (x - de) / sp).toFixed(2)));
      if (a.luminosite != null) lums.push([a.luminosite, dur]);
      if (a.lufs != null && a.lufs > -70) niveaux.push([a.lufs, dur]);
      a.silences.forEach(([x, y]) => { const u = Math.max(x, de), v = Math.min(y, a0); if (v > u) blanc += (v - u) / sp; });
    }
    const moy = l2 => { const d = l2.reduce((s, x) => s + x[1], 0); return d ? l2.reduce((s, x) => s + x[0] * x[1], 0) / d : null; };
    const lum = moy(lums), lufs = moy(niveaux), parMin = total > 5 ? +(scenes.length / (total / 60)).toFixed(1) : 0, pBlanc = total ? Math.round(100 * blanc / total) : 0;
    const conseils = [];
    if (lufs != null && lufs < -20) conseils.push({ action: 'normaliser', texte: `Son plutôt faible (${Math.round(lufs)} LUFS) : régler le niveau comme les plateformes (-14 LUFS).` });
    if (lufs != null && lufs > -9) conseils.push({ action: 'normaliser', texte: `Son très fort (${Math.round(lufs)} LUFS) : risque de saturation, régler le niveau.` });
    if (pBlanc >= 15) conseils.push({ action: 'couper_blancs', texte: `${pBlanc} % de la vidéo sans voix ni son : couper les blancs rendra la vidéo plus vivante.` });
    if (lum != null && lum < 70) conseils.push({ action: 'ameliorer', texte: 'Image plutôt sombre : améliorer l’image (luminosité, contraste).' });
    if (lum != null && lum > 200) conseils.push({ action: 'ameliorer', texte: 'Image très claire : améliorer l’image pour retrouver du détail.' });
    if (total > 45 && parMin < 3) conseils.push({ action: 'dynamiser', texte: `Peu de changements de plan (${parMin} par minute) : des zooms alternés relanceront l’attention.` });
    return { scenes: scenes.sort((a, b) => a - b), parMinute: parMin, luminosite: lum == null ? null : Math.round(lum), lufs: lufs == null ? null : +lufs.toFixed(1), blancs: pBlanc, conseils };
  }
  // résultats gardés (mémoire et disque) : le chapitrage, le clipping et le montage selon le sujet relisent la même analyse sans refaire travailler l'IA
  const analysesFaites = new Map();
  async function analyserLaVideo(job, segments, duree, avecIA) {
    const CH = require('./chapitrage'), brut = CH.analyserSujet(segments, duree);
    if (!brut) return { sujet: '', genre: null, motsCles: [], rythme: 'normal', points: [], moments: [], resume: '', ia: false, brut: null };
    const cle = require('crypto').createHash('sha1').update(JSON.stringify(['a3', Math.round(+duree || 0), !!avecIA, segments.map(x => [Math.round(+x.s || 0), String(x.t || '')])])).digest('hex');
    const fichier = path.join(BASE, '.analyses', 'sujet-' + cle + '.json');
    let r = analysesFaites.get(cle);
    if (!r) { try { r = JSON.parse(fs.readFileSync(fichier, 'utf8')); } catch (e) { /* à calculer */ } }
    if (!r) {
      job.step = avecIA ? 'L’IA locale lit toute la vidéo…' : 'Analyse du sujet de la vidéo…'; job.progress = 0.15;
      r = avecIA ? await IA().analyserVideo({ segments, base: brut, duree }) : { sujet: brut.sujet, points: [], moments: [], motsCles: [], resume: '', public: '', genre: '', ia: false };
      if (r.ia || !avecIA) { analysesFaites.set(cle, r); try { fs.mkdirSync(path.dirname(fichier), { recursive: true }); fs.writeFileSync(fichier, JSON.stringify(r)); } catch (e) { /* sans cache */ } }
    }
    // genre : celui du programme quand il est sûr ; sinon celui que l'IA a choisi dans la liste (sujet mal couvert par les mots du programme)
    let genre = brut.genre; const gIA = CH.GENRES.find(g => g.id === r.genre);
    if (gIA && (brut.genre.id === 'general' || brut.genre.confiance < 0.5 || (brut.genreProche && brut.genreProche.id === gIA.id))) genre = { id: gIA.id, nom: gIA.nom, pack: gIA.pack, confiance: brut.genre.id === gIA.id ? brut.genre.confiance : 0.5, ia: true };
    const motsCles = [...new Set([...(r.motsCles || []), ...brut.motsCles])].slice(0, 6);
    return { sujet: r.sujet || brut.sujet, resume: r.resume, points: r.points || [], moments: r.moments || [], public: r.public, ia: r.ia, genre, motsCles, rythme: brut.rythme, debit: brut.debit, brut };
  }
  const PAROLE = () => parole || (parole = require('./parole').creer({ run, FFMPEG, BASE }));
  require('./voix-texte').definirFichierPerso(path.join(BASE, 'prononciations.json')); // dictionnaire de prononciation de l'utilisateur
  let voixClone = null; const VOIXCLONE = () => voixClone || (voixClone = require('./voix-clone').creer(BASE));
  const RV = require('./routes-voix');
  let publication = null; const PUB = () => publication || (publication = require('./publication').creer({ base: BASE, coffre: opts.coffre || null, ouvrirUrl: opts.ouvrirUrl || null, points: opts.publicationPoints || {} }));
  const RP = require('./routes-publier');
  const RPI = require('./routes-pico');
  // Réglages locaux (clés gratuites des banques de photos : gardées dans le dossier QuentMovie de l'utilisateur, jamais dans le dépôt)
  const REGL = path.join(BASE, 'reglages.json');
  const lireRegl = () => { try { return JSON.parse(fs.readFileSync(REGL, 'utf8')); } catch (e) { return {}; } };
  const ecrireRegl = r => { fs.mkdirSync(BASE, { recursive: true }); fs.writeFileSync(REGL, JSON.stringify(r, null, 2), { mode: 0o600 }); };
  const BANQ = () => {
    const B = require('./banques'), r = lireRegl(), cles = r.cles || {}, actif = id => (r.actives && r.actives[id] !== undefined ? r.actives[id] : B.BANQUES.find(x => x.id === id).defaut);
    const b = B.creer({ bases: opts.banques, cles });
    return { chercher: (q, o) => b.chercher(q, { ...o, actives: B.BANQUES.map(x => x.id).filter(id => id !== 'commons' && actif(id)) }), signaler: b.signaler, commonsActif: actif('commons') };
  };
  const GEN = () => gen || (gen = require('./generateur').creer({ run, FFMPEG, probe, MEDIAS, wiki: opts.wiki, commons: opts.commons, parole: PAROLE(), banques: BANQ }));
  async function scanPacks() {
    const files = [];
    const walk = (dir, depth) => {
      let l = []; try { l = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const e of l) {
        if (e.name.startsWith('.') || files.length > 3000) continue;
        const f = path.join(dir, e.name);
        if (e.isDirectory()) { if (depth < 5) walk(f, depth + 1); } else if (PACK_TYPES[path.extname(e.name).toLowerCase()]) files.push(f);
      }
    };
    walk(PACKS, 0);
    const out = { luts: [], sons: [], images: [], videos: [] };
    const todo = files.map(f => async () => {
      const rel = path.relative(PACKS, f).split(path.sep).join('/'), type = PACK_TYPES[path.extname(f).toLowerCase()];
      const it = { file: 'pack:' + rel, nom: path.basename(f, path.extname(f)).replace(/[_-]+/g, ' '), cat: rel.includes('/') ? rel.split('/')[0] : 'Mes packs' };
      if (type === 'sons' || type === 'videos') {
        const st = fs.statSync(f), k = f + ':' + st.size + ':' + st.mtimeMs;
        if (!packCache.has(k)) { try { const i = await probe(f); packCache.set(k, { duree: +i.duration.toFixed(2), son: i.hasAudio }); } catch (e) { packCache.set(k, null); } }
        const i = packCache.get(k); if (!i) return; it.duree = i.duree; it.son = i.son;
      }
      out[type].push(it);
    });
    for (let i = 0; i < todo.length; i += 8) await Promise.all(todo.slice(i, i + 8).map(f => f()));
    for (const k of Object.keys(out)) out[k].sort((a, b) => a.file.localeCompare(b.file, 'fr'));
    return out;
  }

  // ---------- FFmpeg ----------
  // silence : délai (ms) sans aucune sortie de FFmpeg au-delà duquel il est arrêté (encodeur figé)
  function run(cmd, args, { cwd, onOut, binary, wantErr, silence } = {}) {
    const t0 = Date.now(); // QM_CHRONO=1 : durée de chaque appel à FFmpeg (recherche de lenteurs)
    if (process.env.QM_CHRONO) return runBrut(cmd, args, { cwd, onOut, binary, wantErr, silence }).finally(() => console.log(`[chrono] ${((Date.now() - t0) / 1000).toFixed(2)} s · ${args.filter(x => typeof x === 'string' && !x.startsWith('-')).slice(-1)[0]} · ${String(args.join(' ')).slice(0, process.env.QM_CHRONO === 'long' ? 4000 : 160)}`));
    return runBrut(cmd, args, { cwd, onOut, binary, wantErr, silence });
  }
  // aperçus calculés en arrière-plan : FFmpeg en priorité basse (sur Mac, il part sur les cœurs économes : moins de batterie)
  const dossiersBasse = new Set();
  // erreur de FFmpeg → explication en français (le détail technique reste à la fin, utile pour un dépannage)
  function messageClair(m) {
    const brut = String(m || 'Erreur inconnue'), detail = brut.split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 300);
    const cas = [
      [/No space left on device|ENOSPC/i, 'Le disque du Mac est plein. Libère de la place (vide la corbeille, supprime d’anciens exports dans Movies/QuentMovie/exports), puis relance l’export.'],
      [/Encodage figé/i, 'L’encodage s’est bloqué. Relance l’export ; si cela recommence, choisis « Processeur » dans Encodage.'],
      [/moov atom not found|Invalid data found when processing input|End of file/i, 'Un fichier du montage est abîmé ou incomplet (copie interrompue ?). Réimporte-le ou retire le clip concerné.'],
      [/Cannot allocate memory|out of memory/i, 'Le Mac manque de mémoire. Ferme les autres applications puis relance l’export.']
    ];
    for (const [re, txt] of cas) if (re.test(brut)) return `${txt} (détail : ${detail})`;
    return brut.length > 400 ? detail : brut;
  }
  // export annulé : tous les FFmpeg qui travaillent dans son dossier sont arrêtés, et ceux qui démarreraient encore aussi
  const dossiersAnnules = new Set(), enCours = new Map();
  function annulerDossier(dir) {
    if (!dir) return; dossiersAnnules.add(dir);
    for (const p of enCours.get(dir) || []) { try { p.kill('SIGKILL'); } catch (e) { /* déjà fini */ } }
  }
  function runBrut(cmd, args, { cwd, onOut, binary, wantErr, silence } = {}) {
    return new Promise((resolve, reject) => {
      if (cwd && dossiersAnnules.has(cwd)) return reject(new Error('Export annulé.'));
      const p = spawn(cmd, args, { cwd });
      if (cwd) { if (!enCours.has(cwd)) enCours.set(cwd, new Set()); enCours.get(cwd).add(p); p.on('close', () => { const l = enCours.get(cwd); if (l) { l.delete(p); if (!l.size) enCours.delete(cwd); } }); }
      if (cwd && dossiersBasse.has(cwd) && p.pid) { try { os.setPriority(p.pid, 15); } catch (e) { /* priorité inchangée */ } }
      const out = []; let err = '', fige = false, garde = null;
      // avec -progress, seule une avance réelle de la vidéo (out_time) compte ; sinon toute sortie
      let avance = -1, suiviProgres = false;
      const veille = () => { if (!silence) return; clearTimeout(garde); garde = setTimeout(() => { fige = true; p.kill('SIGKILL'); }, silence); };
      veille();
      p.stdout.on('data', d => {
        const txt = d.toString(), m = txt.match(/out_time_us=(\d+)/g);
        if (m) { suiviProgres = true; const v = +m[m.length - 1].split('=')[1]; if (v > avance) { avance = v; veille(); } } else if (!suiviProgres) veille();
        if (binary) out.push(d); if (onOut) onOut(txt);
      });
      p.stderr.on('data', d => { if (!suiviProgres) veille(); err += d; if (!wantErr && err.length > 8000) err = err.slice(-8000); });
      p.on('error', e => { clearTimeout(garde); reject(new Error(e.code === 'ENOENT' ? 'FFmpeg est introuvable.' : e.message)); });
      p.on('close', code => { clearTimeout(garde); if (cwd && dossiersAnnules.has(cwd)) return reject(new Error('Export annulé.')); if (fige) return reject(new Error('Encodage figé, arrêté')); code === 0 ? resolve(wantErr ? err : binary ? Buffer.concat(out) : '') : reject(new Error(err.trim().split('\n').slice(-4).join('\n') || 'Erreur FFmpeg')); });
    });
  }
  // Encodage par la puce vidéo (VideoToolbox) si demandé, surveillé ; en cas d'échec ou de blocage, par le processeur
  const VT_SURVEILLANCE = 45000;
  // Débit de la puce vidéo : « qualité max » double le débit (image plus fine, à peine plus lent : c'est la puce qui travaille)
  const debitVt = (W, H, max) => (Math.min(W, H) >= 1500 ? (max ? '80M' : '45M') : (max ? '36M' : '20M'));
  // Puce des Mac Apple Silicon : qualité constante (les plans calmes, un podcast, prennent 2 à 3 fois moins de place qu'à débit fixe,
  // sans perte visible) ; débit fixe si la puce ne sait pas faire (Mac Intel, machine virtuelle) ou si QM_VT_DEBIT est posé
  let vtQualite = false;
  const reglageVt = (W, H, max, proxy) => (vtQualite ? ['-q:v', proxy ? 50 : max ? 75 : 62] : ['-b:v', debitVt(W, H, max)]);
  const encVt = (P, max, proxy) => ['-c:v', 'h264_videotoolbox', ...reglageVt(P.w, P.h, max, proxy), '-allow_sw', 1];
  // réglages d'encodage d'un clip : les morceaux recopiés ensemble doivent tous en avoir les mêmes
  const encodeursClip = (P, proxy, max, avecPuce) => ({
    vt: avecPuce ? encVt(P, max, proxy) : null, cpu: ['-c:v', 'libx264', '-preset', proxy ? 'ultrafast' : 'veryfast', '-crf', proxy ? 30 : 16, '-forced-idr', 1]
  });
  async function encoder(avant, encVt, encCpu, apres, opts = {}) {
    if (encVt) {
      try { return await run(FFMPEG, [...avant, ...encVt, ...apres.slice(0, -1), '-progress', 'pipe:1', '-nostats', apres[apres.length - 1]], { ...opts, silence: VT_SURVEILLANCE }); }
      catch (e) { /* puce vidéo indisponible ou figée : on recommence au processeur */ }
    }
    return run(FFMPEG, [...avant, ...encCpu, ...apres], opts);
  }
  async function detect() {
    const f = (await run(FFMPEG, ['-hide_banner', '-filters'], { binary: true })).toString();
    filters = new Set(f.split('\n').map(l => l.trim().split(/\s+/)[1]).filter(Boolean));
    const e = (await run(FFMPEG, ['-hide_banner', '-encoders'], { binary: true })).toString();
    encoders = new Set(e.split('\n').map(l => l.trim().split(/\s+/)[1]).filter(Boolean));
    try { hwaccels = new Set((await run(FFMPEG, ['-hide_banner', '-hwaccels'], { binary: true })).toString().split('\n').slice(1).map(l => l.trim()).filter(Boolean)); } catch (er) { hwaccels = new Set(); }
    version = (await run(FFMPEG, ['-version'], { binary: true })).toString().split('\n')[0];
    if (process.platform === 'darwin' && encoders.has('h264_videotoolbox') && !process.env.QM_VT_DEBIT) { // qualité constante : seulement si la puce elle-même l'accepte
      try { await run(FFMPEG, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=s=320x240:r=30:d=0.4', '-c:v', 'h264_videotoolbox', '-q:v', 62, '-f', 'null', '-'], { silence: 15000 }); vtQualite = true; } catch (e) { vtQualite = false; }
    }
  }
  // Description d'un fichier comme ffprobe, lue dans le résumé affiché par FFmpeg lui-même.
  // Sert quand ffprobe est absent ou inutilisable (le ffprobe livré pour les Mac à puce Apple est en réalité un programme Intel).
  function sonde(file) {
    return new Promise((ok, ko) => {
      const p = spawn(FFMPEG, ['-hide_banner', '-i', file]); let err = '';
      p.stderr.on('data', d => { err += d; });
      p.on('error', e => ko(new Error(e.code === 'ENOENT' ? 'FFmpeg est introuvable.' : e.message)));
      p.on('close', () => {
        const m = /Input #0, (.+?), from /.exec(err);
        if (!m) return ko(new Error((err.trim().split('\n').pop() || 'Fichier non reconnu').replace(/^.*?: /, '')));
        const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(err);
        const streams = [];
        for (const l of err.split('\n')) {
          const s2 = /Stream #0:\d+.*?: (Video|Audio): (\w+)(.*)$/.exec(l); if (!s2) continue;
          const st = { codec_type: s2[1].toLowerCase(), codec_name: s2[2], disposition: { attached_pic: /\(attached pic\)/.test(s2[3]) ? 1 : 0 } };
          const wh = /, (\d{1,5})x(\d{1,5})[ ,]/.exec(s2[3] + ' '); if (wh) { st.width = +wh[1]; st.height = +wh[2]; }
          streams.push(st);
        }
        ok({ format: { format_name: m[1], duration: d ? String(+d[1] * 3600 + +d[2] * 60 + +d[3]) : undefined }, streams });
      });
    });
  }
  // Durée en lisant tout le fichier (prises de la caméra dont l'en-tête ne donne pas la durée)
  async function dureeLue(file) {
    const err = await run(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-map', '0:v:0?', '-map', '0:a:0?', '-c', 'copy', '-f', 'null', '-'], { wantErr: true }).catch(() => '');
    const t = [...String(err).matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
    return t ? +t[1] * 3600 + +t[2] * 60 + +t[3] : 0;
  }
  async function infos(file) {
    if (FFPROBE) {
      try { return JSON.parse((await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { binary: true })).toString()); }
      catch (e) { if (!/spawn|ENOENT|EBADARCH|introuvable|-86/i.test(e.message)) throw e; FFPROBE = null; } // ffprobe inutilisable : FFmpeg seul
    }
    const j = await sonde(file);
    if (!j.format.duration && j.streams.some(x => x.codec_type === 'audio' || (x.codec_type === 'video' && !IMG_EXT.includes(path.extname(file).toLowerCase())))) j.format.duration = String(await dureeLue(file));
    return j;
  }
  async function probe(file) {
    const ext = path.extname(file).toLowerCase();
    const j = await infos(file);
    const streams = j.streams || [];
    const v = streams.find(x => x.codec_type === 'video' && !(x.disposition && x.disposition.attached_pic)); // une pochette d'album n'est pas une vidéo
    const a = streams.find(x => x.codec_type === 'audio');
    const fmtName = String((j.format && j.format.format_name) || '');
    const dur = +((j.format && j.format.duration) || 0);
    let kind;
    if (v && (IMG_EXT.includes(ext) || /image2|_pipe|ppm|pgm/.test(fmtName) || (dur < 0.05 && !a))) kind = 'image';
    else if (v) kind = 'video';
    else if (a) kind = 'audio';
    else throw new Error('Fichier non reconnu');
    // lisible directement par la fenêtre (sinon une copie légère est préparée pour la lecture)
    const native = kind === 'video' && ['.mp4', '.m4v'].includes(ext) && v.codec_name === 'h264' && (!a || ['aac', 'mp3'].includes(a.codec_name));
    return { kind, duration: kind === 'image' ? 3 : dur, w: v ? v.width : 0, h: v ? v.height : 0, hasAudio: !!a, native, codec: v ? v.codec_name : (a ? a.codec_name : '') };
  }

  // Calques vidéo repris en cours de route (`ss` : déjà joué, après une coupe) : position ramenée dans la durée du fichier,
  // car le calque tourne en boucle (une position au-delà de la fin ne donnait aucune image)
  const dureesCalques = new Map();
  async function calquesEnBoucle(c) {
    for (const ov of (c && c.overlays) || []) {
      if (!ov || ov.kind !== 'video' || !ov.file) continue;
      let f; try { f = mediaPath(orient(ov.file, 16, 9)); } catch (e) { continue; }
      if (!fs.existsSync(f)) continue;
      const st = fs.statSync(f), k = `${f}|${st.size}|${st.mtimeMs}`;
      if (!dureesCalques.has(k)) dureesCalques.set(k, await probe(f).then(m => m.duration || 0, () => 0));
      const d = dureesCalques.get(k); if (!(d > 0.2)) continue;
      ov.duree = +d.toFixed(3); // l'aperçu se place au bon moment de l'animation
      if (num(ov.ss, 0) > 0) ov.ss = +(num(ov.ss, 0) % d).toFixed(3);
    }
  }
  // Vidéo HDR (HLG ou PQ : iPhone, appareils récents) : sans conversion, les couleurs paraissent ternes. Résultat gardé par fichier.
  const hdrCache = new Map();
  async function estHdr(file) {
    try {
      const st = fs.statSync(file), k = `${file}|${st.size}|${st.mtimeMs}`;
      if (hdrCache.has(k)) return hdrCache.get(k);
      const txt = await new Promise(ok => { const p = spawn(FFMPEG, ['-hide_banner', '-i', file]); let e = ''; p.stderr.on('data', d => { e += d; }); p.on('close', () => ok(e)); p.on('error', () => ok('')); });
      const v = /Stream #0:\d+[^\n]*Video:[^\n]*(?:arib-std-b67|smpte2084)/.test(txt);
      hdrCache.set(k, v); return v;
    } catch (e) { return false; }
  }
  const hdrPossible = () => filters.has('zscale') && filters.has('tonemap');
  // conversion en image classique (SDR) : lumière linéaire, compression douce des hautes lumières (Hable), retour en BT.709
  const CHAINE_HDR = 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p';

  // ---------- Construction d'un clip ----------
  // c : clip ; P : {w, h, fps} ; o : {preview, t, tdir, proxy}
  // durées des fondus d'un clip : réglées (fadeIn, fadeOut) ou 0,4 s si la case « fondu » est cochée ; jamais plus de la moitié du clip
function fonduxDe(c, eff) {
  const auto = c.fade ? 0.4 : 0, e = num(c.fadeIn, 0) > 0 ? num(c.fadeIn, 0) : auto, s = num(c.fadeOut, 0) > 0 ? num(c.fadeOut, 0) : auto, m = Math.max(0.05, eff / 2);
  return { e: Math.min(clamp(e, 0, 10), m), s: Math.min(clamp(s, 0, 10), m) };
}
// Graphe de filtres très long (des milliers de sous-titres) : écrit dans un fichier, la ligne de commande du Mac a une taille limitée
function grapheFiltre(g, tdir) {
  if (g.length < 60000 || !tdir) return ['-filter_complex', g];
  const nom = `graphe${tdir.idx}.txt`; fs.writeFileSync(path.join(tdir.dir, nom), g);
  return ffmpegMajeur() >= 7 ? ['-/filter_complex', nom] : ['-filter_complex_script', nom];
}
function buildClip(c, P, o = {}) {
    const W = P.w, H = P.h, fps = P.fps;
    const isGen = c.kind === 'solid';
    const isAud = c.kind === 'audio'; // podcast : une piste sonore avec fond et visualiseur
    const isImg = c.kind === 'image' || isGen;
    const stack = (c.fx || []).filter(e => e && FX.VIDEO.find(d => d.id === e.id));
    const rev = !isImg && !isAud && stack.some(e => e.id === 'inverse') && filters.has('reverse');
    const speed = isImg ? 1 : clamp(num(c.speed, 1), 0.25, 4);
    const srcDur = isImg ? Math.max(0.5, num(c.dur, 3)) : Math.max(0.1, num(c.out, 1) - num(c.in, 0));
    const eff = srcDur / speed;
    const t = clamp(num(o.t, 0), 0, Math.max(0, eff - 0.04));
    const ctx = { W, H, fps, eff, t0: o.preview ? t : 0 };
    const key = c.key && c.key.on;
    const args = ['-y', '-hide_banner', '-loglevel', 'error'];
    const f = [];
    let n = 1, bg = -1, pip = -1, sil = -1, uid = 0;
    const lab = () => 'x' + (uid++);

    let covIdx = -1;
    if (isAud) {
      args.push('-ss', num(c.in, 0) + (o.preview ? t * speed : 0), '-t', o.preview ? 1.5 : srcDur, '-i', mediaPath(c.file));
      if (c.bgFile) { args.push(...(c.bgKind === 'video' || /\.(webm|ogv|mp4|mov|m4v|mkv)$/i.test(c.bgFile) ? ['-stream_loop', '-1'] : ['-loop', '1', '-framerate', fps]), '-i', mediaPath(c.bgFile)); covIdx = n++; }
    } else if (isGen) args.push('-f', 'lavfi', '-t', o.preview ? 1 : eff, '-i', `color=c=${hex(c.color || '#000000')}:s=${W}x${H}:r=${fps}`);
    else if (isImg) args.push('-loop', '1', '-framerate', fps, '-t', o.preview ? 1 : eff, '-i', mediaPath(orient(c.file, W, H)));
    else args.push(...(o.hw && !o.preview ? ['-hwaccel', 'videotoolbox'] : []), '-ss', num(c.in, 0) + (o.preview ? t * speed : 0), '-t', o.preview ? 1.5 : srcDur, '-i', mediaPath(orient(c.file, W, H))); // décodage par la puce vidéo du Mac (vidéos d'iPhone en HEVC 4K)
    if (key && c.key.bgType === 'file' && c.key.bgFile) {
      const bgf = mediaPath(orient(c.key.bgFile, W, H));
      if (c.key.bgKind === 'video') args.push('-stream_loop', '-1', '-i', bgf);
      else args.push('-loop', '1', '-framerate', fps, '-i', bgf);
      bg = n++;
    }
    const hasPip = c.pip && c.pip.on && c.pip.file;
    if (hasPip) {
      if (c.pip.kind === 'video') args.push('-stream_loop', '-1', '-i', mediaPath(c.pip.file));
      else args.push('-loop', '1', '-framerate', fps, '-i', mediaPath(c.pip.file));
      pip = n++;
    }
    if (!o.preview && !isAud && (isImg || !c.hasAudio)) { args.push('-f', 'lavfi', '-t', eff, '-i', 'anullsrc=r=48000:cl=stereo'); sil = n++; }

    // Premier plan : lecture, vitesse, cadrage
    const fill = c.fit !== 'fit' && c.fit !== 'flou';
    let pre = '';
    if (rev) pre += 'reverse,';
    if (!isImg && speed !== 1) pre += `setpts=(PTS-STARTPTS)/${speed},`;
    pre += `fps=${fps},`;
    { // zoom et cadrage manuels (100 % = image entière ; position de -100 à 100)
      const zm = clamp(num(c.zoom, 100), 100, 400) / 100;
      if (zm > 1.001 && !isAud) pre += `crop=iw/${zm}:ih/${zm}:(iw-iw/${zm})*${(0.5 + clamp(num(c.zx, 0), -100, 100) / 200).toFixed(4)}:(ih-ih/${zm})*${(0.5 + clamp(num(c.zy, 0), -100, 100) / 200).toFixed(4)},`;
    }
    const scFill = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;
    // recadrage qui suit la personne (points { t, x } : x de 0 = bord gauche à 1 = bord droit de la zone recadrable)
    const pts = Array.isArray(c.cadrage) ? c.cadrage.filter(p => p && Number.isFinite(+p.t) && Number.isFinite(+p.x)).slice(0, 240).map(p => ({ t: +p.t, x: clamp(+p.x, 0, 1) })).sort((a, b) => a.t - b.t) : [];
    const suivi = (() => {
      if (!pts.length) return '';
      const T = `(t+${o.preview ? t : 0})`;
      let e = pts[pts.length - 1].x.toFixed(4);
      for (let i = pts.length - 2; i >= 0; i--) { const a = pts[i], b = pts[i + 1], d = Math.max(0.001, b.t - a.t); e = `if(lt(${T},${b.t.toFixed(3)}),${a.x.toFixed(4)}+(${(b.x - a.x).toFixed(4)})*min(1,max(0,(${T}-${a.t.toFixed(3)})/${d.toFixed(3)})),${e})`; }
      return `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:x='(iw-ow)*(${e})':y='(ih-oh)/2',setsar=1`;
    })();
    const scClip = suivi || scFill;
    const scFit = `scale=${W}:${H}:force_original_aspect_ratio=decrease,setsar=1`;
    let cur = lab();
    let aSrc = '0:a';
    if (isAud) {
      if (covIdx >= 0) f.push(`[${covIdx}:v]fps=${fps},${scFill}[${cur}]`);
      else f.push(`color=c=${hex(c.bgColor || '#101820')}:s=${W}x${H}:r=${fps}[${cur}]`);
      const vz = c.viz || {};
      if (vz.type && vz.type !== 'none') {
        const vh = Math.round(H * clamp(num(vz.h, 25), 5, 100) / 200) * 2, col = hex(vz.color || '#ffffff');
        const y = vz.pos === 'haut' ? Math.round(H * 0.08) : vz.pos === 'bas' ? Math.round(H * 0.74) : Math.round((H - vh) / 2);
        const gen = { ligne: `showwaves=s=${W}x${vh}:mode=cline:rate=${fps}:colors=${col}:scale=sqrt`, ondes: `showwaves=s=${W}x${vh}:mode=line:rate=${fps}:colors=${col}:scale=sqrt`,
          points: `showwaves=s=${W}x${vh}:mode=point:rate=${fps}:colors=${col}:scale=sqrt`,
          barres: `showfreqs=s=${W}x${vh}:mode=bar:fscale=log:ascale=sqrt:colors=${col}:win_size=1024`,
          // miroir : barres de fréquences symétriques (haut et bas) ; spectre : barres colorées par note
          miroir: `showfreqs=s=${W}x${Math.max(2, Math.round(vh / 4) * 2)}:mode=bar:fscale=log:ascale=sqrt:colors=${col}:win_size=1024,split[vza][vzb];[vzb]vflip[vzc];[vza][vzc]vstack`,
          spectre: `showcqt=s=${W}x${vh}:fps=${fps}:sono_h=0:axis_h=0:bar_g=2` }[vz.type] || '';
        if (gen && filters.has(gen.split('=')[0])) {
          const wv = lab();
          if (o.preview) f.push(`[0:a]${gen},format=rgba${['barres', 'miroir', 'spectre'].includes(vz.type) ? ',colorkey=black:0.25:0.1' : ''}[${wv}]`);
          else { f.push(`[0:a]asplit=2[avz][aout]`); f.push(`[avz]${gen},format=rgba${['barres', 'miroir', 'spectre'].includes(vz.type) ? ',colorkey=black:0.25:0.1' : ''}[${wv}]`); aSrc = 'aout'; }
          const out = lab(); f.push(`[${cur}][${wv}]overlay=x=0:y=${y}:shortest=1:format=auto[${out}]`); cur = out;
        }
      }
    } else if (key) {
      const k = c.key;
      let fg = pre + (c.fit === 'fit' ? scFit : scClip) + `,format=yuv420p,chromakey=color=${hex(k.color)}:similarity=${clamp(num(k.sim, 0.15), 0.01, 0.8)}:blend=${clamp(num(k.blend, 0.08), 0, 0.5)}`;
      if (k.despill && filters.has('despill')) fg += ',format=gbrap,despill=type=green:mix=0.5:expand=0.1,format=yuva420p';
      f.push(`[0:v]${fg}[fg]`);
      if (bg >= 0) f.push(`[${bg}:v]fps=${fps},${scFill}[bg]`);
      else f.push(`color=c=${hex(k.bgColor || '#101820')}:s=${W}x${H}:r=${fps}[bg]`);
      f.push(`[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1:format=auto[${cur}]`);
    } else if (c.fit === 'flou') {
      const a = lab(), b = lab();
      f.push(`[0:v]${pre}format=yuv420p,split[${a}][${b}]`);
      f.push(`[${b}]${scFill},gblur=sigma=30[${b}g]`);
      f.push(`[${a}]${scFit}[${a}f]`);
      f.push(`[${b}g][${a}f]overlay=(W-w)/2:(H-h)/2[${cur}]`);
    } else {
      f.push(`[0:v]${pre}${fill ? scClip : scFit + `,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black`}[${cur}]`);
    }
    const lin = frag => { const out = lab(); f.push(`[${cur}]${frag}[${out}]`); cur = out; };

    if (o.hdr && hdrPossible()) lin(CHAINE_HDR); // vidéo HDR : conversion avant tous les réglages de couleur

    // Réglages de base
    const bright = clamp(num(c.bright, 0), -50, 50) / 100, contrast = clamp(num(c.contrast, 100), 0, 200) / 100;
    const sat = c.bw ? 0 : clamp(num(c.sat, 100), 0, 300) / 100;
    if (bright !== 0 || contrast !== 1 || sat !== 1) lin(`eq=brightness=${bright}:contrast=${contrast}:saturation=${sat}`);
    // mélange d'un filtre avec l'image d'origine (intensité en %)
    const dose = (frag, pct) => {
      if (pct >= 99) return lin(frag);
      if (pct <= 0) return;
      const a = lab(), b = lab(), m = lab(), out = lab();
      f.push(`[${cur}]format=yuv420p,split[${a}][${b}]`, `[${b}]${frag},format=yuv420p[${m}]`, `[${a}][${m}]blend=all_mode=normal:all_opacity=${(pct / 100).toFixed(2)}[${out}]`);
      cur = out;
    };

    // Look d'étalonnage (fichier LUT .cube de la bibliothèque ou d'un pack)
    if (c.lut && c.lut.file && filters.has('lut3d')) {
      let lp = null; try { lp = mediaPath(c.lut.file); } catch (e) { /* chemin refusé */ }
      if (lp && /\.cube$/i.test(lp) && fs.existsSync(lp)) dose(`lut3d=file='${cheminFiltre(lp)}':interp=tetrahedral`, clamp(num(c.lut.amount, 100), 0, 100));
    }

    // Pile d'effets
    for (const e of stack) {
      const d = FX.VIDEO.find(x => x.id === e.id);
      if (d.id === 'inverse' || !d.needs.every(x => filters.has(x))) continue;
      const q = FX.defaults(d);
      for (const pr of d.params) if (e.p && e.p[pr.k] !== undefined) q[pr.k] = clamp(num(e.p[pr.k], pr.def), pr.min, pr.max);
      const frag = d.make(q, ctx);
      if (typeof frag !== 'string') { const out = lab(); f.push(frag.graph(cur, out)); cur = out; }
      else if (d.blend) dose(frag, q.amount);
      else lin(frag);
    }

    // Incrustation (image dans l'image, logo)
    if (hasPip) {
      const sc = clamp(num(c.pip.scale, 30), 5, 100), op = clamp(num(c.pip.opacity, 100), 5, 100) / 100;
      const pos = FX.POSITIONS.includes(c.pip.pos) ? c.pip.pos : 'br', m = Math.round(W * 0.04);
      const x = { l: `${m}`, c: '(W-w)/2', r: `W-w-${m}` }[pos[1]], y = { t: `${m}`, m: '(H-h)/2', b: `H-h-${m}` }[pos[0]];
      f.push(`[${pip}:v]fps=${fps},scale=${even(W * sc / 100)}:-2,format=rgba,colorchannelmixer=aa=${op}[pp]`);
      const out = lab(); f.push(`[${cur}][pp]overlay=${x}:${y}:shortest=1:format=auto[${out}]`); cur = out;
    }

    // Calques : images, vidéos, stickers ; position, taille, rotation, apparition animée
    // jusqu'à 24 calques par clip (les animations du studio en ajoutent une par touche) ; seuls ceux qui apparaissent dans le clip comptent
    let nCalques = 0;
    for (const ov of c.overlays || []) {
      if (!ov || !ov.file || ov.on === false) continue;
      const S0 = clamp(num(ov.start, 0), 0, 3600), Dd = num(ov.dur, 0), E0 = Dd > 0 ? S0 + Dd : eff + 10;
      if (o.preview && !(t >= S0 && t < E0)) continue; // l'aperçu d'une image n'affiche que ce qui est visible à cet instant
      if (S0 >= eff || ++nCalques > 24) continue;
      const isVid = ov.kind === 'video', ovf = mediaPath(orient(ov.file, W, H));
      const mode = MODES[ov.mode] && filters.has('blend') ? MODES[ov.mode] : null;
      // calque limité au temps où il est visible (sinon il est lu et détouré pendant tout le clip, même caché) ;
      // une fois fini, l'image du clip passe telle quelle (eof_action=pass)
      const lim = !o.preview ? Math.min(E0, eff) - S0 + 0.5 : 0, duree = lim ? ['-t', lim.toFixed(3)] : [], fin = lim ? 'eof_action=pass' : 'shortest=1';
      // aperçu : l'image de l'animation à cet instant (durée connue : position dans la boucle ; sinon au plus 1,8 s)
      const dansAnim = o.preview && t > S0 ? (num(ov.duree, 0) > 0.2 ? (t - S0 + num(ov.ss, 0)) % num(ov.duree, 1) - num(ov.ss, 0) : Math.min(t - S0, 1.8)) : 0;
      if (isVid) args.push(...(o.preview && t > S0 || num(ov.ss, 0) > 0 ? ['-ss', Math.max(0, dansAnim + clamp(num(ov.ss, 0), 0, 600)).toFixed(2)] : []), '-stream_loop', '-1', ...duree, '-i', ovf); else args.push('-loop', '1', '-framerate', fps, ...duree, '-i', ovf);
      const idx = n++, id = lab(), sc = clamp(num(ov.scale, 30), 2, 150) / 100;
      const op = clamp(num(ov.opacity, 100), 5, 100) / 100, en = o.preview ? '' : `:enable='between(t,${S0},${E0})'`;
      // fond vert de l'élément (animations « fond vert ») : la couleur verte devient transparente
      const cle = ov.key ? `,colorkey=0x00ff00:${clamp(num(ov.keySim, 0.3), 0.05, 0.7)}:0.12` : '';
      // le calque commence à son instant (son début, pas un moment au hasard de sa boucle) ; l'aperçu, lui, est déjà avancé au bon moment
      const dec = o.preview ? 0 : S0;
      if (mode) { // calque plein écran mélangé à l'image (fuites de lumière, poussière, grain…)
        f.push(`[${idx}:v]fps=${fps},setpts=PTS-STARTPTS+${dec}/TB,${ov.plein === 'cadre' ? `scale=${W}:${H},setsar=1` : scFill},format=gbrp[${id}]`);
        const a = lab(), out = lab();
        f.push(`[${cur}]format=gbrp[${a}]`, `[${a}][${id}]blend=all_mode=${mode}:all_opacity=${op}:${o.preview ? 'shortest=1' : 'eof_action=pass'}${en},format=yuv420p[${out}]`);
        cur = out; continue;
      }
      if (ov.plein) { // cadre ou décor plein écran
        let ch = `[${idx}:v]fps=${fps},setpts=PTS-STARTPTS+${dec}/TB,${ov.plein === 'cadre' ? `scale=${W}:${H},setsar=1` : scFill},format=rgba${cle}`;
        if (op < 1) ch += `,colorchannelmixer=aa=${op}`;
        if (!o.preview && ov.anim === 'fade') ch += `,fade=t=in:st=${S0}:d=0.4:alpha=1` + (Dd > 0 ? `,fade=t=out:st=${Math.max(S0, E0 - 0.4)}:d=0.4:alpha=1` : '');
        f.push(`${ch}[${id}]`);
        const out = lab(); f.push(`[${cur}][${id}]overlay=0:0:${fin}:format=auto${en}[${out}]`); cur = out; continue;
      }
      const anim = o.preview ? 'none' : (ov.anim || 'none'), Tt = 't';
      const ease = (a, d) => `(1-pow(1-min(1,max(0,(${Tt}-(${a}))/${d})),3))`;
      const px = clamp(num(ov.x, 50), -20, 120) / 100, py = clamp(num(ov.y, 50), -20, 120) / 100;
      const baseW = W * sc;
      const w = anim === 'pop' ? `trunc(${baseW}*max(0.02,min(1.15,1-exp(-7*(${Tt}-${S0}))*cos(18*(${Tt}-${S0}))))/2)*2` : `${even(baseW)}`;
      let chain = `[${idx}:v]fps=${fps},setpts=PTS-STARTPTS+${dec}/TB,format=rgba${cle}`;
      chain += anim === 'pop' ? `,scale=w='${w}':h=-2:eval=frame` : `,scale=${w}:-2`;
      if (num(ov.rot, 0)) chain += `,rotate=${(num(ov.rot, 0) * Math.PI / 180).toFixed(4)}:ow='hypot(iw,ih)':oh='hypot(iw,ih)':c=none`;
      if (op < 1) chain += `,colorchannelmixer=aa=${op}`;
      if (anim === 'fade' || anim === 'pop') chain += `,fade=t=in:st=${S0}:d=0.3:alpha=1`;
      if ((anim === 'fade') && Dd > 0) chain += `,fade=t=out:st=${Math.max(S0, E0 - 0.3)}:d=0.3:alpha=1`;
      f.push(`${chain}[${id}]`);
      let xe = `W*${px}-w/2`, ye = `H*${py}-h/2`;
      if (anim === 'glisse') xe = `${xe}-(1-${ease(S0, 0.5)})*W`;
      if (anim === 'monte') ye = `${ye}+(1-${ease(S0, 0.5)})*H*0.4`;
      if (anim === 'rebond') ye = `${ye}-abs(sin((${Tt}-${S0})*9))*H*0.04*exp(-(${Tt}-${S0})*1.5)`;
      const out = lab();
      f.push(`[${cur}][${id}]overlay=x='${xe}':y='${ye}':${fin}:format=auto${en}[${out}]`); cur = out;
    }

    // Sous-titres (une ligne par repère, en bas)
    // tous les sous-titres du clip (avant : 300 au plus, la suite d'un long clip n'était pas affichée) ; l'aperçu d'une image ne garde que ceux de cet instant
    const tousSous = (c.subs || []).filter(x => x && String(x.t || '').trim());
    const subs = o.preview ? tousSous.filter(x => num(x.e, 0) >= t - 0.1 && num(x.s, 0) <= t + 1.6) : tousSous.slice(0, 5000);
    if (subs.length && fontFile(c.textFont) && filters.has('drawtext')) {
      const idx = o.tdir ? o.tdir.idx : 0, dir = o.tdir ? o.tdir.dir : TMP, u = Math.min(W, H) / 100, size = Math.round(u * clamp(num(c.subSize, 4.4), 2, 10));
      const T = `(t+${ctx.t0})`, tk = c.subStyle === 'tiktok', col = c.subStyle === 'jaune' ? '0xffe600' : 'white', def = SUBDEF[c.subStyle];
      // « tiktok » : 1 à 3 mots, gros, au centre bas de l'image, contour épais et ombre ; les styles de pack (SUBDEF) ajoutent police, capitales, couleurs et calques
      const st = c.subStyle === 'bandeau' ? `:box=1:boxcolor=black@0.6:boxborderw=${Math.round(size / 3)}` : tk ? `:borderw=${Math.max(3, Math.round(size / 7))}:bordercolor=black:shadowx=${Math.round(size / 16)}:shadowy=${Math.round(size / 12)}:shadowcolor=black@0.55` : `:borderw=${Math.max(2, Math.round(size / 10))}:bordercolor=black`;
      const yy = tk ? 'h*0.70-text_h/2' : 'h*0.84-text_h';
      const parts = subs.map((x, k) => {
        const file = `s${idx}_${k}.txt`, en = `:enable='between(${T},${num(x.s, 0)},${num(x.e, 0)})'`;
        if (def) { // style de pack : un ou plusieurs calques de texte superposés
          const sz = Math.round(size * (def.k || 1)), brut = def.up ? String(x.t).toUpperCase() : String(x.t);
          fs.writeFileSync(path.join(dir, file), wrap(brut.slice(0, 200), Math.floor(W * 0.9 / (sz * (def.up ? 0.68 : 0.58)))));
          return def.layers(sz, k).map(L => `drawtext=fontfile='${fontFile(def.font)}':textfile=${file}:expansion=none:fontsize=${sz}:fontcolor=${L.col}:x=(w-text_w)/2+${L.dx || 0}:y=${def.y}:line_spacing=${Math.round(sz * 0.2)}${L.ex || ''}${en}`).join(',');
        }
        fs.writeFileSync(path.join(dir, file), wrap(String(x.t).slice(0, 200), Math.floor(W * 0.9 / (size * 0.58))));
        return `drawtext=fontfile='${fontFile(tk ? 'arialblack' : c.textFont)}':textfile=${file}:expansion=none:fontsize=${size}:fontcolor=${col}:x=(w-text_w)/2:y=${yy}:line_spacing=${Math.round(size * 0.2)}${st}${en}`;
      });
      lin(parts.join(','));
    }

    // Texte
    if (c.text && String(c.text).trim() && fontFile(c.textFont) && filters.has('drawtext')) {
      const idx = o.tdir ? o.tdir.idx : 0, file = `t${idx}.txt`;
      const size = Math.round(H * clamp(num(c.textSize, 6), 2, 15) / 100);
      fs.writeFileSync(path.join(o.tdir ? o.tdir.dir : TMP, file), wrap(String(c.text).slice(0, 300), Math.floor(W * 0.88 / (size * 0.6))));
      const T = `(t+${(ctx.t0 + clamp(num(c.textDeja, 0), 0, 3600)).toFixed(3)})`, S = clamp(num(c.textStart, 0), 0, 600), D = num(c.textDur, 0); // textDeja : texte qui continue après une coupe
      const base = c.textPos === 'haut' ? 'h*0.12' : c.textPos === 'milieu' ? '(h-text_h)/2' : 'h*0.8-text_h';
      const anim = c.textAnim || 'aucune', ap = `min(1,max(0,(${T}-${S})/0.5))`;
      let style = '';
      if (c.textStyle === 'bandeau') style = `:box=1:boxcolor=black@0.45:boxborderw=${Math.round(size / 3)}`;
      else if (c.textStyle === 'contour') style = `:borderw=${Math.max(2, Math.round(size / 12))}:bordercolor=black`;
      else if (c.textStyle === 'ombre') style = `:shadowx=${Math.max(2, Math.round(size / 18))}:shadowy=${Math.max(2, Math.round(size / 18))}:shadowcolor=black@0.7`;
      const dt0 = `(${T}-${S})`, m = `(min(1,max(0,${dt0}/0.6))-1)`, back = `(1+2.4*${m}*${m}*${m}+1.4*${m}*${m})`; // arrivée avec léger dépassement
      const yexp = anim === 'glisse' ? `${base}+(1-${ap})*${Math.round(H * 0.05)}` : anim === 'monte' ? `${base}+(1-${back})*${Math.round(H * 0.12)}` : anim === 'descend' ? `${base}-(1-${back})*${Math.round(H * 0.12)}`
        : anim === 'rebond' ? `${base}-abs(sin(${dt0}*9))*${Math.round(H * 0.05)}*exp(-${dt0}*2.2)*gt(${dt0},0)` : base;
      const xexp = anim === 'balayage' ? `(w-text_w)/2-(1-${back})*${Math.round(W * 0.6)}` : anim === 'tremble' ? `(w-text_w)/2+${Math.round(W * 0.014)}*sin(${T}*62)*(1-${ap})` : '(w-text_w)/2';
      const alpha = anim === 'aucune' ? '' : anim === 'clignote' ? `:alpha='if(lt(mod(${T}*2.5,1),0.7),${ap},0.15*${ap})'` : anim === 'pulse' ? `:alpha='${ap}*(0.75+0.25*sin(${T}*4))'` : `:alpha='${ap}'`;
      const en = (S > 0 || D > 0) ? `:enable='between(${T},${S},${D > 0 ? S + D : 100000})'` : '';
      lin(`drawtext=fontfile='${fontFile(c.textFont)}':textfile=${file}:expansion=none:fontsize=${size}:fontcolor=${hex(c.textColor || '#ffffff')}:x='${xexp}':y='${yexp}'${style}${alpha}${en}`);
    }
    if (c.titre && c.titre.preset && fontFile(c.titre.font) && filters.has('drawtext')) cur = reportage(c, ctx, f, cur, lab, o);
    const fondus = fonduxDe(c, eff);
    if (!o.preview && (fondus.e || fondus.s)) lin([fondus.e ? `fade=t=in:st=0:d=${fondus.e.toFixed(2)}` : '', fondus.s ? `fade=t=out:st=${Math.max(0, eff - fondus.s).toFixed(3)}:d=${fondus.s.toFixed(2)}` : ''].filter(Boolean).join(','));
    f.push(`[${cur}]format=yuv420p,setsar=1[v]`); // pixels carrés partout : clips recopiables ensemble

    if (o.preview) {
      args.push('-filter_complex', f.join(';'), '-map', '[v]', '-frames:v', 1, '-f', 'mjpeg', '-q:v', 4, 'pipe:1');
      return args;
    }

    // Son : vitesse, volume, effets sonores, fondu
    const src = sil >= 0 ? `${sil}:a` : aSrc;
    const af = [];
    if (rev) af.push('areverse');
    let s = speed;
    while (s > 2) { af.push('atempo=2'); s /= 2; }
    while (s < 0.5) { af.push('atempo=0.5'); s *= 2; }
    if (s !== 1) af.push(`atempo=${s}`);
    af.push(`volume=${clamp(num(c.vol, 100), 0, 300) / 100}`);
    for (const e of (num(c.vol, 100) > 0 ? c.afx || [] : [])) { // clip muet : aucun effet audio (loudnorm sur du silence donnait « NaN »)
      if (e && e.id === 'normaliser' && c.gainNorm != null) { af.push(`volume=${c.gainNorm}dB`); continue; }
      const d = FX.AUDIO.find(x => x.id === (e && e.id));
      if (!d || !d.needs.every(x => filters.has(x))) continue;
      const q = FX.defaults(d);
      for (const pr of d.params) if (e.p && e.p[pr.k] !== undefined) q[pr.k] = clamp(num(e.p[pr.k], pr.def), pr.min, pr.max);
      af.push(d.make(q));
    }
    if (fondus.e) af.push(`afade=t=in:d=${fondus.e.toFixed(2)}`);
    if (fondus.s) af.push(`afade=t=out:st=${Math.max(0, eff - fondus.s).toFixed(3)}:d=${fondus.s.toFixed(2)}`);
    // morceau de parole (blancs coupés) : fondu sonore imperceptible aux raccords, sans le petit clic d'une coupe sèche
    if (c.parle && eff > 0.1) {
      if (!fondus.e && c.microE !== false) af.push('afade=t=in:d=0.012');
      if (!fondus.s && c.microS !== false) af.push(`afade=t=out:st=${Math.max(0, eff - 0.012).toFixed(3)}:d=0.012`);
    }
    af.push('aresample=48000', 'aformat=sample_fmts=fltp:channel_layouts=stereo');
    f.push(`[${src}]${af.join(',')}[a]`);

    const proxy = !!o.proxy;
    args.push(...grapheFiltre(f.join(';'), o.tdir), '-map', '[v]', '-map', '[a]', '-t', eff.toFixed(3), '-r', fps, '-enc_time_base:v', `1/${fps}`, '-chroma_sample_location:v', 'left', // mêmes en-têtes pour tous les clips (photos, sons à pochette…) : recopie sans réencoder
      ...(o.vt ? ['-c:v', 'h264_videotoolbox', ...reglageVt(W, H, o.vtMax, proxy), '-allow_sw', 1] : ['-c:v', 'libx264', '-preset', proxy ? 'ultrafast' : 'veryfast', '-crf', proxy ? 30 : 16, '-forced-idr', 1]), '-pix_fmt', 'yuv420p', // images clés IDR : les morceaux se recopient sans réencoder
      '-force_key_frames', EPI.expressionGop(fps), // une image clé par seconde : permet de recopier sans réencoder (assemblage rapide)
      '-c:a', 'aac', '-b:a', proxy ? '96k' : '192k', '-ar', 48000, '-ac', 2, '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats');
    return { args, eff };
  }

  // Titres de reportage : barres colorées (filtre overlay) et textes animés (drawtext), tout en expressions de temps.
  function reportage(c, ctx, f, cur, lab, o) {
    const ti = c.titre, { W, H, fps, eff } = ctx, u = Math.min(W, H) / 100;
    const dir = o.tdir ? o.tdir.dir : TMP, idx = o.tdir ? o.tdir.idx : 0;
    const T = `(t+${(ctx.t0 + clamp(num(ti.deja, 0), 0, 3600)).toFixed(3)})`, S = clamp(num(ti.start, 0), 0, 3600), D = num(ti.dur, 0); // deja : titre qui continue après une coupe, sans rejouer son entrée
    const E = D > 0 ? S + D : eff + 10, OUT = D > 0 ? 1 : 0;
    const ease = (a, d) => `(1-pow(1-min(1,max(0,(${T}-(${a}))/${d})),3))`;
    const fin = ease(S, 0.5), fout = D > 0 ? ease(E - 0.5, 0.5) : '0';
    const F = `(${fin}*(1-${fout}))`; // 0 = caché, 1 = en place
    // entrée « rebond » : dépasse un peu sa place puis s'y pose (comme les titres animés des packs vendus) ; d = retard en secondes pour décaler les lignes
    const Fb = d => { const m = `(min(1,max(0,(${T}-(${S + d}))/0.65))-1)`; return `((1+2.4*${m}*${m}*${m}+1.4*${m}*${m})*(1-${fout}))`; };
    const en = `enable='between(${T},${S},${E})'`;
    const acc = hex(ti.color || '#c8102e'), id = String(ti.preset);
    const txt = (name, content) => { const file = `r${idx}${name}.txt`; fs.writeFileSync(path.join(dir, file), String(content).slice(0, 600)); return file; };
    const l1 = String(ti.l1 || ''), l2 = String(ti.l2 || '');
    const DEF_FONT = { 'cine-titre': 'copperplate', 'cadre-titre': 'didot', 'impact-titre': 'impact', angle: 'futura', pseudo: 'futura', jour: 'futura', courbe: 'helvetica', 'barres-h': 'helvetica', compteur: 'futura', definition: 'helvetica', risque: 'helvetica', objectif: 'helvetica', 'intro-vlog': 'futura', trajet: 'futura', temps: 'courier', 'now-playing': 'helvetica', question: 'futura', plateformes: 'helvetica', sommaire: 'futura', 'citation-pro': 'georgia', prix: 'helvetica', caracteristiques: 'helvetica', liste: 'futura', verset: 'georgia', promo: 'futura', 'avertissement-sante': 'helvetica', 'cours-hausse': 'helvetica', 'cours-baisse': 'helvetica', 'bourse-defile': 'helvetica', avertissement: 'helvetica', hud: 'futura', barres: 'futura', episode: 'futura', invite: 'helvetica', sponsor: 'helvetica', abonne: 'futura', etape: 'futura', astuce: 'helvetica', rubrique: 'futura', chiffre: 'futura', 'lieu-vlog': 'futura', numero: 'futura', rec: 'courier', etiquette: 'futura', 'glitch-titre': 'futura', double: 'helvetica' }; // police d'origine des titres de pack (celle de l'utilisateur prime)
    const font = `fontfile='${fontFile(ti.font || DEF_FONT[id])}'`;
    const dt = (file, size, color, x, y, extra = '') =>
      `drawtext=${font}:textfile=${file}:expansion=none:fontsize=${Math.round(size)}:fontcolor=${color}:x='${x}':y='${y}':${en}${extra}`;
    const box = (color, w, h, x, y) => {
      const src = lab(), out = lab();
      f.push(`color=c=${color}:s=${Math.max(2, Math.round(w))}x${Math.max(2, Math.round(h))}:r=${fps},format=rgba[${src}]`);
      f.push(`[${cur}][${src}]overlay=x='${x}':y='${y}':shortest=1:format=auto:${en}[${out}]`);
      cur = out;
    };
    const text = chain => { const out = lab(); f.push(`[${cur}]${chain.join(',')}[${out}]`); cur = out; };

    if (id === 'tiers') {
      const bw = W * 0.78, bh = 11.5 * u, y = H * 0.74, BX = `(-${bw}+(${3 * u}+${bw})*${F})`;
      box('0x101828@0.9', bw, bh, BX, y); box(acc, 1.3 * u, bh, BX, y);
      text([dt(txt('a', l1), 4.6 * u, 'white', `${BX}+${3.4 * u}`, `${y + 1.3 * u}`),
        ...(l2 ? [dt(txt('b', l2), 3 * u, '0xd0d6e0', `${BX}+${3.4 * u}`, `${y + 6.4 * u}`)] : [])]);
    } else if (id === 'minimal') {
      const BX = `(-${W}*0.5+(${5 * u}+${W}*0.5)*${F})`, y = H * 0.78;
      box(acc, 0.9 * u, 9.5 * u, BX, y);
      text([dt(txt('a', l1), 4.6 * u, 'white', `${BX}+${2.6 * u}`, `${y}`, `:borderw=2:bordercolor=black`),
        ...(l2 ? [dt(txt('b', l2), 3 * u, 'white', `${BX}+${2.6 * u}`, `${y + 5.8 * u}`, `:borderw=2:bordercolor=black`)] : [])]);
    } else if (id === 'flash') {
      const bh = 8.5 * u, y = H * 0.85, lw = 24 * u;
      box('0x0a1a44@0.95', W, bh, '0', y);
      const tick = txt('a', l1);
      text([dt(tick, 3.6 * u, 'white', `${W}-mod(${T}*${W * 0.12}\,${W}+text_w)`, `${y + 2.4 * u}`)]);
      box(acc, lw, bh, '0', y);
      text([dt(txt('b', l2 || 'FLASH INFO'), 3.3 * u, 'white', `(${lw}-text_w)/2`, `${y + 2.6 * u}`)]);
    } else if (id === 'lieu') {
      const BX = `(-${W * 0.6}+(${4 * u}+${W * 0.6})*${F})`;
      text([dt(txt('a', l1.toUpperCase()), 3.8 * u, 'white', BX, `${H * 0.06}`, `:box=1:boxcolor=${acc}@0.95:boxborderw=${Math.round(1.4 * u)}`),
        ...(l2 ? [dt(txt('b', l2), 2.6 * u, 'white', BX, `${H * 0.06 + 6.6 * u}`, `:box=1:boxcolor=black@0.7:boxborderw=${Math.round(1 * u)}`)] : [])]);
    } else if (id === 'tv') {
      const bh = 9 * u, y = H * 0.82;
      box(`${acc}@0.78`, W, bh, '0', y);
      text([dt(txt('a', l1), 4 * u, 'white', '(w-text_w)/2', `${y + (bh - 4 * u) / 2 - 0.4 * u}`, `:alpha='${F}'`)]);
    } else if (id === 'chapitre') {
      box(acc, W * 0.18, Math.max(2, 0.45 * u), `(W-w)/2`, `${H * 0.5 + 6 * u}`);
      text([dt(txt('a', l1), 9 * u, acc, '(w-text_w)/2', `${H * 0.5 - 9 * u}`, `:alpha='${F}':borderw=2:bordercolor=black@0.6`),
        ...(l2 ? [dt(txt('b', l2), 3.6 * u, 'white', '(w-text_w)/2', `${H * 0.5 + 9 * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'citation') {
      const wrapped = wrap(l1, Math.floor(W * 0.8 / (4.4 * u * 0.6)));
      text([dt(txt('q', '“'), 16 * u, acc, '(w-text_w)/2', `${H * 0.5 - 22 * u}`, `:alpha='${F}'`),
        dt(txt('a', wrapped), 4.4 * u, 'white', '(w-text_w)/2', `${H * 0.5 - 6 * u}`, `:alpha='${F}':borderw=2:bordercolor=black@0.7`),
        ...(l2 ? [dt(txt('b', l2), 3 * u, acc, '(w-text_w)/2', `${H * 0.5 + 14 * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'compte') {
      // un chiffre par seconde, chacun affiché pendant sa seconde
      const N = clamp(Math.round(num(l1, 5)) || 5, 1, 30);
      const parts = [];
      for (let k = 0; k < N; k++) {
        const file = `r${idx}c${k}.txt`; fs.writeFileSync(path.join(dir, file), String(N - k));
        parts.push(`drawtext=${font}:textfile=${file}:expansion=none:fontsize=${Math.round(26 * u)}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:borderw=4:bordercolor=black@0.7:enable='between(${T},${S + k},${S + k + 1})'`);
      }
      text(parts);
    } else if (id === 'machine') { // texte qui s'écrit lettre par lettre
      const cps = clamp(num(ti.speed, 14), 4, 40), size = 5 * u;
      const full = wrap(l1.slice(0, 120), Math.floor(W * 0.84 / (size * 0.6))), n = full.length, parts = [];
      for (let k = 1; k <= n; k++) {
        const file = txt('m' + k, full.slice(0, k) + (k < n ? '|' : ''));
        const from = S + (k - 1) / cps, to = k < n ? S + k / cps : E;
        parts.push(`drawtext=${font}:textfile=${file}:expansion=none:fontsize=${Math.round(size)}:fontcolor=white:x=${Math.round(W * 0.08)}:y=${Math.round(H * 0.42)}:borderw=3:bordercolor=black@0.8:enable='between(${T},${from.toFixed(3)},${to.toFixed(3)})'`);
      }
      text(parts);
    } else if (id === 'chapnoir') { // chapitre « vlog » sur écran noir : numéro espacé, titre qui s'écrit, trait d'accent qui s'étire
      const cps = clamp(num(ti.speed, 16), 4, 40), size = 7 * u, x0 = Math.round(W * 0.09), y0 = Math.round(H * 0.5);
      const full = wrap(l1.slice(0, 80), Math.floor(W * 0.82 / (size * 0.58))), n = full.length, parts = [];
      const T0 = S + 0.25; // le titre démarre juste après l'apparition du numéro
      for (let k = 1; k <= n; k++) {
        const file = txt('m' + k, full.slice(0, k));
        const from = T0 + (k - 1) / cps, to = k < n ? T0 + k / cps : E;
        parts.push(`drawtext=${font}:textfile=${file}:expansion=none:fontsize=${Math.round(size)}:fontcolor=white:x=${x0}:y=${y0}:line_spacing=${Math.round(size * 0.2)}:enable='between(${T},${from.toFixed(3)},${to.toFixed(3)})*between(${T},${S},${E})'`);
      }
      const num2 = l2 ? [dt(txt('b', l2.toUpperCase().split('').join(' ')), 2.6 * u, acc, `${x0}`, `${y0 - 6.5 * u}`, `:alpha='${F}'`)] : [];
      text([...num2, ...parts]);
      const bw = even(Math.min(W * 0.3, Math.max(10 * u, n * size * 0.4))), bh = even(Math.max(4, 0.55 * u)), src = lab(), out = lab();
      f.push(`color=c=${acc}:s=${bw}x${bh}:r=${fps},format=rgba,scale=w='max(2,${bw}*${ease(T0, 0.9)})':h=${bh}:eval=frame[${src}]`);
      f.push(`[${cur}][${src}]overlay=x='${x0}':y='${Math.round(y0 + 9.5 * u * (full.split('\n').length))}':shortest=1:format=auto:${en}[${out}]`); cur = out;
    } else if (id === 'souligne') { // titre avec une barre qui s'étire dessous
      const bw = even(W * 0.5), bh = even(Math.max(4, 0.9 * u)), src = lab(), out = lab();
      f.push(`color=c=${acc}:s=${bw}x${bh}:r=${fps},format=rgba,scale=w='max(2,${bw}*${ease(S, 0.7)})':h=${bh}:eval=frame[${src}]`);
      f.push(`[${cur}][${src}]overlay=x='(W-w)/2':y='${Math.round(H * 0.46 + 8 * u)}':shortest=1:format=auto:${en}[${out}]`); cur = out;
      text([dt(txt('a', l1), 6 * u, 'white', '(w-text_w)/2', `${Math.round(H * 0.46 - 2 * u)}`, `:alpha='${F}':borderw=3:bordercolor=black@0.7`),
        ...(l2 ? [dt(txt('b', l2), 3.2 * u, 'white', '(w-text_w)/2', `${Math.round(H * 0.46 + 12 * u)}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'angle') { // pack Réseaux : bloc d'accent et bloc sombre décalés
      const BX = `(-${W * 0.7}+(${4 * u}+${W * 0.7})*${Fb(0)})`, BX2 = `(-${W * 0.7}+(${4 * u}+${W * 0.7})*${Fb(0.14)})`, y = H * 0.74;
      box(acc, 1.1 * u, 13 * u, BX, y); box('0x0b0f1c@0.93', 56 * u, 13 * u, `${BX}+${0.9 * u}`, y);
      text([dt(txt('a', l1), 5.4 * u, 'white', `${BX2}+${3.8 * u}`, `${y + 1.3 * u}`, `:shadowx=${Math.round(0.2 * u)}:shadowy=${Math.round(0.2 * u)}:shadowcolor=black@0.5`),
        ...(l2 ? [dt(txt('b', l2), 3.3 * u, acc, `${BX2}+${3.8 * u}+${4 * u}*(1-${Fb(0.3)})`, `${y + 8 * u}`)] : [])]);
    } else if (id === 'pseudo') { // pack Réseaux : @pseudo dans une pastille
      const BX = `(-${W * 0.5}+(${5 * u}+${W * 0.5})*${F})`;
      text([dt(txt('a', l1), 5 * u, 'white', BX, `${H * 0.8}`, `:box=1:boxcolor=${acc}@0.96:boxborderw=${Math.round(2 * u)}`)]);
    } else if (id === 'etiquette') { // pack Réseaux : étiquette qui pop au centre-haut
      text([dt(txt('a', l1.toUpperCase()), 5 * u, 'white', '(w-text_w)/2', `${H * 0.12}`, `:alpha='${F}':box=1:boxcolor=${acc}@0.97:boxborderw=${Math.round(2.2 * u)}`)]);
    } else if (id === 'double') { // pack Journal : deux barres de couleurs
      const BX = `(-${W * 0.8}+(${3 * u}+${W * 0.8})*${Fb(0)})`, BX2 = `(-${W * 0.8}+(${3 * u}+${W * 0.8})*${Fb(0.12)})`, y = H * 0.72;
      box(acc, 64 * u, 7.2 * u, BX, y); box('0xffffff@0.97', 54 * u, 6.6 * u, `${BX2}`, y + 7.2 * u);
      text([dt(txt('a', l1), 4.6 * u, 'white', `${BX}+${2.4 * u}`, `${y + 1.3 * u}`),
        ...(l2 ? [dt(txt('b', l2), 3.6 * u, '0x10131f', `${BX2}+${2.4 * u}`, `${y + 8.4 * u}`)] : [])]);
    } else if (id === 'cine-titre') { // pack Cinéma : bandes noires qui entrent et titre espacé
      const hb = H * 0.12;
      box('black', W, hb, '0', `-${hb}+${hb}*${F}`); box('black', W, hb, '0', `${H}-${hb}*${F}`);
      text([dt(txt('a', l1.toUpperCase().split('').join(' ')), 6.6 * u, 'white', '(w-text_w)/2', `${H * 0.5 - 4 * u}`, `:alpha='${F}'`),
        ...(l2 ? [dt(txt('b', l2), 3 * u, acc, '(w-text_w)/2', `${H * 0.5 + 6 * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'glitch-titre') { // pack Glitch : trois copies décalées qui tremblent
      const j = (k, a) => `(w-text_w)/2+${a}*${u}*sin(${T}*${k})*gt(mod(floor(${T}*9),3),0)`;
      text([dt(txt('a', l1), 11 * u, '0xff2d55@0.85', j(41, 0.7), `${H * 0.45}+0.3*${u}`, `:alpha='${F}'`),
        dt(txt('b', l1), 11 * u, '0x00e5ff@0.85', j(53, -0.7), `${H * 0.45}-0.3*${u}`, `:alpha='${F}'`),
        dt(txt('c', l1), 11 * u, 'white', '(w-text_w)/2', `${H * 0.45}`, `:alpha='${F}'`)]);
    } else if (id === 'impact-titre') { // pack Impact : gros titre sur boîte, léger tremblement
      text([dt(txt('a', l1.toUpperCase()), 14 * u, 'white', `(w-text_w)/2+${0.35 * u}*sin(${T}*60)*(1-${F})`, `${H * 0.42}`, `:alpha='${F}':box=1:boxcolor=${acc}@0.97:boxborderw=${Math.round(2.4 * u)}`),
        ...(l2 ? [dt(txt('b', l2.toUpperCase()), 3.4 * u, 'white', '(w-text_w)/2', `${H * 0.42 + 21 * u}`, `:alpha='${F}':borderw=2:bordercolor=black@0.7`)] : [])]);
    } else if (id === 'cadre-titre') { // pack Doux : titre dans un cadre fin
      const bw = W * 0.62, bh = 22 * u, x = `(W-${bw})/2`, y = `${H * 0.5 - 11 * u}`, e = Math.max(2, 0.3 * u);
      box(acc, bw, e, x, y); box(acc, bw, e, x, `${H * 0.5 + 11 * u - e}`); box(acc, e, bh, x, y); box(acc, e, bh, `(W+${bw})/2-${e}`, y);
      text([dt(txt('a', l1), 8 * u, 'white', '(w-text_w)/2', `${H * 0.5 - 6 * u}`, `:alpha='${F}'`),
        ...(l2 ? [dt(txt('b', l2), 3.4 * u, acc, '(w-text_w)/2', `${H * 0.5 + 4.6 * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'jour') { // pack Vlog : « JOUR 3 » et le lieu, à gauche
      const BX = `(-${W * 0.6}+(${8 * u}+${W * 0.6})*${Fb(0.06)})`, BX2 = `(-${W * 0.6}+(${8 * u}+${W * 0.6})*${Fb(0.22)})`, BX0 = `(-${W * 0.6}+(${8 * u}+${W * 0.6})*${Fb(0)})`, y = H * 0.38;
      box(acc, 11 * u, Math.max(3, 0.9 * u), BX0, y - 2.4 * u);
      text([dt(txt('a', l1.toUpperCase()), 12 * u, 'white', BX, `${y}`, `:shadowx=${Math.round(0.25 * u)}:shadowy=${Math.round(0.25 * u)}:shadowcolor=black@0.45`),
        ...(l2 ? [dt(txt('b', l2), 4 * u, 'white@0.92', BX2, `${y + 14.5 * u}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.5`)] : [])]);
    } else if (id === 'lieu-vlog') { // pack Vlog : repère carré d'accent et nom du lieu, en bas à gauche
      const BX = `(-${W * 0.6}+(${6 * u}+${W * 0.6})*${Fb(0)})`, BX2 = `(-${W * 0.6}+(${6 * u}+${W * 0.6})*${Fb(0.16)})`, y = H * 0.8;
      box(acc, 2.6 * u, 2.6 * u, BX, y + 0.6 * u);
      text([dt(txt('a', l1.toUpperCase().split('').join(' ')), 3.6 * u, 'white', `${BX}+${4.2 * u}`, `${y}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.55`),
        ...(l2 ? [dt(txt('b', l2), 2.6 * u, 'white@0.85', `${BX2}+${4.2 * u}`, `${y + 4.6 * u}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.5`)] : [])]);
    } else if (id === 'rec') { // pack Vlog : point REC qui clignote et chronomètre de la prise, en haut à gauche
      const size = 3.6 * u, tc = `r${idx}rec.txt`; fs.writeFileSync(path.join(dir, tc), 'REC  %{pts:hms}');
      box('0xff2d2d', 1.9 * u, 1.9 * u, `${5 * u}`, `${6.1 * u}`);
      const out = lab(); f.push(`[${cur}]drawtext=${font}:textfile=${tc}:expansion=normal:fontsize=${Math.round(size)}:fontcolor=white:x=${Math.round(8.4 * u)}:y=${Math.round(5.4 * u)}:shadowx=2:shadowy=2:shadowcolor=black@0.55:${en}[${out}]`); cur = out;
    } else if (id === 'numero') { // pack Vlog : numéro de chapitre, trait et titre
      const BX = `(-${W * 0.6}+(${7 * u}+${W * 0.6})*${Fb(0)})`, BX2 = `(-${W * 0.6}+(${7 * u}+${W * 0.6})*${Fb(0.18)})`, y = H * 0.7;
      box(acc, Math.max(3, 0.5 * u), 12 * u, `${BX2}+${18 * u}`, y);
      text([dt(txt('a', l1), 12 * u, acc, BX, `${y - 0.8 * u}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.4`),
        ...(l2 ? [dt(txt('b', l2.toUpperCase()), 4.4 * u, 'white', `${BX2}+${20.5 * u}`, `${y + 3.6 * u}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.55`)] : [])]);
    } else if (id === 'episode') { // pack Podcast : étiquette d'épisode et titre sur deux lignes
      const BX = `(-${W * 0.7}+(${8 * u}+${W * 0.7})*${Fb(0)})`, BX2 = `(-${W * 0.7}+(${8 * u}+${W * 0.7})*${Fb(0.15)})`, y = H * 0.36;
      text([dt(txt('a', l1.toUpperCase()), 3.6 * u, 'white', BX, `${y}`, `:box=1:boxcolor=${acc}@0.96:boxborderw=${Math.round(1.5 * u)}`),
        ...(l2 ? [dt(txt('b', wrap(l2, Math.floor(W * 0.62 / (7.2 * u * 0.56)))), 7.2 * u, 'white', BX2, `${y + 8.4 * u}`, `:line_spacing=${Math.round(1 * u)}:shadowx=${Math.round(0.2 * u)}:shadowy=${Math.round(0.2 * u)}:shadowcolor=black@0.5`)] : [])]);
    } else if (id === 'invite') { // pack Podcast : carte d'invité (étiquette, nom, fonction)
      const BX = `(-${W * 0.7}+(${5 * u}+${W * 0.7})*${Fb(0)})`, BX2 = `(-${W * 0.7}+(${5 * u}+${W * 0.7})*${Fb(0.14)})`, y = H * 0.7;
      box('0x0b0f1c@0.92', 54 * u, 17 * u, BX, y); box(acc, 1.1 * u, 17 * u, BX, y);
      text([dt(txt('t', 'INVITÉ·E'), 2.3 * u, acc, `${BX2}+${3.4 * u}`, `${y + 1.6 * u}`),
        dt(txt('a', l1), 5.6 * u, 'white', `${BX2}+${3.4 * u}`, `${y + 4.6 * u}`),
        ...(l2 ? [dt(txt('b', l2), 3 * u, '0xc9ced9', `${BX2}+${3.4 * u}`, `${y + 11.6 * u}`)] : [])]);
    } else if (id === 'sponsor') { // pack Podcast / Pro : bandeau fin de partenaire
      const bh = 9 * u, y = H - bh - 3 * u;
      box('0x000000@0.62', W, bh, '0', `${y}+${bh}*(1-${F})`);
      text([dt(txt('a', 'AVEC LE SOUTIEN DE'), 2 * u, acc, '(w-text_w)/2', `${y + 1.3 * u}`, `:alpha='${F}'`),
        dt(txt('b', l1), 3.8 * u, 'white', '(w-text_w)/2', `${y + 3.6 * u}`, `:alpha='${F}'`)]);
    } else if (id === 'abonne') { // pack Podcast / Vlog : pastille d'abonnement en bas à droite
      const BX = `(${W}+(${-W * 0.5 - 6 * u})*${Fb(0)})`;
      text([dt(txt('t', 'ABONNE-TOI'), 3.4 * u, 'white', `${BX}`, `${H * 0.84}`, `:box=1:boxcolor=${acc}@0.97:boxborderw=${Math.round(1.4 * u)}`),
        ...(l1 ? [dt(txt('a', l1), 4 * u, 'white', `${BX}`, `${H * 0.84 + 7.6 * u}`, `:box=1:boxcolor=0x0b0f1c@0.9:boxborderw=${Math.round(1.2 * u)}`)] : [])]);
    } else if (id === 'etape') { // pack Tuto : pastille numérotée et titre d'étape
      const BX = `(-${W * 0.5}+(${6 * u}+${W * 0.5})*${Fb(0)})`, BX2 = `(-${W * 0.5}+(${6 * u}+${W * 0.5})*${Fb(0.14)})`, y = H * 0.07;
      box(acc, 9 * u, 9 * u, BX, y);
      text([dt(txt('a', l1), 6.4 * u, 'white', `${BX}+(${9 * u}-text_w)/2`, `${y + 1.2 * u}`),
        dt(txt('t', 'ÉTAPE'), 2.2 * u, acc, `${BX2}+${11 * u}`, `${y - 0.2 * u}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.5`),
        ...(l2 ? [dt(txt('b', l2), 4.4 * u, 'white', `${BX2}+${11 * u}`, `${y + 3 * u}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.55`)] : [])]);
    } else if (id === 'astuce') { // pack Tuto / Pro : encadré d'astuce
      const BX = `(-${W * 0.6}+(${5 * u}+${W * 0.6})*${Fb(0)})`, BX2 = `(-${W * 0.6}+(${5 * u}+${W * 0.6})*${Fb(0.14)})`, y = H * 0.66, bw = 52 * u, lignes = wrap(l1, Math.floor(bw * 0.9 / (3.4 * u * 0.56)));
      box('0x0b0f1c@0.93', bw, 21 * u, BX, y); box(acc, bw, 0.9 * u, BX, y);
      text([dt(txt('t', 'ASTUCE'), 2.4 * u, acc, `${BX2}+${2.4 * u}`, `${y + 2.4 * u}`),
        dt(txt('a', lignes), 3.4 * u, 'white', `${BX2}+${2.4 * u}`, `${y + 6.4 * u}`, `:line_spacing=${Math.round(0.7 * u)}`)]);
    } else if (id === 'rubrique') { // pack Podcast / Pro : étiquette de rubrique en haut à gauche
      const BX = `(-${W * 0.4}+(${5 * u}+${W * 0.4})*${Fb(0)})`;
      box(acc, 22 * u, Math.max(3, 0.45 * u), BX, `${H * 0.07 + 6.6 * u}`);
      text([dt(txt('a', l1.toUpperCase().split('').join(' ')), 3 * u, 'white', BX, `${H * 0.07}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.55`)]);
    } else if (id === 'chiffre') { // pack Pro : gros chiffre et légende
      text([dt(txt('a', l1), 22 * u, acc, '(w-text_w)/2', `${H * 0.34}+${3 * u}*(1-${Fb(0)})`, `:alpha='${F}':shadowx=${Math.round(0.4 * u)}:shadowy=${Math.round(0.4 * u)}:shadowcolor=black@0.45`),
        ...(l2 ? [dt(txt('b', l2), 4.2 * u, 'white', '(w-text_w)/2', `${H * 0.34 + 26 * u}`, `:alpha='${F}':shadowx=2:shadowy=2:shadowcolor=black@0.5`)] : [])]);
    } else if (id === 'cours-hausse' || id === 'cours-baisse') { // pack Bourse : carte de cours (nom, valeur, variation) ; l2 = « valeur  variation »
      const BX = `(-${W * 0.6}+(${5 * u}+${W * 0.6})*${Fb(0)})`, BX2 = `(-${W * 0.6}+(${5 * u}+${W * 0.6})*${Fb(0.14)})`, y = H * 0.72, col = id === 'cours-hausse' ? '0x19d38a' : '0xff4d5e';
      const [val, ...rest] = l2.split(/\s{2,}|\s\|\s/); box('0x0b0f1c@0.94', 62 * u, 15 * u, BX, y); box(col, 1 * u, 15 * u, BX, y);
      text([dt(txt('a', l1.toUpperCase()), 2.6 * u, '0xaab2c5', `${BX2}+${3.2 * u}`, `${y + 1.6 * u}`),
        dt(txt('b', val || ''), 6.4 * u, 'white', `${BX2}+${3.2 * u}`, `${y + 4.6 * u}`),
        dt(txt('c', rest.join('  ')), 3.8 * u, col, `${BX2}+${40 * u}`, `${y + 7.6 * u}`)]);
    } else if (id === 'bourse-defile') { // pack Bourse : bandeau des marchés qui défile
      const bh = 7 * u, y = H * 0.9, lw = 22 * u;
      box('0x0a1224@0.96', W, bh, '0', y);
      text([dt(txt('a', l1), 3.2 * u, 'white', `${W}-mod(${T}*${W * 0.11}\,${W}+text_w)`, `${y + 1.9 * u}`)]);
      box(acc, lw, bh, '0', y);
      text([dt(txt('b', l2 || 'MARCHÉS'), 3 * u, 'white', `(${lw}-text_w)/2`, `${y + 2 * u}`)]);
    } else if (id === 'avertissement' || id === 'avertissement-sante') { // Bourse / Pro : mention obligatoire, en bas, sur toute la durée
      const lignes = wrap(l1, Math.floor(W * 0.9 / (2.3 * u * 0.55))), bh = 11 * u, y = H - bh;
      box('0x000000@0.66', W, bh, '0', y);
      text([dt(txt('a', lignes), 2.3 * u, 'white@0.92', '(w-text_w)/2', `${y + 2.2 * u}`, `:line_spacing=${Math.round(0.5 * u)}`)]);
    } else if (id === 'hud') { // pack Tech : titre entre quatre angles lumineux (viseur)
      const bw = W * 0.5, bh = 24 * u, x0 = `(W-${bw})/2`, y0 = `${H * 0.5 - 12 * u}`, e = Math.max(3, 0.5 * u), L = 5 * u;
      const k = Fb(0), dx = `${(W * 0.08).toFixed(1)}*(1-${k})`;
      for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [`${x0}+${bw}-${L}`, y0, -1, 1], [x0, `${y0}+${bh}-${e}`, 1, -1], [`${x0}+${bw}-${L}`, `${y0}+${bh}-${e}`, -1, -1]]) { box(acc, L, e, `${cx}${sx > 0 ? '-' : '+'}${dx}`, `${cy}`); }
      for (const [cx, cy] of [[x0, y0], [`${x0}+${bw}-${e}`, y0], [x0, `${y0}+${bh}-${L}`], [`${x0}+${bw}-${e}`, `${y0}+${bh}-${L}`]]) box(acc, e, L, `${cx}`, `${cy}`);
      text([dt(txt('a', l1.toUpperCase()), 7 * u, 'white', '(w-text_w)/2', `${H * 0.5 - 4.4 * u}`, `:alpha='${F}':shadowx=2:shadowy=2:shadowcolor=black@0.5`),
        ...(l2 ? [dt(txt('b', l2.toUpperCase().split('').join(' ')), 2.6 * u, acc, '(w-text_w)/2', `${H * 0.5 + 5.6 * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'barres') { // pack Économie : histogramme animé (l1 = valeurs séparées par des virgules, l2 = légende)
      const vals = l1.split(/[,;\s]+/).map(Number).filter(Number.isFinite).slice(0, 8), n = Math.max(1, vals.length), mx = Math.max(...vals, 1), bwid = 8 * u, gap = 3 * u;
      const total = n * bwid + (n - 1) * gap, x0 = (W - total) / 2, base = H * 0.66, hmax = 32 * u;
      vals.forEach((v, i) => {
        const hh = Math.max(2, Math.round(hmax * v / mx)), src = lab(), out = lab(), e = ease(S + 0.12 * i, 0.7), last = i === n - 1;
        f.push(`color=c=${last ? acc : '0x8fa3d9'}:s=${even(bwid)}x${even(hh)}:r=${fps},format=rgba,scale=w=${even(bwid)}:h='max(2,${even(hh)}*${e})':eval=frame[${src}]`);
        f.push(`[${cur}][${src}]overlay=x='${Math.round(x0 + i * (bwid + gap))}':y='${Math.round(base)}-h':shortest=1:format=auto:${en}[${out}]`); cur = out;
      });
      box('0xffffff@0.7', total + 4 * u, Math.max(2, 0.3 * u), `${Math.round(x0 - 2 * u)}`, `${Math.round(base)}`);
      if (l2) text([dt(txt('b', l2), 3.6 * u, 'white', '(w-text_w)/2', `${Math.round(base + 2.4 * u)}`, `:alpha='${F}':shadowx=2:shadowy=2:shadowcolor=black@0.5`)]);
    } else if (id === 'prix') { // pack Immobilier : carte de prix (l1 = prix, l2 = étiquette)
      const BX = `(-${W * 0.6}+(${5 * u}+${W * 0.6})*${Fb(0)})`, BX2 = `(-${W * 0.6}+(${5 * u}+${W * 0.6})*${Fb(0.14)})`, y = H * 0.7;
      box('0x0b0f1c@0.94', 58 * u, 17 * u, BX, y); box(acc, 1.1 * u, 17 * u, BX, y);
      text([dt(txt('t', (l2 || 'À VENDRE').toUpperCase()), 2.5 * u, acc, `${BX2}+${3.4 * u}`, `${y + 1.8 * u}`),
        dt(txt('a', l1), 8.4 * u, 'white', `${BX2}+${3.4 * u}`, `${y + 5.4 * u}`)]);
    } else if (id === 'caracteristiques') { // pack Immobilier : trois pastilles (l1 = « T3 | 68 m² | Balcon »)
      const items = l1.split('|').map(x => x.trim()).filter(Boolean).slice(0, 4), n = Math.max(1, items.length);
      text(items.map((it, i) => dt(txt('c' + i, it), 3.8 * u, 'white', `${W * (i + 0.5) / n}-text_w/2`, `${H * 0.84}+${4 * u}*(1-${Fb(0.12 * i)})`, `:alpha='${F}':box=1:boxcolor=0x0b0f1c@0.9:boxborderw=${Math.round(1.6 * u)}`)));
    } else if (id === 'liste') { // pack Santé / École / Pro : liste à puces qui apparaissent une à une (l1 = lignes, l2 = titre)
      const items = l1.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 5), parts = [];
      if (l2) parts.push(dt(txt('t', l2.toUpperCase()), 3 * u, acc, `${8 * u}`, `${H * 0.26}`, `:alpha='${F}'`));
      items.forEach((it, i) => {
        const X = `(-${W * 0.5}+(${8 * u}+${W * 0.5})*${Fb(0.2 * i)})`, yy = H * 0.34 + i * 10 * u;
        box(acc, 2.2 * u, 2.2 * u, X, `${yy + 1.2 * u}`);
        parts.push(dt(txt('i' + i, it), 4.6 * u, 'white', `${X}+${4.4 * u}`, `${yy}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.55`));
      });
      text(parts);
    } else if (id === 'verset') { // pack Église : texte centré, filets dorés, référence
      const lignes = wrap(l1, Math.floor(W * 0.74 / (5 * u * 0.54))), nl = lignes.split('\n').length, y0 = H * 0.5 - (nl * 3.4 + 4) * u;
      box(acc, 14 * u, Math.max(2, 0.3 * u), '(W-w)/2', `${y0 - 3 * u}+${3 * u}*(1-${F})`);
      text([dt(txt('a', lignes), 5 * u, 'white', '(w-text_w)/2', `${y0}`, `:alpha='${F}':line_spacing=${Math.round(1.2 * u)}:shadowx=2:shadowy=2:shadowcolor=black@0.6`),
        ...(l2 ? [dt(txt('b', '— ' + l2), 3.2 * u, acc, '(w-text_w)/2', `${y0 + (nl * 6.6 + 3) * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'promo') { // pack Mode et beauté : pastille de promotion en haut à droite
      text([dt(txt('a', l1), 11 * u, 'white', `w-text_w-8*${u}`, `${H * 0.1}-${22 * u}*(1-${Fb(0)})`, `:box=1:boxcolor=${acc}@0.97:boxborderw=${Math.round(2.4 * u)}`),
        ...(l2 ? [dt(txt('b', l2.toUpperCase()), 3 * u, 'white', `w-text_w-8*${u}`, `${H * 0.1 + 17 * u}-${22 * u}*(1-${Fb(0.1)})`, `:box=1:boxcolor=0x0b0f1c@0.92:boxborderw=${Math.round(1 * u)}`)] : [])]);
    } else if (id === 'intro-vlog') { // pack Vlog : accroche (l2) et grand nom du lieu (l1) qui montent avec rebond, trait qui s'étire, date
      const y = H * 0.4, X = '(w-text_w)/2';
      const bw = even(W * 0.22), bh = even(Math.max(4, 0.7 * u)), src = lab(), out = lab();
      f.push(`color=c=${acc}:s=${bw}x${bh}:r=${fps},format=rgba,scale=w='max(2,${bw}*${ease(S + 0.5, 0.8)})':h=${bh}:eval=frame[${src}]`);
      f.push(`[${cur}][${src}]overlay=x='(W-w)/2':y='${Math.round(y + 19 * u)}':shortest=1:format=auto:${en}[${out}]`); cur = out;
      text([dt(txt('t', (l2 || 'BIENVENUE À').toUpperCase().split('').join(' ')), 3.2 * u, acc, X, `${y - 4.4 * u}+${6 * u}*(1-${Fb(0)})`, `:alpha='${F}':shadowx=2:shadowy=2:shadowcolor=black@0.55`),
        dt(txt('a', l1.toUpperCase()), 13 * u, 'white', X, `${y}+${9 * u}*(1-${Fb(0.12)})`, `:alpha='${F}':shadowx=${Math.round(0.35 * u)}:shadowy=${Math.round(0.35 * u)}:shadowcolor=black@0.5`)]);
    } else if (id === 'trajet') { // pack Vlog : trajet « départ → arrivée » (l1 = départ, l2 = arrivée), trait qui se dessine entre deux points
      const larg = 44 * u, x0 = (W - larg) / 2, y = H * 0.8, bh = even(Math.max(3, 0.55 * u)), src = lab(), out = lab();
      f.push(`color=c=white@0.9:s=${even(larg)}x${bh}:r=${fps},format=rgba,scale=w='max(2,${even(larg)}*${ease(S + 0.3, 1.1)})':h=${bh}:eval=frame[${src}]`);
      f.push(`[${cur}][${src}]overlay=x='${Math.round(x0)}':y='${Math.round(y)}':shortest=1:format=auto:${en}[${out}]`); cur = out;
      box(acc, 2.4 * u, 2.4 * u, `${x0 - 1.2 * u}`, `${y - 1.1 * u}`);
      box(acc, 2.4 * u, 2.4 * u, `${x0 + larg - 1.2 * u}-${larg}*(1-${ease(S + 0.3, 1.1)})*0+0`, `${y - 1.1 * u}`);
      text([dt(txt('a', l1.toUpperCase()), 3.4 * u, 'white', `${x0 - 1.2 * u}`, `${y - 7 * u}`, `:alpha='${F}':shadowx=2:shadowy=2:shadowcolor=black@0.55`),
        dt(txt('b', (l2 || '').toUpperCase()), 3.4 * u, 'white', `${x0 + larg + 1.2 * u}-text_w`, `${y - 7 * u}`, `:alpha='${ease(S + 1.1, 0.5)}':shadowx=2:shadowy=2:shadowcolor=black@0.55`)]);
    } else if (id === 'temps') { // pack Vlog : date et heure façon caméscope, en bas à droite
      text([dt(txt('a', l1.toUpperCase()), 3.4 * u, 'white', `w-text_w-6*${u}`, `${H * 0.88}`, `:alpha='${F}':shadowx=2:shadowy=2:shadowcolor=black@0.6`),
        ...(l2 ? [dt(txt('b', l2), 3.4 * u, 'white', `w-text_w-6*${u}`, `${H * 0.88 + 4.2 * u}`, `:alpha='${F}':shadowx=2:shadowy=2:shadowcolor=black@0.6`)] : [])]);
    } else if (id === 'now-playing') { // pack Vlog / Podcast : « en ce moment » avec égaliseur animé (l1 = titre, l2 = artiste)
      const BX = `(-${W * 0.5}+(${5 * u}+${W * 0.5})*${Fb(0)})`, BX2 = `(-${W * 0.5}+(${5 * u}+${W * 0.5})*${Fb(0.12)})`, y = H * 0.08;
      box('0x0b0f1c@0.92', 44 * u, 11 * u, BX, y); box(acc, 1 * u, 11 * u, BX, y);
      for (let k = 0; k < 4; k++) {
        const src = lab(), out = lab(), bw = even(1.5 * u), top = Math.round(y + 8.4 * u), hh = `max(2,${(5 * u).toFixed(1)}*(0.55+0.45*sin(${T}*${(7 + 2.3 * k).toFixed(1)}+${k * 1.7})))`;
        f.push(`color=c=${acc}:s=${bw}x${even(6 * u)}:r=${fps},format=rgba,scale=w=${bw}:h='${hh}':eval=frame[${src}]`);
        f.push(`[${cur}][${src}]overlay=x='${BX}+${(2.6 + k * 2.2) * u}':y='${top}-h':shortest=1:format=auto:${en}[${out}]`); cur = out;
      }
      text([dt(txt('t', 'EN CE MOMENT'), 2 * u, acc, `${BX2}+${12.5 * u}`, `${y + 1.4 * u}`),
        dt(txt('a', l1), 3.8 * u, 'white', `${BX2}+${12.5 * u}`, `${y + 3.8 * u}`),
        ...(l2 ? [dt(txt('b', l2), 2.7 * u, '0xc9ced9', `${BX2}+${12.5 * u}`, `${y + 8 * u}`)] : [])]);
    } else if (id === 'question') { // pack Podcast : carte de question (étiquette + texte)
      const BX = `(-${W * 0.7}+(${6 * u}+${W * 0.7})*${Fb(0)})`, BX2 = `(-${W * 0.7}+(${6 * u}+${W * 0.7})*${Fb(0.14)})`, lignes = wrap(l1, Math.floor(W * 0.6 / (5 * u * 0.55))), nl = lignes.split('\n').length, y = H * 0.5 - (nl * 3.2) * u;
      box(acc, 0.9 * u, (nl * 6.6 + 7) * u, BX, y - 1 * u);
      text([dt(txt('t', 'QUESTION'), 2.6 * u, acc, `${BX2}+${3 * u}`, `${y}`),
        dt(txt('a', lignes), 5 * u, 'white', `${BX2}+${3 * u}`, `${y + 5 * u}`, `:line_spacing=${Math.round(1.1 * u)}:shadowx=2:shadowy=2:shadowcolor=black@0.55`)]);
    } else if (id === 'plateformes') { // pack Podcast : bandeau « Écoute-nous sur… » (texte seulement, sans logos)
      const bh = 9 * u, y = H - bh - 4 * u;
      box('0x000000@0.62', W, bh, '0', `${y}+${bh}*(1-${F})`);
      text([dt(txt('a', 'ÉCOUTE-NOUS SUR'), 2 * u, acc, '(w-text_w)/2', `${y + 1.3 * u}`, `:alpha='${F}'`),
        dt(txt('b', l1), 3.6 * u, 'white', '(w-text_w)/2', `${y + 3.8 * u}`, `:alpha='${F}'`)]);
    } else if (id === 'sommaire') { // pack Podcast : chapitres horodatés (une ligne « 04:12  Titre » par chapitre)
      const items = l1.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 6), parts = [];
      parts.push(dt(txt('t', (l2 || 'AU PROGRAMME').toUpperCase()), 3 * u, acc, `${8 * u}`, `${H * 0.22}`, `:alpha='${F}'`));
      items.forEach((it, i) => {
        const m = it.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.*)$/), t0 = m ? m[1] : '', t1 = m ? m[2] : it, X = `(-${W * 0.5}+(${8 * u}+${W * 0.5})*${Fb(0.16 * i)})`, yy = H * 0.3 + i * 9 * u;
        parts.push(dt(txt('h' + i, t0), 4 * u, acc, X, `${yy + 0.4 * u}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.55`), dt(txt('i' + i, t1), 4.4 * u, 'white', `${X}+${15 * u}`, `${yy}`, `:shadowx=2:shadowy=2:shadowcolor=black@0.55`));
      });
      text(parts);
    } else if (id === 'citation-pro') { // pack Podcast : grande citation de l'invité sur panneau sombre (l1 = citation, l2 = auteur)
      const lignes = wrap(l1, Math.floor(W * 0.62 / (5.4 * u * 0.55))), nl = lignes.split('\n').length, pw = W * 0.74, ph = (nl * 7.2 + 20) * u, px = (W - pw) / 2, py = H * 0.5 - ph / 2;
      box('0x0b0f1c@0.88', pw, ph, `${px}`, `${py}+${3 * u}*(1-${F})`);
      text([dt(txt('q', '“'), 26 * u, acc, `${px + 3 * u}`, `${py - 3 * u}`, `:alpha='${F}'`),
        dt(txt('a', lignes), 5.4 * u, 'white', `${px + 9 * u}`, `${py + 8 * u}`, `:alpha='${F}':line_spacing=${Math.round(1.2 * u)}`),
        ...(l2 ? [dt(txt('b', '— ' + l2), 3.4 * u, acc, `${px + 9 * u}`, `${py + ph - 8 * u}`, `:alpha='${F}'`)] : [])]);
    } else if (id === 'courbe') { // pack Finance : courbe en aire qui se dessine de gauche à droite (l1 = valeurs séparées par des virgules, l2 = légende)
      const vals = l1.split(/[,;\s]+/).map(Number).filter(Number.isFinite).slice(0, 40);
      if (vals.length >= 2) {
        const cw = 54 * u, ch = 24 * u, x0 = (W - cw) / 2, yb = H * 0.64, N = 48, mn = Math.min(...vals), mx = Math.max(...vals), span = Math.max(1e-9, mx - mn);
        const interp = k => { const p = k / (N - 1) * (vals.length - 1), i = Math.min(vals.length - 2, Math.floor(p)), fr = p - i; return vals[i] * (1 - fr) + vals[i + 1] * fr; };
        const hauteur = k => ((interp(k) - mn) / span * 0.88 + 0.08) * ch, up = vals[vals.length - 1] >= vals[0], col = up ? '0x19d38a' : '0xff4d5e', parts = [];
        box('0x0b0f1c@0.88', cw + 8 * u, ch + 15 * u, `${x0 - 4 * u}`, `${yb - ch - 9 * u}`);
        for (let k = 0; k < N; k++) {
          const h = hauteur(k), hp = k ? hauteur(k - 1) : h, x = x0 + k * cw / N, w = cw / N + 1, tk = S + 0.25 + (k / N) * 1.5, ten = `:enable='gte(${T},${tk.toFixed(3)})*between(${T},${S},${E})'`;
          parts.push(`drawbox=x=${x.toFixed(1)}:y=${(yb - h).toFixed(1)}:w=${w.toFixed(1)}:h=${h.toFixed(1)}:color=${col}@0.26:t=fill${ten}`);
          parts.push(`drawbox=x=${x.toFixed(1)}:y=${(yb - Math.max(h, hp)).toFixed(1)}:w=${w.toFixed(1)}:h=${(Math.abs(h - hp) + Math.max(2, 0.55 * u)).toFixed(1)}:color=${col}:t=fill${ten}`);
        }
        text(parts);
        const dernier = vals[vals.length - 1], var_ = vals[0] ? ((dernier / vals[0] - 1) * 100) : 0;
        text([...(l2 ? [dt(txt('b', l2.toUpperCase()), 2.8 * u, '0xaab2c5', `${x0}`, `${yb - ch - 6 * u}`, `:alpha='${F}'`)] : []),
          dt(txt('v', (var_ >= 0 ? '+' : '−') + Math.abs(var_).toFixed(1).replace('.', ',') + ' %'), 4.6 * u, col, `${x0 + cw}-text_w`, `${yb - ch - 7 * u}`, `:alpha='${ease(S + 1.7, 0.4)}'`)]);
      }
    } else if (id === 'barres-h') { // pack Finance : classement en barres horizontales (une ligne « Nom:valeur » par barre)
      const lignes = l1.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 6).map(x => { const m = x.match(/^(.*?)[:=]\s*(-?[\d.,]+)\s*(.*)$/); return m ? { n: m[1], v: parseFloat(m[2].replace(',', '.')), u: m[3] } : null; }).filter(Boolean);
      if (lignes.length) {
        const mx = Math.max(...lignes.map(x => Math.abs(x.v)), 1e-9), lw = 23 * u, bwMax = 34 * u, x0 = (W - (lw + bwMax + 12 * u)) / 2, y0 = H * 0.4, pas = 8.2 * u;
        if (l2) text([dt(txt('t', l2.toUpperCase()), 2.8 * u, acc, `${x0}`, `${y0 - 7 * u}`, `:alpha='${F}'`)]);
        lignes.forEach((r, i) => {
          const bw = Math.max(2, Math.round(bwMax * Math.abs(r.v) / mx)), src = lab(), out = lab(), e = ease(S + 0.12 * i, 0.8), yy = y0 + i * pas, fort = Math.abs(r.v) === mx;
          f.push(`color=c=${fort ? acc : '0x7f93c9'}:s=${even(bw)}x${even(4.6 * u)}:r=${fps},format=rgba,scale=w='max(2,${even(bw)}*${e})':h=${even(4.6 * u)}:eval=frame[${src}]`);
          f.push(`[${cur}][${src}]overlay=x='${Math.round(x0 + lw)}':y='${Math.round(yy)}':shortest=1:format=auto:${en}[${out}]`); cur = out;
          text([dt(txt('n' + i, r.n), 3.6 * u, 'white', `${x0}`, `${yy + 0.2 * u}`, `:alpha='${F}':shadowx=2:shadowy=2:shadowcolor=black@0.55`),
            dt(txt('p' + i, String(r.v).replace('.', ',') + (r.u ? ' ' + r.u : '')), 3.4 * u, 'white', `${x0 + lw + bw + 1.6 * u}`, `${yy + 0.4 * u}`, `:alpha='${ease(S + 0.12 * i + 0.5, 0.4)}'`)]);
        });
      }
    } else if (id === 'compteur') { // pack Finance : gros chiffre qui défile jusqu'à sa valeur (l1 = « 12500 € »), légende en dessous
      const m = l1.match(/^([^\d-]*)(-?[\d.]+)(.*)$/), V = m ? parseFloat(m[2]) : 0, fich = `r${idx}cpt.txt`;
      fs.writeFileSync(path.join(dir, fich), (m ? m[1].replace(/%/g, '\\%') : '') + `%{eif:trunc(${V}*min(1,max(0,(t+${ctx.t0}-${S})/1.7))):d}` + (m ? m[3].replace(/%/g, '\\%') : ''));
      const out = lab(); f.push(`[${cur}]drawtext=${font}:textfile=${fich}:expansion=normal:fontsize=${Math.round(20 * u)}:fontcolor=${acc}:x=(w-text_w)/2:y=${Math.round(H * 0.36)}:shadowx=${Math.round(0.4 * u)}:shadowy=${Math.round(0.4 * u)}:shadowcolor=black@0.45:${en}[${out}]`); cur = out;
      if (l2) text([dt(txt('b', l2), 4.4 * u, 'white', '(w-text_w)/2', `${H * 0.36 + 24 * u}`, `:alpha='${ease(S + 0.4, 0.5)}':shadowx=2:shadowy=2:shadowcolor=black@0.5`)]);
    } else if (id === 'definition') { // pack Finance : carte de définition (l1 = terme, l2 = explication)
      const lignes = wrap(l2, Math.floor(50 * u / (3.6 * u * 0.56))), nl = lignes.split('\n').length, ph = (nl * 5.2 + 17) * u;
      const BX = `(-${W * 0.7}+(${5 * u}+${W * 0.7})*${Fb(0)})`, BX2 = `(-${W * 0.7}+(${5 * u}+${W * 0.7})*${Fb(0.14)})`, y = H * 0.74 - ph / 2;
      box('0x0b0f1c@0.94', 58 * u, ph, BX, y); box(acc, 1 * u, ph, BX, y);
      text([dt(txt('t', 'DÉFINITION'), 2.2 * u, acc, `${BX2}+${3.4 * u}`, `${y + 1.8 * u}`),
        dt(txt('a', l1), 5.6 * u, 'white', `${BX2}+${3.4 * u}`, `${y + 4.8 * u}`),
        dt(txt('b', lignes), 3.6 * u, '0xc9ced9', `${BX2}+${3.4 * u}`, `${y + 11.6 * u}`, `:line_spacing=${Math.round(0.8 * u)}`)]);
    } else if (id === 'risque') { // pack Finance : niveau de risque de 1 à 5 (l1 = niveau, l2 = libellé facultatif)
      const niv = clamp(Math.round(num(l1, 3)), 1, 5), mots = ['Faible', 'Modéré', 'Moyen', 'Élevé', 'Très élevé'], coul = ['0x3d8bff', '0x19d3c5', '0xffd400', '0xff9a1f', '0xff4d5e'], bwid = 7 * u, gap = 1.4 * u, total = 5 * bwid + 4 * gap, x0 = (W - total) / 2, y = H * 0.7;
      box('0x0b0f1c@0.9', total + 8 * u, 16 * u, `${x0 - 4 * u}`, `${y - 8 * u}`);
      for (let i = 0; i < 5; i++) {
        const src = lab(), out = lab(), actif = i < niv, tk = S + 0.2 + 0.16 * i;
        f.push(`color=c=${actif ? coul[i] : '0x2a3042'}:s=${even(bwid)}x${even((2.4 + i * 0.9) * u)}:r=${fps},format=rgba[${src}]`);
        f.push(`[${cur}][${src}]overlay=x='${Math.round(x0 + i * (bwid + gap))}':y='${Math.round(y + 3 * u - (2.4 + i * 0.9) * u)}':shortest=1:format=auto:enable='gte(${T},${tk.toFixed(2)})*between(${T},${S},${E})'[${out}]`); cur = out;
      }
      text([dt(txt('t', 'NIVEAU DE RISQUE'), 2.4 * u, '0xaab2c5', `${x0}`, `${y - 6.6 * u}`, `:alpha='${F}'`),
        dt(txt('a', (l2 || mots[niv - 1]).toUpperCase()), 3.2 * u, coul[niv - 1], `${x0 + total}-text_w`, `${y + 4.2 * u}`, `:alpha='${ease(S + 1, 0.4)}'`)]);
    } else if (id === 'objectif') { // pack Finance : barre de progression vers un objectif (l1 = intitulé, l2 = pourcentage atteint)
      const pct = clamp(num(l2, 60), 0, 100), cw = 54 * u, x0 = (W - cw) / 2, y = H * 0.7, bh = even(3.2 * u), src = lab(), out = lab(), fich = `r${idx}obj.txt`;
      box('0x0b0f1c@0.9', cw + 8 * u, 15 * u, `${x0 - 4 * u}`, `${y - 9 * u}`); box('0x2a3042', cw, 3.2 * u, `${x0}`, `${y}`);
      f.push(`color=c=${acc}:s=${even(cw)}x${bh}:r=${fps},format=rgba,scale=w='max(2,${even(cw)}*${pct / 100}*${ease(S + 0.3, 1.6)})':h=${bh}:eval=frame[${src}]`);
      f.push(`[${cur}][${src}]overlay=x='${Math.round(x0)}':y='${Math.round(y)}':shortest=1:format=auto:${en}[${out}]`); cur = out;
      fs.writeFileSync(path.join(dir, fich), `%{eif:trunc(${pct}*min(1,max(0,(t+${ctx.t0}-${S})/1.7))):d} \\%`);
      const o2 = lab(); f.push(`[${cur}]drawtext=${font}:textfile=${fich}:expansion=normal:fontsize=${Math.round(4.6 * u)}:fontcolor=white:x=${Math.round(x0 + cw)}-text_w:y=${Math.round(y - 7.4 * u)}:${en}[${o2}]`); cur = o2;
      text([dt(txt('a', l1), 3.6 * u, 'white', `${x0}`, `${y - 6.8 * u}`, `:alpha='${F}'`)]);
    } else if (id === 'progression') { // barre de progression de la séquence
      const bh = even(Math.max(4, 1.1 * u)), src = lab(), out = lab();
      f.push(`color=c=${acc}:s=${even(W)}x${bh}:r=${fps},format=rgba,scale=w='max(2,${even(W)}*min(1,${T}/${Math.max(0.5, eff).toFixed(2)}))':h=${bh}:eval=frame[${src}]`);
      f.push(`[${cur}][${src}]overlay=x=0:y=${l2 === 'bas' ? H - bh : 0}:shortest=1:format=auto:${en}[${out}]`); cur = out;
    } else if (id === 'generique') {
      const size = 4.4 * u, speed = H * 0.11;
      text([dt(txt('a', l1), size, 'white', '(w-text_w)/2', `h-(${T}-${S})*${speed.toFixed(1)}`, `:line_spacing=${Math.round(size * 0.6)}`)]);
    }
    return cur;
  }

  function wrap(text, max) {
    return text.split('\n').map(line => {
      const out = []; let cur = '';
      for (const w of line.split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
      out.push(cur);
      return out.join('\n');
    }).join('\n');
  }

  function sizeOf(project, mode) {
    const [a, b] = FORMATS[project.format] || FORMATS.vertical;
    const short = mode === 'proxy' ? clamp(num(project.apercuRes, 360), 360, 2160) : mode === 'thumb' ? 200 : clamp(num(project.res, 1080), 480, 2160);
    const k = short / Math.min(a, b);
    return { w: even(a * k), h: even(b * k), fps: mode === 'proxy' ? (short >= 720 ? clamp(num(project.fps, 30), 24, 60) : 24) : clamp(num(project.fps, 30), 24, 60) };
  }

  // ---------- Exportation ----------
  const jobs = new Map(), proxyJobs = new Map();
  const progressOf = (job, done, total) => d => {
    const m = d.match(/out_time_us=(\d+)/g);
    if (m) job.progress = clamp((done() + (+m[m.length - 1].split('=')[1]) / 1e6) / total, 0, 0.96);
  };

  // Cache des clips déjà encodés : empreinte = commande FFmpeg (dossier de travail neutralisé), fichiers écrits pour ce clip,
  // taille et date des médias utilisés, version de FFmpeg. Un clip inchangé n'est plus réencodé à l'export suivant.
  const CACHE_RENDU = path.join(BASE, '.cache-rendu');
  function empreinteClip(args, dir, ecrits) {
    try {
      // les fichiers écrits pour le clip (textes, sous-titres…) portent son rang dans la timeline : remplacés par leur ordre d'apparition,
      // un clip qui change de place (plan ajouté avant, prise coupée) garde la même empreinte et reste repris du cache
      let txt = JSON.stringify(args).split(dir).join('@');
      const motif = f => new RegExp(`(^|[^\\w])${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.])`, 'g');
      const ordre = ecrits.map(f => ({ f, i: txt.search(motif(f)) })).sort((a, b) => a.i - b.i || (a.f < b.f ? -1 : 1));
      ordre.forEach((x, k) => { txt = txt.replace(motif(x.f), `$1#${k}#`); });
      const h = require('crypto').createHash('sha1').update('v2|' + version + '|' + txt);
      for (const x of ordre) h.update('|#|').update(fs.readFileSync(path.join(dir, x.f)));
      for (const a of args) if (typeof a === 'string' && path.isAbsolute(a) && !a.startsWith(dir)) { const st = fs.statSync(a); h.update(`|${a}|${st.size}|${st.mtimeMs}`); }
      return h.digest('hex');
    } catch (e) { return null; } // fichier introuvable : pas de cache pour ce clip
  }
  // garde au plus 4 Go de clips, les plus récemment utilisés
  function nettoyerCache(max = 4e9) {
    try {
      const l = fs.readdirSync(CACHE_RENDU).filter(f => f.endsWith('.mp4')).map(f => { const st = fs.statSync(path.join(CACHE_RENDU, f)); return { f, t: st.mtimeMs, n: st.size }; }).sort((a, b) => b.t - a.t);
      let cumul = 0; for (const x of l) { cumul += x.n; if (cumul > max) fs.rmSync(path.join(CACHE_RENDU, x.f), { force: true }); }
    } catch (e) { /* pas encore de cache */ }
  }
  // Longs clips « simples » (sans effet, titre, incrustation ni image clé) : découpés en morceaux d'environ deux minutes, encodés en même temps
  // (la puce vidéo gère plusieurs flux) puis recollés sans réencoder ; un morceau inchangé est aussi repris du cache au prochain export.
  // Les sous-titres et fondus sont répartis sur les morceaux : le résultat est identique au clip entier.
  // effets qui ne dépendent pas du temps (couleurs, looks, netteté, grain…) : identiques d'un morceau à l'autre, le long clip peut être découpé
  const TEMPOREL = /\b(deshake|vidstab\w*|zoompan|tmix|minterpolate|fade|loop|setpts|reverse|tblend|deflicker|framestep|random|tpad|trim|xfade|fps|mpdecimate|lagfun|amplify|atadenoise|tmedian)\b/;
  const sansTemps = new Map();
  const fxSansTemps = e => {
    if (!e || !e.id) return true;
    if (!sansTemps.has(e.id)) {
      const d = FX.VIDEO.find(x => x.id === e.id); let f = null;
      try { f = d ? d.make(FX.defaults(d), { W: 1920, H: 1080, fps: 30, eff: 200, t0: 0 }) : null; } catch (er) { f = null; }
      sansTemps.set(e.id, typeof f === 'string' && !TEMPOREL.test(f) && !/[(*+\-\/,]\s*(t|n)\s*[)*+\-\/,]|\(t\)|\bsin\(|\bcos\(/.test(f));
    }
    return sansTemps.get(e.id);
  };
  function morceauxDe(clips) {
    const L = +process.env.QM_MORCEAU || 120, out = [];
    for (const c of clips) {
      const eff = (num(c.out, 0) - num(c.in, 0)) / (num(c.speed, 1) || 1);
      // calques, titre et texte suivent les morceaux (ils continuent là où ils en étaient) : une longue prise avec un « Breaking news »
      // ou l'ambiance d'un pack s'encode aussi en morceaux parallèles
      const simple = c.kind === 'video' && num(c.speed, 1) === 1 && eff >= L * 1.6 && (c.fx || []).every(fxSansTemps) && !(c.key && c.key.on && c.key.bgType === 'file' && c.key.bgKind === 'video') && !c.viz
        && !(Array.isArray(c.cadrage) && c.cadrage.length) && !c.bgFile && !c.sonDetache;
      if (!simple || process.env.QM_SANS_MORCEAUX) { out.push(c); continue; }
      // limites calées sur des repères fixes de la vidéo d'origine (toutes les L secondes) : raccourcir le début ou la fin,
      // ou couper la prise en deux, ne change que les morceaux touchés ; les autres sont repris du cache (aperçu et export)
      const i0 = num(c.in, 0), bornes = [0];
      for (let x = Math.ceil((i0 + L * 0.3) / L) * L; x < i0 + eff - L * 0.3; x += L) bornes.push(+(x - i0).toFixed(3));
      bornes.push(eff);
      const n = bornes.length - 1, fo = fonduxDe(c, eff);
      for (let k = 0; k < n; k++) {
        const a = bornes[k], b = bornes[k + 1], d = { ...c };
        d.in = +(i0 + a).toFixed(3); d.out = k === n - 1 ? num(c.out, 0) : +(i0 + b).toFixed(3);
        d.fade = false; d.fadeIn = k === 0 ? fo.e : 0; d.fadeOut = k === n - 1 ? fo.s : 0;
        d.microE = k === 0; d.microS = k === n - 1; // raccords internes du découpage : pas de fondu sonore
        d.transition = k === n - 1 ? c.transition : null;
        d.subs = (c.subs || []).filter(x => x && num(x.e, 0) > a && num(x.s, 0) < b).map(x => ({ ...x, s: +Math.max(0, num(x.s, 0) - a).toFixed(3), e: +(Math.min(num(x.e, 0), b) - a).toFixed(3) }));
        d.overlays = [];
        for (const o of c.overlays || []) {
          if (!o) continue;
          const s0 = num(o.start, 0), D = num(o.dur, 0) > 0 ? num(o.dur, 0) : Infinity, deb = Math.max(s0, a), fin = Math.min(s0 + D, b);
          if (fin - deb < 0.05) continue;
          d.overlays.push({ ...o, start: +(deb - a).toFixed(3), dur: D === Infinity ? 0 : +(fin - deb).toFixed(3), ...(deb > s0 + 0.01 ? { ss: +(num(o.ss, 0) + deb - s0).toFixed(3), anim: 'none' } : {}) });
        }
        // titre et texte du clip : dans les morceaux où ils sont visibles ; déjà commencés, ils continuent sans rejouer leur entrée
        // (deja / textDeja : temps déjà affiché ; leur durée reste celle d'origine, comptée depuis leur début)
        if (c.titre) {
          const ts = num(c.titre.start, 0), D = num(c.titre.dur, 0) > 0 ? num(c.titre.dur, 0) : Infinity;
          d.titre = ts + D > a && ts < b ? (ts >= a ? { ...c.titre, start: +(ts - a).toFixed(3) } : { ...c.titre, start: 0, deja: +(num(c.titre.deja, 0) + a - ts).toFixed(3) }) : null;
        }
        if (c.text) {
          const ts = num(c.textStart, 0), D = num(c.textDur, 0) > 0 ? num(c.textDur, 0) : Infinity;
          if (ts + D > a && ts < b) { if (ts >= a) d.textStart = +(ts - a).toFixed(3); else { d.textStart = 0; d.textDeja = +(num(c.textDeja, 0) + a - ts).toFixed(3); } }
          else d.text = '';
        }
        d.morceau = true; out.push(d);
      }
    }
    return out;
  }
  async function exportProject(job, project, { proxy } = {}) {
    job.debut = Date.now();
    const clipsBruts = (project.clips || []).filter(c => c && (c.file || c.kind === 'solid'));
    if (!clipsBruts.length) throw new Error('La timeline est vide.');
    const clips = morceauxDe(clipsBruts); job.morceaux = clips.length - clipsBruts.length;
    for (const c of clips) await calquesEnBoucle(c);
    const tropSous = clips.filter(c => (c.subs || []).filter(x => x && String(x.t || '').trim()).length > 5000).length;
    if (tropSous) job.avertissement = `${tropSous > 1 ? `${tropSous} clips ont` : 'Un clip a'} plus de 5 000 sous-titres : seuls les 5 000 premiers sont affichés. Coupe ce long clip en deux (touche S) pour tous les voir.`;
    const P = sizeOf(project, proxy ? 'proxy' : 'full');
    // fichiers disparus : un message clair (quel clip, que faire) plutôt qu'une erreur de FFmpeg
    const absents = [...new Set(clips.filter(c => c.file && c.kind !== 'solid' && !/^(lib|pack):/.test(c.file)).map(c => c.file).filter(f => !fs.existsSync(mediaPath(f))))];
    if (absents.length) throw new Error(`${absents.length > 1 ? 'Ces fichiers sont' : 'Ce fichier est'} introuvable${absents.length > 1 ? 's' : ''} dans tes médias : ${absents.slice(0, 3).join(', ')}. Retire le clip concerné de la timeline (clic droit → Supprimer) ou remets le fichier dans le dossier Movies/QuentMovie/medias.`);
    const dir = fs.mkdtempSync(path.join(TMP, 'job-'));
    job.dir = dir;
    if (proxy && project.fond) dossiersBasse.add(dir);
    // fichiers intermédiaires supprimés dès qu'ils ne servent plus (un montage de 36 min en 1080p en laissait plus de 15 Go à la fois)
    const jeter = (...noms) => { for (const n of noms) { try { fs.unlinkSync(path.join(dir, n)); } catch (e) { /* déjà retiré */ } } };
    const jeterSi = (re, garder = []) => { try { for (const n of fs.readdirSync(dir)) if (re.test(n) && !garder.includes(n)) jeter(n); } catch (e) { /* dossier absent */ } };
    try {
      // puce vidéo du Mac (VideoToolbox) pour l'encodage quand « rapide » est choisi (réglage par défaut sur Mac)
      // aperçu de 720p et plus : puce vidéo aussi (rapide jusqu'en 4K)
      const mac = process.platform === 'darwin';
      const vt = mac && encoders.has('h264_videotoolbox') && (proxy ? P.h >= 720 && P.w >= 720 : project.quality !== 'haute');
      const opts = (i, avecPuce) => ({ tdir: { dir, idx: i }, proxy, vt: avecPuce && vt, vtMax: project.quality === 'max', hw: avecPuce && mac && hwaccels.has('videotoolbox') });
      // chaque clip est construit seul, pour savoir quels fichiers (textes des titres…) il a écrits : ils entrent dans son empreinte
      const built = [], cles = [];
      // « égaliser » : un gain fixe par vidéo d'origine (mesurée une fois en entier, résultat gardé), le même pour tous ses morceaux :
      // les phrases gardent leurs nuances (une normalisation par morceau aplatissait chaque phrase et échouait sur un clip muet)
      const lufsSource = {};
      const stop = () => { if (job.annule) throw new Error('Export annulé.'); };
      for (const c of clips) if ((c.afx || []).some(e => e && e.id === 'normaliser') && c.file && !(c.file in lufsSource)) { stop(); job.step = 'Mesure du volume'; const a = await analyseFichier(mediaPath(c.file)).catch(() => null); lufsSource[c.file] = a && a.lufs != null && a.lufs > -60 ? a.lufs : null; }
      clips.forEach(c => { if (lufsSource[c.file] != null) c.gainNorm = +clamp(-16 - lufsSource[c.file], -20, 20).toFixed(1); });
      // HDR : une lecture par fichier (pas une par clip : 200 morceaux d'une même vidéo lançaient 200 FFmpeg à la fois)
      const videoSource = c => c.file && !(c.kind === 'image' || c.kind === 'solid' || c.kind === 'audio') && hdrPossible(), hdrFichier = {};
      for (const c of clips) if (videoSource(c) && !(c.file in hdrFichier)) hdrFichier[c.file] = await estHdr(mediaPath(c.file));
      const hdrFlags = clips.map(c => videoSource(c) && !!hdrFichier[c.file]); stop();
      if (hdrFlags.some(Boolean)) job.avertissement = [job.avertissement, 'Vidéo HDR détectée : conversion en image classique.'].filter(Boolean).join(' ');
      for (let i = 0; i < clips.length; i++) {
        const avant = new Set(fs.readdirSync(dir));
        built.push(buildClip(clips[i], P, { ...opts(i, true), hdr: hdrFlags[i] }));
        cles.push(empreinteClip(built[i].args, dir, fs.readdirSync(dir).filter(x => !avant.has(x))));
      }
      const total = built.reduce((a, b) => a + b.eff, 0) * 1.1;
      // Clips encodés en parallèle (la puce vidéo des Mac Apple gère plusieurs flux à la fois) ; clips inchangés repris du cache
      const avance = built.map(() => 0), suivi = () => { job.progress = clamp(avance.reduce((a, b) => a + b, 0) / total, 0, 0.96); };
      const segs = built.map((b, i) => `seg${i}.mp4`);
      let repris = 0, faits = 0;
      const encoderClip = async i => {
        stop();
        const cache = cles[i] && path.join(CACHE_RENDU, cles[i] + '.mp4');
        if (cache && fs.existsSync(cache)) {
          try { fs.copyFileSync(cache, path.join(dir, segs[i]), fs.constants.COPYFILE_FICLONE); fs.utimesSync(cache, new Date(), new Date()); avance[i] = built[i].eff; repris++; faits++; suivi(); return; }
          catch (e) { /* cache illisible : on encode */ }
        }
        const prog = d => { const m = d.match(/out_time_us=(\d+)/g); if (m) { avance[i] = Math.min(built[i].eff, +m[m.length - 1].split('=')[1] / 1e6); suivi(); } };
        try { await run(FFMPEG, [...built[i].args, segs[i]], { cwd: dir, onOut: prog, silence: vt ? VT_SURVEILLANCE : 0 }); }
        catch (e) { // la puce vidéo refuse ce clip : lecture par le processeur et encodage par la puce (même encodeur que les autres clips),
          // puis, en dernier recours, tout par le processeur (ce clip sera réencodé comme les autres à l'assemblage)
          if (!vt && !opts(i, true).hw) throw e;
          let refait = false;
          if (vt && opts(i, true).hw) { try { await run(FFMPEG, [...buildClip(clips[i], P, { ...opts(i, true), hw: false, hdr: hdrFlags[i] }).args, segs[i]], { cwd: dir, onOut: prog, silence: VT_SURVEILLANCE }); refait = true; } catch (e2) { /* processeur seul */ } }
          if (!refait) await run(FFMPEG, [...buildClip(clips[i], P, { ...opts(i, false), hdr: hdrFlags[i] }).args, segs[i]], { cwd: dir, onOut: prog });
        }
        avance[i] = built[i].eff; faits++; suivi();
        job.step = `Clips : ${faits} sur ${built.length}${repris ? ` (${repris} déjà prêt${repris > 1 ? 's' : ''})` : ''}`;
        if (cache) { try { fs.mkdirSync(CACHE_RENDU, { recursive: true }); fs.copyFileSync(path.join(dir, segs[i]), cache + '.part', fs.constants.COPYFILE_FICLONE); fs.renameSync(cache + '.part', cache); } catch (e) { /* cache plein ou indisponible */ } }
      };
      const enParallele = Math.max(1, Math.min(built.length, vt ? Math.min(4, Math.max(2, Math.floor(os.cpus().length / 3))) : 2));
      job.step = `Clips : 0 sur ${built.length}`; job.paralleles = enParallele;
      let suivant = 0;
      await Promise.all(Array.from({ length: enParallele }, async () => { while (suivant < built.length) await encoderClip(suivant++); }));
      job.repris = repris;
      nettoyerCache(); stop();

      // Assemblage (avec transitions si besoin)
      job.step = 'Assemblage';
      const trans = clips.map((c, i) => (i < clips.length - 1 && c.transition && c.transition.type && c.transition.type !== 'none' && FX.TRANSITIONS.some(t => t.id === c.transition.type) && filters.has('xfade')) ? c.transition : null);
      const lens = built.map(b => b.eff);
      // Un fondu enchaîné fait chevaucher deux clips : la vidéo exportée raccourcit de sa durée à chaque transition.
      // Les sons, la piste vidéo 2 et les titres sont posés en temps de la timeline : on les ramène au temps de la vidéo.
      const coupes = []; { let t = 0; lens.forEach((l, i) => { t += l; if (trans[i]) coupes.push({ t, d: clamp(num(trans[i].dur, 0.6), 0.2, Math.max(0.2, Math.min(l, lens[i + 1] || l) * 0.9)) }); }); }
      const versExport = t => { t = num(t, 0); let r = t; for (const k of coupes) if (t >= k.t - 0.01) r -= k.d; return Math.max(0, +r.toFixed(3)); };
      const pistes = (project.pistes || []).filter(x => x && x.file && fs.existsSync(mediaPath(x.file))).slice(0, 30)
        .concat((project.textes || []).filter(x => x && x.titre && x.titre.preset && FX.REPORTAGE.some(r => r.id === x.titre.preset) && filters.has('drawtext')).slice(0, 60).map(x => ({ ...x, kind: 'titre', ligne: 99 }))) // piste Titres, au-dessus de tout
        .map(x => ({ ...x, start: versExport(x.start) }));
      let joined = segs[0], fait = false;

      // Assemblage rapide : seuls les fondus enchaînés et les incrustations sont réencodés, le reste des clips est recopié.
      // En cas de doute (contrôle final non concluant), on repart sur l'assemblage complet ci-dessous.
      if (!process.env.QM_ASSEMBLAGE_CLASSIQUE && (trans.some(Boolean) || pistes.length) && Number.isInteger(P.fps)) {
        try {
          const t0 = Date.now(), epi = EPI.creer({ run, FFMPEG, encoder, FX, aFiltre: n => filters.has(n), clamp, num }), fps = P.fps;
          const E = encodeursClip(P, proxy, project.quality === 'max', vt); let F, r, video, raccords;
          const etape = t => { job.step = t; };
          // Un clip que la puce vidéo a refusé (encodé par le processeur) ne se recopie pas avec les autres : il est réencodé
          // comme eux ; si la puce vidéo refuse encore (clip, fondu ou incrustation), tout passe au processeur. Jamais l'assemblage complet
          // pour cette raison : il ouvre tous les clips à la fois et échoue sur les longs montages.
          for (const toutCpu of [false, true]) {
            const enc = toutCpu ? { vt: null, cpu: E.cpu } : E;
            try {
              const refaits = await epi.harmoniser({ cwd: dir, segs, fps, enc, tous: toutCpu, paralleles: enParallele, etape });
              if (!toutCpu) for (const i of refaits) { const cache = cles[i] && path.join(CACHE_RENDU, cles[i] + '.mp4'); if (cache) { try { fs.copyFileSync(path.join(dir, segs[i]), cache + '.part', fs.constants.COPYFILE_FICLONE); fs.renameSync(cache + '.part', cache); } catch (e) { /* cache indisponible */ } } }
              if (refaits.length) job.harmonises = refaits.length;
              F = await epi.compterToutes(segs.map(sg => path.join(dir, sg)));
              r = await epi.assembler({ cwd: dir, segs, fps, trans, F, echelle: Math.min(P.w, P.h) / 1080, dims: [P.w, P.h], enc, paralleles: enParallele, etape });
              video = r.video; raccords = r.plan.pieces.map(p => p.debut);
              if (pistes.length) {
                const intervalles = pistes.map(p => { const deb = clamp(num(p.start, 0), 0, 36000), du = dureePiste(p); return { fa: Math.floor(deb * fps), fb: Math.ceil((deb + du) * fps) + 1 }; });
                const z = await epi.poserZones({ cwd: dir, video, plan: r.plan, fps, intervalles, paralleles: enParallele, etape, rendreZone: (zone, entree) => poserPistes(dir, entree, pistes, P, proxy, project, { de: zone.de, n: zone.a - zone.de, enc }).then(f => { zone.f = f; return f; }) });
                video = z.video; z.zones.forEach(q => raccords.push(q.de, q.a));
              }
              break;
            } catch (e) { if (toutCpu || !/encodeurs différents/.test(e.message)) throw e; }
          }
          await epi.verifier({ cwd: dir, video, plan: r.plan, fps, raccords });
          // son : refait d'un seul tenant, chaque clip coupé à son nombre exact d'images (recopier l'AAC morceau par morceau
          // ajoutait l'amorce de l'encodeur à chaque coupe : le son glissait d'environ 27 ms par coupe)
          job.step = 'Son';
          const son = 'son-clips.m4a';
          await epi.sonDesClips(dir, segs, F, r.D, fps, proxy, son);
          const mixe = pistes.length ? await sonPistes(dir, son, pistes, proxy, 'son-pistes.m4a') : null;
          await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-i', mixe || son, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-t', (r.plan.total / fps).toFixed(6), '-movflags', '+faststart', 'rapide.mp4'], { cwd: dir });
          joined = 'rapide.mp4'; fait = true; job.assemblage = 'rapide'; job.msAssemblage = Date.now() - t0;
          jeterSi(/^(seg\d+|h-seg\d+|vid[01]|cp\d+|gr\d+|zone-\d+|zc\d+|zfin)\.mp4$|^son-(clips|pistes)\.m4a$/); // tout est dans rapide.mp4
        } catch (e) { job.assemblage = 'complet'; job.raisonRapide = 'Assemblage rapide impossible (' + String(e.message).split('\n')[0].slice(0, 160) + ') : assemblage complet.'; }
      }
      if (fait) { /* assemblage rapide terminé */ } else if (segs.length > 1 && !trans.some(Boolean)) {
        // image recopiée telle quelle ; son refait d'un seul tenant, calé sur le nombre d'images de chaque clip (voir plus haut)
        // clips encodés différemment (puce vidéo refusée pour l'un d'eux) : réencodés comme les autres avant la recopie
        const epiS = EPI.creer({ run, FFMPEG, encoder, FX, aFiltre: n => filters.has(n), clamp, num }), E = encodeursClip(P, proxy, project.quality === 'max', vt);
        if (Number.isInteger(P.fps)) {
          for (const toutCpu of [false, true]) {
            try { const r = await epiS.harmoniser({ cwd: dir, segs, fps: P.fps, enc: toutCpu ? { vt: null, cpu: E.cpu } : E, tous: toutCpu, paralleles: enParallele, etape: t => { job.step = t; } }); if (r.length) job.harmonises = r.length; break; }
            catch (e) { if (toutCpu || !/encodeurs différents/.test(e.message)) { job.raisonRapide = 'Clips encodés différemment : ' + String(e.message).split('\n')[0].slice(0, 160); break; } }
          }
        }
        fs.writeFileSync(path.join(dir, 'liste.txt'), segs.map(s => `file '${s}'`).join('\n'));
        await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', 0, '-i', 'liste.txt', '-map', '0:v:0', '-c', 'copy', 'image-seule.mp4'], { cwd: dir });
        const F = await epiS.compterToutes(segs.map(sg => path.join(dir, sg)));
        await epiS.sonDesClips(dir, segs, F, F.map(() => 0), P.fps, proxy, 'son-clips.m4a');
        await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', 'image-seule.mp4', '-i', 'son-clips.m4a', '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', 'all.mp4'], { cwd: dir });
        joined = 'all.mp4'; jeterSi(/^seg\d+\.mp4$/); jeter('image-seule.mp4', 'son-clips.m4a');
      } else if (segs.length > 1) {
        // chaque clip ramené à la taille, aux pixels carrés et au format du montage, sans reconfiguration en cours de route :
        // un fondu (xfade) refuse deux images différentes (« Failed to configure output pad on Parsed_xfade »)
        const inArgs = segs.flatMap(s => ['-reinit_filter', 0, '-i', s]);
        const g = []; const norm = `scale=${P.w}:${P.h},setsar=1,settb=AVTB,fps=${P.fps},format=yuv420p`;
        let cv = 'v0', ca = 'a0', len = lens[0];
        g.push(`[0:v]${norm}[v0]`, '[0:a]aresample=48000[a0]');
        for (let i = 1; i < segs.length; i++) {
          g.push(`[${i}:v]${norm}[vi${i}]`, `[${i}:a]aresample=48000[ai${i}]`);
          const tr = trans[i - 1], nv = `v${i}x`, na = `a${i}x`;
          if (tr) {
            const d = clamp(num(tr.dur, 0.6), 0.2, Math.max(0.2, Math.min(len, lens[i]) * 0.9));
            if (FX.natif(tr.type)) g.push(...FX.grapheTransition(tr.type, d, len - d, Math.min(P.w, P.h) / 1080, cv, `vi${i}`, `vt${i}`, { W: P.w, H: P.h, fps: P.fps, u: i }), `[vt${i}]${norm}[${nv}]`);
            else g.push(`[${cv}][vi${i}]${FX.filtreTransition(tr.type, d, len - d, Math.min(P.w, P.h) / 1080)},${norm}[${nv}]`);
            g.push(`[${ca}]atrim=end=${(len - d / 2).toFixed(4)},afade=t=out:st=${Math.max(0, len - d / 2 - 0.04).toFixed(4)}:d=0.04[ca${i}]`, `[ai${i}]atrim=start=${(d / 2).toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.04[ai${i}b]`,
              `[ca${i}][ai${i}b]concat=n=2:v=0:a=1[${na}]`); // voix : coupe nette au milieu du fondu (pas deux phrases mêlées)
            len += lens[i] - d;
          } else {
            g.push(`[${cv}][${ca}][vi${i}][ai${i}]concat=n=2:v=1:a=1[${nv}][${na}]`);
            len += lens[i];
          }
          cv = nv; ca = na;
        }
        try {
          await encoder(['-y', '-loglevel', 'error', ...inArgs, '-filter_complex', g.join(';'), '-map', `[${cv}]`, '-map', `[${ca}]`], vt ? encVt(P, project.quality === 'max', proxy) : null,
            proxy ? ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', 30] : ['-c:v', 'libx264', '-preset', 'medium', '-crf', 17],
            ['-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', proxy ? '96k' : '192k', '-movflags', '+faststart', 'all.mp4'], { cwd: dir });
        } catch (e) { // la cause d'origine (assemblage rapide refusé) aide à comprendre
          throw new Error(String(e.message).split('\n').slice(-2).join(' ') + (job.raisonRapide ? ' — ' + job.raisonRapide : ''));
        }
        joined = 'all.mp4'; jeterSi(/^seg\d+\.mp4$/);
      }

      // Piste vidéo 2 : images dans l'image et plans de coupe posés par-dessus le montage
      if (pistes.length && !fait) { job.step = 'Piste vidéo 2'; const avant = joined; joined = await poserPistes(dir, joined, pistes, P, proxy, project); if (joined !== avant && avant !== segs[0]) jeter(avant); }

      // Pistes audio (musique, voix off, bruitages) ; « baisser quand on parle » = compression pilotée par la voix
      const audios = (project.audio || []).filter(a => a && a.file && fs.existsSync(mediaPath(a.file))).map(a => ({ ...a, start: versExport(a.start) }));
      stop();
      if (audios.length) {
        job.step = 'Mixage du son';
        const dur = +((await infos(path.join(dir, joined))).format.duration) || 1;
        // Mixage en étapes simples (un seul fichier par commande, sons convertis en WAV) : un graphe unique
        // mêlant vidéo, boucles et décalages pouvait se figer au hasard dans FFmpeg.
        const D = dur.toFixed(3), wav = ['-vn', '-ac', 2, '-ar', 48000, '-c:a', 'pcm_s16le'], suivi = ['-progress', 'pipe:1', '-nostats'];
        // chaque étape dure quelques secondes : si FFmpeg se fige au hasard, on la relance (jusqu'à 3 essais)
        const ff = async (args, out) => {
          for (let essai = 1; ; essai++) {
            try { return await run(FFMPEG, ['-y', '-loglevel', 'error', ...args, ...suivi, out], { cwd: dir, silence: 20000 }); }
            catch (e) { if (!/figé/.test(e.message)) throw e; if (essai >= 3) throw new Error(`${e.message} (${out})`); }
          }
        };
        await ff(['-i', joined, '-af', 'aresample=48000,apad', '-t', D, ...wav], 'son0.wav');
        // Niveaux pensés comme un monteur : la musique se cale sous la voix (environ -18 dB), les bruitages un peu en dessous,
        // quel que soit le niveau d'origine des fichiers ; le curseur de volume reste un réglage relatif autour de ces niveaux.
        const lufs = async f => { try { const e = await run(FFMPEG, ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], { cwd: dir, wantErr: true }); const m = [...e.matchAll(/\bI:\s+(-?[\d.]+) LUFS/g)]; return m.length ? +m[m.length - 1][1] : null; } catch (e) { return null; } };
        const lufsMontage = await lufs('son0.wav'), ref = lufsMontage != null && lufsMontage > -45 ? lufsMontage : -18;
        const typeSon = a => (a.loop || a.duck || /musiques\//.test(a.file) ? 'musique' : /^lib:sons\/|^pack:.*\/sons?\//i.test(a.file) || /^lib:/.test(a.file) ? 'bruitage' : 'autre');
        job.niveaux = { montage: lufsMontage };
        // quelques sons préparés à la fois (un pack pose une centaine de bruitages sur un long montage : jamais cent FFmpeg d'un coup)
        let prochain = 0; const unSon = async (a, i) => {
          const de = clamp(num(a.in, 0), 0, 36000), du = clamp(num(a.dur, 0), 0, 36000); // partie du fichier (son détaché d'une vidéo)
          await ff([...(de > 0 ? ['-ss', de] : []), ...(du > 0 ? ['-t', du] : []), '-i', mediaPath(a.file), ...wav], `brut${i}.wav`);
          const type = typeSon(a), l = type === 'autre' || a.niveauBrut ? null : await lufs(`brut${i}.wav`);
          if (l != null && l > -60) { // gain calculé : niveau cible du type + réglage relatif du curseur
            // musique : 12 dB sous la voix si elle est baissée quand on parle (elle descend encore pendant les phrases), 18 dB sinon
            const base = type === 'musique' ? 35 : 80, cible = ref + (type === 'musique' ? (a.duck ? -12 : -18) : -7), rel = 20 * Math.log10(Math.max(1, clamp(num(a.vol, base), 0, 200)) / base);
            a.gainDb = +clamp(cible - l + rel, -40, 18).toFixed(1); job.niveaux[a.file] = { type, lufs: l, gainDb: a.gainDb };
          }
          const st = clamp(num(a.start, 0), 0, 36000), ms = Math.round(st * 1000);
          let vit = clamp(num(a.vit, 1), 0.25, 4);
          // fondu de sortie à la fin du son lui-même (un bruitage court ou un morceau coupé), pas à la fin de la vidéo
          const lg = du > 0 ? du / vit : a.loop ? dur - st : (+((await infos(path.join(dir, `brut${i}.wav`))).format.duration) || dur) / vit;
          const fd = a.fade ? `,afade=t=in:d=${Math.min(1.2, lg / 3).toFixed(2)},afade=t=out:st=${Math.max(0, Math.min(lg, dur - st) - Math.min(1.5, lg / 3)).toFixed(2)}:d=${Math.min(1.5, lg / 3).toFixed(2)}` : ''; const tempo = []; while (vit > 2.001) { tempo.push('atempo=2'); vit /= 2; } while (vit < 0.499) { tempo.push('atempo=0.5'); vit *= 2; } if (Math.abs(vit - 1) > 0.001) tempo.push(`atempo=${vit.toFixed(4)}`);
          // boucle : le même fichier répété par une liste (la boucle automatique de FFmpeg se figeait parfois)
          let entree = ['-i', `brut${i}.wav`];
          if (a.loop && !du) {
            const l = +((await infos(path.join(dir, `brut${i}.wav`))).format.duration) || 0, n = l > 0 ? Math.min(400, Math.ceil(dur / l) + 1) : 1;
            if (n > 1 && n <= 40) {
              // boucle sans trou : le silence et le fondu de fin du morceau sont retirés, les reprises s'enchaînent en fondu d'une seconde
              await ff(['-i', `brut${i}.wav`, '-af', 'areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', ...wav], `net${i}.wav`);
              const g = Array.from({ length: n - 1 }, (_, k) => `[${k === 0 ? '0:a' : 'x' + k}][${k + 1}:a]acrossfade=d=1:c1=tri:c2=tri[x${k + 1}]`);
              await ff([...Array.from({ length: n }, () => ['-i', `net${i}.wav`]).flat(), '-filter_complex', g.join(';'), '-map', `[x${n - 1}]`, ...wav], `boucle${i}.wav`);
              entree = ['-i', `boucle${i}.wav`];
            } else if (n > 1) { fs.writeFileSync(path.join(dir, `boucle${i}.txt`), Array.from({ length: n }, () => `file 'brut${i}.wav'`).join('\n')); entree = ['-f', 'concat', '-safe', 0, '-i', `boucle${i}.txt`]; }
          }
          const gain = a.gainDb != null ? `volume=${a.gainDb}dB` : `volume=${clamp(num(a.vol, 50), 0, 200) / 100}`;
          // fichier court (le son seul) : le décalage et le silence jusqu'à la fin sont ajoutés au moment du mélange
          // (avant : un WAV de toute la durée par son, plus de 400 Mo chacun pour un montage de 36 min)
          a.ms = ms;
          await ff([...entree, '-af', `${tempo.length ? tempo.join(',') + ',' : ''}${gain}${fd}`, '-t', Math.max(0.05, dur - st).toFixed(3), ...wav], `son${i + 1}.wav`);
          jeter(`brut${i}.wav`, `net${i}.wav`, `boucle${i}.wav`, `boucle${i}.txt`); // étapes du son, plus utiles
        };
        await Promise.all(Array.from({ length: Math.min(4, audios.length) }, async () => { while (prochain < audios.length) { const i = prochain++; await unSon(audios[i], i); } }));
        // « baisser quand on parle » : la musique est compressée, pilotée par le son du montage (lu à part)
        const mixer = avecBaisse => {
          const canDuck = avecBaisse && filters.has('sidechaincompress'), ducks = audios.filter(a => a.duck && canDuck).length;
          const ins = ['-i', 'son0.wav', ...audios.flatMap((_, i) => ['-i', `son${i + 1}.wav`])], g = [];
          let mix = '[0:a]', dk = 0;
          audios.forEach((a, i) => {
            g.push(`[${i + 1}:a]adelay=${a.ms || 0}|${a.ms || 0},apad[d${i}]`); // calé à son instant, prolongé en silence (volume constant du mélange)
            if (a.duck && canDuck) { g.push(`[d${i}][side${dk++}]sidechaincompress=threshold=0.06:ratio=3:attack=25:release=500:makeup=1[m${i}]`); mix += `[m${i}]`; }
            else mix += `[d${i}]`;
          });
          if (ducks) { ins.push('-i', 'son0.wav'); g.push(`[${audios.length + 1}:a]${ducks > 1 ? `asplit=${ducks}` : 'anull'}${Array.from({ length: ducks }, (_, k) => `[side${k}]`).join('')}`); }
          g.push(`${mix}amix=inputs=${audios.length + 1}:duration=first:dropout_transition=0,volume=${audios.length + 1},alimiter=limit=0.95[a]`);
          return ff([...ins, '-filter_complex', g.join(';'), '-map', '[a]', '-t', D, ...wav], 'mix.wav');
        };
        try { await mixer(true); }
        catch (e) { if (!/figé/.test(e.message)) throw e; job.step = 'Mixage du son (sans baisse automatique)'; await mixer(false); }
        await ff(['-i', joined, '-i', 'mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', D, '-movflags', '+faststart'], 'final.mp4');
        if (joined !== segs[0]) jeter(joined); jeterSi(/\.wav$/); joined = 'final.mp4';
      }

      // Format de sortie
      const sortie = sortiesDispo().includes(project.sortie) ? project.sortie : 'mp4';
      // « Égaliser le volume » : mesure du montage entier puis réglage linéaire en une fois (deux passes) ;
      // la passe unique corrigeait au fil de l'eau et faisait « pomper » le son. Mesure impossible : passe unique.
      let norm = [];
      if (project.normaliser && !proxy && sortie !== 'gif') {
        job.step = 'Mesure du volume du montage';
        const m = await run(FFMPEG, ['-hide_banner', '-nostats', '-i', joined, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { cwd: dir, wantErr: true })
          .then(e => { const j = String(e).match(/\{[^{}]*"input_i"[^{}]*\}/); return j ? JSON.parse(j[0]) : null; }).catch(() => null);
        const v = k => m && Number.isFinite(+m[k]) ? +m[k] : null;
        norm = ['-af', (v('input_i') != null && v('input_i') > -70 && v('input_tp') != null && v('input_lra') != null && v('input_thresh') != null
          ? `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${v('input_i')}:measured_TP=${v('input_tp')}:measured_LRA=${v('input_lra')}:measured_thresh=${v('input_thresh')}:offset=${v('target_offset') || 0}:linear=true`
          : 'loudnorm=I=-16:TP=-1.5:LRA=11') + ',aresample=48000,aformat=channel_layouts=stereo|mono']; // FFmpeg 6.0 (Mac) : disposition des voies à préciser après loudnorm
        job.niveaux = Object.assign(job.niveaux || {}, { final: v('input_i') });
      }
      let final = joined;
      if (!proxy && (sortie !== 'mp4' || norm.length)) {
        job.step = 'Encodage final';
        final = 'sortie.' + sortie;
        const o2 = {
          mp4: ['-c:v', 'copy', ...norm, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'],
          mov: ['-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', ...norm, '-c:a', 'pcm_s16le'],
          webm: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', ...norm, '-c:a', 'libopus', '-b:a', '128k'],
          gif: ['-an', '-t', '60', '-vf', "fps=15,scale='min(540,iw)':-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse"],
          mp3: ['-vn', ...norm, '-c:a', 'libmp3lame', '-b:a', '192k'], m4a: ['-vn', ...norm, '-c:a', 'aac', '-b:a', '192k'], wav: ['-vn', ...norm, '-c:a', 'pcm_s16le']
        }[sortie];
        // ProRes : moteur ProRes des puces Apple s'il est disponible, sinon le processeur
        if (sortie === 'mov' && process.platform === 'darwin' && encoders.has('prores_videotoolbox')) await encoder(['-y', '-loglevel', 'error', '-i', joined], ['-c:v', 'prores_videotoolbox', '-profile:v', 'hq'], o2.slice(0, 6), [...o2.slice(6), final], { cwd: dir });
        else await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', joined, ...o2, final], { cwd: dir });
        if (final !== joined) jeter(joined);
      }

      if (proxy) {
        // on garde les 3 derniers aperçus : celui en cours de lecture ne disparaît pas pendant qu'un nouveau se prépare
        const vieux = fs.readdirSync(APERCUS).map(n => ({ n, t: fs.statSync(path.join(APERCUS, n)).mtimeMs })).sort((a, b) => b.t - a.t).slice(2);
        for (const old of vieux) { try { fs.unlinkSync(path.join(APERCUS, old.n)); } catch (e) { /* ignoré */ } }
        const name = `apercu-${Date.now()}.mp4`;
        fs.copyFileSync(path.join(dir, final), path.join(APERCUS, name));
        job.url = '/apercu/' + name;
      } else {
        // nom unique : deux exports finis dans la même seconde ne s'écrasent pas (montage-…-2.mp4)
        const racine = `${job.extrait ? 'extrait' : 'montage'}-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`; let name = `${racine}.${sortie}`;
        for (let n = 2; ; n++) { try { fs.copyFileSync(path.join(dir, final), path.join(EXPORTS, name), fs.constants.COPYFILE_FICLONE | fs.constants.COPYFILE_EXCL); break; } catch (e) { if (e.code !== 'EEXIST' || n > 99) throw e; name = `${racine}-${n}.${sortie}`; } } // copie instantanée sur le disque du Mac (APFS)
        job.out = name;
      }
      job.fin = Date.now(); job.progress = 1; job.done = true;
    } finally { dossiersBasse.delete(dir); if (!process.env.QM_GARDER) fs.rmSync(dir, { recursive: true, force: true }); }
  }

  // Éléments de la piste vidéo 2 (ordre des rangées : la plus haute devant), avec forme, bordure, fondu et son.
  // zone = { de, n } (images) : seule cette partie de la vidéo est refaite, sans le son, avec les mêmes réglages d'encodage que les clips.
  // durée d'un élément de piste : image (durée choisie), titre de la piste Titres (durée choisie), vidéo (partie lue)
  const dureePiste = p => (p.kind === 'image' || p.kind === 'titre' ? clamp(num(p.dur, 4), 0.3, 3600) : clamp(num(p.out, 1) - num(p.in, 0), 0.3, 36000));
  async function poserPistes(dir, joined, pistes, P, proxy, project, zone) {
    const W = P.w, H = P.h, fps = P.fps, ins = zone ? ['-ss', zone.de / fps, '-t', (zone.n / fps).toFixed(6), '-i', joined] : ['-i', joined], g = [], sons = [];
    const decal = zone ? zone.de / fps : 0;
    const ordre = pistes.slice().sort((a, b) => num(a.ligne, 0) - num(b.ligne, 0));
    // alpha d'une forme (rayon des coins R, en points ; R = W/2 pour un rond)
    const forme = R => `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*lte(hypot(max(0,abs(X-W/2+0.5)-(W/2-${R})),max(0,abs(Y-H/2+0.5)-(H/2-${R}))),${R})'`;
    let cur = '0:v', n = 0;
    for (let k = 0; k < ordre.length; k++) {
      const p = ordre[k], debut = clamp(num(p.start, 0), 0, 36000) - decal;
      const duree = dureePiste(p);
      if (zone && (debut + duree <= 0 || debut >= zone.n / fps)) continue; // cet élément n'est pas dans la zone
      if (p.kind === 'titre') { // piste Titres : calque transparent sur lequel le titre animé est dessiné, posé à son instant
        const fin = debut + duree, ctx = { W, H, fps, eff: duree, t0: 0 }, t = `titre${k}`;
        let lab = 0; const l = () => `${t}_${lab++}`;
        g.push(`color=c=black@0.0:s=${W}x${H}:r=${fps}:d=${duree.toFixed(3)},format=rgba[${t}]`);
        const fin2 = reportage({ titre: { ...p.titre, start: clamp(num(p.titre && p.titre.start, 0.2), 0, duree), dur: Math.max(0.5, duree - clamp(num(p.titre && p.titre.start, 0.2), 0, duree)) } }, ctx, g, t, l, { tdir: { dir, idx: `t${k}` } });
        g.push(`[${fin2}]format=rgba,setpts=PTS-STARTPTS+${debut.toFixed(3)}/TB[e${t}]`, `[${cur}][e${t}]overlay=0:0:eof_action=pass:format=auto:enable='between(t,${debut.toFixed(3)},${fin.toFixed(3)})'[v${t}]`);
        cur = `v${t}`;
        continue;
      }
      n++;
      if (p.kind === 'image') ins.push('-loop', '1', '-framerate', fps, '-t', duree.toFixed(3), '-i', mediaPath(p.file));
      else ins.push('-ss', clamp(num(p.in, 0), 0, 36000), '-t', duree.toFixed(3), '-i', mediaPath(p.file));
      const op = clamp(num(p.opacity, 100), 5, 100) / 100, fin = debut + duree;
      let x = '0', y = '0', src = `[${n}:v]fps=${fps},setsar=1,`;
      if (p.plein) g.push(`${src}scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=rgba[f${n}]`);
      else {
        const st = (await infos(mediaPath(p.file)).catch(() => ({ streams: [] }))).streams.find(z => z.codec_type === 'video') || {};
        const rond = p.forme === 'rond', w = even(W * clamp(num(p.scale, 34), 5, 100) / 100);
        const h = rond ? w : even(w * ((st.height || 9) / (st.width || 16)));
        const R = rond ? w / 2 : p.forme === 'arrondi' ? Math.round(w * 0.08) : 0;
        g.push(`${src}${rond ? `crop='min(iw,ih)':'min(iw,ih)',` : ''}scale=${w}:${h},format=rgba${R ? ',' + forme(R) : ''}[f${n}]`);
        if (/^#[0-9a-f]{6}$/i.test(p.bord || '')) { // bordure : la même forme en couleur, un peu plus grande, derrière
          const bd = Math.max(2, Math.round(w * 0.02));
          g.push(`color=c=${hex(p.bord)}:s=${w + 2 * bd}x${h + 2 * bd}:r=${fps}:d=${duree.toFixed(3)},format=rgba${R ? ',' + forme(R + bd) : ''}[c${n}]`);
          g.push(`[c${n}][f${n}]overlay=${bd}:${bd}:format=auto[f${n}b]`);
          g.push(`[f${n}b]null[f${n}x]`);
        } else g.push(`[f${n}]null[f${n}x]`);
        x = `W*${clamp(num(p.x, 76), 0, 100) / 100}-w/2`; y = `H*${clamp(num(p.y, 26), 0, 100) / 100}-h/2`;
      }
      let ch = `[f${n}${p.plein ? '' : 'x'}]format=rgba`;
      if (op < 1) ch += `,colorchannelmixer=aa=${op}`;
      if (p.anim === 'fondu' && !proxy) ch += `,fade=t=in:st=0:d=0.3:alpha=1,fade=t=out:st=${Math.max(0, duree - 0.3).toFixed(3)}:d=0.3:alpha=1`;
      g.push(`${ch},setpts=PTS-STARTPTS+${debut.toFixed(3)}/TB[e${n}]`);
      g.push(`[${cur}][e${n}]overlay=x='${x}':y='${y}':eof_action=pass:format=auto:enable='between(t,${debut.toFixed(3)},${fin.toFixed(3)})'[v${n}]`);
      cur = `v${n}`;
      if (!zone && p.kind === 'video' && p.hasAudio && num(p.vol, 0) > 0) { const ms = Math.round(debut * 1000); sons.push(`s${n}`); g.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${clamp(num(p.vol, 0), 0, 200) / 100},adelay=${ms}|${ms},apad[s${n}]`); } // apad : sans lui, le reste du montage doublait de volume à la fin de ce son
    }
    g.push(`[${cur}]format=yuv420p[vout]`);
    if (zone) {
      const E = zone.enc;
      const sortie = `zone-${zone.de}.mp4`;
      await encoder(['-y', '-loglevel', 'error', ...ins, '-filter_complex', g.join(';'), '-map', '[vout]', '-r', fps, '-frames:v', zone.n], E.vt, E.cpu, ['-pix_fmt', 'yuv420p', '-force_key_frames', EPI.expressionGop(fps), '-an', sortie], { cwd: dir });
      return sortie;
    }
    let mapA = ['-map', '0:a', '-c:a', 'copy'];
    if (sons.length) {
      g.push(`[0:a]${sons.map(x => `[${x}]`).join('')}amix=inputs=${sons.length + 1}:duration=first:dropout_transition=0,volume=${sons.length + 1},alimiter=limit=0.95[aout]`);
      mapA = ['-map', '[aout]', '-c:a', 'aac', '-b:a', proxy ? '96k' : '192k'];
    }
    const vt = !proxy && process.platform === 'darwin' && encoders.has('h264_videotoolbox') && project.quality !== 'haute';
    await encoder(['-y', '-loglevel', 'error', ...ins, '-filter_complex', g.join(';'), '-map', '[vout]', ...mapA], vt ? encVt(P, false, proxy) : null,
      proxy ? ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', 30] : ['-c:v', 'libx264', '-preset', 'medium', '-crf', 17], ['-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'pistes.mp4'], { cwd: dir });
    return 'pistes.mp4';
  }
  // Son des éléments de la piste vidéo 2 mêlé au son d'un fichier (assemblage rapide : le son est refait seul, l'image n'est pas touchée)
  async function sonPistes(dir, sonSrc, pistes, proxy, sortie) {
    const ins = ['-i', sonSrc], g = [], sons = [];
    for (const p of pistes.slice().sort((a, b) => num(a.ligne, 0) - num(b.ligne, 0))) {
      if (!(p.kind === 'video' && p.hasAudio && num(p.vol, 0) > 0)) continue;
      const n = sons.length + 1, ms = Math.round(clamp(num(p.start, 0), 0, 36000) * 1000);
      ins.push('-ss', clamp(num(p.in, 0), 0, 36000), '-t', clamp(num(p.out, 1) - num(p.in, 0), 0.3, 36000).toFixed(3), '-i', mediaPath(p.file));
      sons.push(`[s${n}]`); g.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${clamp(num(p.vol, 0), 0, 200) / 100},adelay=${ms}|${ms},apad[s${n}]`); // prolongé en silence (voir poserPistes)
    }
    if (!sons.length) return null;
    g.push(`[0:a]${sons.join('')}amix=inputs=${sons.length + 1}:duration=first:dropout_transition=0,volume=${sons.length + 1},alimiter=limit=0.95[aout]`);
    await run(FFMPEG, ['-y', '-v', 'error', ...ins, '-filter_complex', g.join(';'), '-map', '[aout]', '-c:a', 'aac', '-b:a', proxy ? '96k' : '192k', sortie], { cwd: dir });
    return sortie;
  }

  function sortiesDispo() {
    const l = ['mp4'];
    if (encoders.has('prores_ks')) l.push('mov');
    if (encoders.has('libvpx-vp9') && encoders.has('libopus')) l.push('webm');
    l.push('gif');
    if (encoders.has('libmp3lame')) l.push('mp3');
    l.push('m4a', 'wav');
    return l;
  }

  // ---------- HTTP ----------
  function send(res, code, body, type = 'application/json; charset=utf-8', cache = 'no-store') {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': cache });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  }
  function readJson(req) {
    return new Promise((resolve, reject) => {
      let s = '';
      req.on('data', d => { s += d; if (s.length > 2e7) req.destroy(); });
      req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { reject(new Error('Requête invalide')); } });
    });
  }
  function serveFile(req, res, file, download) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Introuvable' });
    const st = fs.statSync(file);
    const h = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    if (download) h['Content-Disposition'] = `attachment; filename="${path.basename(file)}"`;
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
    } else { res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(file).pipe(res); }
  }
  // Prise du studio (fichier du navigateur : WebM ou MP4 fragmenté, images irrégulières) → MP4 propre.
  // Plusieurs méthodes sont essayées ; en dernier recours la prise brute est gardée, jamais perdue.
  async function importerPrise(brut) {
    const mp4 = brut.replace(/\.[^.]+$/, '') + '-prise.mp4';
    // puce vidéo du Mac d'abord (conversion quasi instantanée), sinon le processeur
    const vt = process.platform === 'darwin' && encoders.has('h264_videotoolbox');
    const audio = ['-c:a', 'aac', '-b:a', '192k', '-ar', 48000, '-movflags', '+faststart', mp4];
    const x264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', 18, '-pix_fmt', 'yuv420p', ...audio];
    const sorties = vt ? [['-c:v', 'h264_videotoolbox', '-b:v', '14M', '-maxrate', '20M', '-pix_fmt', 'yuv420p', ...audio], x264] : [x264];
    const essais = [
      ['-fflags', '+genpts', '-i', brut, '-map', '0:v:0', '-map', '0:a:0?', '-fps_mode', 'cfr', '-r', 30],
      ['-fflags', '+genpts+discardcorrupt', '-err_detect', 'ignore_err', '-i', brut, '-map', '0:v:0', '-map', '0:a:0?', '-fps_mode', 'vfr'],
      ['-err_detect', 'ignore_err', '-i', brut, '-map', '0:v:0', '-fps_mode', 'vfr'] // image seule si le son est illisible
    ];
    let erreur = fs.statSync(brut).size < 2000 ? 'enregistrement vide' : '';
    if (!erreur) for (const e of essais) for (const sortie of sorties) {
      try {
        await run(FFMPEG, ['-y', '-v', 'error', ...e, ...sortie.slice(0, -1), '-progress', 'pipe:1', '-nostats', sortie[sortie.length - 1]], { silence: VT_SURVEILLANCE });
        const info = await probe(mp4);
        if (info.kind === 'video' && info.duration > 0.3) { fs.unlinkSync(brut); return { file: path.basename(mp4), ...info }; }
        erreur = 'image absente de la prise';
      } catch (er) { erreur = String(er.message || '').split('\n').pop().slice(0, 160); }
    }
    try { fs.unlinkSync(mp4); } catch (e) { /* rien à retirer */ }
    const dossier = path.join(BASE, 'prises-a-verifier'); fs.mkdirSync(dossier, { recursive: true });
    fs.renameSync(brut, path.join(dossier, path.basename(brut)));
    throw new Error(`La prise n’a pas pu être convertie (${erreur}). Le fichier d’origine est gardé dans ${dossier}.`);
  }
  const projFile = n => path.join(PROJETS, safeName(n).replace(/\.qmovie$/, '') + '.qmovie');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    // Protection : seule cette application (localhost) peut appeler le serveur
    const port = server.address() && server.address().port;
    const okHost = h => !h || h === `127.0.0.1:${port}` || h === `localhost:${port}`;
    const origin = req.headers.origin;
    if (!okHost(req.headers.host) || (origin && !okHost(origin.replace(/^https?:\/\//, '')))) return send(res, 403, { error: 'Accès refusé' });
    try {
      if (req.method === 'GET' && (p === '/' || p === '/index.html')) return serveFile(req, res, path.join(__dirname, 'index.html'));
      if (req.method === 'GET' && p.startsWith('/media/')) return serveFile(req, res, mediaPath(decodeURIComponent(p.slice(7))));
      if (req.method === 'GET' && p.startsWith('/lib/')) return serveFile(req, res, mediaPath('lib:' + decodeURIComponent(p.slice(5))));
      // Studio : détourage de la personne (MediaPipe, en local) et moteur de mélange du fond virtuel
      if (req.method === 'GET' && (p === '/compositeur.js' || p === '/detoureur.js' || p === '/ui-voix.js' || p === '/ui-publier.js' || p === '/ui-v2.js' || p === '/ui-chat.js')) return serveFile(req, res, path.join(__dirname, p.slice(1)));
      if (req.method === 'GET' && p.startsWith('/vendor/vision/')) {
        const n = decodeURIComponent(p.slice(15));
        if (!/^(vision_bundle\.m?js|wasm\/vision_wasm(_nosimd)?_internal\.(js|wasm))$/.test(n)) return send(res, 404, { error: 'Introuvable' });
        return serveFile(req, res, path.join(__dirname, 'node_modules', '@mediapipe', 'tasks-vision', n));
      }
      if (req.method === 'GET' && /^\/modeles\/[\w.]+\.tflite$/.test(p)) return serveFile(req, res, path.join(__dirname, p));
      if (req.method === 'GET' && p.startsWith('/proxy/')) return serveFile(req, res, path.join(PROXIES, safeName(decodeURIComponent(p.slice(7)))));
      if (req.method === 'GET' && p.startsWith('/exports/')) return serveFile(req, res, path.join(EXPORTS, safeName(decodeURIComponent(p.slice(9)))), true);
      if (req.method === 'GET' && p.startsWith('/apercu/')) return serveFile(req, res, path.join(APERCUS, safeName(decodeURIComponent(p.slice(8)))));

      if (req.method === 'GET' && p === '/api/catalogue') return send(res, 200, { ...FX.catalogue(filters), packs: require('./packs').PACKS, version_app: VERSION_APP, font: !!FONT && filters.has('drawtext'), version, folder: BASE, bibliotheque: libIndex(), polices: FONTS_OK.map(x => ({ id: x.id, nom: x.nom })), sorties: sortiesDispo(), duck: filters.has('sidechaincompress'), vtQualite, hwenc: process.platform === 'darwin' && encoders.has('h264_videotoolbox') });
      // Mises à jour (application Mac uniquement)
      if (p === '/api/maj') return send(res, 200, opts.maj ? opts.maj.etat() : { etat: 'inactif', version: VERSION_APP });
      if (req.method === 'POST' && p === '/api/maj/verifier') return send(res, 200, opts.maj ? opts.maj.verifier() : { etat: 'inactif', version: VERSION_APP });
      if (req.method === 'POST' && p === '/api/maj/installer') return send(res, 200, opts.maj ? opts.maj.installer() : { etat: 'inactif' });
      // Générateur de vidéos : sujet → article Wikipédia → texte en scènes, images libres, voix off du Mac
      if (req.method === 'GET' && p === '/api/generer/voix') { // voix naturelles intégrées (installées ou à installer) puis voix du Mac
        const v = await GEN().voix(), e = PAROLE().etat(), nat = e.dispo ? e.voix : [];
        const mac = v.find(x => x.premium && /fr_FR/.test(x.langue)) || v.find(x => x.premium) || v.find(x => /^Thomas/.test(x.nom)) || v.find(x => /fr_FR/.test(x.langue)) || v[0];
        const n = nat.find(x => x.installee);
        return send(res, 200, { voix: v, naturelles: nat, defaut: n ? 'piper:' + n.id : mac && mac.premium ? mac.nom : nat.length ? 'piper:' + nat[0].id : (mac || {}).nom || '' });
      }
      if (req.method === 'GET' && p === '/api/generer/chercher') return send(res, 200, await GEN().chercher(url.searchParams.get('q')));
      if (req.method === 'POST' && p === '/api/generer/preparer') return send(res, 200, await GEN().preparer(await readJson(req)));
      // Voix naturelles et reconnaissance de la parole (parole.js)
      const travail = fn => { const id = String(Date.now()) + Math.floor(Math.random() * 1000), job = { progress: 0, step: 'Préparation', error: null, done: false, resultat: null }; jobs.set(id, job);
        Promise.resolve().then(() => fn(job)).then(r => { job.resultat = r || null; job.progress = 1; job.done = true; }).catch(e => { job.error = e.message; }); return { id }; };
      // IA locale du générateur et téléchargement depuis un lien (ia.js)
      if (req.method === 'GET' && p === '/api/ia') return send(res, 200, IA().etat());
      if (req.method === 'POST' && p === '/api/ia/traduire') { // sous-titres traduits (italien, anglais…) par l'IA locale, mêmes heures
        const b = await readJson(req), lignes = (Array.isArray(b.lignes) ? b.lignes : []).slice(0, 6000).map(x => String(x || '').slice(0, 300));
        if (!lignes.some(x => x.trim())) return send(res, 400, { error: 'Aucun sous-titre à traduire.' });
        return send(res, 200, travail(job => IA().traduire({ lignes, langue: String(b.langue || '') }, job)));
      }
      if (req.method === 'POST' && p === '/api/ia/installer') { const b = await readJson(req).catch(() => ({})); return send(res, 200, travail(job => IA().installer(job, String(b.modele || '')))); }
      if (req.method === 'POST' && p === '/api/generer/ia') {
        const b = await readJson(req);
        return send(res, 200, travail(async job => {
          job.step = 'Lecture de l’article…';
          const duree = clamp(num(b.duree, 60), 20, 600);
          const f = b.article ? await GEN().faits(String(b.article), duree).catch(() => []) : []; // sans article : sujet libre
          let ctx = { texte: '', articles: [] }; // sujet libre : faits de Wikipédia donnés à l'IA (case « S'appuyer sur Wikipédia »)
          if (!f.length && b.wiki) { job.step = 'Recherche de faits sur Wikipédia…'; ctx = await GEN().contexte(String(b.titre || '')); }
          const r = await IA().ecrireScript({ titre: String(b.titre || b.article || ''), paragraphes: f, duree, style: String(b.style || ''), consigne: String(b.consigne || ''), recherche: !!b.medias, options: b.options && typeof b.options === 'object' ? b.options : {}, contexte: ctx.texte }, job);
          r.regles = { ...(r.regles || {}), sources: ctx.articles };
          if (!r.scenes.length) throw new Error('L’IA n’a pas pu écrire de script : réessaie.');
          const vertical = b.format === 'vertical';
          if (b.medias) { // mode express : une photo cherchée et notée pour chaque scène
            job.step = 'Recherche des photos pour chaque scène…'; job.progress = 0.85;
            const m = f.length ? await GEN().imagesDeScenes({ article: String(b.article), scenes: r.scenes, vertical, videos: !!b.videos })
              : await GEN().mediasPour(r.scenes.map(x => ({ fr: x.sujet, en: x.recherche, texte: x.texte })), { ancre: r.titre, ancreRequete: '', vertical, videos: !!b.videos });
            return { titre: r.titre, gpu: r.gpu, regles: r.regles, libre: !f.length, images: m.images, scenes: r.scenes.map((x, i) => ({ ...x, image: m.choix[i], propositions: m.propositions[i] })) };
          }
          const IMG = require('./images'), imgs = Array.isArray(b.images) ? b.images.slice(0, 60) : [], ancre = IMG.termes(String(b.titre || b.article || ''));
          const sel = imgs.length ? IMG.attribuer(r.scenes.map(x => ({ mots: IMG.termes(x.texte + ' ' + (x.section || '')).slice(0, 14), ancre })), imgs, { vertical, seuil: IMG.SEUIL - 1 }) : { choix: r.scenes.map(() => -1), listes: r.scenes.map(() => []) };
          return { titre: r.titre, gpu: r.gpu, regles: r.regles, libre: !f.length, scenes: r.scenes.map((x, i) => ({ ...x, image: sel.choix[i], propositions: sel.listes[i] })) };
        }));
      }
      // une scène réécrite selon une consigne, et d'autres photos cherchées à la main pour une scène
      if (req.method === 'POST' && p === '/api/generer/scene') { const b = await readJson(req); return send(res, 200, travail(job => { job.step = 'L’IA locale réécrit la scène…'; return IA().reecrireScene({ texte: String(b.texte || '').slice(0, 1500), instruction: String(b.instruction || '').slice(0, 400), titre: String(b.titre || '').slice(0, 120), style: String(b.style || ''), qualite: String(b.qualite || '') }); })); }
      // Assistant de montage (assistant.js ; l'IA locale seulement si les règles ne comprennent pas la demande)
      if (req.method === 'POST' && p === '/api/assistant/comprendre') {
        const b = await readJson(req), demande = String(b.demande || '').slice(0, 500), AS = require('./assistant');
        const ordre = MEM.detecter(demande), repMem = ordre ? MEM.appliquer(MEMOIRE, ordre, 'QuentMovie') : null; // « retiens que… », « oublie… », « que retiens-tu ? »
        if (repMem) return send(res, 200, { actions: [], ia: false, memoire: repMem });
        const projet = b.projet && typeof b.projet === 'object' ? b.projet : undefined, regles = AS.comprendre(demande, projet);
        const reponse = !regles.length && b.discussion ? AS.repondre(demande, projet) : ''; // discussion : une question sur le montage reçoit sa réponse, calculée par le programme
        if (reponse) return send(res, 200, { actions: [], ia: false, reponse });
        const choix = () => (b.discussion ? AS.proches(demande, projet) : undefined); // pas compris : des choix plutôt qu'un refus
        const teinte = l => l.map(a => (a.action === 'couleur_titre' ? { ...a, couleur: AS.COULEURS[AS.sansAccents(a.parametre)] || '' } : a)); // la couleur posée vient de la liste du programme
        if (regles.length || !b.ia) return send(res, 200, { actions: teinte(regles), ia: false, choix: regles.length ? undefined : choix() });
        try { const actions = teinte(await IA().comprendreDemande(demande)); return send(res, 200, { actions, ia: true, choix: actions.length ? undefined : choix() }); } catch (e) { return send(res, 200, { actions: [], ia: false, erreur: e.message, choix: choix() }); }
      }
      if (req.method === 'GET' && p === '/api/memoire') return send(res, 200, MEMOIRE.lire());
      if (req.method === 'POST' && p === '/api/memoire/corrections') { const b = await readJson(req); MEMOIRE.corrections(Array.isArray(b.paires) ? b.paires.slice(0, 12) : [], 'QuentMovie'); return send(res, 200, { ok: true }); }
      if (req.method === 'POST' && p === '/api/assistant/suggestions') { const b = await readJson(req); return send(res, 200, { suggestions: require('./assistant').suggerer(b && typeof b === 'object' ? b : {}) }); }
      // Chapitres proposés d'après le texte de la vidéo (sous-titres), puis nommés par l'IA locale si elle est installée
      if (req.method === 'POST' && p === '/api/chapitres/proposer') {
        const b = await readJson(req);
        return send(res, 200, travail(async job => {
          const CH = require('./chapitrage'); job.step = 'Lecture du texte de la vidéo…';
          const segs = Array.isArray(b.segments) ? b.segments.slice(0, 6000) : [];
          const ch = CH.proposerChapitres(segs, +b.duree || 0, { nb: b.nb });
          if (!ch.length) return { chapitres: [], ia: false };
          const analyse = await analyserLaVideo(job, segs, +b.duree || 0, b.ia !== false);
          analyse.technique = await analyseTechnique(job, b.clips);
          // un chapitre qui commence juste à côté d'un changement de plan est calé dessus (coupe plus nette)
          if (analyse.technique) ch.forEach(c => { if (c.t > 1) { const sc = analyse.technique.scenes.reduce((m, x) => (Math.abs(x - c.t) < Math.abs(m - c.t) ? x : m), Infinity); if (Math.abs(sc - c.t) <= 2.5) c.t = sc; } });
          job.step = 'L’IA locale nomme les chapitres…'; job.progress = 0.6;
          const r = b.ia === false ? { chapitres: ch, ia: false } : await IA().titrerChapitres({ chapitres: ch, sujet: analyse.sujet, motsCles: analyse.motsCles || [] });
          delete analyse.brut;
          return { chapitres: r.chapitres.map(c => ({ t: c.t, titre: c.titre, resume: c.resume || '' })), ia: r.ia, analyse };
        }));
      }
      // Analyse de la vidéo : sujet, genre, rythme, idées fortes et pack conseillé (programme + IA locale)
      if (req.method === 'POST' && p === '/api/video/analyser') {
        const b = await readJson(req);
        return send(res, 200, travail(async job => { const a = await analyserLaVideo(job, Array.isArray(b.segments) ? b.segments.slice(0, 6000) : [], +b.duree || 0, b.ia !== false); delete a.brut; a.technique = await analyseTechnique(job, b.clips); return a; }));
      }
      // Clipping : les meilleurs extraits de la vidéo pour TikTok / Reels / Shorts
      if (req.method === 'POST' && p === '/api/clipping/proposer') {
        const b = await readJson(req);
        return send(res, 200, travail(async job => {
          const CH = require('./chapitrage'), nb = clamp(Math.round(num(b.nb, 5)), 1, 12); job.step = 'Recherche des meilleurs passages…';
          const segs = Array.isArray(b.segments) ? b.segments.slice(0, 6000) : [], analyse = await analyserLaVideo(job, segs, +b.duree || 0, b.ia !== false);
          analyse.technique = await analyseTechnique(job, b.clips);
          const cands = CH.proposerMoments(segs, +b.duree || 0, { nb: Math.min(14, nb * 2), min: num(b.min, 20), max: num(b.max, 60), analyse: analyse.brut });
          delete analyse.brut;
          if (!cands.length) return { extraits: [], ia: false };
          job.step = 'L’IA locale choisit les plus accrocheurs…'; job.progress = 0.4;
          const r = b.ia === false ? { extraits: cands.slice(0, nb), ia: false } : await IA().choisirExtraits({ candidats: cands, nb, sujet: analyse.sujet || String(b.sujet || ''), idees: analyse.points || [] });
          return { extraits: r.extraits.map(e => ({ s: e.s, e: e.e, titre: e.titre, texte: String(e.t || '').slice(0, 240) })), ia: r.ia, analyse };
        }));
      }
      // Clipping : chaque extrait choisi devient une vidéo à part (vertical, sous-titres TikTok, accroche), rangée avec les exports
      if (req.method === 'POST' && p === '/api/clipping/exporter') {
        const b = await readJson(req);
        return send(res, 200, travail(async job => {
          const D = require('./decoupe'), liste = (Array.isArray(b.extraits) ? b.extraits : []).slice(0, 12), fichiers = [];
          if (!liste.length) throw new Error('Aucun extrait choisi.');
          for (const [k, e] of liste.entries()) {
            job.step = `Clip ${k + 1} sur ${liste.length}…`;
            const q = D.habillerTikTok(D.extraireSegment(b.project || {}, num(e.s, 0), num(e.e, 0)), { format: ['vertical', 'carre', 'horizontal'].includes(b.format) ? b.format : 'vertical', cadrage: b.cadrage, accroche: b.accroche === false ? '' : String(e.titre || '') });
            q.sortie = 'mp4'; q.normaliser = !!b.normaliser;
            const sub = { progress: 0, step: '', out: null, error: null, done: false }, suivi = setInterval(() => { job.progress = (k + sub.progress) / liste.length; }, 300);
            try { await exportProject(sub, q); } finally { clearInterval(suivi); }
            const slug = String(e.titre || 'extrait').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'extrait';
            const nom = `clip-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}-${k + 1}-${slug}.mp4`;
            fs.renameSync(path.join(EXPORTS, sub.out), path.join(EXPORTS, nom)); fichiers.push({ fichier: nom, titre: String(e.titre || ''), duree: +(num(e.e, 0) - num(e.s, 0)).toFixed(1) });
          }
          return { fichiers };
        }));
      }
      if (req.method === 'POST' && p === '/api/assistant/publication') { const b = await readJson(req); return send(res, 200, travail(job => { job.step = 'Écriture du titre, de la description et des hashtags…'; const a = b.analyse && typeof b.analyse === 'object' ? b.analyse : {};
        return IA().textesPublication({ texte: String(b.texte || '').slice(0, 3000), plateforme: String(b.plateforme || '').slice(0, 20), titre: String(b.titre || '').slice(0, 120),
          analyse: { sujet: String(a.sujet || '').slice(0, 160), resume: String(a.resume || '').slice(0, 400), motsCles: (Array.isArray(a.motsCles) ? a.motsCles : []).map(m => String(m).slice(0, 40)).slice(0, 6), points: (Array.isArray(a.points) ? a.points : []).map(m => String(m).slice(0, 100)).slice(0, 6) },
          chapitres: (Array.isArray(b.chapitres) ? b.chapitres : []).map(l => String(l).slice(0, 80)).filter(l => /^\d+(:\d{2}){1,2} \S/.test(l)).slice(0, 40) }); })); }
      if (req.method === 'POST' && p === '/api/generer/images') { const b = await readJson(req); return send(res, 200, { images: await GEN().proposer(String(b.q || '').slice(0, 120), { vertical: b.format === 'vertical', videos: !!b.videos }) }); }
      if (req.method === 'POST' && p === '/api/telecharger') { const b = await readJson(req); return send(res, 200, travail(job => IA().telecharger(String(b.lien || ''), MEDIAS, job))); }
      if (req.method === 'GET' && p === '/api/parole') {
        const mac = await GEN().voix();
        return send(res, 200, { ...PAROLE().etat(), mac, reglagesMac: process.platform === 'darwin' });
      }
      if (req.method === 'POST' && p === '/api/parole/installer') { const b = await readJson(req); return send(res, 200, travail(job => PAROLE().installer(String(b.quoi || ''), job))); }
      if (req.method === 'POST' && p === '/api/parole/essai') { // phrase d'essai d'une voix (fichier gardé dans les médias)
        const b = await readJson(req), v = String(b.voix || ''), f = `essai-voix-${v.replace(/[^\w-]/g, '')}.m4a`;
        if (v.startsWith('mac:')) await GEN().lireMac(String(b.texte || '').slice(0, 400), path.join(MEDIAS, f), v.slice(4));
        else await PAROLE().parler(String(b.texte || '').slice(0, 400), v, path.join(MEDIAS, f), { vitesse: clamp(num(b.vitesse, 1), 0.5, 2) });
        return send(res, 200, { file: f });
      }
      if (req.method === 'POST' && p === '/api/parole/dictee') { // dictée de l'assistant : le son du micro devient du texte (rien n'est gardé)
        const f = path.join(TMP, `dictee-${Date.now()}.webm`);
        await new Promise((ok, ko) => { const w = fs.createWriteStream(f); req.pipe(w); w.on('finish', ok); w.on('error', ko); req.on('error', ko); });
        return send(res, 200, travail(async job => {
          job.step = 'Écoute de ta voix…';
          try { const r = await PAROLE().ecouter(f, 0, 0); return { texte: r.mots.map(w => w.m).join(' ').replace(/\s+([,.?!])/g, '$1').trim() }; } finally { fs.rmSync(f, { force: true }); }
        }));
      }
      if (req.method === 'POST' && p === '/api/parole/ecouter') {
        const b = await readJson(req), f = mediaPath(b.file);
        if (!fs.existsSync(f)) throw new Error('Média introuvable');
        return send(res, 200, travail(async job => {
          job.step = 'Écoute de la voix…';
          const P = require('./parole'), r = await PAROLE().ecouter(f, clamp(num(b.in, 0), 0, 1e6), clamp(num(b.out, 0), 0, 1e6));
          const niveaux = P.garderNiveaux(r.mots, r.duree);
          return { ...r, st: { phrase: P.sousTitres(r.mots, 'phrase'), mots: P.sousTitres(r.mots, 'mots') }, garder: niveaux.douce, garderNiveaux: niveaux };
        }));
      }
      if (req.method === 'POST' && p === '/api/parole/reglages-mac') { // Réglages Système → voix (pour télécharger les voix « Premium » d'Apple)
        if (process.platform === 'darwin') spawn('open', ['x-apple.systempreferences:com.apple.preference.universalaccess?SpokenContent']);
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && p === '/api/generer/creer') {
        const body = await readJson(req);
        if (!Array.isArray(body.scenes) || !body.scenes.length || body.scenes.length > 80) throw new Error('Rien à créer.');
        const id = String(Date.now()) + Math.floor(Math.random() * 1000);
        const job = { progress: 0, step: 'Préparation', out: null, url: null, error: null, done: false, resultat: null };
        jobs.set(id, job);
        GEN().fabriquer(job, { titre: String(body.titre || ''), scenes: body.scenes.map(x => ({ texte: String(x.texte || '').slice(0, 1200), section: String(x.section || '').slice(0, 80), image: Number.isInteger(x.image) ? x.image : -1 })),
          images: (body.images || []).slice(0, 60), voix: String(body.voix || '').slice(0, 60), vitesse: clamp(num(body.vitesse, 175), 120, 260) })
          .then(r => { job.resultat = r; job.progress = 100; job.done = true; }).catch(e => { job.error = e.message; });
        return send(res, 200, { id });
      }
      if (req.method === 'GET' && p === '/api/packs') return send(res, 200, { ...(await scanPacks()), dossier: PACKS });
      if (req.method === 'POST' && p === '/api/packs/ouvrir') { // ouvrir le dossier « Mes packs » dans le Finder
        if (process.platform === 'darwin') spawn('open', [PACKS]);
        return send(res, 200, { ok: true, dossier: PACKS });
      }
      if (req.method === 'GET' && p === '/api/medias') {
        const items = [];
        for (const n of fs.readdirSync(MEDIAS).filter(x => !x.startsWith('.'))) {
          try { items.push({ file: n, ...(await probe(path.join(MEDIAS, n))) }); } catch (e) { /* fichier ignoré */ }
        }
        return send(res, 200, { items });
      }
      if (req.method === 'POST' && p === '/api/import' && /\.cube$/i.test(url.searchParams.get('name') || '')) { // look LUT : rangé dans Mes packs
        const dir = path.join(PACKS, 'LUT importés'); fs.mkdirSync(dir, { recursive: true });
        const name = safeName(url.searchParams.get('name')), dest = path.join(dir, name);
        const txt = await new Promise((ok, ko) => { let b = ''; req.on('data', d => { b += d; if (b.length > 6e7) req.destroy(); }); req.on('end', () => ok(b)); req.on('error', ko); });
        if (!/LUT_3D_SIZE\s+\d+/.test(txt)) throw new Error('Ce fichier .cube n’est pas un LUT 3D.');
        fs.writeFileSync(dest, txt);
        return send(res, 200, { file: 'pack:LUT importés/' + name, kind: 'lut' });
      }
      if (req.method === 'POST' && p === '/api/import') {
        let name = safeName(url.searchParams.get('name')), dest = path.join(MEDIAS, name), i = 2;
        while (fs.existsSync(dest)) { const e = path.extname(name); dest = path.join(MEDIAS, `${path.basename(name, e)}-${i++}${e}`); }
        await new Promise((ok, ko) => { const w = fs.createWriteStream(dest); req.pipe(w); w.on('finish', ok); w.on('error', ko); req.on('error', ko); });
        if (/\.(heic|heif)$/i.test(dest)) { // photos iPhone : conversion par l'outil intégré à macOS
          if (process.platform !== 'darwin') { fs.unlinkSync(dest); throw new Error('Les photos HEIC ne sont lues que sur Mac : exporte-les en JPG.'); }
          const jpg = dest.replace(/\.(heic|heif)$/i, '.jpg');
          try { await run('sips', ['-s', 'format', 'jpeg', dest, '--out', jpg]); fs.unlinkSync(dest); dest = jpg; }
          catch (e) { try { fs.unlinkSync(dest); } catch (e2) { /* ignoré */ } throw new Error('Impossible de convertir cette photo HEIC.'); }
        }
        if (/^camera-/.test(path.basename(dest))) return send(res, 200, await importerPrise(dest)); // prise du studio
        try {
          let info = await probe(dest);
          if (info.kind === 'audio' && !(info.duration > 0)) { // enregistrement du micro : durée absente, on convertit
            const m4a = dest.replace(/\.[^.]+$/, '') + '.m4a';
            await run(FFMPEG, ['-y', '-v', 'error', '-i', dest, '-vn', '-c:a', 'aac', '-b:a', '192k', m4a]); if (m4a !== dest) fs.unlinkSync(dest);
            dest = m4a; info = await probe(dest);
          }
          if (info.kind === 'video' && !(info.duration > 0)) { // vidéo sans durée connue : fichier propre
            const mp4 = dest.replace(/\.[^.]+$/, '') + '-prise.mp4';
            await run(FFMPEG, ['-y', '-v', 'error', '-i', dest, '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', 18, '-pix_fmt', 'yuv420p',
              '-c:a', 'aac', '-b:a', '192k', '-ar', 48000, '-movflags', '+faststart', mp4]);
            fs.unlinkSync(dest); dest = mp4; info = await probe(dest);
          }
          return send(res, 200, { file: path.basename(dest), ...info });
        }
        catch (e) { fs.unlinkSync(dest); throw new Error('Ce fichier n’est pas un média lisible.'); }
      }
      if (req.method === 'DELETE' && p.startsWith('/api/medias/')) {
        const f = path.join(MEDIAS, safeName(decodeURIComponent(p.slice(12)))); // jamais la bibliothèque ni les packs
        if (fs.existsSync(f)) fs.unlinkSync(f);
        return send(res, 200, { ok: true });
      }
      if (req.method === 'GET' && p === '/api/proxy') { // copie légère H.264 pour lire n'importe quel format dans la fenêtre
        const src = mediaPath(url.searchParams.get('file')), st = fs.statSync(src);
        const info = await probe(src), audioOnly = info.kind === 'audio';
        const name = `${safeName(url.searchParams.get('file'))}-${st.size}-${Math.round(st.mtimeMs)}.${audioOnly ? 'm4a' : 'mp4'}`, dest = path.join(PROXIES, name);
        if (!fs.existsSync(dest)) {
          if (!proxyJobs.has(name)) {
            const tmp = dest + '.part.' + (audioOnly ? 'm4a' : 'mp4');
            const a = audioOnly ? ['-vn', '-c:a', 'aac', '-b:a', '128k'] : ['-vf', 'scale=-2:540,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', 27, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart'];
            proxyJobs.set(name, run(FFMPEG, ['-y', '-v', 'error', '-i', src, ...a, tmp]).then(() => fs.renameSync(tmp, dest)).finally(() => proxyJobs.delete(name)));
          }
          await proxyJobs.get(name);
        }
        return send(res, 200, { url: '/proxy/' + encodeURIComponent(name) });
      }
      if (req.method === 'GET' && p === '/api/wave') { // forme d'onde d'un son
        const w = clamp(Math.round(num(url.searchParams.get('w'), 800)), 50, 4000), h = clamp(Math.round(num(url.searchParams.get('h'), 80)), 20, 400);
        const de = num(url.searchParams.get('in'), 0), du = num(url.searchParams.get('dur'), 0);
        const src = mediaPath(url.searchParams.get('file'));
        const img = await enCache(src, ['onde', w, h, de, du], () => run(FFMPEG, ['-v', 'error', ...(de > 0 ? ['-ss', de] : []), ...(du > 0 ? ['-t', du] : []), '-i', src, '-vn', '-filter_complex', `aformat=channel_layouts=mono,showwavespic=s=${w}x${h}:colors=white`,
          '-frames:v', 1, '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { binary: true }));
        return send(res, 200, img, 'image/png', 'max-age=86400');
      }
      // Banques de photos : liste, activation, clé gratuite (les clés ne sont jamais renvoyées)
      if (req.method === 'GET' && p === '/api/banques') {
        const B = require('./banques'), r = lireRegl(), cles = r.cles || {};
        return send(res, 200, { banques: B.BANQUES.map(x => ({ id: x.id, nom: x.nom, necessiteCle: x.cle, cle: !!cles[x.id], cleFin: cles[x.id] ? '…' + String(cles[x.id]).slice(-4) : '', active: r.actives && r.actives[x.id] !== undefined ? r.actives[x.id] : x.defaut, licence: x.licence, lien: x.lien })) });
      }
      if (req.method === 'POST' && p === '/api/banques') {
        const b = await readJson(req), B = require('./banques'), def = B.BANQUES.find(x => x.id === String(b.id || '')); if (!def) throw new Error('Banque inconnue');
        const r = lireRegl(); r.cles = r.cles || {}; r.actives = r.actives || {};
        if (typeof b.active === 'boolean') r.actives[def.id] = b.active;
        if (def.cle && typeof b.cle === 'string') { const k = b.cle.trim(); if (k && !/^[\w.\-]{8,120}$/.test(k)) throw new Error('Cette clé ne ressemble pas à une clé valide (lettres, chiffres, tirets).'); if (k) r.cles[def.id] = k; else delete r.cles[def.id]; }
        ecrireRegl(r); return send(res, 200, { ok: true });
      }
      // Vignettes des photos du générateur : téléchargées ici (taille standard de Wikimedia, identification polie, 4 à la fois, gardées en cache)
      if (req.method === 'GET' && p === '/api/vignette') {
        const u0 = String(url.searchParams.get('u') || ''); let ux = null;
        try { ux = new URL(u0); } catch (e) { /* adresse invalide */ }
        const HOTES = ['upload.wikimedia.org', 'images.pexels.com', 'cdn.pixabay.com', 'pixabay.com', 'images.unsplash.com', 'plus.unsplash.com', 'api.openverse.org', 'images-assets.nasa.gov'];
        const origines = [opts.commons, ...Object.values(opts.banques || {})].filter(Boolean).map(x => { try { return new URL(x).origin; } catch (e) { return ''; } });
        const permis = ux && ((ux.protocol === 'https:' && HOTES.includes(ux.hostname)) || origines.includes(ux.origin));
        if (!permis) return send(res, 403, { error: 'Adresse refusée' });
        const PAS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840], w = clamp(Math.round(num(url.searchParams.get('w'), 330)), 20, 3840), std = PAS.find(x => x >= w) || 3840;
        // un fichier d'origine (photo plus petite que la miniature demandée) est réduit lui aussi plutôt que téléchargé en entier
        const m = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/?]+\.(?:jpe?g|png))(?:\?.*)?$/i.exec(u0);
        const u = ux.hostname === 'upload.wikimedia.org' ? (m ? `${m[1]}/thumb/${m[2]}/${m[3]}/${std}px-${m[3]}` : u0).replace(/\/(\d+)px-/, `/${std}px-`) : u0, fich = path.join(BASE, 'cache-vignettes', require('crypto').createHash('sha1').update(u).digest('hex') + '.img');
        if (!fs.existsSync(fich)) { fs.mkdirSync(path.dirname(fich), { recursive: true }); await vignetteFile(u, fich); }
        const tete = Buffer.alloc(4); const fd = fs.openSync(fich, 'r'); fs.readSync(fd, tete, 0, 4, 0); fs.closeSync(fd);
        res.writeHead(200, { 'Content-Type': tete[0] === 0x89 ? 'image/png' : tete[0] === 0x52 ? 'image/webp' : 'image/jpeg', 'Cache-Control': 'max-age=86400' });
        return fs.createReadStream(fich).pipe(res);
      }
      if (req.method === 'GET' && p === '/api/plans') { // changements de plan d'un extrait vidéo (pour le découper automatiquement)
        const q = url.searchParams, from = Math.max(0, num(q.get('in'), 0)), to = num(q.get('out'), 0), seuil = clamp(num(q.get('seuil'), 0.3), 0.1, 0.8), dur = to > from ? to - from : 0;
        const log = await run(FFMPEG, ['-hide_banner', '-nostats', '-ss', from, ...(dur ? ['-t', dur] : []), '-i', mediaPath(q.get('file')), '-an', '-vf', `scale=320:-2,select='gt(scene,${seuil})',showinfo`, '-f', 'null', '-'], { wantErr: true });
        const t = [...log.matchAll(/pts_time:([\d.]+)/g)].map(m => +m[1]).filter(x => x > 0.4 && (!dur || x < dur - 0.4)).sort((x, y) => x - y);
        const plans = []; for (const x of t) if (!plans.length || x - plans[plans.length - 1] >= 0.5) plans.push(+x.toFixed(2));
        return send(res, 200, { plans: plans.map(x => +(from + x).toFixed(2)) });
      }
      if (req.method === 'GET' && p === '/api/rythme') { // tempo et temps forts d'une musique
        const q = url.searchParams, de = Math.max(0, num(q.get('in'), 0)), du = clamp(num(q.get('dur'), 120), 5, 240);
        const buf = await run(FFMPEG, ['-v', 'error', '-ss', de, '-t', du, '-i', mediaPath(q.get('file')), '-vn', '-ac', 1, '-ar', 11025, '-f', 's16le', 'pipe:1'], { binary: true });
        const pcm = new Int16Array(buf.length >> 1); for (let i = 0; i < pcm.length; i++) pcm[i] = buf.readInt16LE(i * 2);
        const r = require('./rythme').analyser(pcm, 11025);
        if (!r) throw new Error('Son trop court pour trouver le rythme.');
        return send(res, 200, { ...r, temps: r.temps.slice(0, 1500).map(x => +(de + x).toFixed(3)), premier: +(de + r.premier).toFixed(3) });
      }
      if (req.method === 'GET' && p === '/api/silences') { // trouve les silences d'un extrait pour les couper
        const q = url.searchParams, from = Math.max(0, num(q.get('in'), 0)), to = num(q.get('out'), 0), db = clamp(num(q.get('db'), -35), -70, -10), min = clamp(num(q.get('min'), 0.5), 0.15, 5);
        const dur = to > from ? to - from : 0;
        const log = await run(FFMPEG, ['-hide_banner', '-nostats', '-ss', from, ...(dur ? ['-t', dur] : []), '-i', mediaPath(q.get('file')), '-vn', '-af', `silencedetect=noise=${db}dB:d=${min}`, '-f', 'null', '-'], { wantErr: true });
        const sil = []; let cur = null;
        for (const line of log.split('\n')) {
          let m = /silence_start: (-?[\d.]+)/.exec(line); if (m) cur = { s: Math.max(0, +m[1]) };
          m = /silence_end: ([\d.]+)/.exec(line); if (m && cur) { cur.e = +m[1]; sil.push(cur); cur = null; }
        }
        if (cur) sil.push({ s: cur.s, e: dur || 1e9 });
        return send(res, 200, { silences: sil.map(x => ({ s: +(from + x.s).toFixed(2), e: +(from + x.e).toFixed(2) })) });
      }
      if (req.method === 'GET' && p === '/api/frame') {
        const src = mediaPath(url.searchParams.get('file')), t = num(url.searchParams.get('t'), 0), w = clamp(Math.round(num(url.searchParams.get('w'), 480) / 2) * 2, 64, 3840), q = url.searchParams.get('w') ? 2 : 5;
        const img = await enCache(src, ['image', t, w, q], () => run(FFMPEG, ['-v', 'error', '-ss', t, '-i', src, '-frames:v', 1, '-vf', `scale=${w}:-2`, '-f', 'mjpeg', '-q:v', q, 'pipe:1'], { binary: true }));
        return send(res, 200, img, 'image/jpeg', 'max-age=3600');
      }
      if (req.method === 'POST' && p === '/api/preview') {
        const body = await readJson(req);
        const dir = fs.mkdtempSync(path.join(TMP, 'pv-'));
        try {
          const taille = body.mode === 'hd' ? sizeOf({ ...(body.project || {}), res: 1080 }, 'full') : sizeOf(body.project || {}, 'thumb' === body.mode ? 'thumb' : 'proxy');
          const c0 = body.clip || {}; await calquesEnBoucle(c0);
          const hdr = c0.file && !['image', 'solid', 'audio'].includes(c0.kind) && hdrPossible() ? await estHdr(mediaPath(c0.file)) : false;
          const args = buildClip(body.clip, taille, { preview: true, t: body.t, tdir: { dir, idx: 0 }, hdr });
          return send(res, 200, await run(FFMPEG, args, { cwd: dir, binary: true }), 'image/jpeg');
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
      }
      if (req.method === 'GET' && p === '/api/fxthumb') { // vignette d'un effet sur l'image du clip choisi
        const q = url.searchParams, id = q.get('fx'), kind = q.get('kind') === 'image' ? 'image' : 'video';
        const isA = FX.AUDIO.some(a => a.id === id) && !FX.VIDEO.some(v => v.id === id); // « qualite » existe en image et en son
        if (isA) return send(res, 404, { error: 'Pas de vignette' });
        const clip = { file: q.get('file'), kind, in: num(q.get('t'), 0), out: num(q.get('t'), 0) + 2, dur: 3, speed: 1, fit: 'fill', fx: id ? [{ id }] : [], key: {}, lut: q.get('lut') ? { file: q.get('lut'), amount: 100 } : null };
        const dir = fs.mkdtempSync(path.join(TMP, 'th-'));
        try {
          const args = buildClip(clip, sizeOf({ format: 'carre' }, 'thumb'), { preview: true, t: 0.8, tdir: { dir, idx: 0 } });
          return send(res, 200, await run(FFMPEG, args, { cwd: dir, binary: true }), 'image/jpeg', 'max-age=600');
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
      }
      if (req.method === 'POST' && (p === '/api/export' || p === '/api/apercu')) {
        const body = await readJson(req);
        const id = String(Date.now()) + Math.floor(Math.random() * 1000);
        const job = { progress: 0, step: 'Préparation', out: null, url: null, error: null, done: false };
        jobs.set(id, job);
        // export d'un passage seulement (essai avant un long export) : le montage est découpé entre s et e
        const pl = body.plage, projet = pl && num(pl.e, 0) > num(pl.s, 0) ? require('./decoupe').extraireSegment(body.project || {}, num(pl.s, 0), num(pl.e, 0)) : body.project || {};
        if (pl) job.extrait = true;
        exportProject(job, projet, { proxy: p === '/api/apercu' }).catch(e => { job.error = job.annule ? 'Export annulé.' : messageClair(e.message); })
          .finally(() => { if (job.dir) { dossiersAnnules.delete(job.dir); enCours.delete(job.dir); } });
        return send(res, 200, { id });
      }
      if (req.method === 'POST' && p === '/api/annuler') { // arrêt d'un export ou d'un aperçu en cours
        const job = jobs.get(url.searchParams.get('id'));
        if (job && !job.done && !job.error) { job.annule = true; annulerDossier(job.dir); if (job.enfant) { try { job.enfant.kill('SIGTERM'); } catch (e) { /* déjà arrêté */ } } }
        return send(res, 200, { ok: !!job });
      }
      if (req.method === 'GET' && p === '/api/job') {
        const job = jobs.get(url.searchParams.get('id'));
        return job ? send(res, 200, { progress: job.progress, step: job.step, out: job.out, url: job.url, error: job.error, done: job.done, resultat: job.resultat || null, niveaux: job.niveaux, duree: job.fin && job.debut ? +((job.fin - job.debut) / 1000).toFixed(1) : null, repris: job.repris, morceaux: job.morceaux || 0, paralleles: job.paralleles || 0, assemblage: job.assemblage || null, harmonises: job.harmonises || 0, avertissement: job.avertissement || null, raisonRapide: job.raisonRapide || null, msAssemblage: job.msAssemblage || 0 }) : send(res, 404, { error: 'Export inconnu' });
      }
      // Projets
      // Secours du studio : la prise est aussi écrite sur le disque pendant l'enregistrement (récupérable si l'application se ferme)
      if (p === '/api/prise/secours') {
        const dossier = path.join(BASE, 'prises-a-verifier'), id = String(url.searchParams.get('id') || '').replace(/[^\w-]/g, '').slice(0, 40);
        if (req.method === 'GET') { // prises interrompues trouvées au démarrage
          let l = []; try { l = fs.readdirSync(dossier).filter(n => /^prise-interrompue-[\w-]+\.(mp4|webm)$/.test(n) && fs.statSync(path.join(dossier, n)).size > 20000); } catch (e) { /* aucun dossier */ }
          return send(res, 200, { prises: l, dossier });
        }
        if (!id) throw new Error('Prise inconnue');
        const ext = url.searchParams.get('ext') === 'webm' ? 'webm' : 'mp4', f = path.join(dossier, `prise-interrompue-${id}.${ext}`);
        if (req.method === 'POST') { fs.mkdirSync(dossier, { recursive: true }); await new Promise((ok, ko) => { const w = fs.createWriteStream(f, { flags: 'a' }); req.pipe(w); w.on('finish', ok); w.on('error', ko); req.on('error', ko); }); return send(res, 200, { ok: true }); }
        if (req.method === 'DELETE') { for (const e of ['mp4', 'webm']) { try { fs.unlinkSync(path.join(dossier, `prise-interrompue-${id}.${e}`)); } catch (er) { /* déjà retirée */ } } return send(res, 200, { ok: true }); }
      }
      if (req.method === 'POST' && p === '/api/prise/recuperer') { // prise interrompue → médias (convertie comme une prise normale)
        const nom = path.basename(String(url.searchParams.get('fichier') || '')), src = path.join(BASE, 'prises-a-verifier', nom);
        if (!/^prise-interrompue-[\w-]+\.(mp4|webm)$/.test(nom) || !fs.existsSync(src)) throw new Error('Prise introuvable');
        const dest = path.join(MEDIAS, 'camera-recuperee-' + nom.replace(/^prise-interrompue-/, ''));
        fs.renameSync(src, dest);
        return send(res, 200, await importerPrise(dest));
      }
      { const r = await RPI.creer({ BASE, FFMPEG, opts, send, readJson, travail, PAROLE })(req, res, p, url); if (r !== RPI.NON) return r; } // épisode Pico fabriqué dans QuentMovie, navigateur des écrans (routes-pico.js)
      { const r = await RP.creer({ PUB, opts, send, readJson, travail, EXPORTS, safeName })(req, res, p); if (r !== RP.NON) return r; } // publication YouTube et TikTok (routes-publier.js)
      { const r = await RV.creer({ BASE, MEDIAS, FFMPEG, opts, run, probe, send, readJson, travail, PAROLE, VOIXCLONE, GEN, IA, safeName, num })(req, res, p, url); if (r !== RV.NON) return r; } // doublage, voix clonée, prononciations, fiche (routes-voix.js)
      if (p === '/api/projet') { // enregistrement automatique
        const f = path.join(BASE, 'projet-auto.json');
        if (req.method === 'PUT') { fs.writeFileSync(f, JSON.stringify(await readJson(req))); return send(res, 200, { ok: true }); }
        return send(res, 200, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : 'null');
      }
      if (req.method === 'POST' && p === '/api/miniature') { // miniature (JPEG dessiné par la fenêtre) rangée avec les exports
        const buf = await new Promise((ok, ko) => { const l = []; let n = 0; req.on('data', d => { n += d.length; if (n > 2e7) req.destroy(); else l.push(d); }); req.on('end', () => ok(Buffer.concat(l))); req.on('error', ko); });
        if (buf.length < 1000 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('Image de miniature invalide');
        const name = `miniature-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.jpg`;
        fs.writeFileSync(path.join(EXPORTS, name), buf);
        return send(res, 200, { out: name });
      }
      if (req.method === 'GET' && p === '/api/ecran') return send(res, 200, { statut: opts.ecran ? opts.ecran.statut() : 'granted' }); // autorisation d'enregistrement de l'écran (macOS)
      if (req.method === 'POST' && p === '/api/energie') { const b = await readJson(req).catch(() => ({})); if (opts.energie) opts.energie(!!b.studio); return send(res, 200, { ok: !!opts.energie }); } // studio ouvert = fenêtre non ralentie
      if (req.method === 'POST' && p === '/api/ecran/reglages') { if (opts.ecran) opts.ecran.reglages(); return send(res, 200, { ok: !!opts.ecran }); }
      if (req.method === 'POST' && p === '/api/partager') { // feuille de partage de macOS (AirDrop, Messages, Mail…) pour des fichiers des exports
        const noms = [].concat((await readJson(req)).files || []).slice(0, 50).map(n => path.join(EXPORTS, safeName(String(n)))).filter(f => fs.existsSync(f));
        if (!noms.length) return send(res, 404, { error: 'Fichier introuvable dans les exports.' });
        if (!opts.partager) return send(res, 200, { ok: false, folder: EXPORTS, message: 'Le partage AirDrop est disponible dans l’application Mac.' });
        opts.partager(noms);
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && p === '/api/clip/analyse') { // mesures d'un média (blancs, luminosité, niveau, plans) pour la suggestion de l'inspecteur ; gardées en cache
        const b = await readJson(req), f = String(b.file || '');
        if (!f || /^(lib|pack):/.test(f)) return send(res, 200, { analyse: null });
        return send(res, 200, { analyse: await analyseFichier(mediaPath(f)) });
      }
      if (req.method === 'POST' && p === '/api/exports/retirer') { // vidéo envoyée en ligne sans la garder sur le Mac (case décochée dans « Exporter et publier »)
        const f = path.join(EXPORTS, safeName((await readJson(req)).file));
        if (fs.existsSync(f)) fs.unlinkSync(f);
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && p === '/api/reveal') { // afficher un export dans le Finder
        const f = path.join(EXPORTS, safeName((await readJson(req)).file));
        if (process.platform === 'darwin' && fs.existsSync(f)) spawn('open', ['-R', f]);
        return send(res, 200, { ok: true, folder: EXPORTS });
      }
      if (req.method === 'GET' && p === '/api/projets') return send(res, 200, { items: fs.readdirSync(PROJETS).filter(n => n.endsWith('.qmovie')).map(n => n.replace(/\.qmovie$/, '')) });
      if (p.startsWith('/api/projets/')) {
        const f = projFile(decodeURIComponent(p.slice(13)));
        if (req.method === 'PUT') { fs.writeFileSync(f, JSON.stringify(await readJson(req))); return send(res, 200, { ok: true }); }
        if (req.method === 'GET') return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f, 'utf8')) : send(res, 404, { error: 'Projet introuvable' });
        if (req.method === 'DELETE') { if (fs.existsSync(f)) fs.unlinkSync(f); return send(res, 200, { ok: true }); }
      }
      send(res, 404, { error: 'Introuvable' });
    } catch (e) { send(res, 500, { error: e.message }); }
  });

  return {
    server, buildClip, sizeOf, mediaPath, probe, get filters() { return filters; },
    async start() {
      await detect();
      await new Promise((ok, ko) => { server.once('error', ko); server.listen(PORT, '127.0.0.1', ok); });
      return server.address().port;
    },
    stop() { server.close(); if (parole) parole.arreter(); if (ia) ia.arreter(); for (const l of enCours.values()) for (const p of l) { try { p.kill('SIGKILL'); } catch (e) { /* déjà fini */ } } }, // aucun FFmpeg ne continue après la fermeture
  };
}

module.exports = { create };

if (require.main === module) {
  const { resolveFfmpeg } = require('./ffmpeg-path');
  (async () => {
    const bins = await resolveFfmpeg();
    const app = create({ port: +process.env.QM_PORT || 4173, base: process.env.QM_DIR, ...bins });
    const port = await app.start();
    console.log(`QuentMovie : http://localhost:${port}`);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
