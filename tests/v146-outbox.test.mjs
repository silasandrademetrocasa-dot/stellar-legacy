import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {IDBFactory} from 'fake-indexeddb';
import {captureRoutes,database,uid,state} from './fixtures/localfirst-v146.mjs';
import {supabasePgliteV134} from './fixtures/supabase-pglite-v134.mjs';
import {createEconomicScopeV146} from '../server/localfirst-scope-v146.js';
import {createEconomicBatchV146} from '../server/localfirst-batch-v146.js';
import {createEconomicManagerV146} from '../public/modules/economic-manager-v146.js';
import {openLocalSaveV121} from '../public/modules/local-first-save-v121.js';
import {reprojectEconomyV146} from '../public/modules/economy-projector-v146.js';
import {createCollectionProofV146} from '../server/collection-proof-v146.js';
import {collectionAccessV1341} from '../public/modules/collection-access-v1341.js';
import {createPlayerRewardsV134} from '../server/player-rewards-v134.js';
import {operationDigestV125} from '../server/economy-receipts-v125.js';
import {removeRejectedEquipmentV146} from '../public/modules/economic-hangar-v146.js';
import {projectEconomicEventV146} from '../public/modules/economy-projector-v146.js';
import {reconcilePendingEquipmentV109} from '../public/modules/hangar-save-recovery-v109.js';
import vm from 'node:vm';
import {createPurchaseSingleFlightV1451,purchaseNeedsPreflightV1451} from '../public/modules/purchase-flow-v1451.js';
const sql=readFileSync(new URL('../sql/STELLAR_V146_OUTBOX.sql',import.meta.url),'utf8');
const quote={kind:'laser',ref_id:'qa1451',min_level:1,meta:{grant:{kind:'inventory',id:'qa1451',qty:1}}};
async function rig(t){
 const db=await database(t);await db.exec(sql);await db.exec(sql);
 const calls=[],scope=createEconomicScopeV146(),adapter=scope.wrap(supabasePgliteV134(db,{beforeRpc:async name=>calls.push(name)}));
 const routes=captureRoutes(adapter),handlers={catalog:routes.handlers.get('/api/player/purchase'),bulk:routes.handlers.get('/api/player/purchase/bulk'),economy:routes.handlers.get('/api/player/economy')};
 const batch=createEconomicBatchV146({getDb:async()=>adapter,scope,handlers});let http=0;
 const send=async events=>{http++;const req={body:{events},user:{id:uid,email:'qa@test.invalid'},sb:adapter};const res={code:200,status(n){this.code=n;return this;},set(){return this;},json(data){this.data=data;return this;}};await batch(req,res);if(res.code>=400)throw Object.assign(Error(res.data.code),{code:res.data.code});return res.data;};
 const row=async()=>(await db.query('select state from game_saves where user_id=$1',[uid])).rows[0].state;
 return {db,send,row,calls,get http(){return http;}};
}
const event=(device,sequence,extra={})=>({id:randomUUID(),device,sequence,kind:'catalog',body:{catalog_key:'item:qa1451'},expected:{price:100,currency:'credits'},resetEpoch:0,...extra});
test('V146 actual handlers + PostgreSQL: 100 purchases in three HTTP batches, lost ACK, replay and competing device',async t=>{
 const r=await rig(t),device=randomUUID(),events=Array.from({length:100},(_,i)=>event(device,i+1));
 for(let i=0;i<100;i+=40){const answer=await r.send(events.slice(i,i+40));assert.equal(answer.results.length,Math.min(40,100-i));assert.ok(answer.results.every(x=>x.status==='confirmed'));}
 assert.equal(r.http,3);assert.equal((await r.row()).profile.credits,990000);assert.equal((await r.row()).inventory.qa1451,100);
 await r.send(events.slice(0,40));assert.equal((await r.row()).inventory.qa1451,100);
 await assert.rejects(r.send([{...events[0],body:{catalog_key:'item:other'}}]),{code:'OUTBOX_ID_REUSED'});
 const other=event(randomUUID(),1);await r.send([other]);assert.equal((await r.row()).inventory.qa1451,101);
 const skipped=await r.send([event(device,103)]);assert.equal(skipped.results.length,0);assert.equal((await r.row()).inventory.qa1451,101);
 const a=await r.send([event(device,101)]);assert.equal(a.state.serverEconomicAckV146[device],101);
 assert.equal((await r.db.query("select state from stellar_player_save_abc_v118 where user_id=$1 and slot='A'",[uid])).rows[0].state.inventory.qa1451,102);
});
test('V146 changed quote, ADM reset and unauthorized SQL: rejection advances sequence without debit; next valid event survives',async t=>{
 const r=await rig(t),device=randomUUID();let answer=await r.send([event(device,1,{expected:{price:1,currency:'credits'}}),event(device,2)]);
 assert.deepEqual(answer.results.map(x=>x.status),['rejected','confirmed']);assert.equal(answer.results[0].code,'OUTBOX_QUOTE_CHANGED');assert.equal((await r.row()).profile.credits,999900);
 const read=await r.db.query('select stellar_localfirst_read_v146($1) r',[uid]);assert.equal(read.rows[0].r.local_first_v146.enabled,true);
 // A normal checkpoint cannot forge or clear the server cursor.
 await r.db.query("update game_saves set state=state||'{\"serverEconomicAckV146\":{\"forged\":999}}'::jsonb where user_id=$1",[uid]);assert.equal((await r.row()).serverEconomicAckV146.forged,undefined);
 await r.db.query("update game_saves set state=state||'{\"adminResetEpoch\":1}'::jsonb where user_id=$1",[uid]);
 answer=await r.send([event(device,3),event(device,4,{resetEpoch:1})]);assert.equal(answer.results[0].status,'rejected');assert.equal(answer.results[0].code,'OUTBOX_RESET_STALE');assert.equal(answer.results[1].status,'confirmed');assert.equal((await r.row()).profile.credits,999800);
 for(const role of ['anon','authenticated']){await r.db.exec('SET ROLE '+role);try{await assert.rejects(r.db.query('select stellar_localfirst_read_v146($1)',[uid]),{code:'42501'});await assert.rejects(r.db.query('select * from stellar_localfirst_events_v146'),{code:'42501'});}finally{await r.db.exec('RESET ROLE');}}
});
test('V146 IndexedDB manager: offline 100 purchases, reopen, lost server ACK, current cursor avoids double projection',async t=>{
 const r=await rig(t),factory=new IDBFactory(),store=await openLocalSaveV121({indexedDBFactory:factory,name:randomUUID()});t.after(()=>store.close());
 let local=await r.row(),connected=false,lose=true,notices=0;const jobs=new Map();let timer=0;
 const make=()=>{let manager;manager=createEconomicManagerV146({store,owner:uid,getState:()=>local,applyLocal:s=>local=s,applyRemote:s=>local=manager.projectRemote(s),send:async events=>{const answer=await r.send(events);if(lose){lose=false;throw Error('response lost');}return answer;},online:()=>connected,schedule:fn=>{jobs.set(++timer,fn);return timer;},cancel:id=>jobs.delete(id),events:null,notice:n=>{if(n.type==='confirmed')notices++;}});return manager;};
 let manager=make();await manager.start(await r.row(),{available:true});
 for(let i=0;i<100;i++)await manager.enqueue('catalog',{catalog_key:'item:qa1451'},{quote},{price:100,currency:'credits'});
 assert.equal(r.http,0);assert.equal(local.inventory.qa1451,100);assert.equal(local.profile.credits,990000);assert.equal(manager.checkpointBlocked,true);
 manager.stop();manager=make();await manager.start(await r.row(),{available:true});assert.equal(local.inventory.qa1451,100);
 connected=true;assert.equal(await manager.flush(),false);assert.equal(manager.count,100);assert.equal((await r.row()).inventory.qa1451,40);
 // A combat reward snapshot after server commit but before receipt delivery must not project those 40 twice.
 local=manager.projectRemote(await r.row());assert.equal(local.inventory.qa1451,100);
 while(manager.count)assert.equal(await manager.flush(),true);
 assert.equal(notices,100);assert.equal(local.inventory.qa1451,100);assert.equal((await store.economicPending(uid)).length,0);assert.equal(manager.checkpointBlocked,false);
 manager.stop();manager=make();await manager.start(await r.row(),{available:true});assert.equal(local.inventory.qa1451,100);manager.stop();
});
test('V146 isolated economic scope never captures concurrent NPC or another account commits',async()=>{
 const scope=createEconomicScopeV146(),seen=[],db=scope.wrap({rpc:async(name,args)=>{await Promise.resolve();seen.push([name,args]);return {data:{ok:true}};}}),id=randomUUID();
 await Promise.all([scope.run({owner:uid,id,device:randomUUID(),sequence:1,hash:'f'.repeat(64)},async()=>{await Promise.resolve();await db.rpc('stellar_player_commit',{p_user_id:uid});await db.rpc('stellar_player_commit',{p_user_id:randomUUID()});}),db.rpc('stellar_player_commit',{p_user_id:uid})]);
 assert.equal(seen.filter(x=>x[0]==='stellar_localfirst_commit_v146').length,1);assert.equal(seen.filter(x=>x[0]==='stellar_player_commit').length,2);
});
test('V146 signed BOX observation preserves collection reach after movement; forged/cross-account/repeated identity rejected',()=>{
 let now=100000;const proof=createCollectionProofV146('test-secret',{now:()=>now}),body={drop_id:'bonus_drop_123',collector:'ship'},arrival={room:{key:'earth:x1',mapId:'x1',map:{world:{w:4000,h:3000}}},player:{x:100,y:100,updatedAt:now}},token=proof.issue(uid,'session1',body,arrival);
 arrival.player.x=3000;now+=5000;const trusted=proof.verify(uid,{...body,proof:token});assert.equal(collectionAccessV1341(state(),trusted,{map_key:'earth:x1',x:100,y:100}).ok,true);
 assert.throws(()=>proof.verify(randomUUID(),{...body,proof:token}));assert.throws(()=>proof.verify(uid,{...body,drop_id:'other_drop',proof:token}));assert.throws(()=>proof.verify(uid,{...body,proof:token.slice(0,-1)+'!'}));now+=86400001;assert.throws(()=>proof.verify(uid,{...body,proof:token}));
});
test('V146 recovery projector skips terminal cursor and preserves unrelated progress after one rejection',()=>{
 const base=state(),device=randomUUID(),a=event(device,1,{preview:{quote}}),b=event(device,2,{preview:{quote}});base.serverEconomicAckV146={[device]:1};base.missions={done:true};base.inventory.qa1451=1;base.profile.credits-=100;
 const projected=reprojectEconomyV146(base,[a,b]);assert.equal(projected.state.inventory.qa1451,2);assert.equal(projected.state.profile.credits,999800);assert.deepEqual(projected.state.missions,{done:true});
});

