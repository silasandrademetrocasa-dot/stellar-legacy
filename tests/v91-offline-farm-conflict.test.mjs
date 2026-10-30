import {isOfflineFarmNpcAllowedV91} from '../server/offline-farm-v484.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const farm=read('public/modules/stellar-offline-farm-v484.js');
const game=read('public/game.js');
const server=read('server/offline-farm-v484.js');

test('V91: Apex and other elite NPCs cannot be targeted by Offline Farm',()=>{
 assert.match(server,/boss\|apex\|overlord\|rift\|elite/);
 assert.equal(isOfflineFarmNpcAllowedV91({npc_key:'apexOverlord',name:'Apex Overlord'}),false);
 assert.equal(isOfflineFarmNpcAllowedV91({npc_key:'bossSibelon',name:'Sibelon'}),false);
 assert.equal(isOfflineFarmNpcAllowedV91({npc_key:'streuner',name:'Scavenger'}),true);
 assert.match(server,/if\(!npc\)throw Error\('FARM_NO_ELIGIBLE_NPCS'\)/);
 assert.match(server,/FARM_NO_VIABLE_COMBAT/);
 assert.match(server,/farmNpcOptionsV49\(sb,String\(save\.state\.mapId\|\|''\)\)/);
});
test('V91: Offline Farm saves to server, disconnects world, then starts SQL session',()=>{
 assert.match(farm,/await saveBeforeStart\?\.\(\);\s*await onPauseWorld\?\.\(\);\s*active\(true,false\)/);
 assert.match(farm,/await new Promise\(resolve=>setTimeout\(resolve,350\)\)/);
 assert.match(farm,/if\(confirmed\?\.status==='running'\)\{render\(confirmed\)/);
 assert.match(farm,/if\(!confirmed\)\{[^}]*Mundo bloqueado por segurança/);
 assert.match(farm,/active\(false\);await onResumeWorld\?\.\(\);throw err/);
 assert.match(game,/await waitCloudIdle\(12000\)/);
 assert.match(game,/if\(cloudBusy\|\|cloudDirty\|\|AMMO_SELECTION_V1061\.pending\|\|equipmentSavePendingV109\)throw Error\('O save não foi confirmado pelo servidor/);
});
test('V91: no reconnection, autosave or online presence while farm locked',()=>{
 assert.match(game,/function joinSharedUniverse\(\)\{\s*if\(offlineFarmWorldLockedV84\(\)\|\|!sharedUniverseMap\(\)\)return/);
 assert.match(game,/async function syncOnlineWorld\(\)\{\s*if\(offlineFarmWorldLockedV84\(\)/);
 assert.match(game,/function syncSharedUniversePlayer\(force=false\)\{\s*if\(offlineFarmWorldLockedV84\(\)/);
 assert.match(game,/function saveGame\(\)\{\s*if\(!progress\|\|offlineFarmWorldLockedV84\(\)\)return/);
 assert.match(game,/setInterval\(\(\)=>\{if\(progress&&!offlineFarmWorldLockedV84\(\)\)/);
 assert.match(game,/else if\(document\.visibilityState==='visible'&&authenticated\)\{sharedUniverse\.recover/);
 const vis=game.match(/document\.addEventListener\('visibilitychange',\(\)=>\{if\(offlineFarmWorldLockedV84\(\)\)return;/);
 assert.ok(vis);
});
test('V91: read-only diagnosis separates save/profile from online NPC/ore events',()=>{
 assert.match(server,/\/api\/offline-farm\/v484\/v91\/diagnosis/);
 assert.match(server,/saveChanged:/);
 assert.match(server,/profileChanged:/);
 assert.match(server,/npcRewardDuringFarm:/);
 assert.match(server,/oreRewardDuringFarm:/);
 assert.match(server,/historicalNote:/);
 assert.match(farm,/DIAGNOSTICAR FALHA/);
 assert.match(farm,/request\('v91\/diagnosis'\)/);
});
