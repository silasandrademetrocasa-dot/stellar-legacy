import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offlineFarmMutationPolicyV103,farmPreclaimIssuesV103,sameFarmTimestampV103,makeOfflineFarmApiSafetyV103} from '../server/offline-farm-v484.js';

const file=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('V103: todos os acessos GET aos menus continuam livres',()=>{
  for(const endpoint of ['/api/auction','/api/runtime/npcs','/api/astral-rewards','/api/arena','/api/live/shops','/api/save','/api/war/rankings'])
    assert.equal(offlineFarmMutationPolicyV103('GET',endpoint),'read',endpoint);
});
test('V103: operações que alteram o piloto ficam protegidas durante Farm Offline',()=>{
  for(const endpoint of ['/api/save','/api/live/purchase','/api/live/purchase/bulk','/api/economy/action','/api/player/location','/api/account/callsign','/api/coupons/redeem','/api/astral-rewards/claim','/api/astral-rewards/lock','/api/war/supply/claim','/api/elite/claim','/api/frontier/v42/action','/api/command/claim','/api/relay/fortify','/api/arena/attack'])
    assert.equal(offlineFarmMutationPolicyV103('POST',endpoint),'guard',endpoint);
});
test('V103: iniciar/resgatar farm, autenticação, ADM e telemetria não são capturados pelo bloqueio',()=>{
  for(const endpoint of ['/api/offline-farm/v484/start','/api/offline-farm/v484/settle','/api/auth/logout','/api/auth/refresh','/api/admin/runtime/npcs/streuner','/api/telemetry'])
    assert.equal(offlineFarmMutationPolicyV103('POST',endpoint),'separate',endpoint);
});
test('V103: guarda HTTP rejeita ação econômica durante sessão em andamento',async()=>{
  let checked=0,continued=false;
  const sb={from:table=>{
    assert.equal(table,'stellar_offline_farm_v484');checked++;
    return {select(){return this},eq(){return this},limit(){return Promise.resolve({data:[{id:'farm'}],error:null})}};
  }};
  const middleware=makeOfflineFarmApiSafetyV103({requireUser:(req,res,next)=>{req.user={id:'piloto'};next();},getAdmin:async()=>sb});
  const out={statusCode:0,body:null,status(v){this.statusCode=v;return this},set(){return this},json(v){this.body=v;return this}};
  middleware({method:'POST',path:'/economy/action'},out,()=>{continued=true});
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(checked,1);assert.equal(continued,false);assert.equal(out.statusCode,409);assert.equal(out.body.code,'FARM_OFFLINE_ACTIVE');
});
test('V103: indisponibilidade do banco falha fechado sem criar gravação',async()=>{
  let continued=false;const sb={from:()=>({select(){return this},eq(){return this},limit(){return Promise.resolve({data:null,error:{message:'database unavailable'}})}})};
  const middleware=makeOfflineFarmApiSafetyV103({requireUser:(req,res,next)=>{req.user={id:'piloto'};next();},getAdmin:async()=>sb});
  const out={statusCode:0,body:null,status(v){this.statusCode=v;return this},set(){return this},json(v){this.body=v;return this}};
  middleware({method:'POST',path:'/player/location'},out,()=>{continued=true});
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(continued,false);assert.equal(out.statusCode,503);assert.equal(out.body.code,'FARM_SAFETY_UNAVAILABLE');
});
test('V103: preflight reconhece diferenças microscópicas de timestamp e todos os ledgers',()=>{
  assert.equal(sameFarmTimestampV103('2026-10-28T13:00:01.123456Z','2026-10-28T13:00:01.123456+00:00'),true);
  assert.equal(sameFarmTimestampV103('2026-10-28T13:00:01.123456Z','2026-10-28T13:00:01.123457Z'),false);
  const farm={status:'running',baseline_save_at:'2026-10-28T13:00:01.123456Z',snapshot:{profile_updated_at:'2026-10-28T13:00:01.123456Z'}};
  const save={updated_at:'2026-10-28T13:00:01.123456Z'},profile={updated_at:'2026-10-28T13:00:01.123456Z'};
  assert.deepEqual(farmPreclaimIssuesV103({farm,save,profile,npcLedger:[],oreLedger:[]}),[]);
  const result=farmPreclaimIssuesV103({farm,save:{updated_at:'2026-10-28T13:00:01.123457Z'},profile:{updated_at:'2026-10-28T13:00:02.123456Z'},npcLedger:[{}],oreLedger:[{}]});
  assert.deepEqual(result,['save_changed','profile_changed','npc_online_reward','ore_online_reward']);
});
test('V103: resgate com pré-conflito é bloqueado ANTES da RPC que marca conflict',()=>{
  const server=file('server/offline-farm-v484.js'),panel=file('public/modules/stellar-offline-farm-v484.js'),index=file('server/index.js');
  assert.match(server,/if\(method==='claim'\)[\s\S]*?farmPreclaimV103\([\s\S]*?FARM_REVIEW_REQUIRED[\s\S]*?const \{data,error\}=await sb\.rpc\(fn/);
  assert.match(server,/\/api\/offline-farm\/v484\/v103\/preflight/);
  assert.match(panel,/request\('v103\/preflight'\)/);
  assert.match(panel,/VERIFICAR SEGURANÇA DO RESGATE/);
  assert.match(index,/app\.use\('\/api',makeOfflineFarmApiSafetyV103/);
  assert.match(panel,/Lances do Leilão são registrados separadamente/);
});

import {offlineFarmDirectActivityAllowedV103} from '../public/modules/offline-farm-activity-v103.js';
test('V103: chamadas PostgREST diretas bloqueiam Arena, pesquisa, progresso e equipamentos, não leituras',()=>{
 for(const x of ['arena_attack_v11','sync_arena_profile','claim_arena_daily_reward','donate_clan_credits_v12','claim_gate_drone_design_v163','queue_pvp_attack','claim_world_boss_reward_v131']){
   assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/rpc/'+x,'POST',true),false,x);
 }
 for(const x of ['get_arena_state','get_arena_daily_reward_status','get_arena_opponents','get_my_designers_v16','get_auction_market','list_clans_v12']){
   assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/rpc/'+x,'POST',true),true,x);
 }
 assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/profiles','PATCH',true),false);
 assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/rpc/arena_attack_v11','POST',false),true);
});
test('V103: Leilão separado, chat e saída de presença não são bloqueados',()=>{
  assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/auction_bids','POST',true),true);
  assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/rpc/place_auction_bid_online','POST',true),true);
  assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/player_presence','DELETE',true),true);
  assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/rpc/send_chat_message_v16','POST',true),true);
  assert.equal(offlineFarmDirectActivityAllowedV103('/rest/v1/player_presence','POST',true),false);
});
test('V103: abrir Arena durante Farm nao faz sincronizacao mutante do perfil',()=>{
 const game=file('public/game.js'),api=file('public/api.js');
 assert.match(game,/async function syncArenaSnapshot\(\)\{\s*if\(offlineFarmWorldLockedV84\(\)\)return null/);
 assert.match(api,/offlineFarmDirectActivityAllowedV103\(path,options\.method\|\|'GET',farmActive\)/);
});
