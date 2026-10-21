import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {frontierPanelHtml} from '../public/modules/frontier-v370.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const SQL=read('sql/V37_0_0_BEYOND_THE_FRONTIER.sql');
const ROUTER=read('server/frontier-router-v370.js');
const GAME=read('public/game.js');
const INDEX=read('server/index.js');
const stamp='2026-10-20T00:00:00Z';
const view={ok:true,week:'2026-10-19',serverTime:stamp,tech:{level:1,shards:8,nextCost:5},clan:{hasClan:true,kills:8,target:8,claimed:false},contracts:[
{id:'void_patrol',title:'Patrulha',sector:'x6',minLevel:22,kind:'npc',targetType:'voidCorsair',target:12,count:12,unlocked:true,claimed:false,enabled:true,credits:250000,stl:350,shards:2},
{id:'nexus_guard',title:'Caça <script>!',sector:'x7',minLevel:27,kind:'npc',targetType:'nexusWarden',target:10,count:2,unlocked:true,claimed:false,enabled:true,credits:400000,stl:500,shards:3}]};
test('V37: painel segura texto externo e exibe contratos e craft',()=>{
 const html=frontierPanelHtml(view,{admin:true});assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
 for(const x of ['data-frontier-claim="void_patrol"','data-frontier-craft','data-frontier-clan-claim','data-frontier-admin-save="void_patrol"','data-frontier-refresh','+10%'])assert.ok(html.includes(x),x);
});
test('V37: progresso insuficiente, desativado e resgatado bloqueiam botão',()=>{
 const obj=structuredClone(view);obj.contracts[0].claimed=true;obj.contracts[1].enabled=false;
 const html=frontierPanelHtml(obj);assert.match(html,/RESGATADO NESTA SEMANA/);assert.match(html,/CONTRATO SUSPENSO/);assert.doesNotMatch(html,/data-frontier-admin-save/);
});
test('V37: sem SQL mostra painel de sincronização sem travar HUD',()=>{
 assert.match(frontierPanelHtml({ok:false,error:'Indisponível'}),/Indisponível/);assert.match(frontierPanelHtml(null),/Sincronizando/);
});
test('V37: migração é transacional, aditiva e reversível em condições seguras',()=>{
 assert.match(SQL,/^BEGIN;/m);assert.match(SQL,/COMMIT;\s*$/);assert.match(SQL,/FRONTIER_V37_REQUIRES_V36_AND_REWARD_LEDGERS/);
 for(const t of ['stellar_frontier_contracts_v370','stellar_frontier_ship_tech_v370','stellar_frontier_claims_v370','stellar_frontier_clan_claims_v370']) assert.match(SQL,new RegExp('ALTER TABLE public\\.'+t+' ENABLE ROW LEVEL SECURITY'));
 assert.doesNotMatch(SQL,/\b(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE\s+public\.clans)\b/i);
 assert.match(read('sql/V37_0_0_BEYOND_THE_FRONTIER_ROLLBACK.sql'),/V37_ROLLBACK_BLOCKED_PROGRESS_EXISTS/);
});
test('V37: progresso e prêmios vêm dos recibos oficiais',()=>{
 assert.match(SQL,/FROM public\.stellar_npc_reward_ledger n/);assert.match(SQL,/FROM public\.stellar_ore_reward_ledger o/);
 assert.match(SQL,/n\.npc_type=r\.target_type/);assert.match(SQL,/o\.resource=r\.target_type/);
 assert.match(SQL,/FRONTIER_OBJECTIVE_INCOMPLETE/);assert.match(SQL,/FRONTIER_LEVEL_REQUIRED/);
 assert.match(SQL,/ON CONFLICT DO NOTHING/);assert.match(SQL,/FRONTIER_ALREADY_CLAIMED/);
 assert.match(SQL,/serverNpcRewardRevision/);
});
test('V37: crafting usa saldo oficial e não concede buffs de combate',()=>{
 assert.match(SQL,/FRONTIER_INSUFFICIENT_SHARDS/);assert.match(SQL,/IF tech\.level>=3/);
 assert.match(SQL,/shards=shards-cost/);assert.match(SQL,/reward_credits\*\(1\+\(tech\.level-1\)\*0\.1\)/);
 assert.doesNotMatch(SQL,/UPDATE public\.stellar_relay_state_v346/);
});
test('V37: co-op premia apenas o cofre e nunca o navegador',()=>{
 assert.match(SQL,/JOIN public\.clan_members cm ON cm\.user_id=n\.user_id/);
 assert.match(SQL,/FRONTIER_ONLY_CLAN_OWNER/);assert.match(SQL,/FRONTIER_CLAN_ALREADY_CLAIMED/);
 assert.match(SQL,/vault_credits=vault_credits\+125000/);
});
test('V37: servidor exige JWT e restringe ADM',()=>{
 assert.match(INDEX,/createFrontierRouter\(\{serviceClient:eliteAdminClient\}\)/);
 assert.match(INDEX,/app\.use\('\/api\/frontier',requireUser/);
 assert.match(ROUTER,/is_game_admin_v1763/);
 assert.match(ROUTER,/Number\.isSafeInteger\(v\)/);
 assert.match(ROUTER,/req\.sb\.rpc\('stellar_frontier_claim_v370',\{p_id:id\}\)/);
 assert.doesNotMatch(ROUTER,/body\.credits|body\.stl|body\.shards/);
});
test('V37: interface acessível sob demanda com sincronização do save',()=>{
 assert.match(GAME,/const frontierRequest=dominionVisible\?loadFrontierStateOnline\(\)/);
 assert.match(GAME,/\$\{frontierPanelHtml\(st\.frontier,\{admin:isAdminPilot\(\)\}\)\}/);
 assert.match(GAME,/await syncBeforeEconomy\(\);await claimFrontierContractOnline/);
 assert.match(GAME,/loadCloudSave\(\);if\(remote\?\.state\)installEconomyState/);
 assert.doesNotMatch(GAME,/setInterval\([^\n]*frontier/i);
});
