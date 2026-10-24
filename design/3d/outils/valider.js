// Contrôle de tous les .glb avec le validateur officiel Khronos : npm i gltf-validator puis node valider.js <dossier sortie>
const v=require(require.resolve('gltf-validator',{paths:[process.cwd(),__dirname]}));const fs=require('fs'),path=require('path');
const S=process.argv[2];const L=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())w(p);else if(f.endsWith('.glb'))L.push(p);}})(S);
(async()=>{let e=0,a=0;for(const f of L){const r=await v.validateBytes(new Uint8Array(fs.readFileSync(f)));e+=r.issues.numErrors;a+=r.issues.numWarnings;
 if(r.issues.numErrors||r.issues.numWarnings)console.log(path.basename(f),r.issues.messages.slice(0,3).map(m=>m.code+' '+m.message).join(' | '));}
 console.log(L.length,'fichiers,',e,'erreurs,',a,'avertissements');})();
