import test from 'node:test';
import assert from 'node:assert/strict';
import {saveCoreModeV119} from '../server/save-core-v119.js';
import {SAVE_MIGRATION_COVERAGE_V1195,savePromotionReadinessV1195} from '../server/save-promotion-gate-v1195.js';
test('V119.5: enforce is blocked while RPC migrations remain incomplete',()=>{
 assert.equal(saveCoreModeV119('enforce'),'observe');
 const status=savePromotionReadinessV1195({requestedMode:'enforce'});
 assert.equal(status.ready,false);assert.equal(status.effectiveMode,'observe');
 assert.ok(status.pendingModules.includes('farm'));assert.ok(status.pendingModules.includes('pvp_arena'));
});
test('V119.5: migration coverage is an explicit source-controlled checklist',()=>{
 assert.equal(SAVE_MIGRATION_COVERAGE_V1195.length,10);
 assert.ok(SAVE_MIGRATION_COVERAGE_V1195.every(x=>x.module&&x.reason));
 assert.equal(savePromotionReadinessV1195({requestedMode:'enforce',coverage:[{module:'demo',migrated:true}]}).ready,true);
});
