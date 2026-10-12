/* Contrôle de Studio Sites (marketing/studio-sites/) : node tools/verifier-studio-sites.js [--captures dossier]
   Ouvre la page depuis le disque avec un faux pont vers le Mac (modèles lus sur le disque, IA simulée), génère le site de chaque modèle
   (avec et sans IA), contrôle le résultat (coordonnées exactes, aucun reste de l'exemple, aucun prix ou chiffre inventé, textes refusés remplacés,
   pas de défilement horizontal sur téléphone et ordinateur) puis le parcours complet : fiche, génération, correction d'un texte, enregistrement.
   Nécessite Playwright (voir tools/audit-express.js). */
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const dossier = path.join(__dirname, '..', 'marketing', 'studio-sites'), modelesDir = path.join(dossier, 'modeles');
const iCapt = process.argv.indexOf('--captures'), captures = iCapt > 0 ? process.argv[iCapt + 1] : null;
let erreurs = 0;
const ko = m => { erreurs++; console.log('ÉCHEC', m); }, ok = m => console.log('ok', m);
const FICHE = { nom: 'Boulangerie Martin', metier: 'boulanger', ville: 'Nantes', zone: 'Nantes et alentours', telephone: '02 40 12 34 56', email: 'contact@martin-nantes.fr', adresse: '12 rue des Halles', codePostal: '44000', services: ['Pain au levain', 'Viennoiseries', 'Gâteaux sur commande'], atouts: 'pain cuit sur place', horaires: 'Du mardi au samedi, 7 h - 19 h', ton: 'chaleureux', couleur: '#a24b2a', domaine: 'martin-nantes.fr' };

