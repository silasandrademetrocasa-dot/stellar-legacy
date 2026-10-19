import test from 'node:test';
import assert from 'node:assert/strict';
import { idleNpcStep, shouldLeashNpc, NpcAggroWindow } from '../server/npc-intelligence-v34.js';

test('idle common NPC returns progressively without teleporting',()=>{
 const npc={type:'saimon',hp:100,x:1700,y:200,speed:300,angle:0,patrolHomeX:500,patrolHomeY:200};
 const moved=idleNpcStep(npc,{dt:.1,leash:680});
 assert.ok(moved.returning);assert.ok(moved.x<1700&&moved.x>1600);assert.equal(moved.y,200);
});
test('patrol respects map boundaries and hysteresis',()=>{
 const npc={type:'streuner',hp:1,x:25,y:25,speed:220,angle:Math.PI,patrolHomeX:25,patrolHomeY:25};
 const p=idleNpcStep(npc,{dt:.1,worldW:600,worldH:600});assert.equal(p.x,25);
 assert.equal(idleNpcStep({...npc,x:900,patrolReturning:true},{dt:.1,leash:680}).returning,true);
 assert.equal(idleNpcStep({...npc,x:160,patrolReturning:true},{dt:.1,leash:680}).returning,false);
 assert.equal(NpcAggroWindow({aggroRange:800}),800);
});
test('bosses, events, forced chase and aggro enemies remain unaffected',()=>{
 const base={type:'saimon',hp:100};
 for(const change of [{type:'bossSibelon'},{eventNpc:true},{forceChase:true},{worldBoss:true},{aggroUserId:'pilot'},{gateEnemy:true}]){
  assert.equal(shouldLeashNpc({...base,...change}),false);
 }
 assert.equal(shouldLeashNpc(base),true);
});
