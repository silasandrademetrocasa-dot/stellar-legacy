import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {ALLOWED_SHIPS_V50,requestedModelAssetV59} from '../public/modules/stellar-ship3d-v50.js';
const root=new URL('../',import.meta.url);
const txt=p=>readFileSync(new URL(p,root),'utf8');
test('V63: showroom 2D e sprites 16 direções são derivados dos 13 GLBs',()=>{
  const manifest=JSON.parse(txt('public/assets/v63/fleet-manifest.json'));
  const all=Object.keys(ALLOWED_SHIPS_V50);
  assert.equal(Object.keys(manifest).length,13);
  for(const id of all){
    const m=manifest[id];assert.ok(m,'missing '+id);
    assert.equal(requestedModelAssetV59(id,'on'),m.source_glb);
    assert.equal(requestedModelAssetV59(id,'auto'),m.source_glb);
    for(const path of [m.perspective,m.sprite16]){
      const p=new URL('public'+path,root);
      assert.ok(existsSync(p),path);assert.ok(statSync(p).size>10000,path);
    }
    const data=readFileSync(new URL('public'+m.sprite16,root));
    assert.equal(data.toString('ascii',0,4),'RIFF');
    assert.equal(data.toString('ascii',8,12),'WEBP');
  }
});
test('V63: mapeamento do modo 2D, galeria e heróis sem recortes antigos',()=>{
 const game=txt('public/game.js');
 for(const s of ['FLEET_MODEL_2D_V63','FLEET_MODEL_ATLAS_V63','if(FLEET_MODEL_2D_V63[id])return','if(FLEET_MODEL_ATLAS_V63[id])return','if(stellarCan3dV524()&&(!ship||STELLAR_3D_V50.getMode()!==\'off\'))'])assert.ok(game.includes(s),s);
 assert.match(game,/function v56ShipPerspectiveArt\(id\)\{return shipCardAsset\(id\);\}/);
 const css=txt('public/modules/stellar-fleet-v62.css');assert.match(css,/background:transparent!important/);assert.match(css,/\.v55-stage-light,\.v55-orbit-ring/);
 const gl=txt('public/modules/stellar-ship3d-v50.js');assert.match(gl,/const sceneSize=\(\)=>renderMode\(\)===\'on\'\?344:224/);
});
