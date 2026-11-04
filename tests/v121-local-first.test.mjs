import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stablePublicSnapshotV121,hashLocalStateV121,createLocalSyncLoopV121} from '../public/modules/local-first-save-v121.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v121 não persiste segredos de nivel superior nem muta objetos de entrada',()=>{
 const v={profile:{credits:7},access_token:'sensitive',password:'not-saved'};
 const safe=stablePublicSnapshotV121(v);
 assert.deepEqual(safe,{profile:{credits:7}});
 assert.equal(v.access_token,'sensitive');
});
test('v121 hash sha256 é estável e detecta alterações',async()=>{
 const a=await hashLocalStateV121({state:'a'}),b=await hashLocalStateV121({state:'a'}),c=await hashLocalStateV121({state:'b'});
 assert.equal(a,b);assert.notEqual(a,c);assert.equal(a.length,64);
});
test('v121 loop online não aceita IDs alheios como ACK',async()=>{
 let ack=[];const entries=[{id:'a',status:'pending'}];
 const store={pending:async()=>entries,acknowledge:async ids=>{ack=ids;}};
 const loop=createLocalSyncLoopV121({store,owner:'test',sendBatch:async()=>({acceptedIds:['a','fake']}),online:()=>true});
 const r=await loop.tick();assert.equal(r.accepted,1);assert.deepEqual(ack,['a']);
 loop.stop();
});
test('v121 não grava remotamente quando offline',async()=>{
 let calls=0;const loop=createLocalSyncLoopV121({store:{pending:async()=>{calls++;return[];}},owner:'test',sendBatch:async()=>{},online:()=>false});
 assert.equal((await loop.tick()).status,'skipped');assert.equal(calls,0);loop.stop();
});
test('v121 só habilita ponte opt-in; mantém save legado e gateway de segurança',()=>{
 const bridge=read('public/modules/local-first-bridge-v121.js');const game=read('public/game.js');
 assert.match(bridge,/localfirst.*===.1./);assert.match(game,/localStorage\.setItem\(saveKey\(\),JSON\.stringify\(progress\)\)/);
 assert.match(game,/stageLocalFirstSnapshotV121/);
});
test('v121 laboratório acessa catálogo oficial e checkpoint local',()=>{
 const lab=read('public/modules/local-first-lab-v121.js');
 assert.match(lab,/import \{ITEMS\}/);assert.match(lab,/forceCheckpoint:true/);assert.match(lab,/store\.restore/);
});
