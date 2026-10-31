import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const world=source('server/world.js');
const index=source('server/index.js');
const game=source('public/game.js');

test('V110.2: idle rooms retain V108 throttling and scheduled event updates',()=>{
  assert.match(world,/import \{shouldRefreshWorldRuntimeV108\} from '\.\/idle-world-refresh-v108\.js';/);
  assert.match(world,/if\(shouldRefreshWorldRuntimeV108\(/);
  assert.match(world,/lastIdleRuntimeCheckV108=n/);
  assert.match(world,/world\.broadcastGlobalEventStatus\(false\)/);
  assert.match(world,/lastActivityCleanup>60000/);
});
test('V110.2: WebSocket telemetry only starts by explicit Render opt-in',()=>{
  assert.match(world,/if\(process\.env\.STELLAR_NETWORK_LOGS==='1'\)networkTelemetryV1051\.start\(\)/);
  assert.doesNotMatch(world,/\n  networkTelemetryV1051\.start\(\);/);
});
test('V110.2: NPC reward integrity V1069 and server AUX economy V110 coexist',()=>{
  assert.match(world,/npcDeathSequenceV1069\.run\(/);
  assert.match(index,/grantNpcRewardSafelyV1069\(\{grant,readReceipt\}\)/);
  assert.match(index,/applyAuxAdvancedActionV110\(state,action,payload\)/);
  assert.match(index,/validateAuxAdvancedSaveV110\(serverSave\?\.state\|\|null,state\)/);
  assert.match(game,/serverConfirmedEquipment:\['aux_protocol_buy','aux_protocol_craft','aux_protocol_equip'\]\.includes\(action\)/);
});
