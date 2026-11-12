import test from 'node:test';
import assert from 'node:assert/strict';
import {stateDeltaV145,applyStateDeltaV145,compactSaveV145} from '../public/modules/state-delta-v145.js';
import {createSaveDeltaTransportV145} from '../server/save-delta-v145.js';
import {createRuntimeReadCacheV145} from '../public/modules/runtime-read-cache-v145.js';
import {createForegroundSyncV122} from '../public/modules/local-first-sync-v122.js';
const sample=()=>({accountOwnerId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',profile:{credits:99999,uridium:234},inventory:Object.fromEntries(Array.from({length:500},(_,i)=>['item'+i,i])),missions:{daily:{progress:5}},ammo:{lcb10:300},drones:[{id:'a',slots:[null]}],x:100,y:200});
function response(){return {statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return body;}};}
function request(body={},owner='a',session='one',method='PUT'){return {method,user:{id:owner},gameSessionId:session,headers:{'x-stellar-delta':'1'},body};}
function scheduler(){let n=0;const jobs=new Map();return {jobs,schedule(fn,ms){jobs.set(++n,{fn,ms});return n;},cancel(id){jobs.delete(id);}};}

test('delta roundtrip preserves deletion, arrays, null, Unicode and zero values without mutating either input',()=>{
 const before=sample(),after=structuredClone(before);delete after.profile.uridium;after.x=0;after.y=null;after.drones[0].slots=['laser'];after.new={'sí':'Olá'};
 const snapshot=structuredClone(before),ops=stateDeltaV145(before,after);
 assert.deepEqual(applyStateDeltaV145(before,ops),after);assert.deepEqual(before,snapshot);
 assert.deepEqual(stateDeltaV145(after,after),[]);
 assert.deepEqual(applyStateDeltaV145(before,[{op:'set',path:[],value:{a:0}}]),{a:0});
});
test('delta refuses prototype pollution, invalid parents, array index patches, operation floods and malformed roots',()=>{
 for(const ops of [[{op:'set',path:['__proto__','polluted'],value:1}],[{op:'set',path:['constructor'],value:1}],[{op:'set',path:['missing','x'],value:1}],[{op:'set',path:['drones','0'],value:1}],Array(4097).fill({op:'delete',path:['x']}),[{op:'set',path:[],value:null}],[{op:'set',path:['x']}]])assert.throws(()=>applyStateDeltaV145(sample(),ops),{code:'DELTA_INVALID'});
 assert.equal({}.polluted,undefined);
});
test('large saves select deltas; small/mass changes use the existing full snapshot',()=>{
 const base=sample(),next={...base,x:101};const payload=compactSaveV145({id:'known',state:base},next,{operation_id:'same'});
 assert.ok(payload.delta_v145);assert.equal(payload.operation_id,'same');assert.ok(JSON.stringify(payload).length<JSON.stringify(next).length/10);
 assert.ok(compactSaveV145(null,next).state);assert.ok(compactSaveV145({id:'k',state:{x:1}},{x:2}).state);
});
test('transport remembers only authenticated canonical responses and reconstructs BEFORE existing validators',()=>{
 const transport=createSaveDeltaTransportV145(),base=sample(),get=request({},'a','one','GET'),r=response();
 let next=false;transport.middleware(get,r,()=>next=true);assert.ok(next);r.json({state:base,save_token:'original'});
 const id=r.body.delta_base_v145;assert.match(id,/^[0-9a-f]{64}$/);
 const desired={...base,x:777};const req=request({delta_v145:{base:id,changes:stateDeltaV145(base,desired)},operation_id:'same',expected_token:'original'}),out=response();
 transport.middleware(req,out,()=>{assert.deepEqual(req.body.state,desired);assert.equal(req.body.expected_token,'original');assert.equal(req.body.operation_id,'same');out.json({ok:true,state:{...desired,serverStateClockV134:2},save_token:'next'});});
 assert.ok(out.body.state_delta_v145);assert.equal(out.body.state,undefined);
 assert.equal(applyStateDeltaV145(desired,out.body.state_delta_v145).serverStateClockV134,2);
 const other=response();transport.middleware(request({delta_v145:{base:id,changes:[]}},'b'),other,()=>assert.fail('cross account'));assert.equal(other.body.code,'DELTA_BASE_MISSING');
 const session=response();transport.middleware(request({delta_v145:{base:id,changes:[]}},'a','two'),session,()=>assert.fail('cross session'));assert.equal(session.body.code,'DELTA_BASE_MISSING');
 const missing=response();transport.clear();transport.middleware(request({delta_v145:{base:id,changes:[]}}),missing,()=>assert.fail('missing base'));assert.equal(missing.statusCode,409);
});
test('delta cache is bounded and expired bases fail closed without reaching business code',()=>{
 let now=1;const t=createSaveDeltaTransportV145({maxEntries:1,ttlMs:10,now:()=>now});
 const r=response();t.middleware(request({},'a','one','GET'),r,()=>r.json({state:sample()}));const id=r.body.delta_base_v145;
 now=20;const expired=response();t.middleware(request({delta_v145:{base:id,changes:[]}}),expired,()=>assert.fail());assert.equal(expired.body.code,'DELTA_BASE_MISSING');
 for(let i=0;i<10;i++){const req=request({},String(i),'s','GET'),out=response();t.middleware(req,out,()=>out.json({state:sample()}));}assert.equal(t.metrics().entries,1);
});
test('configuration reads coalesce, clone, expire, force refresh and cannot repopulate a cleared session',async()=>{
 let clock=0,calls=0;const c=createRuntimeReadCacheV145({ttlMs:10,now:()=>clock}),fetcher=async()=>({version:++calls,rows:[1]});
 const [a,b]=await Promise.all([c.read('session|shops',fetcher),c.read('session|shops',fetcher)]);assert.equal(calls,1);a.rows.push(2);assert.deepEqual(b.rows,[1]);
 assert.equal((await c.read('session|shops',fetcher)).version,1);
 assert.equal((await c.read('session|shops',fetcher,{refresh:true})).version,2);
 clock=11;await c.read('session|shops',fetcher);assert.equal(calls,3);
 let release;const pending=c.read('late',()=>new Promise(r=>release=r));await Promise.resolve();c.clear();release({x:1});await pending;assert.equal(c.size(),0);
 await assert.rejects(c.read('bad',()=>Promise.reject(Error('offline'))));assert.equal(c.size(),0);
});
test('event scheduler has no idle polling, batches mutations and retains changes arriving during a slow write',async()=>{
 const s=scheduler();let pending=false,writes=0,release;
 const loop=createForegroundSyncV122({...s,hasPending:()=>pending,flushRemote:async()=>{writes++;pending=false;await new Promise(r=>release=r);return true;}});
 loop.start();assert.equal(s.jobs.size,0);
 pending=true;for(let i=0;i<100;i++)loop.notify();assert.equal(s.jobs.size,1);
 const first=loop.tick();await Promise.resolve();pending=true;loop.notify();release();await first;
 assert.equal(writes,1);assert.equal(s.jobs.size,1);
 const second=loop.tick();await Promise.resolve();release();await second;
 assert.equal(s.jobs.size,0);assert.equal(writes,2);loop.stop();
});
test('event scheduler backs off while failing, stops offline, resumes once and does not overlap sends',async()=>{
 const s=scheduler();let clock=0,online=false,calls=0;const loop=createForegroundSyncV122({...s,now:()=>clock,online:()=>online,hasPending:()=>true,flushRemote:async()=>{calls++;throw Error('timeout');}});
 loop.start();loop.notify();assert.equal(s.jobs.size,0);assert.equal((await loop.tick()).status,'offline');
 online=true;assert.equal((await loop.tick()).status,'retry');assert.equal(calls,1);assert.equal(loop.status().nextRetry,5000);
 assert.equal((await loop.tick()).status,'backoff');assert.equal(calls,1);clock=5000;await loop.tick();assert.equal(loop.status().nextRetry,15000);loop.stop();assert.equal(s.jobs.size,0);
});

test('legacy safety audit notices damage but ignores unchanged state and save timestamps',async()=>{
 const {createMutationCheckpointV145}=await import('../public/modules/mutation-checkpoint-v145.js');
 const check=createMutationCheckpointV145(),s=sample();assert.equal(check(s,{hp:100}),true);assert.equal(check({...s,clientSavedAt:999},{hp:100}),false);assert.equal(check({...s,serverStateClockV134:999,serverCheckpointReceiptV134:{id:'ack'}},{hp:100}),false);assert.equal(check(s,{hp:90}),true);
});
