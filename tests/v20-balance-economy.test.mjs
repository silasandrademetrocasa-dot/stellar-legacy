import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAPS} from '../public/data.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const sql1=readFileSync(new URL('../sql/V20_ETAPA1_INTEGRIDADE.sql',import.meta.url),'utf8');
const sql2=readFileSync(new URL('../sql/V20_ETAPA2_ECONOMIA_PASSE.sql',import.meta.url),'utf8');
test('admin sees every X map and server sanitizes all 11 maps',()=>{
  for(const id of ['x1','x2','x3','x4','x5','x6','x7','x8','b41','b42','b43']){assert.match(game,new RegExp(id+":'"));assert.match(sql1,new RegExp("'"+id+"'"));}
});
test('legacy premium coupon no longer mints benefits locally',()=>{
 assert.match(game,/const PREMIUM_EVENT_COUPONS=\{\}/);
 assert.match(game,/function effectivePremiumUntilMs\(\)\{return remotePremiumUntilMs\(\)/);
 assert.doesNotMatch(game,/function redeemPremiumCouponLocal/);
 assert.match(game,/redeemGameCouponOnline\(code\)/);
});
test('mining yield by map with no extra node or resource types',()=>{
 const entries=[['x5',2,32],['x6',3,28],['x7',4,24],['x8',5,20]];
 for(const [id,yieldCount,n] of entries){assert.equal(MAPS[id].oreYield,yieldCount);assert.deepEqual(MAPS[id].ores,['Prometium','Endurium','Terbium']);}
 assert.match(world,/opts.eventOre\?1:this.map.oreYield/);
});
test('aux xp uses capped NPC XP not credits/stl',()=>{
 assert.match(game,/function petXpForNpc/); assert.match(game,/Math.min\(boss\?3500:2000,Math.round\(xp\*\.10\)\)/);
 assert.doesNotMatch(game,/clone.credits\/120\+clone.uridium\*4/);
});
test('craft and next pass price are safe and scoped',()=>{
 assert.match(sql2,/350,100,premium_price_brl/);
 assert.match(sql2,/season_key='2026-10'\)<>500/);
 for(const id of ['ammo_pls2','rocket_pack','prometid_batch','duranium_batch','promerium_batch','repair_bonus'])assert.ok(sql2.includes(id));
});