test('V146 500 actual collection handlers in 13 batches: signed observation, lost replies, no duplicate reward; NPC rewards keep their authority',async t=>{
 const r=await rig(t),scope=createEconomicScopeV146(),db=scope.wrap(supabasePgliteV134(r.db));let now=Date.now();
 const proofs=createCollectionProofV146('test-key',{now:()=>now}),device=randomUUID();
 const rewards=createPlayerRewardsV134({db,readBonus:async()=>({config:{rewards:[{kind:'credits',min:1,max:1,weight:1}]}}),readSystems:async()=>({}),world:()=>({natal:{active:()=>false}}),secret:'test-key'});
 const arrival={room:{key:'earth:x1',mapId:'x1',map:{world:{w:4000,h:3000}}},player:{x:400,y:400,updatedAt:now}};
 const events=[];
 // Use loot so the fixture does not need season-dependent box configuration. Rewards are server-owned.
 await r.db.query("update game_saves set state=jsonb_set(state,'{activeShipId}','\"goliath\"') where user_id=$1",[uid]);
 for(let i=1;i<=500;i++){
  const drop='v146_loot_'+i;await r.db.query("insert into stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload) values($1,$2,'loot','earth:x1',400,400,'{\"resources\":{\"Prometium\":1}}')",[uid,drop]);
  const body={drop_id:drop,collector:'ship'};body.proof=proofs.issue(uid,'session',body,arrival);events.push(event(device,i,{kind:'collection',body,expected:null}));
 }
 const batch=createEconomicBatchV146({getDb:async()=>db,scope,collectionArrival:(req,body)=>proofs.verify(req.user.id,body),handlers:{collection:async(req,res)=>res.json(await rewards.collect(uid,req.body,null,req.collectionArrivalV146))}});
 let http=0;const send=async items=>{http++;const res={status(){return this;},set(){return this;},json(value){this.data=value;return this;}};await batch({user:{id:uid},body:{events:items}},res);return res.data;};
 for(let i=0;i<500;i+=40){const answer=await send(events.slice(i,i+40));assert.equal(answer.results.length,Math.min(40,500-i));assert.ok(answer.results.every(x=>x.status==='confirmed'),JSON.stringify(answer.results[0]));}
 assert.equal(http,13);assert.equal((await r.row()).cargo.Prometium,500);
 for(let i=0;i<500;i+=40)await send(events.slice(i,i+40));assert.equal((await r.row()).cargo.Prometium,500);
 for(let i=0;i<1000;i++){
  const args=[uid,'v146_npc_reward_'+i,'streuner',1,1];
  assert.equal((await r.db.query('select stellar_grant_npc_reward_v228($1,$2,$3,$4,$5) r',args)).rows[0].r.granted,true);
  assert.notEqual((await r.db.query('select stellar_grant_npc_reward_v228($1,$2,$3,$4,$5) r',args)).rows[0].r.granted,true);
 }
 assert.equal((await r.row()).profile.credits,1001000);assert.equal((await r.row()).profile.uridium,101000);assert.equal((await r.row()).cargo.Prometium,500);
});

