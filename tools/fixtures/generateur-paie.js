/* QuenTools — générateur de fiches de paie fictives pour entraîner et contrôler la lecture (tools/essai-paie.js).
   Chaque modèle reprend la mise en page d'une famille de fiches réelles (anonymisées) ; les chiffres sont tirés au hasard
   mais cohérents (brut, cotisations, nets, heures supplémentaires) : la bonne réponse est connue d'avance. Déterministe : même graine, mêmes fiches. */
const { sage } = require('./fiches-de-paie.js');
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const r2 = x => Math.round(x * 100) / 100;
function fmt(x, st, d = 2) { // st : 'fr' (1 234,56), 'frc' (1234,56), 'pt' (1 234.56), 'ptc' (1234.56)
  const [i, f] = Math.abs(x).toFixed(d).split('.'), sep = st.endsWith('c') ? '' : ' ';
  const ent = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep), dec = st.startsWith('fr') ? ',' : '.';
  return (x < 0 ? '-' : '') + ent + (f ? dec + f : '');
}
function tirage(r) {
  const pick = a => a[Math.floor(r() * a.length)], between = (a, b) => a + r() * (b - a);
  const heures = pick([151.67, 151.67, 151.67, 130, 86.67, 108.33, 143]), taux = r2(between(11.88, 24.5));
  const hs25 = r() < 0.7 ? r2(Math.floor(between(1, 14) * 4) / 4) : 0, hs50 = hs25 && r() < 0.4 ? r2(Math.floor(between(1, 9) * 4) / 4) : 0;
  const mois = Math.floor(r() * 12), an = pick([2023, 2024, 2025, 2026]);
  const base = r2(heures * taux), prime = r() < 0.5 ? r2(between(20, 400)) : 0;
  const m25 = r2(hs25 * taux * 1.25), m50 = r2(hs50 * taux * 1.5);
  const brut = r2(base + m25 + m50 + prime), cotSal = r2(brut * between(0.19, 0.23)), cotPat = r2(brut * between(0.3, 0.45));
  const netSocial = r2(brut - cotSal + r() * 20), netAvant = r2(brut - cotSal + (r() < 0.5 ? r() * 40 : 0)), netImp = r2(brut * between(0.74, 0.8)), pas = r() < 0.5 ? r2(netImp * between(0.01, 0.08)) : 0;
  const cp = [r2(Math.floor(r() * 10)), r2(Math.floor(r() * 25)), r2(25)];
  return { heures, taux, hs25, hs50, mois, an, base, prime, m25, m50, brut, cotSal, cotPat, netSocial, netAvant, netImp, pas, netFinal: r2(netAvant - pas), cp, hs: r2(hs25 + hs50), r, pick };
}
const dates = (t, st) => { const mm = String(t.mois + 1).padStart(2, '0'), dernier = new Date(t.an, t.mois + 1, 0).getDate(); return [`01/${mm}/${t.an}`, `${dernier}/${mm}/${t.an}`]; };
const maj = t => { const s = []; if (t.hs25) s.push(25); if (t.hs50) s.push(50); return s; };

