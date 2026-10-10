// Synchronisation des photos et documents entre appareils (Firestore simulé)
const fs=require('fs'),vm=require('vm');
const assert=require('assert'),path=require('path');
const h=fs.readFileSync(path.join(__dirname,'..','decodeur-courrier.html'),'utf8');
const a=h.indexOf('const FILE_MAX'),b=h.indexOf('async function syncNow()');
const code=h.slice(a,b);
const remote={},A={}; // remote docs, device A idb
function mkdev(){const m=new Map();return {m,idb:{keys:async()=>[...m.keys()],get:async k=>m.get(k),set:async(k,v)=>{m.set(k,v)},del:async k=>m.delete(k)}};}
const F={db:{},Fs:{doc:(d,...p)=>p.join('/'),setDoc:async(r,v)=>{remote[r]=JSON.parse(JSON.stringify(v))},getDoc:async r=>({exists:()=>r in remote,data:()=>remote[r]}),deleteDoc:async r=>{delete remote[r]}}};
(async()=>{
 const run=async(dev,idx,del)=>{const ctx={idb:dev.idb,APP_ID:'x',FileReader:class{readAsDataURL(b){b.arrayBuffer().then(ab=>{this.result='data:'+b.type+';base64,'+Buffer.from(ab).toString('base64');this.onload()})}},fetch:async u=>({blob:async()=>new Blob(['pdf'],{type:'application/pdf'})}),Blob,Set,console};vm.createContext(ctx);vm.runInContext(code,ctx);return ctx.syncFiles(F,{uid:'u'},idx,new Set(del));};
 const d1=mkdev(),d2=mkdev();
 d1.m.set('w:g1','data:image/jpeg;base64,AAA');d1.m.set('d:d1',new Blob(['hello'],{type:'application/pdf'}));d1.m.set('d:big','x'.repeat(950000));
 let r=await run(d1,[],[]);assert.deepStrictEqual(r.fichiers,['w:g1','d:d1']); assert.strictEqual(r.skipped,1);
 let r2=await run(d2,r.fichiers,[]);assert.strictEqual(r2.got,2); assert.ok(d2.m.get('d:d1') instanceof Blob); assert.strictEqual(d2.m.get('w:g1'),'data:image/jpeg;base64,AAA');
 let r3=await run(d1,r2.fichiers,['g1']);assert.deepStrictEqual(r3.fichiers,['d:d1']); assert.strictEqual(Object.keys(remote).length,1);
 console.log('✓ synchronisation des photos et documents entre appareils (envoi, réception, suppression, fichier trop lourd)');
})();