test('V146 local ACK failure retains event and replay restores one purchase; no background polling with empty queue',async t=>{
 const r=await rig(t),store=await openLocalSaveV121({indexedDBFactory:new IDBFactory(),name:randomUUID()});t.after(()=>store.close());
 let local=await r.row(),failAck=true,scheduled=0,confirmed=0,manager;
 const wrapped={...store,settleEconomic:async(...args)=>{if(failAck){failAck=false;throw Error('disk interrupted');}return store.settleEconomic(...args);}};
 manager=createEconomicManagerV146({store:wrapped,owner:uid,getState:()=>local,applyLocal:s=>local=s,applyRemote:s=>local=manager.projectRemote(s),send:r.send,schedule:()=>++scheduled,cancel(){},events:null,notice:n=>{if(n.type==='confirmed')confirmed++;}});
 await manager.start(await r.row(),{available:true});assert.equal(scheduled,0);
 await manager.enqueue('catalog',{catalog_key:'item:qa1451'},{quote},{price:100,currency:'credits'});
 assert.equal(await manager.flush(),false);assert.equal((await store.economicPending(uid)).length,1);assert.equal((await r.row()).inventory.qa1451,1);
 assert.equal(await manager.flush(),true);assert.equal(local.inventory.qa1451,1);assert.equal((await store.economicPending(uid)).length,0);
 const before=scheduled;await manager.flush();assert.equal(scheduled,before);manager.stop();assert.equal(confirmed,2); // application notices are idempotent by event ID.
});

