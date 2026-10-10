/* QuenTools — jeux d'essai pour la lecture des fiches de paie (tools/verifier-decodeur.js).
   Les cinq premiers modèles reprennent la mise en page et les chiffres de vraies fiches d'un logiciel de paie courant (Sage), transcrits
   à la main ; l'identité, l'adresse, le numéro de sécurité sociale et l'employeur sont fictifs. Les autres imitent d'autres mises en page.
   degrade() fabrique des « mauvaises lectures » (colonnes décalées, chiffres confondus, lignes de bruit) pour entraîner la lecture. */
const n2 = x => x.toFixed(2).replace('.', ',');
const m4 = x => x.toFixed(4).replace('.', ',');

/* Mise en page Sage : désignation, nombre, base, taux, gain / retenue, part employeur */
function sage(o) {
  const L = [];
  L.push('SOCIETE', 'EXEMPLE EDITIONS SA', 'ETABLISSEMENT', 'BULLETIN DE PAIE');
  L.push(`Période du ${o.du} au ${o.au}`, `Paiement le ${o.au} par Virement`);
  L.push('Conv. coll. Convention Collective Nationale de l\'Edition Phonographique', 'N° Séc.Soc. 1 00 00 00 000 000 60', 'Emploi Manutentionnaire Polyvalent', `Horaire Mensuel ${n2(o.horaire)}`);
  L.push('Désignation Nombre Base Taux salarial Part salarié Part employeur', 'Gain Retenue');
  L.push(`Salaire de base ${n2(o.salBase)}`);
  (o.lignes || []).forEach(l => L.push(l));
  L.push(`TOTAL BRUT ${n2(o.brut)}`, 'SANTE');
  const B = o.brut.toFixed(3).replace('.', ',');
  const cot = [
    ['Sécurité Sociale - Maladie Maternité Invalidité Décès', B, '', '0,00', n2(o.brut * 0.0700)],
    ['Complémentaire Santé', B, '0,7250', n2(o.brut * 0.00725), n2(o.brut * 0.00725)],
    ['ACCIDENTS DE TRAVAIL-MALADIES PROFESSIONNELLES', B, '', '0,00', n2(o.brut * 0.0068)],
    ['RETRAITE'],
    ['Sécurité Sociale plafonnée', B, '6,9000', n2(o.brut * 0.069), n2(o.brut * 0.0855)],
    ['Sécurité Sociale déplafonnée', B, '0,4000', n2(o.brut * 0.004), n2(o.brut * 0.0202)],
    ['Complémentaire Tranche 1', B, '4,0100', n2(o.brut * 0.0401), n2(o.brut * 0.0601)],
    ['FAMILLE', B, '', '0,00', n2(o.brut * 0.0345)],
    ['ASSURANCE CHOMAGE', B, '', '0,00', n2(o.brut * 0.0430)],
    ['AUTRES CONTRIBUTIONS DUES PAR L\'EMPLOYEUR', B, '', '0,00', n2(o.brut * 0.0395)],
    ['CSG déductible de l\'impôt sur le revenu', (o.brut * 0.9825 * 0.88).toFixed(3).replace('.', ','), '6,8000', n2(o.brut * 0.0599), '0,00'],
    ['CSG/CRDS non déductible de l\'impôt sur le revenu', (o.brut * 0.9825 * 0.88).toFixed(3).replace('.', ','), '2,9000', n2(o.brut * 0.0255), '0,00']
  ];
  cot.forEach(c => L.push(c.filter(x => x !== '').join(' ')));
  if (o.hsBase) L.push(`CSG/CRDS sur HS non déductible de l'impôt sur le revenu ${(o.hsBase * 0.9825).toFixed(3).replace('.', ',')} 9,7000 ${n2(o.hsBase * 0.9825 * 0.097)} 0,00`, 'EXONERATIONS,ECRETEMENTS ET ALLEGEMENT DE COTISATIONS', `Réduction de cotisations salariales sur heures supplémentaires ${o.hsBase.toFixed(3).replace('.', ',')} -11,3100 ${n2(o.hsBase * 0.1131)}`);
  L.push(`TOTAL DES COTISATIONS ET CONTRIBUTIONS ${n2(o.cotSal)} ${n2(o.cotPat)}`);
  if (o.hsBase) L.push(`Exonération fiscale sur HS/HC ${n2(o.hsBase)}`, 'Titre transport 4,00');
  L.push(`NET A PAYER AVANT IMPOT SUR LE REVENU ${n2(o.netAvant)}`, 'dont évolution de la rémunération liée à la suppression des cotisations chômage et maladie 38,72');
  L.push('Impôt sur le revenu Base Taux Montant Cumul annuel', `Montant net imposable ${n2(o.netImp)} ${n2(o.netImp)}`, 'Impôt sur le revenu prélevé à la source 0,00 0,00', `Montant net des heures compl/suppl exonérées ${n2(o.hsBase || 0)} ${n2(o.hsBase || 0)}`);
  L.push(`NET A PAYER AU SALARIE (EN EUROS) ${n2(o.netAvant)}`, `ALLEGEMENT DE COTISATIONS EMPLOYEUR (EN EUROS) ${n2(o.allegement)}`, `TOTAL VERSE PAR L'EMPLOYEUR (EN EUROS) ${n2(o.verse)}`);
  L.push('Cumuls Salaire brut Ch. salariales Ch. patronales Av. en nature Hres travaillées Hres suppl. Net Social');
  L.push(`Période ${n2(o.brut)} ${n2(o.cotSal)} ${n2(o.cotPat)} 0,00 ${n2(o.hTrav)} ${n2(o.hsQty)} ${n2(o.netSocial)}`, `Année ${n2(o.brutAn)} ${n2(o.cotSal * 6)} ${n2(o.cotPat * 6)} 0,00 ${n2(o.hTrav * 6)} ${n2(o.hsQty * 4)}`);
  L.push('Compteurs Pris Restant Acquis', `Congés ${m4(o.cp[0]).replace(/0$/, '0')} ${m4(o.cp[1])} ${m4(o.cp[2])}`.replace(/,(\d{4})0?\b/g, ',$1'), 'Dates de congés Du Au');
  return L.join('\n');
}
const hsLine = (lab, qty, rate, taux, dates) => `${lab} ${n2(qty)} ${rate.toFixed(3).replace('.', ',')} ${m4(taux)} ${n2(qty * rate * taux / 100)}${dates ? '\n' + dates : ''}`;
const R = 12.103;

