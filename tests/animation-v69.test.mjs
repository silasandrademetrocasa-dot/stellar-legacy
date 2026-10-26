import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {portalKindV69,frameIndexV69,portalFramePathV69,baseFramePathV69,drawPortalV69,drawBaseV69,drawRelayV69,relayVisualStateV69,noteRelayAttackV69,resetRelayVisualMemoryV69} from '../public/modules/stellar-animation-v69.js';
const root=resolve(import.meta.dirname,'..'),rootAssets='public/assets/animations/v69';
const index=JSON.parse(readFileSync(join(root,rootAssets,'manifest.json')));
const pathOk=uri=>existsSync(join(root,'public',uri));
const fakeCtx=()=>{const calls=[];const obj={calls};for(const method of ['save','restore','beginPath','arc','clip','drawImage','stroke','fill','ellipse','setLineDash','fillRect'])obj[method]=(...a)=>calls.push([method,...a]);return obj;};
const sprite=Object.freeze({naturalWidth:256,naturalHeight:256});
const fakeGetImage=_=>sprite;
test('6 portais têm 8 frames RGBA/WEBP cada, todos 256x256',()=>{
 assert.equal(Object.keys(index.portals).length,6);
 for(const v of Object.values(index.portals)){
  assert.equal(v.frameCount,8);assert.deepEqual(v.frameSize,[256,256]);
  for(const uri of v.frames){assert.ok(pathOk(uri),uri);const buf=readFileSync(join(root,'public',uri));assert.equal(buf.toString('ascii',0,4),'RIFF');assert.equal(buf.toString('ascii',8,12),'WEBP');}
 }
});
test('3 bases com 12 frames originais, sem mudança do pivô de canvas',()=>{
 assert.equal(Object.keys(index.bases).length,3);
 for(const v of Object.values(index.bases)){
  assert.equal(v.frameCount,12);assert.deepEqual(v.frameSize,[840,490]);assert.equal(v.sameAnchor,true);
  assert.ok(pathOk(v.base));for(const uri of v.frames)assert.ok(pathOk(uri),uri);
 }
});
test('3 níveis de relé, cada um com oito imagens de referência sem associações inventadas',()=>{
 assert.equal(Object.keys(index.relays).length,3);
 for(const v of Object.values(index.relays)){assert.deepEqual(v.frameSize,[300,360]);assert.equal(v.statesVerified,false);assert.equal(v.referenceFrames.length,8);assert.ok(pathOk(v.base));for(const uri of v.referenceFrames)assert.ok(pathOk(uri));}
});
test('classificação seleciona 6 tipos a partir do destino real',()=>{
 assert.equal(portalKindV69({to:'x2'},'portal_normal','x1'),'normal');
 assert.equal(portalKindV69({to:'b41'},'portal_pvp'),'pvp');
 assert.equal(portalKindV69({to:'u2'},'portal_universe'),'universe');
 assert.equal(portalKindV69({to:'ggAlpha'}),'aurora');
 assert.equal(portalKindV69({to:'ggBeta'}),'nexus');
 assert.equal(portalKindV69({to:'ggGamma'}),'eclipse');
 assert.match(portalFramePathV69('pvp',7),/frame_07.webp$/);
 assert.match(baseFramePathV69('jupiter',11),/frame_11.webp$/);
});
test('animação segue tempo real, sem depender do FPS do jogo',()=>{
 assert.equal(frameIndexV69(0,5,8),0);assert.equal(frameIndexV69(.2,5,8),1);
 assert.equal(frameIndexV69(1.6,5,8),0);
});
test('portal mantém shell e hitbox imutáveis em baixa/média/alta',()=>{
 const options={portal:{to:'x2'},visualId:'portal_normal',time:1.4,getImage:fakeGetImage};
 for(const quality of ['low','medium','high']){
  const ctx=fakeCtx();assert.equal(drawPortalV69(ctx,{...options,quality}),true);
  const imgs=ctx.calls.filter(c=>c[0]==='drawImage');assert.deepEqual(imgs[0].slice(2),[-75,-75,150,150]);
  assert.equal(imgs.length,quality==='low'?1:2);
 }
 assert.equal(drawPortalV69(fakeCtx(),{...options,getImage:()=>null}),false);
});
test('bases mudam só a textura, não seu enquadramento',()=>{
 for(const quality of ['low','medium','high']){
  const ctx=fakeCtx();assert.equal(drawBaseV69(ctx,{faction:'mars',quality,time:15,width:610,getImage:fakeGetImage}),true);
  const im=ctx.calls.find(x=>x[0]==='drawImage');assert.deepEqual(im.slice(2),[-305,-610*490/840/2,610,610*490/840]);
 }
});
test('estados reais dos relés não mudam hp/escudo nem coordenadas',()=>{
 resetRelayVisualMemoryV69();const node={id:'r1',mapId:'b41',x:222,y:312,relayMode:true,relayLevel:3,hp:950,shield:400,maxHp:1000,maxShield:500,contested:false};
 const original=JSON.stringify(node),ctx=fakeCtx();
 assert.equal(drawRelayV69(ctx,node,{getImage:fakeGetImage,time:22,quality:'medium'}),true);
 assert.equal(JSON.stringify(node),original);assert.equal(relayVisualStateV69(node).disabled,false);
 const absent={...node,hp:0};assert.equal(relayVisualStateV69(absent).disabled,true);
 noteRelayAttackV69(node.x,node.y,22);assert.equal(drawRelayV69(fakeCtx(),node,{getImage:fakeGetImage,time:22.1,quality:'high'}),true);
 assert.equal(drawRelayV69(fakeCtx(),node,{getImage:()=>null}),false);
});
