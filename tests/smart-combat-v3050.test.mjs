import test from 'node:test';
import assert from 'node:assert/strict';
import {npcUpdateDecision,nearestNpcInRange} from '../public/modules/smart-combat-engine.js';
const e={hp:100,type:'streuner',x:8000,y:8000,aggroRange:650,attackRange:400};
test('near and engaged NPC tick every frame',()=>{
 assert.equal(npcUpdateDecision({...e,x:500,y:200},{playerX:0,playerY:0,frame:1,slot:0}),'normal');
 for(const field of ['eventNpc','gateEnemy','worldBoss','forceChase','playerProvoked'])assert.equal(npcUpdateDecision({...e,[field]:true},{frame:1,slot:0}),'normal');
 assert.equal(npcUpdateDecision({...e,type:'bossSibelon'},{frame:1,slot:0}),'normal');
});
test('far NPCs use sparse coarse ticks',()=>{
 assert.equal(npcUpdateDecision(e,{frame:1,slot:0}),'skip');
 assert.equal(npcUpdateDecision(e,{frame:8,slot:0}),'coarse');
});
test('nearest picks alive in radius',()=>{
 assert.equal(nearestNpcInRange([{hp:0,x:1,y:1},{id:'a',hp:2,x:300,y:0},{id:'b',hp:1,x:10,y:0}],0,0,100)?.id,'b');
});
