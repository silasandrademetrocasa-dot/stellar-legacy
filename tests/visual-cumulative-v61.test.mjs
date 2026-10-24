import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {requestedModelAssetV59, ALLOWED_SHIPS_V50} from '../public/modules/stellar-ship3d-v50.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V61: all thirteen ships use actual approved V62 GLBs in 3D and auto mode',()=>{
  for(const [id,ship] of Object.entries(ALLOWED_SHIPS_V50)){
    const hq=requestedModelAssetV59(id,'on'), lod=requestedModelAssetV59(id,'auto');
    assert.equal(hq,`/assets/v62/models/SL_${ship.toUpperCase()}_FINAL.glb`);
    assert.equal(lod,`/assets/v62/models/SL_${ship.toUpperCase()}_FINAL.glb`);
    assert.ok(existsSync(new URL('../public'+hq,import.meta.url)),hq);
  }
});
test('V61: 8 universe NPC GLBs are whitelisted for rendering',()=>{
  const r=file('public/modules/stellar-ship3d-v50.js');
  assert.match(r,/Boolean\(MODEL_ASSET\[id\]\)/);
  for(const type of ['riftScout','bossRiftScout','voidCorsair','bossVoidCorsair','nexusWarden','bossNexusWarden','astralReaper','bossAstralReaper']){
    assert.ok(existsSync(new URL(`../public/assets/v59/models/npc_${type}.glb`,import.meta.url)));
  }
  const g=file('public/game.js');assert.match(g,/STELLAR_3D_V50\.drawAsset\(ctx,'npc_'\+e\.type/);
});
test('V60 + V61: previews for ships and drones in hangar and shop plus 3D gameplay',()=>{
  const g=file('public/game.js');
  assert.match(g,/function stellarPreviewV61\(/);
  assert.match(g,/function stellarProductPreviewV61\(/);
  assert.match(g,/stellarPreviewV61\(c\.querySelector\('canvas\.stellar-preview-v61'/);
  assert.match(g,/stellarPreviewV61\(top\.querySelector\('canvas\.stellar-preview-v61'/);
  assert.match(g,/STELLAR_3D_V50\.draw\(ctx,progress\.activeShipId,a,shipSize\)/);
  const version=JSON.parse(file('package.json')).version; assert.ok(file('public/index.html').includes('stellar-showcase-v61.css?v='+version));
});
test('V61 manifest update cumulative and no SQL changes',()=>{
 const p=JSON.parse(file('package.json'));
 assert.match(p.version,/^\d+\.\d+\.\d+$/);assert.match(file('README_V61.md'),/Não envie a pasta descompactada e não rode SQL/);
});
