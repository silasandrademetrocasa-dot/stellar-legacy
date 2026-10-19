import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const manifest=read('public/assets/v17/manifest.js');
const game=read('public/game.js');

test('AUX-9 usa spritesheet direcional com fallback seguro',()=>{
  assert.match(manifest,/droneMapSheets:/);
  for(const p of ['public/assets/v17/drones-map/aux9-sheet.webp','public/assets/v17/drones-map/aux9-elite-sheet.webp']) assert.ok(existsSync(new URL(p,root)), `missing ${p}`);
  assert.match(game,/function drawAuxSpriteSheet\(/);
  assert.match(game,/droneMapSheetAsset\(/);
  assert.match(game,/drawAuxSpriteSheet\(sheet,q\.angle\|\|0,size/);
  assert.match(game,/drawAuxSpriteSheet\(sheet,petRuntime\.angle\|\|0,size/);
});
