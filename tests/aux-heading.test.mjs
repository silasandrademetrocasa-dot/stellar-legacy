import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {smoothAuxHeading,auxSpriteRotation} from '../public/modules/aux-heading.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('AUX nose points along travel, with the same top-down sprite for all bearings',()=>{
 for(const h of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const rotation=auxSpriteRotation(h);
  near(Math.sin(rotation),Math.cos(h));near(-Math.cos(rotation),Math.sin(h));
 }
});
test('AUX turns by shortest arc across angle wrap and holds still when idle',()=>{
 const a=179*Math.PI/180,b=-179*Math.PI/180,next=smoothAuxHeading(a,b,.016);
 assert.ok(Math.atan2(Math.sin(next-a),Math.cos(next-a))>0);
 near(smoothAuxHeading(.8,.8,.016),.8);near(smoothAuxHeading(.8,NaN,.016),.8);
 near(smoothAuxHeading(.8,2,0),.8);
});
test('AUX turn has a bounded speed and comparable motion at 30 and 60 FPS',()=>{
 assert.ok(Math.abs(smoothAuxHeading(0,Math.PI,.016))<=4.2*.016+1e-10);
 assert.ok(Math.abs(smoothAuxHeading(0,Math.PI,10))<=.42+1e-10);
 function after(fps){let h=0;for(let i=0;i<fps;i++)h=smoothAuxHeading(h,.8,1/fps);return h;}
 assert.ok(Math.abs(after(30)-after(60))<.001);assert.ok(Math.abs(after(60)-.8)<.001);
});
test('local and remote movement and drawing use the heading functions; labels remain outside rotation',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/petRuntime.angle=smoothAuxHeading\(petRuntime.angle,Math.atan2\(dy,dx\),dt\)/);
 assert.match(game,/q.angle=smoothAuxHeading\(q.angle,q.targetAngle,dt\)/);
 for(const [start,end] of [['function drawPet(){','function drawShipModel'],['function drawRemotePet(','function drawRemoteLaser']]){
  const block=game.slice(game.indexOf(start),game.indexOf(end,game.indexOf(start)));
  assert.equal((block.match(/ctx\.rotate\(auxSpriteRotation\(/g)||[]).length,1);
  assert.ok(block.lastIndexOf('ctx.restore()')<block.indexOf('ctx.fillText(`AUX-9'));
 }
 assert.match(game,/const AUX_ATLAS_V64=Object.freeze\(\{\}\)/);
});
