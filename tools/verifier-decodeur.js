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
console.log(ko ? `✗ ${ko} cas en erreur sur ${CAS.length}` : `✓ Paperdecrypt : ${CAS.length} lectures de montants correctes`);
process.exit(ko ? 1 : 0);
