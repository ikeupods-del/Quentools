// Pax Mythica — ressources graphiques libres de droits (CC0 : usage commercial permis, sans attribution obligatoire).
// Lancé par le workflow « Pax Mythica — ressources » (les serveurs de GitHub ont accès à ambientCG et Poly Haven).
//   node scripts/ressources.js            lit ressources/choix.json :
//     "catalogue" : recherches dont on veut voir les candidats (planches d'aperçus dans ressources-catalogue/, à supprimer ensuite)
//     "materiaux" : matériaux ambientCG { "nom": "herbe", "id": "Grass004" } → ressources/materiaux/<nom>/ (couleur, relief, rugosité + hauteur + occlusion)
//     "ciels"     : ciels HDR Poly Haven { "nom": "jour", "id": "kloofendal_48d_partly_cloudy_puresky", "res": "2k" } → ressources/ciels/<nom>.hdr
//     "modeles"   : modèles Poly Haven { "nom": "sapin", "id": "fir_tree_01", "res": "1k" } → ressources/modeles/<nom>/ (glTF)
// Chaque fichier téléchargé est noté dans ressources/LICENCES.json (source, adresse, licence).
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require(process.env.SHARP || 'sharp');

const RACINE = path.join(__dirname, '..');
const DOSSIER = path.join(RACINE, 'ressources');
const CATALOGUE = path.join(RACINE, 'ressources-catalogue');
const choix = JSON.parse(fs.readFileSync(path.join(DOSSIER, 'choix.json'), 'utf8'));
const journal = [];
const note = m => { journal.push(m); console.log(m); };
const licences = fs.existsSync(path.join(DOSSIER, 'LICENCES.json')) ? JSON.parse(fs.readFileSync(path.join(DOSSIER, 'LICENCES.json'), 'utf8')) : {};
const UA = { 'User-Agent': 'PaxMythica-ressources/1.0 (jeu indépendant)' };

async function json(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }
async function octets(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(r.status + ' ' + url); return Buffer.from(await r.arrayBuffer()); }

// lecture minimale d'une archive zip (ambientCG) : fichiers stockés ou compressés (deflate)
function dezipper(buf) {
  const zlib = require('zlib'), sortie = {};
  let fin = buf.length - 22; while (fin > 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--;
  const n = buf.readUInt16LE(fin + 10); let o = buf.readUInt32LE(fin + 16);
  for (let i = 0; i < n; i++) {
    const meth = buf.readUInt16LE(o + 10), taille = buf.readUInt32LE(o + 20), ln = buf.readUInt16LE(o + 28), le = buf.readUInt16LE(o + 30), lc = buf.readUInt16LE(o + 32), loc = buf.readUInt32LE(o + 42);
    const nom = buf.toString('utf8', o + 46, o + 46 + ln);
    const lnl = buf.readUInt16LE(loc + 26), lel = buf.readUInt16LE(loc + 28), deb = loc + 30 + lnl + lel, brut = buf.subarray(deb, deb + taille);
    sortie[nom] = meth === 8 ? zlib.inflateRawSync(brut) : brut;
    o += 46 + ln + le + lc;
  }
  return sortie;
}

// planche d'aperçus étiquetés (pour choisir sans tout télécharger)
async function planche(fichier, items) {
  const T = 220, col = 6, lignes = Math.ceil(items.length / col), compo = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i]; let img = null;
    try { img = await sharp(await octets(it.apercu)).resize(T, T, { fit: 'cover' }).png().toBuffer(); } catch (e) { note('aperçu manquant ' + it.id + ' : ' + e.message); }
    const x = (i % col) * T, y = Math.floor(i / col) * (T + 26);
    if (img) compo.push({ input: img, left: x, top: y });
    const txt = String(it.id).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    compo.push({ input: Buffer.from(`<svg width="${T}" height="26"><rect width="100%" height="100%" fill="#111"/><text x="4" y="18" font-size="13" font-family="sans-serif" fill="#fff">${txt}</text></svg>`), left: x, top: y + T });
  }
  await sharp({ create: { width: col * T, height: lignes * (T + 26), channels: 3, background: '#333' } }).composite(compo).jpeg({ quality: 80 }).toFile(fichier);
}

