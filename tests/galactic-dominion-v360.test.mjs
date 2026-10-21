import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeDominionRules,domLeaderboard,domRuleSummary,brazilWarWeekStart,domWeeklyScore,UUID_V360} from '../server/galactic-dominion-v360.js';
import {dominionPanelHtml,dominionUiSnapshot} from '../public/modules/galactic-dominion-v360.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const SQL=read('sql/V36_0_0_GALACTIC_DOMINION.sql');
const ROUTE=read('server/dominion-router-v360.js');
const SERVER=read('server/index.js');
const CLIENT=read('public/game.js');
const gid='00000000-0000-4000-8000-000000000001',tid='00000000-0000-4000-8000-000000000002';
const dom=()=>({ok:true,serverTime:Date.parse('2026-10-20T23:00:00Z'),rules:{enabled:true,weeklyTarget:3,weeklyCredits:120000,dailyCap:90000,dailyPerNode:15000,regenIdleSeconds:60,warHours:24,warCooldownHours:24,warRewardCredits:60000},
  adminRules:{enabled:true,regen_hp_tick:3000},clan:{id:gid,tag:'TEST',isOwner:true},stats:{owned:3,captures:1,defenses:2},
  claims:[],wars:[],clans:[{id:tid,name:'Rivais',tag:'RIV'}],ranking:[]});
