import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentRoomActorV1173,replacedRoomSocketsV1173,eligibleGroupRecipientsV1173} from '../server/multiplayer-session-integrity-v1173.js';
import {relayCaptureActorEligibleV1141,relayTurretTargetEligibleV1141,relayContestedClansV1141} from '../server/relay-control-integrity-v1141.js';
import {pvpShotEligibilityV114} from '../public/modules/pvp-target-integrity-v114.js';
import {grantNpcRewardSafelyV1069,createNpcDeathSequenceV1069} from '../server/npc-reward-delivery-v1069.js';
const src=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const at=100000;
const pilot=(id,extra={})=>({readyState:1,player:{userId:id,hp:5000,updatedAt:at-100,...extra}});
const candidates=(a,b)=>[a,b];
const eligibility=(rows,current=new Map(rows.map(x=>[x.player.userId,x.player])))=>eligibleGroupRecipientsV1173(rows,{
 now:at,openState:1,lastActivity:()=>at-200,isFresh:p=>at-p.updatedAt<=8000,
 isCurrent:c=>current.get(c.player.userId)===c.player
});
test('V117.3: duas contas no mesmo grupo recebem exatamente uma vaga cada',()=>{
 const a=pilot('devil'),b=pilot('felp22');const rows=eligibility(candidates(a,b));
 assert.deepEqual(rows,[a,b]);assert.equal(1/rows.length,.5);
});
test('V117.3: reconexão da MESMA conta não gera três partes em recompensa',()=>{
 const a=pilot('devil'),old=pilot('felp22',{updatedAt:at-50}),fresh=pilot('felp22');
 const selected=eligibility([a,old,fresh],new Map([['devil',a.player],['felp22',fresh.player]]));
 assert.deepEqual(selected,[a,fresh]);assert.equal(1/selected.length,.5);
});
test('V117.3: jogadores desconectados, fora da sala e destruídos não ganham parcela',()=>{
 const live=pilot('devil'),closed=pilot('closed'),dead=pilot('dead',{hp:0}),stale=pilot('stale',{updatedAt:at-20000});closed.readyState=3;
 const list=[live,closed,dead,stale];const current=new Map(list.map(c=>[c.player.userId,c.player]));
 const selected=eligibility(list,current);
 assert.deepEqual(selected,[live]);
 const wrongRoom=eligibleGroupRecipientsV1173([live],{now:at,lastActivity:()=>at,isFresh:()=>true,isCurrent:()=>false});
 assert.deepEqual(wrongRoom,[]);
});
test('V117.3: remove sessão antiga de piloto sem derrubar conta de outro piloto',()=>{
 const old=pilot('devil'),other=pilot('felp22'),newer=pilot('devil');
 assert.deepEqual(replacedRoomSocketsV1173(new Set([old,other,newer]),'devil',newer),[old]);
});
test('V117.3: close antigo não remove sessão nova do mapa',()=>{
 const old=pilot('devil'),newer=pilot('devil');const map=new Map([['devil',newer.player]]);
 assert.equal(currentRoomActorV1173(old,map),false);
 assert.equal(currentRoomActorV1173(newer,map),true);
});
test('V117.3: uma mesma killKey pode pagar dois usuários sem duplicar o mesmo usuário',async()=>{
 const ledger=new Map(),q=createNpcDeathSequenceV1069();const key='x3-earth:npc_101';
 const grant=async(uid)=>grantNpcRewardSafelyV1069({
   grant:async()=>{
     const id=uid+':'+key;
     if(ledger.has(id))return {granted:false,revision:1};
     ledger.set(id,{credits:500,stl:6});return {granted:true,credits:500,stl:6,revision:1};
   },readReceipt:async()=>({credits:500,stl:6}),sleep:async()=>{}
 });
 const results=await Promise.all([q.run('devil',()=>grant('devil')),q.run('devil',()=>grant('felp22'))]);
 assert.equal(results.filter(r=>r.granted).length,2);
 assert.equal((await grant('devil')).granted,false);assert.equal(ledger.size,2);
});
test('V117.3: PvP bloqueia aliados do mesmo grupo e mapas PvE',()=>{
 const tgt={id:'opponent',isPlayer:true,hp:5000,x:100,y:100,lastPresenceSeenAt:at-50};
 const args={now:at,attackerId:'devil',mapId:'b41',attackerX:100,attackerY:100,target:tgt};
 assert.equal(pvpShotEligibilityV114({...args,groupMember:true}).reason,'group');
 assert.equal(pvpShotEligibilityV114({...args,groupMember:false}).allowed,true);
 assert.equal(pvpShotEligibilityV114({...args,mapId:'x3'}).allowed,false);
});
test('V117.3: relé rival da mesma facção pode disputar; aliado não recebe disparo de torre',()=>{
 const node={relayMode:true,ownerClanId:'alpha',owner:'earth',x:100,y:100,radius:350};
 const owner={userId:'a',faction:'earth',clanId:'alpha',hp:100,x:150,y:140,updatedAt:at-10};
 const rival={...owner,userId:'b',clanId:'beta'};
 assert.equal(relayContestedClansV1141([owner,rival],node,()=>true),true);
 assert.equal(relayCaptureActorEligibleV1141({actor:rival,node,now:at}),true);
 assert.equal(relayTurretTargetEligibleV1141({node,player:owner}),false);
 assert.equal(relayTurretTargetEligibleV1141({node,player:rival}),true);
});
test('V117.3: servidor protege entradas, recompensas, PvP e relés sem mudar SQL',()=>{
 const world=src('server/world.js'),server=src('server/index.js'),client=src('public/game.js');
 assert.match(world,/eligibleGroupRecipientsV1173\(/);
 assert.match(world,/replacedRoomSocketsV1173\(/);
 assert.match(world,/currentRoomActorV1173\(/);
 assert.match(world,/grantNpcReward\(recipientUserId,killKey/);
 assert.match(world,/relayCaptureActorEligibleV1141/);
 assert.match(world,/relayTurretTargetEligibleV1141/);
 assert.match(client,/pvpShotEligibilityV114\(/);
 assert.match(server,/stellar_(?:grant_npc_reward_v1131|player_grant_npc_reward)/);
});
