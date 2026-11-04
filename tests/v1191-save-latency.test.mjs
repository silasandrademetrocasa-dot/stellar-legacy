import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveLatencyMonitorV1191} from '../server/save-latency-v1191.js';
test('V119.1: calcula media, P95/P99 sem jogador ou inventario',()=>{
 const m=createSaveLatencyMonitorV1191(100);
 assert.deepEqual(m.snapshot().read,{samples:0,avgMs:null,p95Ms:null,p99Ms:null});
 for(let i=1;i<=100;i++)m.record('GET',i);
 let result=m.snapshot();
 assert.deepEqual(result.read,{samples:100,avgMs:51,p95Ms:95,p99Ms:99});
 assert.equal(result.write.samples,0);
 assert.equal(JSON.stringify(result).includes('user_id'),false);
});
test('V119.1: ignora metodos nao monitorados e limita memoria',()=>{
 const m=createSaveLatencyMonitorV1191(20);
 for(let i=1;i<=120;i++)m.record('PUT',i);
 m.record('DELETE',1000);
 assert.equal(m.snapshot().write.samples,20);
 assert.equal(m.snapshot().write.p99Ms,120);
 assert.equal(m.snapshot().read.samples,0);
});