const FICHES = [
  { nom: 'Sage, janvier 2025 (heures supp 125 %, nuit, absences)',
    texte: sage({ du: '01/01/25', au: '31/01/25', horaire: 151.67, salBase: 1835.61, brut: 2330.93, cotSal: 473.77, cotPat: 375.95, netAvant: 1861.16, netImp: 1672.06, allegement: 480.40, verse: 2706.88, hTrav: 162.52, hsQty: 17.85, netSocial: 1857.16, brutAn: 2330.93, cp: [1, 0, 16], hsBase: 270.05,
      lignes: ['Rappel salaire 84,72', '7 h normales 16+17+21/12/24', hsLine('Heures suppl. 125%', 17.85, R, 125, '20+26/12/24+4>10/01/25'), hsLine('Heures de nuit', 43.33, R, 25, 'du 16/12/24 au 17/01/25'), 'Absence maladie (heure) 7,00 12,103 84,72', '19/12/24', 'Maintien maladie 100% 7,00 12,103 100,0000 84,72', 'Absence Congés Payés 1,00 87,286 87,29', 'Indemnité de congés payés 96,73'] }),
    attendu: { brut: 2330.93, netAvant: 1861.16, netFinal: 1861.16, netImposable: 1672.06, cotSal: 473.77, cotPat: 375.95, netSocial: 1857.16, hsQty: 17.85, hsAmount: 270.05, hsMaj: [25], hsTable: 17.85, congesCpt: [1, 0, 16], periode: 'janvier 2025' } },
  { nom: 'Sage, décembre 2024 (125 % et 150 %, prime)',
    texte: sage({ du: '01/12/24', au: '31/12/24', horaire: 151.67, salBase: 1835.61, brut: 2741.29, cotSal: 542.46, cotPat: 614.46, netAvant: 2198.83, netImp: 1943.20, allegement: 377.97, verse: 3355.75, hTrav: 183.77, hsQty: 29.33, netSocial: 2198.83, brutAn: 25010.2, cp: [4, 5, 12], hsBase: 447.76,
      lignes: [hsLine('Heures suppl. 125%', 28, R, 125, 'du 18/11/24 au 14/12/24'), hsLine('Heures suppl. 150%', 1.33, R, 150, '30/11/24'), hsLine('Heures de nuit', 34.62, R, 25, 'du 18/11/24 au 13/12/24'), 'Prime exceptionnelle 300,00', 'Absence Congés Payés 4,00 83,435 333,74', 'Indemnité de congés payés 386,91'] }),
    attendu: { brut: 2741.29, cotSal: 542.46, cotPat: 614.46, netSocial: 2198.83, hsQty: 29.33, hsMaj: [25, 50], hsTable: 29.33, congesCpt: [4, 5, 12], periode: 'décembre 2024' } },
  { nom: 'Sage, septembre 2024 (grosse prime)',
    texte: sage({ du: '01/09/24', au: '30/09/24', horaire: 151.67, salBase: 1835.61, brut: 3461.65, cotSal: 687.40, cotPat: 1239.92, netAvant: 2778.25, netImp: 2365.65, allegement: 14.18, verse: 4701.57, hTrav: 187.05, hsQty: 35.38, netSocial: 2774.25, brutAn: 19960.02, cp: [0, 11, 8], hsBase: 544.33,
      lignes: [hsLine('Heures suppl. 125%', 32.38, R, 125, 'du 19/08/24 au 21/09/24'), hsLine('Heures suppl. 150%', 3, R, 150, '09/24'), hsLine('Heures de nuit', 54.17, R, 25, 'du 19/08/24 au 20/09/24'), 'Prime except. 1er semestre 917,81'] }),
    attendu: { brut: 3461.65, netAvant: 2778.25, netFinal: 2778.25, netImposable: 2365.65, cotSal: 687.4, cotPat: 1239.92, netSocial: 2774.25, hsQty: 35.38, hsMaj: [25, 50], hsTable: 35.38, congesCpt: [0, 11, 8], periode: 'septembre 2024' } },
  { nom: 'Sage, novembre 2024',
    texte: sage({ du: '01/11/24', au: '30/11/24', horaire: 151.67, salBase: 1835.61, brut: 2274.54, cotSal: 459.60, cotPat: 313.45, netAvant: 1818.94, netImp: 1611.98, allegement: 522.21, verse: 2587.99, hTrav: 170.67, hsQty: 19, netSocial: 1814.94, brutAn: 25010.2, cp: [5, 5, 12], hsBase: 287.45,
      lignes: [hsLine('Heures suppl. 125%', 19, R, 125, 'du 21/10/24 au 15/11/24\n16/11 compense abs 12/11'), hsLine('Heures de nuit', 26.10, R, 25, 'du 21/10/24 au 15/11/24'), 'Absence Congés Payés 5,00 83,435 417,18', 'Indemnité de congés payés 483,64'] }),
    attendu: { brut: 2274.54, netAvant: 1818.94, netFinal: 1818.94, netImposable: 1611.98, cotSal: 459.6, cotPat: 313.45, netSocial: 1814.94, hsQty: 19, hsMaj: [25], hsTable: 19, congesCpt: [5, 5, 12], periode: 'novembre 2024' } },
  { nom: 'Sage, mars 2026 (taux horaire 12,647)',
    texte: sage({ du: '01/03/26', au: '31/03/26', horaire: 151.67, salBase: 1918.21, brut: 3164.73, cotSal: 692.99, cotPat: 1205.49, netAvant: 2471.74, netImp: 2200.10, allegement: 266.19, verse: 4370.22, hTrav: 175.12, hsQty: 11.95, netSocial: 2471.74, brutAn: 9000, cp: [1, 8, 20], hsBase: 188.91,
      lignes: [hsLine('Heures suppl. 125%', 11.95, 12.647, 125, 'du 16/02/26 au 20/03/26'), hsLine('Heures de nuit', 49.97, 12.647, 25, 'du 16/02/26 au 20/03/26'), 'Prime except. 2ième semestre 879,18', 'Prorata temps présence 165/180 87,19', 'Absence Congés Payés 1,00 87,189 87,19', 'Indemnité de congés payés 107,63'] }),
    attendu: { brut: 3164.73, netAvant: 2471.74, cotSal: 692.99, cotPat: 1205.49, hsQty: 11.95, hsMaj: [25], hsTable: 11.95, congesCpt: [1, 8, 20], periode: 'mars 2026' } },
  { nom: 'Mise en page simple (bureau, 35 h, sans heures supp)',
    texte: ['BULLETIN DE SALAIRE', 'Période : du 01/06/2026 au 30/06/2026', 'Salaire de base 151,67 11,6500 1 766,81', 'Prime d\'ancienneté 53,00', 'Total brut 1 819,81', 'Sécurité sociale maladie 1 819,81 0,00 % 0,00 13,00 % 236,57', 'Vieillesse plafonnée 1 819,81 6,90 % 125,57 8,55 % 155,59', 'CSG déductible 1 787,99 6,80 % 121,58', 'Total des cotisations 394,10 520,34', 'Net à payer avant impôt sur le revenu 1 425,71', 'Prélèvement à la source 2,10 % 1 425,71 29,94', 'Net à payer 1 395,77', 'Net imposable 1 538,40', 'Congés payés acquis 2,5 pris 0 solde 12,5'].join('\n'),
    attendu: { brut: 1819.81, netAvant: 1425.71, netFinal: 1395.77, netImposable: 1538.4, cotSal: 394.1, cotPat: 520.34, hsQty: 0, periode: 'juin 2026' } },
  { nom: 'Temps partiel avec heures complémentaires',
    texte: ['BULLETIN DE PAIE', 'Période du 01/04/2026 au 30/04/2026', 'Salaire de base 86,67 12,0000 1 040,04', 'Heures complémentaires 10 % 4,00 12,0000 48,00', 'Majoration heures complémentaires 10 % 4,00 12,0000 4,80', 'TOTAL BRUT 1 092,84', 'Total des cotisations et contributions 195,10 262,40', 'NET A PAYER AVANT IMPOT SUR LE REVENU 897,74', 'Impôt sur le revenu prélevé à la source 0,00 % 0,00', 'NET A PAYER 897,74'].join('\n'),
    attendu: { brut: 1092.84, netAvant: 897.74, hsQty: 4, hsMaj: [10], periode: 'avril 2026' } },
  { nom: 'Mise en page Désignation / Base / Taux / Montant (cotisations en négatif)',
    texte: ['ENTREPRISE ALPHA','BULLETIN DE PAIE','Période: Septembre 2026','Désignation Base Taux Montant','Salaire de base 151.67 15.00 2275.05','Prime exceptionnelle 1 200.00 200.00','SALAIRE BRUT 2475.05','Santé - Maladie Maternité 2475.05 0.00% 0.00','Mutuelle d\'entreprise 1 45.00 -45.00','Retraite Sécu. Plafonnée 2475.05 6.90% -170.78','CSG déductible 2431.74 6.80% -165.36','NET A PAYER AVANT IMPOT 1935.53 €'].join('\n'),
    attendu: { brut: 2475.05, netAvant: 1935.53, hsQty: 0, periode: 'septembre 2026' } },
  { nom: 'Rubriques génériques, net payé seul',
    texte: ['TECH SOLUTIONS SAS','BULLETIN DE SALAIRE','Ligne de rubrique comptable #100 Base: 3100.00 -0.00','Ligne de rubrique comptable #101 Base: 3100.00 -15.40','Ligne de rubrique comptable #102 Base: 3100.00 -30.80','NET PAYÉ: 2405,12 €'].join('\n'),
    attendu: { netFinal: 2405.12, hsQty: 0 } },
  { nom: "BTP ouvriers 2023 (HS exonérées, cumuls)",
    texte: "Plafond période 3 666,00\nBULLETIN DE PAIE\nPériode du 01/06/2023 au 30/06/2023\nLIBELLE BASE TAUX A PAYER Taux Pat. Mt Pat.\nSalaire de base 151,67 14,505 2 200,00\nHeures supplémentaires exonérées 25% 7,00 18,131 126,92\nIndem. repas hors entreprise (Excéd. limite exo.) 20,00 1,100 22,00\nTotal brut 2 348,92\nSANTE\nSécurité Sociale - Maladie Maternité Invalidité Décès 2 348,92 7,000 % 164,42\nComplémentaire Santé 78,00 38,00\nRETRAITE\nSécurité Sociale plafonnée 2 348,92 6,900 % -162,08 8,550 % 200,83\nSécurité Sociale déplafonnée 2 348,92 0,400 % -9,40 1,900 % 44,63\nCSG déductible de l'impôt sur le revenu 2 244,60 6,800 % -152,63\nCSG/CRDS non déductible de l'impôt sur le revenu 2 244,60 2,900 % -65,09\nRéduction salariale hres suppl. 126,92 14,35\nNet imposable 1 797,85\nTotal des cotisations et contributions 539,57 1 140,51\nMONTANT NET A PAYER AVANT IMPOT SUR LE REVENU 2 258,00\nImpôt sur le revenu prélevé à la source 1 797,85 0,000 0,00\nRÈGLEMENT : CHEQUE LE : 30/06/2023\nALLEGEMENT COTISATIONS 533,99 TOTAL VERSE EMPLOYEUR 3 489,43 NET A PAYER 2 258,00\nCumuls Brut Plafond S.S. Base T.A. Charges Pat. H. Payées H. Sup/Comp Exo Mt Sup/Comp Exo NET IMPOSABLE\nPériode 2 348,92 3 666,00 2 348,92 1 140,51 158,670 7,00 118,44 1 797,85\nAnnée 8 839,89 13 481,42 8 839,89 4 694,90 567,010 7,00 118,44 7 053,05",
    attendu: {"brut": 2348.92, "netAvant": 2258, "netFinal": 2258, "periode": "juin 2023", "hsQty": 7} },
  { nom: "Libellé / Unité / Taux / A retenir / A payer (congés, cumuls)",
    texte: "Pour davantage d'informations, voir la rubrique dédiée au bulletin de paie sur www.service-public.fr\nLibellé Unité / Base Taux A retenir A payer Montant\nSalaire de base 151,67 12,7993 1941,27\nAbsence Récupération (24-11-2025 - 24-11-2025) 1,00 97,06 97,06\nPrime aube et soirée [2025-11] 1,00 84,40 84,40\nPrime de nuit [2025-11] 3,32 0,700 3,56\nAbsence Congés payés (19-12-2025 - 19-12-2025) 1,00 88,7814 88,78\n**** BRUT FISCAL **** 3905,95\nSécurité Sociale - Maladie Maternité Invalidité Décès 3905,95 273,42\nComplémentaire Incapacité Invalidité Décès Tr.A 3905,95 2,32% 75,80 91,41\nSécurité Sociale plafonnée 3905,95 6,90% 269,51 333,96\nCSG déductible de l'impôt sur le revenu 3931,26 6,80% 267,33\nCSG/CRDS non déductible de l'impôt sur le revenu 3931,26 2,90% 114,01\nTOTAL DES COTISATIONS ET CONTRIBUTIONS 1021,16 2199,29\nMONTANT NET SOCIAL 2884,79\nNet fiscal 3092,22\nCumuls Plafond SS 47100.00 Brut soumis 25487.51 Net imposable 3092.22 HS défisc. 0.00 P.A.S. 9.28\nCongés payés / RC Acquis Pris Solde\nCP acquis 25.00 15.00 10.00\nCP reliquat 25.00 25.00 0.00\nNET A PAYER : 1587,74 €\nDate de règlement 05-01-2026 Virement\n- Page 1/2 -",
    attendu: {"netSocial": 2884.79, "netFinal": 1587.74, "netImposable": 3092.22, "hsQty": 0, "congesCpt": [15, 10, 25]} },
  { nom: "Salaire aux points (action sociale, journées)",
    texte: "Nombre jours 48 Valeur du point : 4.58\nLibellé Unité / Base Taux A retenir A payer Montant\nHoraire contractuel 48,00 691,39\nSalaire aux points 477,00 4,580 15,94\nPrime fonctionnelle 11,00 4,580 84,60\nIndemnité de dimanche et jours fériés 12,00 7,050 16,46\nPrime décentralisée mensuelle 889,14 0,05 44,46\n**** BRUT FISCAL **** 1113,75\nSécurité Sociale - Maladie Maternité Invalidité Décès 1113,75 77,96\nComplémentaire Incapacité Invalidité Décès 1076,55 0,83% 8,94 26,05\nCSG déductible de l'impôt sur le revenu 1121,85 6,80% 76,29\nCSG/CRDS non déductible de l'impôt sur le revenu 1121,85 2,90% 32,53\nTOTAL DES COTISATIONS ET CONTRIBUTIONS 342,47 747,85\nMONTANT NET SOCIAL 771,28\nNet fiscal 803,81\nNET A PAYER AVANT IMPOT SUR LE REVENU 771,28\nImpôt sur le revenu prélevé à la source (taux personnalisé) 803,81 0% 0,00\nCumuls Plafond SS 1180 Tranche A 1180 Brut 2628 Tranche B 1448 Net Imposable 2125 Tranche C 0 Hrs. Payées 110.00 Hrs. Supp. 0.00 Hrs. Trav. 110.00 PAS ou RAS 0.00 Charges Sal. 503.57 Charges Pat. 1346.92\nCongés payés / RC Acquis Pris Solde\nCP Reliquat 0.00 0.00 0.00\nNET A PAYER : 771,28 €\nINFORM. JOURNALIERES du 05-11-2025 au 30-11-2025",
    attendu: {"brut": 1113.75, "netSocial": 771.28, "netAvant": 771.28, "netFinal": 771.28, "cotSal": 342.47, "cotPat": 747.85, "hsQty": 0, "congesCpt": [0, 0, 0]} },
  { nom: "Métallurgie (A déduire / A payer / Charges patronales, absences)",
    texte: "Période : Avril 2026\nConvention collective : Métallurgie\nEléments de paie Base Taux A déduire A payer Charges patronales\nSalaire de base 151.67 17.1060 2 594.46\nRégul Absence maladie professionnelle 290825-310825 4.00 17.6638 70.66\nAbsence maladie 290825-310825 - 4.00 17.6638 70.66\nPrime d'ancienneté 1 870.83 4.0000 74.83\nPrime d'équipe de jour 12.00 4.0000 48.00\nJours CP acquis au titre de la maladie 1.18\nSalaire brut 2 717.29\nMaladie - maternité - invalidité - décès 2 717.29 7.0000\nVieillesse plafonnée 2 717.29 6.9000 187.49\nCSG déductible 2 729.48 6.8000 185.60\nCSG non déductible et CRDS 2 729.48 2.9000 79.15\nTotal des retenues déductibles 552.65\nTotal des retenues non déductibles 92.28\nTotal des retenues 644.93\nPrime d'équipe Exo jour 12.00 6.0000 72.00\nExonération sur HC/HS/RTT : cumul net fiscal annuel 250.67",
    attendu: {"brut": 2717.29, "periode": "avril 2026", "hsQty": 0} },
  { nom: "Base salariale / Résultat salarial / Base patronale",
    texte: "BULLETIN DE PAIE\nPériode de paie : du 01/01/2026 au 31/01/2026\nPaiement par virement le 31/01/2026\nLibellé Base Salariale Taux Résultat Salarial Base Patronale Taux\nSalaire de base 151.67 20.4274 3098.22\nPrime d'ancienneté 2058.00 15.0000 308.70\nRéintégration sociale 45.02\nSalaire Brut 3406.92\nSécurité sociale plafonnée 3451.94 6.9000 238.18 3451.94 8.5500\nSécurité sociale déplafonnée 3451.94 0.4000 13.81 3451.94 2.1100\nCSG non imposable à l'impôt sur le revenu 3683.72 6.8000 250.49\nCSG/RDS imposable à l'impôt sur le revenu 3683.72 2.9000 106.83\nTotal des retenues: 747.74\nRemboursement transport 90.80 50.0000 45.40\nMontant net social 2659.18\nNet à payer avant impôt sur le revenu 2704.58\nImpôt sur le revenu prélevé à la source 3102.43 -3.5000 -108.59\nNet Imposable: 3102.43\nNet à Payer: 2595.99",
    attendu: {"brut": 3406.92, "netSocial": 2659.18, "netAvant": 2704.58, "netImposable": 3102.43, "netFinal": 2595.99, "periode": "janvier 2026", "hsQty": 0} },
  { nom: "Heures de nuit + HS 25 % et 50 % + équivalence",
    texte: "BULLETIN DE SALAIRE Période : Août 2026\nEléments de paie Base Taux A déduire A payer Charges patronales\nSalaire de base 151.67 12.3100 1 867.06\nMajoration heures de nuit 102.00 2.4860 253.57\nHeures supplémentaires 25 % 17.33 17.4774 302.88\nHeures supplémentaires 50 % 9.00 20.9729 188.76\nHeures d'équivalence majorées 25% 17.33 15.3875 266.67\nSalaire brut 2 878.94\nSécurité Sociale plafonnée 2 878.94 6.9000 198.65\nCSG déductible 2 851.88 6.8000 193.93\nTotal des cotisations et contributions 622.79 1 204.90\nNet à payer avant impôt sur le revenu 1 440.66\nImpôt sur le revenu prélevé à la source 1 880.06 0.0000 0.00\nNet payé 1 440.66\nHeures Heures suppl. Brut Plafond S.S. Net imposable Ch. patronales\nMensuel 195.33 26.33 2 878.94 4 005.00 1 880.06 1 204.90\nCongés N-1 Congés N Acquis 2.83 Pris Solde 2.83",
    attendu: {"brut": 2878.94, "netAvant": 1440.66, "netFinal": 1440.66, "periode": "août 2026", "hsQty": 26.33, "hsMaj": [25, 50]} },
  { nom: "Montants élevés, congés en bloc",
    texte: "BULLETIN DE PAIE\nPériode du : 02/09/2019 au : 30/09/2019\nDésignation Nombre ou Base Taux Montant Part Employeur\nSALAIRE MENSUEL 146.61 5562.774 815558.30\nAVANTAGE NATURE PLACES MATCHS 9.00 84.050 756.45\nTOTAL DU BRUT 146.61 960574.62\nSécurité Sociale Plafonnée 3264.43 6.900 225.25 279.11\nCSG déductible de l'impôt sur le revenu 960378.10 6.800 65305.71\nCSG / CRDS non déductible de l'impôt sur le revenu 960378.10 2.900 27850.96\nNET IMPOSABLE 572856.01\nTotal des cotisations et contributions 98897.62 253713.95\nNet à Payer avant impôt sur le revenu 860582.85\ndont évolution de la rémunération liée à la suppression des cotisations salariales chômage et maladie -8808.73\nImpôt sur le revenu prélevé à la source 572856.00 43.00% 246328.08\nNet à payer 614254.77 EUR",
    attendu: {"brut": 960574.62, "netAvant": 860582.85, "netFinal": 614254.77, "netImposable": 572856.01, "periode": "septembre 2019", "hsQty": 0} }
];

