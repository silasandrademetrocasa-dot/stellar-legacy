import test from 'node:test';
import assert from 'node:assert/strict';
import {QUALITY_PROFILES,initialAutoQualityForDevice as choose} from '../public/modules/quality-profiles.js';

test('qualidade automática: economia de dados sempre vence',()=>{
  assert.equal(choose({saveData:true,mobile:false},1440),'low');
});
test('mobile simples usa BAIXA, independentemente da orientação',()=>{
  assert.equal(choose({mobile:true,memory:2,cores:8},1200),'low');
  assert.equal(choose({mobile:true,memory:8,cores:8},600),'low');
  assert.equal(choose({mobile:true,memory:8,cores:2},1000),'low');
});
test('mobile potente usa MÉDIA e desktop potente usa ALTA',()=>{
  assert.equal(choose({mobile:true,memory:8,cores:8},900),'medium');
  assert.equal(choose({mobile:false,memory:8,cores:8},1280),'high');
});
test('desktop com até quatro GB ou quatro núcleos usa MÉDIA',()=>{
  assert.equal(choose({mobile:false,memory:4,cores:8},1300),'medium');
  assert.equal(choose({mobile:false,memory:8,cores:4},1300),'medium');
});
test('perfis têm limite de FPS e mantêm cenário/sprites básicos',()=>{
  assert.deepEqual(Object.keys(QUALITY_PROFILES),['high','medium','low']);
  assert.equal(QUALITY_PROFILES.high.fps,60);
  assert.equal(QUALITY_PROFILES.low.fps,30);
  assert.equal(QUALITY_PROFILES.low.preload,'minimal');
});
