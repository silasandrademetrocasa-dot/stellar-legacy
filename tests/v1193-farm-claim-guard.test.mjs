import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarmClaimGateV1193,isFarmConfirmedV1193,farmCrossesUtcDayV1193} from '../server/save-farm-safety-v1193.js';
const source=readFileSync(new URL('../server/offline-farm-v484.js',import.meta.url),'utf8');
test('V119.3: same-account simultaneous claim blocked until finally',()=>{
 const gate=createFarmClaimGateV1193();
 assert.equal(gate.enter('user-a'),true);assert.equal(gate.enter('user-a'),false);
 assert.equal(gate.enter('user-b'),true);gate.leave('user-a');
 assert.equal(gate.enter('user-a'),true);assert.equal(gate.count(),2);
});
test('V119.3: unconfirmed farm cannot clear active cache',()=>{
 assert.equal(isFarmConfirmedV1193('claim',{ok:false,status:'completed'}),false);
 assert.equal(isFarmConfirmedV1193('claim',{ok:true,status:'running'}),false);
 assert.equal(isFarmConfirmedV1193('claim',{ok:true,status:'settled'}),true);
 assert.equal(isFarmConfirmedV1193('start',{status:'running'}),true);
});
test('V119.3: across midnight detected in UTC',()=>{
 assert.equal(farmCrossesUtcDayV1193('2026-11-03T22:30:00Z','2026-11-04T06:30:00Z'),true);
 assert.equal(farmCrossesUtcDayV1193('2026-11-03T06:30:00Z','2026-11-03T08:30:00Z'),false);
 assert.equal(farmCrossesUtcDayV1193('invalid','2026-11-04'),false);
});
test('V119.3: gate releases in finally; SQL still owns reward calculation',()=>{
 assert.match(source,/finally\{if\(claimGateEntered\)FARM_CLAIM_GATE_V1193\.leave/);
 assert.match(source,/sb\.rpc\(fn,\{p_user:req\.user\.id,\.\.\.args\}\)/);
 assert.match(source,/FARM_CLAIM_IN_PROGRESS/);
});
