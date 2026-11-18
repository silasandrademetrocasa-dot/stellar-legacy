import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {indexedDB} from 'fake-indexeddb';
import {TACTICS_KEY,tacticsFor,formationMultipliers} from '../public/modules/combat-tactics-v144.js';
import {openLocalSaveV121} from '../public/modules/local-first-save-v121.js';
import {LOCAL_TACTICS_INTENT_V1463,recordTacticsSubmissionV1463,submittedTacticsV1463,editLocalTacticsV1463,reconcileLocalTacticsV1463,localFormationIdV1463} from '../public/modules/local-formation-v1463.js';
const owner='11111111-1111-4111-8111-111111111111';
const fresh=()=>({accountOwnerId:owner,adminResetEpoch:0,profile:{credits:1000,uridium:100},ownedDroneFormationsV144:['furia','prisma','bastiao'],combatConfigsV2013:{active:1},selectedLaserAmmo:'lcb10',selectedRocket:'r310',hp:100,shield:80});
const select=(s,confirmed,p,id,conf=1)=>{const next=editLocalTacticsV1463(s,confirmed,p,t=>t.profiles[conf].formation=id);s[TACTICS_KEY]=structuredClone(next.desired);s[LOCAL_TACTICS_INTENT_V1463]=structuredClone(next);return next;};
const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('actual formation click works with network disconnected: 100 local selections, last wins, no network wait or vital/currency changes',async()=>{
 const confirmed=fresh(),state=structuredClone(confirmed);let saves=0,refreshes=0,notices=0;
 const ctx={authenticated:true,progress:state,confirmedCombatStateV144:confirmed,pendingCombatHudV144:null,TACTICS_KEY,LOCAL_TACTICS_INTENT_V1463,editLocalTacticsV1463,structuredClone,
  offlineFarmWorldLockedV84:()=>false,saveGame:()=>saves++,LOCAL_FIRST_FOREGROUND_V122:{notify:()=>notices++},COMBAT_HUD_V144:{refresh:()=>refreshes++},
  flushCloudSave(){throw Error('network must not be awaited');},fetch(){throw Error('offline');}};
 const a=source.indexOf('async function saveCombatHudV144('),b=source.indexOf('let equipmentSaveBaselineV109',a);vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
 for(let i=0;i<100;i++)await ctx.saveCombatHudV144(t=>t.profiles[1].formation=i%2?'prisma':'furia');
 assert.equal(localFormationIdV1463(ctx.progress,confirmed,ctx.pendingCombatHudV144),'prisma');assert.equal(saves,100);assert.equal(refreshes,100);assert.equal(notices,100);
 assert.equal(ctx.pendingCombatHudV144.base.profiles[1].formation,'original');assert.deepEqual(ctx.progress.profile,{credits:1000,uridium:100});assert.equal(ctx.progress.hp,100);assert.equal(ctx.progress.shield,80);
 assert.deepEqual(formationMultipliers(confirmed),{damage:1,hp:1,shield:1,speed:1});
 assert.match(source,/DRONE_MOTION_V144\.sample\(droneIdsV144,localFormationIdV1463/);assert.match(source,/getConfirmedFormation:\(\)=>localFormationIdV1463/);
 // Shared combat never takes its final multipliers from a local desire.
 assert.match(source,/const fmV144=formationMultipliers\(confirmedCombatStateV144\)/);
});
test('rapid edits keep the original baseline; CONF 1 and CONF 2 are independent',()=>{
 const confirmed=fresh(),s=structuredClone(confirmed);let p=select(s,confirmed,null,'furia');p=select(s,confirmed,p,'prisma');p=select(s,confirmed,p,'bastiao',2);
 assert.equal(p.base.profiles[1].formation,'original');assert.equal(p.desired.profiles[1].formation,'prisma');assert.equal(p.desired.profiles[2].formation,'bastiao');
 s.combatConfigsV2013.active=2;assert.equal(localFormationIdV1463(s,confirmed,p),'bastiao');
});
test('ACK of an earlier local choice preserves the latest choice and later ACK clears the pending intent',()=>{
 const confirmed=fresh(),s=structuredClone(confirmed);let p=select(s,confirmed,null,'furia');p.submitted={id:'snapshot-B',tactics:structuredClone(p.desired)};p=select(s,confirmed,p,'prisma');
 const remote={...structuredClone(confirmed),[TACTICS_KEY]:p.submitted.tactics,serverCheckpointReceiptV134:'snapshot-B'};
 const r=reconcileLocalTacticsV1463(remote,p);assert.equal(r.tactics.profiles[1].formation,'prisma');assert.equal(r.intent.base.profiles[1].formation,'furia');
 const done=reconcileLocalTacticsV1463({...remote,[TACTICS_KEY]:r.tactics},r.intent);assert.equal(done.intent,null);assert.equal(done.tactics.profiles[1].formation,'prisma');
});
test('other-session conflicts reconcile explicitly; unrelated remote changes merge without reverting local formation',()=>{
 const remote=fresh(),s=structuredClone(remote),p=select(s,remote,null,'prisma');const conflict={...remote,[TACTICS_KEY]:tacticsFor(remote)};conflict[TACTICS_KEY].profiles[1].formation='bastiao';
 const result=reconcileLocalTacticsV1463(conflict,p);assert.equal(result.intent,null);assert.equal(result.reason,'OTHER_SESSION_CHANGED');assert.equal(result.tactics.profiles[1].formation,'bastiao');
 const unrelated={...remote,[TACTICS_KEY]:tacticsFor(remote)};unrelated[TACTICS_KEY].profiles[2].formation='furia';
 const merged=reconcileLocalTacticsV1463(unrelated,p);assert.equal(merged.tactics.profiles[1].formation,'prisma');assert.equal(merged.tactics.profiles[2].formation,'furia');
});
test('IndexedDB/A-B-C save retains selection across process restart and a lost ACK without importing wallet or possession',async t=>{
 const name='formation-'+crypto.randomUUID();let db=await openLocalSaveV121({indexedDBFactory:indexedDB,name});t.after(()=>db.close());
 const canonical=fresh(),s=structuredClone(canonical);let p=select(s,canonical,null,'furia');p.submitted={id:'lost-ack',tactics:structuredClone(p.desired)};p=select(s,canonical,p,'prisma');s.profile.credits=999999;s[LOCAL_TACTICS_INTENT_V1463]=p;
 await db.commit(owner,s);db.close();db=await openLocalSaveV121({indexedDBFactory:indexedDB,name});
 const local=(await db.readRecovering(owner)).state,remote={...canonical,[TACTICS_KEY]:p.submitted.tactics,serverCheckpointReceiptV134:'lost-ack'};
 const recovered=reconcileLocalTacticsV1463(remote,local[LOCAL_TACTICS_INTENT_V1463]);assert.equal(recovered.tactics.profiles[1].formation,'prisma');assert.equal(remote.profile.credits,1000);assert.ok(!('profile' in recovered.intent));
 assert.deepEqual((await db.checkpoint(owner,'A')).state[LOCAL_TACTICS_INTENT_V1463],local[LOCAL_TACTICS_INTENT_V1463]);
});
test('offline selection cannot grant an unowned formation or survive another account/reset/revoked ownership',()=>{
 const remote=fresh(),s=structuredClone(remote),p=select(s,remote,null,'prisma');
 assert.throws(()=>select(s,remote,p,'leviata'),/COMBAT_SELECTION_INVALID/);
 for(const patch of [{accountOwnerId:'another'},{adminResetEpoch:1},{ownedDroneFormationsV144:['furia']}])assert.equal(reconcileLocalTacticsV1463({...remote,...patch},p).intent,null);
 assert.equal(localFormationIdV1463(s,{...remote,ownedDroneFormationsV144:[]},p),'original');
});
test('submission uses server ammo normalization, preserving a later choice when autopilot changed ammo',()=>{
 const remote=fresh(),s=structuredClone(remote);let p=select(s,remote,null,'furia');s.selectedLaserAmmo='mcb25';p.submitted={id:'ammo-ack',tactics:submittedTacticsV1463(s)};p=select(s,remote,p,'prisma');
 const ack={...remote,selectedLaserAmmo:'mcb25',[TACTICS_KEY]:p.submitted.tactics,serverCheckpointReceiptV134:'ammo-ack'};
 const reconciled=reconcileLocalTacticsV1463(ack,p);assert.ok(reconciled.intent);assert.equal(reconciled.tactics.profiles[1].formation,'prisma');
});
test('autopilot ammo change after a formation click does not leave its confirmed intent retrying forever',()=>{
 const remote=fresh(),s=structuredClone(remote);let p=select(s,remote,null,'furia');s.selectedLaserAmmo='mcb25';
 p=recordTacticsSubmissionV1463(s,p,s,'auto-ammo');
 const ack={...remote,selectedLaserAmmo:'mcb25',[TACTICS_KEY]:p.submitted.tactics,serverCheckpointReceiptV134:'auto-ammo'};
 const r=reconcileLocalTacticsV1463(ack,p);assert.equal(r.intent,null);assert.equal(r.tactics.profiles[1].formation,'furia');assert.equal(r.tactics.profiles[1].laser,'mcb25');
});
test('background checkpoint strips device-only intent and uses only the existing save writer',()=>{
 const a=source.indexOf('async function sendCloudSaveAttemptV106('),b=source.indexOf('// V106 — Single-flight save.',a),sender=source.slice(a,b);
 assert.match(sender,/delete snapshot\[LOCAL_TACTICS_INTENT_V1463\]/);assert.match(sender,/await flushLocalFirstSnapshotV121\(\)/);assert.match(sender,/saveCloudSave\(snapshot,gearIntentV1062/);
 assert.match(source,/const localTacticsIntentV1463=local\?\.\[LOCAL_TACTICS_INTENT_V1463\]/);assert.match(source,/reconcileLocalTacticsV1463\(remote.state,localTacticsIntentV1463\)/);
});
