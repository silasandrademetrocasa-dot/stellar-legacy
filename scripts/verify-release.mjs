#!/usr/bin/env node
// V20.2.0 — no DB, no external network, no token and no write to players/saves.
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,relative,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fails=[];
const assert=(ok,message)=>{if(!ok)fails.push(message);};
const read=p=>readFileSync(resolve(ROOT,p),'utf8');
const pkg=JSON.parse(read('package.json'));
const release=String(pkg.version||'');
assert(/^\d+\.\d+\.\d+$/.test(release),'package.json sem versão válida');
assert(pkg.scripts?.start==='node server/index.js','start do Render divergiu');
const html=read('public/index.html'),game=read('public/game.js'),server=read('server/index.js');
for(const p of ['public/game.js','public/api.js','public/data.js','public/style.css','public/modules/quality-profiles.js','public/modules/asset-cache.js','public/modules/performance-monitor.js','public/modules/scene-gradient-cache.js','server/index.js','server/world.js','render.yaml','.github/workflows/stellar-installer-main.yml']){
  assert(existsSync(resolve(ROOT,p)),`arquivo essencial ausente: ${p}`);
}
assert(html.includes(`/game.js?v=${release}`),'HTML carrega game.js com versão divergente');
assert(html.includes(`/style.css?v=${release}`),'HTML carrega style.css com versão divergente');
assert(server.includes(`const RELEASE_VERSION = '${release}'`),'HTTP não declara a versão correta');
for(const match of game.matchAll(/(?:from\s+['"])(\.[^'"]+)['"]/g)){
 const imp=match[1];
 const [rel,query='']=imp.split('?');
 assert(existsSync(resolve(ROOT,'public',rel)),`import JS local inexistente: ${rel}`);
 assert(query===`v=${release}`,`import do jogo sem cache-busting V${release}: ${imp}`);
}
const htmlIds=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
for(const [id,n] of Object.entries(htmlIds.reduce((a,id)=>(a[id]=(a[id]||0)+1,a),{}))){
 assert(n===1,`ID HTML duplicado: ${id}`);
}
const scanDirs=['public','server','scripts','tests'];
function collect(dir){
 const out=[];
 for(const e of readdirSync(resolve(ROOT,dir),{withFileTypes:true})){
  const p=join(dir,e.name);
  if(e.isDirectory())out.push(...collect(p));
  else if(e.isFile())out.push(p);
 }
 return out;
}
const files=scanDirs.flatMap(collect);
let checked=0;
for(const f of files.filter(p=>['.js','.mjs','.cjs'].includes(extname(p)))){
 const res=spawnSync(process.execPath,['--check',resolve(ROOT,f)],{encoding:'utf8'});
 assert(res.status===0,`JS inválido: ${f} ${String(res.stderr||'').trim().slice(0,140)}`);
 checked++;
}
const runtime=files.filter(p=>p.startsWith('public/')&&['.js','.html','.css'].includes(extname(p))||p.startsWith('server/')&&extname(p)==='.js');
const assets=new Set();
for(const file of runtime){
 const code=read(file);
 for(const m of code.matchAll(/\/assets\/[a-zA-Z0-9_.\/-]+\.(?:webp|png|jpg|jpeg|gif|svg)/g)) assets.add(m[0]);
}
for(const ref of assets) assert(existsSync(resolve(ROOT,'public',ref.slice(1))),`sprite/asset ausente: ${ref}`);
const render=read('render.yaml');
assert(/buildCommand:\s*npm install\s*&&\s*npm run verify/.test(render),'Render não valida antes do deploy');
assert(/healthCheckPath:\s*\/health/.test(render),'health check Render ausente');
if(fails.length){
 console.error(`❌ Release V${release}: ${fails.length} erro(s):`);
 for(const f of fails)console.error(` • ${f}`);
 process.exitCode=1;
}else{
 console.log(`✅ V${release}: ${checked} JS verificados; ${assets.size} caminhos de assets; HTML/versões/imports e Render OK.`);
}
