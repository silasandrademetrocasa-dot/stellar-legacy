import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {decodeGlb} from '../public/modules/stellar-ship3d-v50.js';
import {ASTRAL53,SPRITE53,baseIdV53,portalIdV53,visualDroneV53,shipPivotV53} from '../public/modules/stellar-astral-expansion-v53.js';
const root=resolve(import.meta.dirname,'..');
const assets=['portal_normal','portal_pvp','portal_universe','astral_aurora','astral_nexus','astral_eclipse','base_earth','base_mars','base_jupiter','drone_common','drone_elite','drone_a','drone_b','drone_c','drone_d','drone_e'];
const game=readFileSync(resolve(root,'public/game.js'),'utf8');
test('16 GLBs V53 mobile são geometria real suportada pelo loader WebGL2 e têm fallback 2D',()=>{
 for(const id of assets){
  const glb=resolve(root,`public/assets/v53/models/${id}.glb`);
  const png=resolve(root,`public/assets/v53/sprites/${id}.webp`);
  assert(existsSync(glb),id);assert(existsSync(png),id);
  const buf=readFileSync(glb);const array=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
  const parts=decodeGlb(array);assert(parts.length>0,id);
  assert(parts.some(p=>p.positions.length>=9&&p.indices.length>=3),id);
 }
});
test('3 classes de portal e 3 bases mantêm classes existentes',()=>{
 assert.equal(portalIdV53({to:'x2'}),'portal_normal');
 assert.equal(portalIdV53({to:'b41',targetLabel:'4-1'}),'portal_pvp');
 assert.equal(portalIdV53({to:'u1',targetLabel:'U-1'}),'portal_universe');
 assert.equal(baseIdV53('earth'),'base_earth');assert.equal(baseIdV53('mars'),'base_mars');assert.equal(baseIdV53('jupiter'),'base_jupiter');
 assert.equal(ASTRAL53.alpha,'astral_aurora');assert.equal(ASTRAL53.beta,'astral_nexus');assert.equal(ASTRAL53.gamma,'astral_eclipse');
});
test('dois drones originais distintos; cinco designers determinados por bônus existentes',()=>{
 assert.equal(visualDroneV53('flax',null),'drone_common');assert.equal(visualDroneV53('iris',null),'drone_elite');
 assert.equal(visualDroneV53('iris',{bonuses:{hp_per_drone:.05}}),'drone_a');
 assert.equal(visualDroneV53('iris',{bonuses:{shield_per_drone:.05}}),'drone_b');
 assert.equal(visualDroneV53('iris',{bonuses:{damage_per_drone:.05}}),'drone_c');
 assert.equal(visualDroneV53('iris',{bonuses:{xp:.05}}),'drone_d');
 assert.equal(visualDroneV53('iris',{bonuses:{hp_per_drone:.02,shield_per_drone:.02,damage_per_drone:.02}}),'drone_e');
});
test('Visual não altera combate: só game.js, renderer e módulo de apresentação; materializador usa pieces',()=>{
 for(const text of ['ASTRAL53[d.key]','drawAstralRift(ctx','STELLAR_3D_V50.drawAsset(ctx,visualId','STELLAR_3D_V50.drawAsset(ctx,baseVisualId','visualDroneV53(d.type,designer)',"(count||0)/Math.max(1,gd.pieces)",'gate-materializer-sprite']){
  assert(game.includes(text) || (text==='gate-materializer-sprite'&&readFileSync(resolve(root,'public/style.css'),'utf8').includes(text)),text);
 }
 assert.equal(shipPivotV53('phoenix'),.24);assert.equal(shipPivotV53('drone_a'),0);
 assert(SPRITE53('base_earth').endsWith('base_earth.webp'));
});
