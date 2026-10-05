#!/usr/bin/env node
/* Prospection par e-mail : e-mail personnalisé, point du jour et garde-fous. Sources uniques : design/MAILING.md (modèle, objets, phrases de métier)
   et design/SUIVI-PROSPECTION.md (tableau des envois). Rien n'est envoyé par cet outil : il écrit le texte et contrôle.
   Usage : node tools/mailing.js nouveau --metier plombier --prenom Julie --ville Nîmes --observation "…" [--objet A|B|C] [--entreprise …] [--adresse …]
           node tools/mailing.js relance --prenom Julie
           node tools/mailing.js point [--date AAAA-MM-JJ] */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), QUOTA = 10, DELAI_RELANCE = 4;
const lire = f => fs.readFileSync(path.join(racine, 'design', f), 'utf8');
const sans = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/* ---------- Suivi : lecture du tableau des envois ---------- */
function statut(s) {
  const t = sans(s);
  if (/^rebond|^blocage/.test(t)) return 'rebond'; if (/^stop/.test(t)) return 'stop'; if (/^relanc/.test(t)) return 'relancé';
  if (/^rdv/.test(t)) return 'rdv'; if (/^devis/.test(t)) return 'devis'; if (/^repons/.test(t)) return 'réponse'; if (/^envoy/.test(t)) return 'envoyé'; return t.split(' ')[0] || '?';
}
function lireSuivi(texte = lire('SUIVI-PROSPECTION.md')) {
  const bloc = texte.split(/\n## /)[0], lignes = [];
  for (const l of bloc.split('\n')) {
    if (!/^\| 20\d\d-\d\d-\d\d \|/.test(l)) continue;
    const c = l.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
    lignes.push({ date: c[0], entreprise: c[1], metier: c[2], ville: c[3], adresse: (c[4] || '').toLowerCase(), objet: c[5] || '-', statutBrut: c[6] || '', statut: statut(c[6] || '') });
  }
  return lignes;
}
const ajouter = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

function point(lignes, aujourdhui = new Date().toISOString().slice(0, 10)) {
  const envoyes = lignes.filter(l => ['envoyé', 'relancé', 'réponse', 'rdv', 'devis', 'stop'].includes(l.statut));
  const du_jour = lignes.filter(l => l.date === aujourdhui).length;
  const relances = lignes.filter(l => l.statut === 'envoyé' && l.date <= ajouter(aujourdhui, -DELAI_RELANCE));
  const reponses = lignes.filter(l => ['réponse', 'rdv', 'devis'].includes(l.statut));
  const parObjet = {};
  for (const l of lignes) { const o = parObjet[l.objet] = parObjet[l.objet] || { envois: 0, reponses: 0 }; if (l.statut !== 'rebond') o.envois++; if (['réponse', 'rdv', 'devis'].includes(l.statut)) o.reponses++; }
  return { aujourdhui, total: lignes.length, envoyes: envoyes.length, du_jour, quota_restant: Math.max(0, QUOTA - du_jour), relances, reponses: reponses.length,
    rebonds: lignes.filter(l => l.statut === 'rebond').length, stops: lignes.filter(l => l.statut === 'stop').length, parObjet };
}

/* ---------- Modèle : lu dans MAILING.md ---------- */
function modele(md = lire('MAILING.md')) {
  const section = (md.split(/\n## E-mail 1[^\n]*\n/)[1] || '').split(/\n## /)[0];
  const corps = []; let enCorps = false;
  for (const l of section.split('\n')) { if (l.startsWith('>')) { enCorps = true; corps.push(l.replace(/^> ?/, '')); } else if (enCorps && l.trim() === '') { if (corps.length > 3) break; } else if (enCorps) break; }
  const objets = {}; for (const m of md.matchAll(/^- \*\*([ABC])\*\* : (.+)$/gm)) objets[m[1]] = m[2].trim();
  const phrases = {}; for (const m of md.matchAll(/^- \*\*([^*]+)\*\* : « (.+) »\s*$/gm)) m[1].split(',').forEach(n => { phrases[sans(n)] = m[2]; });
  const relance = (md.match(/## Relance[^\n]*\n\*\*Objet\*\* : [^\n]*\n\n((?:>[^\n]*\n?)+)/) || [])[1];
  return { corps: corps.join('\n').trim(), objets, phrases, relance: relance ? relance.replace(/^> ?/gm, '').trim() : '' };
}
const phraseMetier = (m, phrases) => { const t = sans(m); return phrases[t] || Object.entries(phrases).find(([k]) => t.includes(k) || k.includes(t))?.[1] || ''; };

/* ---------- Garde-fous ---------- */
function controles({ observation, adresse, corps }, lignes) {
  const pb = [];
  const obs = String(observation || '').trim();
  if (obs.length < 20) pb.push('Observation vraie trop courte (20 caractères minimum) : un fait vérifié sur la personne est obligatoire.');
  if (/€|\d+ ?euro|https?:\/\/|www\./i.test(obs)) pb.push('L’observation ne doit contenir ni prix ni lien.');
  if (adresse) {
    const a = adresse.toLowerCase().trim(), deja = lignes.filter(l => l.adresse === a);
    if (deja.some(l => l.statut === 'stop')) pb.push('Cette adresse a répondu STOP : ne plus jamais écrire.');
    else if (deja.some(l => l.statut === 'rebond')) pb.push('Cette adresse a rebondi : ne pas réessayer.');
    else if (deja.length) pb.push(`Cette adresse a déjà été contactée le ${deja[0].date} (statut : ${deja[0].statut}) : une seule prise de contact, puis une relance.`);
  }
  if (!/STOP/.test(corps)) pb.push('La mention d’opposition (« répondez STOP ») manque.');
  if (/https?:\/\/|€/.test(corps.replace('quentools.fr', ''))) pb.push('Le premier e-mail ne doit contenir ni prix ni lien d’exemple.');
  if (corps.split(/\s+/).length > 170) pb.push('E-mail trop long (170 mots maximum).');
  if (/\[[^\]]+\]/.test(corps)) pb.push('Champ entre crochets non rempli : ' + corps.match(/\[[^\]]+\]/)[0]);
  return pb;
}

function composer(args, lignes, md) {
  const m = modele(md), objet = (args.objet || 'A').toUpperCase();
  if (!m.objets[objet]) throw new Error('Objet inconnu : ' + objet + ' (A, B ou C)');
  const phrase = phraseMetier(args.metier, m.phrases);
  let corps = m.corps.replace(/\[prénom\]/g, args.prenom || '[prénom]').replace(/\[métier\]/g, args.metier || '[métier]').replace(/\[ville\]/g, args.ville || '[ville]')
    .replace(/\[observation vraie\]/g, (args.observation || '').replace(/[.\s]+$/, '')).replace(/\[phrase de métier ci-dessous\]/g, phrase);
  const sujet = m.objets[objet].replace(/\[ville\]/g, args.ville || '[ville]');
  const pb = controles({ observation: args.observation, adresse: args.adresse, corps }, lignes);
  if (!phrase) pb.push('Aucune phrase de métier pour « ' + args.metier + ' » dans MAILING.md : en ajouter une.');
  return { sujet, corps, objet, problemes: pb };
}

function args(argv) { const o = {}; for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i]; return o; }

module.exports = { statut, lireSuivi, point, modele, composer, controles, ajouter, QUOTA };

if (require.main === module) {
  const [cmd, ...reste] = process.argv.slice(2), a = args(reste);
  try {
    if (cmd === 'point') {
      const p = point(lireSuivi(), a.date);
      console.log(`Point prospection du ${p.aujourdhui}`);
      console.log(`• ${p.total} contacts suivis, ${p.envoyes} envoyés ; aujourd’hui : ${p.du_jour} envoi(s), il en reste ${p.quota_restant} sur ${QUOTA}`);
      console.log(`• Réponses : ${p.reponses} · rebonds : ${p.rebonds} · STOP : ${p.stops}`);
      console.log(`• Relances à faire (envoyé il y a ${DELAI_RELANCE} jours ou plus, sans réponse) : ${p.relances.length}`);
      p.relances.slice(0, 15).forEach(l => console.log(`    - ${l.entreprise} (${l.metier}, ${l.ville}) · envoyé le ${l.date}`));
      console.log('• Par objet : ' + Object.entries(p.parObjet).map(([k, v]) => `${k === '-' ? 'ancien modèle' : k} ${v.envois} envois / ${v.reponses} réponses`).join(' · '));
    } else if (cmd === 'nouveau') {
      const r = composer(a, lireSuivi());
      console.log('Objet : ' + r.sujet + '\n\n' + r.corps + '\n');
      if (r.problemes.length) { console.log('⚠ À CORRIGER AVANT ENVOI :'); r.problemes.forEach(x => console.log('  - ' + x)); process.exit(1); }
      console.log(`✓ Contrôles réussis. Ligne à ajouter au suivi : | ${new Date().toISOString().slice(0, 10)} | ${a.entreprise || '[entreprise]'} | ${a.metier} | ${a.ville} | ${a.adresse || '[adresse]'} | ${r.objet} | envoyé |`);
    } else if (cmd === 'relance') {
      console.log(modele().relance.replace(/\[prénom\]/g, a.prenom || '[prénom]'));
    } else { console.log('Usage : node tools/mailing.js nouveau|relance|point (voir l’en-tête du fichier)'); process.exit(cmd ? 1 : 0); }
  } catch (e) { console.error(e.message); process.exit(1); }
}
