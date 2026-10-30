import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {missionSaveGuardV108} from '../server/mission-save-guard-v108.js';
import {createMissionRewardAckV108} from '../public/modules/mission-reward-ack-v108.js';
import {mergeUnsavedMissionProgressV105} from '../public/modules/mission-save-recovery-v105.js';
const k='weekly:2026-10-26:weekly_npc_saimon_70';
const act=(count,props={})=>({id:'weekly_npc_saimon_70',period:'2026-10-26',complete:count>=70,
  awaitingCloudAckV107:count>=70,taskProgress:{'kill_1':count},
  definition:{id:'weekly_npc_saimon_70',tasks:[{id:'kill_1',target:70,type:'kill',npc:'saimon'}]},...props});
const state=(a,completed={})=>({missions:{active:{weekly:a},completed}});
test('V108: cannot regress a previously confirmed NPC count (70 to 69)',()=>{
 assert.equal(missionSaveGuardV108(state(act(70)),state(act(69))),'SAVE_MISSION_STALE');
 assert.equal(missionSaveGuardV108(state(act(69)),state(act(70))),null);
});
test('V108: cannot erase a paid mission receipt in an obsolete snapshot',()=>{
 assert.equal(missionSaveGuardV108(state(null,{[k]:100}),state(null,{})),'SAVE_MISSION_STALE');
 assert.equal(missionSaveGuardV108(state(null,{[k]:100}),state(null,{[k]:101})),'SAVE_MISSION_STALE');
 assert.equal(missionSaveGuardV108(state(null,{[k]:100}),state(null,{[k]:100})),null);
});
test('V108: payout only accepted after completed objective stored in DB',()=>{
 assert.equal(missionSaveGuardV108(state(act(69)),state(null,{[k]:100})),'SAVE_MISSION_UNVERIFIED');
 assert.equal(missionSaveGuardV108(state(act(70)),state(null,{[k]:100})),null);
 assert.equal(missionSaveGuardV108(state(act(70,{awaitingCloudAckV107:false})),state(null,{[k]:100})),'SAVE_MISSION_UNVERIFIED');
});
test('V108: active completed contract cannot be silently abandoned or replaced',()=>{
 assert.equal(missionSaveGuardV108(state(act(70)),state(null)),'SAVE_MISSION_STALE');
 assert.equal(missionSaveGuardV108(state(act(70)),state(act(1,{id:'different'}))),'SAVE_MISSION_STALE');
 assert.equal(missionSaveGuardV108(state(act(70)),state(act(70))),null);
});
test('V108: ordinary abandon or rename remains allowed before objective completion',()=>{
 assert.equal(missionSaveGuardV108(state(act(20)),state(null)),null);
 assert.equal(missionSaveGuardV108(state(act(20)),state(act(1,{id:'different'}))),null);
});
test('V108: staged reward stays single and deterministic through repeated stale retries',()=>{
 const tracker=createMissionRewardAckV108();let generated=0;
 let prize=tracker.stage(k,()=>({key:k,surprise:{kind:'ammo',id:'mcb25',qty:100},bonus:{uridium:100},mission:{title:'Weekly'}}));generated++;
 const again=tracker.stage(k,()=>{generated++;return {key:k,surprise:null}});
 assert.equal(again,prize);assert.equal(generated,1);assert.equal(tracker.isPendingCategory('weekly'),true);
 assert.deepEqual(tracker.acknowledge({completed:{}}),[]);
 assert.deepEqual(tracker.acknowledge({completed:{[k]:Date.now()}}),[prize]);
 assert.deepEqual(tracker.acknowledge({completed:{[k]:Date.now()}}),[]);
 assert.equal(tracker.isPendingCategory('weekly'),false);
 assert.equal(tracker.stage(k,()=>({})),null);
});
test('V108: second save stale -> recover official 70/70, do not pay until ACK',()=>{
 const remote={active:{weekly:act(70)},completed:{}};
 const local={active:{weekly:null},completed:{[k]:123}};
 const merged=mergeUnsavedMissionProgressV105(remote,local,()=> '2026-10-26');
 assert.equal(merged.changed,false);
 assert.equal(merged.missions.active.weekly.taskProgress.kill_1,70);
 const tracker=createMissionRewardAckV108();
 tracker.stage(k,()=>({key:k,bonus:{uridium:500},mission:{title:'Zyron'}}));
 assert.deepEqual(tracker.acknowledge(merged.missions),[]);
 assert.equal(tracker.isPendingCategory('weekly'),true);
 assert.equal(missionSaveGuardV108(state(act(70)),state(null,{[k]:123})),null);
 assert.equal(tracker.acknowledge({completed:{[k]:123}}).length,1);
});
test('V108: initial save and server-free bootstrap remain compatible',()=>{
 assert.equal(missionSaveGuardV108(null,state(act(70))),null);
});
test('V108: game only announces rewards after payout ACK, not on stage',()=>{
 const src=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 const fn=src.split('function finishMissionAutomatically(category,mission,active){')[1].split('function claimMission(category){')[0];
 assert.doesNotMatch(fn,/showMissionCompleteAnimation|showToast\(`Recompensa/);
 assert.match(src,/announceCommittedMissionRewardsV108\(snapshot\.missions\)/);
 assert.match(src,/announceCommittedMissionRewardsV108\(remote\.state\.missions\)/);
 assert.match(src,/MISSION_REWARD_ACK_V108\.isPendingCategory\(category\)/);
});
test('V108: server performs mission validation before writing save',()=>{
 const src=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
 const location=src.indexOf('const missionErrorV108=missionSaveGuardV108(serverSave?.state||null,state);');
 assert.ok(location>0);
 assert.ok(location<src.indexOf('const updated_at = new Date().toISOString();',location));
 assert.match(src,/code:missionErrorV108/);
});
