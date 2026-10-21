import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedAstralPveBonusV431} from '../public/modules/astral-combat-v431.js';
import {safeAstralProfileV431,astralNpcHitCapV431,attachAstralCombatV431} from '../server/astral-combat-v431.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const valid={definitions:[{code:'eclipse_lance',slot:'weapon',combatEnabled:true,proposal:{npcDamagePercent:4}}],items:[{code:'eclipse_lance',qty:1}],equipped:[{code:'eclipse_lance',slot:'weapon',config:1}]};
test('weapon affects only confirmed active build and never adds PvP damage',()=>{
 assert.equal(verifiedAstralPveBonusV431(valid,1),4);
 assert.equal(verifiedAstralPveBonusV431(valid,2),0);
 assert.equal(verifiedAstralPveBonusV431({...valid,definitions:valid.definitions.map(d=>({...d,combatEnabled:false}))},1),0);
 assert.equal(verifiedAstralPveBonusV431({...valid,items:[]},1),0);
});
test('server profile constrains power and hit ceiling',()=>{
 assert.deepEqual(safeAstralProfileV431({enabled:true,npcDamagePercent:999,activeConfig:2}),{npcDamagePercent:4,activeConfig:2});
 assert.equal(safeAstralProfileV431({enabled:false,npcDamagePercent:4}).npcDamagePercent,0);
 assert.equal(astralNpcHitCapV431(0,4),null);
 assert.ok(astralNpcHitCapV431(1000,4)>=175000);
 assert.ok(astralNpcHitCapV431(900000,4)<=2000000);
});
test('feature flag starts disabled, player cannot read service combat profile',()=>{
 const sql=read('sql/STELLAR_V43_1_COMBAT_EVOLUTION.sql');
 for(const key of ['SERVICE_ONLY','service_role','is_game_admin_v1763','REVOKE ALL ON FUNCTION public.stellar_u431_combat_profile','stellar_u423_loadouts']) assert.ok(sql.includes(key));
 assert.doesNotMatch(sql,/UPDATE public\.stellar_u423_module_rules SET combat_enabled=true/);
 assert.doesNotMatch(sql,/DELETE FROM public\.game_saves|TRUNCATE|DROP TABLE/i);
});
test('admin route validates booleans and never accepts damage amount',async()=>{
 const routes={};const auth=()=>{};const app={post:(p,...h)=>routes[p]=h};
 attachAstralCombatV431(app,{requireUser:auth,asyncRoute:x=>x});
 const handler=routes['/api/admin/frontier/astral-power'];assert.ok(handler);
 const makeRes=()=>({code:200,status(n){this.code=n;return this},json(data){this.body=data;return this},set(){return this}});
 let res=makeRes(),called=false;
 await handler.at(-1)({body:{enabled:1},sb:{rpc:async()=>{called=true}}},res);
 assert.equal(res.code,400);assert.equal(called,false);
 res=makeRes();await handler.at(-1)({body:{enabled:false},sb:{rpc:async(name,args)=>{assert.equal(name,'stellar_u431_admin_weapon');assert.deepEqual(args,{p_enabled:false});return{data:{ok:true},error:null}}}},res);
 assert.equal(res.code,200);
});
test('cache imports and source anchors match current release',()=>{
 const version=JSON.parse(read('package.json')).version;
 assert.match(version,/^43\.\d+\.\d+$/);
 for(const file of ['public/game.js','public/modules/stage-a-v423.js','public/modules/unified-expansion-v42.js','public/modules/astral-rewards-v381.js','public/modules/stage-b-v426.js']){
  assert.ok(read(file).includes(`?v=${version}`),file);
 }
 const game=read('public/game.js');assert.ok(game.includes('astralEquipmentBonusesV435(astralCombatV431.owner===getUser()?.id?astralCombatV431.snapshot:null'), 'Bonus requer inventario autenticado');
 assert.ok(game.includes('progress?.combatConfigsV2013?.active||1'), 'Bonus usa a configuracao ativa');
 assert.ok(game.includes('laserDamage*=1+astralV435.npcDamagePercent/100;'), 'Bonus PvE de armamento confirmado');
 assert.ok(game.includes('shield*=1+astralV435.shieldPercent/100;') && game.includes('speed*=1+astralV435.speedPercent/100;'), 'Bonus de suporte integrado nas estatisticas');
 assert.ok(read('server/world.js').includes('ASTRAL_NPC_HIT_GUARD_V431'));
 assert.match(read('server/index.js'),/readAstralCombatProfile:async userId/);
});
