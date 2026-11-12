import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {supabasePgliteV134} from './fixtures/supabase-pglite-v134.mjs';
import {createPlayerRewardsV134} from '../server/player-rewards-v134.js';
import {boxTargetV142,christmasCoresV142} from '../public/modules/seasonal-boxes-v142.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V142: density applies all day to ordinary, PvP and Universe maps; Astrals always reject',()=>{
 const config={map_counts:{x1:20,x8:20,b41:30,ggAlpha:100}};
 for(const map of ['x1','x2','x3','x4','x5','x6','x7','x8','u1','u2','u3','b41','b42','b43'])assert.ok(boxTargetV142(config,map,{seasonActive:true})>0,map);
 for(const map of ['ggAlpha','ggBeta','ggGamma','invalid'])assert.equal(boxTargetV142(config,map,{seasonActive:true}),0,map);
 assert.equal(boxTargetV142(config,'x1',{gate:true,seasonActive:true}),0);
 assert.equal(boxTargetV142(config,'b41',{seasonActive:true}),30);assert.equal(boxTargetV142(config,'u1'),0);
 assert.equal(christmasCoresV142(()=>.005),2);assert.equal(christmasCoresV142(()=>.03),1);assert.equal(christmasCoresV142(()=>.5),0);
});
test('V142 PostgreSQL: mixed personal drops share normal commit, protection and reward counters',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 for(const f of ['tests/fixtures/v134-schema.sql','tests/fixtures/sql/STELLAR_V134_SAVE_UNICO.sql','tests/fixtures/sql/STELLAR_V134_1_COLETA_LATENCIA.sql','tests/fixtures/v137-live-commit.sql','tests/fixtures/sql/STELLAR_V138_COLETA.sql','sql/STELLAR_V142_BOX_NATAL_UNIFICADA.sql','sql/STELLAR_V142_BOX_NATAL_UNIFICADA.sql'])await db.exec(read(f));
 const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
 const state={accountOwnerId:uid,adminResetEpoch:0,activeShipId:'goliath',mapId:'x1',profile:{callsign:'QA142',faction:'earth',level:10,credits:1000,uridium:100,xp:100000},cargo:{},ammo:{lcb10:100},serverPurchaseRevision:0,pet:{owned:true,level:15,activeGear:'box',gearsOwned:{box:true}}};
 await db.query('INSERT INTO game_saves(user_id,state) VALUES($1,$2)',[uid,state]);await db.query('INSERT INTO game_login_sessions_v1214(user_id,session_id) VALUES($1,$2)',[uid,sid]);
 await db.exec("INSERT INTO stellar_natal_config_v132(id,enabled,starts_at,ends_at) VALUES(1,true,now()-interval '1 day',now()+interval '1 day')");
 const snapshot=async(key,n)=>(await db.query('SELECT stellar_player_collections_snapshot($1,$2,$3,4000,3000) r',[uid,key,n])).rows[0].r;
 await t.test('old backend stays on normal boxes before V142 deployment',async()=>{const before=await snapshot('earth:x1',20);assert.equal(before.boxes.length,20);assert.equal(before.boxes.filter(x=>x.variant==='natal').length,0);});
 await db.exec("SELECT set_config('request.headers','{\"x-stellar-collections\":\"mixed-v142\"}',false)");
 await t.test('20 slots split into 10 normal and 10 Christmas, stable across refresh',async()=>{
  const a=await snapshot('earth:x1',20),b=await snapshot('earth:x1',20);assert.equal(a.boxes.length,20);assert.equal(a.boxes.filter(x=>x.variant==='natal').length,10);assert.deepEqual(a.boxes,b.boxes);
  const p=await snapshot('battle:b41',30);assert.equal(p.boxes.filter(x=>x.variant==='natal').length,15);
  assert.equal((await snapshot('jupiter:u3',20)).boxes.filter(x=>x.variant==='natal').length,10);
  assert.equal((await snapshot('earth:ggAlpha',20)).boxes.length,0);
 });
 const client={room:{key:'earth:x1',mapId:'x1',map:{battle:false,world:{w:4000,h:3000}}},player:{x:0,y:0,updatedAt:Date.now(),pet:{owned:true,activeGear:'box',x:0,y:0}}};
 let race=false;const adapter=supabasePgliteV134(db,{beforeRpc:async name=>{if(name==='stellar_player_commit'&&race){race=false;await db.query('SELECT stellar_grant_npc_reward_v228($1,$2,$3,$4,$5)',[uid,'qa142_npc_race','streuner',777,2]);}}});
 const rewards=createPlayerRewardsV134({db:adapter,world:()=>({findClient:()=>client,natal:{active:()=>true}}),readBonus:async()=>({config:{map_counts:{x1:20},rewards:[{kind:'credits',min:50,max:50,weight:1}],respawn_min_ms:1000,respawn_max_ms:1000}}),readSystems:async()=>({}),secret:'qa142'});
 const target=(await snapshot('earth:x1',20)).boxes.find(x=>x.variant==='natal');Object.assign(client.player,{x:target.x,y:target.y});Object.assign(client.player.pet,{x:target.x,y:target.y});
 let result;
 await t.test('NPC arriving during a Christmas pickup is preserved; collectible pays exactly double',async()=>{
  race=true;result=await rewards.collect(uid,{drop_id:target.id,request_id:'request_qa142_natal',collector:'pet'},sid);assert.equal(result.ok,true);assert.equal(result.receipt.variant,'natal');assert.equal(result.receipt.reward.qty,100);assert.equal(result.state.profile.credits,1877);assert.equal(result.state.profile.uridium,102);
  assert.equal((await db.query('SELECT box FROM stellar_natal_players_v132 WHERE user_id=$1',[uid])).rows[0].box,1);
  assert.equal((await db.query("SELECT count(*) n FROM stellar_natal_counts_v132 WHERE kind='box'")).rows[0].n,1);
 });
 await t.test('lost ACK returns same receipt and current wallet without a second reward/counter',async()=>{
  const replay=await rewards.collect(uid,{drop_id:target.id,request_id:'request_qa142_natal',collector:'pet'},sid);assert.equal(replay.replayed,true);assert.deepEqual(replay.receipt,result.receipt);assert.equal(replay.state.profile.credits,1877);
  assert.equal((await db.query('SELECT box FROM stellar_natal_players_v132 WHERE user_id=$1',[uid])).rows[0].box,1);
  const respawn=await db.query("SELECT count(*) n FROM stellar_collection_drops_v134 WHERE user_id=$1 AND map_key='earth:x1' AND payload->>'variant'='natal'",[uid]);assert.equal(respawn.rows[0].n,10);
  await assert.rejects(rewards.collect(uid,{drop_id:target.id,request_id:'request_qa142_other',collector:'pet'},sid),{code:'COLLECTION_UNAVAILABLE'});
 });
 await t.test('failing seasonal counter rolls back money, consumption, receipt and progress together',async()=>{
  const b=(await snapshot('earth:x1',20)).boxes.find(x=>x.variant==='natal');Object.assign(client.player,{x:b.x,y:b.y});Object.assign(client.player.pet,{x:b.x,y:b.y});
  await db.exec('UPDATE stellar_natal_config_v132 SET enabled=false WHERE id=1');
  await assert.rejects(rewards.collect(uid,{drop_id:b.id,request_id:'request_qa142_rollback',collector:'pet'},sid));
  assert.equal((await db.query('SELECT state FROM game_saves WHERE user_id=$1',[uid])).rows[0].state.profile.credits,1877);
  assert.equal((await db.query('SELECT count(*) n FROM stellar_collection_drops_v134 WHERE drop_id=$1',[b.id])).rows[0].n,1);
  assert.equal((await db.query("SELECT count(*) n FROM stellar_player_commands_v134 WHERE command_id='request_qa142_rollback'")).rows[0].n,0);
  assert.equal((await snapshot('earth:x1',20)).boxes.filter(x=>x.variant==='natal').length,0);
 });
 await t.test('season helper cannot be invoked by player roles',async()=>{
  for(const role of ['anon','authenticated'])assert.equal((await db.query("SELECT has_function_privilege($1,'public.stellar_collection_natal_v142(uuid,text,text,text)','EXECUTE') allowed",[role])).rows[0].allowed,false);
 });
});
