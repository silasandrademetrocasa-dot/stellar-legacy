import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {relayLevelV54,relayAssetV54,relayPaletteV54,relayVisualStateV54,drawRelayEliteV54} from '../public/modules/stellar-relay-elite-v54.js';
const root=new URL('../public/',import.meta.url);
test('Relé níveis 1–3 refletem exclusivamente o estado enviado pelo servidor',()=>{
 for(let tier=1;tier<=3;tier++)for(const faction of ['earth','mars','jupiter']){
  let node={relayMode:true,relayLevel:tier,owner:faction,hp:500,maxHp:1000,shield:100,maxShield:400};
  assert.equal(relayAssetV54(node),`relay_${tier}_${faction}`);
  assert.equal(relayVisualStateV54(node).tier,tier);
  for(let ext of ['models/'+relayAssetV54(node)+'.glb','sprites/'+relayAssetV54(node)+'.webp'])
   assert.ok(fs.existsSync(new URL('assets/v54/'+ext,root)),ext);
 }
});
test('Neutros sem clã continuam neutros; identidade de facção é somente visual',()=>{
 assert.equal(relayPaletteV54({owner:null}), 'neutral');
 assert.equal(relayAssetV54({relayLevel:0,owner:null}), 'relay_1_neutral');
 assert.equal(relayLevelV54({relayLevel:10}),3);
 assert.equal(relayVisualStateV54({hp:2,maxHp:10,shield:5,maxShield:10}).hp,.2);
});
test('Nenhuma mudança no estado do relé durante renderização',()=>{
 const node={relayMode:true,relayLevel:2,owner:'mars',id:'A',hp:333,shield:123,maxHp:400,maxShield:200,modules:[{slot:1,attribute:'laser',level:3}]};
 const before=JSON.stringify(node);
 const noop=()=>{};let saves=0;
 const ctx=new Proxy({}, {get:(_t,k)=>{if(k==='save'||k==='restore')return ()=>{saves++};if(k==='measureText')return()=>({width:0});return noop;},set:()=>true});
 assert.equal(drawRelayEliteV54(ctx,node,{quality:'low',time:1,getSprite:()=>null,fallback:noop}),false);
 assert.equal(JSON.stringify(node),before);assert.ok(saves>=2);
});
test('Visual assets 3D: 12 GLB válidos, resolução de imagem 2D para todos os relés',()=>{
 for(const faction of ['neutral','earth','mars','jupiter'])for(let tier=1;tier<=3;tier++){
  const data=fs.readFileSync(new URL(`assets/v54/models/relay_${tier}_${faction}.glb`,root));
  assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(8),data.length);
  const sprite=fs.readFileSync(new URL(`assets/v54/sprites/relay_${tier}_${faction}.webp`,root));
  assert.equal(sprite.toString('ascii',0,4),'RIFF');assert.equal(sprite.toString('ascii',8,12),'WEBP');
 }
});
test('Os modelos Elite de base e sprites de perspectiva existem em cada facção',()=>{
 for(const key of ['earth','mars','jupiter']){
  const data=fs.readFileSync(new URL(`assets/v53/models/base_${key}.glb`,root));
  assert.equal(data.toString('ascii',0,4),'glTF');
  assert.ok(fs.statSync(new URL(`assets/v53/sprites/base_${key}.webp`,root)).size>10000);
 }
});
