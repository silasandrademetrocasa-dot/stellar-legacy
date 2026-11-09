import test from 'node:test';import assert from 'node:assert/strict';
import {applyWarfrontActionV135,warfrontShipClassV135} from '../server/warfront-economy-v135.js';
const fresh=()=>({activeShipId:'aegis',warfront:{skillCores:20,blueprints:{lf4:24},skillMastery:{}},inventory:{lf4:3}});
test('craft consumes fragments and cores exactly once per committed draft',()=>{const s=fresh(),r=applyWarfrontActionV135(s,'craft','lf4');assert.equal(r.item_count,4);assert.equal(s.warfront.blueprints.lf4,12);assert.equal(s.warfront.skillCores,18);});
test('craft never mutates original on insufficient balance',()=>{const s=fresh();s.warfront.skillCores=0;assert.throws(()=>applyWarfrontActionV135(s,'craft','lf4'),/insuficientes/);assert.equal(s.inventory.lf4,3);});
test('mastery uses active ship class instead of trusting user payload',()=>{const s=fresh();assert.equal(warfrontShipClassV135('aegis'),'support');assert.throws(()=>applyWarfrontActionV135(s,'mastery','assault'),/nave ativa/);const r=applyWarfrontActionV135(s,'mastery','support');assert.equal(r.level,2);assert.equal(s.warfront.skillCores,18);});
test('mastery maximum blocks extra consumption',()=>{const s=fresh();s.warfront.skillMastery.support=5;assert.throws(()=>applyWarfrontActionV135(s,'mastery','support'),/máxima/);assert.equal(s.warfront.skillCores,20);});
