import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFrontierSectorsV435,sectorDestinationV435,sectorPortalsV435,frontierServerPortalsV435} from '../public/modules/frontier-sectors-v435.js';
import {astralEquipmentBonusesV435} from '../public/modules/astral-systems-v435.js';
import {validModuleConfigV435,attachAstralIntegrationsV435} from '../server/astral-integrations-v435.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('three actual PvE map definitions with return portal and bounded spawn sizes',()=>{
 const maps=registerFrontierSectorsV435({x8:{world:{w:12000,h:8900}}});assert.equal(Object.keys(maps).length,4);
 for(const key of ['u1','u2','u3']){assert.ok(maps[key].world.w>=12000);assert.ok(maps[key].enemyGroups.length>=3);assert.ok(maps[key].portals.length>=1);}
 assert.equal(sectorDestinationV435('U-2').mapId,'u2');assert.equal(sectorDestinationV435('INVALID'),null);
 assert.ok(sectorPortalsV435('U-1','earth').some(p=>p.to==='x8'&&p.targetLabel==='1-8'));
 assert.ok(frontierServerPortalsV435('x8','earth',maps.x8)[0].to==='u1');
});
test('Astral modules require authenticated owner snapshot, enabled flag and equipped slots',()=>{
 const snap={definitions:[
  {code:'astral_guard',slot:'defense',combatEnabled:true,proposal:{shieldPercent:4}},
  {code:'trinity_matrix',slot:'utility',combatEnabled:true,proposal:{shieldPercent:2,speedPercent:2}},
  {code:'eclipse_lance',slot:'weapon',combatEnabled:true,proposal:{npcDamagePercent:4}},
  {code:'nexus_drive',slot:'engine',combatEnabled:true,proposal:{speedPercent:3}}],
  equipped:[{code:'astral_guard',slot:'defense',config:1},{code:'trinity_matrix',slot:'utility',config:1},{code:'eclipse_lance',slot:'weapon',config:1},{code:'nexus_drive',slot:'engine',config:1}],
  items:['astral_guard','trinity_matrix','eclipse_lance','nexus_drive'].map(code=>({code,qty:2}))};
 assert.deepEqual(astralEquipmentBonusesV435(snap,1),{npcDamagePercent:4,shieldPercent:6,speedPercent:5});
 assert.deepEqual(astralEquipmentBonusesV435(snap,2),{npcDamagePercent:0,shieldPercent:0,speedPercent:0});
 snap.definitions[0].combatEnabled=false;assert.equal(astralEquipmentBonusesV435(snap,1).shieldPercent,2);
 snap.items=[];assert.equal(astralEquipmentBonusesV435(snap,1).npcDamagePercent,0);
});
test('ADM never grants relay modules or accepts damage amounts',async()=>{
 assert.equal(validModuleConfigV435({code:'eclipse_lance',enabled:true}),true);
 for(const code of ['relay_laser','relay_module','boss',''])assert.equal(validModuleConfigV435({code,enabled:true}),false);
 assert.equal(validModuleConfigV435({code:'astral_guard',enabled:1}),false);
 const routes={};const app={get:(p,...h)=>routes[p]=h.at(-1),post:(p,...h)=>routes[p]=h.at(-1)};
 attachAstralIntegrationsV435(app,{requireUser:()=>{},asyncRoute:f=>f});
 const response=()=>({status(v){this.code=v;return this},json(v){this.body=v;return this},set(){return this}});
 let res=response();await routes['/api/admin/frontier/astral-module']({body:{code:'relay_laser',enabled:true},sb:{rpc:()=>{throw Error('should not reach')}}},res);assert.equal(res.code,400);
 res=response();await routes['/api/admin/frontier/astral-module']({body:{code:'nexus_drive',enabled:false},sb:{rpc:async()=>({data:{ok:true},error:null})}},res);assert.equal(res.body.ok,true);
});
test('release, map, backend and UI integrate with no dependency on old patch',()=>{
 const p=JSON.parse(read('package.json'));assert.equal(p.version,'45.0.0');assert.match(p.scripts.check,/v450-apply-patch/);
 for(const k of ['registerFrontierSectorsV435','sectorPortalsV435','astralEquipmentBonusesV435'])assert.ok(read('public/game.js').includes(k));
 assert.ok(read('server/world.js').includes('frontierServerPortalsV435'));
 assert.ok(read('server/index.js').includes('attachAstralIntegrationsV435'));
 assert.ok(read('public/modules/unified-expansion-v42.js').includes('renderAstralOperationsV435'));
});
test('raid payouts derive from boss kill ledger and are single claim per week',()=>{
 const sql=read('sql/STELLAR_V43_5_GALACTIC_EVOLUTION.sql');
 for(const x of ['stellar_npc_reward_ledger','stellar_u42_squad_members','PRIMARY KEY(user_id,week_start)','pg_advisory_xact_lock','auth.uid()','ENABLE ROW LEVEL SECURITY','REVOKE ALL ON FUNCTION'])assert.ok(sql.includes(x),x);
 assert.doesNotMatch(sql,/DELETE FROM public\.game_saves|TRUNCATE|DROP TABLE/i);
});
