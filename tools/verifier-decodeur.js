/* QuenTools — contrôle de la lecture des montants de Paperdecrypt (HT, TVA, TTC) : node tools/verifier-decodeur.js
   Extrait la fonction de lecture de decodeur-courrier.html et la teste sur des textes types. Sans navigateur. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'decodeur-courrier.html'), 'utf8');
const a = src.indexOf('const AM_RE'), b = src.indexOf('const money =');
if (a < 0 || b < a) { console.error('✗ fonction de lecture des montants introuvable'); process.exit(1); }
const norm = x => String(x).toLowerCase().replace(/[’`´]/g, "'").normalize('NFD').replace(/[̀-ͯ]/g, '');
const ctx = { norm }; vm.createContext(ctx);
vm.runInContext(src.slice(a, b).replace(/^const /gm, 'var ').replace(/^function scanAmounts/m, 'var scanAmounts=function scanAmounts'), ctx);
const CAS = [
  ['TTC après un total HT et une TVA', 'Facture\nTotal HT : 100,00 €\nTVA 20 % : 20,00 €\nTotal TTC : 120,00 €', 'ttc', 120],
  ['Tout sur une ligne', 'Montant HT 833,33 € - TVA 20 % 166,67 € - Montant TTC 1 000,00 €', 'ttc', 1000],
  ['HT seul avec taux de TVA : TTC estimé', 'Prestation : 250,00 € HT (TVA 20 %)', 'ttc', 300],
  ['TTC suivi de « dont TVA »', 'Total à payer : 59,90 € TTC dont TVA 9,98 €', 'ttc', 59.9],
  ['Net à payer sans mention de taxe', 'Net à payer 186,40 €\nMontant HT 155,33 €', '', 186.4],
  ['Sous-total ignoré', 'Sous-total 80,00 €\nTotal 96,00 € TTC', 'ttc', 96],
  ['Aucun montant', 'Montant\nTTC\n', '', null],
  ['Courrier administratif sans taxe', "Le montant de l'indu s'élève à 642,00 €.", '', 642],
  ['Libellés au-dessus des chiffres', 'Total HT\n100,00 €\nTotal TTC\n120,00 €', 'ttc', 120],
  ['TTC puis HT séparés par une barre', '120,00 € TTC / 100,00 € HT', 'ttc', 120],
  ['Séparateurs de milliers', 'Total TTC : 12 450,50 €', 'ttc', 12450.5],
  ['Écriture T.T.C.', 'Total : 48,00 € T.T.C.', 'ttc', 48]
];
let ko = 0;
for (const [nom, texte, kind, val] of CAS) {
  const r = vm.runInContext('scanAmounts(' + JSON.stringify(texte) + ')', ctx);
  const ok = (r.best ? r.best.kind || '' : '') === kind && (r.best ? r.best.value : null) === val;
  if (!ok) { ko++; console.log('✗ ' + nom + ' → ' + JSON.stringify(r.best)); }
}
// Calcul de TVA et modèles de lettres
const c2={}; vm.createContext(c2);
vm.runInContext('var round2=x=>Math.round((x+Number.EPSILON)*100)/100;'+src.slice(src.indexOf('function calcTVA'),src.indexOf('const TVA_RATES')),c2);
const TV=[[{montant:'1200',mode:'ht',rate:'20',acompte:'30'},{ht:1200,tva:240,ttc:1440,acompte:432,reste:1008}],[{montant:'120',mode:'ttc',rate:'20'},{ht:100,tva:20,ttc:120}],[{montant:'100',mode:'ht',rate:'5.5',remise:'10'},{ht:90,tva:4.95,ttc:94.95}],[{montant:'59,90',mode:'ttc',rate:'10'},{ht:54.45,tva:5.45,ttc:59.9}]];
let ko2=0;
for(const [inp,exp] of TV){const r=vm.runInContext('calcTVA('+JSON.stringify(inp)+')',c2);for(const k in exp)if(Math.abs(r[k]-exp[k])>0.001){ko2++;console.log('✗ TVA '+JSON.stringify(inp)+' '+k+' = '+r[k]+' (attendu '+exp[k]+')');}}
if(!ko2)console.log('✓ Paperdecrypt : '+TV.length+' calculs de TVA corrects');
ko+=ko2;

// Analyse de fiche de paie
const pa=src.indexOf('/*PAIE-DEB*/'), pb=src.indexOf('/*PAIE-FIN*/');
const c3={ norm }; vm.createContext(c3);
vm.runInContext(src.slice(pa,pb).replace(/^const /gm,'var '),c3);
const SAMPLE = vm.runInContext('1',c3) && src.match(/const PAIE_SAMPLE = `([\s\S]*?)`;/)[1];
const run=(t,d)=>vm.runInContext('(function(){var p=parsePayslip('+JSON.stringify(t)+');return {p:p,ins:payslipInsights(p,'+(d===undefined?'null':d)+')};})()',c3);
let ko3=0; const chk=(nom,c)=>{ if(!c){ko3++;console.log('✗ paie : '+nom);} };
{ const {p,ins}=run(SAMPLE);
  chk('brut', p.brut===2021.04); chk('net avant impôt', p.netAvant===1580.12); chk('net versé', p.netFinal===1520.08); chk('impôt', p.pas&&p.pas.amount===60.04&&p.pas.taux===3.8);
  chk('net imposable', p.netImposable===1700.5); chk('cotisations', p.cotSal===441.07&&p.cotPat===612.3); chk('période', p.periode==='septembre 2026'&&p.ym==='2026-09');
  chk('2 lignes HS', p.hs.length===2&&p.hsQty===10&&p.hsAmount===156); chk('majorations 25 et 50', p.hs[0].impl===25&&p.hs[1].impl===50);
  chk('calcul net cohérent', ins.some(i=>/tombe juste/.test(i.text))); chk('allègement HS repéré', p.hsRelief===true);
  const d=run(SAMPLE,14).ins; chk('4 heures manquantes signalées', d.some(i=>i.level==='warn'&&/4 h/.test(i.text)));
  const e=run(SAMPLE,10).ins; chk('heures cohérentes', e.some(i=>i.level==='ok'&&/correspondent/.test(i.text)));
}
{ const {p,ins}=run("Salaire de base 151,67 12,00 1 820,04\nHeures supp 10,00 12,00 120,00\nTotal brut 1 940,04\nNet a payer avant impot 1 500,00\nNet a payer 1 450,00"); chk('HS au tarif normal signalées', p.hs.length===1&&ins.some(i=>i.level==='warn'&&/tarif normal/.test(i.text))); chk('net sans accents', p.netAvant===1500&&p.netFinal===1450); }
{ const {p,ins}=run("Salaire de base 151,67 11,65 1 766,81\nTotal brut\n1 766,81\nNET A PAYER AVANT IMPOT SUR LE REVENU\n1 391,00\nNET PAYE 1 391,00"); chk('libellés au-dessus des chiffres', p.brut===1766.81&&p.netAvant===1391&&p.netFinal===1391); chk('aucune HS', p.hs.length===0&&ins.some(i=>/Aucune ligne d'heures/.test(i.text))); }
chk('détection fiche de paie', vm.runInContext('looksLikePayslip('+JSON.stringify(SAMPLE)+')',c3)===true);
chk('pas de fausse détection sur un courrier', vm.runInContext('looksLikePayslip("Caisse d\'allocations familiales. Merci de nous transmettre vos documents avant le 20 octobre 2026.")',c3)===false);
if(!ko3) console.log('✓ Paperdecrypt : analyse de fiche de paie correcte (13 contrôles)');
ko+=ko3;
console.log(ko ? `✗ ${ko} cas en erreur sur ${CAS.length}` : `✓ Paperdecrypt : ${CAS.length} lectures de montants correctes`);
process.exit(ko ? 1 : 0);
