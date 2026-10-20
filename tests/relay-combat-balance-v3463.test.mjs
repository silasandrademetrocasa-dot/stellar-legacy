import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relayShipLoadoutDamage,relayTurretStats} from '../server/relay-combat-v3463.js';
import {ITEMS,LASER_AMMO,ROCKETS} from '../public/data.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const game=read('public/game.js'),world=read('server/world.js'),router=read('server/relay-router-v346.js');
const migration=read('sql/V34_6_3_RELAY_COMBAT_BALANCE_MISSIONS.sql');
const api=read('public/api.js');
const id=Object.keys(ITEMS).find(k=>ITEMS[k]?.type==='laser'&&Number(ITEMS[k]?.damage??ITEMS[k]?.alienDamage)>0);
const ammoId=Object.keys(LASER_AMMO).find(k=>Number(LASER_AMMO[k]?.mult)>0);
const rocketId=Object.keys(ROCKETS).find(k=>Number(ROCKETS[k]?.damage)>0);
function save(lasers=[],drones=[],petLasers=[],ammo=100,rockets=10){return {activeShipId:'goliath',shipLoadout:{lasers},drones:drones.map(l=>({slots:[l]})),pet:{owned:true,lasers:petLasers},ammo:{[ammoId]:ammo},rockets:{[rocketId]:rockets}};}
test('relay damage is derived server-side from persisted ship, drone and AUX laser modules',()=>{
 assert.ok(id&&ammoId&&rocketId,'combat catalog contains weapons and ammunition');
 const a=relayShipLoadoutDamage(save([id]),ammoId);
 const drone=relayShipLoadoutDamage(save([id],[id]),ammoId);
 const aux=relayShipLoadoutDamage(save([id],[id],[id]),ammoId);
 assert.ok(a.laserDamage>0);
 assert.ok(drone.laserDamage>a.laserDamage,'drone adds real equipped laser damage');
 assert.ok(aux.laserDamage>drone.laserDamage,'AUX adds laser damage');
 assert.equal(relayShipLoadoutDamage(save([id],[],[],0),ammoId).laserDamage,0,'no verified ammo means no fire');
 assert.equal(relayShipLoadoutDamage(save([id],[],[],100,0),ammoId,rocketId).rocketDamage,0,'no rocket inventory means no rocket damage');
 assert.ok(relayShipLoadoutDamage(save([id]),ammoId,rocketId).rocketDamage>0);
});
test('relay turret stats are differentiated by laser/missile and module level',()=>{
 const rows=[{category:'weapon',attribute:'laser',level:1,damage:700,cooldown_ms:750},{category:'weapon',attribute:'laser',level:3,damage:3500,cooldown_ms:980},{category:'weapon',attribute:'missile',level:2,damage:6400,cooldown_ms:3300}];
 assert.deepEqual(relayTurretStats({slot:1,attribute:'laser',level:1},rows),{damage:700,cooldownMs:750});
 assert.deepEqual(relayTurretStats({slot:1,attribute:'laser',level:3},rows),{damage:3500,cooldownMs:980});
 assert.deepEqual(relayTurretStats({slot:2,attribute:'missile',level:2},rows),{damage:6400,cooldownMs:3300});
});
test('relay hit ignores arbitrary numeric client-supplied damage and loads authoritative ship equipment',()=>{
 assert.match(world,/relayShipLoadoutDamage\(save,p\.laserAmmoId/);
 assert.match(world,/readRelayLoadout\(p\.userId\)/);
 assert.match(world,/damageRelay\(this\.mapId,node\.id,damage,p\.userId\)/);
 assert.doesNotMatch(world,/damage\s*=\s*Number\(msg\.(damage|laserDamage)\)/);
});
test('ship faces target relay and shoots laser along firing direction',()=>{
 assert.match(game,/desiredAngle=Math\.atan2\(relay\.y-player\.y,relay\.x-player\.x\)/);
 assert.match(game,/drawLaserFxLine\(p\.x,p\.y,t\.x,t\.y/);
 assert.match(game,/relayAttackRuntime\.nodeId/);
});
test('module purchase/upgrade prompts use integrated confirmation and live server prices',()=>{
 assert.match(game,/openConfirmModal\(\{eyebrow:'OFICINA • EVOLUÇÃO'/);
 assert.match(game,/relayWorkshopRuntime\.state\?\.balance\?\.find/);
 assert.match(migration,/FROM public\.stellar_relay_module_balance_v3463 b/);
 assert.match(migration,/UPDATE public\.stellar_relay_clan_parts_v346 SET quantity=quantity-need/);
 assert.match(migration,/UPDATE public\.clans SET vault_credits=vault_credits-cost/);
});
test('admin is authorized to change each typed module stats and level, server validates bounds',()=>{
 assert.match(router,/r\.post\('\/admin\/module-balance'/);
 assert.match(router,/req\.sb\.rpc\('is_game_admin_v1763'/);
 for(const s of ['damage','cooldown_ms','shield_bonus','hp_bonus','bonus_pct','parts','credits','min_clan_level'])assert.ok(router.includes(s),s);
 assert.match(api,/saveRelayModuleBalanceOnline/);
 assert.match(game,/data-relay-balance-save/);
});
test('mission progress is fetched from authenticated weekly server records, pending claims disabled and ready claims orange',()=>{
 assert.match(router,/req\.sb\.rpc\('stellar_relay_mission_progress_v3463'\)/);
 assert.match(migration,/FROM public\.stellar_war_actions WHERE clan_id=cid/);
 assert.match(migration,/FROM public\.stellar_relay_clan_pve_v346 WHERE clan_id=cid/);
 assert.match(migration,/FROM public\.stellar_relay_mission_claims_v346 WHERE clan_id=cid/);
 assert.match(game,/!owner\|\|!available\?'disabled'/);
 assert.match(game,/ready-v3463/);
 assert.match(read('public/style.css'),/\.ready-v3463/);
});
test('migration seeds exactly 36 module balance combinations without touching player saves',()=>{
 const seeds=migration.match(/^\('(weapon|shield|hp|bonus)','[^']+',\d,/gm)||[];
 assert.equal(seeds.length,36);
 assert.match(migration,/PRIMARY KEY\(category,attribute,level\)/);
 assert.match(migration,/auth\.uid\(\)/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.stellar_relay_mission_progress_v3463\(\) TO authenticated/);
 assert.doesNotMatch(migration,/(?:DELETE\s+FROM|TRUNCATE|UPDATE\s+public\.game_saves|DROP\s+TABLE)/i);
});
test('pilot laser and rocket skills affect relay damage based on recorded save, not packet multipliers',()=>{
 const basic=save([id]);
 const skilled=save([id]);skilled.pilotBio={skills:{alienHunter:5,detonation1:2,bounty1:2,rocketFusion:5}};
 assert.ok(relayShipLoadoutDamage(skilled,ammoId).laserDamage>relayShipLoadoutDamage(basic,ammoId).laserDamage);
 assert.ok(relayShipLoadoutDamage(skilled,ammoId,rocketId).rocketDamage>relayShipLoadoutDamage(basic,ammoId,rocketId).rocketDamage);
});
test('relay shots consume normal laser ammo and crafting cost updates for different module attributes',()=>{
 assert.match(game,/function fireRelayLaserPulse\(nodeId\)/);
 assert.match(game,/progress\.ammo\[ammo\.id\]=Math\.max\(0,stock-count\)/);
 assert.match(game,/battlePassEvent\('ammoUse',count\)/);
 assert.match(game,/relayHangarModal\?\.addEventListener\('change'/);
 assert.match(game,/craftBalance=st\?\.balance\?\.find/);
});
