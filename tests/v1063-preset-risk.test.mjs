import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectPresetSafetyV1063,presetWarningV1063,presetStateStampV1063} from '../public/modules/battle-preset-guard-v1063.js';

test('V106.3: detects older FARM preset removing lasers and extras',()=>{
 const report=inspectPresetSafetyV1063({currentLoadout:{lasers:['lf4','lf4','lf4','lf3'],generators:['s1'],extras:['cpu','buy','trade']},proposedLoadout:{lasers:['lf4','lf3'],generators:['s1'],extras:['cpu']}});
 assert.equal(report.categories.lasers.before,4);assert.equal(report.categories.lasers.after,2);
 assert.equal(report.categories.extras.before,3);assert.equal(report.categories.extras.after,1);
 assert.equal(report.removed,4);assert.equal(report.hasReduction,true);
 assert.match(presetWarningV1063('FARM',report),/Lasers: 4 → 2/);
 assert.match(presetWarningV1063('FARM',report),/Extras: 3 → 1/);
});
test('V106.3: same selection needs no confirmation',()=>{
 const state={lasers:['lf2'],generators:['sh'],extras:['cpu']};const report=inspectPresetSafetyV1063({currentLoadout:state,proposedLoadout:structuredClone(state)});
 assert.equal(report.changesEquipment,false);assert.equal(presetWarningV1063('FARM',report),'');
});
test('V106.3: same count different items warns about substitutions',()=>{
 const report=inspectPresetSafetyV1063({currentLoadout:{lasers:['lf2'],extras:['cpu']},proposedLoadout:{lasers:['lf4'],extras:['cpu']}});
 assert.equal(report.removed,1);assert.equal(report.added,1);assert.match(presetWarningV1063('PVE',report),/substituídos/);
});
test('V106.3: records drone/AUX loss and respects old AUX-less preset',()=>{
 const r=inspectPresetSafetyV1063({currentDrones:[{slots:['lf4','lf2']}],proposedDrones:[{slots:['lf4',null]}],currentPet:{lasers:['lf3']},proposedPet:null});
 assert.equal(r.categories.drones.removed,1);assert.equal(r.categories.aux.removed,0);
});
test('V106.3: stale asynchronous confirmation invalidated on any hangar edit',()=>{
 const a={activeShipId:'vengeance',shipLoadout:{lasers:['lf4']},inventory:{},drones:[],pet:null,combatConfigsV2013:{active:1}};
 const before=presetStateStampV1063(a);a.shipLoadout.lasers.push('lf3');assert.notEqual(before,presetStateStampV1063(a));
});
test('V106.3: UI integrates dry-run preflight and distinguishes overwrite',()=>{
 const source=fs.readFileSync(new URL('../public/game.js', import.meta.url),'utf8');
 assert.match(source,/const risk=inspectPresetSafetyV1063\(/);
 assert.match(source,/const warning=presetWarningV1063\(/);
 assert.match(source,/stamp!==presetStateStampV1063\(progress\)/);
 assert.match(source, /save\.textContent=presets\[kind\]\?'SOBRESCREVER':'SALVAR'/);
 assert.match(source,/SOBRESCREVER preset/);
});
