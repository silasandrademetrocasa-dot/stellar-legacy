import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const server=read('server/index.js'),client=read('public/game.js'),farm=read('server/offline-farm-v484.js'),world=read('server/world.js');
test('V116.8: regras SQL contra revisao NPC obsoleta permanecem intocadas',()=>{
  assert.match(server,/SAVE_NPC_STALE/);
  assert.match(server,/incomingNpcRevision<authoritativeNpcRevision/);
  assert.match(server,/SAVE_RESERVED_REVISION/);
});
test('V116.8: protecoes de compras e recibos automaticos mantidas no servidor',()=>{
  assert.match(server,/autoTradeReceiptsV1164/);
  assert.match(server,/serverPurchaseRevision/);
});
test('V116.8: bloqueio anti-concorrencia do Farm Offline preservado',()=>{
  assert.match(server,/OFFLINE_FARM_GUARD_V484/);
  assert.match(farm,/offlineFarmEnsureInactiveV484/);
});
test('V116.8: protocolo de NPCs prioriza dano e recompensa, no throttle somente visual',()=>{
  assert.match(world,/safeJsonSend\(victim,\{type:'npc_attack'/);
  assert.match(world,/this\.broadcast\(\{type:'npc_death'/);
  assert.match(world,/sendNpcBatches\(now\)/);
});
test('V116.8: watchdog de Autopilot, compra e venda continuam no cliente',()=>{
  assert.match(client,/AUTOPILOT_V48\.tick\(\)/);
  assert.match(client,/tickManualAutoCargoSaleV1065/);
  assert.match(client,/offlineFarmWorldLockedV84\(\)/);
});
test('V116.8: telemetria nova nao inclui ID do usuario nem perfil',()=>{
  const module=read('public/modules/mobile-performance-v1167.js');
  assert.doesNotMatch(module,/getUser\(|fetch\(|localStorage|userId|callsign/);
  assert.match(client,/telemetry:'local'/);
});