test('V146 rejected provisional laser preserves legitimate pending hangar edits and mission completion',()=>{
 const canonical=state();canonical.inventory={legit:2};canonical.missions={completed:{one:123}};
 const buy=event(randomUUID(),1,{preview:{quote}}),baseline=projectEconomicEventV146(canonical,buy),desired=structuredClone(baseline);
 desired.shipLoadout.lasers=['legit','qa1451'];desired.inventory.legit--;desired.inventory.qa1451--;
 const before=removeRejectedEquipmentV146(baseline,[buy]),after=removeRejectedEquipmentV146(desired,[buy]);
 const recovery=reconcilePendingEquipmentV109(canonical,after,before);assert.equal(recovery.ok,true);assert.deepEqual(recovery.state.shipLoadout.lasers.filter(Boolean),['legit']);assert.equal(recovery.state.inventory.legit,1);assert.deepEqual(recovery.state.missions,canonical.missions);
});

test('V146 pending ownership rejection removes only its drone and returns legitimate slots',()=>{
 const buy=event(randomUUID(),1,{preview:{quote:{kind:'drone',ref_id:'iris',meta:{grant:{kind:'drone',id:'iris',slots:2}}}}}),s=projectEconomicEventV146(state(),buy);
 s.drones[0].slots[0]='legit';s.drones.push({id:'existing',type:'iris',slots:['other']});
 const clean=removeRejectedEquipmentV146(s,[buy]);assert.equal(clean.drones.length,1);assert.equal(clean.drones[0].id,'existing');assert.equal(clean.inventory.legit,1);
});

