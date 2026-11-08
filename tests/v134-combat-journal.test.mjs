import test from 'node:test';import assert from 'node:assert/strict';
import {createCombatJournalV134} from '../public/modules/combat-journal-v134.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
test('ammo fired while a purchase is in flight is retained until checkpoint ACK',()=>{
 const j=createCombatJournalV134({storage:memory(),key:'a'});j.spend('ammo','lcb10',10);j.submit('checkpoint_1');j.spend('ammo','lcb10',4);
 assert.equal(j.reconcile({ammo:{lcb10:150}}).ammo.lcb10,136);j.acknowledge('checkpoint_1');assert.equal(j.reconcile({ammo:{lcb10:140}}).ammo.lcb10,136);j.acknowledge('checkpoint_1');assert.equal(j.reconcile({ammo:{lcb10:140}}).ammo.lcb10,136);
});
test('closing the process after a lost ACK can recover the receipt without consuming twice',()=>{
 const storage=memory(),j=createCombatJournalV134({storage,key:'a'});j.spend('rockets','r310',2);j.submit('checkpoint_2');
 const restored=createCombatJournalV134({storage,key:'a'});assert.equal(restored.reconcile({rockets:{r310:10}}).rockets.r310,8);
 assert.equal(restored.reconcile({rockets:{r310:8},serverCheckpointReceiptV134:'checkpoint_2'}).rockets.r310,8);assert.equal(restored.pending,false);
 const other=createCombatJournalV134({storage,key:'b'});assert.equal(other.pending,false);
});
