import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAuctionSingleFlightV1194,auctionSettlementKeyV1194} from '../server/save-auction-coalesce-v1194.js';
test('V119.4: two concurrent settlement calls share one database operation',async()=>{
 const gate=createAuctionSingleFlightV1194();let calls=0;
 const key=auctionSettlementKeyV1194('u1','2026-11-04-23','ship:nova');
 const p=gate.run(key,async()=>{calls++;await Promise.resolve();return {ok:true};});
 const q=gate.run(key,async()=>{calls++;return {ok:false};});
 assert.equal(p,q);assert.deepEqual(await Promise.all([p,q]),[{ok:true},{ok:true}]);
 assert.equal(calls,1);assert.equal(gate.size(),0);
});
test('V119.4: distinct account/lot settlements remain distinct',async()=>{
 const gate=createAuctionSingleFlightV1194();let calls=0;
 await Promise.all([
  gate.run(auctionSettlementKeyV1194('u1','h','lot1'),()=>{calls++;return 'one';}),
  gate.run(auctionSettlementKeyV1194('u2','h','lot1'),()=>{calls++;return 'two';}),
  gate.run(auctionSettlementKeyV1194('u1','h','lot2'),()=>{calls++;return 'three';})]);
 assert.equal(calls,3);
});
test('V119.4: failures clear pending key and allow SQL to review retry',async()=>{
 const gate=createAuctionSingleFlightV1194();
 await assert.rejects(gate.run('k',()=>{throw Error('test');}),/test/);
 assert.equal(gate.size(),0);assert.equal(await gate.run('k',()=>42),42);
});
test('V119.4: auction route uses singleflight plus existing SQL settlement v1182',()=>{
 const source=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
 assert.match(source,/AUCTION_SINGLE_FLIGHT_V1194\.run/);
 assert.match(source,/settleAuctionUnifiedV1332/);
 assert.match(source,/withPurchaseLock\(req\.user\.id/);
});
