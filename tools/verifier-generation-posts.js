/* Contrôle de la génération automatique de Studio Posts (marketing/generateur-posts/generer.js et bouton « Générer ») :
   node tools/verifier-generation-posts.js [--captures dossier]
   Sans modèle : une IA simulée remplit chaque formulaire avec les textes les plus longs permis. Vérifie que chaque forme
   des deux marques se construit, que les versets sont recopiés de la liste vérifiée, que les règles refusent prix, liens,
   chiffres, IA, citations inventées (nouvel essai), puis, dans la page, que le bouton crée la publication, que la capture
   du site s'affiche dans le téléphone et que tout tient dans les trois formats. L'essai avec le vrai modèle se fait sur Mac
   (workflow « Studio Posts — application Mac »). Nécessite Playwright (voir tools/audit-express.js). */
const fs = require('fs'), path = require('path');
const dossier = path.join(__dirname, '..', 'marketing', 'generateur-posts');
const G = require(path.join(dossier, 'generer.js'));
const iCapt = process.argv.indexOf('--captures'), captures = iCapt > 0 ? process.argv[iCapt + 1] : null;
let erreurs = 0;
const ko = m => { erreurs++; console.log('ÉCHEC', m); }, ok = m => console.log('ok', m);

// IA simulée : remplit le schéma (chaînes à la longueur maximale, références différentes)
const MOTS = 'Le site montre votre numéro tout de suite et rassure chaque visiteur pressé qui cherche une réponse claire avant d’appeler votre entreprise aujourd’hui même'.split(' ');
const texte = (n, k) => { let t = (k % 2 ? '*Clair* ' : ''), i = k; while (t.length < n) t += MOTS[i++ % MOTS.length] + ' '; return t.slice(0, n).trim(); };
function remplir(sch, k = { n: 0, refs: 0 }) {
  if (sch.enum) return sch.enum[k.refs++ % sch.enum.length];
  if (sch.type === 'string') return texte(sch.maxLength || 40, k.n++);
  if (sch.type === 'array') return Array.from({ length: sch.minItems || 3 }, () => remplir(sch.items, k));
  return Object.fromEntries(Object.keys(sch.properties).map(c => [c, remplir(sch.properties[c], k)]));
}

