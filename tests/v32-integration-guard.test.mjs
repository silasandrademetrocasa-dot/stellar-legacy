import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rankVisibleNpcTargets} from '../public/modules/combat-target-priority.js';
import {npcPatrolPosition} from '../public/modules/npc-patrol.js';
import {npcUpdateDecision} from '../public/modules/smart-combat-engine.js';
const game=readFileSync(new URL('../public/game.js', import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
test('target selector never selects invalid entities or pilots',()=>{
 const candidates=[{id:'pvp',isPlayer:true,x:1,y:1,hp:100},{id:'dead',x:2,y:1,hp:0},{id:'far',x:1200,y:10,hp:100},{id:'near',x:20,y:10,hp:100}];
 assert.deepEqual(rankVisibleNpcTargets(candidates,{x:0,y:0,range:950}).map(x=>x.id),['near']);
});
test('local NPC leash does not mutate server-authoritative or boss positions',()=>{
 for(const attrs of [{sharedWorld:true},{eventNpc:true},{type:'bossRiftScout'},{forceChase:true}]){
  const enemy={id:'e',x:0,y:0,hp:100,...attrs};
  assert.deepEqual(npcPatrolPosition(enemy,1500,0,{leash:900,dt:.5,speed:120}),{x:1500,y:0,returning:false});
 }
});
test('nearby and special NPC combat updates remain normal',()=>{
 for(const enemy of [{hp:100,x:0,y:0,eventNpc:true},{hp:100,x:0,y:0,worldBoss:true},{hp:100,x:0,y:0,sharedWorld:true},{hp:100,x:100,y:100}]){
  assert.equal(npcUpdateDecision(enemy,{playerX:0,playerY:0,nowMs:1000,frame:1,slot:0}),'normal');
 }
});
test('server economy and multiplayer integrations retained',()=>{
 for(const key of ['sharedUniverse','economy_guard_v161','RELEASE_VERSION'])assert.ok(server.includes(key),key);
 assert.ok(game.includes('clearGalaxyEventEntities()'));
 assert.ok(game.includes('syncSharedUniversePlayer(true)'));
 assert.ok(game.includes('function manualCycleTargetV32'));
});