// Mauvaises lectures simulées (déterministes) : même contenu, mise en forme dégradée
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function degrade(texte, mode, seed = 1) {
  const r = rng(seed), lines = texte.split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    if (mode === 'colonnes') {
      // libellé seul sur une ligne, chiffres sur la suivante (cellules sur plusieurs lignes)
      const m = l.match(/^([^\d]{6,}?)\s+(-?\d[\d ,.]*(?:\s+-?\d[\d ,.]*)*)$/);
      if (m && r() < 0.6) { out.push(m[1].trim(), m[2].trim()); continue; }
    }
    if (mode === 'chiffres') {
      l = l.replace(/\d+(?:[,.]\d+)?/g, t => { if (r() < 0.1) t = t.replace(/0/, 'O'); if (r() < 0.06) t = t.replace(/1/, 'l'); if (r() < 0.12) t = t.replace(',', '.'); return t; });
    }
    if (mode === 'bruit') {
      if (r() < 0.2) out.push('|||'); if (r() < 0.1) out.push('~ ,'); l = l.replace(/ /g, () => (r() < 0.04 ? '  ' : ' '));
    }
    if (mode === 'dates') { l = l.replace(/ (du \d{2}\/\d{2}\/\d{2} au \d{2}\/\d{2}\/\d{2})/, '\n$1'); }
    out.push(l);
  }
  return out.join('\n');
}
module.exports = { FICHES, degrade, sage };
