import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {saleQuoteV4776} from '../../public/modules/sale-policy-v4776.js';
import {quoteCargoSaleV130} from '../../server/cargo-sale-v130.js';
import {PGlite} from '@electric-sql/pglite';
import {createShopContextV1451} from '../../server/shop-context-v1451.js';
import {supabasePgliteV134} from './supabase-pglite-v134.mjs';
import {validPurchaseIdV123,interpretPurchaseCommitV123} from '../../server/live-purchase-v123.js';
import {operationDigestV125,decodeEconomyReceiptV125,replayValidV125,requestIdValidV125} from '../../server/economy-receipts-v125.js';
import {commitEconomyUnifiedV1332} from '../../server/unified-command-v1332.js';
import {invalidShopArguments} from '../../server/security-guard.js';
import {withEconomySaveRetryV102} from '../../server/pilot-economy-v102.js';
import {tradeRequestIdV1164,findTradeReceiptV1164,rememberTradeReceiptV1164} from '../../server/autotrade-idempotency-v1164.js';
import {quoteBulkPurchase} from '../../public/modules/bulk-purchase-v92.js';
import {applyFormationGrantV1441} from '../../server/formation-shop-v1441.js';
import {purchaseNeedsPreflightV1451,createPurchaseSingleFlightV1451} from '../../public/modules/purchase-flow-v1451.js';
import {createCombatJournalV134} from '../../public/modules/combat-journal-v134.js';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export const uid='14510000-0000-4000-8000-000000000001';
const eligible=row=>row?.currency==='uridium'&&['ship','laser','generator','drone','extra','pet','pet_gear'].includes(row.kind);
export const state=()=>({accountOwnerId:uid,adminResetEpoch:0,profile:{callsign:'QA1451',level:25,faction:'earth',credits:1000000,uridium:100000},ammo:{lcb10:100},rockets:{r310:10},inventory:{},cargo:{},mapId:'x1',territoryFaction:'earth',activeShipId:'goliath',ownedShips:['goliath'],shipLoadout:{lasers:[],generators:[],extras:[]},drones:[],serverPurchaseRevision:0});
export function captureRoutes(db){
 const source=read('server/index.js'),handlers=new Map();
 const context=createShopContextV1451({getDb:async()=>db,readSave:()=>assert.fail('consolidated route must not use legacy save'),readCatalog:()=>assert.fail('consolidated route must not fetch full live ops'),premiumEligible:eligible});
 const env={saleQuoteV4776,quoteCargoSaleV130,loadLiveOpsSnapshot:async()=>({catalog:(await db.from('live_shop_prices_v16').select('*')).data}),loadWorldRuntimeSnapshot:async()=>({resources:[{resource_key:'Prometium',sell_price:10,enabled:true}]}),readEconomySave:async req=>{const r=await db.rpc('stellar_player_read',{p_user_id:uid,p_token:null,p_checkpoint_ids:null});req.economyBaseV134=structuredClone(r.data.state);req.economyBaselineV125=r.data.updated_at;return structuredClone(r.data.state);},ECONOMIC_HANDLERS_V146:{},createEconomicBatchV146:()=>()=>{},ECONOMIC_SCOPE_V146:{},COLLECTION_PROOF_V146:{},Date,JSON,Number,Math,String,Array,Object,Set,structuredClone,randomUUID,console,
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
 const debit=source.indexOf('function debitServer('),credit=source.indexOf('function creditServer(',debit);vm.runInContext(source.slice(debit,source.indexOf('function gameSessionIdFromRequest(',credit)),env);
 for(const [start,end] of [["app.post('/api/player/purchase',",'const BASE_SERVICES_V1783'],["app.post('/api/player/purchase/bulk',","app.post('/api/player/economy',"],["app.post('/api/player/economy',","app.all('/api/save'"]]){
  const a=source.indexOf(start);vm.runInContext(source.slice(a,source.indexOf(end,a)),env);
 }
 const invoke=async(path,body)=>{
  const req={user:{id:uid,email:'qa@test.invalid'},body,sb:db};
  const res={statusCode:200,set(){return this;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
  await handlers.get(path)(req,res);return res.data;
 };
 invoke.handlers=handlers;return invoke;
}
export async function database(t){
 const db=new PGlite();t.after(()=>db.close());
 for(const f of ['tests/fixtures/v134-schema.sql','tests/fixtures/sql/STELLAR_V134_SAVE_UNICO.sql','tests/fixtures/sql/STELLAR_V134_1_COLETA_LATENCIA.sql','tests/fixtures/v137-live-commit.sql','supabase/migrations/20261112030426_combat_tactics_v144.sql','supabase/migrations/20261112140758_formations_shop_hud18_v1441.sql','sql/STELLAR_V145_1_COMPRA_CONTEXTO.sql','sql/STELLAR_V145_1_COMPRA_CONTEXTO.sql'])await db.exec(read(f));
 await db.query('insert into game_saves(user_id,state) values($1,$2)',[uid,state()]);
 await db.query("insert into live_shop_prices_v16(catalog_key,kind,ref_id,price,currency,enabled,meta,shop_visible,min_level) values('item:qa1451','laser','qa1451',100,'credits',true,'{\"grant\":{\"kind\":\"inventory\",\"id\":\"qa1451\",\"qty\":1}}',true,1),('ammo:qa1451','ammo','qa1451',10,'credits',true,'{\"grant\":{\"kind\":\"ammo\",\"id\":\"qa1451\",\"qty\":5}}',true,1) on conflict(catalog_key) do update set price=excluded.price,enabled=true");
 return db;
}
