import {writeFileSync} from 'node:fs';import {performance} from 'node:perf_hooks';
import {stateDeltaV145,compactSaveV145,applyStateDeltaV145} from '../public/modules/state-delta-v145.js';
import {createRuntimeReadCacheV145} from '../public/modules/runtime-read-cache-v145.js';
import {gzipSync} from 'node:zlib';import assert from 'node:assert/strict';
const state={accountOwnerId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',profile:{credits:100000,uridium:100},inventory:Object.fromEntries(Array.from({length:500},(_,i)=>['item_'+i,i])),missions:{daily:Array.from({length:20},(_,i)=>({id:i,progress:30,goal:50}))},ammo:{lcb10:10000},x:500,y:1000};
const metadata={operation_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',expected_token:'known'};
let beforeBytes=0,afterBytes=0,beforeGzip=0,afterGzip=0,totalMs=0;
for(let i=0;i<1000;i++){
 const next={...state,x:500+i,y:1000+i},full=JSON.stringify({state:next,...metadata}),start=performance.now();
 const compact=compactSaveV145({id:'a'.repeat(64),state},next,metadata);const packed=JSON.stringify(compact);totalMs+=performance.now()-start;
 assert.deepEqual(applyStateDeltaV145(state,stateDeltaV145(state,next)),next);
 beforeBytes+=Buffer.byteLength(full);afterBytes+=Buffer.byteLength(packed);beforeGzip+=gzipSync(full).length;afterGzip+=gzipSync(packed).length;
}
let now=0,calls=0;const cache=createRuntimeReadCacheV145({now:()=>now});for(let i=0;i<100;i++){now=i*45000;await cache.read('session|runtime',async()=>({version:++calls}));}
const result={environment:{node:process.version,type:'synthetic transport microbenchmark; no Render, device or production database'},save:{samples:1000,baselineBytes:beforeBytes,deltaBytes:afterBytes,reductionPct:100*(1-afterBytes/beforeBytes),baselineGzipBytes:beforeGzip,deltaGzipBytes:afterGzip,gzipReductionPct:100*(1-afterGzip/beforeGzip),meanEncodingMs:totalMs/1000},configuration:{attemptedReads:100,networkBefore:100,networkAfter:calls,reductionPct:100*(1-calls/100)},limitations:['Synthetic 500-item inventory; real player save sizes differ.','Gzip sizes estimate compressibility; request bodies are normally uncompressed.','Does not measure gameplay FPS, economic UI latency, total mobile traffic or SQL load.','Active writes remain server-authorized and database save format remains a full JSON snapshot.']};
writeFileSync(new URL('../docs/local-first-v145/PERFORMANCE.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
