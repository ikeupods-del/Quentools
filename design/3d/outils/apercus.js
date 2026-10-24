// Rendus de contrôle (aperçus 4 vues, version teintée, portrait) de chaque élément du catalogue.
// Usage : dans un dossier où « npm i three@0.170.0 playwright » a été fait :
//   node <chemin>/design/3d/outils/apercus.js [dossier sortie] [identifiants...]
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SP=__dirname, OUT=process.argv[2] || path.join(__dirname, '..', 'sortie'), IDS=process.argv.slice(3);
const MODULES=process.env.MODULES_3D || path.join(process.cwd(), 'node_modules');
const cat=JSON.parse(fs.readFileSync(path.join(OUT,'catalogue.json'),'utf8')).filter(x=>!IDS.length||IDS.includes(x.id));
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:2200,height:700}});
p.on('pageerror',e=>console.log('err:',e.message));
await p.route('http://x/**',r=>{const u=decodeURIComponent(new URL(r.request().url()).pathname);let f;
 if(u.startsWith('/three/'))f=path.join(MODULES,u);else if(u.startsWith('/s/'))f=path.join(OUT,u.slice(3));else f=path.join(SP,u);
 const t=f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':'application/octet-stream';
 try{r.fulfill({body:fs.readFileSync(f),contentType:t});}catch(e){r.fulfill({status:404,body:''});}});
await p.goto('http://x/apercus.html');await p.waitForFunction('window.PRET');
const save=(d,f)=>fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64'));
for(const it of cat){const url='/s/'+it.chemin+'/'+it.id+'.glb';const dir=path.join(OUT,it.chemin);
 if(it.type==='personnage'){save(await p.evaluate(([u])=>rendre(u,'perso',null,null),[url]),path.join(dir,'apercu.png'));
  save(await p.evaluate(([u])=>rendre(u,'perso','#2a5bd7',null),[url]),path.join(dir,'apercu-couleur-joueur.png'));
  save(await p.evaluate(([u])=>rendre(u,'portrait',null,'#2c3440'),[url]),path.join(dir,'portrait.png'));}
 else if(it.type==='accessoire')save(await p.evaluate(([u])=>rendre(u,'acc',null,null),[url]),path.join(dir,'apercu.png'));
 else{save(await p.evaluate(([u])=>rendre(u,'unite',null,null),[url]),path.join(dir,'apercu.png'));
  save(await p.evaluate(([u])=>rendre(u,'unite','#2a5bd7',null),[url]),path.join(dir,'apercu-couleur-joueur.png'));}
 console.log('rendu',it.id);}
await b.close();})();
