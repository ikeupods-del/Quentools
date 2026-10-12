/* Studio Sites — prépare marketing/studio-sites/modeles/ : node tools/studio-sites.js
   Copie les sites d'exemple (exemples/<secteur>/index.html) et les modèles de design/templates/ avec les polices et fichiers qu'ils utilisent.
   Ce sont les points de départ proposés par Studio Sites (outil privé : jamais publié sur le site). À relancer quand un exemple ou un modèle change. */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), sortie = path.join(racine, 'marketing', 'studio-sites', 'modeles');

// secteurs : description affichée et mots qui rapprochent un métier de cet exemple
const EXEMPLES = {
  plombier: { nom: 'Plombier, chauffagiste, dépanneur', mots: 'plomb chauff depann electric serrur artisan batiment macon peintre carreleur couvreur vitrier', couleur: 'bleu et jaune', style: 'pro sobre', mode: 'clair' },
  climatisation: { nom: 'Climatisation, froid, pompe à chaleur', mots: 'clim ventil froid pompe chaleur thermique', couleur: 'bleu clair', style: 'pro moderne', mode: 'clair' },
  bois: { nom: 'Vendeur de bois, matériaux, négoce', mots: 'bois chauffage materiau negoce menuis charpent ebenis scierie', couleur: 'brun', style: 'chaleureux nature', mode: 'clair' },
  restaurant: { nom: 'Restaurant, bar, brasserie', mots: 'restaur cafe bar brasserie bistro pizz traiteur snack', couleur: 'chaud', style: 'chaleureux luxe', mode: 'sombre' },
  fleuriste: { nom: 'Fleuriste, boutique, artisan d’art', mots: 'fleur bouquet boutique cadeau deco artisan art', couleur: 'rose', style: 'ludique chaleureux', mode: 'clair' },
  coach: { nom: 'Coach sportif, bien-être, activité', mots: 'coach sport fitness yoga pilates danse musculation naturo bien-etre', couleur: 'énergique', style: 'energique moderne', mode: 'sombre' },
  osteopathe: { nom: 'Ostéopathe, thérapeute, santé', mots: 'osteo kine therap sophro dieteti infirm medec dentiste psycho sante massage', couleur: 'doux', style: 'sobre nature', mode: 'clair' },
  paysagiste: { nom: 'Paysagiste, jardinier, espaces verts', mots: 'paysag jardin elagu espaces verts piscine terrasse', couleur: 'vert', style: 'nature chaleureux', mode: 'clair' },
  petsitter: { nom: 'Garde d’animaux, pension, toilettage', mots: 'pet animal chien chat cheval toilettage veterin garde pension ferme', couleur: 'nature', style: 'ludique nature', mode: 'clair' },
  photographe: { nom: 'Photographe, vidéaste, créatif', mots: 'photo video mariage film graph design studio artiste', couleur: 'sombre élégant', style: 'luxe moderne', mode: 'sombre' },
  formation: { nom: 'Formateur, page de vente d’une formation', mots: 'format cours ecole enseign prof stage atelier ebook guide', couleur: 'moderne', style: 'moderne pro', mode: 'sombre' }
};
const TEMPLATES = {
  vitrine: { nom: 'Vitrine simple (tous métiers)', mots: 'vitrine', couleur: 'au choix', style: 'sobre moderne', mode: 'au choix' },
  'rendez-vous': { nom: 'Prestations sur rendez-vous (coiffeur, thérapeute…)', mots: 'coiffeur coiffure esthetique institut beaute barbier rendez-vous', couleur: 'au choix', style: 'sobre chaleureux', mode: 'au choix' },
  restaurant: { nom: 'Restaurant, boulangerie (modèle QuenTools)', mots: 'boulang patiss', couleur: 'au choix', style: 'chaleureux sobre', mode: 'au choix' }
};

fs.rmSync(sortie, { recursive: true, force: true });
for (const d of ['html', 'polices', 'assets']) fs.mkdirSync(path.join(sortie, d), { recursive: true });
const index = [], polices = new Set();
const police = f => { const src = path.join(racine, 'assets', 'fonts', f); if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(sortie, 'polices', path.basename(f))); polices.add(path.basename(f)); } };

for (const [id, m] of Object.entries(EXEMPLES)) {
  const f = path.join(racine, 'exemples', id, 'index.html'); if (!fs.existsSync(f)) continue;
  const h = fs.readFileSync(f, 'utf8');
  for (const x of h.matchAll(/assets\/fonts\/ex\/([\w.-]+\.woff2)/g)) police('ex/' + x[1]);
  const titre = (/<title>([^<]*)<\/title>/.exec(h) || [])[1] || id, marque = titre.split(' · ')[0].replace(/&amp;/g, '&').trim();
  fs.writeFileSync(path.join(sortie, 'html', id + '.html'), h);
  index.push({ id, type: 'exemple', nom: m.nom, mots: m.mots, ambiance: m.couleur, style: m.style, mode: m.mode, marque, taille: h.length });
}
for (const [id, m] of Object.entries(TEMPLATES)) {
  const f = path.join(racine, 'design', 'templates', id + '.html'); if (!fs.existsSync(f)) continue;
  const h = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(path.join(sortie, 'html', 'modele-' + id + '.html'), h);
  index.push({ id: 'modele-' + id, type: 'modele', nom: m.nom, mots: m.mots, ambiance: m.couleur, style: m.style, mode: m.mode, marque: '', taille: h.length });
}
for (const f of ['bricolage.woff2', 'inter.woff2', 'fraunces-normal.woff2', 'cormorant-normal.woff2', 'dm-serif-display.woff2', 'space-grotesk-normal.woff2', 'nunito-normal.woff2', 'oswald-normal.woff2', 'caveat-normal.woff2']) police(f.includes('-normal') || f === 'dm-serif-display.woff2' ? 'ex/' + f : f);
for (const f of ['qt.css', 'qt.js']) fs.copyFileSync(path.join(racine, 'assets', f), path.join(sortie, 'assets', f));
fs.copyFileSync(path.join(racine, 'design', 'templates', 'legal.html'), path.join(sortie, 'html', 'legal.html'));
fs.writeFileSync(path.join(sortie, 'index.json'), JSON.stringify(index, null, 1));
console.log(`${index.length} modèles, ${polices.size} polices dans marketing/studio-sites/modeles/`);
