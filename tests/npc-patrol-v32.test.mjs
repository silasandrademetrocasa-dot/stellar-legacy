import test from 'node:test';
import assert from 'node:assert/strict';
import {npcPatrolEligible,npcPatrolPosition} from '../public/modules/npc-patrol.js';
test('bosses, events and provoked enemies are not constrained',()=>{
 for(const extra of [{type:'bossDrone'},{eventNpc:true},{playerProvoked:true},{sharedWorld:true},{forceChase:true}]){
  const e={hp:100,x:0,y:0,...extra};
  assert.equal(npcPatrolEligible(e),false);
  assert.equal(npcPatrolPosition(e,1600,0,{leash:400,dt:1,speed:100}).x,1600);
 }
});
test('patrol remembers origin and gradually returns without teleporting',()=>{
 const e={hp:100,x:100,y:100,type:'scout'};
 assert.deepEqual(npcPatrolPosition(e,110,100,{leash:400,dt:1,speed:100}),{x:110,y:100,returning:false});
 assert.equal(e.patrolHomeX,100);
 const far=npcPatrolPosition(e,1000,100,{leash:400,dt:1,speed:100});
 assert.equal(far.x,960);
 assert.equal(far.returning,true);
});
