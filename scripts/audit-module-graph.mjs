#!/usr/bin/env node
// BOOT AUDIT V106.8B — static module graph, including the index entry scripts.
// Read-only. Never delete assets based on this analysis: some paths are dynamic.
import {existsSync, readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const scan=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);
const files=scan(join(root,'public')).filter(p=>['.js','.mjs'].includes(extname(p)));
let refs=0;
const missing=[];
function check(rel,owner){
 const src=rel.split(/[?#]/,1)[0];
 if(!src || /^(?:https?:|node:|data:)/.test(src) || !(src.startsWith('.') || src.startsWith('/')))return;
 const dest=src.startsWith('/')?resolve(root,'public',src.slice(1)):resolve(dirname(owner),src);
 refs++;
 if(!dest.startsWith(resolve(root,'public')+'/')||!existsSync(dest))missing.push(`${owner.slice(root.length+1)} -> ${src}`);
}
for(const path of files){
 const contents=readFileSync(path,'utf8');
 const imports=/(?:\b(?:import|export)\s+(?:[\s\S]{0,240}?\s+from\s+)?|\bimport\s*\()\s*['"]([^'"\n]+)['"]/g;
 for(const match of contents.matchAll(imports)) check(match[1],path);
}
const html=readFileSync(join(root,'public/index.html'),'utf8');
for(const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi))check(match[1],join(root,'public/index.html'));
console.log(`BOOTAUDIT: ${files.length} client JS modules, ${refs} static import/script paths, ${missing.length} missing.`);
if(missing.length){console.error(missing.slice(0,30).join('\n'));process.exitCode=1;}
