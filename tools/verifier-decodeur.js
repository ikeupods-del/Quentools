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
  ['Écriture T.T.C.', 'Total : 48,00 € T.T.C.', 'ttc', 48],
  ['Montant sans symbole € sur une ligne qui parle d\'argent', 'Objet : relance\nMontant à payer : 186,40\nMerci.', '', 186.4],
  ['Net à payer sans symbole', 'Facture\nTotal HT 100,00\nNet à payer TTC 120,00', 'ttc', 120]
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
{ const {p,ins}=run("Salaire de base 86,67 11,00 953,37\nHeures complémentaires 5,00 11,00 60,50\nTotal brut 1 013,87\nNet à payer avant impôt 800,00\nNet à payer 780,00"); chk('heures complémentaires à 10 %', p.hs.length===1&&p.hs[0].compl===true&&p.hs[0].impl===10&&ins.some(i=>i.level==='ok'&&/10 %/.test(i.text))); }
{ const {p}=run("Salaire de base 151,67 15,00 2 275,05\nHres sup. à 125% 6,00 15,00 112,50\nH. SUP 50% 3.00 15.00 67.50\nTotal brut 2.455,05"); chk('125 % lu comme +25 %', p.hs[0].maj===25&&p.hs[0].impl===25); chk('décimales au point', p.hs[1].qty===3&&p.hs[1].amount===67.5&&p.hs[1].impl===50); chk('milliers au point', p.brut===2455.05); }
{ const {p,ins}=run("Salaire de base 151,67 12,00 1 820,04\nTotal brut 1 820,04\nMontant net social 1 560,00\nNet à payer avant impôt 1 450,00\nPrélèvement à la source taux neutre 4,10 % 1 450,00 59,45\nNet à payer 1 390,55"); chk('net social', p.netSocial===1560); chk('taux neutre', p.tauxNeutre===true&&ins.some(i=>/taux neutre/.test(i.text))); chk('impôt avec taux neutre', p.pas&&p.pas.amount===59.45&&p.pas.taux===4.1); }
{ const {p}=run(SAMPLE); const labels=p.lignes.map(l=>l.label); chk('lignes expliquées', ['Salaire de base','Heures supplémentaires','Allègement sur heures supplémentaires','Prélèvement à la source','Prime d\'ancienneté'].every(x=>labels.includes(x))); }
{ const {p}=run("Salaire de base 151,67 11,00 1 668,37\nAbsence maladie -3,00 11,00 -33,00\nSécurité sociale maladie 0,00 13,00 217,00\nVieillesse plafonnée 6,90 % 1 635,37 112,85\nRetraite complémentaire T1 3,15 % 1 635,37 51,51\nCSG déductible 6,80 % 1 600,00 108,80\nCRDS 0,50 % 1 600,00 8,00\nMutuelle 25,00 12,50\nTotal brut 1 635,37\nNet à payer avant impôt 1 330,00\nNet à payer 1 330,00"); const labels=p.lignes.map(l=>l.label); chk('cotisations expliquées', ['Absence','Retraite de base','Retraite complémentaire','CSG déductible','Mutuelle'].every(x=>labels.includes(x))); chk('absence repérée', p.absences.length>=1); }
{ const {p,ins}=run("Salaire de base 151,67 12,00 1 820,04\nHeures supplémentaires 8,00 12,00 96,00\nMajoration heures supplémentaires 25 % 8,00 12,00 24,00\nTotal brut 1 940,04"); chk('majoration sur une ligne à part rapprochée', p.hs.length===1&&p.hs[0].qty===8&&p.hs[0].amount===120&&p.hs[0].impl===25&&p.hsQty===8); chk('pas de fausse alerte « tarif normal »', !ins.some(i=>/tarif normal/.test(i.text))&&ins.some(i=>i.level==='ok'&&/25 %/.test(i.text))); }
{ const {p}=run("Salaire de base 151,67 12,00 1 820,04\nHeures supplémentaires 25 % 08:00 12,00 120,00\nHS 50 % 2h30 12,00 45,00"); chk('durées hh:mm', p.hs.length===2&&p.hs[0].qty===8&&p.hs[1].qty===2.5&&p.hsQty===10.5); }
{ const {p}=run("Assurance maladie 2 021,04 0,00 % 0,00 13,00 % 262,74\nAbsence maladie -3,00 11,00 -33,00\nTotal brut 2 021,04"); const l=p.lignes.find(x=>x.label.startsWith('Sécurité sociale')); chk('cotisation : part salariale et part employeur', l&&l.sal===0&&l.pat===262.74); chk('assurance maladie : pas une absence', p.absences.length===1&&p.lignes.some(x=>x.label==='Absence')); }
{ const p1="BULLETIN DE PAIE\nPériode du 01/09/2026 au 30/09/2026\nSalaire de base 151,67 12,00 1 820,04\nHeures supplémentaires 25 % 8,00 12,00 120,00\nTOTAL BRUT 1 940,04", p2="Total des cotisations 420,10 580,00\nNET A PAYER AVANT IMPOT SUR LE REVENU 1 519,94\nPrélèvement à la source 3,80 % 1 519,94 57,76\nNET A PAYER 1 462,18"; const {p}=run(p1+"\n\n"+p2); chk('fiche sur plusieurs pages', p.brut===1940.04&&p.netAvant===1519.94&&p.netFinal===1462.18&&p.pas.amount===57.76&&p.hsQty===8&&p.periode==='septembre 2026'); }
{ const out=vm.runInContext('(function(){var p0=parsePayslip('+JSON.stringify("Salaire de base 151,67 12,00 1 820,04\nHeures supplémentaires 25 % 8,00 12,00 120,00\nTotal brut 1 940,04\nNet à payer 1 462,18")+');var p=applyPaieFix(p0,{brut:"2000,50",baseRate:"10"});return {brut:p.brut,orig:p0.brut,impl:p.hs[0].impl,fixed:p.fixed};})()',c3); chk('correction à la main : brut et taux horaire', out.brut===2000.5&&out.orig===1940.04&&out.impl===50&&out.fixed.length===2); }
if(!ko3) console.log('✓ Paperdecrypt : variantes de fiches de paie (temps partiel, formats, cotisations) lues correctement');
if(!ko3) console.log('✓ Paperdecrypt : analyse de fiche de paie correcte (13 contrôles)');
ko+=ko3;

