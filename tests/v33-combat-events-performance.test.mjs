import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {minimapPaintInterval} from '../public/modules/minimap-cadence-v33.js';
import {rankVisibleNpcTargets} from '../public/modules/combat-target-priority.js';
const js=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
test('targeting auto cycle reuses same threat priority without starting auto fire',()=>{
 assert.match(js,/function nearestCombatTarget\(excludeId=null\)\{[\s\S]*rankVisibleNpcTargets\(/);
 assert.match(js,/function manualCycleTargetV32\(\)/);
 const ranked=rankVisibleNpcTargets([{id:'near',hp:1,x:10,y:10},{id:'attacker',hp:1,x:300,y:0,lastAttackPlayerAt:15}],{range:900,visible:()=>true,now:19});
 assert.equal(ranked[0].id,'attacker');
});
test('distant NPC coarse tick never doubles rotation; bosses and events still update',()=>{
 assert.match(js,/if\(decision==='coarse'\)continue;/);
 assert.match(js,/updateBossPhase\(e\)/);
 assert.match(js,/npcPatrolPosition\(/);
});
test('finished local events remove residual enemies, ores and convoy',()=>{
 assert.match(js,/if\(rec\.complete\|\|!galaxyEventEligible\(ev\)\)\{[\s\S]*clearGalaxyEventEntities\(\);/);
 assert.match(js,/function clearGalaxyEventEntities\(\).*?filter\(e=>!e\.eventNpc\)/);
});
test('minimap cadence respects mobile combat and preserves desktop FPS',()=>{
 assert.equal(minimapPaintInterval({mobile:false,quality:'high'}),0);
 assert.equal(minimapPaintInterval({mobile:true,landscape:true,quality:'medium',inCombat:true}),140);
 assert.equal(minimapPaintInterval({mobile:true,landscape:true,quality:'low'}),180);
 assert.match(js,/minimapPaintInterval\(\{mobile:DEVICE_CAPS\.mobile/);
});
test('mobile HUD visuals avoid backdrop filtering without changing model sprites',()=>{
 assert.match(css,/V33 Visual Evolution/);assert.match(css,/-webkit-backdrop-filter:none!important/);
 assert.match(js,/function shipMapAsset\(/);
});
