import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const game=read('public/game.js'),api=read('public/api.js'),router=read('server/relay-router-v346.js');
const migration=read('sql/V34_6_1_RELAY_ADM_RELEASE.sql');
test('click or touch the relay sprite in world space to target, navigate and engage',()=>{
 for(const label of ['function selectRelayWorld','function updateRelayTargetApproach','clickedRelay&&selectRelayWorld(clickedRelay)','relayAttackRuntime.waitingNodeId','toggleRelayAttack(id)'])assert.ok(game.includes(label),label);
 assert.ok(game.indexOf('clickedRelay&&selectRelayWorld(clickedRelay)') < game.indexOf('const found=state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-p.x'));
});
test('relay attack remains server-authoritative and scoped to PvP',()=>{
 assert.match(game,/sharedUniverse\.attackRelay\(nodeId\)/);
 assert.match(read('server/world.js'),/handleRelayAttack\(ws,msg\)/);
 assert.match(game,/state\.currentMap\?\.battle&&sharedUniverseOnline\(\)/);
});
test('workshop editing does not lose keyboard focus from live re-renders',()=>{
 assert.match(game,/ui\.warfrontContent\.contains\(focused\)/);
 assert.match(game,/\['INPUT','SELECT','TEXTAREA'\]/);
 for(const key of ['relayAdmHpV346','relayAdmShieldV346','relayAdmDamageV346','relayAdmCooldownV346','relayAdmCaptureV346','relayAdmProtectionV346','relayAdmWeekendV346','relayAdmEnabledV346'])assert.ok(game.includes(key),key);
});
test('module upgrade costs appear only on explicit request and require confirmation',()=>{
 assert.match(game,/if\(action==='upgrade'&&!confirmed\)/);
 assert.match(game,/openConfirmModal\(\{eyebrow:'OFICINA • EVOLUÇÃO'/);
 assert.doesNotMatch(game,/LV1: 5 peças, 0 CR • LV2/);
});
test('UI no longer advertises version badges',()=>{
 for(const marker of ['OFICINA DE GUERRA DO CLÃ • V34.6','V34.6 • RELAY DOMINATION','✦ V34.5.0 • GALACTIC EVENT CONTROL CENTER'])assert.ok(!game.includes(marker)&&!read('public/modules/event-control-ui-v3411.js').includes(marker));
 const html=read('public/index.html');assert.doesNotMatch(html,/\bV18\.1\.7[ABC] •/);
});
test('admin release requires explicit route auth and validates every selector',()=>{
 assert.match(router,/r\.post\('\/admin\/release'/);
 assert.match(router,/req\.sb\.rpc\('is_game_admin_v1763'/);
 assert.match(router,/typeof clearFaction!=='boolean'/);
 assert.match(api,/adminReleaseRelayOnline/);
});
test('admin release is atomic, service-role-only, audited and preserves modules',()=>{
 assert.match(migration,/^BEGIN;/m);assert.match(migration,/COMMIT;\s*$/);
 assert.match(migration,/auth\.role\(\)<>'service_role'/);
 assert.match(migration,/public\.is_game_admin_v1763\(p_actor\)/);
 assert.match(migration,/SET map_id=NULL,node_id=NULL,slot=NULL/);
 assert.match(migration,/INSERT INTO public\.stellar_relay_audit_v346/);
 assert.match(migration,/IF p_clear_faction THEN/);
 assert.match(migration,/owner=NULL,captured_by=NULL,captured_at=NULL,revision=revision\+1/);
 assert.doesNotMatch(migration,/\b(?:DROP TABLE|TRUNCATE|DELETE FROM|UPDATE public\.game_saves)\b/i);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.stellar_relay_admin_release_v3461.*TO service_role/s);
});
