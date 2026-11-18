import {passiveCheckpointV1465} from '../public/modules/passive-checkpoint-v1465.js';
import {LOCAL_TACTICS_INTENT_V1463,recordTacticsSubmissionV1463,editLocalTacticsV1463} from '../public/modules/local-formation-v1463.js';
import {mergePendingPassV1462} from '../public/modules/task-claims-v1462.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {equipmentRecoveryBaseV1342,submittedEquipmentConfirmedV1342,equipmentFingerprintV109,reconcilePendingEquipmentV109,checkpointWithoutEquipmentDeltaV1342} from '../public/modules/hangar-save-recovery-v109.js';
import {equipmentLayoutSignatureV1062} from '../public/modules/hangar-write-guard-v1062.js';
import {mergePlayerStateV134} from '../public/modules/player-state-merge-v134.js';
const clone=structuredClone;
const base=()=>({accountOwnerId:'owner',activeShipId:'goliath',ownedShips:['goliath'],inventory:{lf4:3,shield:2},shipLoadout:{lasers:[],generators:[],extras:[]},drones:[{id:'d',type:'iris',slots:[null,null]}],pet:{owned:true,lasers:[],shields:[],activeGear:'box',protocols:{box:1},advancedProtocolEquippedV110:{hp:1}},combatConfigsV2013:{shipId:'goliath',active:1,profiles:{1:{shipLoadout:{lasers:[],generators:[],extras:[]},droneSlots:{d:[]},petLoadout:{lasers:[],shields:[]},shield:21},2:{shipLoadout:{lasers:[],generators:[],extras:[]},droneSlots:{d:[]},petLoadout:{lasers:[],shields:[]},shield:7}}},profile:{credits:100},ammo:{lcb10:100},rockets:{},cargo:{},serverStateClockV134:1});
function equip(s,n=1){s.shipLoadout.lasers=Array(n).fill('lf4');s.inventory.lf4=3-n;s.combatConfigsV2013.profiles[1].shipLoadout=clone(s.shipLoadout);return s;}
test('V134.2: delayed ACK of first equip keeps the second edit, balances and shields',()=>{
 const b=base(),submitted=equip(clone(b)),desired=equip(clone(b),2),remote=clone(submitted);
 remote.serverCheckpointReceiptV134='receipt-one';remote.serverStateClockV134=4;remote.profile.credits=800;
 const before=clone(desired);
 assert.equal(reconcilePendingEquipmentV109(remote,desired,b).ok,false);
 const out=reconcilePendingEquipmentV109(remote,desired,b,{id:'receipt-one',snapshot:submitted});
 assert.equal(out.ok,true);assert.equal(out.alreadySaved,false);assert.equal(out.state.shipLoadout.lasers.length,2);
 assert.equal(out.state.profile.credits,800);assert.equal(out.state.combatConfigsV2013.profiles[2].shield,7);
 assert.deepEqual(desired,before);
 assert.equal(reconcilePendingEquipmentV109(remote,desired,b,{id:'fake',snapshot:submitted}).ok,false);
});
test('V134.2: confirmed layouts compare semantically after server normalization',()=>{
 const s=equip(base());s.inventory.shield=0;s.shipLoadout.lasers.push(null);s.drones[0].slots.push(null);
 const normalized=clone(s);delete normalized.inventory.shield;normalized.shipLoadout.lasers.pop();normalized.drones[0].slots.pop();
 normalized.inventory=Object.fromEntries(Object.entries(normalized.inventory).reverse());
 assert.equal(equipmentFingerprintV109(s),equipmentFingerprintV109(normalized));
 assert.equal(reconcilePendingEquipmentV109(normalized,s,base()).alreadySaved,true);
});
test('V134.2: server inventory grant is retained, missing free stock and invented items rejected',()=>{
 const b=base(),desired=equip(clone(b),2),remote=clone(b);remote.inventory.lf4+=4;remote.profile.credits=420;
 const out=reconcilePendingEquipmentV109(remote,desired,b);assert.equal(out.ok,true);assert.equal(out.state.inventory.lf4,5);assert.equal(out.state.profile.credits,420);
 remote.inventory.lf4=0;assert.equal(reconcilePendingEquipmentV109(remote,desired,b).ok,false);
 desired.inventory.lf4=99;assert.equal(reconcilePendingEquipmentV109(b,desired,b).ok,false);
});
test('V134.2: CONF, drones and AUX newer than ACK survive with an exact submitted receipt',()=>{
 const b=base(),submitted=equip(clone(b)),desired=clone(submitted),remote=clone(submitted);
 remote.serverCheckpointReceiptV134='conf-one';remote.serverStateClockV134=3;
 desired.combatConfigsV2013.active=2;desired.shipLoadout.lasers=[];desired.drones[0].slots=['lf4'];
 desired.pet.shields=['shield'];desired.inventory.shield--;desired.pet.protocols={box:2};desired.pet.advancedProtocolEquippedV110={hp:2};
 const out=reconcilePendingEquipmentV109(remote,desired,b,{id:'conf-one',snapshot:submitted});
 assert.equal(out.ok,true);assert.equal(out.state.combatConfigsV2013.active,2);assert.deepEqual(out.state.drones[0].slots,['lf4']);assert.deepEqual(out.state.pet.shields,['shield']);assert.equal(out.state.pet.protocols.box,2);assert.equal(out.state.pet.advancedProtocolEquippedV110.hp,2);
 remote.shipLoadout.lasers=['shield'];assert.equal(reconcilePendingEquipmentV109(remote,desired,b,{id:'conf-one',snapshot:submitted}).ok,false);
});
test('V134.2: equipment arrays bypass generic ACK merge while combat changes are retained',()=>{
 const submitted=equip(base()),local=equip(clone(submitted),2),remote=clone(submitted);remote.profile.credits=900;remote.serverStateClockV134=9;
 local.missions={active:{day:{kills:5}}};local.x=380;
 const next=checkpointWithoutEquipmentDeltaV1342(local,submitted);
 const out=mergePlayerStateV134(submitted,next,remote);
 assert.equal(out.shipLoadout.lasers.length,1);assert.equal(out.inventory.lf4,2);assert.equal(out.profile.credits,900);assert.equal(out.missions.active.day.kills,5);assert.equal(out.x,380);
 assert.equal(local.shipLoadout.lasers.length,2);
});
const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const sendSource=extract('async function sendCloudSaveAttemptV106()','// V106 — Single-flight save.');
const installSource=extract('function installEconomyState(','window.stellarEconomySyncBeforeV4776');
function context(){
 const s=base();let operation=0;
 const c={passiveCheckpointV1465,LOCAL_TACTICS_INTENT_V1463,recordTacticsSubmissionV1463,pendingCombatHudV144:null,mergePendingPassV1462,ECONOMY_V146:null,structuredClone,console,Date,Math,Number,Boolean,JSON,Set,Map,Promise,queueMicrotask,
  progress:s,authenticated:true,gameBootstrapRuntime:{generation:1},cloudSaveMutationV105:1,cloudDirty:true,cloudBusy:false,accountResetEpochV478:0,
  equipmentSaveBaselineV109:clone(s),equipmentSaveDesiredV109:null,equipmentSavePendingV109:true,equipmentSubmittedV1342:null,equipmentSaveWarningAtV109:0,saveIntegrityBlockedV106:false,
  saveOperationPendingV119:null,saveOperationIdV119:()=> '00000000-0000-4000-8000-'+String(++operation).padStart(12,'0'),
  equipmentLayoutSignatureV1062,equipmentFingerprintV109,reconcilePendingEquipmentV109,checkpointWithoutEquipmentDeltaV1342,mergePlayerStateV134,
  confirmCombatStateV144(){},formationVitalsPendingV144:false,
  offlineFarmWorldLockedV84:()=>false,setSync(){},pendingCargoV1333:()=>({submit(){},acknowledge(){},pending:false}),combatJournalV134:()=>({submit(){},acknowledge(){}}),
  AMMO_SELECTION_V1061:{pending:false,confirm(){}},missionSavePendingV105:false,player:{hp:5,shield:3,maxHp:5,maxShield:3},
  mergeUnsavedMissionProgressV105:()=>({changed:false}),staleSaveAuthoritiesV1331:()=>[],adoptSaveRead(){},
  installServerStatePreservingPosition(s){c.progress=clone(s);},createBonusBoxes(){},computeStats(){},clampStoredShieldV2013:(s,max)=>Math.min(s,max),
  saveActiveBattleConfigV2013(){},localStorage:{setItem(){}},saveKey:()=> 'qa',saveGame(){c.cloudSaveMutationV105++;c.cloudDirty=true;},persistEquipmentIntentV1062(){},scheduleEquipmentSaveV109(){},
  clearEquipmentIntentV1062(){},equipmentRecoveryWarningV109(){throw Error('unexpected recovery failure');},
  buildAmmoButtons(){},refreshPetViews(){},renderShop(){},renderCargo(){},renderGalaxyGate(){},refreshPilotViews(){},updateUI(){},showToast(){},
  acknowledgeConfirmedHangarV1211(){},getUser:()=>({id:'owner'}),announceCommittedMissionRewardsV108(){},confirmedMissionCategoriesV107:()=>[],
  equipmentSavedV109(s){if(equipmentFingerprintV109(s)===equipmentFingerprintV109(c.equipmentSaveDesiredV109)){c.equipmentSavePendingV109=false;c.equipmentSaveDesiredV109=null;}}
 };
 vm.createContext(c);vm.runInContext(installSource+'\n'+sendSource,c);return c;
}
test('V134.2: actual checkpoint sender preserves rapid edits across the first ACK and confirms the next',async()=>{
 const c=context();c.progress=equip(c.progress);c.equipmentSaveDesiredV109=clone(c.progress);
 let calls=0;
 c.saveCloudSave=async submitted=>{
  calls++;const remote=clone(submitted);remote.serverCheckpointReceiptV134=c.equipmentSubmittedV1342.id;remote.serverStateClockV134=calls+1;
  if(calls===1){c.progress=equip(c.progress,2);c.equipmentSaveDesiredV109=clone(c.progress);c.cloudSaveMutationV105++;}
  return {ok:true,state:remote};
 };
 assert.equal((await c.sendCloudSaveAttemptV106()).status,'saved');assert.equal(c.progress.shipLoadout.lasers.length,2);assert.equal(c.equipmentSavePendingV109,true);
 assert.equal((await c.sendCloudSaveAttemptV106()).status,'saved');assert.equal(c.progress.shipLoadout.lasers.length,2);assert.equal(c.equipmentSavePendingV109,false);
});
test('V146.3: actual checkpoint persists formation submission before the one existing HTTP save and strips device metadata',async()=>{
 const c=context(),trace=[];c.equipmentSavePendingV109=false;c.progress.ownedDroneFormationsV144=['furia'];
 c.pendingCombatHudV144=editLocalTacticsV1463(c.progress,c.progress,null,t=>t.profiles[1].formation='furia');c.progress.combatHudV144=clone(c.pendingCombatHudV144.desired);
 c.stageLocalFirstSnapshotV121=(owner,state)=>{trace.push('stage');assert.equal(state.clientCombatIntentV1463.submitted.id,c.saveOperationPendingV119.id);};
 c.flushLocalFirstSnapshotV121=async()=>trace.push('local');
 c.saveCloudSave=async (submitted,gear,meta)=>{await meta.beforeSend?.();trace.push('http');assert.equal(submitted.clientCombatIntentV1463,undefined);assert.equal(submitted.combatHudV144.profiles[1].formation,'furia');return {ok:true,state:clone(submitted)};};
 const result=await c.sendCloudSaveAttemptV106();assert.equal(result.status,'saved');assert.deepEqual(trace,['stage','local','http']);
});
test('V134.2: lost HTTP ACK plus readback keeps newer edits for the next save',async()=>{
 const c=context();c.progress=equip(c.progress);c.equipmentSaveDesiredV109=clone(c.progress);let remote;
 c.saveCloudSave=async submitted=>{remote=clone(submitted);remote.serverCheckpointReceiptV134=c.equipmentSubmittedV1342.id;c.progress=equip(c.progress,2);c.equipmentSaveDesiredV109=clone(c.progress);c.cloudSaveMutationV105++;throw Object.assign(Error('lost'),{status:504});};
 c.loadCloudSave=async()=>({state:remote});
 assert.equal(await c.sendCloudSaveAttemptV106(),'retry');assert.equal(c.progress.shipLoadout.lasers.length,2);assert.equal(c.equipmentSavePendingV109,true);assert.equal(c.cloudDirty,true);
});
test('V146.2: actual economic installer preserves locally completed pass objectives and installs only authoritative claim markers',()=>{
 const c=context();c.equipmentSavePendingV109=false;
 c.progress.battlePass={season:'qa',points:500,claimedTiers:{},premiumClaimedTiers:{},daily:{key:'2026-11-14',progress:{kills:15},completed:{kills:123}}};
 const remote=clone(c.progress);remote.battlePass.points=400;remote.battlePass.daily.progress.kills=8;remote.battlePass.daily.completed={};remote.battlePass.claimedTiers={1:456};remote.profile.credits=999;
 c.cloudDirty=false;c.installEconomyState(remote,{localFirstReceipt:true});
 assert.equal(c.progress.battlePass.points,500);assert.equal(c.progress.battlePass.daily.completed.kills,123);assert.equal(c.progress.battlePass.claimedTiers[1],456);assert.equal(c.progress.profile.credits,999);assert.equal(c.cloudDirty,true);
 assert.equal(c.player.hp,5);assert.equal(c.player.shield,3);
});
test('V146.2: a server reward adding a ship preserves legitimate pending equipment, without accepting client ownership or another-device edits',()=>{
 const c=context(),b=clone(c.progress);c.progress=equip(c.progress,2);c.equipmentSaveDesiredV109=clone(c.progress);
 const remote=clone(b);remote.ownedShips.push('leonov');remote.inventory.lf4++;
 c.installEconomyState(remote,{localFirstReceipt:true});
 assert.equal(c.progress.shipLoadout.lasers.length,2);assert.equal(c.progress.inventory.lf4,2);assert.deepEqual(c.progress.ownedShips,['goliath','leonov']);assert.equal(c.equipmentSavePendingV109,true);
 const forged=equip(clone(b));forged.ownedShips.push('invented');assert.equal(reconcilePendingEquipmentV109(remote,forged,b,null,{allowShipGrants:true}).ok,false);
 const other=equip(clone(remote));assert.equal(reconcilePendingEquipmentV109(other,equip(clone(b),2),b,null,{allowShipGrants:true}).ok,false);
 const removed=clone(b);removed.ownedShips=[];assert.equal(reconcilePendingEquipmentV109(removed,equip(clone(b)),b,null,{allowShipGrants:true}).ok,false);
});

