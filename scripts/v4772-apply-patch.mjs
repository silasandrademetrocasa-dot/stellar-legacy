#!/usr/bin/env node
// V47.7.2 • Stability only. Installer is idempotent and never edits the economy or SQL.
// scripts/v4772-apply-patch.mjs
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='47.7.1',NEW='47.7.2';
const read=path=>readFileSync(resolve(root,path),'utf8');
let changed=0;
function edit(file,transform){const before=read(file),after=transform(before);if(before!==after){writeFileSync(resolve(root,file),after);changed++;}}
function insertOnce(src,from,to,label){
  if(src.includes(to))return src;
  if(src.split(from).length!==2)throw new Error(`V47.7.2 ${label}: expected exactly one anchor`);
  return src.replace(from,to);
}
function walk(directory){return readdirSync(resolve(root,directory),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(directory,e.name)):e.isFile()?[join(directory,e.name)]:[]);}
const pkg=JSON.parse(read('package.json'));
if(pkg.version!==NEW)throw new Error('V47.7.2 release version mismatch');
if(!read('server/warbot-engine-v477.js').includes("rejected:'safe_zone'"))throw new Error('Protected-zone guard not packaged');
edit('public/game.js',src=>{
  const anchor=`      warbotBeamsV477.push({a:{x:Number(a.x),y:Number(a.y)},b:{x:Number(b.x),y:Number(b.y)},color:String(msg.color||'#77cfff'),created:nowSec()});`;
  const updated=`      // Avoid allocating beams or unlocking audio for battles that cannot appear on-screen.
      // The draw loop already applies this same world-visibility check.
      if(!onScreenWorld(Number(a.x),Number(a.y),160)&&!onScreenWorld(Number(b.x),Number(b.y),160))return true;
${anchor}`;
  return insertOnce(src,anchor,updated,'offscreen battle effects');
});
// Always cache-bust the new JS/CSS module version without rewriting unrelated game logic.
for(const f of walk('public').filter(x=>['.js','.mjs','.html','.css','.webmanifest'].includes(extname(x)))){
  edit(f,src=>src.replaceAll('?v='+OLD,'?v='+NEW));
}
edit('server/index.js',src=>insertOnce(src,`const RELEASE_VERSION = '${OLD}'`,`const RELEASE_VERSION = '${NEW}'`,'server version'));
for(const f of walk('tests').filter(x=>x.endsWith('.test.mjs'))){
  edit(f,src=>src.replaceAll(OLD,NEW).replaceAll(OLD.replaceAll('.','\\.'),NEW.replaceAll('.','\\.')).replaceAll('v4771-apply-patch','v4772-apply-patch'));
}
for(const [file,needle] of [
  ['public/game.js','// Avoid allocating beams or unlocking audio'],
  ['public/index.html','id="minimapMapLabelV4771"'],
  ['public/index.html','id="frontierExpansionBtnV42"'],
  ['server/warbot-engine-v477.js',"rejected:'safe_zone'"]
])if(!read(file).includes(needle))throw new Error(`V47.7.2 integration missing: ${file} ${needle}`);
if(!read('public/index.html').includes('/game.js?v='+NEW))throw new Error('HTML game.js version mismatch');
console.log(`✅ V47.7.2 stability ready • ${changed} modified files • no save or SQL changes.`);
