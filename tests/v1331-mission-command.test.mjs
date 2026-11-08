import test from 'node:test';import assert from 'node:assert/strict';
import {completeMissionStateV1331,missionCommandId,rollMissionGiftV1331} from '../server/mission-command-v1331.js';
const key='daily:2026-11-07:one';
const pilot=()=>({profile:{credits:100,uridium:10,xp:0},serverPurchaseRevision:4,missions:{active:{daily:{id:'one',period:'2026-11-07',complete:true,awaitingCloudAckV107:true,definition:{title:'Test',tasks:[{id:'kill',target:2}],flatReward:{credits:25}},taskProgress:{kill:2},bonus:{credits:50,uridium:5,xp:20}}},completed:{}}});
test('mission completion and rewards form a single state transition',()=>{
 const before=pilot(),r=completeMissionStateV1331(before,{category:'daily',key,xpMultiplier:1.15,surprise:{kind:'ammo',id:'mcb25',qty:10000},now:123});
 assert.equal(before.profile.credits,100);assert.equal(r.state.profile.credits,175);assert.equal(r.state.profile.uridium,15);assert.equal(r.state.profile.xp,23);assert.equal(r.state.ammo.mcb25,10000);assert.equal(r.state.missions.active.daily,null);assert.equal(r.state.missions.completed[key],123);assert.equal(r.state.serverPurchaseRevision,5);
 const replay=completeMissionStateV1331(r.state,{category:'daily',key,now:456});assert.equal(replay.alreadyClaimed,true);assert.equal(replay.state.profile.credits,175);
});
test('incomplete, mismatched and unacknowledged missions cannot receive rewards',()=>{
 for(const mutate of [p=>p.missions.active.daily.taskProgress.kill=1,p=>p.missions.active.daily.awaitingCloudAckV107=false,p=>p.missions.active.daily.id='different']){const p=pilot();mutate(p);assert.throws(()=>completeMissionStateV1331(p,{category:'daily',key}));assert.equal(p.profile.credits,100);}
});
test('mission command identity survives reconnect and separates periods',()=>{
 assert.equal(missionCommandId('daily',key),missionCommandId('daily',key));assert.notEqual(missionCommandId('daily',key),missionCommandId('daily',key+'next'));assert.ok(missionCommandId('daily',key).length<=90);
 assert.equal(rollMissionGiftV1331('daily',0,()=>.5),null);
});
