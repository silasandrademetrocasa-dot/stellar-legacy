/** Real PostgreSQL fixture tests. These are not Render load measurements or on-device tests. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V145 stress: 100 server-side purchase intents, 500 persisted collections, 1000 NPC rewards and lost ACK replays',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 for(const f of ['tests/fixtures/v134-schema.sql','tests/fixtures/sql/STELLAR_V134_SAVE_UNICO.sql','tests/fixtures/sql/STELLAR_V134_1_COLETA_LATENCIA.sql'])await db.exec(read(f));
 await db.exec(read('sql/STELLAR_V145_PREFLIGHT.sql'));await db.exec(read('sql/STELLAR_V145_ROLLBACK.sql'));
 const owner='14500000-0000-4000-8000-000000000001',initial={accountOwnerId:owner,adminResetEpoch:0,profile:{callsign:'Stress145',faction:'earth',level:10,credits:100000,uridium:100,xp:0},ammo:{lcb10:0},cargo:{},inventory:{},serverPurchaseRevision:0};
 await db.query('insert into game_saves(user_id,state) values($1,$2)',[owner,initial]);
 const row=async()=>(await db.query('select state from game_saves where user_id=$1',[owner])).rows[0].state;
 const commit=async(id,module,payload)=>(await db.query('select stellar_player_commit($1,$2,$3,$4,$5) r',[owner,id,module,'a'.repeat(64),payload])).rows[0].r;
 await t.test('100 supply purchase intents and 100 duplicate requests debit once each',async()=>{
  for(let i=0;i<100;i++){
   const base=await row(),state=structuredClone(base);state.profile.credits-=10;state.ammo.lcb10+=5;state.serverPurchaseRevision++;
   const p={base,state,operation:'economy:auto_buy',receipt:{info:{id:'lcb10',qty:5,price:10}}},id='stress145_purchase_'+i;
   assert.equal((await commit(id,'economy',p)).ok,true);assert.equal((await commit(id,'economy',p)).replayed,true);
  }
  const s=await row();assert.equal(s.profile.credits,99000);assert.equal(s.ammo.lcb10,500);
 });
 await t.test('500 distinct loot boxes and 500 lost ACK replays leave no duplicated cargo',async()=>{
  for(let i=0;i<500;i++){
   const drop='stress145_loot_'+i;await db.query("insert into stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload) values($1,$2,'loot','earth:x1',400,400,'{\"resources\":{\"Prometium\":1}}')",[owner,drop]);
   const base=await row(),state=structuredClone(base);state.cargo.Prometium=(state.cargo.Prometium||0)+1;state.serverPurchaseRevision++;
   const p={base,state,drop_id:drop,drop_before:{resources:{Prometium:1}},drop_after:null,receipt:{kind:'loot',picked:{Prometium:1}}},id='stress145_collect_'+i;
   assert.equal((await commit(id,'collection',p)).ok,true);assert.equal((await commit(id,'collection',p)).replayed,true);
  }
  assert.equal((await row()).cargo.Prometium,500);assert.equal((await db.query('select count(*)::integer n from stellar_collection_drops_v134 where user_id=$1',[owner])).rows[0].n,0);
 });
 await t.test('1000 NPCs plus duplicate reward delivery grant each payout once',async()=>{
  for(let i=0;i<1000;i++){
   const args=[owner,'stress145_npc_'+i,'streuner',1,1];
   const first=(await db.query('select stellar_grant_npc_reward_v228($1,$2,$3,$4,$5) r',args)).rows[0].r;assert.equal(first.granted,true);
   const duplicate=(await db.query('select stellar_grant_npc_reward_v228($1,$2,$3,$4,$5) r',args)).rows[0].r;assert.notEqual(duplicate.granted,true);
  }
  const s=await row();assert.equal(s.profile.credits,100000);assert.equal(s.profile.uridium,1100);assert.equal(s.ammo.lcb10,500);assert.equal(s.cargo.Prometium,500);
  const backup=(await db.query("select state from stellar_player_save_abc_v118 where user_id=$1 and slot='A'",[owner])).rows[0].state;assert.deepEqual(backup,s);
 });
});
