import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {signIn,signOutLocal,loadCloudSave,saveCloudSave,adoptSaveRead,knownSaveRevisionV119} from '../public/api.js';
import {createLatestSaveCoordinatorV106} from '../public/modules/unified-save-coordinator-v106.js';

test('A forced write retries a reconciled conflict even without specialized pending flags',async()=>{
  let calls=0;
  const queue=createLatestSaveCoordinatorV106({hasPending:()=>false,blocked:()=>false,
    send:async()=>++calls===1?'retry':'saved'});
  assert.equal(await queue.flush(true),true);
  assert.equal(calls,2);
});

test('Only an installed read advances the write token. Late acknowledgements cannot cross accounts',async t=>{
  let owner='alpha',token='initial',delayReply,replyReady;
  const sent=[];
  t.mock.method(globalThis,'fetch',async(path,options)=>{
    if(path==='/api/auth/login')return Response.json({session:{access_token:owner,game_session_id:owner},user:{id:owner}});
    assert.equal(path,'/api/player/save');
    if(options.method!=='PUT')return Response.json({state:{accountOwnerId:owner},save_token:token});
    sent.push(JSON.parse(options.body));
    if(delayReply){replyReady();await delayReply;}
    return Response.json({ok:true,save_token:'written'});
  });
  const login=()=>signIn({email:'qa@example.test',password:'test'});
  try{
    await login();
    const read=await loadCloudSave();
    adoptSaveRead(read);
    token='preflight-only';
    await loadCloudSave();
    await saveCloudSave(read.state);
    assert.equal(sent.at(-1).expected_token,'initial');
    let release;
    delayReply=new Promise(resolve=>release=resolve);
    const seen=new Promise(resolve=>replyReady=resolve);
    const late=saveCloudSave(read.state);
    await seen;
    signOutLocal();owner='beta';await login();release();
    await assert.rejects(late,{code:'SAVE_SESSION_CHANGED'});
    assert.throws(()=>adoptSaveRead(read),{code:'SAVE_SESSION_CHANGED'});
    assert.equal(knownSaveRevisionV119(),null);
    await saveCloudSave({accountOwnerId:owner});
    assert.equal(sent.at(-1).expected_token,null);
  }finally{signOutLocal();}
});

test('Lost hangar response verifies only the submitted layout and leaves the full save pending',async()=>{
  const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  const start=source.indexOf('async function sendCloudSaveAttemptV106()');
  const end=source.indexOf('// V106 — Single-flight save.',start);
  const submitted={gear:'new'},official={gear:'new'};
  const context={structuredClone,console:{warn(){},info(){}},progress:submitted,authenticated:true,
    gameBootstrapRuntime:{generation:1},cloudSaveMutationV105:1,cloudDirty:true,cloudBusy:false,
    equipmentSubmittedV1342:null,persistEquipmentIntentV1062(){},pendingCargoV1333:()=>({submit(){}}),combatJournalV134:()=>({submit(){}}),installEconomyState(state){assert.equal(state.gear,'new');},
    setSync(){},offlineFarmWorldLockedV84:()=>false,accountResetEpochV478:0,
    equipmentSaveBaselineV109:{gear:'old'},equipmentSavePendingV109:true,equipmentLayoutSignatureV1062:s=>s.gear,
    saveOperationPendingV119:null,saveOperationIdV119:()=> 'op',
    saveCloudSave:async()=>{throw Object.assign(new Error('timeout'),{code:'NETWORK_TIMEOUT'});},
    loadCloudSave:async()=>({state:official}),missionSavePendingV105:false,AMMO_SELECTION_V1061:{pending:false},
    equipmentSavedV109(snapshot){assert.notEqual(snapshot,submitted);assert.equal(snapshot.gear,'new');context.equipmentSavePendingV109=false;}};
  const send=vm.runInNewContext(source.slice(start,end)+'\nsendCloudSaveAttemptV106',context);
  assert.equal(await send(),'retry');
  assert.equal(context.equipmentSavePendingV109,false);
  assert.equal(context.cloudDirty,true);
  assert.equal(context.cloudBusy,false);
});
