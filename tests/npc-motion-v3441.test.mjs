import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeNpcMotionPatch} from '../public/modules/npc-motion-v3441.js';
import {smoothNpcPosition} from '../public/modules/galactic-combat-v344.js';
const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');

test('X-only server delta updates x while preserving the previous netY',()=>{
 const e={x:100,y:200,netX:100,netY:200,netAt:1000,vx:0,vy:0};
 assert.equal(mergeNpcMotionPatch(e,{id:'npc',x:140},1125),true);
 assert.equal(e.netX,140);assert.equal(e.netY,200);assert.equal(e.vy,0);
 assert.equal(e.tx,140);assert.equal(e.ty,200);
 const step=smoothNpcPosition(e,{now:1158,dt:1/30});
 assert.ok(step.x>100&&step.x<200);
 assert.equal(step.y,200);
});
test('Y-only server delta updates y while preserving netX',()=>{
 const e={x:100,y:200,netX:100,netY:200,netAt:1000};
 assert.equal(mergeNpcMotionPatch(e,{id:'npc',y:230},1125),true);
 assert.equal(e.netX,100);assert.equal(e.netY,230);
 assert.equal(e.vx,0);assert.ok(e.vy>0);
});
test('HP/angle-only server patch must not reset the movement clock or velocity',()=>{
 const e={x:100,y:200,netX:110,netY:210,netAt:2222,vx:15,vy:16};
 assert.equal(mergeNpcMotionPatch(e,{id:'npc',hp:10,angle:0.5},3333),false);
 assert.equal(e.netAt,2222);assert.equal(e.vx,15);assert.equal(e.vy,16);
});
test('huge authoritative reposition snaps, rather than flying visually across the map',()=>{
 const e={x:120,y:230,netX:120,netY:230,netAt:1000};
 assert.equal(mergeNpcMotionPatch(e,{x:1000,y:2200},1250),true);
 assert.equal(e.x,1000);assert.equal(e.y,2200);
 assert.equal(e.vx,0);assert.equal(e.vy,0);
});
test('NPC packet cadence concentrates 8Hz on near targets and conserves distant traffic',()=>{
 assert.match(world,/NPC_BATCH_INTERVAL_MS = 125/);
 assert.match(world,/NPC_FAST_RADIUS_SQ = 800 \* 800/);
 assert.match(world,/distSq>NPC_FAST_RADIUS_SQ&&!nearRefresh/);
 assert.match(world,/NPC_SOCKET_BACKPRESSURE_BYTES/);
 assert.match(game,/mergeNpcMotionPatch\(e,raw,Date\.now\(\)\)/);
 assert.match(world,/this\.playerProtectedFromNpc\(p,e\)/);
});
test('server quantizes positions independently, confirming source of missing axis bug',()=>{
 assert.match(world,/if\(cur\.x!==prev\.x\)patch\.x=cur\.x;/);
 assert.match(world,/if\(cur\.y!==prev\.y\)patch\.y=cur\.y;/);
});
