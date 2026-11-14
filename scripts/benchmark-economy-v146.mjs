// Reproducible synthetic latency bench. No Render/production/device measurements.
import {writeFileSync,readFileSync} from 'node:fs';import {performance} from 'node:perf_hooks';import {IDBFactory} from 'fake-indexeddb';
import {database,captureRoutes,uid} from '../tests/fixtures/localfirst-v146.mjs';
import {supabasePgliteV134} from '../tests/fixtures/supabase-pglite-v134.mjs';
import {createEconomicScopeV146} from '../server/localfirst-scope-v146.js';import {createEconomicBatchV146} from '../server/localfirst-batch-v146.js';
import {openLocalSaveV121} from '../public/modules/local-first-save-v121.js';import {createEconomicManagerV146} from '../public/modules/economic-manager-v146.js';
const latency=200,pause=()=>new Promise(r=>setTimeout(r,latency)),cleanups=[];
const db=await database({after:f=>cleanups.push(f)});await db.exec(readFileSync(new URL('../sql/STELLAR_V146_OUTBOX.sql',import.meta.url),'utf8'));
const row=async()=>(await db.query('select state from game_saves where user_id=$1',[uid])).rows[0].state;
const initial=await row(),scope=createEconomicScopeV146();let rpc=0;const adapter=scope.wrap(supabasePgliteV134(db,{beforeRpc:async()=>rpc++})),invoke=captureRoutes(adapter);
const oldTimes=[],localTimes=[];let oldBytes=0,newBytes=0;
for(let i=0;i<100;i++){const body={catalog_key:'item:qa1451',request_id:crypto.randomUUID()},at=performance.now();await pause();const answer=await invoke('/api/player/purchase',body);oldTimes.push(performance.now()-at);oldBytes+=Buffer.byteLength(JSON.stringify(body))+Buffer.byteLength(JSON.stringify(answer));}
const oldRpc=rpc;rpc=0;
const store=await openLocalSaveV121({indexedDBFactory:new IDBFactory(),name:crypto.randomUUID()});let local=await row(),manager,http=0;
const handler=createEconomicBatchV146({getDb:async()=>adapter,scope,handlers:{catalog:invoke.handlers.get('/api/player/purchase')}});
manager=createEconomicManagerV146({store,owner:uid,getState:()=>local,applyLocal:s=>local=s,applyRemote:s=>local=manager.projectRemote(s),schedule:()=>1,cancel(){},events:null,send:async events=>{http++;await pause();const res={set(){return this;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};await handler({body:{events},user:{id:uid,email:'qa@test.invalid'},sb:adapter},res);if(!res.data?.results?.length)throw Error('missing receipts');newBytes+=Buffer.byteLength(JSON.stringify({events}))+Buffer.byteLength(JSON.stringify(res.data));return res.data;}});
await manager.start(await row(),{available:true});
for(let i=0;i<100;i++){const at=performance.now();await manager.enqueue('catalog',{catalog_key:'item:qa1451'},{quote:{kind:'laser',min_level:1,meta:{grant:{kind:'inventory',id:'qa1451',qty:1}}}},{price:100,currency:'credits'});localTimes.push(performance.now()-at);}
const flushAt=performance.now();while(manager.count)await manager.flush();const syncMs=performance.now()-flushAt;
const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return {mean_ms:values.reduce((a,b)=>a+b,0)/values.length,p50_ms:sorted[Math.floor(sorted.length*.5)],p95_ms:sorted[Math.floor(sorted.length*.95)]};};
const result={scenario:'100 laser purchases; synthetic 200ms HTTP latency; Node + fake-indexeddb + PGlite; uncompressed JSON bodies only',v1451:{http:100,render_supabase_rpc:oldRpc,json_bytes:oldBytes,visible_action:stats(oldTimes)},v146:{http,render_supabase_rpc:rpc,json_bytes:newBytes,visible_action:stats(localTimes),background_sync_ms:syncMs},integrity:{items:local.inventory.qa1451,credits:local.profile.credits,expected_items:200,expected_credits:980000},limits:['Not Android, FPS, Render or mobile-data measurements','Excludes TLS, headers, compression, auth/session, farm guard and retries','Normal purchases still validate in PostgreSQL per event; this benchmark does not establish lower SQL load','BOX observation messages and shared combat remain additional traffic']};
manager.stop();store.close();await Promise.all(cleanups.map(f=>f()));
writeFileSync(process.argv[2]||'benchmark-economy-v146.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
