import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const read=p=>readFileSync(resolve(process.cwd(),p),'utf8');
test('target navigation supports both phone and keyboard without changing autofire',()=>{
 const g=read('public/game.js'),h=read('public/index.html');
 assert.ok(g.includes('manualCycleTargetV32'));assert.ok(g.includes("if(k==='t')"));
 assert.ok(h.includes('id="nextNpcTargetV32"'));
 assert.ok(!g.slice(g.indexOf('function manualCycleTargetV32'),g.indexOf('function autoAcquireNextTarget')).includes('player.laserFiring=true'));
});
test('current NPC target stays on full AI tick, and combat loot logic remains existing',()=>{
 const g=read('public/game.js'); assert.ok(g.includes('e===state.target?{...e,isTarget:true}:e'));
 for(const path of ['public/modules/npc-patrol.js','public/modules/smart-combat-engine.js','server/world.js'])assert.ok(existsSync(path));
});
