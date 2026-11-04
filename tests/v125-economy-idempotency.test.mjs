import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {operationDigestV125,stableJsonV125,requestIdValidV125,decodeEconomyReceiptV125,replayValidV125} from '../server/economy-receipts-v125.js';
import {createEconomyIntentV125} from '../public/modules/economy-intent-v125.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const user='a5555555-5555-4555-8555-555555555555';
test('V125 canonical digest independent of JSON field ordering',()=>{
 assert.equal(operationDigestV125('economy:sell_cargo',{resource_id:'X',qty:2}),operationDigestV125('economy:sell_cargo',{qty:2,resource_id:'X'}));
 assert.notEqual(operationDigestV125('economy:sell_cargo',{qty:2}),operationDigestV125('economy:sell_cargo',{qty:3}));
 assert.equal(stableJsonV125({b:1,a:2}),'{"a":2,"b":1}');
});
test('V125 local durable retry ID reused and cleared after official ACK',()=>{
 const m=new Map(); const store={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 const uuids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
 const q=createEconomyIntentV125({storage:store,uuid:()=>uuids.shift()});
 const first=q.id(user,'sell_cargo',{resource_id:'Duranium'});
 assert.equal(q.id(user,'sell_cargo',{resource_id:'Duranium'}),first);
 assert.equal(q.pending(user,'sell_cargo',{resource_id:'Duranium'}),first);
 q.done(user,'sell_cargo',{resource_id:'Duranium'},first);
 assert.notEqual(q.id(user,'sell_cargo',{resource_id:'Duranium'}),first);
});
test('V125 receipt fingerprint rejects reused ID for different action',()=>{
 const digest=operationDigestV125('economy:sell_cargo',{resource_id:'A'});
 assert.equal(replayValidV125({operation:'economy:sell_cargo',request_hash:digest},'economy:sell_cargo',digest),true);
 assert.equal(replayValidV125({operation:'economy:sell_inventory',request_hash:digest},'economy:sell_cargo',digest),false);
 assert.equal(requestIdValidV125('aaa-1111-aaaa'),true);
 assert.equal(requestIdValidV125('x'),false);
 assert.equal(decodeEconomyReceiptV125({ok:true,state:{},receipt:{},replayed:true},null).replayed,true);
 assert.equal(decodeEconomyReceiptV125({ok:false,code:'ECONOMY_STALE'},null).ok,false);
});
test('V125 SQL and routes use durable receipt under atomic save transaction',()=>{
 const sql=read('sql/STELLAR_V125_0_ECONOMY_OPERATION_RECEIPTS.sql');const server=read('server/index.js');const game=read('public/game.js');
 assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/FOR UPDATE/);assert.match(sql,/stellar_commit_player_save_v118/);
 assert.match(sql,/PRIMARY KEY \(user_id,request_id\)/);assert.match(sql,/ECONOMY_STALE/);
 assert.match(server,/stellar_commit_economy_operation_v125/);
 assert.match(server,/stellar_economy_receipts_v125/);
 assert.match(server,/p_expected_updated_at:req.economyBaselineV125/);
 assert.match(server,/p_expected_updated_at:saveRow.updated_at/);
 assert.match(server,/const legacyTradeId=tradeAction/);
 assert.match(server,/if\(legacyTradeId\)rememberTradeReceiptV1164/);
 assert.match(game,/ECONOMY_INTENT_V125\.done/);
});