async function catalogue() {
  if (!choix.catalogue) return;
  fs.mkdirSync(CATALOGUE, { recursive: true });
  const resume = {};
  for (const r of choix.catalogue.ambientcg || []) {
    try {
      const d = await json(`https://ambientcg.com/api/v2/full_json?type=Material&q=${encodeURIComponent(r)}&sort=Popular&limit=24&include=imageData,tagData`);
      const items = (d.foundAssets || []).map(a => ({ id: a.assetId, nom: a.displayName, tags: a.tags, apercu: (a.previewImage && (a.previewImage['256-PNG'] || a.previewImage['512-PNG'] || Object.values(a.previewImage)[0])) || '' }));
      resume['ambientcg:' + r] = items.map(i => ({ id: i.id, nom: i.nom, tags: i.tags }));
      await planche(path.join(CATALOGUE, 'acg-' + r.replace(/\W+/g, '-') + '.jpg'), items.filter(i => i.apercu));
      note(`catalogue ambientCG « ${r} » : ${items.length}`);
    } catch (e) { note('ERREUR catalogue ambientCG ' + r + ' : ' + e.message); }
  }
  for (const r of choix.catalogue.polyhaven || []) {
    try {
      const [t, c] = r.split(':'), d = await json(`https://api.polyhaven.com/assets?t=${t}${c ? '&c=' + encodeURIComponent(c) : ''}`);
      const items = Object.entries(d).sort((a, b) => (b[1].download_count || 0) - (a[1].download_count || 0)).slice(0, 48)
        .map(([id, a]) => ({ id, nom: a.name, tags: a.tags, categories: a.categories, polys: a.polycount, apercu: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256` }));
      resume['polyhaven:' + r] = items.map(i => ({ id: i.id, nom: i.nom, tags: i.tags, categories: i.categories, polys: i.polys }));
      await planche(path.join(CATALOGUE, 'ph-' + r.replace(/\W+/g, '-') + '.jpg'), items);
      note(`catalogue Poly Haven « ${r} » : ${items.length}`);
    } catch (e) { note('ERREUR catalogue Poly Haven ' + r + ' : ' + e.message); }
  }
  // listes complètes sans aperçus (identifiants, catégories, nombre de polygones)
  for (const t of choix.catalogue.listes || []) {
    try { const d = await json('https://api.polyhaven.com/assets?t=' + t); resume['liste:' + t] = Object.entries(d).map(([id, a]) => [id, (a.categories || []).join(','), a.polycount || 0]); note(`liste Poly Haven ${t} : ${Object.keys(d).length}`); }
    catch (e) { note('ERREUR liste ' + t + ' : ' + e.message); }
  }
  fs.writeFileSync(path.join(CATALOGUE, 'catalogue.json'), JSON.stringify(resume, null, 1));
}

// matériau ambientCG : couleur (jpg), relief OpenGL (jpg), « rha » = rugosité, hauteur, occlusion (jpg) — 1024 px
async function materiau(m) {
  const dest = path.join(DOSSIER, 'materiaux', m.nom), taille = m.taille || 1024;
  if (fs.existsSync(path.join(dest, 'couleur.jpg')) && licences['materiaux/' + m.nom] && licences['materiaux/' + m.nom].id === m.id) return;
  let couleur, normal, rug, haut, ao, opac, emis, fichiers = {};
  if (m.source === 'polyhaven') {
    // textures Poly Haven : Diffuse, nor_gl, Rough, Displacement, AO (jpg 2k)
    const f = await json('https://api.polyhaven.com/files/' + m.id), cle = k => Object.keys(f).find(x => x.toLowerCase() === k.toLowerCase());
    const prendre = async k => { const c = cle(k); if (!c) return null; const r = f[c][m.res || '2k'] || f[c]['1k']; const e = r && (r.jpg || r.png); return e ? octets(e.url) : null; };
    [couleur, normal, rug, haut, ao] = await Promise.all(['Diffuse', 'nor_gl', 'Rough', 'Displacement', 'AO'].map(prendre));
    fichiers = Object.keys(f);
  } else {
    const res = m.res || '2K-JPG', url = `https://ambientcg.com/get?file=${m.id}_${res}.zip`;
    fichiers = dezipper(await octets(url)); const trouve = k => { const n = Object.keys(fichiers).find(f => new RegExp('_' + k + '\\.(jpg|png)$', 'i').test(f)); return n ? fichiers[n] : null; };
    couleur = trouve('Color'); normal = trouve('NormalGL'); rug = trouve('Roughness'); haut = trouve('Displacement'); ao = trouve('AmbientOcclusion'); opac = trouve('Opacity'); emis = trouve('Emission');
  }
  if (!couleur) throw new Error('pas de couleur dans ' + m.id + ' : ' + (Array.isArray(fichiers) ? fichiers : Object.keys(fichiers)).join(', '));
  fs.mkdirSync(dest, { recursive: true });
  const r = img => sharp(img).resize(taille, taille, { fit: 'fill' });
  if (opac) await r(couleur).joinChannel(await sharp(opac).resize(taille, taille, { fit: 'fill' }).greyscale().raw().toBuffer(), { raw: { width: taille, height: taille, channels: 1 } }).png().toFile(path.join(dest, 'couleur.png'));
  await r(couleur).jpeg({ quality: 88 }).toFile(path.join(dest, 'couleur.jpg'));
  if (normal) await r(normal).jpeg({ quality: 92 }).toFile(path.join(dest, 'relief.jpg'));
  if (emis) await r(emis).jpeg({ quality: 85 }).toFile(path.join(dest, 'lumiere.jpg'));
  const gris = async (img, def) => img ? r(img).greyscale().raw().toBuffer() : Buffer.alloc(taille * taille, def);
  const R = await gris(rug, 200), Hh = await gris(haut, 128), A = await gris(ao, 255), rha = Buffer.alloc(taille * taille * 3);
  for (let i = 0; i < taille * taille; i++) { rha[i * 3] = R[i * (R.length / (taille * taille)) | 0]; rha[i * 3 + 1] = Hh[i * (Hh.length / (taille * taille)) | 0]; rha[i * 3 + 2] = A[i * (A.length / (taille * taille)) | 0]; }
  await sharp(rha, { raw: { width: taille, height: taille, channels: 3 } }).jpeg({ quality: 90 }).toFile(path.join(dest, 'rha.jpg'));
  licences['materiaux/' + m.nom] = m.source === 'polyhaven' ? { id: m.id, source: 'Poly Haven', page: 'https://polyhaven.com/a/' + m.id, licence: 'CC0 1.0' } : { id: m.id, source: 'ambientCG', page: 'https://ambientcg.com/view?id=' + m.id, licence: 'CC0 1.0' };
  note(`matériau ${m.nom} ← ${m.id}`);
}

async function ciel(c) {
  const dest = path.join(DOSSIER, 'ciels', c.nom + '.hdr');
  if (fs.existsSync(dest) && licences['ciels/' + c.nom] && licences['ciels/' + c.nom].id === c.id) return;
  const f = await json('https://api.polyhaven.com/files/' + c.id), u = f.hdri[c.res || '2k'].hdr.url;
  fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, await octets(u));
  licences['ciels/' + c.nom] = { id: c.id, source: 'Poly Haven', page: 'https://polyhaven.com/a/' + c.id, licence: 'CC0 1.0' };
  note(`ciel ${c.nom} ← ${c.id}`);
}

async function modele(m) {
  const dest = path.join(DOSSIER, 'modeles', m.nom);
  if (licences['modeles/' + m.nom] && licences['modeles/' + m.nom].id === m.id && fs.existsSync(dest)) return;
  const f = await json('https://api.polyhaven.com/files/' + m.id), g = f.gltf[m.res || '1k'].gltf;
  fs.mkdirSync(dest, { recursive: true });
  // « texturesSeules » : feuillages, écorces… (le maillage d'origine, de plusieurs millions de polygones, n'est pas gardé)
  if (!m.texturesSeules) fs.writeFileSync(path.join(dest, m.nom + '.gltf'), await octets(g.url));
  for (const [rel, inc] of Object.entries(g.include || {})) { if (m.texturesSeules && !/\.(jpg|png)$/i.test(rel)) continue; const p = path.join(dest, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, await octets(inc.url)); }
  licences['modeles/' + m.nom] = { id: m.id, source: 'Poly Haven', page: 'https://polyhaven.com/a/' + m.id, licence: 'CC0 1.0' };
  note(`modèle ${m.nom} ← ${m.id}`);
}

(async () => {
  await catalogue();
  for (const [liste, fn] of [[choix.materiaux, materiau], [choix.ciels, ciel], [choix.modeles, modele]]) for (const x of liste || []) { try { await fn(x); } catch (e) { note('ERREUR ' + (x.nom || '') + ' (' + x.id + ') : ' + e.message); } }
  fs.mkdirSync(DOSSIER, { recursive: true });
  fs.writeFileSync(path.join(DOSSIER, 'LICENCES.json'), JSON.stringify(licences, null, 1));
  fs.mkdirSync(CATALOGUE, { recursive: true });
  fs.writeFileSync(path.join(CATALOGUE, 'journal.txt'), journal.join('\n') + '\n');
})();
