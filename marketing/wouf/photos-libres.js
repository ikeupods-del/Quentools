'use strict';
/* Cherche des photos libres de droits (CC0 / domaine public : usage commercial libre) pour les carrousels « Subissent ça / Choisissez ça ».
   Tourne sur GitHub (workflow « Photos libres ») car il faut internet : Openverse puis Wikimedia Commons en secours.
   Entrée : photos-libres.json. Sortie : photos-candidats/<clé>-<k>.jpg (4 propositions max, 1400 px) + credits.json (auteur, licence, lien).
   On choisit ensuite la meilleure et on la copie en photos/<clé>.jpg, puis : node marketing/wouf/contraste.js */
const fs = require('fs'), path = require('path');
const sharp = require(process.env.SHARP || 'sharp');
const OUT = path.join(__dirname, 'photos-candidats'), WANT = require('./photos-libres.json'), MAX = 4;
const UA = 'WoufMarketing/1.0 (https://woufapp.fr; wouf-contact@proton.me)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const okLicence = l => /^(cc0|pdm)$/i.test(l) || /^(cc0|public domain|pd\b|pdm)/i.test(l);

async function openverse(q) {
  const u = 'https://api.openverse.org/v1/images/?' + new URLSearchParams({ q, license: 'cc0,pdm', category: 'photograph', page_size: '20', mature: 'false' });
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) { console.log('  openverse', r.status); return []; }
  return ((await r.json()).results || []).filter(x => okLicence(x.license) && (x.width || 1200) >= 900)
    .map(x => ({ url: x.url, title: x.title, creator: x.creator || '', licence: x.license.toUpperCase(), page: x.foreign_landing_url, source: 'Openverse / ' + x.source }));
}
async function commons(q) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '25', gsrsearch: q + ' filetype:bitmap', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1400' });
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) { console.log('  commons', r.status); return []; }
  return Object.values((await r.json()).query?.pages || {}).map(p => ({ p, i: (p.imageinfo || [])[0] || {} }))
    .filter(({ i }) => okLicence(i.extmetadata?.LicenseShortName?.value || '') && i.width >= 900)
    .map(({ p, i }) => ({ url: i.thumburl || i.url, title: p.title.replace(/^File:/, ''), creator: (i.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim(), licence: i.extmetadata.LicenseShortName.value, page: i.descriptionurl, source: 'Wikimedia Commons' }));
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true }); // les photos retenues vont dans photos/ (+ credits.json)
  const credits = {}, seen = new Set();
  for (const [key, queries] of Object.entries(WANT)) {
    if (key === '_') continue;
    const found = [];
    // Openverse (vraies photos) d'abord, Wikimedia Commons seulement s'il en manque
    for (const [q, fn] of [...queries.map(q => [q, openverse]), ...queries.map(q => [q, commons])]) {
      if (found.length >= MAX) break;
      let list = []; try { list = await fn(q); } catch (e) { console.log('  erreur', fn.name, e.message); }
      await sleep(3500);
      for (const c of list) {
        if (found.length >= MAX || seen.has(c.url)) continue;
        try {
          const r = await fetch(c.url, { headers: { 'User-Agent': UA } }); if (!r.ok) continue;
          const buf = Buffer.from(await r.arrayBuffer()), f = `${key}-${found.length + 1}.jpg`;
          await sharp(buf).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(path.join(OUT, f));
          seen.add(c.url); found.push({ fichier: f, recherche: q, ...c });
        } catch (e) { console.log('  image ignorée', e.message); }
        await sleep(500);
      }
    }
    credits[key] = found; console.log(key, found.length, 'photo(s)');
  }
  fs.writeFileSync(path.join(OUT, 'credits.json'), JSON.stringify(credits, null, 1) + '\n');
})();
