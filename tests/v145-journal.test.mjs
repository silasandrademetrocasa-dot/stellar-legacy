import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {openLocalSaveV121} from '../public/modules/local-first-save-v121.js';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const snapshot=n=>({accountOwnerId:owner,profile:{credits:100},clientSavedAt:n});
async function rawOpen(factory,name){return new Promise((resolve,reject)=>{const req=factory.open(name);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
test('IndexedDB transaction: repeated event, reused ID, monotonic sequence and unrelated hangar survive economy intent',async()=>{
 const factory=new IDBFactory(),d=await openLocalSaveV121({indexedDBFactory:factory,name:'journal'});
 const intent={id:crypto.randomUUID(),module:'hangar',action:'pending',payload:{signature:'one'}};
 await d.commit(owner,snapshot(1),{intent});await d.commit(owner,snapshot(2),{intent});assert.equal((await d.pending(owner)).length,1);
 const before=await d.read(owner);
 await assert.rejects(d.commit(owner,snapshot(3),{intent:{...intent,payload:{signature:'different'}}}));assert.deepEqual(await d.read(owner),before);
 await d.commit(owner,snapshot(4),{intent:{id:crypto.randomUUID(),module:'economy',action:'pending',payload:{sku:'a'}}});
 assert.equal((await d.pending(owner)).length,2);
 const replacement={...intent,id:crypto.randomUUID(),payload:{signature:'two'}};await d.commit(owner,snapshot(5),{intent:replacement});
 const entries=await d.pending(owner);assert.equal(entries.length,2);assert.equal(entries[0].module,'economy');assert.ok(entries[1].sequence>entries[0].sequence);
 await d.acknowledge([entries[0].id]);assert.equal((await d.pending(owner)).length,1);d.close();
 const reopened=await openLocalSaveV121({indexedDBFactory:factory,name:'journal'});assert.equal((await reopened.pending(owner)).length,1);reopened.close();
});
test('IndexedDB A/B/C recovery skips corrupted primary and corrupted A, then verifies B without touching pending events',async()=>{
 const factory=new IDBFactory(),d=await openLocalSaveV121({indexedDBFactory:factory,name:'recovery'});
 for(let i=1;i<=60;i++)await d.commit(owner,snapshot(i),{forceCheckpoint:true});
 for(const slot of ['A','B','C'])assert.ok(await d.checkpoint(owner,slot));
 const id=crypto.randomUUID();await d.commit(owner,snapshot(61),{intent:{id,module:'hangar',action:'pending',payload:{}}});
 const raw=await rawOpen(factory,'recovery');
 await new Promise((resolve,reject)=>{const tx=raw.transaction(['saves','checkpoints'],'readwrite');
  tx.objectStore('saves').get(owner).onsuccess=e=>tx.objectStore('saves').put({...e.target.result,hash:'bad'});
  tx.objectStore('checkpoints').get(owner+':A').onsuccess=e=>tx.objectStore('checkpoints').put({...e.target.result,hash:'bad'});
  tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
 });
 assert.equal((await d.readRecovering(owner)).recoveredFrom,'B');assert.equal((await d.pending(owner))[0].id,id);
 raw.close();d.close();
});
test('two IndexedDB connections serialize 100 writes without duplicate revision',async()=>{
 const factory=new IDBFactory();const [a,b]=await Promise.all([openLocalSaveV121({indexedDBFactory:factory,name:'two'}),openLocalSaveV121({indexedDBFactory:factory,name:'two'})]);
 await Promise.all(Array.from({length:100},(_,i)=>(i%2?a:b).commit(owner,snapshot(i))));
 assert.equal((await a.read(owner)).revision,100);a.close();b.close();
});
