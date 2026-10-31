import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNetworkTelemetryV1051} from '../server/network-telemetry-v1051.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V105.1: contagem por tipo preserva bytes exatos do payload e reinicia apenas janela',()=>{
  let clock=1000;const lines=[];
  const t=createNetworkTelemetryV1051({now:()=>clock,log:x=>lines.push(JSON.parse(x))});
  t.outbound('npc_batch',JSON.stringify({type:'npc_batch',entities:[{id:'a',x:100}]}));
  t.outbound('damage_result',JSON.stringify({type:'damage_result',actual:15}));
  t.inbound(Buffer.from(JSON.stringify({type:'player_state',x:500})));
  const peek=t.snapshot();
  assert.equal(peek.lifetime.outbound.messages,2);
  assert.equal(peek.window.inbound.topTypes[0].type,'player_state');
  assert.equal(peek.window.outbound.topTypes.length,2);
  clock+=300000;const flushed=t.flush();
  assert.equal(flushed.outbound.messages,2);
  assert.equal(lines[0].tag,'STELLAR_NETWORK_V1051');
  assert.equal(t.snapshot().lifetime.outbound.messages,2);
  assert.equal(t.snapshot().window.outbound.messages,0);
  t.stop();
});

test('V105.1: não memoriza conteúdo de jogadores e não altera callbacks de evento/save',()=>{
 const t=createNetworkTelemetryV1051({now:()=>1,log:()=>{}});
 t.outbound('world_snapshot','{"type":"world_snapshot","callsign":"PRIVATE","accessToken":"secret"}');
 t.inbound(Buffer.from('{"type":"auth","accessToken":"secret"}'));
 const snapshot=JSON.stringify(t.snapshot());
 assert.doesNotMatch(snapshot,/PRIVATE|secret|accessToken|callsign/);
 assert.match(snapshot,/world_snapshot/);
 assert.match(snapshot,/auth/);
 const game=read('public/game.js'),world=read('server/world.js');
 assert.match(game,/groupMenuVisibleV1051\?6000:15000/);
 assert.match(world,/networkTelemetryV1051\.start\(\)/);
 assert.match(world,/c\.networkTelemetryV1051\?\.outbound\('npc_batch',wire\)/);
 assert.match(world,/this\.world\.grantNpcReward/);
 assert.match(read('public/index.html'),/\/game\.js\?v=47\.7\.60-[a-zA-Z0-9-]+/);
});

test('V105.1: não altera gatilhos econômicos, sessão, missões, nem save',()=>{
 const base=read('server/world.js');
 assert.match(base,/serverReward/);
 assert.match(base,/npc_reward_error/);
 assert.match(base,/ws\.room\?\.updatePlayer\(ws,msg\)/);
 assert.match(read('server/network-telemetry-v1051.js'),/payloads_sem_compressao_WS/);
});
