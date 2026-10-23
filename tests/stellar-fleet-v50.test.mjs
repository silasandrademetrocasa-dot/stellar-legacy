import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ALLOWED_SHIPS_V50,isShipAllowedV50,ensureAllowedShipSaveV50,decodeGlb} from '../public/modules/stellar-ship3d-v50.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const dir=path.join(root,'../public/assets/ships3d/v50');
const manifest=JSON.parse(fs.readFileSync(dir+'/manifest.json','utf8'));
test('catálogo mantém apenas 13 naves oficiais',()=>{
 assert.equal(Object.keys(ALLOWED_SHIPS_V50).length,13);
 assert.equal(manifest.length,13);
 for(const ship of manifest){assert(isShipAllowedV50(ship.game_ship_id));assert.equal(ALLOWED_SHIPS_V50[ship.game_ship_id],ship.name);}
 assert(!isShipAllowedV50('spectrum'));assert(!isShipAllowedV50('pusat'));
});
test('migração Aurora preserva patrimônio e equipamentos e é idempotente',()=>{
 const a={activeShipId:'spectrum',ownedShips:['spectrum','goliath'],shipLoadout:{lasers:['arc4'],generators:['sh3'],extras:[]},inventory:{arc3:2},credits:123,combatConfigsV2013:{test:true},repairRequired:{shipId:'spectrum',source:'map'}};
 const orig=structuredClone(a);
 assert(ensureAllowedShipSaveV50(a));
 assert.equal(a.activeShipId,'phoenix');assert.equal(a.repairRequired.shipId,'phoenix');assert.deepEqual(a.shipLoadout,orig.shipLoadout);
 assert.deepEqual(a.inventory,orig.inventory);assert.deepEqual(a.combatConfigsV2013,orig.combatConfigsV2013);
 assert(a.ownedShips.includes('spectrum')&&a.ownedShips.includes('phoenix'));
 assert(!ensureAllowedShipSaveV50(a));assert.equal(a.ownedShips.filter(x=>x==='phoenix').length,1);
});
test('GLB reais carregam malhas 3D, não imagens',()=>{
 for(const ship of manifest){
  const name='SL_'+ship.name.toUpperCase()+'_LOD.glb';
  const buffer=fs.readFileSync(path.join(dir,name));
  const b=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
  const parts=decodeGlb(b);
  assert(parts.length>=1&&parts.length<=7,name);
  const count=parts.reduce((sum,p)=>sum+p.indices.length/3,0);
  assert.equal(count,ship.lod_triangles,`Triângulos da ${ship.name}`);
  for(const part of parts){assert(part.positions.length>6 && part.indices.length>=3);assert(part.indices.every(i=>i<part.positions.length/3));}
 }
});
