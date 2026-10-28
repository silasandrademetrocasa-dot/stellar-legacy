#!/usr/bin/env node
/**
 * APK 100% local no trecho visual: a arvore public/ e uma sourceSet de assets
 * Android. Nao copiar para android/app/src/main/assets: duplicaria 70+ MB no Git.
 * O relatorio hashes/contagem prova exatamente o que sera empacotado.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const WEB=path.join(ROOT,'public');
function walk(dir,items=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const full=path.join(dir,e.name);
 if(e.isDirectory())walk(full,items);else if(e.isFile()){
  const r=path.relative(WEB,full).replaceAll(path.sep,'/');
  const buf=fs.readFileSync(full);
  items.push({path:r,size:buf.length,sha256:crypto.createHash('sha256').update(buf).digest('hex')});
 }}return items;}
const files=walk(WEB).sort((a,b)=>a.path.localeCompare(b.path));
const required=['index.html','api.js','game.js','data.js','world.js','style.css','assets/v17/manifest.js','manifest.webmanifest'];
for(const name of required)if(!files.some(f=>f.path===name))throw Error('Arquivo local ausente: '+name);
if(files.filter(x=>/\.(png|webp|jpe?g|svg|gif)$/i.test(x.path)).length<500)throw Error('Muitas imagens ausentes: nao gerar APK parcial.');
const bytes=files.reduce((n,x)=>n+x.size,0);
const report={schema:1,release:JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version,assetSource:'public/',androidSourceSet:'../../public',files:files.length,bytes,images:files.filter(x=>/\.(png|webp|jpe?g|svg|gif)$/i.test(x.path)).length,entries:files};
const dest=path.join(ROOT,'android','build','reports','stellar-assets-manifest.json');
fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2));
console.log('✅ APK local: '+report.files+' arquivos ('+(bytes/1048576).toFixed(2)+' MiB), '+report.images+' imagens; inventario: '+dest);