(async () => {
  const modeles = JSON.parse(fs.readFileSync(path.join(modelesDir, 'index.json'), 'utf8'));
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage(); let sauvegarde = null;
  pg.on('pageerror', e => ko('erreur JavaScript : ' + e.message));
  await pg.exposeFunction('lireModele', id => ({ html: fs.readFileSync(path.join(modelesDir, 'html', id + '.html'), 'utf8'), legal: fs.readFileSync(path.join(modelesDir, 'html', 'legal.html'), 'utf8') }));
  await pg.exposeFunction('noterSauvegarde', s => { sauvegarde = s; });
  await pg.addInitScript(modelesJson => {
    // faux pont : IA simulée qui réécrit chaque texte, avec quelques réponses volontairement fautives (prix, chiffre inventé, texte trop long)
    window.studioSites = {
      modeles: async () => modelesJson, modele: id => window.lireModele(id),
      ia: { etat: async () => ({ installee: true, mo: 2500 }), installer: async () => ({}),
        ecrire: async m => {
          const lignes = [...m.demande.matchAll(/^(\d+)\. \[(\w+)\] « ([\s\S]*?) » \((\d+) caractères\)$/gm)];
          if (!lignes.length) return { description: 'Boulanger à Nantes : pain au levain, viennoiseries et gâteaux sur commande.' };
          return { textes: lignes.map((l, i) => { const n = +l[4], k = +l[1]; if (k % 7 === 0) return '12 € la prestation'; if (k % 11 === 0) return 'Plus de 500 clients satisfaits'; if (k % 13 === 0) return 'x'.repeat(n * 2 + 60); return ('Texte ' + k + ' du boulanger : pain, viennoiseries et gâteaux frais').slice(0, Math.max(6, n)); }) };
        } },
      enregistrer: async s => { await window.noterSauvegarde({ dossier: s.dossier, index: s.index.length, legal: s.legal.length, notes: s.notes }); return { dossier: '/tmp/site' }; }, ouvrir: async () => {}
    };
  }, modeles);
  await pg.goto('file://' + path.join(dossier, 'index.html'));
  await pg.waitForFunction(() => window.sites && window.sites.modeles().length, null, { timeout: 15000 });
  ok(`page ouverte : ${modeles.length} points de départ`);

  const sortie = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-sites-'));
  const ecrireDisque = (nom, html) => {
    const d = path.join(sortie, nom); fs.mkdirSync(path.join(d, 'assets', 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(d, 'index.html'), html);
    for (const f of new Set([...html.matchAll(/assets\/fonts\/([\w.-]+\.woff2)/g)].map(x => x[1]))) fs.copyFileSync(path.join(modelesDir, 'polices', f), path.join(d, 'assets', 'fonts', f));
    for (const f of ['qt.css', 'qt.js']) if (html.includes('assets/' + f)) fs.copyFileSync(path.join(modelesDir, 'assets', f), path.join(d, 'assets', f));
    return d;
  };
  for (const m of modeles) for (const avecIA of [false, true]) {
    const nom = `${m.id}${avecIA ? '-ia' : ''}`;
    const r = await pg.evaluate(async ({ id, fiche, avecIA }) => {
      const ecrire = avecIA ? msg => window.studioSites.ia.ecrire(msg) : null;
      const res = await window.sites.genererSite({ fiche, modeleId: id, ecrire });
      if (res.erreur) return { erreur: res.erreur };
      return { html: res.html, slots: res.slots, notes: res.notes };
    }, { id: m.id, fiche: FICHE, avecIA });
    if (r.erreur) { ko(`${nom} : ${r.erreur}`); continue; }
    const h = r.html, visible = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const p = [];
    if (/adsbygoogle|<script[^>]+src=["']https?:/i.test(h)) p.push('publicité ou script externe');
    if (/noindex/i.test(h)) p.push('noindex');
    if (/\.\.\/ex\.|ex\.css|ex\.js|\.\.\/\.\.\//.test(h)) p.push('lien vers l’exemple');
    if (m.marque && h.includes(m.marque.replace(/&amp;/, '&'))) p.push('nom de l’exemple resté');
    if (!/Boulangerie Martin/.test(visible)) p.push('nom de l’entreprise absent');
    if (/\b0[1-9](?: ?\d{2}){4}\b/.test(visible) && /\b0[1-9](?: ?\d{2}){4}\b/.exec(visible)[0].replace(/\s/g, '') !== '0240123456') p.push('numéro de téléphone de l’exemple');
    if (/href="tel:(?!\+33240123456)/.test(h)) p.push('lien téléphone de l’exemple');
    if (/exemple|fictif|démonstration/i.test(visible)) p.push('mention d’exemple : ' + (visible.match(/.{20}(exemple|fictif|démonstration).{20}/i) || [''])[0]);
    if (/€/.test(visible) && !/€/.test(FICHE.tarifs || '')) p.push('prix affiché');
    if (avecIA && /500 clients|12 € la prestation/.test(visible)) p.push('texte de l’IA fautif accepté');
    if (avecIA && !r.slots.some(s => s.etat === 'ia')) p.push('aucun texte écrit par l’IA');
    if (avecIA && !r.slots.some(s => s.etat === 'exemple' && /refusé/.test(s.raison))) p.push('aucun texte fautif refusé');
    if (!/<title>Boulangerie Martin/.test(h) || !/application\/ld\+json/.test(h)) p.push('titre ou données structurées');
    const d = ecrireDisque(nom, h), pagePhone = await ctx.newPage(), erreursPage = []; pagePhone.on('pageerror', e => erreursPage.push(e.message));
    for (const [w, hh] of [[390, 844], [1280, 800]]) {
      await pagePhone.setViewportSize({ width: w, height: hh }); await pagePhone.goto('file://' + path.join(d, 'index.html')); await pagePhone.waitForTimeout(350);
      const info = await pagePhone.evaluate(() => ({ sw: document.documentElement.scrollWidth, cache: [...document.querySelectorAll('h1,h2,h3,p,li')].filter(e => getComputedStyle(e).opacity === '0' && e.textContent.trim()).length }));
      if (info.sw > w + 1) p.push(`défilement horizontal à ${w} px (${info.sw})`);
      if (info.cache) p.push(`${info.cache} textes invisibles à ${w} px`);
      if (captures && !avecIA) { fs.mkdirSync(captures, { recursive: true }); await pagePhone.screenshot({ path: path.join(captures, `${m.id}-${w}.png`) }); }
    }
    if (erreursPage.length) p.push('erreur dans la page : ' + erreursPage[0]);
    await pagePhone.close();
    p.length ? p.forEach(x => ko(`${nom} : ${x}`)) : ok(`${nom} : ${r.slots.length} textes, coordonnées exactes, aucun reste de l’exemple${avecIA ? ', textes fautifs de l’IA refusés' : ''}`);
  }

  // parcours réel : fiche remplie, génération, correction d'un texte, enregistrement
  await pg.reload(); await pg.waitForFunction(() => window.sites && window.sites.modeles().length);
  for (const [k, v] of Object.entries(FICHE)) { const champ = await pg.$('#f_' + k); if (!champ) continue; if (k === 'couleur') await pg.evaluate(c => { document.querySelector('#f_couleur').value = c; }, v); else if (k === 'ton') await pg.selectOption('#f_ton', v); else await champ.fill(Array.isArray(v) ? v.join('\n') : v); }
  await pg.evaluate(() => { document.querySelector('#f_modele').value = 'auto'; document.querySelector('#f_modele').dispatchEvent(new Event('input', { bubbles: true })); });
  const propose = await pg.locator('#modeleInfo').innerText();
  /boulanger|Restaurant|Vitrine|vitrine|rendez|Prestations/i.test(propose) ? ok('point de départ proposé d’après le métier : ' + propose) : ko('point de départ proposé : ' + propose);
  await pg.click('#bGenerer'); await pg.waitForFunction(() => !document.querySelector('#bGenerer').disabled && window.sites.etat.resultat, null, { timeout: 60000 });
  const ui = await pg.evaluate(() => ({ iframe: !document.querySelector('#apercu').hidden && document.querySelector('#apercu').srcdoc.length, nbTextes: document.querySelectorAll('#textes [data-i]').length, titre: document.querySelector('#titreSite').textContent, etat: document.querySelector('#etat').innerText }));
  ui.iframe > 2000 && ui.nbTextes > 20 && /Boulangerie Martin/.test(ui.titre) ? ok(`parcours : aperçu affiché, ${ui.nbTextes} textes modifiables`) : ko('parcours : ' + JSON.stringify(ui));
  await pg.fill('#textes [data-i] >> nth=2', 'Phrase corrigée à la main pour le test'); await pg.waitForTimeout(900);
  (await pg.evaluate(() => window.sites.etat.resultat.html.includes('Phrase corrigée à la main pour le test'))) ? ok('texte corrigé à la main : l’aperçu se met à jour') : ko('correction d’un texte non prise en compte');
  if (captures) await pg.screenshot({ path: path.join(captures, 'interface.png') });
  await pg.click('#bEnregistrer'); await pg.waitForTimeout(400);
  sauvegarde && sauvegarde.dossier === 'boulangerie-martin' && sauvegarde.index > 5000 && sauvegarde.legal > 1000 && /LIVRAISON DU SITE : Boulangerie Martin/.test(sauvegarde.notes) && /TEXTES/.test(sauvegarde.notes)
    ? ok('enregistrement : index, mentions légales et notes de livraison transmis') : ko('enregistrement : ' + JSON.stringify(sauvegarde && { ...sauvegarde, notes: sauvegarde.notes.slice(0, 200) }));
  // mentions légales : coordonnées remplies, le reste signalé
  const legal = await pg.evaluate(async () => { const d = await window.studioSites.modele('plombier'); return window.Moteur.mentionsLegales(d.legal, window.sites.lireFiche()); });
  /Boulangerie Martin/.test(legal) && /contact@martin-nantes\.fr/.test(legal) && /12 rue des Halles/.test(legal) ? ok('mentions légales : coordonnées remplies') : ko('mentions légales incomplètes');
  await b.close();
  console.log(erreurs ? `\n${erreurs} problème(s)` : '\nStudio Sites : tout est bon');
  process.exit(erreurs ? 1 : 0);
})();
