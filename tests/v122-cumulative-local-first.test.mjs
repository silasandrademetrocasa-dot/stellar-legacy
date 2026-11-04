import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createForegroundSyncV122} from '../public/modules/local-first-sync-v122.js';
import {createLegacyMirrorV122} from '../public/modules/local-first-legacy-mirror-v122.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V122 — no HTTP saves when idle/offline/hidden or farm-blocked',async()=>{
 let calls=0,local=0;
 let ready=true,net=true,visible=true,dirty=false;
 const c=createForegroundSyncV122({flushLocal:async()=>local++,flushRemote:async()=>{calls++;return 'saved';},hasPending:()=>dirty,eligible:()=>ready,online:()=>net,visible:()=>visible});
 c.start();assert.equal((await c.tick()).status,'idle');assert.equal(calls,0);
 net=false;dirty=true;assert.equal((await c.tick()).status,'offline');assert.equal(calls,0);
 net=true;visible=false;assert.equal((await c.tick()).status,'hidden');assert.equal(calls,0);
 visible=true;ready=false;assert.equal((await c.tick()).status,'disabled');assert.equal(calls,0);
 ready=true;assert.equal((await c.tick()).status,'confirmed');assert.equal(calls,1);assert.equal(local,2);c.stop();
});
test('V122 — single flight, retries with bounded exponential backoff',async()=>{
 let t=50000,release,called=0;
 let fail=true;
 const c=createForegroundSyncV122({now:()=>t,hasPending:()=>true,flushRemote:()=>{called++;return fail?'error':new Promise(resolve=>release=resolve);}});
 c.start();assert.equal((await c.tick()).status,'retry');assert.equal(c.status().failures,1);
 assert.equal((await c.tick()).status,'backoff');assert.equal(called,1);
 t+=5000;fail=false;const one=c.tick();assert.equal((await c.tick()).status,'busy');release('saved');assert.equal((await one).status,'confirmed');assert.equal(c.status().failures,0);c.stop();
});
test('V122 — compatibility mirror coalesces repeated writes and flushes latest state',()=>{
 let now=0,writes=[],callback=null;
 const m=createLegacyMirrorV122({write:(key,state)=>writes.push({key,state:state.value}),now:()=>now,schedule:fn=>{callback=fn;return 1;},cancel:()=>{},intervalMs:2000});
 m.stage('pilot-A',{value:1});assert.equal(writes.length,1);
 now=400;m.stage('pilot-A',{value:2});now=600;m.stage('pilot-A',{value:3});
 assert.equal(writes.length,1);assert.ok(callback);now=2000;callback();assert.deepEqual(writes,[{key:'pilot-A',state:1},{key:'pilot-A',state:3}]);
});
test('V122 — mirror isolates account keys on switch',()=>{
 let now=0,writes=[];
 const m=createLegacyMirrorV122({write:(k,s)=>writes.push([k,s.value]),now:()=>now,schedule:()=>1,cancel:()=>{}});
 m.stage('A',{value:1});m.stage('A',{value:2});m.stage('B',{value:3});m.flush();
 assert.deepEqual(writes,[['A',1],['A',2],['B',3]]);
});
test('V122 — game uses V106 single-flight, 5s sync and retains economic gate',()=>{
 const game=read('public/game.js'),server=read('server/index.js');
 assert.match(game,/const LOCAL_FIRST_FOREGROUND_V122=createForegroundSyncV122/);
 assert.ok(game.includes("flushRemote:()=>flushCloudSave(false)"));
 assert.match(game,/intervalMs:5000/);
 assert.match(game,/LEGACY_MIRROR_V122\.stage\(saveKey\(\),progress/);
 assert.match(server,/writeVerifiedSave\(req,state,updated_at\)/);
 assert.match(server,/stellar_commit_player_save_v118/);
 assert.match(game,/rememberEquipmentChangeV109\(\)/);
});
