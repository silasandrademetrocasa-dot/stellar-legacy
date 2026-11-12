import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {syncFleetConfigsAfterDroneSaleV118} from '../server/unified-fleet-snapshot-v118.js';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V118: venda de um drone remove apenas o ID de suas CONF1/2',()=>{
 const state={combatConfigsV2013:{profiles:{1:{droneSlots:{sold:['lf2'],nova:['lf4']}},2:{droneSlots:{sold:[null],nova:['lf3']}}}},drones:[{id:'nova',slots:['lf4']}]};
 assert.equal(syncFleetConfigsAfterDroneSaleV118(state,'sold'),2);
 assert.deepEqual(state.combatConfigsV2013.profiles[1].droneSlots,{nova:['lf4']});
 assert.deepEqual(state.combatConfigsV2013.profiles[2].droneSlots,{nova:['lf3']});
 assert.equal(syncFleetConfigsAfterDroneSaleV118(state,'sold'),0);
});
test('V118: save transacional escreve estado, perfil e ABC numa única função SQL',()=>{
 const sql=get('tests/fixtures/sql/STELLAR_V118_0_SAVE_UNICO_ABC.sql');const server=get('server/index.js');
 assert.match(sql,/security invoker/i);assert.match(sql,/revoke all on function.*from public,anon,authenticated/i);
 assert.match(sql,/on conflict\(id\) do update/);
 assert.match(sql,/insert into public\.stellar_player_save_abc_v118/);
 assert.match(server,/service\.rpc\('stellar_player_commit'/);
 assert.doesNotMatch(server,/from\('game_saves'\)\.upsert\(\{user_id:req\.user\.id,state,updated_at/);
});
test('V118: não apagar CONF ao equipar drones e preservar guarda SQL NPC',()=>{
 const game=get('public/game.js'), server=get('server/index.js');
 assert.match(game,/function equipDroneItemForV1092\([\s\S]*?rememberEquipmentChangeV109\(\)/);
 assert.match(server,/SAVE_NPC_STALE/);
 assert.match(server,/validateEquipmentWriteV1062/);
});
test('V118: eliminar tags V113 da descrição exibida e dos rótulos administrativos',()=>{
 const game=get('public/game.js'),html=get('public/index.html');
 assert.match(game,/k==='description'\?/);
 assert.doesNotMatch(html,/AUDITORIA V113/);
 assert.doesNotMatch(html,/ASTRAL • V38/);
});

test('V118: expurga layout órfão sem remover itens nem alterar CONF dos demais drones',async()=>{
  const {pruneOrphanedDroneLayoutsV118}=await import('../server/unified-fleet-snapshot-v118.js');
  const s={inventory:{lf2:3},drones:[{id:'nova',slots:['lf2',null]}],combatConfigsV2013:{profiles:{1:{droneSlots:{old:['lf2'],nova:['lf2']}},2:{droneSlots:{old:[null],nova:['lf4']}}}}};
  assert.equal(pruneOrphanedDroneLayoutsV118(s),2);
  assert.deepEqual(s.inventory,{lf2:3});
  assert.deepEqual(s.drones,[{id:'nova',slots:['lf2',null]}]);
  assert.deepEqual(s.combatConfigsV2013.profiles[1].droneSlots,{nova:['lf2']});
  assert.deepEqual(s.combatConfigsV2013.profiles[2].droneSlots,{nova:['lf4']});
  assert.equal(pruneOrphanedDroneLayoutsV118(s),0);
});
