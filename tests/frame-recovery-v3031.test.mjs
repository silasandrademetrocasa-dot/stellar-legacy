import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('loop sempre agenda o próximo quadro, mesmo após uma exceção',()=>{
 const frame=game.slice(game.indexOf('function loop(t){'),game.indexOf('setInterval(()=>{if(document.visibilityState'));
 assert.match(frame,/try\{/);
 assert.match(frame,/catch\(err\)/);
 assert.match(frame,/finally\{requestAnimationFrame\(loop\);\}/);
});
test('renderização de presets isolada do hangar',()=>{
 assert.match(game,/try\{root\.appendChild\(renderPresetToolbarV3030\(\)\);\}catch\(err\)/);
});
