import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {GAME_ASSETS} from '../public/assets/v17/manifest.js';
import {directionalIndex,directionalGridForImage} from '../public/modules/sprite-orientation.js';
const P=Math.PI;
test('direções cardeais 32',()=>{
  assert.equal(directionalIndex(-P/2,32),0);
  assert.equal(directionalIndex(0,32),8);
  assert.equal(directionalIndex(P/2,32),16);
  assert.equal(directionalIndex(P,32),24);
  assert.equal(directionalGridForImage(1536,768).frames,32);
});
test('referências 32 direcionais válidas',()=>{
  for(const category of ['shipMapSheets32','droneMapSheets32','npcMapSheets32']){
    const entries=Object.entries(GAME_ASSETS[category]||{});
    for(const [name,url] of entries){assert.ok(existsSync(new URL('../public'+url, import.meta.url)),category+': '+name+': '+url);}
  }
  assert.ok(Object.keys(GAME_ASSETS.shipMapSheets32||{}).length>=40);
});