// Lecture d'un ticket ou d'une facture d'achat (garanties)
{
  const ta=src.indexOf('/*TICKET-DEB*/'), tb=src.indexOf('/*TICKET-FIN*/'); const c4={ norm }; vm.createContext(c4);
  vm.runInContext(src.slice(ta,tb).replace(/^const /gm,'var ').replace(/^function /gm,'var _f_=0;function '),c4);
  const rd=t=>vm.runInContext('readReceipt('+JSON.stringify(t)+')',c4);
  const HEAD=["Facture FF05A017897-26-002 du 29.08.2026 16:54 Page 1/1","Boulanger Arles","10 Avenue des Arches, 13200 Arles","SIRET 94056844700012","Commerçant indépendant -","Membre du réseau BOULANGER","M STORACE QUENTIN","N° client: 55274636"];
  const TAIL=["Extension de garantie non retenue","Garantie réparation jusqu'au 29.08.2028","Disponibilité des pièces détachées (donnée fournisseur):","Pendant 7 ans"];
  const FOOT=["Merci de votre visite","Garantie légale de conformité : 2 ans","ELECTRO 1","au capital Social de 50 000 EUR","RCS Tarascon 940 568 447","TVA I.C. FR88940568447","APE 4754Z"];
  const A=[...HEAD,"REFERENCE DE L'ACHAT CODE Qté P.U.TTC T.TVA TOTAL TTC","TV LG 50QNED86B 2026 0001239790 1 637.89 20.00 637.89","ECO-PART DEEE 11.11",...TAIL,"TOTAL HT (Euros) 540.83","TOTAL TTC (Euros) 649.00","Dont TVA (20.00 %) 108.17","Dont éco-part. DEEE (TTC) 11.11","REGLEMENTS Règlement perçu 649.00",...FOOT].join('\n');
  const B=[...HEAD,"REFERENCE DE L'ACHAT","TV LG 50QNED86B 2026","0001239790 1 637.89 20.00 637.89","ECO-PART DEEE","11.11",...TAIL,"TOTAL HT (Euros)","TOTAL TTC (Euros)","Dont TVA (20.00 %)","Dont éco-part. DEEE (TTC)","540.83","649.00","108.17","11.11","REGLEMENTS","Règlement perçu","649.00",...FOOT].join('\n');
  let ko4=0; const ck=(n,c)=>{ if(!c){ko4++;console.log('✗ ticket : '+n);} };
  for (const [nom,t] of [['facture Boulanger (lignes)',A],['facture Boulanger (colonnes séparées)',B]]) { const r=rd(t); ck(nom+' : prix 649',r.price===649); ck(nom+' : magasin',r.store==='Boulanger'); ck(nom+' : produit « '+r.product+' »',r.product==='TV LG 50QNED86B 2026'); ck(nom+' : fin de garantie',r.warrantyEnd==='2028-08-29'); ck(nom+' : extension refusée',r.extension===false); }
  { const r=rd("CARREFOUR MARKET\n12 RUE DES LILAS\nLave-linge BOSCH WAN28 1 399,00\nSOUS-TOTAL 399,00\nTOTAL A PAYER 399,00 EUR\nCB 399,00\nTicket n° 4521 12/05/2026"); ck('ticket de caisse', r.price===399&&r.store==='Carrefour'&&r.product==='Lave-linge BOSCH WAN28'); }
  { const r=rd("SARL TECHNO au capital de 50 000 EUR\nCasque audio XY200 59,90\nTotal TTC : 59,90 €"); ck('capital ignoré', r.price===59.9); }
  { const r=rd("Garantie 5 ans pièces et main d'oeuvre\nAspirateur DYSON V15 599,00\nTOTAL 599,00"); ck('garantie annoncée en années', r.warrantyYears===5&&r.price===599&&r.store==='Dyson'); }
  { vm.runInContext('1',ctx); const r=vm.runInContext('scanAmounts('+JSON.stringify("SARL au capital de 50 000 euros. Montant à payer : 120,00 €")+')',ctx); ck('scanAmounts ignore le capital social', r.best&&r.best.value===120); }
  if(!ko4) console.log('✓ Paperdecrypt : lecture des tickets et factures d\'achat correcte (13 contrôles)');
  ko+=ko4;
}
{ const c2={};vm.createContext(c2);vm.runInContext(src.slice(src.indexOf('/*CADRE-DEB*/'),src.indexOf('/*CADRE-FIN*/')),c2);
  const W=320,H=240,page=()=>{const g=new Float32Array(W*H).fill(235);let s=5;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);for(let y=20;y<H-20;y+=9){let x=20;while(x<W-30){const wd=3+Math.floor(r()*14);if(r()<.8)for(let yy=y;yy<y+4;yy++)for(let xx=x;xx<x+wd&&xx<W-20;xx++)g[yy*W+xx]=25;x+=wd+3+Math.floor(r()*4);}}return g;};
  const blur=(g,k)=>{let a=g;for(let it=0;it<k;it++){const b=new Float32Array(g.length);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){let t=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)t+=a[(y+dy)*W+x+dx];b[y*W+x]=t/9;}a=b;}return a;};
  const Q=g=>c2.frameQuality(Uint8Array.from(g,v=>Math.max(0,Math.min(255,Math.round(v)))),W,H),P=page();
  const cas=[['page nette et éclairée',Q(P).level==='good'],['page sombre signalée',Q(P.map(v=>v*.3)).tips.some(t=>/sombre/.test(t))],['reflet signalé',Q(P.map(v=>v>100?255:v)).level==='bad'],['ombre signalée',Q(P.map((v,i)=>(i%W)<W/2?v:v*.55)).tips.some(t=>/Ombre/.test(t))],['flou signalé',Q(blur(P,3)).tips.some(t=>/flou/.test(t))]];
  cas.forEach(([n,okk])=>{if(!okk){ko++;console.log('✗ cadre guide : '+n);}}); if(cas.every(x=>x[1]))console.log('✓ cadre guide : '+cas.length+' contrôles de qualité d\'image'); }
{ const r=require('child_process').spawnSync(process.execPath,[require('path').join(__dirname,'essai-paie.js')],{encoding:'utf8'}); process.stdout.write(r.stdout); if(r.status) ko++; }
{ const r=require('child_process').spawnSync(process.execPath,[require('path').join(__dirname,'essai-lecture-paie.js')],{encoding:'utf8'}); process.stdout.write(r.stdout); if(r.status) ko++; }
console.log(ko ? `✗ ${ko} cas en erreur sur ${CAS.length}` : `✓ Paperdecrypt : ${CAS.length} lectures de montants correctes`);
process.exit(ko ? 1 : 0);
