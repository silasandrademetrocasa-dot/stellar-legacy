import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssetCache,versionedAssetUrl,flattenAssetPaths,entityAssetPath,coreAssetPath} from '../public/modules/asset-cache.js';

function mockCache(opts={}) {
  let t=0;
  let calls=0;
  let warnings=[];
  const mock=createAssetCache({
    createImage:()=>{calls++;return {naturalWidth:64,naturalHeight:64};},
    now:()=>t,
    warn:(...w)=>warnings.push(w),
    ...opts,
  });
  return {mock,advance:ms=>{t+=ms;},calls:()=>calls,warnings:()=>warnings};
}
test('URLs de assets preservam revisão histórica e query string',()=>{
  assert.equal(versionedAssetUrl('/assets/v17/ships/a.webp'),'/assets/v17/ships/a.webp?asset=18.1.8');
  assert.equal(versionedAssetUrl('/assets/v18/bonus/bonus-box.webp'),'/assets/v18/bonus/bonus-box.webp?asset=18.2.8');
  assert.equal(versionedAssetUrl('/assets/v19/ammo/l.webp?x=1'),'/assets/v19/ammo/l.webp?x=1&asset=18.1.8');
  assert.equal(versionedAssetUrl(''),'');
});
test('preload recursivo de catálogo sem alterar ordem dos assets',()=>{
  assert.deepEqual(flattenAssetPaths({ships:['a','b'],ore:{p:'c'},extra:null}),['a','b','c']);
});
test('imagens de Canvas carregam eager e usam prioridades originais',()=>{
  const {mock,calls}=mockCache();
  const first=mock.requestAssetImage('/assets/v17/ships/aurora.webp');
  assert.equal(first.loading,'eager');
  assert.equal(first.decoding,'async');
  assert.equal(first.fetchPriority,'high');
  assert.equal(first.src,'/assets/v17/ships/aurora.webp?asset=18.1.8');
  assert.equal(mock.requestAssetImage('/assets/v17/ships/aurora.webp'),first);
  assert.equal(calls(),1);
  assert.equal(mock.requestAssetImage(null),null);
});
test('erro temporário tem cooldown; reconexão recria imagem só depois do limite',()=>{
  const {mock,advance,calls,warnings}=mockCache();
  const path='/assets/v19/pilot-skills/engineering.png';
  const first=mock.requestAssetImage(path);
  first.onerror();
  assert.equal(mock.stats().failed,1);
  for(let k=0;k<20;k++)assert.equal(mock.requestAssetImage(path),first);
  advance(14999);
  assert.equal(mock.requestAssetImage(path),first);
  advance(1);
  const second=mock.requestAssetImage(path);
  assert.notEqual(second,first);
  assert.equal(calls(),2);
  assert.equal(warnings().length,1);
  first.onerror(); // request antigo não pode envenenar a nova imagem
  assert.equal(mock.stats().failed,0);
  second.onload();
  assert.equal(mock.stats().failed,0);
});
test('fundos antigos são liberados, mas o mapa ativo e os sprites de nave continuam intactos',()=>{
  const {mock,advance}=mockCache();
  const old='/assets/v17/environment/x2.webp';
  const active='/assets/v17/environment/x1.webp';
  const ship='/assets/v17/ships-map/aurora.webp';
  mock.requestAssetImage(old);
  mock.requestAssetImage(active);
  mock.requestAssetImage(ship);
  advance(92000);
  mock.requestAssetImage(active);
  assert.equal(mock.trimAssetCache(1),1);
  assert.equal(mock.stats().scenes,1);
  assert.equal(mock.requestAssetImage(active).src,active+'?asset=18.1.8');
  assert.equal(mock.stats().entities,1);
});
test('cache extra respeita cap sem desmontar imagens em uso recente',()=>{
  const {mock,advance,calls}=mockCache();
  const a='/assets/v19/pilot-skills/a.png',b='/assets/v19/premium-stage/b.png';
  mock.requestAssetImage(a);
  mock.requestAssetImage(b);
  assert.equal(mock.trimAssetCache(1),0); // ambos ativos, não causar cintilação
  advance(21000);
  mock.requestAssetImage(b);
  assert.equal(mock.trimAssetCache(1),1);
  assert.equal(mock.stats().count,1);
  assert.equal(mock.requestAssetImage(b).src,b+'?asset=18.1.8');
  assert.equal(calls(),2);
});
test('trocar qualidade preserva sprites de entidades e assets principais',()=>{
  const {mock}=mockCache();
  const entity='/assets/v17/npcs/scavenger.webp',core='/assets/v17/environment/x1.webp',extra='/assets/v19/pilot-skills/hull1.png';
  mock.requestAssetImage(entity);mock.requestAssetImage(core);mock.requestAssetImage(extra);
  assert.equal(entityAssetPath(entity),true);
  assert.equal(coreAssetPath(core),true);
  assert.equal(mock.discardUnusedForQuality(()=>false),1);
  assert.equal(mock.stats().entities,1);
  assert.equal(mock.stats().scenes,1);
});
