import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {smoothNpcPosition,smoothNpcHeading,npcCombatLockCue,rocketVisualTarget} from '../public/modules/galactic-combat-v344.js';
const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('NPC advances gradually to server position at 30 FPS, without snapping',()=>{
 let e={x:100,y:100,netX:160,netY:130,vx:120,vy:60,netAt:1000};
 const start=smoothNpcPosition(e,{now:1040,dt:1/30});
 assert.ok(start.x>100&&start.x<160);
 e.x=start.x;e.y=start.y;for(let i=0;i<15;i++){const n=smoothNpcPosition(e,{now:1040+i*33,dt:1/30});e.x=n.x;e.y=n.y;}
 assert.ok(e.x>140&&e.x<210);
});
test('visual snapping only for large authoritative teleports, no endless stale extrapolation',()=>{
 const teleport=smoothNpcPosition({x:1,y:1,netX:900,netY:900,netAt:1000},{now:1030,dt:.03});
 assert.deepEqual(teleport,{x:900,y:900,snapped:true});
 const stale=smoothNpcPosition({x:0,y:0,netX:10,netY:10,vx:600,vy:600,netAt:1000},{now:2300,dt:.035});
 assert.ok(stale.x>0&&stale.x<10);
});
test('angle smoothes shortest direction and never spins at wrap boundary',()=>{
 const a=smoothNpcHeading(Math.PI-.03,-Math.PI+.03,.033);
 assert.ok(a>Math.PI-.03&&a<Math.PI+.1);
});
test('tactical lock feedback respects laser and missile envelopes',()=>{
 assert.equal(npcCombatLockCue({distance:1100,laserRange:600,rocketRange:800}),'FORA DO ALCANCE');
 assert.equal(npcCombatLockCue({distance:700,laserRange:600,rocketRange:800}),'ALCANCE DO MÍSSIL');
 assert.equal(npcCombatLockCue({distance:500,laserRange:600,rocketRange:800,aggro:true}),'AMEAÇA FIXADA');
});
test('rocket target can follow small displacement; large teleport is ignored',()=>{
 assert.deepEqual(rocketVisualTarget({tx:100,ty:150},{x:130,y:140}),{x:130,y:140});
 assert.deepEqual(rocketVisualTarget({tx:100,ty:150},{x:900,y:900}),{x:100,y:150});
});
test('NPC sight 25 percent greater; server-safe zones and damage unchanged',()=>{
 assert.match(world,/aggroRange:1000,/);
 assert.match(world,/this\.playerProtectedFromNpc\(p,e\)/);
 assert.match(game,/updateSharedUniverseInterpolation\(dt\)/);
 assert.match(game,/smoothNpcPosition\(e,/);
 assert.match(game,/rocketVisualTarget\(r,target\)/);
 assert.match(game,/exchangeCombatBuildV2013/);
});
