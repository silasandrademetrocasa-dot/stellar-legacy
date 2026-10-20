import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recordRemotePilotPosition,remotePilotVisualAt,advanceRemotePilotVisual,REMOTE_MAX_EXTRAPOLATION_MS,REMOTE_RENDER_DELAY_MS} from '../public/modules/multiplayer-motion-v3442.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const pilot=()=>({x:0,y:0,angle:0});
function cruise({vx=420,vy=0,jitter=[0,27,3,51,12,63,0,9,34,2],duration=4600}={}){
 const p=pilot(),events=[];
 for(let t=0;t<=duration;t+=100){const late=70+jitter[(t/100)%jitter.length];events.push({at:200000+t+late,serverAt:200000+t,x:t*vx/1000,y:t*vy/1000});}
 events.sort((a,b)=>a.at-b.at);
 let i=0;const samples=[];
 for(let now=200000;now<=200000+duration+150;now+=1000/30){while(i<events.length&&events[i].at<=now){const e=events[i++];recordRemotePilotPosition(p,{x:e.x,y:e.y,receivedAt:e.at,serverAt:e.serverAt});}advanceRemotePilotVisual(p,{now,dt:1/30});samples.push({now,x:p.x,y:p.y});}
 return {p,samples};
}
test('two cruising remote pilots continue gliding instead of braking between jittery packets',()=>{
 const a=cruise({vx:440}),b=cruise({vx:285,vy:285,jitter:[43,0,34,70,9,46,2]});
 for(const [rows,component,expected] of [[a.samples,'x',440],[b.samples,'y',285]]){
  const deltas=rows.slice(35,115).map((q,i)=>q[component]-rows[34+i][component]);
  assert.ok(deltas.every(d=>d>3),`stalled remote ${component}: ${Math.min(...deltas)}`);
  const avg=deltas.reduce((sum,d)=>sum+d,0)/deltas.length;
  assert.ok(Math.abs(avg-expected/30)<2,`cruise pacing: ${avg}`);
 }
});
test('server clock cadence defeats packet-arrival jitter and remains bounded on silence',()=>{
 const p=pilot();recordRemotePilotPosition(p,{x:0,y:0,receivedAt:5000,serverAt:4900});
 recordRemotePilotPosition(p,{x:50,y:0,receivedAt:5240,serverAt:5000});
 recordRemotePilotPosition(p,{x:100,y:0,receivedAt:5280,serverAt:5100});
 // Timelines represent server 100-ms increments, not 240 / 40 ms arrival jitter.
 assert.deepEqual(p.remoteMotionSamples.map(s=>s.at),[5000,5100,5200]);
 const position=remotePilotVisualAt(p,9000);
 assert.ok(position.x<=100+1400*REMOTE_MAX_EXTRAPOLATION_MS/1000);
 assert.ok(REMOTE_RENDER_DELAY_MS<130);
});
test('a sudden stop ends cruise prediction and old packets cannot roll a pilot back',()=>{
 const p=pilot();for(const [t,x] of [[1000,0],[1100,35],[1200,70],[1300,105]])recordRemotePilotPosition(p,{x,y:0,receivedAt:t+70,serverAt:t});
 assert.ok(remotePilotVisualAt(p,1500).x>105);
 recordRemotePilotPosition(p,{x:105,y:0,receivedAt:1570,serverAt:1500});
 assert.equal(p.vx,0);assert.equal(remotePilotVisualAt(p,1950).x,105);
 assert.equal(recordRemotePilotPosition(p,{x:0,y:0,receivedAt:1980,serverAt:1000}),false);
});
test('client sends running positions faster and explicitly sends final stopping position, without touching PvP authority',()=>{
 assert.match(game,/SHARED_SYNC_MOVE_MS=100/);
 assert.match(game,/syncSharedUniversePlayer\(justFinishedMoving\)/);
 assert.match(world,/PLAYER_STATE_MIN_MS = 80/);
 assert.match(world,/MAX_TRAVEL_UNITS_PER_SECOND/);
});
