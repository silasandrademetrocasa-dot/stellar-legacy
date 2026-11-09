import test from 'node:test';import assert from 'node:assert/strict';
import {DESIGNS,NPCS,christmasWindow,rollChristmasBox,compatibleDesign,fireworkReady} from '../public/modules/christmas-v132.js';
import {natalRoomTick,natalSocket} from '../server/christmas-v132.js';
const at=s=>Date.parse(`2026-12-05T${s}-03:00`);
test('Natal: four alternating windows, no simultaneous main event or boundary overlap',()=>{
 for(const [time,map] of [['13:30:00','x4'],['16:30:00','pvp'],['19:30:00','x4'],['22:30:00','pvp']]){const e=christmasWindow(at(time),()=>null);assert.ok(e);assert.ok(map==='x4'?e.rules.map==='x4':/^b4[123]$/.test(e.rules.map));}
 assert.equal(christmasWindow(at('13:04:59'),()=>null),null);assert.equal(christmasWindow(at('13:55:00'),()=>null),null);
 assert.equal(christmasWindow(at('13:30:00'),t=>t>=at('13:50:00')?{}:null),null);
 assert.equal(christmasWindow(Date.parse('2027-01-07'),()=>null),null);
});
test('Natal: box doubles a single existing prize and quantum drop is optional',()=>{
 const pool=[{kind:'credits',weight:1,min:500,max:500}];
 for(const [r,cores] of [[0,2],[.009,2],[.01,1],[.049,1],[.05,0],[.99,0]]){let a=[0,0,r];const reward=rollChristmasBox(pool,()=>a.shift());assert.equal(reward.qty,1000);assert.equal(reward.cores,cores);}
});
test('Designs preserve approved attributes and require matching hull',()=>{
 assert.equal(DESIGNS.length,7);assert.equal(new Set(DESIGNS.map(x=>x.design_id)).size,7);
 for(const d of DESIGNS){assert.ok(compatibleDesign(d,d.eligibility.ship_id));assert.equal(compatibleDesign(d,'phoenix'),false);}
 assert.deepEqual(DESIGNS.find(d=>d.design_id==='n132_yamato_vulcao').bonuses,{damage:.20,shield:.15,speed:.08});
 assert.deepEqual(DESIGNS.find(d=>d.design_id==='n132_spearhead_cristal').bonuses,{damage:.18,shield:.16,hp:.08});
 assert.equal(fireworkReady(1000,5999),false);assert.equal(fireworkReady(1000,6000),true);
});
function room(map='x4'){
 let n=0;return {key:'earth:'+map,mapId:map,map:{portals:[]},event:{eventId:'test',start:0,rules:{christmas:true}},npcs:new Map(),world:{natal:{bossKilled:async()=>false}},randomPosition:()=>({x:1000,y:1000}),makeNpc(type,opts){return {id:opts.id||String(n++),type,hp:1,...opts};},publicNpc:e=>e,broadcast(){}};
}
test('Natal: respawn caps and one boss across room lifetime',async()=>{
 const r=room();natalRoomTick(r,1000);assert.equal(r.npcs.size,10);assert.equal(r.natalBoxes.size,10);natalRoomTick(r,2000);assert.equal(r.npcs.size,10);
 r.npcs.delete('0');natalRoomTick(r,3000);assert.equal(r.npcs.size,9);natalRoomTick(r,62000);assert.equal(r.npcs.size,10);
 const p=room('b41');natalRoomTick(p,1200000);await new Promise(resolve=>setImmediate(resolve));assert.equal([...p.npcs.values()].filter(x=>x.type==='natalRei').length,1);p.npcs.delete('test:king');natalRoomTick(p,1300000);await new Promise(resolve=>setImmediate(resolve));assert.equal([...p.npcs.values()].filter(x=>x.type==='natalRei').length,0);
 const restart=room('b41');restart.world.natal.bossKilled=async()=>true;natalRoomTick(restart,1200000);await new Promise(resolve=>setImmediate(resolve));assert.equal([...restart.npcs.values()].filter(x=>x.type==='natalRei').length,0);
});
test('Natal: distant collection is rejected and failed delivery leaves box retryable',async()=>{
 const r=room();r.playerFresh=()=>true;r.world.natal.active=()=>true;r.world.natal.action=async()=>{throw Error('network');};r.natalBoxes=new Map([['box',{id:'box',x:1000,y:1000}]]);const ws={player:{userId:'p',x:0,y:0}};let calls=0;
 await natalSocket(r,ws,{type:'natal_collect',id:'box'},()=>calls++);assert.equal(calls,0);ws.player.x=1000;ws.player.y=1000;await natalSocket(r,ws,{type:'natal_collect',id:'box'},()=>calls++);assert.equal(r.natalBoxes.get('box').pending,false);assert.equal(calls,1);
});
