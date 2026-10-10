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
// Fiches générées (centaines de variantes : montants, mois, heures supplémentaires, primes) dans toutes les mises en page
const { generer } = require('./fixtures/generateur-paie.js');
{ const N = +(process.env.NB_FICHES || 700), G = generer(N, 2024); let gt = 0, gko = 0, gchiffres = 0, gct = 0; const par = {};
  G.forEach((f, idx) => MODES.forEach(m => {
    const t = m ? degrade(f.texte, m, 3 + (idx % 5)) : f.texte; let p; try { p = vm.runInContext('parsePayslip(' + JSON.stringify(t) + ')', c); } catch (e) { gko++; console.log('✗ ERREUR', f.nom, m, e.message); return; }
    for (const k in f.attendu) { let v; try { v = get[k](p); } catch (e) { v = undefined; } const a = f.attendu[k], ok = JSON.stringify(v) === JSON.stringify(a);
      if (m === 'chiffres') { gct++; if (!ok) gchiffres++; continue; }
      gt++; if (!ok) { gko++; const mod = f.nom.split(' ')[0]; par[mod] = (par[mod] || 0) + 1; if (gko <= 25 || verbose) console.log('✗ ' + f.nom + ' [' + (m || 'propre') + '] ' + k + ' = ' + JSON.stringify(v) + ' (attendu ' + JSON.stringify(a) + ')'); } }
  }));
  console.log(gko ? `✗ fiches générées : ${gko} écarts sur ${gt} (${JSON.stringify(par)})` : `✓ ${N} fiches générées (${gt} contrôles) ; lectures de chiffres confondus : ${Math.round(100 - 100 * gchiffres / gct)} % exactes`);
  ko += gko; }
// Analyse : aucune fausse alerte (« warn ») sur des fiches propres et cohérentes
{ const tous = FICHES.concat(generer(300, 77)); let w = 0;
  tous.forEach(f => { let ins; try { const p = vm.runInContext('parsePayslip(' + JSON.stringify(f.texte) + ')', c); vm.runInContext('globalThis.__p=' + JSON.stringify(p), c); ins = vm.runInContext('payslipInsights(__p,null)', c); } catch (e) { w++; console.log('✗ analyse en erreur', f.nom, e.message); return; }
    ins.filter(i => i.level === 'warn').forEach(i => { if (/peu de lignes/.test(i.text) && /Rubriques génériques/.test(f.nom)) return; w++; console.log('✗ fausse alerte ' + f.nom + ' : ' + i.text.slice(0, 140)); }); });
  console.log(w ? `✗ analyse : ${w} fausses alertes` : `✓ analyse : aucune fausse alerte sur ${tous.length} fiches cohérentes`); ko += w; }
// Photo dont le détail n'est pas fiable : aucune ligne d'heures supplémentaires présentée, seule la saisie de la personne compte
{ const f = FICHES[0]; let m = 0; const bad = x => { m++; console.log('✗ ' + x); };
  const run = (flag, fix, decl) => { const p = vm.runInContext('parsePayslip(' + JSON.stringify(f.texte) + ')', c); p.detailDouteux = flag; if (fix) p.fixed = ['hsQty'], p.hsQty = fix; vm.runInContext('globalThis.__p=' + JSON.stringify(p), c); return vm.runInContext('payslipInsights(__p,' + decl + ')', c).map(i => i.text).join(' | '); };
  const t1 = run(true, 0, 'null'); if (!/pas pu être lu avec certitude/.test(t1) || /Ligne «/.test(t1)) bad('détail douteux : message attendu, aucune ligne affichée');
  const t2 = run(true, 5, '8'); if (!/ta saisie/.test(t2) || !/il en manque peut-être 3 h/.test(t2)) bad('détail douteux + saisie : comparaison avec les heures déclarées : ' + t2.slice(0, 200));
  const t3 = run(false, 0, 'null'); if (/pas pu être lu avec certitude/.test(t3)) bad('fiche fiable : pas de message de doute');
  console.log(m ? '✗ détail douteux : ' + m + ' écarts' : '✓ détail douteux : rien d\'inventé, saisie de la personne prise en compte'); ko += m; }
console.log(ko?`✗ ${ko} écarts sur ${tot} (hors lectures de chiffres confondus)`:`✓ ${tot} contrôles de fiches de paie`);
process.exit(ko?1:0);
