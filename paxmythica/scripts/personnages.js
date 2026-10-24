// Pax Mythica — récupère les pages et les paquets de personnages 3D libres de droits (CC0) listés dans
// scripts/personnages-sources.txt (une ligne : adresse [nom du fichier]) ; lancé par le workflow « Pax Mythica — personnages ».
// Les pages HTML sont gardées dans ressources-catalogue/personnages/ avec la liste de leurs liens ;
// les archives .zip sont décompressées dans ressources-catalogue/personnages/paquets/<nom>/ (sources, non livrées dans le jeu).
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DOSSIER = path.join(__dirname, '..', 'ressources-catalogue', 'personnages');
fs.mkdirSync(path.join(DOSSIER, 'paquets'), { recursive: true });
const lignes = fs.readFileSync(path.join(__dirname, 'personnages-sources.txt'), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const journal = [];
(async () => {
  for (const l of lignes) {
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
