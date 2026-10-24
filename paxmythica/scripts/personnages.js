// Pax Mythica — récupère les pages et les paquets de personnages 3D libres de droits (CC0) listés dans
// scripts/personnages-sources.txt (une ligne : adresse [nom du fichier]) ; lancé par le workflow « Pax Mythica — personnages ».
// Les pages HTML sont gardées dans ressources-catalogue/personnages/ avec la liste de leurs liens ;
// les archives .zip sont décompressées dans ressources-catalogue/personnages/paquets/<nom>/ (sources, non livrées dans le jeu).
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DOSSIER = path.join(__dirname, '..', 'ressources-catalogue', 'personnages');
fs.mkdirSync(path.join(DOSSIER, 'paquets'), { recursive: true });
const lignes = fs.readFileSync(path.join(__dirname, 'personnages-sources.txt'), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const journal = [];
// itch.io (paquets gratuits) : page → lien de téléchargement → liste des fichiers → adresse de chaque fichier
const cookies = {};
const avecCookies = (r) => { for (const c of r.headers.getSetCookie ? r.headers.getSetCookie() : []) { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); } return r; };
const ent = () => ({ 'user-agent': 'Mozilla/5.0', cookie: Object.entries(cookies).map(([k, v]) => k + '=' + v).join('; ') });
async function itch(url, nom, filtre) {
  let r = avecCookies(await fetch(url, { headers: ent() })); const page = await r.text();
  const csrf = (page.match(/name="csrf_token" value="([^"]+)"/) || [])[1]; if (!csrf) throw new Error('jeton csrf absent');
  r = avecCookies(await fetch(url + '/download_url', { method: 'POST', headers: Object.assign(ent(), { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' }), body: 'csrf_token=' + encodeURIComponent(csrf) }));
  const dl = (await r.json()).url; if (!dl) throw new Error('pas de lien de téléchargement');
  r = avecCookies(await fetch(dl, { headers: ent() })); const p2 = await r.text(), cle = (dl.match(/download\/([^?/]+)/) || [])[1], csrf2 = (p2.match(/name="csrf_token" value="([^"]+)"/) || [])[1] || csrf;
  fs.writeFileSync(path.join(DOSSIER, nom + '.itch.html'), p2.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ''));
  const fichiers = [...p2.matchAll(/data-upload_id="(\d+)"[\s\S]{0,800}?class="name" title="([^"]+)"[\s\S]{0,400}?class="file_size"><span>([^<]+)</g)].map(m => ({ id: m[1], nom: m[2], taille: m[3] }));
  journal.push(`itch ${url} : ${fichiers.map(f => f.nom + ' (' + f.taille + ')').join(' ; ') || 'aucun fichier repéré'}`);
  for (const f of fichiers) {
    if (!filtre || !new RegExp(filtre, 'i').test(f.nom)) continue;
    r = avecCookies(await fetch(`${url}/file/${f.id}?source=game_download&key=${cle}`, { method: 'POST', headers: Object.assign(ent(), { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' }), body: 'csrf_token=' + encodeURIComponent(csrf2) }));
    const lien = (await r.json()).url; const z = Buffer.from(await (await fetch(lien)).arrayBuffer()), zip = path.join('/tmp', f.id + '.zip'); fs.writeFileSync(zip, z);
    const dest = path.join('/tmp/paquets', nom, f.nom.replace(/\.zip$/i, '').replace(/[^a-z0-9._-]+/gi, '_')); fs.mkdirSync(dest, { recursive: true });
    execSync(`unzip -o -q "${zip}" -d "${dest}"`);
    const liste = execSync(`cd "${dest}" && find . -type f -printf "%s %p\\n" | sort -k2`).toString();
    fs.writeFileSync(path.join(DOSSIER, nom + '-' + f.id + '.contenu.txt'), liste); journal.push(`  ${f.nom} : ${z.length} octets, ${liste.split('\n').length - 1} fichiers → /tmp/paquets/${nom}`);
  }
}
(async () => {
  for (const l of lignes) {
    if (l.startsWith('itch ')) { const [, url, nom, filtre] = l.split(/\s+/); try { await itch(url, nom, filtre); } catch (e) { journal.push(`ERREUR itch ${url} : ${e.message}`); } continue; }
    const [url, nom0] = l.split(/\s+/), nom = nom0 || url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 80);
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } });
      const type = r.headers.get('content-type') || '', buf = Buffer.from(await r.arrayBuffer());
      if (/html/.test(type) && !/\.zip$/.test(nom)) {
        const html = buf.toString('utf8'), liens = [...new Set([...html.matchAll(/href=["']([^"']+)["']/g)].map(m => m[1]))];
        const adresses = [...new Set([...html.matchAll(/https?:\/\/[^"'\s<>()]+/g)].map(m => m[0]))];
        fs.writeFileSync(path.join(DOSSIER, nom + '.liens.txt'), liens.concat(['', '# adresses citées dans la page'], adresses).join('\n'));
        fs.writeFileSync(path.join(DOSSIER, nom + '.txt'), html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 20000));
        journal.push(`${r.status} page ${url} → ${nom} (${liens.length} liens)`);
      } else if (/image\//.test(type)) {
        fs.writeFileSync(path.join(DOSSIER, nom.replace(/\.(jpg|png)$/, '') + (/png/.test(type) ? '.png' : '.jpg')), buf); journal.push(`${r.status} image ${url} → ${nom}`);
      } else {
        const zip = path.join('/tmp', nom.endsWith('.zip') ? nom : nom + '.zip'); fs.writeFileSync(zip, buf);
        const dest = path.join(DOSSIER, 'paquets', nom.replace(/\.zip$/, '')); fs.mkdirSync(dest, { recursive: true });
        try { execSync(`unzip -o -q "${zip}" -d "${dest}"`); journal.push(`${r.status} paquet ${url} → ${dest} (${buf.length} octets)`); }
        catch (e) { journal.push(`${r.status} non décompressé ${url} (${type}, ${buf.length} octets) : ${buf.toString('utf8', 0, 200).replace(/\s+/g, ' ')}`); }
      }
    } catch (e) { journal.push(`ERREUR ${url} : ${e.message}`); }
  }
  fs.writeFileSync(path.join(DOSSIER, 'journal.txt'), journal.join('\n') + '\n'); console.log(journal.join('\n'));
})();