test('V146 bulk, AUTO BUY and sales use actual handlers; quote mismatch never creates sale money',async t=>{
 const r=await rig(t),device=randomUUID();await r.db.query("update game_saves set state=jsonb_set(state,'{cargo}','{\"Prometium\":10}') where user_id=$1",[uid]);
 const events=[
  event(device,1,{kind:'bulk',body:{catalog_key:'ammo:qa1451',quantity:15,expected_price:30,expected_currency:'credits',expected_pack_size:5},expected:{price:30,currency:'credits'}}),
  event(device,2,{kind:'economy',body:{action:'auto_buy',payload:{catalog_key:'ammo:qa1451'}},expected:{price:10,currency:'credits'}}),
  event(device,3),
  event(device,4,{kind:'economy',body:{action:'sell_inventory',payload:{item_id:'qa1451',qty:1}},expected:{price:50,currency:'credits'}}),
  event(device,5,{kind:'economy',body:{action:'sell_cargo',payload:{resource_id:'all',expected_sold:{Prometium:10}}},expected:{price:100,currency:'credits'}})
 ];
 const answer=await r.send(events);assert.ok(answer.results.every(x=>x.status==='confirmed'),JSON.stringify(answer.results));assert.equal(answer.results.length,5);
 assert.equal((await r.row()).profile.credits,1000010);assert.equal((await r.row()).ammo.qa1451,20);assert.equal((await r.row()).inventory.qa1451,undefined);assert.equal((await r.row()).cargo.Prometium,undefined);
 await r.send(events);assert.equal((await r.row()).profile.credits,1000010);
 await r.db.query("update game_saves set state=jsonb_set(state,'{cargo}','{\"Prometium\":2}') where user_id=$1",[uid]);
 const changed=await r.send([event(device,6,{kind:'economy',body:{action:'sell_cargo',payload:{resource_id:'all',expected_sold:{Prometium:10}}},expected:{price:100,currency:'credits'}})]);
 assert.equal(changed.results[0].status,'rejected');assert.equal(changed.results[0].code,'SALE_STOCK_CHANGED');assert.equal((await r.row()).cargo.Prometium,2);
});

test('V146 rollback preserves receipts and enables drain; forged cursor on insert is discarded',async t=>{
 const r=await rig(t),before=await r.send([event(randomUUID(),1)]);await r.db.exec(readFileSync(new URL('../sql/STELLAR_V146_PREFLIGHT.sql',import.meta.url),'utf8'));
 await r.db.exec(readFileSync(new URL('../sql/STELLAR_V146_ROLLBACK.sql',import.meta.url),'utf8'));
 assert.deepEqual(await r.row(),before.state);const cap=(await r.db.query('select stellar_localfirst_read_v146($1) r',[uid])).rows[0].r.local_first_v146;assert.equal(cap.enabled,false);assert.equal(cap.drain,true);
 const newcomer=randomUUID(),s=state();s.accountOwnerId=newcomer;s.serverEconomicAckV146={forged:999};await r.db.query('insert into game_saves(user_id,state) values($1,$2)',[newcomer,s]);
 assert.equal((await r.db.query('select state from game_saves where user_id=$1',[newcomer])).rows[0].state.serverEconomicAckV146,undefined);
 const store=await openLocalSaveV121({indexedDBFactory:new IDBFactory(),name:randomUUID()});t.after(()=>store.close());let local=before.state,manager;
 manager=createEconomicManagerV146({store,owner:uid,getState:()=>local,applyRemote:s=>local=manager.projectRemote(s),send:r.send,events:null});await manager.start(local,{available:true,accepting:false});
 assert.equal(manager.enabled,true);assert.equal(manager.accepting,false);await assert.rejects(manager.enqueue('catalog',{},{}),/OUTBOX_NOT_ENABLED/);manager.stop();
});