const MODELES = {
  sage(t) {
    const [du, au] = dates(t), rate = t.taux, L = [];
    if (t.hs25) L.push(`Heures suppl. 125% ${fmt(t.hs25, 'fr')} ${fmt(rate, 'fr', 3)} 125,0000 ${fmt(t.m25, 'fr')}`);
    if (t.hs50) L.push(`Heures suppl. 150% ${fmt(t.hs50, 'fr')} ${fmt(rate, 'fr', 3)} 150,0000 ${fmt(t.m50, 'fr')}`);
    if (t.prime) L.push(`Prime exceptionnelle ${fmt(t.prime, 'fr')}`);
    const texte = sage({ du, au, horaire: t.heures, salBase: t.base, lignes: L, brut: t.brut, hsBase: t.hs ? t.m25 + t.m50 : 0, cotSal: t.cotSal, cotPat: t.cotPat, netAvant: t.netAvant, netImp: t.netImp, allegement: r2(t.brut * 0.1), verse: r2(t.brut + t.cotPat), hTrav: t.heures + t.hs, hsQty: t.hs, netSocial: t.netSocial, brutAn: r2(t.brut * 5), cp: t.cp });
    return { texte, attendu: { brut: t.brut, netAvant: t.netAvant, netImposable: t.netImp, cotSal: t.cotSal, cotPat: t.cotPat, netSocial: t.netSocial, hsQty: t.hs, hsMaj: maj(t), periode: MOIS[t.mois] + ' ' + t.an, congesCpt: t.cp } };
  },
  btp(t) {
    const [du, au] = dates(t), f = x => fmt(x, 'fr');
    const L = ['Plafond période 3 666,00', 'BULLETIN DE PAIE', `Période du ${du} au ${au}`, 'LIBELLE BASE TAUX A PAYER Taux Pat. Mt Pat.', `Salaire de base ${f(t.heures)} ${fmt(t.taux, 'fr', 3)} ${f(t.base)}`];
    if (t.hs25) L.push(`Heures supplémentaires exonérées 25% ${f(t.hs25)} ${fmt(t.taux * 1.25, 'fr', 3)} ${f(t.m25)}`);
    if (t.hs50) L.push(`Heures supplémentaires exonérées 50% ${f(t.hs50)} ${fmt(t.taux * 1.5, 'fr', 3)} ${f(t.m50)}`);
    if (t.prime) L.push(`Indem. repas hors entreprise (Excéd. limite exo.) 20,00 1,100 ${f(t.prime)}`);
    L.push(`Total brut ${f(t.brut)}`, 'SANTE', `Sécurité Sociale - Maladie Maternité Invalidité Décès ${f(t.brut)} 7,000 % ${f(t.brut * 0.07)}`, `Sécurité Sociale plafonnée ${f(t.brut)} 6,900 % -${f(t.brut * 0.069)} 8,550 % ${f(t.brut * 0.0855)}`);
    if (t.hs) L.push(`Réduction salariale hres suppl. ${f(t.m25 + t.m50)} 14,35`);
    L.push(`Net imposable ${f(t.netImp)}`, `Total des cotisations et contributions ${f(t.cotSal)} ${f(t.cotPat)}`, `MONTANT NET A PAYER AVANT IMPOT SUR LE REVENU ${f(t.netAvant)}`, `RÈGLEMENT : CHEQUE LE : ${au}`, `NET A PAYER ${f(t.netAvant)}`);
    L.push('Cumuls Brut Plafond S.S. Base T.A. Charges Pat. H. Payées H. Sup/Comp Exo Mt Sup/Comp Exo NET IMPOSABLE', `Période ${f(t.brut)} 3 666,00 ${f(t.brut)} ${f(t.cotPat)} 158,670 ${f(t.hs)} ${f(t.m25 + t.m50)} ${f(t.netImp)}`);
    return { texte: L.join('\n'), attendu: { brut: t.brut, netAvant: t.netAvant, netFinal: t.netAvant, netImposable: t.netImp, cotSal: t.cotSal, cotPat: t.cotPat, hsQty: t.hs, hsMaj: maj(t), periode: MOIS[t.mois] + ' ' + t.an } };
  },
  libelle(t) {
    const f = x => fmt(x, 'ptc'), L = ["Pour davantage d'informations, voir la rubrique dédiée au bulletin de paie sur www.service-public.fr", 'Libellé Unité / Base Taux A retenir A payer Montant', `Salaire de base ${f(t.heures)} ${fmt(t.taux, 'ptc', 4)} ${f(t.base)}`];
    if (t.prime) L.push(`Prime de nuit [2025-11] 3,32 0,700 ${f(t.prime)}`);
    L.push(`**** BRUT FISCAL **** ${f(t.brut)}`, `Sécurité Sociale - Maladie Maternité Invalidité Décès ${f(t.brut)} ${f(t.brut * 0.07)}`, `CSG déductible de l'impôt sur le revenu ${f(t.brut * 0.98)} 6,80% ${f(t.brut * 0.0667)}`, `TOTAL DES COTISATIONS ET CONTRIBUTIONS ${f(t.cotSal)} ${f(t.cotPat)}`, `MONTANT NET SOCIAL ${f(t.netSocial)}`, `Net fiscal ${f(t.netImp)}`);
    L.push(`Cumuls Plafond SS 47100.00 Brut soumis ${f(t.brut * 6)} Net imposable ${f(t.netImp)} HS défisc. 0.00 P.A.S. ${f(t.pas)}`, 'Congés payés / RC Acquis Pris Solde', `CP acquis ${f(t.cp[2])} ${f(t.cp[0])} ${f(t.cp[2] - t.cp[0])}`, `CP reliquat 25.00 25.00 0.00`, `NET A PAYER : ${fmt(t.netFinal, 'ptc').replace('.', ',')} €`);
    return { texte: L.join('\n'), attendu: { netSocial: t.netSocial, netFinal: t.netFinal, netImposable: t.netImp, cotSal: t.cotSal, cotPat: t.cotPat, hsQty: 0, congesCpt: [t.cp[0], r2(t.cp[2] - t.cp[0]), t.cp[2]] } };
  },
  baseSalariale(t) {
    const [du, au] = dates(t), f = x => fmt(x, 'ptc'), L = ['BULLETIN DE PAIE', `Période de paie : du ${du} au ${au}`, `Paiement par virement le ${au}`, 'Libellé Base Salariale Taux Résultat Salarial Base Patronale Taux', `Salaire de base ${f(t.heures)} ${fmt(t.taux, 'ptc', 4)} ${f(t.base)}`];
    if (t.prime) L.push(`Prime d'ancienneté ${f(t.base)} 15.0000 ${f(t.prime)}`);
    L.push(`Salaire Brut ${f(t.brut)}`, `Sécurité sociale plafonnée ${f(t.brut)} 6.9000 ${f(t.brut * 0.069)} ${f(t.brut)} 8.5500`, `Total des retenues: ${f(t.cotSal)}`, `Montant net social ${f(t.netSocial)}`, `Net à payer avant impôt sur le revenu ${f(t.netAvant)}`, `Impôt sur le revenu prélevé à la source ${f(t.netImp)} -3.5000 -${f(t.pas)}`, `Net Imposable: ${f(t.netImp)}`, `Net à Payer: ${f(t.netFinal)}`);
    return { texte: L.join('\n'), attendu: { brut: t.brut, netSocial: t.netSocial, netAvant: t.netAvant, netImposable: t.netImp, netFinal: t.netFinal, cotSal: t.cotSal, periode: MOIS[t.mois] + ' ' + t.an, hsQty: 0 } };
  },
  nuit(t) {
    const f = x => fmt(x, 'ptc'), nuitH = r2(Math.floor(t.r() * 120) + 10), nuitM = r2(nuitH * 2.486 / 1);
    const L = [`BULLETIN DE SALAIRE Période : ${MOIS[t.mois][0].toUpperCase() + MOIS[t.mois].slice(1)} ${t.an}`, 'Eléments de paie Base Taux A déduire A payer Charges patronales', `Salaire de base ${f(t.heures)} ${fmt(t.taux, 'ptc', 4)} ${f(t.base)}`, `Majoration heures de nuit ${f(nuitH)} 2.4860 ${f(nuitM)}`];
    if (t.hs25) L.push(`Heures supplémentaires 25 % ${f(t.hs25)} ${fmt(t.taux * 1.42, 'ptc', 4)} ${f(t.hs25 * t.taux * 1.42)}`);
    if (t.hs50) L.push(`Heures supplémentaires 50 % ${f(t.hs50)} ${fmt(t.taux * 1.7, 'ptc', 4)} ${f(t.hs50 * t.taux * 1.7)}`);
    L.push(`Salaire brut ${f(t.brut)}`, `Sécurité Sociale plafonnée ${f(t.brut)} 6.9000 ${f(t.brut * 0.069)}`, `Total des cotisations et contributions ${f(t.cotSal)} ${f(t.cotPat)}`, `Net à payer avant impôt sur le revenu ${f(t.netAvant)}`, `Impôt sur le revenu prélevé à la source ${f(t.netImp)} 0.0000 0.00`, `Net payé ${f(t.netAvant)}`, `Heures Heures suppl. Brut Plafond S.S. Net imposable Ch. patronales`, `Mensuel ${f(t.heures + t.hs)} ${f(t.hs)} ${f(t.brut)} 4 005.00 ${f(t.netImp)} ${f(t.cotPat)}`);
    return { texte: L.join('\n'), attendu: { brut: t.brut, netAvant: t.netAvant, netFinal: t.netAvant, cotSal: t.cotSal, cotPat: t.cotPat, hsQty: t.hs, periode: MOIS[t.mois] + ' ' + t.an } };
  },
  simple(t) {
    const f = x => fmt(x, 'ptc'), L = ['ENTREPRISE EXEMPLE', 'BULLETIN DE PAIE', `Période: ${MOIS[t.mois][0].toUpperCase() + MOIS[t.mois].slice(1)} ${t.an}`, 'Désignation Base Taux Montant', `Salaire de base ${f(t.heures)} ${f(t.taux)} ${f(t.base)}`];
    if (t.prime) L.push(`Prime exceptionnelle 1 ${f(t.prime)} ${f(t.prime)}`);
    L.push(`SALAIRE BRUT ${f(t.brut)}`, `Retraite Sécu. Plafonnée ${f(t.brut)} 6.90% -${f(t.brut * 0.069)}`, `CSG déductible ${f(t.brut * 0.98)} 6.80% -${f(t.brut * 0.0667)}`, `NET A PAYER AVANT IMPOT ${f(t.netAvant)} €`);
    return { texte: L.join('\n'), attendu: { brut: t.brut, netAvant: t.netAvant, periode: MOIS[t.mois] + ' ' + t.an, hsQty: 0 } };
  },
  partiel(t) {
    const f = x => fmt(x, 'fr'), [du, au] = dates(t), hc = r2(Math.floor(t.r() * 12 + 1)), tx = r2(t.taux), mj = r2(hc * tx * 0.1), brut = r2(r2(t.heures * tx * 0.5) + hc * tx + mj);
    const L = ['BULLETIN DE PAIE', `Période du ${du} au ${au}`, `Salaire de base ${f(t.heures * 0.5)} ${fmt(tx, 'fr', 4)} ${f(t.heures * 0.5 * tx)}`, `Heures complémentaires 10 % ${f(hc)} ${fmt(tx, 'fr', 4)} ${f(hc * tx)}`, `Majoration heures complémentaires 10 % ${f(hc)} ${fmt(tx, 'fr', 4)} ${f(mj)}`, `TOTAL BRUT ${f(brut)}`, `NET A PAYER AVANT IMPOT SUR LE REVENU ${f(brut * 0.78)}`];
    return { texte: L.join('\n'), attendu: { hsQty: hc, hsMaj: [10], periode: MOIS[t.mois] + ' ' + t.an } };
  }
};
function generer(n, seed = 2024) {
  const r = rng(seed), noms = Object.keys(MODELES), out = [];
  for (let i = 0; i < n; i++) { const m = noms[i % noms.length], t = tirage(r); const f = MODELES[m](t); out.push({ nom: `${m} #${i + 1}`, texte: f.texte, attendu: f.attendu }); }
  return out;
}
module.exports = { generer, MODELES };
