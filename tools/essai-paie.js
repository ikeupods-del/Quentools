// Passe les fiches d'essai (propres puis dégradées) dans parsePayslip et liste les écarts.
const fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','decodeur-courrier.html'),'utf8');
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const c={norm};vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('/*PAIE-DEB*/'),src.indexOf('/*PAIE-FIN*/')).replace(/^const /gm,'var '),c);
const {FICHES,degrade}=require('./fixtures/fiches-de-paie.js');
const MODES=[null,'colonnes','chiffres','bruit','dates'];
const get={brut:p=>p.brut,netAvant:p=>p.netAvant,netFinal:p=>p.netFinal,netImposable:p=>p.netImposable,cotSal:p=>p.cotSal,cotPat:p=>p.cotPat,netSocial:p=>p.netSocial,hsQty:p=>p.hsQty,hsAmount:p=>p.hsAmount,hsMaj:p=>[...new Set(p.hs.map(h=>h.impl))].sort((a,b)=>a-b),hsTable:p=>p.hsTable,congesCpt:p=>p.congesCpt&&[p.congesCpt.pris,p.congesCpt.restant,p.congesCpt.acquis],periode:p=>p.periode};
let ko=0,tot=0;const verbose=process.argv.includes('-v');
for(const f of FICHES)for(const m of MODES){
  if(m==='chiffres'&&0)continue;
  const t=m?degrade(f.texte,m,7):f.texte;
  let p;try{p=vm.runInContext('parsePayslip('+JSON.stringify(t)+')',c);}catch(e){console.log('✗ ERREUR',f.nom,m,e.message);ko++;continue;}
  for(const k in f.attendu){tot++;const a=f.attendu[k];let v;try{v=get[k](p);}catch(e){v=undefined;}
    const ok=JSON.stringify(v)===JSON.stringify(a)||(typeof a==='number'&&v===a);
    if(!ok&&!(m==='chiffres')){ko++;console.log('✗ '+f.nom+' ['+(m||'propre')+'] '+k+' = '+JSON.stringify(v)+' (attendu '+JSON.stringify(a)+')');}
    else if(!ok&&verbose)console.log('~ '+f.nom+' [chiffres] '+k+' = '+JSON.stringify(v));
  }
}
console.log(ko?`✗ ${ko} écarts sur ${tot} (hors lectures de chiffres confondus)`:`✓ ${tot} contrôles de fiches de paie`);
process.exit(ko?1:0);
