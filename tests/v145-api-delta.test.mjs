import test from 'node:test';import assert from 'node:assert/strict';
import {signIn,signOutLocal,loadCloudSave,adoptSaveRead,saveCloudSave} from '../public/api.js';
import {applyStateDeltaV145,stateDeltaV145} from '../public/modules/state-delta-v145.js';
import {validatePlayerSave} from '../server/security-guard.js';
const owner='14500000-0000-4000-8000-000000000001';
const initial=()=>({accountOwnerId:owner,profile:{credits:1000,uridium:10},inventory:Object.fromEntries(Array.from({length:300},(_,i)=>['i'+i,1])),x:1,y:2});
test('real client API negotiates delta, retries an evicted server base with identical request identity and decodes canonical response delta',async t=>{
 const base=initial(),sent=[];let state=base,evicted=true;
 t.mock.method(globalThis,'fetch',async(path,options)=>{
  if(path==='/api/auth/login')return Response.json({session:{access_token:'qa',game_session_id:'same'},user:{id:owner}});
  assert.equal(path,'/api/player/save');if(options.method!=='PUT')return Response.json({state,save_token:'original',delta_base_v145:'base'});
  const body=JSON.parse(options.body);sent.push(body);
  if(body.delta_v145&&evicted){evicted=false;return Response.json({code:'DELTA_BASE_MISSING'},{status:409});}
  const incoming=body.state||applyStateDeltaV145(base,body.delta_v145.changes);state={...incoming,serverStateClockV134:2};
  return Response.json({ok:true,save_token:'confirmed',delta_base_v145:'next',state_delta_v145:stateDeltaV145(incoming,state)});
 });
 try{
  await signIn({email:'qa@test.invalid',password:'test'});const read=await loadCloudSave();adoptSaveRead(read);
  const next={...base,x:500};const result=await saveCloudSave(next,null,{operation_id:'14500000-0000-4000-8000-000000000002'});
  assert.ok(sent[0].delta_v145);assert.equal(sent[1].state.x,500);assert.equal(sent[0].operation_id,sent[1].operation_id);assert.equal(sent[0].expected_token,sent[1].expected_token);assert.equal(result.state.serverStateClockV134,2);
 }finally{signOutLocal();}
});
test('delta transport cannot convert a forged purchase revision into a permitted save',()=>{
 const base=initial(),forged={...base,serverPurchaseRevision:1000};const decoded=applyStateDeltaV145(base,stateDeltaV145(base,forged));
 assert.equal(validatePlayerSave(decoded,base,{userId:owner}).code,'SAVE_PURCHASE_REVISION_FORGED');
});
