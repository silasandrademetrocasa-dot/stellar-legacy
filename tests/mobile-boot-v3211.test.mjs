import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('mobile mode starts after HUD layout state declaration',()=>{
 const init=game.indexOf('setupMobileCombatCompact();');
 const state=game.indexOf('let hudLayoutPendingV2024=false;');
 assert.ok(state>=0 && init>state);
 assert.equal(game.match(/setupMobileCombatCompact\(\);/g)?.length,1);
});