test('V36 domain rules: exact bounds and boolean-only enabled',()=>{
 const x=safeDominionRules({regen_hp_tick:50000,regen_shield_tick:0,war_hours:72,war_reward_credits:300000,enabled:false});
 assert.equal(x.regen_hp_tick,50000);assert.equal(x.war_hours,72);assert.equal(x.enabled,false);
 for(const bad of [{regen_hp_tick:50001},{daily_credits_cap:900001},{regen_idle_seconds:10},{weekly_credits:-1},{war_hours:0},{enabled:1},{regen_hp_tick:'5000'},{unknown:true}])assert.throws(()=>safeDominionRules(bad));
});
test('V36 scoreboard: independent clan totals and stable ordering',()=>{
 const clans=[{id:gid,tag:'G',name:'Galáticos'},{id:tid,tag:'R',name:'Rivais'}],states=[{owner_clan_id:gid,hp:10},{owner_clan_id:gid,hp:0},{owner_clan_id:tid,hp:10}];
 const actions=[{clan_id:gid,kind:'capture'},{clan_id:gid,kind:'defense'},{clan_id:tid,kind:'capture'},{clan_id:'fake',kind:'defense'}];
 const ranked=domLeaderboard(states,actions,clans);
 assert.deepEqual(ranked.map(x=>x.clanId),[gid,tid]);assert.deepEqual(ranked.map(x=>x.score),[17,15]);
 assert.equal(ranked.some(x=>x.userId||x.actor_user_id),false);
});
test('V36 weekly target follows Brazil local Monday, not rolling 7 days',()=>{
 assert.equal(brazilWarWeekStart(new Date('2026-10-20T23:00:00Z')),'2026-10-19');
 const actions=[{clan_id:gid,kind:'capture',occurred_at:'2026-10-18T13:00:00Z'},{clan_id:gid,kind:'defense',occurred_at:'2026-10-19T11:00:00Z'}];
 assert.deepEqual(domWeeklyScore(actions,gid,new Date('2026-10-20T23:00:00Z')),{week:'2026-10-19',captures:0,defenses:1});
});
test('V36 UI never directly trusts clan labels as HTML',()=>{
 const d=dom();d.clans=[{id:tid,tag:'<img src=x>',name:'<script>alert(1)</script>'}];d.ranking=[{tag:'<b>x</b>',name:'<iframe>',relays:1,score:10,captures:0,defenses:0}];
 const html=dominionPanelHtml(d,{admin:true});
 assert.doesNotMatch(html,/<script>|<iframe>|<img src=x>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/data-dominion-admin-save/);
 assert.match(html,/data-dominion-claim="daily"/);assert.match(html,/data-dominion-declare/);assert.match(html,/GUERRAS TERRITORIAIS/);
});
test('V36 UI claim badges are period-specific, not permanent',()=>{
 const d=dom();d.claims=[{claim_kind:'daily',period_start:'2026-10-20'},{claim_kind:'weekly',period_start:'2026-10-19'}];
 assert.equal(dominionUiSnapshot(d).claimedDaily,true);assert.equal(dominionUiSnapshot(d).claimedWeekly,true);
 d.claims=[{claim_kind:'daily',period_start:'2026-10-19'},{claim_kind:'weekly',period_start:'2026-10-12'}];
 assert.equal(dominionUiSnapshot(d).claimedDaily,false);assert.equal(dominionUiSnapshot(d).claimedWeekly,false);
});
test('V36 SQL: transaction, V35 preflight, RLS and authenticated grants',()=>{
 assert.match(SQL,/^BEGIN;/m);assert.match(SQL,/COMMIT;\s*$/);
 assert.match(SQL,/V36_REQUIRES_V35_LIVE_WITH_9_RELAYS/);
 for(const t of ['stellar_dominion_rules_v360','stellar_dominion_wars_v360','stellar_dominion_claims_v360','stellar_dominion_war_claims_v360'])assert.match(SQL,new RegExp('ALTER TABLE public\\.'+t+' ENABLE ROW LEVEL SECURITY'));
 assert.match(SQL,/REVOKE ALL ON FUNCTION public.stellar_dominion_regen_v360\(\) FROM PUBLIC,anon,authenticated/);
 assert.match(SQL,/GRANT EXECUTE ON FUNCTION public.stellar_dominion_declare_v360\(uuid,timestamptz\) TO authenticated/);
 assert.match(SQL,/GRANT EXECUTE ON FUNCTION public.stellar_dominion_claim_v360\(text\) TO authenticated/);
 assert.doesNotMatch(SQL,/(?:DELETE\s+FROM\s+public\.game_saves|DROP\s+TABLE\s+public\.clans|TRUNCATE\s+public\.)/i);
});
test('V36 SQL: no infinite HP repair or duplicate payouts',()=>{
 assert.match(SQL,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
 assert.match(SQL,/s\.hp>0 AND s\.owner_clan_id IS NOT NULL/);
 assert.match(SQL,/s\.last_hit_at<now\(\)-make_interval/);
 assert.match(SQL,/LEAST\(s\.max_hp/);assert.match(SQL,/LEAST\(s\.max_shield/);
 assert.match(SQL,/PRIMARY KEY\(clan_id,claim_kind,period_start\)/);
 assert.match(SQL,/INSERT INTO public.stellar_dominion_claims_v360[\s\S]*ON CONFLICT DO NOTHING/);
 assert.match(SQL,/WAR_PRIZE_NOT_WON/);assert.match(SQL,/WAR_PRIZE_ALREADY_CLAIMED/);
 assert.match(SQL,/WEEKLY_OBJECTIVE_INCOMPLETE/);
});
test('V36 war scheduling rejects unauthorised / overlapping / suspicious war',()=>{
 assert.ok(UUID_V360.test(gid));assert.equal(UUID_V360.test('0000'),false);
 assert.match(SQL,/ONLY_CLAN_OWNER/);assert.match(SQL,/INVALID_RIVAL_CLAN/);
 assert.match(SQL,/pg_advisory_xact_lock/);assert.match(SQL,/WAR_ACTIVE_OR_COOLDOWN/);
 assert.match(SQL,/WAR_SCHEDULE_OUT_OF_RANGE/);assert.match(SQL,/WAR_NOT_FINISHED/);
 assert.match(SQL,/p_starts_at timestamptz DEFAULT NULL/);
 assert.match(ROUTE,/Agendamento deve ocorrer entre 2 minutos e 7 dias/);
 assert.match(ROUTE,/is_game_admin_v1763/);
});
test('V36 economy: clients never supply credits, damages or rewards',()=>{
 assert.match(ROUTE,/req\.sb\.rpc\('stellar_dominion_claim_v360',\{p_kind:kind\}\)/);
 assert.match(ROUTE,/req\.sb\.rpc\('stellar_dominion_declare_v360',\{p_defender:id,p_starts_at:/);
 assert.match(ROUTE,/req\.sb\.rpc\('stellar_dominion_war_prize_v360',\{p_war_id:id\}\)/);
 assert.match(SQL,/UPDATE public\.clans SET vault_credits=vault_credits\+award/);
 assert.match(SQL,/SELECT count\(\*\) INTO owned FROM public\.stellar_relay_state_v346/);
 assert.match(SQL,/FROM public\.stellar_war_actions/);
 assert.match(SERVER,/createDominionRouter\(\{serviceClient:eliteAdminClient\}\)/);
});
test('V36 FPS: one server regen tick per minute and no client healing',()=>{
 assert.match(SERVER,/sharedUniverse\.stats\(\)\.clients===0/);
 assert.match(SERVER,/dominionRegenInFlight/);assert.match(SERVER,/60000\);\ndominionRegenTimer\.unref/);
 assert.match(CLIENT,/resolvedQualityMode\(\)==='low'\?3:DEVICE_CAPS\.mobile\?5:8/);
 assert.match(CLIENT,/dominionPanelHtml\(st\.dominion/);
 assert.doesNotMatch(CLIENT,/setInterval\([^)]*dominion/i);
});
test('V36 UI: war victory claim supported and old relay hangar preserved',()=>{
 const d=dom();d.wars=[{id:gid,attacker:'A',defender:'B',active:false,scheduled:false,prizeClaimed:false,ends_at:'2026-10-20T12:00:00Z'}];
 assert.match(dominionPanelHtml(d),/data-dominion-war-prize/);
 assert.match(CLIENT,/upgradeRelayFortificationOnline/);
 assert.match(CLIENT,/relayHangarRuntime/);
});
