import test from 'node:test';
import assert from 'node:assert/strict';
import {entityAssetPath,coreAssetPath} from '../public/modules/asset-cache.js';
import {npcVisualDetail} from '../public/modules/npc-render-detail.js';
import {QUALITY_PROFILES,initialAutoQualityForDevice} from '../public/modules/quality-profiles.js';
test('V30: atlas 16/32 de nave, drone, NPC e AUX são essenciais',()=>{
 for(const path of ['shipsheets32/nova.webp','shipsheets/angelic.webp','dronesheets32/aux9-sheet.webp','npcsheets32/elite.webp','npcsheets/scout.webp']){
   assert.equal(entityAssetPath('/assets/v30/'+path),true,path);
   assert.equal(coreAssetPath('/assets/v30/'+path),true,path);
 }
});
test('LOD não mexe em boss, evento ou alvo',()=>{
 for(const args of [{boss:true},{eventNpc:true},{selected:true}])
  assert.equal(npcVisualDetail({quality:'medium',distanceSq:1e8,...args}),'full');
 assert.equal(npcVisualDetail({quality:'medium',distanceSq:1e8}),'sprite');
 assert.equal(npcVisualDetail({quality:'medium',distanceSq:50}),'full');
});
test('qualidade preserva nitidez mínima',()=>{
 assert.ok(QUALITY_PROFILES.low.dpr>=1);
 assert.equal(initialAutoQualityForDevice({mobile:true,memory:4,cores:8},480),'medium');
});
