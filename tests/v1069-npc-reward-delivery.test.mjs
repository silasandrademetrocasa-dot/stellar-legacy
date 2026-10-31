import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNpcDeathSequenceV1069,grantNpcRewardSafelyV1069,isTransientNpcRewardFailureV1069} from '../server/npc-reward-delivery-v1069.js';

const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
test('V106.9 — same NPC owner: 101, 102, 103 delivered in death order even with asynchronous RPC',async()=>{
  const queue=createNpcDeathSequenceV1069(),gate=defer(),events=[];
  const a=queue.run('pilot',async()=>{events.push('begin-101');await gate.promise;events.push('finish-101');return 101});
  const b=queue.run('pilot',async()=>{events.push('begin-102');events.push('finish-102');return 102});
  const c=queue.run('pilot',async()=>{events.push('begin-103');events.push('finish-103');return 103});
  await Promise.resolve();await Promise.resolve();
  assert.deepEqual(events,['begin-101']);
  gate.resolve();assert.deepEqual(await Promise.all([a,b,c]),[101,102,103]);
  assert.deepEqual(events,['begin-101','finish-101','begin-102','finish-102','begin-103','finish-103']);
  assert.equal(queue.pendingOwners,0);
});
test('V106.9 — unrelated owners do not block one another',async()=>{
  const q=createNpcDeathSequenceV1069(),gate=defer();
  const a=q.run('alpha',()=>gate.promise);
  const b=q.run('beta',async()=> 'fast');
  assert.equal(await b,'fast');gate.resolve('slow');assert.equal(await a,'slow');
});
test('V106.9 — a failed grant does not freeze the next NPC for the owner',async()=>{
  const q=createNpcDeathSequenceV1069();
  const a=q.run('pilot',async()=>{throw Error('temporary')});
  const b=q.run('pilot',async()=> 'next kill delivered');
  await assert.rejects(a,/temporary/);assert.equal(await b,'next kill delivered');
  await Promise.resolve();await Promise.resolve();
  assert.equal(q.pendingOwners,0);
});
test('V106.9 — SQL statement timeout AFTER commit: retry same key and recover exact ledger amount',async()=>{
  let calls=0,reads=0;
  const reward=await grantNpcRewardSafelyV1069({
    grant:async()=>{calls++;if(calls===1)throw Error('canceling statement due to statement timeout');return {revision:102,granted:false,credits:0,stl:0,kill_key:'room:npc_42'};},
    readReceipt:async()=>{reads++;return {credits:7800,stl:90};},sleep:async()=>{}
  });
  assert.deepEqual({calls,reads,recovered:reward.recoveredAfterTimeout,granted:reward.granted,credits:reward.credits,stl:reward.stl},{calls:2,reads:1,recovered:true,granted:true,credits:7800,stl:90});
});
test('V106.9 — SQL timeout BEFORE commit: retry succeeds without extra ledger query',async()=>{
  let calls=0,reads=0;
  const r=await grantNpcRewardSafelyV1069({
    grant:async()=>{if(++calls===1)throw Error('fetch failed: socket hang up');return {revision:109,granted:true,credits:120,stl:12};},
    readReceipt:async()=>{reads++;return null;},sleep:async()=>{}
  });
  assert.equal(r.revision,109);assert.equal(r.credits,120);assert.equal(calls,2);assert.equal(reads,0);
});
test('V106.9 — invalid requests or permissions must not be retried',async()=>{
  for(const msg of ['NPC_REWARD_INVALID','OFFLINE_FARM_ACTIVE','permission denied']){
    let calls=0;
    await assert.rejects(grantNpcRewardSafelyV1069({grant:async()=>{calls++;throw Error(msg)},readReceipt:async()=>null,sleep:async()=>{}}),new RegExp(msg));
    assert.equal(calls,1);
  }
  assert.equal(isTransientNpcRewardFailureV1069(new Error('statement timeout')),true);
  assert.equal(isTransientNpcRewardFailureV1069(new Error('NPC_REWARD_INVALID')),false);
});
test('V106.9 — missing or invalid recovery receipt fails closed, never invents a prize',async()=>{
  let attempts=0;
  await assert.rejects(grantNpcRewardSafelyV1069({
    grant:async()=>{if(++attempts===1)throw Error('statement timeout');return {granted:false,revision:2};},
    readReceipt:async()=>({credits:-1,stl:1}),sleep:async()=>{}
  }),/NPC_REWARD_RECOVERY_RECEIPT_MISSING/);
});
test('V106.9 — source: queue reserved before awaits; Elite only after SQL; ledger recovery never mutates balances directly',()=>{
  const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
  const index=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
  const before=world.indexOf('return this.world.npcDeathSequenceV1069.run(');
  const processing=world.indexOf('async commitNpcDeathV1069(');
  assert.ok(before>0&&processing>before);
  const grant=world.indexOf('const serverReward=await this.world.grantNpcReward(',processing);
  const elite=world.indexOf("this.world.recordEliteEvent?.(c.player.userId,'npc_kill')",processing);
  assert.ok(grant>0&&elite>grant);
  assert.match(index,/return grantNpcRewardSafelyV1069\(\{grant,readReceipt\}\);/);
  assert.match(index,/\.eq\('kill_key',killKey\)\.maybeSingle\(\)/);
});
