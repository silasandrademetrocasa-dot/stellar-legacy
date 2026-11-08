import test from 'node:test';import assert from 'node:assert/strict';
import {collectionAccessV1341,auxBoxRangeV1341} from '../public/modules/collection-access-v1341.js';
import {createConfigCacheV1341} from '../server/config-cache-v1341.js';
const state={pet:{owned:true,level:15,activeGear:'box',gearsOwned:{box:true},protocols:{box:3}}};
const client=()=>({room:{key:'earth:x1',map:{battle:false}},player:{x:0,y:0,updatedAt:1000,pet:{owned:true,activeGear:'box',x:850,y:0}}});
const drop={map_key:'earth:x1',x:850,y:0};
test('AUX collects at its position within its configured range while the ship is far away',()=>{
 const c=client();assert.equal(collectionAccessV1341(state,c,drop,'pet',1000).ok,true);
 assert.equal(collectionAccessV1341(state,c,drop,'ship',1000).code,'COLLECTION_SHIP_RANGE');
 assert.equal(auxBoxRangeV1341(state),825*1.24);
});
test('AUX cannot collect without ownership, purchased gear, active mode or fresh position',()=>{
 for(const field of ['owned','gear','mode','position']){
  const s=structuredClone(state),c=client();
  if(field==='owned')s.pet.owned=false;if(field==='gear')s.pet.gearsOwned.box=false;if(field==='mode')c.player.pet.activeGear='ore';if(field==='position')c.player.updatedAt=-20000;
  assert.equal(collectionAccessV1341(s,c,drop,'pet',1000).ok,false,field);
 }
});
test('collector identity does not bypass map, AUX contact distance or search range',()=>{
 const c=client();c.player.pet.x=100;assert.equal(collectionAccessV1341(state,c,drop,'pet',1000).code,'COLLECTION_PET_RANGE');
 c.player.pet.x=2000;assert.equal(collectionAccessV1341(state,c,{...drop,x:2000},'pet',1000).code,'COLLECTION_PET_RANGE');
 assert.equal(collectionAccessV1341(state,client(),{...drop,map_key:'earth:x2'},'pet',1000).code,'COLLECTION_MAP_MISMATCH');
});
test('configuration reads coalesce in flight, expire, and recover after a failure',async()=>{
 let now=1,calls=0,resolve;const pending=new Promise(r=>resolve=r);
 const load=createConfigCacheV1341(async()=>{calls++;return pending;},{now:()=>now,ttlMs:100});
 const a=load(),b=load();resolve({version:1});assert.deepEqual(await a,await b);assert.equal(calls,1);await load();assert.equal(calls,1);now=102;await load();assert.equal(calls,2);
 let tries=0;const bad=createConfigCacheV1341(async()=>{if(++tries===1)throw Error('offline');return 42;});await assert.rejects(bad);assert.equal(await bad(),42);
});

test('switching a purchased Salvager on does not wait for a full checkpoint',()=>{const s=structuredClone(state);s.pet.activeGear='off';assert.equal(collectionAccessV1341(s,client(),drop,'pet',1000).ok,true);});
