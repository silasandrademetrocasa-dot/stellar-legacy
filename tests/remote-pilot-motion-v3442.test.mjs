import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recordRemotePilotPosition,remotePilotVisualAt,advanceRemotePilotVisual,REMOTE_MAX_EXTRAPOLATION_MS} from '../public/modules/multiplayer-motion-v3442.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const pilot=(x=0,y=0)=>({x,y,angle:0,tx:x,ty:y});
test('two online pilots with uneven packets move smoothly without contaminating each other',()=>{
 const a=pilot(),b=pilot(300,600);
 for(const [t,x,y] of [[1000,0,0],[1120,30,0],[1290,72,0],[1400,102,0]])recordRemotePilotPosition(a,{x,y,receivedAt:t,serverAt:t});
 for(const [t,x,y] of [[1000,300,600],[1160,300,560],[1260,300,525],[1410,300,490]])recordRemotePilotPosition(b,{x,y,receivedAt:t,serverAt:t});
 let prevA=-Infinity,prevB=Infinity;
 for(let now=1170;now<=1550;now+=16){advanceRemotePilotVisual(a,{now,dt:1/60});advanceRemotePilotVisual(b,{now,dt:1/60});assert.ok(a.x>=prevA-0.1,'pilot A not jumping backwards');assert.ok(b.y<=prevB+0.1,'pilot B not jumping backwards');prevA=a.x;prevB=b.y;}
 assert.ok(a.x>30&&a.x<=150);assert.ok(b.y<600&&b.y>=430);
});
test('ignores out of order server snapshots, preserving the target',()=>{
 const p=pilot(20,20);recordRemotePilotPosition(p,{x:20,y:20,receivedAt:1000,serverAt:1000});recordRemotePilotPosition(p,{x:100,y:20,receivedAt:1100,serverAt:1100});
 assert.equal(recordRemotePilotPosition(p,{x:-200,y:20,receivedAt:1200,serverAt:1050}),false);assert.equal(p.tx,100);assert.equal(p.remoteMotionSamples.length,2);
});
test('renders exact zero coordinates and never predicts more than bounded lead',()=>{
 const p=pilot(20,20);recordRemotePilotPosition(p,{x:0,y:0,angle:0,receivedAt:1000});recordRemotePilotPosition(p,{x:20,y:0,angle:0,receivedAt:1100});
 const at=remotePilotVisualAt(p,10000);assert.ok(at.x<=20+200*REMOTE_MAX_EXTRAPOLATION_MS/1000+0.001);assert.equal(at.y,0);
});
test('large teleports reset visual history instead of crossing a map',()=>{
 const p=pilot(10,10);recordRemotePilotPosition(p,{x:10,y:10,receivedAt:1000});recordRemotePilotPosition(p,{x:999,y:200,receivedAt:1100});assert.equal(p.remoteMotionSamples.length,1);assert.equal(p.x,999);assert.equal(p.y,200);
});
test('wraps angles without spins and does not touch combat fields',()=>{
 const p={...pilot(),hp:800,shield:500,attackDamage:30};recordRemotePilotPosition(p,{x:0,y:0,angle:3.13,receivedAt:1000});recordRemotePilotPosition(p,{x:5,y:5,angle:-3.13,receivedAt:1160});advanceRemotePilotVisual(p,{now:1250,dt:1/30});assert.ok(Math.abs(p.angle)>2.5);assert.equal(p.hp,800);assert.equal(p.shield,500);assert.equal(p.attackDamage,30);
});
test('client prefers buffered motion, and server keeps authority and movement validation',()=>{
 assert.match(game,/advanceRemotePilotVisual\(rp,\{now,dt\}\)/);assert.match(game,/recordRemotePilotPosition\(rp,/);assert.match(world,/MAX_TRAVEL_UNITS_PER_SECOND/);assert.match(world,/world_player_patch/);assert.match(game,/syncPvpInbox\(\)/);
});
