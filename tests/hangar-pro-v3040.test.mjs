import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('prévia de presets não altera o inventário real',()=>{assert.match(game,/function battlePresetPreviewV3040/);assert.match(game,/inventory:\{\.\.\.progress\.inventory\}/)});
test('presets incompletos pedem confirmação e não duplicam itens',()=>{assert.match(game,/preview\.missing>0&&\!window\.confirm/);assert.match(game,/exchangeCombatBuildV2013/)});
test('Hangar oferece exclusão de preset e comparação de nave',()=>{assert.match(game,/function deleteBattlePresetV3040/);assert.match(game,/ship-compare-v3040/)});
