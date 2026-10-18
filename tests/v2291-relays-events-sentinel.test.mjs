import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sentinelAttackerEligible, selectSentinelAttacker, SENTINEL_RETALIATION_SECONDS} from '../public/modules/sentinel-defense.js';
const read=p=>readFileSync(new URL('../'+p, import.meta.url),'utf8');
const game=read('public/game.js');
const world=read('server/world.js');

test('Sentinela não seleciona NPC neutro nem NPC que o piloto está atacando',()=>{
 const npcs=[{id:'neutral',hp:100,x:50,y:0},{id:'chosen',hp:200,x:80,y:0}];
 assert.equal(selectSentinelAttacker(npcs,{x:0,y:0},1000,100),null);
 assert.doesNotMatch(game,/task=petPlayerCombatTarget\(\)\|\|petStableEnemyTarget\('guard'\)/);
 assert.match(game,/task=petSentinelDefensiveTarget\(\)/);
});
test('Sentinela só revida contra NPC que causou dano recente',()=>{
 const npcs=[{id:'attacker',hp:100,x:100,y:100,lastAttackPlayerAt:95},
 {id:'bystander',hp:100,x:20,y:20,lastAttackPlayerAt:0},
 {id:'old',hp:100,x:40,y:40,lastAttackPlayerAt:81}];
 assert.equal(selectSentinelAttacker(npcs,{x:0,y:0},500,100)?.id,'attacker');
 assert.equal(sentinelAttackerEligible(npcs[2],100),false);
 assert.equal(sentinelAttackerEligible(npcs[0],95+SENTINEL_RETALIATION_SECONDS+.01),false);
});
test('Sentinela não agride player PvP, alvo distante ou NPC morto',()=>{
 const npcs=[{id:'other-player',isPlayer:true,hp:100,x:10,y:10,lastAttackPlayerAt:99},
 {id:'far',hp:100,x:1800,y:0,lastAttackPlayerAt:99},
 {id:'dead',hp:0,x:50,y:0,lastAttackPlayerAt:99}];
 assert.equal(selectSentinelAttacker(npcs,{x:0,y:0},600,100),null);
});
test('Sentinela mantém somente o agressor válido e retoma patrulha quando ameaça acaba',()=>{
 const npcs=[{id:'a',hp:100,x:100,y:100,lastAttackPlayerAt:94},{id:'b',hp:100,x:75,y:75,lastAttackPlayerAt:99}];
 assert.equal(selectSentinelAttacker(npcs,{x:0,y:0},400,100,'a')?.id,'a');
 assert.equal(selectSentinelAttacker(npcs,{x:0,y:0},400,100,'gone')?.id,'b');
 assert.equal(selectSentinelAttacker(npcs,{x:0,y:0},400,120,'a'),null);
 assert.match(game,/else \{petRuntime\.laserTargetId=null;petRuntime\.laserUntil=0;/);
});
test('Somente golpes efetivos dos NPCs criam permissão de revidar',()=>{
 assert.match(game,/const hit=takePlayerDamage\(Math\.max\(0,Number\(msg\.damage\)\|\|0\)/);
 assert.match(game,/if\(e&&hit>0\)e\.lastAttackPlayerAt=nowSec\(\)/);
 assert.match(game,/const hit=takePlayerDamage\(e\.damage\*rand/);
 assert.match(game,/if\(hit>0\)e\.lastAttackPlayerAt=now/);
 assert.match(game,/if\(!sentinelAttackerEligible\(task,nowSec\(\)\)\)return/);
});
test('Relés: entrar no PvP é imediato e captura requer sincronização oficial',()=>{
 assert.doesNotMatch(world,/await r\.ready/);
 assert.match(world,/this\.warfrontSynced=!this\.warfrontControl/);
 assert.match(world,/if\(!this\.warfrontControl\|\|!this\.warfrontSynced\)return/);
 assert.match(world,/withCaptureTimeout\(this\.world\.loadWarfront\(this\.mapId\),6500\)/);
 assert.match(world,/this\.warfrontSynced=true/);
});
test('Relés: erro inicial é recuperável automaticamente, sem mudança de mapa',()=>{
 assert.match(world,/r\.reconcileWarfrontState\(\)\.catch/);
 assert.match(world,/warfrontSyncError/);
 assert.match(game,/refreshSectorReadOnly\(true\)/);
});
test('Eventos: atualização é enviada após login e refletida no HUD imediatamente',()=>{
 assert.match(world,/Promise\.allSettled\(\[world\.refreshLiveOps/);
 assert.match(world,/type:'event_update',event:r\.eventPayload\(\)/);
 assert.match(world,/r\.broadcastEvent\(true\)/);
 assert.match(game,/renderGalaxyEventHud\(active,galaxyEventRecord\(active\)\)/);
});
