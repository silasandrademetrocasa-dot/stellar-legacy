import test from 'node:test';import assert from 'node:assert/strict';import {commitEconomyUnifiedV1332,settleAuctionUnifiedV1332} from '../server/unified-command-v1332.js';
test('cargo and mission economic commits share the same gateway with auction delivery',async()=>{
 const calls=[],db={rpc:async(name,args)=>{calls.push({name,args});return {data:{ok:true}};}};
 for(const action of ['sell_cargo','mission_claim'])await commitEconomyUnifiedV1332(db,{p_user_id:'pilot',p_request_id:'request_'+action,p_request_hash:'a'.repeat(64),p_operation:'economy:'+action,p_expected_updated_at:'2026-01-01',p_state:{cargo:{}},p_callsign:'pilot',p_receipt:{action}});
 await settleAuctionUnifiedV1332(db,{p_user_id:'pilot',p_hour_key:'2026-01-01-00',p_lot_ref:'item:lf1'});
 assert.ok(calls.every(c=>c.name==='stellar_commit_command_v1332'));assert.deepEqual(calls.map(c=>c.args.p_module),['economy','economy','auction']);assert.equal(calls[0].args.p_payload.operation,'economy:sell_cargo');assert.equal(calls[2].args.p_payload.lot_ref,'item:lf1');
 const first=calls[2].args;await settleAuctionUnifiedV1332(db,{p_user_id:'pilot',p_hour_key:'2026-01-01-00',p_lot_ref:'item:lf1'});assert.deepEqual(calls[3].args,first);
});
