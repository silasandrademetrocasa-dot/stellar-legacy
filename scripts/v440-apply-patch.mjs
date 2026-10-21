#!/usr/bin/env node
// V44.0: deterministic additive patch. Strict anchors; re-running must be harmless.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PREVIOUS='43.5.0',NEXT='44.0.0';
function edit(path,callback){
 const p=resolve(ROOT,path),before=readFileSync(p,'utf8'),after=callback(before);
 if(before!==after)writeFileSync(p,after);
}
function must(s,fragment,path){if(!s.includes(fragment))throw Error('V44 integration anchor missing '+path+': '+fragment.slice(0,150));}
function replaceOnce(s,original,replacement,path){
 if(s.includes(replacement))return s;
 must(s,original,path);return s.replace(original,replacement);
}
function withImport(s,from,imp){return s.includes(from)?s:imp+'\n'+s;}
edit('server/index.js',s=>{
 s=withImport(s,"from './frontier-admin-v440.js'","import {attachFrontierAdminV440} from './frontier-admin-v440.js';");
 s=replaceOnce(s,"const RELEASE_VERSION = '43.5.0';","const RELEASE_VERSION = '44.0.0';",'server/index.js');
 s=replaceOnce(s,'attachAstralIntegrationsV435(app,{requireUser,asyncRoute});',
   'attachAstralIntegrationsV435(app,{requireUser,asyncRoute});\nattachFrontierAdminV440(app,{requireUser,asyncRoute});','server/index.js');
 return s;
});
edit('server/world.js',s=>{
 s=withImport(s,"from '../public/modules/frontier-routing-v440.js'","import {mergeFrontierServerPortalsV440} from '../public/modules/frontier-routing-v440.js';");
 s=withImport(s,"from '../public/modules/frontier-boss-v440.js'","import {frontierBossSetupV440} from '../public/modules/frontier-boss-v440.js';");
 s=replaceOnce(s,'const e=this.makeNpc(group.type,opts);',
  'const e=this.makeNpc(group.type,frontierBossSetupV440(this.mapId,group.type,i)||opts);','server/world.js');
 s=replaceOnce(s,'return out.concat(frontierServerPortalsV435(mapId,territoryFaction,map));',
   'return mergeFrontierServerPortalsV440(mapId,territoryFaction,map,out,this.worldRuntime.portals);','server/world.js');
 return s;
});
edit('public/api.js',s=>{
 const addon="\nexport async function adminAstralTestKitV440(code,quantity=5){return authedServerFetch('/api/admin/frontier/test-kit',{method:'POST',body:JSON.stringify({code,quantity})});}\n";
 if(!s.includes('export async function adminAstralTestKitV440(')){
  must(s,'async function authedServerFetch(','public/api.js');s+=addon;
 }
 return s.replaceAll('?v='+PREVIOUS,'?v='+NEXT);
});
edit('public/game.js',s=>{
 s=withImport(s,"filteredFrontierPortalsV440} from","import {filteredFrontierPortalsV440} from './modules/frontier-routing-v440.js?v=44.0.0';");
 // Once the official runtime knows about U-1, ADM/SQL is the source of truth for topology.
 s=replaceOnce(s,'function ensureFrontierGraphV435(){',
  "function ensureFrontierGraphV435(){\n if(worldRuntimeConfig.sectorDestinations.has('U-1'))return;",'public/game.js');
 s=replaceOnce(s,'.concat(sectorPortalsV435(label,progress?.profile?.faction));',
  ".concat(filteredFrontierPortalsV440(label,progress?.profile?.faction,graphNeighbors(label),worldRuntimeConfig.sectorDestinations.has('U-1')));",'public/game.js');
 return s.replaceAll('?v='+PREVIOUS,'?v='+NEXT);
});
edit('public/modules/astral-operations-v435.js',s=>{
 if(!s.includes('adminAstralTestKitV440')){
  s=replaceOnce(s,'import {loadStageAV423,adminAstralModuleV435,adminRaidV435,loadRaidV435,claimRaidV435}',
   'import {loadStageAV423,adminAstralModuleV435,adminRaidV435,loadRaidV435,claimRaidV435,adminAstralTestKitV440}',
    'public/modules/astral-operations-v435.js');
  const original="const row=el('div');row.append(label,save);card.append(row);";
  const target=`const row=el('div');row.append(label,save);
          const kit=el('button','+5 PARA TESTES');kit.type='button';kit.title='Apenas no seu próprio inventário ADM • máximo 30 unidades';
          kit.onclick=async()=>{kit.disabled=true;try{const result=await adminAstralTestKitV440(code,5);
            if(!result?.ok)throw Error('Kit indisponível');kit.textContent='TOTAL '+Number(result.quantity||0);
            window.dispatchEvent(new Event('stellar-astral-loadout-updated'));
           }catch{kit.textContent='LIMITE OU INDISPONÍVEL';}finally{kit.disabled=false;}};
          row.append(kit);card.append(row);`;
  s=replaceOnce(s,original,target,'public/modules/astral-operations-v435.js');
 }
 return s.replaceAll('?v='+PREVIOUS,'?v='+NEXT);
});
for(const p of [
 'public/modules/stage-a-v423.js','public/modules/stage-b-v426.js',
 'public/modules/unified-expansion-v42.js','public/modules/astral-rewards-v381.js',
 'public/modules/astral-combat-admin-v431.js','public/modules/astral-combat-v431.js',
 'public/modules/astral-systems-v435.js','public/modules/frontier-sectors-v435.js',
 'public/index.html'
])edit(p,s=>s.replaceAll('?v='+PREVIOUS,'?v='+NEXT));
edit('tests/v431-combat-evolution.test.mjs',s=>{
 // Keep all V43 combat security assertions, only modernize the semantic-version contract.
 s=s.replace('assert.match(version,/^43',String.raw`assert.match(version,/^\d+`);
 return s;
});
edit('tests/v435-integration.test.mjs',s=>{
 s=replaceOnce(s,"assert.equal(p.version,'43.5.0');assert.match(p.scripts.check,/v435-apply-patch/);",
 "assert.equal(p.version,'44.0.0');assert.match(p.scripts.check,/v440-apply-patch/);",'tests/v435-integration.test.mjs');
 return s;
});
console.log('Stellar Legacy 44.0: topology, official NPC controls, private ADM testing synchronized.');
