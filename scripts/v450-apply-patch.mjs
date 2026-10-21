#!/usr/bin/env node
// V45.0 Galactic Ascension. Single idempotent patch applied to the existing V44 base.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PREV='44.0.0',NEXT='45.0.0';
function edit(path,fn){const f=resolve(ROOT,path),a=readFileSync(f,'utf8'),b=fn(a);if(a!==b)writeFileSync(f,b);}
function must(s,needle,p){if(!s.includes(needle))throw Error('V45 anchor missing: '+p+' '+needle.slice(0,150));}
function upgrade(s){return s.replaceAll('?v='+PREV,'?v='+NEXT);}
edit('server/index.js',s=>{
 if(!s.includes("from './frontier-audit-v450.js'"))s="import {attachFrontierAuditV450} from './frontier-audit-v450.js';\n"+s;
 if(!s.includes("const RELEASE_VERSION = '45.0.0'")){
  must(s,"const RELEASE_VERSION = '44.0.0'",'server/index.js');s=s.replace("const RELEASE_VERSION = '44.0.0'","const RELEASE_VERSION = '45.0.0'");
 }
 if(!s.includes('attachFrontierAuditV450(app,{requireUser,asyncRoute});')){
  const anchor='attachFrontierAdminV440(app,{requireUser,asyncRoute});';must(s,anchor,'server/index.js');
  s=s.replace(anchor,anchor+'\nattachFrontierAuditV450(app,{requireUser,asyncRoute});');
 }
 return s;
});
edit('server/world.js',s=>{
 if(!s.includes("from './frontier-stability-v450.js'"))s="import {sectorEntryAllowedV450,frontierEliteRespawnV450} from './frontier-stability-v450.js';\n"+s;
 // Neutral sector has no territory_faction, but its *room* must stay scoped to the authenticated faction.
 if(!s.includes('sectorEntryAllowedV450(mapId,territorial,sector,territory)')){
  const anchor="const sectorValid=!territorial||!sector||String(sector.territory_faction||'')===territory;";
  must(s,anchor,'server/world.js');s=s.replace(anchor,'const sectorValid=sectorEntryAllowedV450(mapId,territorial,sector,territory);');
 }
 // Persist the U-3 unique boss after normal NPC respawn and runtime NPC-density refresh.
 if(!s.includes('frontierEliteRespawnV450(this.mapId,group.type,this.npcs.values())')){
  const anchor='for(let i=current;i<target;i++){const e=this.makeNpc(group.type);';must(s,anchor,'server/world.js');
  s=s.replace(anchor,'for(let i=current;i<target;i++){const e=this.makeNpc(group.type,frontierEliteRespawnV450(this.mapId,group.type,this.npcs.values())||{});');
 }
 if(!s.includes('frontierEliteRespawnV450(this.mapId,r.type,this.npcs.values())')){
  const anchor="(r.rarePatrol?{rarePatrol:true,name:'PATRULHA RARA • '+baseName,color:'#ffd069',scale:1.15}:{})";
  must(s,anchor,'server/world.js');
  s=s.replace(anchor,"(frontierEliteRespawnV450(this.mapId,r.type,this.npcs.values())||(r.rarePatrol?{rarePatrol:true,name:'PATRULHA RARA • '+baseName,color:'#ffd069',scale:1.15}:{}))");
 }
 return s;
});
edit('public/api.js',s=>{
 s=upgrade(s);
 if(!s.includes('export async function loadFrontierAuditV450(')){
  must(s,'async function authedServerFetch(','public/api.js');
  s+="\nexport async function loadFrontierAuditV450(){return authedServerFetch('/api/admin/frontier/diagnostics');}\n";
 }
 return s;
});
edit('public/modules/unified-expansion-v42.js',s=>{
 s=upgrade(s);
 if(!s.includes("from './frontier-audit-v450.js'"))s="import {renderFrontierAuditV450} from './frontier-audit-v450.js';\n"+s;
 const anchor="if(tab==='admin' && snapshot?.isAdmin)void v421AdminRender(root);";
 if(!s.includes('renderFrontierAuditV450(root,tab,snapshot.isAdmin)')){
  must(s,anchor,'public/modules/unified-expansion-v42.js');
  s=s.replace(anchor,"if(tab==='admin' && snapshot?.isAdmin)void renderFrontierAuditV450(root,tab,snapshot.isAdmin);\n"+anchor);
 }
 return s;
});
for(const p of ['public/game.js','public/index.html',
 'public/modules/astral-operations-v435.js','public/modules/astral-combat-admin-v431.js',
 'public/modules/stage-a-v423.js','public/modules/stage-b-v426.js',
 'public/modules/astral-rewards-v381.js','public/modules/astral-combat-v431.js',
 'public/modules/astral-systems-v435.js','public/modules/frontier-sectors-v435.js',
 'public/modules/frontier-routing-v440.js'])edit(p,upgrade);
// Legacy tests must assert V45 behavior without disabling or weakening their existing security tests.
edit('tests/v435-integration.test.mjs',s=>{
 s=s.replace("assert.equal(p.version,'44.0.0');assert.match(p.scripts.check,/v440-apply-patch/);",
             "assert.equal(p.version,'45.0.0');assert.match(p.scripts.check,/v450-apply-patch/);");
 must(s,"assert.equal(p.version,'45.0.0');",'tests/v435-integration.test.mjs');return s;
});
edit('tests/v440-galactic-supremacy.test.mjs',s=>{
 s=s.replace("assert.equal(p.version,'44.0.0');assert.match(p.scripts.check,/v440-apply-patch/);",
             "assert.equal(p.version,'45.0.0');assert.match(p.scripts.check,/v450-apply-patch/);");
 s=s.replace("assert.match(read('tests/v435-integration.test.mjs'),/v440-apply-patch/);", "assert.match(read('tests/v435-integration.test.mjs'),/v450-apply-patch/);");
 must(s,"assert.equal(p.version,'45.0.0');",'tests/v440-galactic-supremacy.test.mjs');
 must(s,"assert.match(read('tests/v435-integration.test.mjs'),/v450-apply-patch/);",'tests/v440-galactic-supremacy.test.mjs');return s;
});
console.log('V45: neutral sector joins, elite respawns, authenticated admin diagnostics integrated.');
