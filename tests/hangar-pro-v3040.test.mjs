import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');

test('prévia de presets não altera o inventário real',()=>{
 assert.match(game,/function battlePresetPreviewV3040/);
 assert.match(game,/inventory:\{\.\.\.progress\.inventory\}/);
});

test('presets incompletos exigem confirmação visual antes de alterar o inventário',()=>{
 const fnStart=game.indexOf('async function applyBattlePresetV3030(kind){');
 assert.ok(fnStart>=0,'O comando de aplicar preset continua assíncrono');
 const guard=game.indexOf('preview.missing>0&&!await stellarConfirmV4776(',fnStart);
 const exchange=game.indexOf('const result=exchangeCombatBuildV2013(',fnStart);
 assert.ok(guard>fnStart&&exchange>guard,'O jogador pode cancelar no modal antes da troca de equipamento');
 assert.doesNotMatch(game,/preview\.missing>0&&\!window\.confirm/);
});

test('Hangar oferece exclusão de preset e comparação de nave',()=>{
 assert.match(game,/function deleteBattlePresetV3040/);
 assert.match(game,/ship-compare-v3040/);
});
