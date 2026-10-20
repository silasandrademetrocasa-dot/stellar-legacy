import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relayShipLoadoutDamage} from '../server/relay-combat-v3463.js';
import {SHIPS,ITEMS,LASER_AMMO} from '../public/data.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const world=read('server/world.js'),index=read('server/index.js'),router=read('server/relay-router-v346.js'),game=read('public/game.js');
test('relay equipment reader is wired from index to the websocket world and Room',()=>{
 const i=index.indexOf('readRelayLoadout:async userId=>');
 assert.ok(i>0,'HTTP server callback exists');
 const signature=world.match(/export function attachSharedUniverse\(server,\{([^}]+)\}\)/)?.[1]||'';
 assert.ok(signature.split(',').map(x=>x.trim()).includes('readRelayLoadout'),'WebSocket must RECEIVE the equipment callback');
 assert.match(world,/readRelayLoadout:readRelayLoadout\|\|\(/,'WebSocket must EXPOSE callback on world object');
 assert.match(world,/await this\.world\.readRelayLoadout\(p\.userId\)/,'Room must use that callback');
 assert.ok(world.indexOf('readRelayLoadout:readRelayLoadout')>world.indexOf('export function attachSharedUniverse'),'reader is attached to created WebSocket world');
});
test('damage is applied only after loadout is validated server-side and the database confirms',()=>{
 assert.match(world,/const gear=relayShipLoadoutDamage\(save,p\.laserAmmoId/);
 assert.match(world,/withCaptureTimeout\(this\.world\.damageRelay\(this\.mapId,node\.id,damage,p\.userId\),5500\)/);
 assert.match(index,/rpc\('stellar_relay_damage_v346'/);
 assert.doesNotMatch(world,/damage\s*=\s*Number\(msg\.(damage|laserDamage)\)/);
});
test('error diagnostics distinguish equipment read from SQL and never expose raw DB errors to clients',()=>{
 assert.match(world,/let attackStage='loadout'/);
 assert.match(world,/attackStage='database'/);
 assert.match(world,/console\.warn\('\[relay-attack\]'/);
 assert.match(world,/code,reason\}/);
 assert.match(world,/RELAY_LOADOUT_ERROR/);
 assert.match(world,/RELAY_DB_ERROR/);
});
test('admin frontend and route both allow the already-applied 6M HP / 3M shield limits',()=>{
 assert.match(router,/max_hp:\[10000,12000000\],max_shield:\[10000,8000000\]/);
 assert.match(game,/\['relayAdmHpV346','HP BASE','max_hp',10000,12000000\]/);
 assert.match(game,/\['relayAdmShieldV346','ESCUDO BASE','max_shield',10000,8000000\]/);
});
test('server damage computation still responds to equipment and ammunition',()=>{
 const id=Object.keys(ITEMS).find(x=>ITEMS[x]?.type==='laser'&&Number(ITEMS[x]?.damage||ITEMS[x]?.alienDamage)>0);
 assert.ok(id);
 const ammo=LASER_AMMO.mcb50||LASER_AMMO.lcb10;
 const state={activeShipId:'goliath',shipLoadout:{lasers:[id,id]},drones:[{slots:[id]}],ammo:{[ammo.id]:100},pet:{owned:false}};
 assert.ok(SHIPS.goliath);
 const base=relayShipLoadoutDamage(state,ammo.id).laserDamage;
 assert.ok(base>0);
 const noAmmo=relayShipLoadoutDamage({...state,ammo:{[ammo.id]:0}},ammo.id).laserDamage;
 assert.equal(noAmmo,0);
});