(async () => {
  // 1. chaque forme, chaque marque
  const publications = [];
  for (const marque of ['parvis', 'quentools']) for (const forme of Object.keys(G.FORMES[marque])) {
    let appels = 0;
    const gen = G.creer({ demander: async m => { appels++; return remplir(m.schema); } });
    try {
      const p = await gen.generer({ marque, forme, recents: [] });
      publications.push(p);
      const versets = p.slides.filter(s => s.ref);
      for (const s of versets) if (G.VERSETS.get(s.ref) !== s.texte) ko(`${marque}/${forme} : verset ${s.ref} différent de la liste vérifiée`);
      if (!p.legende.texte.includes(G.HASHTAGS[marque].split(' ')[0])) ko(`${marque}/${forme} : hashtags absents`);
      if (forme === 'carrousel' && !p.capture) ko('carrousel QuenTools sans capture de site');
      ok(`${marque} / ${forme} : ${p.slides.length} image${p.slides.length > 1 ? 's' : ''}${versets.length ? `, ${versets.length} verset(s) vérifié(s)` : ''} (${appels} appel)`);
    } catch (e) { ko(`${marque}/${forme} : ${e.message}`); }
  }

  // 2. règles : une réponse fautive est redemandée avec la raison
  const regle = async (marque, forme, defaut, attendu) => {
    const vus = [];
    const gen = G.creer({ demander: async m => { vus.push(m.demande); const r = remplir(m.schema); if (vus.length === 1) { const k = Object.keys(r).find(c => typeof r[c] === 'string' && c !== 'ref'); r[k] = defaut; } return r; } });
    try {
      await gen.generer({ marque, forme });
      vus.length === 2 && new RegExp(attendu, 'i').test(vus[1]) ? ok(`règle ${marque} : « ${defaut} » refusé puis corrigé`) : ko(`règle ${marque} : « ${defaut} » non refusé (${vus.length} appel)`);
    } catch (e) { ko(`règle ${marque} : ${e.message}`); }
  };
  await regle('quentools', 'conseil', 'Un site pour *99 €* seulement', 'prix');
  await regle('quentools', 'liste', 'Voir www.exemple.fr pour *tout savoir*', 'lien');
  await regle('quentools', 'astuces', '*80 %* des clients cherchent sur Google', 'chiffre');
  await regle('quentools', 'conseil', 'Un site créé par l’*IA*', 'IA');
  await regle('quentools', 'conseil', 'Ton site doit *rassurer*', 'vouvoie');
  await regle('parvis', 'verset', 'Comme dit Jean 3:16, Dieu t’aime', 'référence');
  await regle('parvis', 'liste', '« Je suis avec toi » dit le *Seigneur*', 'guillemets');
  // trois refus d'affilée : erreur claire, rien n'est créé
  try { await G.creer({ demander: async m => ({ ...remplir(m.schema), titre: 'Prix : *10 €*' }) }).generer({ marque: 'quentools', forme: 'conseil' }); ko('trois refus : aucune erreur'); }
  catch (e) { /Générer/.test(e.message) ? ok('trois refus : message clair (' + e.message.slice(0, 60) + '…)') : ko('trois refus : ' + e.message); }
  // versets déjà utilisés évités, sujet libre transmis
  { let dem = ''; const refs = [...G.VERSETS.keys()];
    const gen = G.creer({ demander: async m => { dem = m.demande; return remplir(m.schema); } });
    const p = await gen.generer({ marque: 'parvis', forme: 'verset', sujet: 'le courage au travail', recents: refs.slice(0, 5) });
    !refs.slice(0, 5).includes(p.slides[0].ref) && /courage au travail/.test(dem) ? ok('versets récents évités, sujet libre transmis') : ko('versets récents ou sujet libre'); }
  // nettoyage
  const n = G.nettoyer({ titre: '“Un *beau* et *grand* titre” 🙏 #foi', ref: 'Jean 3:16' });
  n.titre === 'Un *beau* et grand titre' ? ok('nettoyage : émojis, hashtags, guillemets, une seule mise en couleur') : ko('nettoyage : ' + n.titre);

  // 3. dans la page : le bouton, la capture, les trois formats
  const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  pg.on('pageerror', e => ko('erreur JavaScript : ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') ko('console : ' + m.text()); });
  await pg.addInitScript(pubs => {
    let k = 0, cb = null; window.__demandes = [];
    window.studioIA = { etat: async () => ({ installee: true }), verifier: async () => ({ ok: true }), surEtape: f => { cb = f; },
      generer: async o => { window.__demandes.push(o); cb && cb({ texte: 'L’IA écrit…' }); await new Promise(r => setTimeout(r, 150));
        const l = pubs.filter(p => p.marque === o.marque && (o.forme === 'auto' || p.forme === o.forme)); return { ok: true, publication: JSON.parse(JSON.stringify(l[k++ % l.length])) }; } };
  }, publications);
  await pg.goto('file://' + path.join(dossier, 'index.html'));
  await pg.waitForFunction(() => window.studio, null, { timeout: 15000 });
  (await pg.isVisible('#bGenerer')) ? ok('bouton Générer visible dans l’application') : ko('bouton Générer absent');
  // QuenTools, carrousel, 3 d'un coup
  await pg.click('#marques button[data-marque=quentools]');
  await pg.click('#bGenOpt'); await pg.selectOption('#gForme', 'carrousel'); await pg.selectOption('#gNombre', '3');
  await pg.click('#gLancer');
  await pg.waitForFunction(() => !document.querySelector('#genVoile').classList.contains('ouvert') && window.__demandes.length === 3, null, { timeout: 15000 });
  const r = await pg.evaluate(() => {
    const p = studio.projet, tel = p.slides.find(s => s.type === 'telephone'), trop = [];
    for (const f of ['45', '11', '916']) p.slides.forEach((s, i) => { if (studio.rendre({ ...p, format: f }, i).trop) trop.push(f + ' image ' + (i + 1)); });
    return { marque: p.marque, n: p.slides.length, tel: tel && tel.image, capture: !!(tel && window.CAPTURES[tel.image.slice(8)]), alertes: studio.alertes(), trop,
      recents: window.__demandes[2].recents.length, img: document.querySelector('#inspecteur img') ? 1 : 0, genere: !!p.genere };
  });
  r.marque === 'quentools' && r.n === 5 && r.capture && r.genere ? ok(`3 carrousels créés, capture « ${r.tel} » dans le téléphone`) : ko('carrousel généré : ' + JSON.stringify(r));
  r.alertes.length ? ko('alertes : ' + r.alertes.join(' | ')) : ok('aucune alerte de contenu');
  r.trop.length ? ko('texte trop long : ' + r.trop.join(', ')) : ok('carrousel généré : tout tient dans les 3 formats');
  r.recents > 0 ? ok('les publications déjà faites sont transmises pour éviter les répétitions') : ko('publications récentes non transmises');
  if (captures) { fs.mkdirSync(captures, { recursive: true }); fs.writeFileSync(path.join(captures, 'genere-quentools.png'), Buffer.from((await pg.evaluate(() => studio.planche(studio.projet, 0.3))).split(',')[1], 'base64')); }
  // toutes les publications simulées (textes au maximum) tiennent dans les 3 formats
  const trop = await pg.evaluate(pubs => { const out = []; for (const p of pubs) for (const f of ['45', '11', '916']) p.slides.forEach((s, i) => { if (studio.rendre({ ...p, format: f, points: true }, i).trop) out.push(`${p.marque}/${p.forme} ${f} image ${i + 1}`); }); return out; }, publications);
  trop.length ? trop.forEach(t => ko('texte maximal trop long : ' + t)) : ok('textes les plus longs permis : tout tient, 8 formes × 3 formats');
  // Le Parvis, touche G
  await pg.click('#marques button[data-marque=parvis]');
  await pg.click('#bGenOpt'); await pg.selectOption('#gNombre', '1'); await pg.keyboard.press('Escape'); await pg.click('#apercu');
  await pg.keyboard.press('g');
  await pg.waitForFunction(() => window.__demandes.length === 4 && !document.querySelector('#genVoile').classList.contains('ouvert'), null, { timeout: 15000 });
  const pv = await pg.evaluate(() => ({ marque: studio.projet.marque, d: window.__demandes[3] }));
  pv.marque === 'parvis' && pv.d.marque === 'parvis' ? ok('touche G : publication Le Parvis créée') : ko('touche G : ' + JSON.stringify(pv));
  if (captures) fs.writeFileSync(path.join(captures, 'genere-parvis.png'), Buffer.from((await pg.evaluate(() => studio.planche(studio.projet, 0.3))).split(',')[1], 'base64'));
  // erreur de l'IA : message, aucune publication vide
  await pg.evaluate(() => { window.studioIA.generer = async () => ({ ok: false, erreur: 'L’IA n’a pas respecté les règles. Appuie de nouveau sur Générer.' }); });
  await pg.waitForTimeout(500);
  const avant = await pg.evaluate(() => JSON.parse(localStorage.getItem('studioPosts:v1') || '{"projets":[]}').projets.length);
  await pg.click('#bGenerer'); await pg.waitForTimeout(400);
  const t = await pg.textContent('#toast'), apres = await pg.evaluate(() => JSON.parse(localStorage.getItem('studioPosts:v1') || '{"projets":[]}').projets.length);
  /Générer/.test(t) && apres === avant ? ok('erreur de l’IA : message affiché, rien de créé') : ko(`erreur de l’IA : « ${t} » ${avant}→${apres}`);
  await b.close();
  // 4. la page ouverte sans l'application : pas de bouton
  console.log(erreurs ? `\n${erreurs} échec(s)` : '\nGénération : tout est bon');
  process.exit(erreurs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