test('V134.2: reopen recovers pending equipment from durable submitted receipt, without local money',()=>{
 const b=base(),submitted=equip(clone(b)),desired=equip(clone(b),2),remote=clone(submitted);
 remote.serverCheckpointReceiptV134='durable-op';remote.profile.credits=777;desired.profile.credits=999999999;
 const journal=JSON.parse(JSON.stringify({id:'durable-op',snapshot:equipmentRecoveryBaseV1342(submitted)}));
 assert.equal(journal.snapshot.profile,undefined);assert.equal(submittedEquipmentConfirmedV1342(remote,journal),true);
 const recovered=reconcilePendingEquipmentV109(remote,desired,remote,journal);
 assert.equal(recovered.ok,true);assert.equal(recovered.state.shipLoadout.lasers.length,2);assert.equal(recovered.state.profile.credits,777);
 assert.equal(submittedEquipmentConfirmedV1342({...remote,serverCheckpointReceiptV134:'other'},journal),false);
});
test('V134.2: stale economy snapshots cannot clear pending hangar or advance its base',()=>{
 const c=context(),before=clone(c.progress);c.equipmentSaveDesiredV109=clone(c.progress);
 c.staleSaveAuthoritiesV1331=()=>['serverStateClockV134'];c.installServerStatePreservingPosition=()=>{throw Object.assign(Error('old snapshot'),{code:'SAVE_RESPONSE_STALE'});};
 assert.throws(()=>c.installEconomyState({...base(),serverStateClockV134:0}),{code:'SAVE_RESPONSE_STALE'});
 assert.deepEqual(c.progress,before);assert.equal(c.equipmentSavePendingV109,true);assert.deepEqual(c.equipmentSaveBaselineV109,before);
});
test('V146.5: passive gameplay checkpoint repairs layout drift without a GET or hangar warning',async()=>{
 const c=context();c.equipmentSavePendingV109=false;const confirmed=clone(c.progress);
 c.progress=equip(c.progress);c.progress.x=703;c.progress.hp=19;c.progress.shield=4;c.progress.missions={kills:12};
 c.progress.combatConfigsV2013.profiles[2].shield=2;
 let calls=0;c.loadCloudSave=()=>{throw Error('unexpected GET');};
 c.saveCloudSave=async (submitted,intent)=>{calls++;assert.equal(intent,null);assert.equal(equipmentLayoutSignatureV1062(submitted),equipmentLayoutSignatureV1062(confirmed));assert.equal(submitted.inventory.lf4,3);assert.equal(submitted.x,703);assert.equal(submitted.hp,19);assert.equal(submitted.shield,4);assert.equal(submitted.missions.kills,12);assert.equal(submitted.combatConfigsV2013.profiles[2].shield,2);return {ok:true,state:clone(submitted)};};
 assert.equal((await c.sendCloudSaveAttemptV106()).status,'saved');assert.equal(calls,1);assert.equal(c.progress.shipLoadout.lasers.length,0);assert.equal(c.progress.missions.kills,12);
});
test('V146.5: immutable failed checkpoint retries the original ID, equipment intent and snapshot',async()=>{
 const c=context();c.equipmentSavePendingV109=false;c.console={...console,warn(){}};let first;
 c.saveCloudSave=async (state,intent,meta)=>{first={state:clone(state),intent:clone(intent),id:meta.operation_id};throw Error('offline');};
 await c.sendCloudSaveAttemptV106();assert.ok(c.saveOperationPendingV119);
 c.progress=equip(c.progress);c.equipmentSavePendingV109=true;c.equipmentSaveDesiredV109=clone(c.progress);c.cloudSaveMutationV105++;
 c.saveCloudSave=async (state,intent,meta)=>{assert.deepEqual(state,first.state);assert.equal(intent,first.intent);assert.equal(meta.operation_id,first.id);return {ok:true,state:clone(state)};};
 assert.equal((await c.sendCloudSaveAttemptV106()).status,'saved');assert.equal(c.equipmentSavePendingV109,true);assert.equal(c.progress.shipLoadout.lasers.length,1);
});
test('V146.5: passive projection isolates owners/reset and keeps combat data without modifying input',()=>{
 const b=base(),local=equip(clone(b));local.pet.activeGear='off';local.profile.credits=999;local.cargo={ore:3};local.ammo={x:7};
 const before=clone(local),out=passiveCheckpointV1465(local,b);assert.equal(out.changed,true);assert.deepEqual(local,before);assert.equal(out.state.profile.credits,999);assert.deepEqual(out.state.cargo,{ore:3});assert.deepEqual(out.state.ammo,{x:7});assert.equal(out.state.pet.activeGear,'off');
 assert.throws(()=>passiveCheckpointV1465({...local,accountOwnerId:'another'},b),{code:'SAVE_SESSION_CHANGED'});
 assert.throws(()=>passiveCheckpointV1465({...local,adminResetEpoch:1},b),{code:'SAVE_SESSION_CHANGED'});
});
