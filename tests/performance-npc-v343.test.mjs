import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStagedAssetPreloader} from '../public/modules/staged-preload-v342.js';
import {perceptionPlayers,nearestPerceivedPlayer,turnNpcToward,selectAggroSuccessor} from '../server/npc-intelligence-v343.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');

test('asset loader distributes requests across idle slices, dedupes and preserves order',()=>{
 const callbacks=[],loaded=[];
 const loader=createStagedAssetPreloader({request:x=>loaded.push(x),schedule:cb=>callbacks.push(cb),batchSize:2});
 loader.enqueue(['nave','npc','npc','mapa','portal']);
 assert.equal(loader.pending,4);
 assert.deepEqual(loaded,[]);
 callbacks.shift()();assert.deepEqual(loaded,['nave','npc']);assert.equal(loader.pending,2);
 callbacks.shift()();assert.deepEqual(loaded,['nave','npc','mapa','portal']);assert.equal(loader.pending,0);
});
test('map change invalidates stale callback and reschedules latest assets',()=>{
 const callbacks=[],loaded=[];
 const loader=createStagedAssetPreloader({request:x=>loaded.push(x),schedule:cb=>callbacks.push(cb),batchSize:1});
 loader.enqueue(['map-old','ship-old']);
 loader.clear();loader.enqueue(['map-new']);
 callbacks.shift()();assert.deepEqual(loaded,[]);
 callbacks.shift()();assert.deepEqual(loaded,['map-new']);
});
test('single asset failing does not permanently stop the queue',()=>{
 const callbacks=[],loaded=[];
 const loader=createStagedAssetPreloader({request:x=>{if(x==='bad')throw Error('offline');loaded.push(x);},schedule:cb=>callbacks.push(cb),batchSize:1});
 loader.enqueue(['bad','good']);callbacks.shift()();callbacks.shift()();assert.deepEqual(loaded,['good']);
});
test('server perception excludes stale/dead/protected and allows retaliation in neutral zones',()=>{
 const now=10000,rows=[
  {userId:'old',x:1,y:0,hp:100,updatedAt:1},
  {userId:'dead',x:2,y:0,hp:0,updatedAt:now},
  {userId:'safe',x:4,y:0,hp:100,updatedAt:now},
  {userId:'open',x:40,y:0,hp:100,updatedAt:now}
 ];
 const seen=perceptionPlayers(rows,{now,isProtected:p=>p.userId==='safe'});
 assert.equal(seen.length,2);
 assert.deepEqual(nearestPerceivedPlayer({x:0,y:0},seen).player.userId,'open');
 assert.deepEqual(nearestPerceivedPlayer({x:0,y:0,aggroUserId:'safe'},seen).player.userId,'safe');
});
test('perception uses squared distance and a finite sqrt once at the end',()=>{
 const p=[{player:{userId:'a',x:3,y:4}},{player:{userId:'b',x:20,y:20}}];
 assert.deepEqual(nearestPerceivedPlayer({x:0,y:0},p),{player:p[0].player,dist:5});
 assert.equal(nearestPerceivedPlayer({x:0,y:0},[]),null);
});
test('NPC heading turns along shortest arc and does not overshoot on lag spikes',()=>{
 let a=turnNpcToward(3.12,0,0,-10,-1,.05);
 assert.ok(Math.abs(a-3.12)<.12);
 assert.ok(Number.isFinite(turnNpcToward(a,0,0,10,0,2)));
 assert.equal(turnNpcToward(2,0,0,0,0,1),2);
});
test('integration retains server-safe shot constraints and preserves sprite fallbacks',()=>{
 assert.match(world,/perceptionPlayers\(this\.players\.values\(\)/);
 assert.match(world,/nearestPerceivedPlayer\(e,/);
 assert.match(world,/turnNpcToward\(e\.angle/);
 assert.match(world,/this\.playerProtectedFromNpc\(p,e\)/);
 assert.match(game,/STAGED_PRELOADER_V342\.clear\(\)/);
 assert.match(game,/e\.sharedWorld&&Number\.isFinite\(e\.angle\)/);
});

test('retarget picks the strongest prior attacker, not nearest noncombatant',()=>{
 const players=new Map([
  ['pilotA',{userId:'pilotA',hp:100}],['pilotB',{userId:'pilotB',hp:100}],['pilotC',{userId:'pilotC',hp:0}]
 ]);
 const damage=new Map([['pilotA',100],['pilotB',900],['pilotC',9999]]);
 const next=selectAggroSuccessor(damage,players,p=>p.hp>0);
 assert.equal(next.userId,'pilotB');
 assert.equal(selectAggroSuccessor(new Map(),players),null);
});
