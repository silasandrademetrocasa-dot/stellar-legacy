import test from 'node:test';
import assert from 'node:assert/strict';
import {createPurchaseRequestV123,purchaseFailureIsDefinitiveV123} from '../public/modules/economy-request-v123.js';
import {validPurchaseIdV123,interpretPurchaseCommitV123} from '../server/live-purchase-v123.js';
import {readFileSync} from 'node:fs';
const u='a5555555-5555-4555-8555-555555555555',uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V123 request id is stable on retry and rotates after acknowledged purchase',()=>{
 const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 const ids=[uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
 const p=createPurchaseRequestV123({storage,uuid:()=>ids.shift()});
 assert.equal(p.id(u,'ship:aurora'),uuid);
 assert.equal(p.id(u,'ship:aurora'),uuid);
 p.confirmed(u,'ship:aurora','invalid');assert.equal(p.id(u,'ship:aurora'),uuid);
 p.confirmed(u,'ship:aurora',uuid);assert.notEqual(p.id(u,'ship:aurora'),uuid);
});
test('V123 transaction accepts only valid UUIDs and RPC true acknowledgements',()=>{
 assert.equal(validPurchaseIdV123(uuid),true);assert.equal(validPurchaseIdV123('broken'),false);
 assert.equal(interpretPurchaseCommitV123({ok:true,state:{},receipt:{},replayed:true},null).replayed,true);
 assert.equal(interpretPurchaseCommitV123({ok:false,code:'ECONOMY_STALE'},null).ok,false);
 assert.equal(interpretPurchaseCommitV123(null,{code:'42000',message:'error'}).ok,false);
});
test('V123 uncertain network result keeps id but hard invalid input releases it',()=>{
 assert.equal(purchaseFailureIsDefinitiveV123({code:'NETWORK_TIMEOUT'}),false);
 assert.equal(purchaseFailureIsDefinitiveV123({status:503}),false);
 assert.equal(purchaseFailureIsDefinitiveV123({status:409}),false);
 assert.equal(purchaseFailureIsDefinitiveV123({status:400}),true);
});
test('V123 shop route calls durable receipt RPC, never trusts client state',()=>{
 const server=read('server/index.js');
 assert.match(server,/service\.rpc\('stellar_player_commit'/);
 assert.match(server,/p_expected_updated_at:saveRow.updated_at/);
 assert.match(server,/invalidShopArguments\(req.body,\['catalog_key','request_id'\]\)/);
 assert.match(server,/if\(receiptRead.data\)/);
 const sql=read('sql/STELLAR_V123_0_ECONOMIA_COMPRA_IDEMPOTENTE.sql');
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/v_new IS DISTINCT FROM v_old-v_cost/);
 assert.match(sql,/stellar_commit_player_save_v118/);
});
test('V123 farm rechecks settled status after uncertain claim',()=>{
 const ui=read('public/modules/stellar-offline-farm-v484.js');
 assert.match(ui,/const verified=await request\('status',null,'GET'\)/);
 assert.match(ui,/verified\?\.status==='settled'/);
});
