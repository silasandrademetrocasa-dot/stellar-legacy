import test from 'node:test';import assert from 'node:assert/strict';import {staleSaveAuthoritiesV1331} from '../public/modules/save-freshness-v1331.js';
test('late purchase response cannot undo a newer NPC reward',()=>{assert.deepEqual(staleSaveAuthoritiesV1331({accountOwnerId:'p',serverPurchaseRevision:1,serverNpcRewardRevision:8},{accountOwnerId:'p',serverPurchaseRevision:2,serverNpcRewardRevision:7}),['serverNpcRewardRevision']);});
test('legitimate spending, reset and account changes are not mistaken for rollback',()=>{
 assert.deepEqual(staleSaveAuthoritiesV1331({accountOwnerId:'p',serverPurchaseRevision:1,profile:{credits:100}},{accountOwnerId:'p',serverPurchaseRevision:2,profile:{credits:10}}),[]);
 assert.deepEqual(staleSaveAuthoritiesV1331({accountOwnerId:'p',serverPurchaseRevision:9},{accountOwnerId:'q',serverPurchaseRevision:0}),[]);
 assert.deepEqual(staleSaveAuthoritiesV1331({accountOwnerId:'p',serverPurchaseRevision:9},{accountOwnerId:'p',adminResetEpoch:1}),[]);
});
