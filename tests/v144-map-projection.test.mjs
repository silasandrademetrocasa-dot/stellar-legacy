import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {drawWorldBackdrop,mapCrop,projectMapPoint} from '../public/modules/map-projection-v144.js';
import {modularMapKey,mapLayoutPath,createModularMapV2} from '../public/modules/modular-map-v2.js';
const read=p=>JSON.parse(readFileSync(new URL('../public'+p,import.meta.url),'utf8'));
test('30 layouts have aligned high/medium/low art and lightweight minimaps',()=>{
 const index=read('/assets/mapas/index.json');assert.equal(Object.keys(index.maps).length,30);
 const art=read('/assets/v144/manifest.json');assert.deepEqual(art.exportResolution,[2048,2048]);assert.deepEqual(art.nativeResolution,[1254,1254]);
 for(const [key,path] of Object.entries(index.maps)){const j=read(path);assert.equal(j.mapId,key);assert.equal(j.background.worldAligned,true);for(const quality of ['high','medium','low','radar'])assert.ok(existsSync(new URL('../public'+j.background[quality],import.meta.url)),key+quality);}
 assert.equal(modularMapKey('ggAlpha','earth'),null);assert.equal(mapLayoutPath('invalid'),null);
});
test('viewport and radar sample exactly the same world crop, including non-square worlds',()=>{
 for(const [ww,wh] of [[7200,5400],[12000,8900],[11800,8400]]){
  const image={width:2048,height:2048},calls=[],ctx={drawImage:(...args)=>calls.push(args)};drawWorldBackdrop(ctx,image,{width:320,height:640,cameraX:1000,cameraY:2000,worldWidth:ww,worldHeight:wh});
  const viewport=calls.pop(),crop=mapCrop(2048,2048,ww,wh);assert.equal(viewport[1],crop.x+(1000-160)/ww*crop.w);assert.equal(viewport[2],crop.y+(2000-320)/wh*crop.h);
  drawWorldBackdrop(ctx,image,{width:200,height:160,worldWidth:ww,worldHeight:wh,overview:true});const overview=calls.pop();assert.deepEqual(overview.slice(1,5),[crop.x,crop.y,crop.w,crop.h]);
  const p=projectMapPoint(1000,2000,200,160,ww,wh);assert.equal(p.x,1000/ww*200);assert.equal(p.y,2000/wh*160);
 }
});
test('background loading stays on the active map, and quality profiles select different resources',async()=>{
 const requested=[],ctx={save(){},restore(){},fillRect(){},drawImage(){},set fillStyle(v){}};
 const layout=read('/assets/mapas/Terra/Mapa_1-1/layout.json');const map=createModularMapV2({loadLayout:async()=>layout,requestImage:path=>{requested.push(path);return {width:512,height:512};}});
 map.activate('1-1');await new Promise(r=>setTimeout(r,0));map.draw(ctx,{key:'1-1',quality:'low',width:320,height:640,worldWidth:7200,worldHeight:5400});assert.deepEqual(requested,[layout.background.low]);
 map.activate('2-1');assert.equal(map.state('1-1'),'unloaded');
});
