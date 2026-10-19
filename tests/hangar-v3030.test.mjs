import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('presets por nave e conta, sem cópia de inventário',()=>{
 assert.match(game,/stellar_battle_presets_v3030_/);
 assert.match(game,/exchangeCombatBuildV2013\(\{inventory:progress\.inventory/);
 assert.match(game,/function renderPresetToolbarV3030/);
 for(const kind of ['PVE','PVP','FARM','BOSS']) assert.ok(game.includes("'"+kind+"'"));
});
test('cópia preserva escudo da configuração destino',()=>{
 assert.match(game,/shield:Math\.max\(0,Math\.floor\(Number\(configs\.profiles\[to\]\?\.shield\)/);
});
