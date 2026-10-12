/* Contrôle de Studio Posts (marketing/generateur-posts/) : node tools/verifier-generateur-posts.js [--captures dossier]
   Ouvre la page depuis le disque (comme le propriétaire), vérifie : aucune erreur, chaque modèle des deux marques tient
   dans les trois formats, la bibliothèque s'affiche, l'export ZIP contient les bonnes images à la bonne taille,
   les alertes de contenu QuenTools (prix, lien) se déclenchent. Nécessite Playwright (voir tools/audit-express.js). */
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const page = path.join(__dirname, '..', 'marketing', 'generateur-posts', 'index.html');
const iCapt = process.argv.indexOf('--captures'), captures = iCapt > 0 ? process.argv[iCapt + 1] : null;
let erreurs = 0;
const ko = m => { erreurs++; console.log('ÉCHEC', m); }, ok = m => console.log('ok', m);

// lit un ZIP sans compression : [{ nom, data }]
function lireZip(buf) {
  const out = []; let o = 0;
  while (buf.readUInt32LE(o) === 0x04034b50) {
    const n = buf.readUInt32LE(o + 18), ln = buf.readUInt16LE(o + 26), lx = buf.readUInt16LE(o + 28);
    const nom = buf.slice(o + 30, o + 30 + ln).toString('utf8'), deb = o + 30 + ln + lx;
    out.push({ nom, data: buf.slice(deb, deb + n) }); o = deb + n;
  }
  return out;
}
// dimensions d'un JPEG (marqueur SOF)
function tailleJpg(b) {
  let o = 2;
  while (o < b.length) { const m = b[o + 1], l = b.readUInt16BE(o + 2); if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(o + 5), w: b.readUInt16BE(o + 7) }; o += 2 + l; }
  return null;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => ko('erreur JavaScript : ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') ko('console : ' + m.text()); });
  await pg.goto('file://' + page);
  await pg.waitForFunction(() => window.studio, null, { timeout: 15000 });
  ok('page ouverte, polices chargées');

  // 1. chaque modèle, chaque format : rien ne déborde
  const res = await pg.evaluate(() => {
    const out = [];
    for (const marque of ['parvis', 'quentools']) for (const m of studio.MODELES[marque]) for (const format of ['45', '11', '916']) {
      const p = { ...m, marque, format, points: true };
      p.slides.forEach((s, i) => { const r = studio.rendre(p, i); if (r.trop) out.push(`${marque} « ${m.nom} » ${format} image ${i + 1}`); });
    }
    return out;
  });
  res.length ? res.forEach(r => ko('texte trop long : ' + r)) : ok('modèles : tout tient dans les 3 formats');

  // 2. bibliothèque : chaque publication tient en 4:5 (format d'origine)
  const biblio = await pg.evaluate(() => {
    const out = [], n = { parvis: 0, quentools: 0 };
    for (const [marque, l] of Object.entries(window.BIBLIOTHEQUE)) for (const p of l) { n[marque]++; p.slides.forEach((s, i) => { if (studio.rendre({ ...p, format: '45' }, i).trop) out.push(`${p.nom} image ${i + 1}`); }); }
    return { out, n };
  });
  biblio.out.length ? biblio.out.forEach(r => ko('bibliothèque, texte trop long : ' + r)) : ok(`bibliothèque : ${biblio.n.parvis} Parvis + ${biblio.n.quentools} QuenTools tiennent en 4:5`);

  // 3. parcours réel : modèle QuenTools 5 images, format 9:16, export ZIP
  await pg.click('#bNouveau'); await pg.click('#mOnglets button[data-o=quentools]');
  await pg.click('#mGrille .carte >> nth=0');
  const nb = await pg.locator('#liste .vignette').count();
  nb === 5 ? ok('modèle QuenTools ouvert (5 images)') : ko('modèle QuenTools : ' + nb + ' images');
  await pg.selectOption('#format', '916');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#bZip')]);
  const fz = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-')), 'c.zip'); await dl.saveAs(fz);
  const z = lireZip(fs.readFileSync(fz)), jpgs = z.filter(f => f.nom.endsWith('.jpg'));
  const tailles = jpgs.map(f => tailleJpg(f.data));
  jpgs.length === 5 && tailles.every(t => t && t.w === 1080 && t.h === 1920) && z.some(f => f.nom === 'legende.txt')
    ? ok('export ZIP : 5 images 1080×1920 + légende') : ko('export ZIP : ' + JSON.stringify({ fichiers: z.map(f => f.nom), tailles }));
  if (!/^.+-9x16\.zip$/.test(dl.suggestedFilename())) ko('nom du ZIP : ' + dl.suggestedFilename());

  // 4. alerte de contenu QuenTools : prix et lien
  await pg.click('#liste .vignette >> nth=0');
  await pg.fill('#iChamps textarea >> nth=0', 'Un site à 299 € sur www.exemple.fr');
  const al = await pg.locator('#alertes').innerText();
  /prix/.test(al) && /lien/.test(al) ? ok('alertes prix et lien') : ko('alertes : ' + al);
  await pg.keyboard.press('Escape'); await pg.locator('body').click({ position: { x: 5, y: 880 } });
  await pg.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  const titre = await pg.evaluate(() => studio.projet.slides[0].titre);
  /299/.test(titre) ? ko('annuler (⌘Z) sans effet') : ok('annuler (⌘Z)');

  // 5. bascule de marque et export d'une image Parvis 4:5
  await pg.click('#marques button[data-marque=parvis]'); await pg.selectOption('#format', '45');
  const [dj] = await Promise.all([pg.waitForEvent('download'), pg.click('#bJpg')]);
  const fj = path.join(path.dirname(fz), 'i.jpg'); await dj.saveAs(fj);
  const tj = tailleJpg(fs.readFileSync(fj));
  tj && tj.w === 1080 && tj.h === 1350 ? ok('bascule Le Parvis + export JPG 1080×1350') : ko('export JPG : ' + JSON.stringify(tj));

  // 6. enregistrement : la publication est retrouvée après rechargement
  await pg.waitForTimeout(500); await pg.reload(); await pg.waitForFunction(() => window.studio);
  const apres = await pg.evaluate(() => studio.projet.marque + ' ' + studio.projet.slides.length);
  apres === 'parvis 5' ? ok('projet retrouvé après rechargement') : ko('rechargement : ' + apres);

  // 7. Générer : chaque thème avec une IA simulée (le contrôle porte sur la mise en page, les règles de contenu et le repli, pas sur la qualité du texte)
  const gen = await pg.evaluate(async () => {
    const CANNED = { numero: 1, meditation: 'Quand tout bouge autour de toi, Dieu reste. Fais confiance pour le prochain pas aujourd’hui.', titre_tiktok: 'Verset du jour', titre: 'Si tu es fatigué, lis ça', mot: 'fatigué', sous: 'Ce message est pour toi.', priere: 'Seigneur, merci pour cette journée. Donne-moi la paix et la force de faire le bien autour de moi.', fin: 'Merci d’être là, au nom de Jésus.', legende: 'Un message pour toi, à lire doucement et à partager.',
      lecon: 'Dieu est fidèle, même quand le défi paraît immense.', hook1: 'Un dimanche soir, le chauffe-eau lâche.', hook2: 'Qui appelle-t-on ?', accent: 'Celui qu’on trouve en cinq secondes.', prob: 'Dans l’urgence, on appelle le premier qu’on trouve', mot_prob: 'premier', sol: 'Un site qui rassure avant l’appel', mot_sol: 'rassure',
      question_titre: 'Et votre *métier*, c’est quoi ?', question_texte: 'Dites-le en commentaire : je vous réponds avec une idée.', pb: ['Un numéro difficile à trouver', 'Aucun moyen de décrire la panne', 'Ni zone d’intervention, ni horaires'], sb: ['Numéro et bouton Appeler visibles', 'Un devis demandé en deux minutes', 'Votre zone et des repères clairs'] };
    const fab = (sc, k) => {
      if (!sc) return null;
      if (sc.type === 'object') return Object.fromEntries(Object.entries(sc.properties).map(([c, p]) => [c, fab(p, c)]));
      if (sc.type === 'array') return Array.from({ length: sc.minItems || 1 }, (_, i) => (sc.items.type === 'object' ? (o => (o.numero !== undefined ? { ...o, numero: i + 1 } : o))(fab(sc.items, k)) : (CANNED[k] && Array.isArray(CANNED[k]) ? CANNED[k][i] : (k === 'hashtags' ? ['siteweb', 'artisan', 'plombier', 'entrepreneur', 'devis'][i] : k === 'items' ? ['Il est illisible sur téléphone', 'Les horaires ne sont plus à jour', 'On ne trouve pas comment vous contacter'][i] || 'Point utile ' + i : 'Un point concret ' + (i + 1)))));
      if (sc.type === 'integer') return CANNED[k] || 1;
      return CANNED[k] !== undefined && !Array.isArray(CANNED[k]) ? CANNED[k] : (k === 'texte' ? 'Une phrase concrète et facile à appliquer pour le client.' : k === 'titre' ? 'Un titre clair et direct' : 'Texte de test');
    };
    const ecrire = async m => fab(m.schema);
    const sortie = [];
    for (const marque of ['parvis', 'quentools']) for (const t of Generation.THEMES[marque]) for (const format of ['45', '916']) {
      const r = await studio.generer({ marque, themeId: t.id, sujet: marque === 'quentools' ? 'plombier' : (t.id === 'histoire' ? 'David et Goliath' : 'courage'), format, ecrire, sansExport: true });
      sortie.push({ marque, theme: t.id, format, erreur: r.erreur, source: r.source, trop: r.trop, alertes: r.alertes, nb: r.projet && r.projet.slides.length });
    }
    // une IA qui désobéit (prix, lien) : refus, puis repli sur une publication déjà écrite
    const mauvaise = await studio.generer({ marque: 'quentools', themeId: 'conseil', sujet: 'plombier', format: '45', sansExport: true, ecrire: async () => ({ titre: 'Un site à 299 € sur www.exemple.fr', mot: 'site', sous: 'Gratuit et garanti à 100 %', legende: 'Voir www.exemple.fr', titre_tiktok: 'Promo', hashtags: ['a', 'b', 'c', 'd'] }) });
    const verset = await studio.generer({ marque: 'parvis', themeId: 'verset', sujet: 'paix', format: '45', sansExport: true, ecrire: async () => ({ numero: 999, meditation: 'x', titre_tiktok: 'x' }) });
    const sansIA = await studio.generer({ marque: 'quentools', themeId: 'carrousel', sujet: 'fleuriste', format: '45', sansExport: true });
    const biblio = window.BIBLIOTHEQUE.parvis.flatMap(p => p.slides).filter(s => s.ref && s.texte).map(s => s.texte);
    const v1 = await studio.generer({ marque: 'parvis', themeId: 'verset', sujet: 'courage', format: '45', sansExport: true, ecrire });
    return { sortie, mauvaise: { source: mauvaise.source, notes: mauvaise.notes, alertes: mauvaise.alertes }, verset: { source: verset.source }, sansIA: { source: sansIA.source, tel: sansIA.projet.slides[3].image.slice(0, 22), n: sansIA.projet.slides.length }, versetMotAMot: biblio.includes(v1.projet.slides[0].texte) };
  });
  const faux = gen.sortie.filter(x => x.erreur || x.trop || (x.alertes || []).length || !x.nb);
  faux.length ? faux.forEach(x => ko(`génération ${x.marque}/${x.theme}/${x.format} : ${x.erreur || (x.trop ? 'texte trop long' : JSON.stringify(x.alertes))}`)) : ok(`génération : ${gen.sortie.length} publications (9 thèmes × 2 formats) prêtes, sans débordement ni alerte`);
  gen.sortie.filter(x => x.source !== 'ia').length ? ko('génération : une publication n’est pas passée par l’IA simulée : ' + JSON.stringify(gen.sortie.filter(x => x.source !== 'ia').map(x => x.theme))) : ok('génération : le texte vient de l’IA quand elle répond bien');
  gen.mauvaise.source === 'bibliotheque' && gen.mauvaise.notes.some(n => /conforme/.test(n)) ? ok('IA qui écrit un prix ou un lien : refusée, publication déjà écrite proposée') : ko('IA désobéissante : ' + JSON.stringify(gen.mauvaise));
  gen.verset.source === 'bibliotheque' ? ok('verset inconnu choisi par l’IA : refusé') : ko('verset inconnu accepté');
  gen.sansIA.source === 'bibliotheque' && /^data:image\/jpeg/.test(gen.sansIA.tel) && gen.sansIA.n === 5 ? ok('sans IA : carrousel de 5 images avec la capture du site d’exemple dans le téléphone') : ko('sans IA : ' + JSON.stringify(gen.sansIA));
  gen.versetMotAMot ? ok('verset du Parvis recopié mot pour mot depuis la bibliothèque') : ko('verset modifié');
  // parcours réel : bouton, fenêtre, publication prête
  await pg.keyboard.press('Escape'); await pg.click('#bGenerer'); await pg.waitForSelector('#modalGen.ouvert');
  await pg.selectOption('#gMarque', 'quentools'); await pg.selectOption('#gTheme', 'carrousel'); await pg.fill('#gSujet', 'restaurant'); await pg.click('#gGo');
  await pg.waitForSelector('#gVoir', { timeout: 20000 });
  const ui = await pg.evaluate(() => ({ nom: studio.projet.nom, n: studio.projet.slides.length, marque: studio.projet.marque, tel: !!studio.projet.slides[3].image, res: document.querySelector('#gRes').innerText }));
  ui.n === 5 && ui.marque === 'quentools' && ui.tel && /Publication prête/.test(ui.res) ? ok('bouton « Générer » : publication QuenTools restaurant prête en un clic') : ko('parcours Générer : ' + JSON.stringify(ui));
  if (captures) { await pg.screenshot({ path: path.join(captures, 'generer.png') }); }
  await pg.click('#gVoir');

  // assistant (tchat) : demande en français sans IA, puis avec une IA simulée (création, retouches, refus des prix et des versets)
  await pg.setViewportSize({ width: 1100, height: 800 });
  const boutons = await pg.evaluate(() => ['#bGenerer', '#bChat'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return { s, ok: r.width > 0 && r.right <= window.innerWidth && r.left >= 0 }; }));
  boutons.every(x => x.ok) ? ok('fenêtre étroite (1100 px) : « Générer » et « Assistant » restent visibles') : ko('boutons hors de la fenêtre : ' + JSON.stringify(boutons));
  await pg.setViewportSize({ width: 1440, height: 900 });
  await pg.keyboard.press('c'); await pg.waitForSelector('#chat.ouvert');
  const c1 = await pg.evaluate(async () => { const r = await studio.chat('Fais-moi une story pour un plombier à Nantes avec un ton rassurant', { sansIA: true }); return { plan: r.plan, format: studio.projet.format, marque: studio.projet.marque, nom: studio.projet.nom, fil: document.querySelector('#chatFil').innerText, n: studio.histoChat.length }; });
  c1.plan.source === 'mots' && c1.format === '916' && c1.marque === 'quentools' && /prête/.test(c1.fil) && c1.n === 2 ? ok('assistant sans IA : « une story pour un plombier » crée une publication QuenTools au format 9:16') : ko('assistant sans IA : ' + JSON.stringify({ ...c1, fil: c1.fil.slice(-160) }));
  const c2 = await pg.evaluate(async () => {
    const ecrire = async m => /assistant de Studio Posts/.test(m.systeme) ? { reponse: 'Je raccourcis le titre et change la légende.', action: 'modifier', marque: '', theme: '', sujet: '', secteur: '', format: '', consignes: '', modifications: [{ image: 1, champ: 'titre', valeur: 'Un *titre* plus court' }, { image: 2, champ: 'titre', valeur: 'Dès 49 € par mois' }, { image: 0, champ: 'legende_texte', valeur: 'Nouvelle légende sans prix.' }, { image: 9, champ: 'titre', valeur: 'Image absente' }] } : null;
    const avant = studio.projet.slides[0].titre, r = await studio.chat('raccourcis le titre de l’image 1 et change la légende', { ecrire });
    return { avant, apres: studio.projet.slides[0].titre, legende: studio.projet.legende.texte, deux: studio.projet.slides[1].titre, refus: r.resultat && r.resultat.refus, fil: document.querySelector('#chatFil').innerText };
  });
  c2.apres === 'Un *titre* plus court' && c2.legende === 'Nouvelle légende sans prix.' && c2.deux !== 'Dès 49 € par mois' && c2.refus.some(x => /prix/.test(x)) && c2.refus.some(x => /n’existe pas/.test(x)) ? ok('assistant : retouches appliquées (titre, légende), prix et image absente refusés') : ko('assistant retouches : ' + JSON.stringify(c2));
  const c3 = await pg.evaluate(async () => {
    studio.ouvrir({ nom: 'Test verset', marque: 'parvis', format: '45', legende: { titre: 't', texte: 'l' }, slides: [{ type: 'verset', label: 'Verset du jour', texte: 'Le verset de la bibliothèque', ref: 'Jean 3:16' }] });
    const ecrire = async m => /assistant de Studio Posts/.test(m.systeme) ? { reponse: 'Je change le verset.', action: 'modifier', marque: '', theme: '', sujet: '', secteur: '', format: '', consignes: '', modifications: [{ image: 1, champ: 'texte', valeur: 'Un verset inventé' }] } : null;
    const r = await studio.chat('change le verset de l’image 1', { ecrire }); return { t: studio.projet.slides[0].texte, refus: r.resultat.refus };
  });
  c3.t === 'Le verset de la bibliothèque' && c3.refus.some(x => /verset/.test(x)) ? ok('assistant : un verset ne peut pas être modifié par le tchat') : ko('verset modifié par le tchat : ' + JSON.stringify(c3));
  const c4 = await pg.evaluate(async () => {
    const ecrire = async m => /assistant de Studio Posts/.test(m.systeme) ? { reponse: 'Je crée un conseil.', action: 'generer', marque: 'quentools', theme: 'conseil', sujet: 'coiffeur', secteur: 'coiffeur', format: '11', consignes: 'ton rassurant', modifications: [] } : { titre: 'Votre numéro doit se voir vite', mot: 'numéro', sous: 'Un visiteur qui cherche à vous appeler ne doit pas chercher.', legende: 'Votre numéro est-il visible tout de suite ? Dites-nous en commentaire.', titre_tiktok: 'Votre numéro visible', hashtags: ['site', 'coiffeur', 'artisan', 'local'] };
    const r = await studio.chat('un conseil pour un coiffeur, format carré', { ecrire }); return { plan: r.plan.theme + '/' + r.plan.format, source: r.resultat && r.resultat.source, format: studio.projet.format, n: studio.projet.slides.length };
  });
  c4.plan === 'conseil/11' && c4.format === '11' && c4.source === 'ia' ? ok('assistant avec IA : demande comprise (thème, métier, format) et publication écrite par l’IA') : ko('assistant avec IA : ' + JSON.stringify(c4));
  await pg.keyboard.press('Escape');
  // nouvelle version : bandeau avec bouton de téléchargement
  const pg2 = await ctx.newPage(); await pg2.addInitScript(() => { window.studioMaj = { verifier: async () => ({ version: '9.9.9', url: 'https://github.com/ikeupods-del/Quentools/releases/tag/studio-posts-v9.9.9' }), ouvrir: u => { window.__ouvert = u; } }; });
  await pg2.goto('file://' + page); await pg2.waitForSelector('#bMaj.vu', { timeout: 8000 }).catch(() => {}); await pg2.click('#bMajGo').catch(() => {});
  (await pg2.evaluate(() => /9\.9\.9/.test(document.querySelector('#bMajTexte').textContent) && /releases\/tag\/studio-posts-v9\.9\.9/.test(window.__ouvert || ''))) ? ok('nouvelle version : bandeau et bouton vers la page de téléchargement') : ko('bandeau de mise à jour absent');
  await pg2.close();

  // captures pour relecture visuelle
  if (captures) {
    fs.mkdirSync(captures, { recursive: true });
    await pg.screenshot({ path: path.join(captures, 'interface.png') });
    const planches = await pg.evaluate(() => {
      const out = [];
      for (const marque of ['parvis', 'quentools']) studio.MODELES[marque].forEach((m, k) => ['45', '11', '916'].forEach(format => out.push({ nom: `${marque}-${k}-${format}`, url: studio.planche({ ...m, marque, format, points: true }) })));
      for (const [marque, l] of Object.entries(window.BIBLIOTHEQUE)) l.slice(0, 4).forEach((p, k) => out.push({ nom: `biblio-${marque}-${k}`, url: studio.planche({ ...p, format: '45', points: true }) }));
      return out;
    });
    for (const p of planches) fs.writeFileSync(path.join(captures, p.nom + '.png'), Buffer.from(p.url.split(',')[1], 'base64'));
    ok(`${planches.length} planches dans ${captures}`);
  }
  await b.close();
  console.log(erreurs ? `\n${erreurs} problème(s)` : '\nStudio Posts : tout est bon');
  process.exit(erreurs ? 1 : 0);
})();
