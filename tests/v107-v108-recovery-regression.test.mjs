import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openUniverseLazyV107} from '../public/modules/unified-expansion-lazy-v107.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V106.9: rollback guard and ACK restored on both server and client',()=>{
  const game=source('public/game.js');const server=source('server/index.js');
  assert.match(game,/createMissionRewardAckV108/);
  assert.match(game,/MISSION_REWARD_ACK_V108.stage\(/);
  assert.match(game,/announceCommittedMissionRewardsV108\(snapshot.missions\)/);
  assert.match(game,/announceCommittedMissionRewardsV108\(remote.state.missions\)/);
  assert.doesNotMatch(game,/MISSION_ISOLATION_V1068D|conclusões de missões pausadas/);
  assert.match(server,/missionSaveGuardV108\(serverSave\?\.state\|\|null,state\)/);
  assert.match(server,/grantNpcRewardSafelyV1069/);
});
test('V107: Universe UI is present but never eagerly imports its heavy module',()=>{
  const html=source('public/index.html');const game=source('public/game.js');const loader=source('public/modules/unified-expansion-lazy-v107.js');
  assert.match(html,/id="frontierExpansionBtnV42"/);
  assert.match(html,/id="frontierExpansionModalV42"/);
  assert.doesNotMatch(html,/<script[^>]+src="\/modules\/unified-expansion-v42\.js/);
  assert.match(html,/unified-expansion-lazy-v107\.js/);
  assert.doesNotMatch(game,/import.*unified-expansion-v42/);
  assert.match(loader,/document\.getElementById\('frontierExpansionBtnV42'\)/);
  assert.match(loader,/import\('\.\/unified-expansion-v42\.js/);
});
test('V107: lazy Universe loader recovers after an import failure',async()=>{
  let calls=0;
  assert.equal(await openUniverseLazyV107({load:async()=>{calls++;throw Error('offline');}}),false);
  assert.equal(await openUniverseLazyV107({load:async()=>{calls++;return {};}}),true);
  assert.equal(calls,2);
});
test('V108: periodic WebSocket logs require explicit opt-in; safety errors remain visible',()=>{
  const world=source('server/world.js');const server=source('server/index.js');
  assert.match(world,/if\(process\.env\.STELLAR_NETWORK_LOGS==='1'\)networkTelemetryV1051\.start\(\)/);
  assert.match(world,/npcDeathSequenceV1069/);
  assert.match(server,/console\.warn\('\[HANGAR_WRITE_GUARD_V1062\]'/);
  assert.match(server,/SAVE_NPC_STALE/);
});
