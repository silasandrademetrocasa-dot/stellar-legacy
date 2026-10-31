import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {missionSaveGuardV108} from '../server/mission-save-guard-v108.js';
import {createMissionRewardAckV108} from '../public/modules/mission-reward-ack-v108.js';
const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');
test('V106.8D diagnosis: server does not invoke mission guard V108 during save',()=>{
  assert.doesNotMatch(read('server/index.js'),/missionSaveGuardV108/);
  assert.match(read('server/index.js'),/validateEquipmentWriteV1062/);
  assert.match(read('server/index.js'),/authoritativeNpcRevision/);
});
test('V106.8D diagnosis: client never imports V108 mission reward ACK',()=>{
  const source=read('public/game.js');
  assert.doesNotMatch(source,/MISSION_REWARD_ACK_V108|createMissionRewardAckV108|announceCommittedMissionRewardsV108/);
  const f=source.split('function finishMissionAutomatically(category,mission,active){')[1].split('function claimMission(category){')[0];
  assert.match(f,/return;/);
  assert.doesNotMatch(f,/profile\.credits\s*\+=|showMissionCompleteAnimation|completed\[key\]/);
});
test('V106.8D diagnosis: mission-related server clients retained as files only, no invocation',()=>{
  assert.equal(typeof missionSaveGuardV108,'function');
  assert.equal(typeof createMissionRewardAckV108,'function');
});
test('V106.8D diagnosis: Cache version and visible marker updated',()=>{
  assert.match(read('public/index.html'),/v1068e-login-repair/);
  assert.match(read('public/index.html'),/V106\.8E/);
  assert.match(read('public/game.js'),/STELLAR_BOOT_PROBE_V1068D/);
});
test('V106.8D: completed missions are not auto-awarded; auth and saves are not disabled',()=>{
  assert.match(read('public/game.js'),/await signIn\(\{email:ui\.loginEmail\.value/);
  assert.match(read('public/game.js'),/await loadCloudSave\(\)/);
  assert.match(read('public/game.js'),/TESTE V106\.8D: conclusões de missões pausadas/);
  assert.match(read('server/index.js'),/app\.post\('\/api\/auth\/login'/);
});
