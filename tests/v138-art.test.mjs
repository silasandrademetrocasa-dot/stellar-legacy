import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DESIGNS} from '../public/modules/christmas-v132.js';
import {shipArtV138,droneArtV138} from '../public/modules/entity-art-v138.js';
import {visualDroneV53} from '../public/modules/stellar-astral-expansion-v53.js';
import {entityAssetPath} from '../public/modules/asset-cache.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V138 complete 32-skin catalogue resolves to its own hull and transparent individual files',()=>{
 const manifest=JSON.parse(read('public/assets/v138/manifest.json'));
 assert.equal(DESIGNS.length,32);assert.equal(manifest.exportPixels,2048);assert.equal(manifest.assets.length,50);
 for(const d of DESIGNS){
  const map=shipArtV138(d.eligibility.ship_id,d.design_id),hd=shipArtV138(d.eligibility.ship_id,d.design_id,{detail:true});
  assert.ok(existsSync(new URL('../public'+map,import.meta.url)),d.design_id);
  assert.ok(existsSync(new URL('../public'+hd,import.meta.url)),d.design_id);
  assert.notEqual(shipArtV138('phoenix',d.design_id),map);
  assert.ok(entityAssetPath(map));assert.ok(entityAssetPath(hd));
 }
 const hashes=new Set();
 for(const art of manifest.assets){
  assert.ok(art.nativeWidth>=1000,art.id);assert.ok(art.nativeHeight>=1000,art.id);
  assert.ok(art.alphaCoverage>.1&&art.alphaCoverage<.8,art.id);assert.ok(art.cornerAlpha.every(a=>a<=1),art.id);
  assert.ok(art.bounds[0]>0&&art.bounds[1]>0&&art.bounds[2]<2047&&art.bounds[3]<2047,art.id+' clipped');
  for(const kind of ['hd','map']){const file=readFileSync(new URL('../public'+art[kind].path,import.meta.url));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(createHash('sha256').update(file).digest('hex'),art[kind].sha256);}
  assert.ok(!hashes.has(art.hd.sha256),art.id+' duplicated');hashes.add(art.hd.sha256);
 }
});
test('V138 mixed set bonuses do not force Fury and Aegis to share a purple recolor',()=>{
 const fury={design_id:'drone_fury',bonuses:{damage_per_drone:.015,full_set_shield:.08}};
 const aegis={design_id:'drone_aegis',bonuses:{shield_per_drone:.02,full_set_hp:.08}};
 const titan={design_id:'drone_titan',bonuses:{hp_per_drone:.0125,shield_per_drone:.0125,full_set_damage:.08}};
 assert.equal(visualDroneV53('iris',fury),'drone_c');assert.equal(visualDroneV53('iris',aegis),'drone_b');assert.equal(visualDroneV53('iris',titan),'drone_e');
 for(const d of [fury,aegis,titan])assert.ok(droneArtV138(visualDroneV53('iris',d)));
});
