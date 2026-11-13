import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createShopContextV1451} from '../server/shop-context-v1451.js';
import {supabasePgliteV134} from './fixtures/supabase-pglite-v134.mjs';
import {validPurchaseIdV123,interpretPurchaseCommitV123} from '../server/live-purchase-v123.js';
import {operationDigestV125,decodeEconomyReceiptV125,replayValidV125,requestIdValidV125} from '../server/economy-receipts-v125.js';
import {commitEconomyUnifiedV1332} from '../server/unified-command-v1332.js';
import {invalidShopArguments} from '../server/security-guard.js';
import {withEconomySaveRetryV102} from '../server/pilot-economy-v102.js';
import {tradeRequestIdV1164,findTradeReceiptV1164,rememberTradeReceiptV1164} from '../server/autotrade-idempotency-v1164.js';
import {quoteBulkPurchase} from '../public/modules/bulk-purchase-v92.js';
import {applyFormationGrantV1441} from '../server/formation-shop-v1441.js';
import {purchaseNeedsPreflightV1451,createPurchaseSingleFlightV1451} from '../public/modules/purchase-flow-v1451.js';
import {createCombatJournalV134} from '../public/modules/combat-journal-v134.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uid='14510000-0000-4000-8000-000000000001';
const eligible=row=>row?.currency==='uridium'&&['ship','laser','generator','drone','extra','pet','pet_gear'].includes(row.kind);
const state=()=>({accountOwnerId:uid,adminResetEpoch:0,profile:{callsign:'QA1451',level:25,faction:'earth',credits:1000000,uridium:100000},ammo:{lcb10:100},rockets:{r310:10},inventory:{},cargo:{},mapId:'x1',territoryFaction:'earth',activeShipId:'goliath',ownedShips:['goliath'],shipLoadout:{lasers:[],generators:[],extras:[]},drones:[],serverPurchaseRevision:0});
function captureRoutes(db){
 const source=read('server/index.js'),handlers=new Map();
 const context=createShopContextV1451({getDb:async()=>db,readSave:()=>assert.fail('consolidated route must not use legacy save'),readCatalog:()=>assert.fail('consolidated route must not fetch full live ops'),premiumEligible:eligible});
 const env={Date,JSON,Number,Math,String,Array,Object,Set,structuredClone,randomUUID,console,
 app:{post(path,...args){handlers.set(path,args.at(-1));}},asyncRoute:f=>f,requireUser(){},OFFLINE_FARM_GUARD_V484(){},
 SHOP_CONTEXT_V1451:context,requireEliteAdmin:async()=>db,invalidShopArguments,validPurchaseIdV123,interpretPurchaseCommitV123,operationDigestV125,commitEconomyUnifiedV1332,decodeEconomyReceiptV125,replayValidV125,quoteBulkPurchase,applyFormationGrantV1441,
 withEconomySaveRetryV102,tradeRequestIdV1164,findTradeReceiptV1164,rememberTradeReceiptV1164,requestIdValidV125,
 normalizeCallsign:s=>s,ensureProfile:()=>assert.fail('existing callsign must not cause profile round trip'),securityService:{report:()=>assert.fail('valid purchase reported')},
 liveCatalogRow:(snapshot,key)=>(snapshot?.catalog||[]).find(x=>x.catalog_key===key&&x.enabled),
 premiumDiscountEligible:eligible,writeVerifiedSave:()=>assert.fail('non-idempotent write'),
 };
 vm.createContext(env);
 const grantStart=source.indexOf('function applyLiveGrant('),lockEnd=source.indexOf('const GATE_SERVER_DEFS',grantStart);
 vm.runInContext('const livePurchaseLocks=new Map();\n'+source.slice(grantStart,lockEnd),env);
 const debit=source.indexOf('function debitServer('),credit=source.indexOf('function creditServer(',debit);vm.runInContext(source.slice(debit,credit),env);
 for(const [start,end] of [["app.post('/api/player/purchase',",'const BASE_SERVICES_V1783'],["app.post('/api/player/purchase/bulk',","app.post('/api/player/economy',"],["app.post('/api/player/economy',","app.all('/api/save'"]]){
  const a=source.indexOf(start);vm.runInContext(source.slice(a,source.indexOf(end,a)),env);
 }
 return async(path,body)=>{
  const req={user:{id:uid,email:'qa@test.invalid'},body,sb:db};
  const res={statusCode:200,set(){return this;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
  await handlers.get(path)(req,res);return res.data;
 };
}
async function database(t){
 const db=new PGlite();t.after(()=>db.close());
 for(const f of ['tests/fixtures/v134-schema.sql','tests/fixtures/sql/STELLAR_V134_SAVE_UNICO.sql','tests/fixtures/sql/STELLAR_V134_1_COLETA_LATENCIA.sql','tests/fixtures/v137-live-commit.sql','supabase/migrations/20261112030426_combat_tactics_v144.sql','supabase/migrations/20261112140758_formations_shop_hud18_v1441.sql','sql/STELLAR_V145_1_COMPRA_CONTEXTO.sql','sql/STELLAR_V145_1_COMPRA_CONTEXTO.sql'])await db.exec(read(f));
 await db.query('insert into game_saves(user_id,state) values($1,$2)',[uid,state()]);
 await db.query("insert into live_shop_prices_v16(catalog_key,kind,ref_id,price,currency,enabled,meta,shop_visible,min_level) values('item:qa1451','laser','qa1451',100,'credits',true,'{\"grant\":{\"kind\":\"inventory\",\"id\":\"qa1451\",\"qty\":1}}',true,1),('ammo:qa1451','ammo','qa1451',10,'credits',true,'{\"grant\":{\"kind\":\"ammo\",\"id\":\"qa1451\",\"qty\":5}}',true,1) on conflict(catalog_key) do update set price=excluded.price,enabled=true");
 return db;
}
test('V145.1 actual purchase handlers: 100 catalog purchases and 100 bulk purchases need two RPCs each and never charge a replay twice',async t=>{
 const db=await database(t),calls=[];const adapter=supabasePgliteV134(db,{beforeRpc:async(name)=>calls.push(name)}),invoke=captureRoutes(adapter);
 const row=async()=>(await db.query('select state from game_saves where user_id=$1',[uid])).rows[0].state;
 let first;
 for(let i=0;i<100;i++){
  const id=randomUUID();const start=calls.length;const r=await invoke('/api/player/purchase',{catalog_key:'item:qa1451',request_id:id});
  assert.equal(r.ok,true);assert.equal(r.purchase_context,'consolidated');assert.deepEqual(calls.slice(start),['stellar_shop_context_v1451','stellar_player_commit']);if(i===0)first=id;
 }
 assert.equal((await row()).inventory.qa1451,100);assert.equal((await row()).profile.credits,990000);
 // Even a disabled product remains replayable: no extra debit, one read RPC only.
 await db.exec("update live_shop_prices_v16 set enabled=false where catalog_key='item:qa1451'");
 const start=calls.length;const replay=await invoke('/api/player/purchase',{catalog_key:'item:qa1451',request_id:first});assert.equal(replay.replayed,true);assert.equal(calls.length-start,1);assert.equal(replay.state.profile.credits,990000);
 await assert.rejects(invoke('/api/player/purchase',{catalog_key:'item:other',request_id:first}),{code:'COMMAND_ID_REUSED'});
 for(let i=0;i<100;i++){
  const start=calls.length,id=randomUUID();const r=await invoke('/api/player/purchase/bulk',{catalog_key:'ammo:qa1451',quantity:5,request_id:id,expected_price:10,expected_currency:'credits',expected_pack_size:5});
  assert.equal(r.ok,true);assert.deepEqual(calls.slice(start),['stellar_shop_context_v1451','stellar_player_commit']);
  const again=await invoke('/api/player/purchase/bulk',{catalog_key:'ammo:qa1451',quantity:5,request_id:id,expected_price:10,expected_currency:'credits',expected_pack_size:5});assert.equal(again.purchase.replayed,true);
 }
 const final=await row();assert.equal(final.profile.credits,989000);assert.equal(final.ammo.qa1451,500);
 const backup=(await db.query("select state from stellar_player_save_abc_v118 where user_id=$1 and slot='A'",[uid])).rows[0].state;assert.deepEqual(backup,final);
});
test('context current price/Premium; roles denied; invoker helper and rollback preserve save and receipts',async t=>{
 const db=await database(t);await db.query('insert into premium_accounts_v12(user_id,premium_until) values($1,now()+interval \'1 hour\')',[uid]);
 await db.exec("update live_shop_prices_v16 set currency='uridium',price=200 where catalog_key='item:qa1451'");
 const args=[uid,randomUUID(),'item:qa1451',false];const ctx=async()=>(await db.query('select stellar_shop_context_v1451($1,$2,$3,$4) r',args)).rows[0].r;
 assert.equal((await ctx()).premium_active,true);assert.equal(Number((await ctx()).catalog.price),200);
 const invoke=captureRoutes(supabasePgliteV134(db));const premiumId=randomUUID();const bought=await invoke('/api/player/purchase',{catalog_key:'item:qa1451',request_id:premiumId});assert.equal(bought.purchase.price,190);assert.equal(bought.state.profile.uridium,99810);
 await db.exec("update live_shop_prices_v16 set price=999 where catalog_key='item:qa1451'");const recovered=await invoke('/api/player/purchase',{catalog_key:'item:qa1451',request_id:premiumId});assert.equal(recovered.purchase.price,190);assert.equal(recovered.state.profile.uridium,99810);
 for(const role of ['anon','authenticated']){await db.exec('SET ROLE '+role);try{await assert.rejects(ctx(),{code:'42501'});}finally{await db.exec('RESET ROLE');}}
 await db.exec('GRANT SELECT ON game_saves,stellar_economy_receipts_v125,stellar_live_purchase_receipts_v123 TO service_role; SET ROLE service_role');try{assert.equal((await ctx()).save.state.profile.credits,1000000);}finally{await db.exec('RESET ROLE');}
 const before=(await db.query('select state from game_saves where user_id=$1',[uid])).rows[0].state;
 await db.exec(read('sql/STELLAR_V145_1_COMPRA_ROLLBACK.sql'));assert.deepEqual((await db.query('select state from game_saves where user_id=$1',[uid])).rows[0].state,before);
});
test('parallel fallback has one receipt read, does not cache finances, and recovers receipts with catalog/Premium unavailable',async()=>{
 let rpc=0,receipt=0,save=0,catalog=0,premium=0;const owner={user:{id:uid},sb:{rpc:async()=>{premium++;return {data:{premium_active:false}};}}};
 const builder={select(){return this;},eq(){return this;},maybeSingle(){receipt++;return Promise.resolve({data:null,error:null});}};
 const db={rpc:async()=>{rpc++;return {error:{code:'PGRST202',message:'Function public.stellar_shop_context_v1451 not found'}};},from:()=>builder};
 const context=createShopContextV1451({getDb:async()=>db,readSave:async()=>{save++;return {data:{state:state()}};},readCatalog:async()=>{catalog++;return {catalog:[{catalog_key:'item:qa',kind:'laser',currency:'credits'}]};},premiumEligible:eligible});
 for(let i=0;i<2;i++)assert.equal((await context(owner,{catalogKey:'item:qa',requestId:randomUUID()})).source,'legacy');
 assert.equal(rpc,1);assert.equal(receipt,2);assert.equal(save,2);assert.equal(catalog,2);assert.equal(premium,2);
 builder.maybeSingle=()=>Promise.resolve({data:{catalog_key:'item:qa',receipt:{price:5}}});
 owner.sb.rpc=async()=>{throw Error('premium down');};
 const recover=createShopContextV1451({getDb:async()=>db,readSave:async()=>({data:{state:state()}}),readCatalog:async()=>{throw Error('catalog down');},premiumEligible:eligible});
 assert.equal((await recover(owner,{catalogKey:'item:qa',requestId:randomUUID()})).receipt.receipt.price,5);
});
test('non-missing helper errors fail closed and never start legacy requests',async()=>{
 const context=createShopContextV1451({getDb:async()=>({rpc:async()=>({error:{code:'42501',message:'denied'}})}),readSave:()=>assert.fail(),readCatalog:()=>assert.fail()});
 await assert.rejects(context({user:{id:uid}},{catalogKey:'item:qa',requestId:randomUUID()}),{status:503,code:'42501'});
});
test('preflight only on ownership-changing purchases with unsaved gear; single flight consolidates rapid taps and releases after failure',async()=>{
 for(const kind of ['ammo','rocket','laser','generator','extra','drone_formation','pet_gear'])assert.equal(purchaseNeedsPreflightV1451({kind,pendingEquipment:true}),false);
 for(const kind of ['ship','drone','pet']){assert.equal(purchaseNeedsPreflightV1451({kind,pendingEquipment:true}),true);assert.equal(purchaseNeedsPreflightV1451({kind,pendingEquipment:false}),false);}
 const queue=createPurchaseSingleFlightV1451();let calls=0,release;const task=()=>{calls++;return new Promise(r=>release=r);};const a=queue.run('owner:sku',task),b=queue.run('owner:sku',task);assert.equal(a,b);await Promise.resolve();assert.equal(calls,1);release(1);await a;
 await assert.rejects(queue.run('owner:sku',async()=>{throw Error('lost ACK');}));assert.equal(queue.has('owner:sku'),false);
});
test('buying with pending ammo consumption does not need a pre-save or refund spent ammo',()=>{
 const storage=new Map(),journal=createCombatJournalV134({key:'qa',storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 journal.spend('ammo','lcb10',20);assert.equal(journal.reconcile({ammo:{lcb10:200}}).ammo.lcb10,180);
 journal.spend('ammo','lcb10',5);assert.equal(journal.reconcile({ammo:{lcb10:200}}).ammo.lcb10,175);
});

test('actual client purchase callback does not wait for a mission/ammo/cargo save; rapid taps send one request and apply a receipt once',async()=>{
 const source=read('public/game.js'),a=source.indexOf('async function applyAuthoritativePurchase('),b=source.indexOf('// ===================== V16.5 DESIGNER',a);
 let requests=0,installs=0,release;
 const env={getUser:()=>({id:uid}),getSessionCredentials:()=>({gameSessionId:'one'}),authenticated:true,offlineFarmWorldLockedV84:()=>false,saveIntegrityBlockedV106:false,
 PURCHASE_FLIGHT_V1451:createPurchaseSingleFlightV1451(),PURCHASE_METRICS_V1451:{start:()=>0,finish(){}},LIVE_PURCHASE_KEYS_V123:{id:()=>randomUUID(),confirmed(){},rejected(){}},
 liveQuote:()=>({kind:'laser'}),purchaseNeedsPreflightV1451,equipmentSavePendingV109:false,flushCloudSave:()=>assert.fail('purchase must not pre-save missions or ammo'),
 progress:state(),purchaseLiveCatalogOnline:async()=>{requests++;return await new Promise(r=>release=r);},
 installEconomyState:()=>{installs++;},telemetryTrackEconomyTransition(){},cloudDirty:true,combatJournalV134:()=>({pending:true}),AMMO_SELECTION_V1061:{pending:true},pendingCargoV1333:()=>({pending:true}),missionSavePendingV105:true,
 stageLocalFirstSnapshotV121(){},LEGACY_MIRROR_V122:{stage(){}},saveKey:()=>'',LOCAL_FIRST_FOREGROUND_V122:{notify(){}},computeStats(){},buildAmmoButtons(){},renderShop(){},refreshPetViews(){},updateUI(){},showToast(){},purchaseFailureIsDefinitiveV123:()=>false};
 vm.createContext(env);vm.runInContext(source.slice(a,b),env);
 const first=env.applyAuthoritativePurchase('item:qa','Laser'),second=env.applyAuthoritativePurchase('item:qa','Laser');await Promise.resolve();await Promise.resolve();assert.equal(requests,1);release({state:state(),purchase:{price:100}});
 assert.equal(await first,true);assert.equal(await second,true);assert.equal(installs,1);assert.equal(env.cloudDirty,true);
});
test('pending hangar layout survives purchased inventory without a pre-save',async()=>{
 const {reconcilePendingEquipmentV109}=await import('../public/modules/hangar-save-recovery-v109.js');
 const base=state();base.inventory={lf4:1};const desired=structuredClone(base);desired.inventory={lf4:0};desired.shipLoadout.lasers=['lf4'];
 const remote=structuredClone(base);remote.inventory.lf4=2;
 const merged=reconcilePendingEquipmentV109(remote,desired,base);assert.equal(merged.ok,true);assert.deepEqual(merged.state.shipLoadout.lasers,['lf4']);assert.equal(merged.state.inventory.lf4,1);
});

test('actual auto-buy handler uses consolidated context plus commit, checks base/CPU and remains idempotent',async t=>{
 const db=await database(t),calls=[],adapter=supabasePgliteV134(db,{beforeRpc:async(name)=>calls.push(name)}),invoke=captureRoutes(adapter);
 const id=randomUUID(),request={action:'auto_buy',payload:{catalog_key:'ammo:qa1451'},request_id:id};
 const r=await invoke('/api/player/economy',request);assert.equal(r.ok,true);assert.equal(r.info.id,'qa1451');assert.equal(r.state.ammo.qa1451,5);assert.deepEqual(calls,['stellar_shop_context_v1451','stellar_player_commit']);
 const replay=await invoke('/api/player/economy',request);assert.equal(replay.deduplicated,true);assert.equal(replay.state.ammo.qa1451,5);
 const next=structuredClone(replay.state);next.mapId='x2';await db.query('update game_saves set state=$2 where user_id=$1',[uid,next]);
 await assert.rejects(invoke('/api/player/economy',{...request,request_id:randomUUID()}),{status:403});
});