test('V146 actual game purchase callback updates durable local stock without HTTP, including 100 consecutive taps',async t=>{
 const store=await openLocalSaveV121({indexedDBFactory:new IDBFactory(),name:randomUUID()});t.after(()=>store.close());let local=state(),manager;
 manager=createEconomicManagerV146({store,owner:uid,getState:()=>local,applyLocal:s=>local=s,applyRemote:s=>local=manager.projectRemote(s),send:()=>assert.fail('must not wait for HTTP'),online:()=>false,events:null});await manager.start(local,{available:true});
 const env={getUser:()=>({id:uid}),getSessionCredentials:()=>({gameSessionId:'one'}),authenticated:true,offlineFarmWorldLockedV84:()=>false,saveIntegrityBlockedV106:false,ECONOMY_V146:manager,
  PURCHASE_FLIGHT_V1451:createPurchaseSingleFlightV1451(),PURCHASE_METRICS_V1451:{start:()=>0,finish(){}},liveQuote:()=>({...quote,price:100,currency:'credits'}),purchaseNeedsPreflightV1451,equipmentSavePendingV109:false,showToast(){}};
 const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8'),start=source.indexOf('async function applyAuthoritativePurchase('),end=source.indexOf('// ===================== V16.5 DESIGNER',start);vm.createContext(env);vm.runInContext(source.slice(start,end),env);
 for(let i=0;i<100;i++)assert.equal(await env.applyAuthoritativePurchase('item:qa1451','Laser'),true);
 assert.equal(local.inventory.qa1451,100);assert.equal(local.profile.credits,990000);assert.equal((await store.economicPending(uid)).length,100);manager.stop();
});

test('V146 two device connections share dense local sequence; tab lock contention retries; drained tab reads canonical once',async t=>{
 const r=await rig(t),factory=new IDBFactory(),name=randomUUID(),a=await openLocalSaveV121({indexedDBFactory:factory,name}),b=await openLocalSaveV121({indexedDBFactory:factory,name});t.after(()=>{a.close();b.close();});
 const initial=await r.row();let sa=initial,sb=initial,ma,mb,reads=0,scheduled=0,available=false;
 ma=createEconomicManagerV146({store:a,owner:uid,getState:()=>sa,applyLocal:s=>sa=s,applyRemote:s=>sa=ma.projectRemote(s),send:r.send,events:null,schedule:()=>1,cancel(){}});
 mb=createEconomicManagerV146({store:b,owner:uid,getState:()=>sb,applyLocal:s=>sb=s,applyRemote:s=>sb=mb.projectRemote(s),send:r.send,readRemote:async()=>{reads++;return r.row();},events:null,schedule:()=>++scheduled,cancel(){},locks:{request:async(n,o,fn)=>fn(available?{}:null)}});
 await ma.start(initial,{available:true});await mb.start(initial,{available:true});
 await Promise.all([ma.enqueue('catalog',{catalog_key:'item:qa1451'},{quote},{price:100,currency:'credits'}),mb.enqueue('catalog',{catalog_key:'item:qa1451'},{quote},{price:100,currency:'credits'})]);
 assert.deepEqual((await a.economicPending(uid)).map(e=>e.sequence),[1,2]);const before=scheduled;assert.equal(await mb.flush(),false);assert.ok(scheduled>=before);
 await ma.flush();available=true;assert.equal(await mb.flush(),true);assert.equal(reads,1);assert.equal(sb.inventory.qa1451,2);assert.equal(sb.profile.credits,999800);ma.stop();mb.stop();
});
