import {supabasePgliteV134} from './fixtures/supabase-pglite-v134.mjs';
import {createPlayerRewardsV134} from '../server/player-rewards-v134.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {mergePlayerStateV134} from '../public/modules/player-state-merge-v134.js';
import {cargoCapacityV134,levelRewardV134} from '../server/player-rewards-v134.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V134 real PostgreSQL functions: cross-sector transactions and durable receipts',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(read('tests/fixtures/v134-schema.sql'));
 await db.exec(read('sql/STELLAR_V134_SAVE_UNICO.sql'));
 await db.exec(read('sql/STELLAR_V134_SAVE_UNICO.sql'));
 await db.exec(read('sql/STELLAR_V134_1_COLETA_LATENCIA.sql'));
 await db.exec(read('sql/STELLAR_V134_1_COLETA_LATENCIA.sql'));
 const uid='11111111-1111-4111-8111-111111111111',h='a'.repeat(64);
 let serial=0;
 const initial={accountOwnerId:uid,adminResetEpoch:0,profile:{callsign:'QA134',faction:'earth',level:10,credits:10000,uridium:100,xp:100000},cargo:{Prometium:4},ammo:{lcb10:100},inventory:{},serverPurchaseRevision:0};
 const row=async()=> (await db.query('SELECT state FROM game_saves WHERE user_id=$1',[uid])).rows[0].state;
 const reset=async()=>{await db.query('INSERT INTO game_saves(user_id,state,updated_at) VALUES($1,$2,clock_timestamp()) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at',[uid,initial]);};
 const command=async(module,base,state,extra={},id='qa134_command_'+(++serial),hash=h)=>(await db.query('SELECT stellar_player_commit($1,$2,$3,$4,$5) r',[uid,id,module,hash,{base,state,receipt:{total:400},operation:'economy:sell_cargo',...extra}])).rows[0].r;
 await reset();
 await t.test('all inventoried writers lock the account before their rules',async()=>{
  const coverage=JSON.parse(read('docs/v134/SQL_WRITER_COVERAGE.json'));
  for(const m of coverage){const f=await db.query('SELECT pg_get_functiondef(p.oid) d FROM pg_proc p WHERE proname=$1',[m.function]);assert.equal(f.rows.length,1,m.function);assert.match(f.rows[0].d,/PLAYER_SHARED_LOCK_V134/,m.function);}
 });
 await t.test('NPC reward arriving after a sale quote is preserved with sale credits',async()=>{
  const base=await row(),draft=structuredClone(base);draft.profile.credits+=400;delete draft.cargo.Prometium;draft.serverPurchaseRevision++;
  const npc=(await db.query('SELECT stellar_grant_npc_reward_v228($1,$2,$3,$4,$5) r',[uid,'qa134_npc_race_01','streuner',1000,5])).rows[0].r;assert.equal(npc.granted,true);
  const result=await command('economy',base,draft,{},'qa134_sale_lost_ack');assert.equal(result.ok,true);assert.equal(result.state.profile.credits,11400);assert.equal(result.state.profile.uridium,105);assert.equal(result.state.cargo.Prometium,undefined);
  const profile=(await db.query('SELECT credits FROM profiles WHERE id=$1',[uid])).rows[0];assert.equal(Number(profile.credits),11400);
  const backup=(await db.query("SELECT state FROM stellar_player_save_abc_v118 WHERE user_id=$1 AND slot='A'",[uid])).rows[0];assert.equal(backup.state.profile.credits,11400);
 });
 await t.test('lost response replay returns current NPC gains without a second sale',async()=>{
  await db.query('SELECT stellar_grant_npc_reward_v228($1,$2,$3,$4,$5)',[uid,'qa134_npc_race_02','streuner',500,0]);
  const result=await command('economy',initial,initial,{},'qa134_sale_lost_ack');assert.equal(result.ok,true);assert.equal(result.replayed,true);assert.equal(result.state.profile.credits,11900);
  assert.equal((await command('economy',initial,initial,{},'qa134_sale_lost_ack','b'.repeat(64))).code,'COMMAND_ID_REUSED');
 });
 await t.test('ammo purchase from the same original base preserves concurrent reward and sale',async()=>{
  const draft=structuredClone(initial);draft.profile.credits-=200;draft.ammo.lcb10+=50;draft.serverPurchaseRevision++;
  const result=await command('economy',initial,draft,{operation:'economy:auto_buy'});assert.equal(result.ok,true);assert.equal(result.state.profile.credits,11700);assert.equal(result.state.ammo.lcb10,150);assert.equal(result.state.serverPurchaseRevision,2);
 });
 await t.test('an ore pickup after the sale quote stays in cargo',async()=>{
  const base=await row();base.cargo={Prometium:4};await db.query('UPDATE game_saves SET state=$2 WHERE user_id=$1',[uid,base]);
  await db.exec("INSERT INTO game_resource_config_v1814(resource_key,enabled) VALUES('Prometium',true) ON CONFLICT(resource_key) DO NOTHING");
  await db.query('SELECT stellar_grant_ore_reward_v229($1,$2,$3,$4)',[uid,'qa134_ore_race_01','Prometium',3]);
  const draft=structuredClone(base);delete draft.cargo.Prometium;draft.profile.credits+=400;draft.serverPurchaseRevision++;
  const r=await command('economy',base,draft);assert.equal(r.ok,true);assert.equal(r.state.cargo.Prometium,3);
 });
 await t.test('overdraft after another debit is rejected without changing state or receipt',async()=>{
  const base=await row(),draft=structuredClone(base);draft.profile.credits-=11000;
  await db.query("UPDATE game_saves SET state=jsonb_set(state,'{profile,credits}','100') WHERE user_id=$1",[uid]);
  const before=await row(),r=await command('economy',base,draft);assert.equal(r.ok,false);assert.equal(r.code,'PLAYER_RETRY');assert.deepEqual(await row(),before);
 });
 await t.test('a snapshot token stores a server baseline and cannot be fabricated',async()=>{
  const r=(await db.query('SELECT stellar_player_read($1,NULL) r',[uid])).rows[0].r;
  const known=(await db.query('SELECT stellar_player_read($1,$2) r',[uid,r.save_token])).rows[0].r;assert.deepEqual(known.baseline_state,known.state);
  assert.equal((await db.query("SELECT stellar_player_read($1,'forged') r",[uid])).rows[0].r.baseline_state,null);
 });
 await t.test('collection removal, cargo and receipt are atomic and replayable after deletion',async()=>{
  await db.query("INSERT INTO stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload) VALUES($1,'loot_qa134_test','loot','earth:x1',400,400,'{\"resources\":{\"Prometium\":5}}')",[uid]);
  const base=await row(),draft=structuredClone(base);draft.cargo.Prometium+=5;draft.serverPurchaseRevision++;
  const extra={drop_id:'loot_qa134_test',drop_before:{resources:{Prometium:5}},drop_after:null,receipt:{picked:{Prometium:5}}};
  const first=await command('collection',base,draft,extra,'qa134_collection_001');assert.equal(first.ok,true);
  assert.equal((await db.query("SELECT count(*) n FROM stellar_collection_drops_v134 WHERE drop_id='loot_qa134_test'")).rows[0].n,0);
  const repeat=await command('collection',base,draft,extra,'qa134_collection_001');assert.equal(repeat.replayed,true);assert.equal(repeat.state.cargo.Prometium,8);
 });
 await t.test('bonus slots are issued by the server and bounded',async()=>{
  const run=async()=> (await db.query('SELECT stellar_player_bonus_ensure($1,$2,$3,$4,$5) r',[uid,'earth:x1',3,4000,3000])).rows[0].r;
  const a=await run(),b=await run();assert.equal(a.length,3);assert.deepEqual(a,b);assert.ok(a.every(x=>x.id.startsWith('bonus_')&&x.x>=220&&x.y>=220));
 });
 await t.test('AUX collects owned loot far from the ship, and a lost ACK replay does not need the old position',async()=>{
  const current=await row();current.activeShipId='goliath';current.pet={owned:true,level:15,activeGear:'box',gearsOwned:{box:true},protocols:{box:3}};
  await db.query('UPDATE game_saves SET state=$2 WHERE user_id=$1',[uid,current]);
  await db.query("INSERT INTO stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload,expires_at) VALUES($1,'loot_aux_1341','loot','earth:x1',850,0,'{\"resources\":{\"Prometium\":5}}',clock_timestamp()+interval '1 minute')",[uid]);
  let client={room:{key:'earth:x1',map:{battle:false}},player:{x:0,y:0,updatedAt:Date.now(),pet:{owned:true,activeGear:'box',x:850,y:0}}};
  const service=createPlayerRewardsV134({db:supabasePgliteV134(db),readSystems:async()=>({}),readBonus:async()=>({config:{}}),world:()=>({findClient:()=>client})});
  await assert.rejects(()=>service.collect(uid,{drop_id:'loot_aux_1341',request_id:'collect_ship_1341',collector:'ship'}),e=>e.code==='COLLECTION_SHIP_RANGE');
  const first=await service.collect(uid,{drop_id:'loot_aux_1341',request_id:'collect_pet_1341',collector:'pet'});assert.equal(first.ok,true);assert.equal(first.receipt.collector,'pet');assert.equal(first.state.cargo.Prometium,current.cargo.Prometium+5);
  client=null;const replay=await service.collect(uid,{drop_id:'loot_aux_1341',request_id:'collect_pet_1341',collector:'pet'});assert.equal(replay.replayed,true);assert.equal(replay.state.cargo.Prometium,first.state.cargo.Prometium);
 });
 await t.test('two loot transactions cannot overfill cargo when both prepared against the same snapshot',async()=>{
  const base=await row();const used=Object.entries(base.cargo).reduce((n,[k,v])=>n+(k==='Xenomit'?0:Number(v)),0),draft=structuredClone(base);draft.cargo.Prometium+=5;draft.serverPurchaseRevision++;
  for(const suffix of ['a','b'])await db.query("INSERT INTO stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload) VALUES($1,$2,'loot','earth:x1',400,400,'{\"resources\":{\"Prometium\":5}}')",[uid,'loot_capacity_'+suffix]);
  const extra={drop_before:{resources:{Prometium:5}},drop_after:null,cargo_limit:used+6};
  const first=await command('collection',base,draft,{...extra,drop_id:'loot_capacity_a'});assert.equal(first.ok,true);
  const second=await command('collection',base,draft,{...extra,drop_id:'loot_capacity_b'});assert.equal(second.ok,false);assert.equal(second.code,'PLAYER_RETRY');assert.equal((await row()).cargo.Prometium,first.state.cargo.Prometium);
  assert.equal((await db.query("SELECT count(*) n FROM stellar_collection_drops_v134 WHERE drop_id='loot_capacity_b'")).rows[0].n,1);
 });
 await t.test('collection snapshot prunes only expired drops and retains issue and command receipts',async()=>{
  await db.query("INSERT INTO stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload,expires_at) VALUES($1,'loot_expired_1341','loot','earth:x1',400,400,'{}',clock_timestamp()-interval '1 minute'),($1,'loot_live_1341','loot','earth:x1',400,400,'{\"resources\":{\"Prometium\":1}}',clock_timestamp()+interval '1 minute')",[uid]);
  const before=(await db.query('SELECT count(*) n FROM stellar_player_commands_v134')).rows[0].n;
  const snapshot=(await db.query('SELECT stellar_player_collections_snapshot($1,$2,$3,$4,$5) r',[uid,'earth:x1',3,4000,3000])).rows[0].r;
  assert.equal(snapshot.boxes.length,3);assert.ok(snapshot.loot.some(x=>x.id==='loot_live_1341'));assert.ok(!snapshot.loot.some(x=>x.id==='loot_expired_1341'));
  assert.equal((await db.query('SELECT count(*) n FROM stellar_player_commands_v134')).rows[0].n,before);
 });
 await t.test('coupon redemption and NPC award use one balance and a replay never grants twice',async()=>{
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid]);
  await db.exec("INSERT INTO game_coupon_reward_catalog_v193(kind,item_id,name) VALUES('credits','credits','CR');INSERT INTO game_coupons_v193(code,title,rewards,max_uses) VALUES('QA134COUPON','QA','[{\"kind\":\"credits\",\"id\":\"credits\",\"qty\":777}]',20);");
  const before=await row();
  const first=(await db.query("SELECT stellar_player_redeem_game_coupon('QA134COUPON') r")).rows[0].r;assert.equal(first.ok,true);assert.equal(first.state.profile.credits,before.profile.credits+777);
  const replay=(await db.query("SELECT stellar_player_redeem_game_coupon('QA134COUPON') r")).rows[0].r;assert.equal(replay.replayed,true);assert.equal(replay.state.profile.credits,first.state.profile.credits);
  assert.equal(replay.state.serverStateClockV134,(await row()).serverStateClockV134);
 });
 await t.test('pass reward prepared before an NPC award preserves both and replays exactly once',async()=>{
  let injected=false;
  const transport=supabasePgliteV134(db,{beforeRpc:async(name,args)=>{
   if(name==='stellar_player_commit'&&args.p_module==='reward'&&!injected){injected=true;await db.query('SELECT stellar_grant_npc_reward_v228($1,$2,$3,$4,$5)',[uid,'qa134_pass_npc_01','streuner',222,0]);}
  }});
  const before=await row();before.battlePass={season:'qa134-season',points:500,claimedTiers:{}};
  await db.query('UPDATE game_saves SET state=$2 WHERE user_id=$1',[uid,before]);
  const service=createPlayerRewardsV134({db:transport,readPass:async()=>({seasons:[{season_key:'qa134-season',enabled:true,starts_at:new Date(Date.now()-86400000).toISOString(),ends_at:new Date(Date.now()+86400000).toISOString(),points_per_tier:500}],tiers:[{season_key:'qa134-season',tier_no:1,enabled:true,free_reward:{credits:888,ammo:{lcb10:50}}}]}),readPremium:async()=>({battle_pass_active:true})});
  const first=await service.claim(uid,{kind:'pass_free',tier:1,season:'qa134-season'},{});
  assert.equal(first.state.profile.credits,before.profile.credits+888+222);assert.equal(first.state.ammo.lcb10,before.ammo.lcb10+50);
  const replay=await service.claim(uid,{kind:'pass_free',tier:1,season:'qa134-season'},{});assert.equal(replay.replayed,true);assert.equal(replay.state.profile.credits,first.state.profile.credits);
 });
 await t.test('bid round is checked on the server and requests survive lost ACK without a second bid',async()=>{
  const state=await row();state.profile.credits=1000000000;await db.query('UPDATE game_saves SET state=$2 WHERE user_id=$1',[uid,state]);
  await db.exec("INSERT INTO game_auction_rules_v1908(id) VALUES(1);INSERT INTO live_shop_prices_v16(catalog_key,kind,ref_id,price,currency,enabled,shop_visible) VALUES('laser:lf4','laser','lf4',10000,'uridium',true,true);");
  const hour=(await db.query("SELECT to_char(clock_timestamp() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24') h")).rows[0].h;
  const bid=async(id,h=hour)=>(await db.query('SELECT stellar_player_bid($1,$2,$3,$4,$5) r',[id,h,'item:lf4',100000000,{ref:'item:lf4',kind:'item',id:'lf4'}])).rows[0].r;
  await assert.rejects(()=>bid('qa134_bid_oldround','2020-01-01-00'),/AUCTION_ROUND_CLOSED/);
  const first=await bid('qa134_bid_lost_ack');assert.equal(first.ok,true);const replay=await bid('qa134_bid_lost_ack');assert.equal(replay.replayed,true);
  assert.equal((await db.query('SELECT count(*) n FROM auction_bids WHERE user_id=$1',[uid])).rows[0].n,1);
 });
 await t.test('cutover removes table DML and public historical entry points; current aliases retain grants',async()=>{
  await db.exec(read('sql/STELLAR_V134_CUTOVER_ROTAS.sql'));
  await db.exec('SET ROLE authenticated');
  await assert.rejects(()=>db.query('SELECT stellar_player_commit($1,$2,$3,$4,$5)',[uid,'forged_command_1','reward',h,{}]),/permission denied/);
  await assert.rejects(()=>db.exec("UPDATE auction_bids SET status='lost'"),/permission denied/);
  await assert.rejects(()=>db.exec("SELECT redeem_game_coupon_v193('FORGED')"),/permission denied/);
  await db.exec('RESET ROLE');
  const grant=(await db.query("SELECT has_function_privilege('authenticated','public.stellar_player_redeem_game_coupon(text)','EXECUTE') yes")).rows[0].yes;assert.equal(grant,true);
 });
});
test('V134 merge refuses inventory overdrafts and conflicting equipment while preserving unrelated rewards',()=>{
 const b={profile:{credits:100},cargo:{Prometium:10},shipLoadout:{lasers:['lf1']}},n=structuredClone(b),c=structuredClone(b);n.profile.credits-=40;c.profile.credits+=25;assert.equal(mergePlayerStateV134(b,n,c).profile.credits,85);
 n.shipLoadout.lasers=['lf2'];c.shipLoadout.lasers=['lf3'];assert.throws(()=>mergePlayerStateV134(b,n,c),/PLAYER_FIELD_CONFLICT/);
});
test('V134 capacity includes extras, research, equipped AUX and active cargo service',()=>{
 const s={activeShipId:'goliath',shipLoadout:{extras:['cargoCpuElite']},pilotBio:{skills:{logistics:5}},economyBoosts:{cargo:Date.now()+3600000}};
 assert.ok(cargoCapacityV134(s)>10000);assert.equal(levelRewardV134(3).credits,1300000);
});
