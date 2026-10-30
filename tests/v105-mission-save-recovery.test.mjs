import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeUnsavedMissionProgressV105} from '../public/modules/mission-save-recovery-v105.js';

const contract=(id='a',count=3,bonus=30)=>({id,period:'2026-10-28',complete:false,acceptedAt:500,definition:{id,tasks:[{id:'kill_1',type:'kill',npc:'streuner',target:8}]},taskProgress:{kill_1:count},bonus:{credits:bonus,uridium:count,xp:count*10}});
const merge=(remote,local,period='2026-10-28')=>mergeUnsavedMissionProgressV105(remote,local,()=>period);

test('V105: accepted mission is kept if reconciliation server has not yet seen it',()=>{
 const local={active:{daily:contract()},completed:{}};
 const remote={active:{daily:null},completed:{}};
 const r=merge(remote,local);
 assert.equal(r.changed,true);
 assert.equal(r.missions.active.daily.taskProgress.kill_1,3);
 assert.equal(remote.active.daily,null,'immutable remote state');
});
test('V105: kills and partial bonuses do not regress when merging same active mission',()=>{
 const r=merge({active:{daily:contract('a',1,10)},completed:{}},{active:{daily:contract('a',5,50)}});
 assert.equal(r.changed,true);
 assert.equal(r.missions.active.daily.taskProgress.kill_1,5);
 assert.equal(r.missions.active.daily.bonus.credits,50);
});
test('V105: never resurrect paid mission or overwrite another active mission',()=>{
 const a=contract();
 assert.equal(merge({active:{daily:null},completed:{'daily:2026-10-28:a':123}},{active:{daily:a}}).missions.active.daily,null);
 assert.equal(merge({active:{daily:contract('b')},completed:{}},{active:{daily:a}}).missions.active.daily.id,'b');
 assert.equal(merge({active:{daily:null},completed:{}},{active:{daily:{...a,complete:true}}}).missions.active.daily,null);
 assert.equal(merge({active:{daily:null},completed:{}},{active:{daily:a}},'2026-10-29').missions.active.daily,null);
});
test('V105: preserve remote status and do not touch currencies/reward markers',()=>{
 const a=contract();
 const r=merge({active:{daily:null},completed:{},otherMarker:{claim:'ok'}},{active:{daily:a}});
 assert.deepEqual(r.missions.otherMarker,{claim:'ok'});
 assert.deepEqual(r.missions.completed,{});
});
test('V105: client snapshots and mutation generation protect in-flight acceptances',()=>{
 const src=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(src,/const sentMutation=cloudSaveMutationV105;/);
 assert.match(src,/const snapshot=structuredClone\(progress\);/);
 assert.match(src,/cloudDirty=cloudSaveMutationV105!==sentMutation\|\|AMMO_SELECTION_V1061\.pending;/);
 assert.match(src,/queueMissionSaveV105\(\);renderMissions\(\);updateMissionButton\(\)/);
 assert.match(src,/mergeUnsavedMissionProgressV105\(remote\.state\.missions,localMissions/);
 assert.match(src,/if\(category==='daily'&&\(!Array\.isArray\(active\.definition\?\.tasks\)/);
});
