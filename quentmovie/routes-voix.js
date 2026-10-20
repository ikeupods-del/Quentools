// Routes de la voix : doublage (voix du propriétaire réplique par réplique, corpus « Ma voix »), voix clonée (essai), dictionnaire et contrôle de
// prononciation, contrôle d'une fiche QuentInvest. Sorties de server.js pour le garder lisible ; même contexte (dossiers, outils, travaux de fond).
// `traiter` renvoie NON quand la requête n'est pas pour ce module ; sinon la réponse envoyée (ou une erreur levée, gérée par le serveur).
'use strict';
const fs = require('fs'), path = require('path');
const NON = Symbol('non traité');

function creer({ BASE, MEDIAS, FFMPEG, opts, run, probe, send, readJson, travail, PAROLE, VOIXCLONE, GEN, IA, safeName, num }) {
  // numéro du prochain épisode : un de plus que les fiches et épisodes déjà présents (dépôt de la chaîne, ~/Movies/QuentInvest, brouillons)
  function prochainNumero() {
    const os = require('os'), dossiers = [path.join(BASE, 'quentinvest', 'fiches'), path.join(opts.sortiesPico || path.join(os.homedir(), 'Movies', 'QuentInvest'), 'fiches'), path.join(opts.sortiesPico || path.join(os.homedir(), 'Movies', 'QuentInvest'), 'episodes'), path.join(__dirname, '..', 'design', 'quentinvest-youtube', 'fiches')];
    let max = 0; for (const d of dossiers) { try { for (const n of fs.readdirSync(d)) { const m = /^(\d{1,3})-/.exec(n); if (m && +m[1] < 98) max = Math.max(max, +m[1]); } } catch (e) { /* dossier absent */ } }
    return max + 1;
  }
  // Brouillon d'une fiche : article Wikipédia + IA locale (reformulation contrôlée) + structure de la chaîne ; gardé dans ~/Movies/QuentMovie/quentinvest/fiches
  async function brouillonDe(sujet, job, { article: art, numero } = {}) {
    job.step = 'Recherche de l’article Wikipédia…';
    const article = String(art || '').trim() || ((await GEN().chercher(sujet)).resultats[0] || {}).titre;
    if (!article) throw new Error(`Aucun article Wikipédia trouvé pour « ${sujet} ». Sujet d’actualité ? Écris ton script.`);
    const r = await require('./fiche-ia').brouillon({
      sujet, article, numero: Math.max(1, Math.floor(num(numero, prochainNumero()))), url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, '_'))}`,
      faits: (a, d) => GEN().faits(a, d),
      ecrire: (o, j) => IA().ecrireScript({ ...o, style: 'documentaire', consigne: 'Tutoie le spectateur, phrases courtes de vingt mots au plus, aucun fait ajouté.', recherche: false }, j)
    }, job);
    const dossier = path.join(BASE, 'quentinvest', 'fiches'); fs.mkdirSync(dossier, { recursive: true });
    const f = path.join(dossier, `${String(r.fiche.numero).padStart(2, '0')}-${r.fiche.slug}.json`); fs.writeFileSync(f, JSON.stringify(r.fiche, null, 1) + '\n');
    return { ...r, fichier: f, article };
  }
  return async function traiter(req, res, p, url) {
    // Dictionnaire de prononciation : « mot écrit → comme il se dit », appliqué à toutes les voix (voix-texte.js) ; celui de l'utilisateur passe avant le livré
    if (p === '/api/prononciations') {
      const VT = require('./voix-texte');
      if (req.method === 'GET') return send(res, 200, { livre: VT.motsLivres(), perso: VT.motsPerso(), fichier: VT.fichierPerso() });
      if (req.method === 'PUT') {
        const b = await readJson(req), mots = {};
        for (const [k, v] of Object.entries(b.mots && typeof b.mots === 'object' ? b.mots : {})) { const e = String(k).trim().slice(0, 60); if (e && !e.startsWith('_')) mots[e] = String(v == null ? '' : v).trim().slice(0, 80); }
        if (Object.keys(mots).length > 800) throw new Error('Trop de mots dans le dictionnaire');
        const f = VT.fichierPerso(); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify({ version: 1, mots }, null, 1)); fs.renameSync(f + '.tmp', f);
        return send(res, 200, { ok: true, perso: VT.motsPerso() });
      }
    }
    // Contrôle de prononciation : la voix lit le texte, la reconnaissance le réécoute, les mots mal compris sont proposés pour le dictionnaire
    if (req.method === 'POST' && p === '/api/prononciations/controle') {
      const b = await readJson(req), texte = String(b.texte || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
      if (texte.length < 10) throw new Error('Écris ou colle un texte d’au moins une phrase.');
      return send(res, 200, travail(async job => {
        const P = PAROLE(), e = P.etat();
        if (!e.ecoute.installee) throw new Error('Installe d’abord la reconnaissance de la voix (Voix naturelles).');
        const v = String(b.voix || '') || (e.voix.find(x => x.installee) || {}).id; if (!v) throw new Error('Installe d’abord une voix naturelle pour faire le contrôle.');
        job.step = 'La voix lit le texte…'; job.progress = 0.1;
        const f = path.join(MEDIAS, 'controle-prononciation.m4a'); await P.parler(texte, v, f);
        job.step = 'Réécoute du texte…'; job.progress = 0.55;
        const r = await P.ecouter(f), entendu = r.mots.map(w => w.m).join(' ');
        return { ...require('./prononciation-controle').comparer(texte, entendu), entendu, voix: v };
      }));
    }
    // Contrôle d'une fiche d'épisode QuentInvest avant fabrication (fiche-quentinvest.js)
    if (req.method === 'POST' && p === '/api/quentinvest/controle') {
      const b = await readJson(req); let fiche = b.fiche; if (typeof fiche === 'string') { try { fiche = JSON.parse(fiche); } catch (e) { throw new Error('Ce texte n’est pas une fiche valide (JSON illisible) : ' + e.message.slice(0, 80)); } }
      if (!fiche || typeof fiche !== 'object') throw new Error('Colle le contenu de la fiche.');
      return send(res, 200, require('./fiche-quentinvest').controler(fiche, { faits: String(b.faits || '').slice(0, 60000), lexique: require('./voix-texte').lexiqueActuel() }));
    }
    // Voix clonée (essai) : modèles de clonage installés à la demande, mêmes phrases dites par chacun avec ta voix (voix-clone.js)
    if (p.startsWith('/api/voix-clone')) {
      const VC = VOIXCLONE();
      if (req.method === 'GET' && p === '/api/voix-clone') {
        let corpus = { prises: 0, secondes: 0 }; try { const l = Object.values(JSON.parse(fs.readFileSync(path.join(BASE, 'ma-voix', 'index.json'), 'utf8'))); corpus = { prises: l.length, secondes: +l.reduce((t, x) => t + (x.duree || 0), 0).toFixed(1) }; } catch (e) { /* pas encore de corpus */ }
        return send(res, 200, { ...VC.etat(), corpus });
      }
      if (req.method === 'POST' && p === '/api/voix-clone/essai') { const b = await readJson(req); return send(res, 200, travail(job => VC.essai(Array.isArray(b.moteurs) ? b.moteurs.map(String) : [], job))); }
      if (req.method === 'GET' && p === '/api/voix-clone/journal') return send(res, 200, { texte: VC.journalFin(80), etat: VC.etat() }); // rapport à envoyer en cas de problème
      if (req.method === 'GET' && p === '/api/voix-clone/audio') {
        const f = VC.fichier(url.searchParams.get('f')); if (!f) return send(res, 404, { error: 'Fichier introuvable' });
        res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': fs.statSync(f).size, 'Cache-Control': 'no-cache' }); return fs.createReadStream(f).pipe(res);
      }
      if (req.method === 'POST' && p === '/api/voix-clone/dossier') { fs.mkdirSync(VC.essais, { recursive: true }); if (opts.ouvrirDossier) opts.ouvrirDossier(VC.essais); return send(res, 200, { ok: !!opts.ouvrirDossier, dossier: VC.essais }); }
    }
    // Doublage : ta voix, réplique par réplique (v00.wav, v01.wav…), rangée dans un dossier par doublage ; les fabrications de la chaîne QuentInvest la lisent (--voix-perso)
    if (p.startsWith('/api/doublage')) {
      const nom = safeName(url.searchParams.get('nom') || 'doublage').replace(/\.+$/, '') || 'doublage', dossier = path.join(BASE, 'doublages', nom);
      const nTexte = url.searchParams.get('n'), n = nTexte === null || nTexte === '' ? -1 : Math.floor(num(nTexte, -1)), wav = k => path.join(dossier, `v${String(k).padStart(2, '0')}.wav`), pose = k => `doublage-${nom}-${String(k).padStart(2, '0')}.wav`;
      // « Ma voix » : toutes les répliques de tous les doublages, avec leur texte, au format d'entraînement d'une voix (wavs/ + metadata.csv « id|texte|texte »)
      const MAVOIX = path.join(BASE, 'ma-voix'), idx = path.join(MAVOIX, 'index.json');
      const lireVoix = () => { try { return JSON.parse(fs.readFileSync(idx, 'utf8')); } catch (e) { return {}; } };
      const resumeVoix = d => { const l = Object.values(d); return { prises: l.length, secondes: +l.reduce((t, x) => t + (x.duree || 0), 0).toFixed(1), dossier: MAVOIX }; };
      const ecrireVoix = d => { fs.mkdirSync(MAVOIX, { recursive: true }); fs.writeFileSync(idx, JSON.stringify(d, null, 1)); fs.writeFileSync(path.join(MAVOIX, 'metadata.csv'), Object.entries(d).sort(([a], [b]) => a.localeCompare(b)).map(([id, x]) => { const t = String(x.texte || '').replace(/[|\r\n]+/g, ' ').trim(); return `${id}|${t}|${t}`; }).join('\n') + '\n'); };
      const idVoix = k => `${nom}-${String(k).padStart(2, '0')}`;
      if (req.method === 'GET' && p === '/api/doublage') { // lignes gardées et prises déjà enregistrées
        let lignes = []; try { lignes = JSON.parse(fs.readFileSync(path.join(dossier, 'script.json'), 'utf8')).lignes || []; } catch (e) { /* nouveau doublage */ }
        const prises = []; let l = []; try { l = fs.readdirSync(dossier); } catch (e) { /* dossier absent */ }
        for (const f of l) { const m = /^v(\d+)\.wav$/.exec(f); if (m) prises.push({ n: +m[1], duree: +((await probe(path.join(dossier, f))).duration || 0).toFixed(2), file: pose(+m[1]) }); }
        return send(res, 200, { nom, dossier, lignes, prises: prises.sort((a, b) => a.n - b.n), voix: resumeVoix(lireVoix()) });
      }
      if (req.method === 'PUT' && p === '/api/doublage/script') { // le texte à lire, gardé pour reprendre plus tard
        const j = await readJson(req); fs.mkdirSync(dossier, { recursive: true });
        fs.writeFileSync(path.join(dossier, 'script.json'), JSON.stringify({ lignes: (j.lignes || []).map(x => String(x).slice(0, 2000)).slice(0, 400) }, null, 1));
        return send(res, 200, { ok: true, dossier });
      }
      if (req.method === 'POST' && p === '/api/doublage/prise') { // une réplique : le silence du début et de la fin est retiré, le souffle grave coupé
        if (n < 0 || n > 999) throw new Error('Numéro de réplique invalide');
        fs.mkdirSync(dossier, { recursive: true });
        const brut = path.join(dossier, `brut-${String(n).padStart(2, '0')}.webm`);
        await new Promise((ok, ko) => { const w = fs.createWriteStream(brut); req.pipe(w); w.on('finish', ok); w.on('error', ko); req.on('error', ko); });
        const tmp = wav(n) + '.tmp.wav', garde = '-45dB';
        const filtre = `highpass=f=70,silenceremove=start_periods=1:start_threshold=${garde}:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=${garde}:start_silence=0.15,areverse`;
        try { await run(FFMPEG, ['-y', '-v', 'error', '-i', brut, '-vn', '-af', filtre, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', tmp]); }
        catch (e) { try { fs.unlinkSync(tmp); } catch (e2) { /* rien à retirer */ } throw new Error('Cet enregistrement n’a pas pu être lu : recommence la réplique.'); }
        const info = await probe(tmp), duree = +(info.duration || 0);
        if (!(duree > 0.25)) { fs.unlinkSync(tmp); throw new Error('Aucune voix détectée : vérifie le micro et recommence la réplique.'); }
        fs.renameSync(tmp, wav(n)); fs.copyFileSync(wav(n), path.join(MEDIAS, pose(n)));
        fs.mkdirSync(path.join(MAVOIX, 'wavs'), { recursive: true }); fs.copyFileSync(wav(n), path.join(MAVOIX, 'wavs', idVoix(n) + '.wav'));
        const voix = lireVoix(); voix[idVoix(n)] = { texte: String(url.searchParams.get('texte') || '').slice(0, 2000), duree: +duree.toFixed(2), le: new Date().toISOString() }; ecrireVoix(voix);
        return send(res, 200, { n, duree: +duree.toFixed(2), file: pose(n), voix: resumeVoix(voix) });
      }
      if (req.method === 'DELETE' && p === '/api/doublage/prise') {
        if (n < 0) throw new Error('Numéro de réplique invalide');
        for (const f of [wav(n), path.join(dossier, `brut-${String(n).padStart(2, '0')}.webm`), path.join(MEDIAS, pose(n)), path.join(MAVOIX, 'wavs', idVoix(n) + '.wav')]) { try { fs.unlinkSync(f); } catch (e) { /* déjà retirée */ } }
        const voix = lireVoix(); if (voix[idVoix(n)]) { delete voix[idVoix(n)]; ecrireVoix(voix); }
        return send(res, 200, { ok: true, voix: resumeVoix(voix) });
      }
      if (req.method === 'POST' && p === '/api/doublage/dossier' && url.searchParams.get('voix')) { // le dossier « Ma voix »
        fs.mkdirSync(MAVOIX, { recursive: true }); if (opts.ouvrirDossier) opts.ouvrirDossier(MAVOIX);
        return send(res, 200, { ok: !!opts.ouvrirDossier, dossier: MAVOIX });
      }
      if (req.method === 'POST' && p === '/api/doublage/dossier') { // ouvre le dossier dans le Finder (application Mac)
        fs.mkdirSync(dossier, { recursive: true });
        if (opts.ouvrirDossier) opts.ouvrirDossier(dossier);
        return send(res, 200, { ok: !!opts.ouvrirDossier, dossier });
      }
    }
    // ton script (texte libre) → fiche de Pico, par le programme seul ; numéro = le suivant des épisodes déjà faits
    if (req.method === 'POST' && p === '/api/quentinvest/script') {
      const b = await readJson(req), texte = String(b.texte || '').slice(0, 60000);
      if (texte.trim().length < 80) throw new Error('Colle ton script : une accroche, quelques paragraphes et une conclusion.');
      const fiche = require('./fiche-quentinvest').ficheDepuisScript(texte, { titre: String(b.titre || '').slice(0, 120), numero: prochainNumero() });
      return send(res, 200, { fiche, controle: require('./fiche-quentinvest').controler(fiche, { lexique: require('./voix-texte').lexiqueActuel() }) });
    }
    if (req.method === 'POST' && p === '/api/quentinvest/brouillon') {
      const b = await readJson(req), sujet = String(b.sujet || '').trim().slice(0, 120);
      if (sujet.length < 3) throw new Error('Écris le sujet de l’épisode (par exemple « Le krach de 1929 »).');
      return send(res, 200, travail(job => brouillonDe(sujet, job, { article: b.article, numero: b.numero })));
    }
    // Vidéo QuentInvest d'une traite : « fais une vidéo sur le krach de 2008 » (texte écrit d'après Wikipédia) ou ton script (sujet d'actualité),
    // puis contrôle et fabrication par /api/pico/fabriquer (mêmes voix, une fabrication à la fois) ; l'avancement des deux étapes est suivi ici
    if (req.method === 'POST' && p === '/api/quentinvest/auto') {
      const b = await readJson(req), FI = require('./fiche-ia'), FQ = require('./fiche-quentinvest');
      const script = String(b.script || '').slice(0, 60000), sujet = FI.sujetDe(String(b.demande || '').slice(0, 200)).slice(0, 120);
      if (script.trim()) { if (script.trim().length < 80) throw new Error('Ton script est trop court : une accroche, quelques paragraphes et une conclusion.'); }
      else if (sujet.length < 3) throw new Error('Écris le sujet de la vidéo (par exemple « fais une vidéo sur le krach de 2008 »).');
      const voixClone = require('./voix-clone'); // ta voix clonée sans enregistrement : refusé tout de suite, avant d'écrire le texte
      if (String((b.options || {}).voix || 'ma-voix') === 'ma-voix' && !voixClone.voixEnregistree(BASE).assez) throw new Error(voixClone.SANS_VOIX);
      const port = req.socket.localPort, U = q => `http://127.0.0.1:${port}${q}`, o = b.options && typeof b.options === 'object' ? b.options : {};
      return send(res, 200, travail(async job => {
        const part = (a, z) => k => { job.step = k.step || job.step; job.progress = a + (z - a) * (k.progress || 0); };
        let fiche, fichier = null, article = null;
        if (script.trim()) { job.step = 'Découpage de ton script…'; fiche = FQ.ficheDepuisScript(script, { titre: String(b.titre || '').slice(0, 120), numero: prochainNumero() }); }
        else {
          const sous = { step: '', progress: 0 }, suivre = setInterval(() => part(0, 0.3)(sous), 500);
          try { const r = await brouillonDe(sujet, sous); fiche = FI.pourAuto(r.fiche, sujet); article = r.article; fichier = r.fichier; fs.writeFileSync(fichier, JSON.stringify(fiche, null, 1) + '\n'); }
          finally { clearInterval(suivre); }
        }
        if (job.annule) throw new Error('Arrêté.');
        const c = FQ.controler(fiche, { lexique: require('./voix-texte').lexiqueActuel() });
        // ton script : sa longueur est ton choix (sujet d'actualité, format court) ; moins de 5 minutes est signalé, pas refusé
        const court = !!o.court || !!script.trim();
        if (court) { const tc = c.erreurs.filter(e => /^Trop court/.test(e)); c.erreurs = c.erreurs.filter(e => !/^Trop court/.test(e)); if (script.trim()) c.avertissements = [...tc.map(e => e.replace(/^Trop court : /, 'Vidéo de moins de 5 minutes : ')), ...(c.avertissements || [])]; }
        c.ok = !c.erreurs.length;
        if (!c.ok) throw new Error('Texte pas encore fabricable : ' + c.erreurs.join(' ; ') + (article ? ` (article Wikipédia « ${article} »). Choisis « Je relis avant » pour le compléter.` : ''));
        job.step = 'Fabrication de la vidéo…'; job.progress = script.trim() ? 0.05 : 0.3;
        const r = await fetch(U('/api/pico/fabriquer'), { method: 'POST', body: JSON.stringify({ fiche, options: { voix: o.voix, sansTiktok: !!o.sansTiktok, court, illustrer: o.illustrer !== false, sousTitres: !!o.sousTitres } }) }), j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || 'Fabrication impossible');
        const a = job.progress;
        for (;;) {
          await new Promise(x => setTimeout(x, 1000));
          if (job.annule) { await fetch(U('/api/annuler?id=' + j.id), { method: 'POST' }).catch(() => {}); throw new Error('Arrêté.'); }
          const k = await (await fetch(U('/api/job?id=' + j.id))).json();
          if (k.error) throw new Error(k.error);
          part(a, 1)(k);
          if (k.done) return { ...k.resultat, avertissements: [...(c.avertissements || []).filter(x => /^Vidéo de moins/.test(x)), ...(k.resultat.avertissements || [])], fiche, fichierFiche: fichier, article, controle: c };
        }
      }));
    }
    return NON;
  };
}

module.exports = { creer, NON };
