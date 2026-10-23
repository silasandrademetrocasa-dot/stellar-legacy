import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('endpoint real autorizacao de sessao e solo offline',()=>{const s=read('server/offline-farm-v484.js');assert.match(s,/stellar_offline_farm_/);assert.match(s,/requireUser/);assert.match(s,/offlineFarmEnsureInactiveV484/);assert.match(s,/req\.user\.id/);});
test('RPC service_role unicamente; session/settle unico',()=>{const s=read('sql/STELLAR_V48_4_FARM_OFFLINE_ECONOMICO.sql');assert.match(s,/ONLY_SERVICE_ROLE/g);assert.match(s,/stellar_offline_farm_v484_one_running/);assert.match(s,/status='conflict'/);assert.match(s,/FOR UPDATE/);assert.match(s,/serverNpcRewardRevision/);assert.match(s,/serverPurchaseRevision/);assert.match(s,/game_map_npc_spawns_v1811/);assert.match(s,/live_shop_prices_v16/);assert.match(s,/game_resource_config_v1814/);});
test('UI resume por sessao, nao precisa Render ativo',()=>{const s=read('public/modules/stellar-offline-farm-v484.js');assert.match(s,/api\/offline-farm\/v484/);assert.match(s,/saveBeforeStart/);assert.match(s,/onPauseWorld/);assert.match(s,/settle/);assert.doesNotMatch(s,/setInterval\(/);});
test('hooks no app e backup na primeira instalacao',()=>{const g=read('public/game.js'),s=read('server/index.js');assert.match(g,/createOfflineFarmV484/);assert.match(g,/OFFLINE_FARM_V484\.enable/);assert.match(s,/installOfflineFarmV484/);assert.match(s,/offlineFarmEnsureInactiveV484\(userId,requireEliteAdmin\)/);});

test('bloqueio economia online durante sessão offline',async()=>{
  const {makeOfflineFarmGuardV484}=await import('../server/offline-farm-v484.js');
  const service={from(){return {select(){return this},eq(){return this},async limit(){return {data:[{id:'running'}],error:null}}}}};
  const guard=makeOfflineFarmGuardV484(async()=>service);
  let status=0,message='',called=false;
  await guard({user:{id:'u'}},{status(n){status=n;return {json(o){message=o.code;}}}},()=>{called=true});
  assert.equal(status,409);assert.equal(message,'FARM_OFFLINE_ACTIVE');assert.equal(called,false);
});

test('sem sessão offline permite transações legítimas',async()=>{
  const {makeOfflineFarmGuardV484}=await import('../server/offline-farm-v484.js');
  const service={from(){return {select(){return this},eq(){return this},async limit(){return {data:[],error:null}}}}};
  const guard=makeOfflineFarmGuardV484(async()=>service);let called=false;
  await guard({user:{id:'another-user'}},{},()=>{called=true});assert.equal(called,true);
});
