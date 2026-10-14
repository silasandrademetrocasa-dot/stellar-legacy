import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SHIPS,ITEMS,ROCKETS,LASER_AMMO} from '../public/data.js';
const eventShips=Object.values(SHIPS).filter(s=>s.eventOnly);
const eliteShips=Object.values(SHIPS).filter(s=>!s.eventOnly&&s.currency==='uridium'&&s.shopAvailable!==false);
const eventItems=Object.values(ITEMS).filter(i=>i.eventOnly);
const sql=fs.readFileSync(new URL('../sql/STELLAR_V19_0_17_BALANCE_EVENTOS.sql',import.meta.url),'utf8');
test('31 event ships retain unique role coverage and realistic tradeoffs',()=>{
 assert.equal(eventShips.length,31);
 for(const s of eventShips){
  assert.ok(s.hp>=280000&&s.hp<=750000,s.id+' hp');
  assert.ok(s.speed>=250&&s.speed<=410,s.id+' speed');
  assert.ok(s.lasers>=7&&s.lasers<=16,s.id+' lasers');
  assert.ok(s.generators>=11&&s.generators<=21,s.id+' generators');
  assert.ok(s.extras>=3&&s.extras<=5,s.id+' extras');
  assert.ok(s.price===0&&s.eventOnly,s.id+' event gate');
 }
 assert.equal(SHIPS.spearhead.lasers,7);
 assert.equal(SHIPS.citadel.speed,250);
 assert.ok(SHIPS.citadel.hp>SHIPS.goliath.hp);
 assert.ok(SHIPS.pusat.speed>SHIPS.cyborg.speed);
});
test('live Elite and common ship fallbacks preserved',()=>{
 assert.equal(eliteShips.length,4);
 assert.equal(SHIPS.goliath.hp,356000);
 assert.equal(SHIPS.pusat.lasers,16);
 assert.equal(SHIPS.nAmbassador.currency,'credits');
});
test('four shield-only event drops beat or complement Elite',()=>{
 const elite=ITEMS.sg3nb02;
 assert.equal(elite.shield,10000);
 assert.ok(ITEMS.sg3nb03.shield>elite.shield);
 assert.ok(ITEMS.sg3nb03.absorption>=elite.absorption);
 assert.ok(ITEMS.fs03.shield>ITEMS.fs02.shield);
 assert.ok(ITEMS.fs04.shield>ITEMS.fs03.shield);
 assert.equal(ITEMS.fs03.shieldRegenBonus,0.0625);
});
test('rare laser progression leaves normal shop laser intact',()=>{
 const base=ITEMS.lf4;
 assert.equal(base.damage,200);
 assert.equal(ITEMS.lfx.damage,250);
 assert.equal(ITEMS.lfomega.damage,265);
 assert.ok(ITEMS.lfomega.alienBonus>ITEMS.lfx.alienBonus);
 for(const id of ['lfx','lfomega','g3n8700','repPrime']){
  assert.equal(ITEMS[id].eventOnly,true);
  assert.equal(ITEMS[id].price,0);
 }
 assert.equal(ITEMS.g3n8700.speed,14);
 assert.equal(ITEMS.repPrime.exclusiveGroup,'repairBot');
 assert.equal(ITEMS.repPrime.repairTick,12000);
 assert.equal(ITEMS.repPrime.shieldRepairTick,18000);
});
test('purchasable ammo and rocket economics unchanged',()=>{
 assert.equal(LASER_AMMO.mcb50.mult,3);
 assert.equal(LASER_AMMO.ucb100.mult,4);
 assert.equal(ROCKETS.plt2021.damage,4000);
});
test('transaction guarded, no account/shop mutations',()=>{
 assert.ok(sql.includes('v_version<>9'));
 assert.ok(sql.includes('v_count<>31'));
 assert.ok(sql.includes('v_count<>4'));
 assert.ok(!/UPDATE public\.(profiles|game_saves|live_shop_prices_v16)/i.test(sql));
 assert.ok(sql.trim().endsWith('COMMIT;'));
});
