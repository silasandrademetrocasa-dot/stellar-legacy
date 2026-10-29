import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pendingMissionCategoriesV107,confirmedMissionCategoriesV107} from '../public/modules/mission-completion-sync-v107.js';
import {mergeUnsavedMissionProgressV105} from '../public/modules/mission-save-recovery-v105.js';

const mission=(count=9,opts={})=>({id:'weekly_npc_mordon_10',period:'2026-10-26',
  complete:count>=10,awaitingCloudAckV107:count>=10,
  definition:{id:'weekly_npc_mordon_10',tasks:[{id:'kill_mordon_10',type:'kill',npc:'mordon',target:10}]},
  bonus:{credits:count*100,uridium:count*2,xp:count*50},taskProgress:{kill_mordon_10:count},...opts});
const record=(m,completed={})=>({active:{weekly:m},completed});
const key='weekly:2026-10-26:weekly_npc_mordon_10';
test('V107: 10th kill remains pending and survives stale save 9/10',()=>{
  const remote=record(mission(9)),local=record(mission(10));
  const r=mergeUnsavedMissionProgressV105(remote,local,()=> '2026-10-26');
  assert.equal(r.changed,true);
  assert.equal(r.missions.active.weekly.taskProgress.kill_mordon_10,10);
  assert.equal(r.missions.active.weekly.complete,true);
  assert.equal(r.missions.active.weekly.awaitingCloudAckV107,true);
  assert.equal(r.missions.active.weekly.bonus.uridium,20);
  assert.equal(remote.active.weekly.taskProgress.kill_mordon_10,9);
});
test('V107: do not resurrect a mission already completed on server',()=>{
  const remote=record(null,{[key]:169});const local=record(mission(10));
  const r=mergeUnsavedMissionProgressV105(remote,local,()=> '2026-10-26');
  assert.equal(r.changed,false);assert.equal(r.missions.active.weekly,null);
});
test('V107: incomplete 9/10 and legacy complete without new pending marker cannot be paid',()=>{
  assert.deepEqual(pendingMissionCategoriesV107(record(mission(9))),[]);
  assert.deepEqual(pendingMissionCategoriesV107(record(mission(10,{awaitingCloudAckV107:false}))),[]);
});
test('V107: only server-confirmed and same live pending contract can be finalized',()=>{
  const snapshot=record(mission(10));
  assert.deepEqual(confirmedMissionCategoriesV107(snapshot,record(mission(10))),['weekly']);
  assert.deepEqual(confirmedMissionCategoriesV107(snapshot,record(mission(9))),[]);
  assert.deepEqual(confirmedMissionCategoriesV107(snapshot,record(mission(10,{id:'other'}))),[]);
  assert.deepEqual(confirmedMissionCategoriesV107(snapshot,record(mission(10),{[key]:169})),[]);
});
test('V107: the 100% notification is staged; award is only after successful save ACK',()=>{
  const src=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(src,/for\(const item of finished\)item\.active\.awaitingCloudAckV107=true/);
  assert.match(src,/for\(const category of confirmedMissionCategoriesV107\(snapshot\.missions,progress\?\.missions\)\)/);
  assert.match(src,/if\(pendingMissionCategoriesV107\(progress\?\.missions\)\.length\)/);
  assert.doesNotMatch(src,/for\(const item of finished\)finishMissionAutomatically/);
});
