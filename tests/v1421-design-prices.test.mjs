import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {DESIGNS} from '../public/modules/christmas-v132.js';
import {natalDesignQuoteV1421} from '../public/modules/natal-prices-v1421.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V142.1: display and purchase quote must come from a valid server price',()=>{
 assert.equal(natalDesignQuoteV1421({},'skin'),null);
 for(const value of [undefined,null,0,-1,'100000',NaN,1.2])assert.equal(natalDesignQuoteV1421({design_prices:{skin:value}},'skin'),null);
 assert.equal(natalDesignQuoteV1421({design_prices:{skin:5000000}},'skin'),5000000);
 assert.doesNotMatch(read('public/modules/christmas-ui-v132.js'),/fmt\(d.price\)/);
});
test('V142.1 PostgreSQL: real prices, dynamic catalogue, stale quotes, debit and replay',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 for(const f of ['tests/fixtures/v134-schema.sql','sql/STELLAR_V134_SAVE_UNICO.sql'])await db.exec(read(f));
 for(const [ship,price] of [['leonov',900000],['vengeance',1400000],['goliath',2500000],['pusat',3000000]])await db.query("INSERT INTO live_shop_prices_v16(catalog_key,kind,ref_id,price,currency) VALUES($1,'ship',$2,$3,'uridium')",['ship:'+ship,ship,price]);
 for(const d of DESIGNS)await db.query('INSERT INTO stellar_natal_rewards_v132(id,definition) VALUES($1,$2)',['design:'+d.design_id,d]);
 await db.exec(read('sql/STELLAR_V142_1_PRECOS_DESIGNS.sql'));await db.exec(read('sql/STELLAR_V142_1_PRECOS_DESIGNS.sql'));
 const uid='11111111-1111-4111-8111-111111111111',state={accountOwnerId:uid,adminResetEpoch:0,activeShipId:'goliath',ownedShips:['goliath'],profile:{callsign:'QA1421',faction:'earth',level:10,credits:1000,uridium:100000000,xp:100000},cargo:{},ammo:{lcb10:100},serverPurchaseRevision:0};
 await db.query('INSERT INTO game_saves(user_id,state) VALUES($1,$2)',[uid,state]);await db.exec("INSERT INTO stellar_natal_config_v132(id,enabled,starts_at,ends_at) VALUES(1,true,now()-interval '1 day',now()+interval '1 day')");
 const status=async()=>(await db.query('SELECT stellar_natal_status_v132($1) r',[uid])).rows[0].r;
 await t.test('regular skins cost 2x, countries 10x, event floors 6M, pass remains exclusive',async()=>{
  const p=(await status()).design_prices;assert.equal(p.n132_leonov_hp,1800000);assert.equal(p.n132_vengeance_xp,2800000);assert.equal(p.n132_goliath_damage,5000000);assert.equal(p.n132_pusat_speed,6000000);
  for(const c of ['br','us','jp','es','pt'])assert.equal(p['n132_goliath_'+c],25000000);
  assert.equal(p.n132_aegis_solstice,6000000);assert.equal(p.n132_spearhead_cristal,0);
 });
 const buy=(key,payload)=>(db.query('SELECT stellar_player_natal_action($1,$2,$3,$4) r',[uid,key,'design',payload]));
 await t.test('old UI and a wrong quote cannot debit any currency or grant a skin',async()=>{
  await assert.rejects(buy('design:n132_goliath_hp',{}),/Preços atualizados/);await assert.rejects(buy('design:n132_goliath_hp',{price_quote:100000}),/preço mudou/);
  assert.equal((await db.query('SELECT state FROM game_saves WHERE user_id=$1',[uid])).rows[0].state.profile.uridium,100000000);
  assert.equal((await db.query('SELECT count(*) n FROM player_design_inventory_v16 WHERE user_id=$1',[uid])).rows[0].n,0);
 });
 await t.test('correct price debits exactly once and replay does not charge again',async()=>{
  const p={price_quote:5000000};await buy('design:n132_goliath_hp',p);await buy('design:n132_goliath_hp',p);
  assert.equal((await db.query('SELECT state FROM game_saves WHERE user_id=$1',[uid])).rows[0].state.profile.uridium,95000000);
  assert.equal((await db.query('SELECT quantity FROM player_design_inventory_v16 WHERE user_id=$1',[uid])).rows[0].quantity,1);
 });
 await t.test('changing the ship catalogue automatically changes both shown and charged price',async()=>{
  await db.exec("UPDATE live_shop_prices_v16 SET price=2600000 WHERE catalog_key='ship:goliath'");assert.equal((await status()).design_prices.n132_goliath_br,26000000);
  await assert.rejects(buy('design:n132_goliath_br',{price_quote:25000000}),/preço mudou/);
  await buy('design:n132_goliath_br',{price_quote:26000000});assert.equal((await db.query('SELECT state FROM game_saves WHERE user_id=$1',[uid])).rows[0].state.profile.uridium,69000000);
 });
});
