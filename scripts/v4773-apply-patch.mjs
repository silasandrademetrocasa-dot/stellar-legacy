#!/usr/bin/env node
// V47.7.3 Performance Rescue. PATCH only: no SQL, account, save or economy changes.
// Retains the 47.7.2 offscreen battle effects culling, sprites and HUD.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='47.7.2',NEW='47.7.3';
const read=file=>readFileSync(resolve(root,file),'utf8');
let changed=0;
function edit(file,fn){const old=read(file),next=fn(old);if(old!==next){writeFileSync(resolve(root,file),next);changed++;}}
function replaceOne(s,old,updated,label){
 if(s.includes(updated))return s;
 const n=s.split(old).length-1;
 if(n!==1)throw Error(`V47.7.3 ${label}: expected 1 anchor, got ${n}`);
 return s.replace(old,updated);
}
function walk(dir){return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);}
if(JSON.parse(read('package.json')).version!==NEW)throw Error('V47.7.3 package version mismatch');
if(!read('server/warbot-engine-v477.js').includes('const NPC_CADENCE_MS=150'))throw Error('New bot cadence missing');
if(!read('public/modules/quality-profiles.js').includes("low:{label:'BAIXA',dpr:1.0,fps:120"))throw Error('Unlocked low FPS missing');
edit('public/game.js',s=>{
  // A server-verified admin grant may finish loading after entering the galaxy screen.
  // We fetch permission before denying U-X. The server revalidates access independently.
  const anchor='function isVerifiedAdminNavigator(){return !!authenticated && adminRuntime.enabled===true;}';
  const method=`${anchor}
// PERF_RESCUE_FRONTIER_ADMIN_V4773 - UI permission refresh; server remains authoritative.
async function verifiedFrontierTravelAccessV4773(label){
  let access=canTravelGraphLabel(label);
  if(!access.ok&&/^U-[123]$/.test(String(label))&&/^Requer nível/.test(String(access.reason))&&authenticated){
    const beforeId=String(getUser()?.id||'');
    try{await refreshAdminStatus(true);}catch{}
    if(!authenticated||beforeId!==String(getUser()?.id||''))return {ok:false,reason:'Sessão alterada'};
    access=canTravelGraphLabel(label);
  }
  return access;
}`;
  s=replaceOne(s,anchor,method,'frontier server-verified grant');
  const mapAnchor="ui.mapNetwork.querySelectorAll('.map-node[data-map-label]').forEach(el=>el.addEventListener('click',()=>{";
  s=replaceOne(s,mapAnchor,"ui.mapNetwork.querySelectorAll('.map-node[data-map-label]').forEach(el=>el.addEventListener('click',async()=>{",'U-X galaxy map click');
  const mapCheck="    if(label===current)return;\n    const access=canTravelGraphLabel(label);\n    if(!access.ok){showToast(access.reason);return;}";
  const mapUpdated="    if(label===current)return;\n    const access=await verifiedFrontierTravelAccessV4773(label);\n    if(!access.ok){showToast(access.reason);return;}";
  s=replaceOne(s,mapCheck,mapUpdated,'U-X galaxy map level gate');
  s=replaceOne(s,'function jumpThroughPortal(portal){','async function jumpThroughPortal(portal){','U-X physical portal');
  const portalAnchor="  const access=canTravelGraphLabel(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction));\n  if(!access.ok){showToast(access.reason);playSfx('warning');return;}";
  const portalUpdated="  const sourceMap=progress?.mapId;\n  const label=portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction);\n  // Prevent repeated requests while ADM verification is in flight.\n  state.lastPortalAt=nowSec();\n  const access=await verifiedFrontierTravelAccessV4773(label);\n  if(progress?.mapId!==sourceMap||state.jumping)return;\n  if(!access.ok){showToast(access.reason);playSfx('warning');return;}";
  s=replaceOne(s,portalAnchor,portalUpdated,'U-X portal permission check');
  return s;
});
edit('server/world.js',s=>{
  const spawnAnchor="if(this.npcRuntime?.version>0&&Array.isArray(rows))return rows.filter(r=>r.enabled!==false&&Number(r.count)>0&&this.npcDefinition(r.type)?.enabled!==false)";
  const spawnUpdated="if(this.npcRuntime?.version>0&&Array.isArray(rows)&&(rows.length>0||!/^u[1-3]$/.test(key)))return rows.filter(r=>r.enabled!==false&&Number(r.count)>0&&this.npcDefinition(r.type)?.enabled!==false)";
  s=replaceOne(s,spawnAnchor,spawnUpdated,'U-X missing online-spawn fallback');
  const joinAnchor='r.addClient(ws,p);';
  const joinUpdated="// U-X maps: reconcile NPC population once before the initial authoritative snapshot.\n        if(/^u[1-3]$/.test(mapId)&&r.npcs.size===0&&world.npcSpawnGroups(mapId).some(g=>g.count>0))r.applyNpcRuntimeConfig();\n        r.addClient(ws,p);";
  s=replaceOne(s,joinAnchor,joinUpdated,'U-X initial NPC sync');
  return s;
});
// Update the actual graphics-settings caption; no quality slider, FX or asset changes.
edit('public/index.html',s=>s.replace('30 FPS • entidades em qualidade máxima • cenário e iluminação econômicos','FPS livre (até 120) • entidades em qualidade máxima • cenário e iluminação econômicos'));
// Cache bust all served JS, CSS, HTML and manifest. Maintain existing release pipeline.
for(const file of walk('public').filter(f=>['.js','.mjs','.html','.css','.webmanifest'].includes(extname(f)))){
  edit(file,s=>s.replaceAll('?v='+OLD,'?v='+NEW));
}
edit('server/index.js',s=>replaceOne(s,`const RELEASE_VERSION = '${OLD}'`,`const RELEASE_VERSION = '${NEW}'`,'server release'));
for(const file of walk('tests').filter(f=>f.endsWith('.test.mjs')&&!f.endsWith('performance-rescue-v4773.test.mjs'))){
  edit(file,s=>s.replaceAll(OLD,NEW).replaceAll(OLD.replaceAll('.','\\.'),NEW.replaceAll('.','\\.')).replaceAll('v4772-apply-patch','v4773-apply-patch'));
}
for(const [path,needle] of [
 ['public/game.js','PERF_RESCUE_FRONTIER_ADMIN_V4773'],
 ['public/game.js','await verifiedFrontierTravelAccessV4773(label)'],
 ['server/world.js','U-X maps: reconcile NPC population'],
 ['server/warbot-engine-v477.js','const NPC_CADENCE_MS=150'],
 ['public/modules/quality-profiles.js',"low:{label:'BAIXA',dpr:1.0,fps:120"]
])if(!read(path).includes(needle))throw Error('Missing V47.7.3 integration: '+path);
if(!read('public/index.html').includes('/game.js?v='+NEW))throw Error('HTML game cache version mismatch');
console.log(`✅ V47.7.3 PERFORMANCE RESCUE installed • ${changed} files updated • no SQL/economy edits.`);
