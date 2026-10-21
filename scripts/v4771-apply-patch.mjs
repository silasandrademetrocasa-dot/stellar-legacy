#!/usr/bin/env node
// Stellar Legacy V47.7.1 • idempotent, additive polishing patch on V47.7.0.
// scripts/v4771-apply-patch.mjs -- retained identifier for regression tests.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),OLD='47.7.0',NEW='47.7.1';
const read=f=>readFileSync(resolve(root,f),'utf8');let changed=0;
function edit(f,fn){const s=read(f),n=fn(s);if(n!==s){writeFileSync(resolve(root,f),n);changed++;}}
function rep(s,a,b,label){if(s.includes(b))return s;if(!s.includes(a))throw Error('V47.7.1 missing '+label+': '+a.slice(0,110));return s.replace(a,b);}
function walk(dir){return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(join(dir,f.name)):f.isFile()?[join(dir,f.name)]:[]);}
if(JSON.parse(read('package.json')).version!==NEW)throw Error('Expected V47.7.1 package');
if(!read('server/warbot-engine-v477.js').includes('warbotPlayerEligible')||!read('public/modules/warbot-visual-v477.js').includes('WARBOT_SHIP_ASSETS'))throw Error('V47.7.1 AI/sprites missing');
edit('public/game.js',s=>{
 s=rep(s,"import {drawWarbotShipV477,drawWarbotBeamV477} from './modules/warbot-visual-v477.js?v=47.7.0';", "import {drawWarbotShipV477,drawWarbotBeamV477,WARBOT_SHIP_ASSETS} from './modules/warbot-visual-v477.js?v=47.7.1';",'sprite import');
 s=rep(s,'drawWarbotShipV477(ctx,{...e,x:p.x,y:p.y},state.target?.id===e.id,resolvedQualityMode(),nowSec());',
  'drawWarbotShipV477(ctx,{...e,x:p.x,y:p.y,spriteImage:assetImage(WARBOT_SHIP_ASSETS[e.faction])},state.target?.id===e.id,resolvedQualityMode(),nowSec());','faction ship rendering');
 s=rep(s,'function drawMinimap(){',`const minimapMapLabelV4771=document.getElementById('minimapMapLabelV4771');
function syncMinimapMapLabelV4771(){
 if(!minimapMapLabelV4771)return;
 const label=progress?.mapId?'MAPA '+displayMapLabel(progress.mapId,currentTerritoryFaction()):'MAPA';
 if(minimapMapLabelV4771.textContent!==label)minimapMapLabelV4771.textContent=label;
}
function drawMinimap(){
 syncMinimapMapLabelV4771();`,'minimap map name');
 s=rep(s,'function updateFrameHudV2024(profile=null){\n  const work=HUD_SCHEDULER.next(resolvedQualityMode(),performance.now());\n  if(work.full){',
  'function updateFrameHudV2024(profile=null){\n  const work=HUD_SCHEDULER.next(resolvedQualityMode(),performance.now());\n  if(work.full){syncMinimapMapLabelV4771();','minimap collapsed name');
 return s;
});
edit('public/index.html',s=>{
 const original='<button id="frontierExpansionBtnV42" class="frontier-quick-v42" type="button" title="Expansoes do Universo">✦ UNIVERSO</button>';
 const relocated='<button class="small-btn universe-top-btn" id="frontierExpansionBtnV42" type="button" title="Expansões do Universo">✦ UNIVERSO</button>';
 if(!s.includes(relocated)){
  if(!s.includes(original))throw Error('Original UNIVERSO button not found');
  s=s.replace(original,'');
  s=rep(s,'<button class="small-btn" id="mapBtn" type="button">MAPA</button>',
   '<button class="small-btn" id="mapBtn" type="button">MAPA</button>\n  '+relocated,'move UNIVERSO into main buttons');
 }
 return rep(s,'<div class="stats-toolbar-label">MAPA</div>','<div class="stats-toolbar-label" id="minimapMapLabelV4771">MAPA</div>','minimap heading');
});
edit('public/style.css',s=>s.includes('/* V47.7.1 TOPBAR */')?s:s+`
/* V47.7.1 TOPBAR */
.universe-top-btn{position:static!important;inset:auto!important;transform:none!important;display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap;font-size:11px;box-shadow:none!important}
#minimapMapLabelV4771{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`);
for(const file of walk('public').filter(f=>['.js','.mjs','.html','.css','.webmanifest'].includes(extname(f))))edit(file,s=>s.replaceAll('?v='+OLD,'?v='+NEW));
edit('server/index.js',s=>s.replace("const RELEASE_VERSION = '"+OLD+"'","const RELEASE_VERSION = '"+NEW+"'"));
for(const file of walk('tests').filter(f=>f.endsWith('.test.mjs')))edit(file,s=>{
 s=s.replaceAll(OLD,NEW);
 if(!file.endsWith('warbot-wars-v477.test.mjs'))s=s.replaceAll('v477-apply-patch','v4771-apply-patch');
 return s;
});
for(const [f,k] of [['public/game.js','spriteImage:assetImage(WARBOT_SHIP_ASSETS'],['public/index.html','id="minimapMapLabelV4771"'],['public/index.html','class="small-btn universe-top-btn"'],['server/warbot-engine-v477.js','warbotPlayerEligible']])if(!read(f).includes(k))throw Error('Missing integration '+f+': '+k);
console.log(`✅ V47.7.1 integrated (${changed} updated files). SQL unchanged, saves untouched.`);
