import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pvpShotEligibilityV114} from '../public/modules/pvp-target-integrity-v114.js';
import {relayCaptureActorEligibleV1141,relayTurretTargetEligibleV1141,relayContestedClansV1141} from '../server/relay-control-integrity-v1141.js';
import {staleEventEntityIdsV1142,eventRuntimeAdmittedV1142} from '../server/event-lifecycle-integrity-v1142.js';
import {arenaVisibleCombatLogV1143,arenaBattleTimeoutMessageV1143,ARENA_MAX_VISIBLE_EVENTS_V1143} from '../public/modules/arena-visual-scheduler-v1143.js';
import {shouldDeferPlayerMotionV115,mayFlushMovementV115,resyncPlayerIdsV115,MOTION_BACKPRESSURE_BYTES_V115} from '../server/network-backpressure-v115.js';
import {competitiveQualitySummaryV115} from '../server/competitive-release-monitor-v115.js';
const src=f=>readFileSync(resolve(import.meta.dirname,'..',f),'utf8');
const now=Date.now();
const target=(extra={})=>({id:'pilot2',isPlayer:true,hp:110000,x:200,y:100,lastPresenceSeenAt:now-500,...extra});
const shot=(extra={})=>pvpShotEligibilityV114({mapId:'b41',attackerId:'pilot1',attackerX:100,attackerY:100,target:target(),now,...extra});
test('V114.0 PvP permite disparos no mapa 4-X contra alvo vivo e próximo',()=>assert.equal(shot().allowed,true));
test('V114.0 PvP bloqueia PvE, self hit, grupo aliado e alvo destruído',()=>{
 assert.equal(shot({mapId:'x1'}).reason,'sector');
 assert.equal(shot({attackerId:'pilot2'}).reason,'identity');
 assert.equal(shot({groupMember:true}).reason,'group');
 assert.equal(shot({target:target({hp:0})}).reason,'dead');
});
test('V114.0 PvP bloqueia alvo remoto sem posição e stale sem tirar o lock',()=>{
 assert.equal(shot({target:target({x:10000})}).reason,'range');
 assert.equal(shot({target:target({x:NaN})}).reason,'position');
 assert.equal(shot({target:target({lastPresenceSeenAt:now-20000})}).reason,'stale');
 assert.equal(shot({checkRange:false,target:target({x:10000})}).allowed,true);
});
test('V114.0 não altera as RPCs e conecta guarda ao laser e míssil',()=>{
 const game=src('public/game.js');assert.match(game,/pvpShotEligibilityV114\(/);
 assert.match(game,/queuePvpAttackOnline\(/);
 assert.match(game,/consumePvpDamageEventsOnline\(/);
});
const node={relayMode:true,owner:'earth',ownerClanId:'clan-1',x:100,y:100,radius:360};
const actor=(extra={})=>({userId:'id',clanId:'clan-2',hp:200,x:150,y:150,updatedAt:now-500,...extra});
test('V114.1 captura exige jogador vivo e no perímetro',()=>{
 assert.equal(relayCaptureActorEligibleV1141({actor:actor(),node,now}),true);
 assert.equal(relayCaptureActorEligibleV1141({actor:actor({hp:0}),node,now}),false);
 assert.equal(relayCaptureActorEligibleV1141({actor:actor({x:9999}),node,now}),false);
 assert.equal(relayCaptureActorEligibleV1141({actor:actor({updatedAt:now-30000}),node,now}),false);
 assert.equal(relayCaptureActorEligibleV1141({actor:actor({clanId:null}),node,now}),false);
});
test('V114.1 captura normal não exige clã',()=>{
 assert.equal(relayCaptureActorEligibleV1141({actor:actor({clanId:null}),node:{...node,relayMode:false},now}),true);
});
test('V114.1 relé próprio não ataca aliados; inimigos sim',()=>{
 assert.equal(relayTurretTargetEligibleV1141({node,player:actor({clanId:'clan-1'})}),false);
 assert.equal(relayTurretTargetEligibleV1141({node,player:actor()}),true);
 assert.equal(relayTurretTargetEligibleV1141({node,player:actor(),portalNeutral:true}),false);
 assert.equal(relayTurretTargetEligibleV1141({node,player:actor(),fresh:false}),false);
 assert.equal(relayTurretTargetEligibleV1141({node:{...node,ownerClanId:null},player:actor({faction:'earth'})}),false);
});
test('V114.1 clãs rivais de mesma facção contestam; sem dois clãs não',()=>{
 const candidates=[actor({clanId:'c1'}),actor({clanId:'c2'})];
 assert.equal(relayContestedClansV1141(candidates,node,()=>true),true);
 assert.equal(relayContestedClansV1141(candidates,node,p=>p.clanId==='c1'),false);
 assert.equal(relayContestedClansV1141(candidates,{...node,relayMode:false},()=>true),false);
});
test('V114.1 módulos de relé continuam calculados a partir do save, sem dano do client',()=>{
 const world=src('server/world.js');assert.match(world,/relayShipLoadoutDamage\(/);assert.match(world,/relayCaptureActorEligibleV1141/);
 assert.match(world,/relayTurretTargetEligibleV1141/);assert.match(world,/withCaptureTimeout/);
});
test('V114.2 identifica NPCs de janela encerrada e preserva NPC comum',()=>{
 const entities=new Map([['live',{eventNpc:true,eventId:'e2'}],['old',{eventNpc:true,eventId:'e1'}],['natural',{eventNpc:false}]]);
 assert.deepEqual(staleEventEntityIdsV1142(entities,'e2','eventNpc'),['old']);
 assert.deepEqual(staleEventEntityIdsV1142(entities,null,'eventNpc'),['live','old']);
});
test('V114.2 coleta de minério antiga não apaga NPC de evento atual',()=>{
 const world=src('server/world.js'),client=src('public/game.js');
 assert.match(world,/type:'event_cleanup',reason:'stale_sweep'/);
 assert.match(client,/else if\(\['event_end','event_rotate'\]/);
 assert.deepEqual(staleEventEntityIdsV1142(new Map([['o',{eventOre:true,eventId:'old'}]]),'new','eventOre'),['o']);
});
test('V114.2 não anuncia eventos em sala inelegível',()=>{
 assert.equal(eventRuntimeAdmittedV1142({id:'boss'},()=>false),false);
 assert.equal(eventRuntimeAdmittedV1142({id:'boss'},()=>true),true);
 assert.equal(eventRuntimeAdmittedV1142(null,()=>true),false);
});
test('V114.2 limpeza preserva as janelas de respawn e impede eventos fantasma',()=>{
 const world=src('server/world.js');assert.match(world,/this\.respawns=this\.respawns\.filter\(r=>r\.kind!=='eventNpc'\)/);
 assert.match(world,/if\(r\.kind==='eventNpc'&&this\.event\?\.eventId!==r\.eventId\)continue/);
});
test('V114.3 Arena mantém início/fim e limite da animação',()=>{
 const events=Array.from({length:400},(_,i)=>({round:i,actor:i%2?'defender':'attacker'}));
 const shown=arenaVisibleCombatLogV1143(events);assert.equal(shown.length,ARENA_MAX_VISIBLE_EVENTS_V1143);
 assert.equal(shown[0],events[0]);assert.equal(shown.at(-1),events.at(-1));
 assert.match(arenaBattleTimeoutMessageV1143(events),/Exibindo/);
});
test('V114.3 Arena não muda logs curtos ou resultado do servidor',()=>{
 const events=[{round:1},{round:2}];assert.equal(arenaVisibleCombatLogV1143(events),events);
 assert.equal(arenaBattleTimeoutMessageV1143(events),null);
 const game=src('public/game.js');assert.match(game,/arenaVisibleCombatLogV1143\(fullLog\)/);
 assert.match(game,/arenaBattleSnapshot\(result\)/);assert.match(game,/arenaAttackOnline\(targetUserId\)/);
});
test('V115 rede congesta adia apenas movimento, não mensagens de pagamento e combate',()=>{
 const patch={type:'world_player_patch',entity:{userId:'pilot2'}};
 assert.equal(shouldDeferPlayerMotionV115(patch,MOTION_BACKPRESSURE_BYTES_V115+1),true);
 for(const type of ['npc_reward_error','npc_death','relay_turret_attack','warfront_control','event_cleanup','world_snapshot','damage_result','npc_attack']){
  assert.equal(shouldDeferPlayerMotionV115({type,entity:{userId:'pilot2'}},1e9),false,type);
 }
 assert.equal(shouldDeferPlayerMotionV115(patch,100),false);
});
test('V115 rede aguarda baixar fila antes de resincronizar',()=>{
 assert.equal(mayFlushMovementV115(120*1024),true);
 assert.equal(mayFlushMovementV115(240*1024),false);
});
test('V115 resincronização elimina pilotos desconectados e não manda posição do próprio player',()=>{
 const pending=new Set(['me','left','p1','p2','p3']);const players=new Map([['me',{}],['p1',{}],['p2',{}],['p3',{}]]);
 assert.deepEqual(resyncPlayerIdsV115(pending,players,'me',2),['p1','p2']);
 assert.equal(pending.has('me'),false);assert.equal(pending.has('left'),false);
});
test('V115 broadcast não altera entrega de combate, economia nem NPC deltas',()=>{
 const world=src('server/world.js');assert.match(world,/shouldDeferPlayerMotionV115\(payload,c\.bufferedAmount\)/);
 assert.match(world,/resyncPlayerIdsV115\(/);assert.match(world,/npcStateDelta\(/);assert.match(world,/createNpcDeathSequenceV1069/);
 assert.match(world,/shouldRefreshWorldRuntimeV108/);
});
test('V115 painel ADM mede bytes sem UUID, inventários ou dados de usuário',()=>{
 const summary=competitiveQualitySummaryV115({rooms:3,clients:4,npcs:200,networkV104:{playerMotionDeferredV115:5},networkV1051:{windowMs:60000,window:{outbound:{bytes:61440}}}},now);
 assert.equal(summary.network.outboundKBps,1);assert.equal(summary.network.playerMotionDeferred,5);
 assert.equal(summary.readOnly,true);assert.equal('players' in summary,false);
 const server=src('server/index.js');assert.match(server,/\/api\/admin\/v115\/quality/);
 assert.match(server,/is_game_admin_v1763/);
});
test('V115 pacote conserva itinerário do Autopilot e forja V113.1',()=>{
 const game=src('public/game.js');assert.match(game,/stellar-autopilot-v116\.js/); // V116 usa ponte nova para invalidar cache mobile
 const server=src('server/index.js');assert.match(server,/aux_protocol_craft/);
 assert.match(server,/stellar_grant_npc_reward_v1131/);
 assert.match(server,/installOfflineFarmV484/);
});
