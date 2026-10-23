import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combatProfileV487,npcCombatCycleV487} from '../server/offline-farm-v487-engine.js';
import {previewOfflineFarmV485} from '../server/offline-farm-v484.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const player=(lasers=['lf1'])=>({activeShipId:'phoenix',mapId:'x1',shipLoadout:{lasers,generators:[],extras:[]},drones:[],pilotBio:{skills:{}}});
test('V48.7: item catalog from the server increases damage, laser count, ammo use',()=>{
 const basic=combatProfileV487(player(),'lcb10');
 const elite=combatProfileV487(player(['lf3','lf4']),'mcb25');
 assert.equal(basic.laser_count,1);assert.equal(elite.laser_count,2);
 assert.ok(elite.damage_per_volley>basic.damage_per_volley*3);
 const a=npcCombatCycleV487({...basic,npc:{hp:1000,shield:400}});
 const b=npcCombatCycleV487({...elite,npc:{hp:1000,shield:400}});
 assert.ok(b.volleys<a.volleys);assert.equal(b.ammoPerKill,b.volleys*2);
});
test('V48.7: pilot PvE skills, early-map ship bonus and fitted drone lasers',()=>{
 const initial=combatProfileV487(player(),'lcb10');
 const updated={...player(['lf1']),activeShipId:'leonov',drones:[{slots:['lf4',null]}],pilotBio:{skills:{alienHunter:5,detonation1:2,bounty1:2,electroOptics:3}}};
 const profile=combatProfileV487(updated,'lcb10');
 assert.ok(profile.damage_per_volley>initial.damage_per_volley*4);
 assert.equal(profile.hit_chance,.90);
 assert.ok(profile.move_between_seconds>=3);
});
test('V48.7: refuses no lasers, unknown ammo, does not trust client input',()=>{
 assert.throws(()=>combatProfileV487(player([]),'lcb10'),/LASER_REQUIRED/);
 assert.throws(()=>combatProfileV487(player(),'evil'),/AMMO_INVALID/);
 const x=player();x.damage_per_volley=999999999;
 assert.equal(combatProfileV487(x,'lcb10').damage_per_volley,65);
});
test('V48.7: preview is non-authoritative, uses exactly the ammo per kill & travel of SQL',()=>{
 const combat=combatProfileV487(player(['lf1','lf1']),'lcb10');
 const f={status:'running',started_at:'2026-10-23T10:00:00Z',ends_at:'2026-10-23T11:00:00Z',ammo_key:'lcb10',auto_buy:false,auto_sell:false,mine:false,
  snapshot:{...combat,npc:{hp:800,shield:400,name:'Scavenger',credits:7500,stl:15,xp:200,resources:{}},level:2,shop:{},max_kills:200,trip_seconds:125}};
 const save={profile:{credits:1200},ammo:{lcb10:10000},cargo:{}};const original=JSON.stringify(save);
 const cycle=npcCombatCycleV487(f.snapshot);
 const result=previewOfflineFarmV485(f,save,[],[],Date.parse('2026-10-23T10:01:00Z'));
 assert.equal(result.report.ammo_per_kill,cycle.ammoPerKill);
 assert.ok(result.report.kills>0);assert.equal(result.report.npc_name,'Scavenger');
 assert.equal(JSON.stringify(save),original);
});
test('V48.7: SQL claim remains atomic, idempotent and blocks online double reward',()=>{
 const sql=read('sql/STELLAR_V48_7_OFFLINE_REAL_COMBAT_AND_NPC_NAMES.sql');
 assert.match(sql,/FARM_SAVE_CHANGED_DURING_START/);
 assert.match(sql,/IF f\.status<>'running' THEN RETURN/);
 assert.match(sql,/online_activity_or_save_changed/);
 assert.match(sql,/stellar_offline_farm_claim_v487/);
 assert.match(sql,/stellar_offline_farm_status_v484/);
 assert.match(sql,/v_shots:=v_volley\*v_lasers/);
 assert.match(sql,/WHILE ammo_qty < shots LOOP/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.stellar_offline_farm_claim_v487/);
 assert.doesNotMatch(sql,/GRANT EXECUTE.*authenticated/);
});
test('V48.7: UI uses display labels not reference keys, retains previous rescue',()=>{
 const ui=read('public/modules/stellar-offline-farm-v484.js');
 assert.match(ui,/x\.npc_name\|\|x\.npc/);assert.match(ui,/row\.npc_name\|\|row\.npc_key/);
 assert.match(ui,/STELLAR_OFFLINE_FARM_MENU_RESCUE_V4851/);
 assert.match(ui,/request\('settle',\{\}\)/);
});
