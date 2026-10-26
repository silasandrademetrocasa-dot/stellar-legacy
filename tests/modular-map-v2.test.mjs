import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {modularMapKey,mapLayoutPath,stableMediumSubset,mapVisualLayers,createModularMapV2,drawModularBackground} from '../public/modules/modular-map-v2.js';
const root=resolve(import.meta.dirname,'..');
const index=JSON.parse(readFileSync(join(root,'public/assets/mapas/index.json')));
const layouts=Object.entries(index.maps).map(([key,path])=>[key,JSON.parse(readFileSync(join(root,'public',path)))]);

test('30 mapas organizados por facção com manifestos e PNG por mapa',()=>{
  assert.equal(Object.keys(index.maps).length,30);
  assert.equal(layouts.length,30);
  for(const [key,layout] of layouts){
    assert.equal(key,layout.mapId);
    assert.equal(layout.schemaVersion,2);
    assert.equal(mapLayoutPath(key),index.maps[key]);
    assert.ok(Number.isInteger(layout.seed));
    for(const type of ['high','medium','low']){
      const filepath=join(root,'public',layout.background[type]);
      assert.ok(existsSync(filepath),`${key} ${type}`);
    }
    for(const obj of [...layout.objects,...layout.stars,...layout.celestialBodies,...layout.nebulas]){
      assert.ok(existsSync(join(root,'public',obj.sprite)),obj.sprite);
      assert.ok(obj.x>=0&&obj.x<=1);assert.ok(obj.y>=0&&obj.y<=1);
      assert.ok(obj.opacity>0&&obj.opacity<=1);
      assert.ok(Number.isFinite(obj.parallax));
    }
  }
});
test('mapeamento x1-x8 separado por território e 4-X/universo correto',()=>{
  assert.equal(modularMapKey('x1','earth'),'1-1');
  assert.equal(modularMapKey('x8','mars'),'2-8');
  assert.equal(modularMapKey('x5','jupiter'),'3-5');
  assert.equal(modularMapKey('b42',null),'4-2');
  assert.equal(modularMapKey('u3',null),'U-3');
  assert.equal(modularMapKey('ggAlpha',null),null);
});
test('baixo zero decorações; médio metade determinística; alto total',()=>{
  for(const [key,layout] of layouts){
    const low=mapVisualLayers(layout,'low'),mid=mapVisualLayers(layout,'medium'),high=mapVisualLayers(layout,'high');
    assert.equal(low.length,0,key);
    const deco=layout.objects.length+layout.stars.length;
    const midDeco=mid.filter(x=>['objects','stars'].includes(x.kind));
    assert.equal(midDeco.length,Math.floor(layout.objects.length/2)+Math.floor(layout.stars.length/2),key);
    assert.ok(mid.length<high.length,key);
    assert.equal(high.length,layout.objects.length+layout.stars.length+layout.celestialBodies.length+layout.nebulas.length,key);
    assert.equal(JSON.stringify(mid),JSON.stringify(mapVisualLayers(layout,'medium')));
    assert.ok(mid.every(obj=>high.some(x=>x.id===obj.id&&x.sprite===obj.sprite)),key);
  }
});
test('carregamento sob demanda e fallback sem interferência no mundo',async()=>{
  const calls=[];
  const loaded=layouts[0][1];
  const mod=createModularMapV2({loadLayout:async path=>{calls.push(path);return loaded;},requestImage:()=>null});
  assert.equal(mod.draw(null,{key:'invalid'}),false);
  assert.equal(calls.length,0);
  mod.activate(loaded.mapId);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,1);
  assert.equal(mod.state(loaded.mapId),'ready');
});
test('background preserva proporção e não estica imagem',()=>{
  const calls=[];
  const ctx={drawImage:(...args)=>calls.push(args)};
  assert.equal(drawModularBackground(ctx,{naturalWidth:1080,naturalHeight:1080},{width:1200,height:600,cameraX:0,cameraY:0,worldWidth:6000,worldHeight:4000}),true);
  const a=calls[0];assert.equal(a.length,9);
  assert.equal(a[3]/a[4],a[7]/a[8]);
});
