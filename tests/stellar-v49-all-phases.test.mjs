import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combatProfileV487,npcCombatCycleV487} from '../server/offline-farm-v487-engine.js';
import {previewOfflineFarmV485} from '../server/offline-farm-v484.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('sql/STELLAR_V49_0_TODAS_AS_FASES.sql');
const backend=read('server/offline-farm-v484.js');
const ui=read('public/modules/stellar-offline-farm-v484.js');
const v49ui=read('public/modules/stellar-offline-v49-ui.js');
const push=read('server/offline-farm-v49-push.js');
test('V49: separate ADM check, allow existing Autopilot grants on migration, no direct player grant',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.stellar_offline_farm_access_v488/);
 assert.match(sql,/FROM public\.stellar_autopilot_access_v48 a/);
 assert.match(sql,/ON CONFLICT\(user_id\) DO NOTHING/);
 assert.match(sql,/NOT EXISTS\(SELECT 1 FROM public\.stellar_offline_farm_access_v488 a/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.stellar_offline_farm_access_v488 FROM PUBLIC,anon,authenticated/);
 assert.match(backend,/v49\/admin\/access/);
 assert.match(backend,/farmGrantV49/);
});
test('V49: robust report separates base inventory revenue from farm-generated sales',()=>{
 assert.match(sql,/starting_cargo_sale_credits/);
 assert.match(sql,/farm_generated_sale_credits/);
 assert.match(sql,/orig_remaining:=cargo/);
 assert.match(sql,/reason:='sale_limit_reached'/);
 assert.match(sql,/max_sale_credits/);
 assert.match(backend,/starting_cargo_sale_credits:baseSaleCredits/);
});
test('V49: safe old-session financial model, atomic claim and zero browser payouts',()=>{
 assert.match(sql,/IF f\.status<>'running' THEN RETURN/);
 assert.match(sql,/online_activity_or_save_changed/);
 assert.match(sql,/IF f\.snapshot->>'economic_model'='v49' THEN/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.stellar_offline_farm_claim_v49/);
 assert.match(sql,/UPDATE public\.game_saves SET state=st/);
 assert.doesNotMatch(v49ui,/UPDATE public\.game_saves/);
});
test('V49: simulations keep 0.42s cadence and conservative, equipped lasers',()=>{
 const s={activeShipId:'phoenix',mapId:'x1',shipLoadout:{lasers:['lf1'],generators:[],extras:[]},drones:[],pilotBio:{skills:{}}};
 const profile=combatProfileV487(s,'lcb10');
 assert.equal(profile.fire_interval_ms,420);
 const cycle=npcCombatCycleV487({...profile,npc:{hp:800,shield:400}});
 assert.equal(cycle.ammoPerKill,cycle.volleys);
 const farm={status:'running',started_at:'2026-10-23T10:00:00Z',ends_at:'2026-10-23T11:00:00Z',ammo_key:'lcb10',auto_buy:false,auto_sell:true,mine:false,snapshot:{...profile,economic_model:'v49',max_sale_credits:1500,npc:{hp:800,shield:400,name:'Scavenger',credits:7500,stl:15,xp:200,resources:{Prometium:10}},shop:{},max_kills:100,trip_seconds:45}};
 const save={profile:{credits:0},ammo:{lcb10:10000},cargo:{Prometium:4}};
 const r=previewOfflineFarmV485(farm,save,[{resource_key:'Prometium',sell_price:1000}],[],Date.parse('2026-10-23T10:59:00Z'));
 assert.ok(r.report.sale_credits<=1500);assert.equal(r.report.sale_credits-r.report.starting_cargo_sale_credits,r.report.farm_generated_sale_credits);
 assert.equal(save.cargo.Prometium,4);
});
test('V49: comparing NPCs does not allow premium bosses and client cannot set damage',()=>{
 assert.match(backend,/onlyOrdinaryNpc/);
 assert.match(backend,/npcCombatCycleV487/);
 assert.match(backend,/rawNpc.startsWith\('auto:'\)/);
 assert.match(v49ui,/auto:credits|auto:xp|auto:stl/);
 assert.match(backend,/const model=combatProfileV487\(save\.state,requested\)/);
 assert.match(v49ui,/COMPARAR NPCs E MUNIÇÕES/);
 assert.match(v49ui,/v49\/strategies/);
});
test('V49: Push requires secure token, service worker and per-user subscription',()=>{
 assert.match(push,/timingSafeEqual/);
 assert.match(push,/x-stellar-farm-push-token/);
 assert.match(push,/last_notified_session_id/);
 assert.match(push,/\.eq\('user_id',req\.user\.id\)/);
 assert.match(read('public/sw.js'),/self\.addEventListener\('push'/);
 assert.match(v49ui,/pushManager\.subscribe/);
 const cron=read('sql/OPCIONAL_ATIVAR_PUSH_V49_APOS_CONFIGURAR.sql');
 assert.match(cron,/WHERE EXISTS/);assert.match(cron,/vault\.decrypted_secrets/);
 assert.match(cron,/sub\.last_notified_session_id IS DISTINCT FROM farm\.id/);
});
test('V49: rescues, notifications, existing Autopilot/ADM controls retained',()=>{
 assert.match(ui,/STELLAR_OFFLINE_FARM_MENU_RESCUE_V4851/);
 assert.match(ui,/request\('settle',\{\}\)/);
 assert.match(ui,/request\('cancel',\{\}\)/);
 assert.match(ui,/mountFarmV49\(\{shell,request\}\)/);
 assert.match(v49ui,/ATIVAR PUSH NO ANDROID/);
 assert.match(v49ui,/v49\/history/);
 assert.match(v49ui,/v49\/admin\/audit/);
});
