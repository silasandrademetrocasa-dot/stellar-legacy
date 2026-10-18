import test from 'node:test';import assert from 'node:assert/strict';
import {validateRewardClaimContinuity} from '../server/reward-claim-guard.js';
const old={levelRewards:{claimed:{'2':123}},battlePass:{season:'s1',claimedTiers:{'1':123},premiumClaimedTiers:{'1':234}}};
const copy=()=>structuredClone(old);
test('resgate nao pode sumir para permitir duplicacao',()=>{
 let n=copy();delete n.battlePass.claimedTiers['1'];assert.equal(validateRewardClaimContinuity(n,old).code,'SAVE_PASS_FREE_REPLAY');
 n=copy();delete n.battlePass.premiumClaimedTiers['1'];assert.equal(validateRewardClaimContinuity(n,old).code,'SAVE_PASS_PREMIUM_REPLAY');
 n=copy();delete n.levelRewards.claimed['2'];assert.equal(validateRewardClaimContinuity(n,old).code,'SAVE_LEVEL_CLAIM_ROLLBACK');
});
test('nova temporada reinicia apenas os resgates da temporada, nivel permanece',()=>{
 const n=copy();n.battlePass={season:'s2',claimedTiers:{},premiumClaimedTiers:{}};
 assert.equal(validateRewardClaimContinuity(n,old),null);
});
test('reenvio idempotente nao recusa progresso legítimo',()=>{
 assert.equal(validateRewardClaimContinuity(copy(),old),null);
 const n=copy();n.levelRewards.claimed['3']=123;assert.equal(validateRewardClaimContinuity(n,old),null);
});
