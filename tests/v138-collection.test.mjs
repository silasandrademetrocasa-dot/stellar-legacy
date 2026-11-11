import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {supabasePgliteV134} from './fixtures/supabase-pglite-v134.mjs';
import {createPlayerRewardsV134} from '../server/player-rewards-v134.js';
import {collectWithFallbackV138,collectionTargetAvailableV138} from '../public/modules/collection-transport-v138.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V138 socket fallback keeps the durable id, and business rejection never retries over HTTP',async()=>{
 const body={drop_id:'loot_test_138',request_id:'request_test_138',collector:'pet'};let http=0;
 const socket={collectionV138:true,isOnline:()=>true,collectDropV138:async p=>{assert.deepEqual(p,body);throw Object.assign(Error('disconnect'),{code:'SOCKET_COLLECTION_DISCONNECTED'});}};
 assert.equal(await collectWithFallbackV138(socket,(drop,id,actor)=>{http++;assert.deepEqual([drop,id,actor],Object.values(body));return 42;},body),42);
 socket.collectDropV138=async()=>{throw Object.assign(Error('out of range'),{code:'COLLECTION_PET_RANGE'});};
 await assert.rejects(collectWithFallbackV138(socket,()=>http++,body),{code:'COLLECTION_PET_RANGE'});assert.equal(http,1);
 assert.equal(collectionTargetAvailableV138({id:'box'},new Set(['box'])),false);
 assert.equal(collectionTargetAvailableV138({id:'box',retryAtV134:200},new Set(),100),false);
});
test('V138 PostgreSQL: arrival position, lost ACK, concurrent gains, session and Farm protections',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 for(const file of ['tests/fixtures/v134-schema.sql','sql/STELLAR_V134_SAVE_UNICO.sql','sql/STELLAR_V134_1_COLETA_LATENCIA.sql','tests/fixtures/v137-live-commit.sql','sql/STELLAR_V138_COLETA.sql','sql/STELLAR_V138_COLETA.sql'])await db.exec(read(file));
 const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
 const state={accountOwnerId:uid,adminResetEpoch:0,activeShipId:'goliath',mapId:'x1',profile:{callsign:'QA138',faction:'earth',level:10,credits:1000,uridium:100,xp:100000},cargo:{},ammo:{lcb10:100},serverPurchaseRevision:0,pet:{owned:true,level:15,activeGear:'box',gearsOwned:{box:true}}};
 await db.query('INSERT INTO game_saves(user_id,state) VALUES($1,$2)',[uid,state]);
 await db.query('INSERT INTO game_login_sessions_v1214(user_id,session_id) VALUES($1,$2)',[uid,sid]);
 const client={room:{key:'earth:x1',mapId:'x1',map:{battle:false}},player:{x:0,y:0,updatedAt:Date.now(),pet:{owned:true,activeGear:'box',x:800,y:0}}};
 let move=false,ban=false,session=false,npc=false;
 const adapter=supabasePgliteV134(db,{beforeRpc:async(name)=>{
  if(name==='stellar_collection_context_v138'&&move){client.player.pet.x=0;client.player.x=3000;move=false;}
  if(name==='stellar_player_commit'&&ban){ban=false;await db.query('INSERT INTO account_moderation_v1763(user_id,is_banned) VALUES($1,true) ON CONFLICT(user_id) DO UPDATE SET is_banned=true',[uid]);}
  if(name==='stellar_player_commit'&&session){session=false;await db.query('UPDATE game_login_sessions_v1214 SET session_id=gen_random_uuid() WHERE user_id=$1',[uid]);}
  if(name==='stellar_player_commit'&&npc){npc=false;await db.query('SELECT stellar_grant_npc_reward_v228($1,$2,$3,$4,$5)',[uid,'qa138_npc_during_pickup','streuner',777,2]);}
 }});
 const rewards=createPlayerRewardsV134({db:adapter,world:()=>({findClient:()=>client}),readBonus:async()=>({config:{map_counts:{x1:10},rewards:[{kind:'credits',min:50,max:50,weight:1}]}}),readSystems:async()=>({}),secret:'qa138'});
 const drop=async(id,x=800)=>db.query("INSERT INTO stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload) VALUES($1,$2,'loot','earth:x1',$3,0,'{\"resources\":{\"Prometium\":5}}')",[uid,id,x]);
 const collect=(id,request)=>rewards.collect(uid,{drop_id:id,request_id:request,collector:'pet'},sid);
 await t.test('moving away while the database reads does not invalidate a valid arrival',async()=>{
  await drop('loot_qa138_arrival');move=true;npc=true;
  const r=await collect('loot_qa138_arrival','request_qa138_arrival');assert.equal(r.ok,true);assert.equal(r.state.cargo.Prometium,5);assert.equal(r.state.profile.credits,1777);
  const replay=await collect('loot_qa138_arrival','request_qa138_arrival');assert.equal(replay.replayed,true);assert.equal(replay.state.cargo.Prometium,5);
 });
 await t.test('a different request cannot collect from the ship while AUX is far away',async()=>{
  await drop('loot_qa138_distant');await assert.rejects(collect('loot_qa138_distant','request_qa138_distant'),{code:'COLLECTION_PET_RANGE'});
 });
 await t.test('a replaced session cannot replay a successful receipt',async()=>{
  await db.query('UPDATE game_login_sessions_v1214 SET session_id=gen_random_uuid() WHERE user_id=$1',[uid]);
  await assert.rejects(collect('loot_qa138_arrival','request_qa138_arrival'),{code:'SESSION_REPLACED'});
  await db.query('UPDATE game_login_sessions_v1214 SET session_id=$2 WHERE user_id=$1',[uid,sid]);
 });
 await t.test('ban and session replacement during the read are rejected at commit without deleting loot',async()=>{
  client.player.x=0;client.player.pet.x=800;client.player.updatedAt=Date.now();
  for(const flag of ['ban','session']){
   const id='loot_qa138_'+flag;await drop(id);if(flag==='ban')ban=true;else session=true;
   await assert.rejects(collect(id,'request_qa138_'+flag),{code:flag==='ban'?'ACCOUNT_BANNED':'SESSION_REPLACED'});
   assert.equal((await db.query('SELECT count(*) n FROM stellar_collection_drops_v134 WHERE drop_id=$1',[id])).rows[0].n,1);
   await db.query('DELETE FROM account_moderation_v1763 WHERE user_id=$1',[uid]);await db.query('UPDATE game_login_sessions_v1214 SET session_id=$2 WHERE user_id=$1',[uid,sid]);
  }
 });
 await t.test('socket collection cannot bypass a running offline Farm',async()=>{
  await db.query("INSERT INTO stellar_offline_farm_v484(user_id,status,auto_sell) VALUES($1,'running',false)",[uid]);
  await drop('loot_qa138_farm');
  await assert.rejects(collect('loot_qa138_farm','request_qa138_farm'),{code:'FARM_OFFLINE_ACTIVE'});
  assert.equal((await db.query("SELECT count(*) n FROM stellar_collection_drops_v134 WHERE drop_id='loot_qa138_farm'")).rows[0].n,1);
 });
 await t.test('the two new RPCs are service-only',async()=>{
  for(const role of ['anon','authenticated'])assert.equal((await db.query("SELECT has_function_privilege($1,'public.stellar_collection_context_v138(uuid,uuid,text,text)','EXECUTE') allowed",[role])).rows[0].allowed,false);
 });
});
