import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  visualFxBudget,relayVisualLoadout,relayVisualHealth,relayImpactType,
  drawRelayStation,drawPortalGateAccents,drawOreEventAccents,drawShipWingLights
} from '../public/modules/visual-revolution-v347.js';

const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const relayRouter=readFileSync(new URL('../server/relay-router-v346.js',import.meta.url),'utf8');
const dummy=()=>{
  const calls=[];
  const c=new Proxy({}, {get(_t,key){if(key==='calls')return calls;return (...args)=>{calls.push([key,...args]);};},set(_t,key,value){calls.push(['set',key,value]);return true;}});
  return c;
};
const node=(props={})=>({relayMode:true,id:'A',hp:500000,maxHp:500000,shield:500000,maxShield:500000,ownerClanId:null,modules:[],...props});

test('neutral relay visually has eight level-one virtual modules and no free inventory',()=>{
 const original=node();const slots=relayVisualLoadout(original);
 assert.equal(slots.length,8);
 assert.deepEqual(slots.map(v=>v.attribute),['laser','missile','capacitor','regenerator','armor','nanobots','bonus','bonus']);
 assert.ok(slots.every(x=>x.virtual&&x.level===1));
 assert.equal(original.modules.length,0);
});
test('owned relay only shows actually equipped modules; weapon types remain distinct',()=>{
 const equipped=node({ownerClanId:'clan',modules:[{slot:1,attribute:'laser',category:'weapon',level:3},{slot:5,attribute:'armor',category:'hp',level:2}]});
 const slots=relayVisualLoadout(equipped);
 assert.equal(slots[0].attribute,'laser');assert.equal(slots[0].level,3);
 assert.equal(slots[1],null);assert.equal(slots[4].attribute,'armor');
 assert.equal(slots[4].virtual,false);
});
test('relay shield, critical hull and destruction select distinct visual states',()=>{
 assert.deepEqual(relayVisualHealth(node()),{hpRatio:1,shieldRatio:1,destroyed:false,critical:false});
 assert.equal(relayVisualHealth(node({hp:50000})).critical,true);
 assert.equal(relayImpactType(node()),'shield');
 assert.equal(relayImpactType(node({shield:0})),'spark');
 assert.equal(relayImpactType(node({shield:0,hp:0})),'explosion');
});
test('FX budgets strip non-essential effects on low-end mobile',()=>{
 const low=visualFxBudget('low',true),medium=visualFxBudget('medium',true),high=visualFxBudget('high',false);
 assert.equal(low.relayGlow,0);assert.equal(low.impactEffects,0);
 assert.equal(low.shipLights,0);assert.equal(low.portalAccents,0);
 assert.equal(medium.oreAccents,0);assert.ok(high.relayGlow>0);
});
test('relay drawing retains canvas state for each quality, ownership and combat state',()=>{
 for(const quality of ['low','medium','high'])for(const props of [{},{ownerClanId:'owned',modules:[{slot:2,attribute:'missile',category:'weapon',level:3}]},{hp:0,shield:0}]){
   const ctx=dummy();drawRelayStation(ctx,node(props),{quality,mobile:quality==='low',time:12.5,baseColor:'#87ccee',aimAngle:.35});
   const saves=ctx.calls.filter(x=>x[0]==='save').length,restores=ctx.calls.filter(x=>x[0]==='restore').length;
   assert.equal(saves,restores,`unbalanced save/restore on ${quality}`);
   assert.ok(saves>8,`eight mounted station slots on ${quality}`);
   assert.ok(ctx.calls.some(x=>x[0]==='stroke'));
   assert.equal(ctx.calls.some(x=>x[0]==='createRadialGradient'),false);
 }
});
test('portal and rare-ore enhancements do no graphics work in low mode',()=>{
 const p=dummy(),ore=dummy(),ship=dummy();
 drawPortalGateAccents(p,{quality:'low',mobile:true});
 drawOreEventAccents(ore,{quality:'low',mobile:true});
 drawShipWingLights(ship,{quality:'low',mobile:true});
 assert.equal(p.calls.length,0);assert.equal(ore.calls.length,0);assert.equal(ship.calls.length,0);
 const h=dummy();drawPortalGateAccents(h,{quality:'high',time:25});
 assert.equal(h.calls.filter(x=>x[0]==='save').length,h.calls.filter(x=>x[0]==='restore').length);
});
test('multiplayer/npc logic unmodified; client only renders server-confirmed relay damage',()=>{
 assert.match(game,/if\(msg\.type==='relay_hit_fx'\)/);
 assert.match(game,/spawnRelayVisualImpact\(n\)/);
 assert.match(game,/queueRelayTurretBolt\(msg\)/);
 assert.match(game,/drawRelayTurretBolts\(\)/);
 assert.match(game,/drawRelayStation\(ctx,node,/);
 assert.match(game,/drawPortalGateAccents\(ctx,/);
 assert.match(game,/drawOreEventAccents\(ctx,/);
 assert.match(game,/drawShipWingLights\(ctx,/);
 assert.match(game,/function drawEngineWakeLocal/);
 assert.match(game,/createAmmoHudBudget/);
});
test('ADM allows the already-applied 3 million module capacity and preserves authentication',()=>{
 assert.match(relayRouter,/shield_bonus:\[0,3000000\]/);
 assert.match(relayRouter,/hp_bonus:\[0,3000000\]/);
 assert.match(game,/\['shield_bonus','ESCUDO EXTRA',3000000\]/);
 assert.match(game,/\['hp_bonus','HP EXTRA',3000000\]/);
 assert.match(relayRouter,/is_game_admin_v1763/);
});
