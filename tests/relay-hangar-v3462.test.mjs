import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RELAY_SLOT_CATALOG,relayModuleFitsSlot,relayModuleName,relaySlotModules,relayBonusDuplicate} from '../public/modules/relay-hangar-v3462.js';
import {RELAY_NEUTRAL_MODULES,validModule} from '../server/relay-domination-v346.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('8 slots have fixed differentiated identities: laser and missiles cannot interchange',()=>{
 assert.equal(RELAY_SLOT_CATALOG.length,8);assert.equal(RELAY_SLOT_CATALOG[0].attribute,'laser');assert.equal(RELAY_SLOT_CATALOG[1].attribute,'missile');
 assert.equal(relayModuleFitsSlot({category:'weapon',attribute:'laser'},1),true);
 assert.equal(relayModuleFitsSlot({category:'weapon',attribute:'laser'},2),false);
 assert.equal(relayModuleFitsSlot({category:'weapon',attribute:'missile'},2),true);
 assert.equal(relayModuleFitsSlot({category:'shield',attribute:'capacitor'},4),false);
 assert.equal(relayModuleFitsSlot({category:'hp',attribute:'nanobots'},6),true);
});
test('inventory filters by slot; legacy generic weapons are handled only in matching installed slot',()=>{
 const a=[{id:'laser',category:'weapon',attribute:'laser'},{id:'missile',category:'weapon',attribute:'missile'},{id:'legacy',category:'weapon',attribute:'weapon',slot:2}];
 assert.deepEqual(relaySlotModules(a,1).map(x=>x.id),['laser']);
 assert.deepEqual(relaySlotModules(a,2).map(x=>x.id),['missile','legacy']);
});
test('bonus duplicate is blocked on same relay, allowed on another relay',()=>{
 const items=[{category:'bonus',attribute:'damage',map_id:'b41',node_id:'A',slot:7}];
 const next={category:'bonus',attribute:'damage'};
 assert.equal(relayBonusDuplicate(items,next,'b41','A',8),true);
 assert.equal(relayBonusDuplicate(items,next,'b41','B',8),false);
 assert.equal(relayModuleFitsSlot(next,8),true);
 assert.match(relayModuleName(next),/DANO/);
});
test('neutral stations have exactly eight LV1 virtual modules without applying player bonuses',()=>{
 assert.deepEqual(RELAY_NEUTRAL_MODULES.map(x=>x.slot),[1,2,3,4,5,6,7,8]);
 assert.ok(RELAY_NEUTRAL_MODULES.every(x=>x.level===1&&validModule(x)));
 const world=read('server/world.js');assert.match(world,/node\.ownerClanId\?node\.relayModules:RELAY_NEUTRAL_MODULES/);
 assert.match(world,/missile\?3200:1150/);
 assert.match(world,/Math\.min\(RELAY_BASE\.weaponRange,node\.radius\+150\)/);
});
test('hangar is independent and opens from owned map relay, no equipment controls inside battle menu',()=>{
 const game=read('public/game.js'),html=read('public/index.html');
 assert.match(game,/openRelayHangar\(progress\.mapId,node\.id\)/);
 assert.match(game,/function renderRelayHangar\(\)/);
 assert.match(game,/relayHangarRuntime\.selectedSlot/);
 assert.match(html,/id="relayHangarModal"/);
 assert.doesNotMatch(game,/id="relayCategoryV346"/);
 assert.doesNotMatch(game,/id="relaySlotV346"/);
});
test('typed SQL migration retains existing ownership and upgrades and validates subtypes in database',()=>{
 const sql=read('sql/V34_6_2_RELAY_HANGAR_TYPED_MODULES.sql');
 assert.match(sql,/relay_module_typed_slot_v3462/);
 assert.match(sql,/SLOT_SUBTYPE_MISMATCH/);
 assert.match(sql,/WHERE \(category='weapon' AND attribute='weapon'\)/);
 assert.match(sql,/INSUFFICIENT_RELAY_PARTS/);
 assert.doesNotMatch(sql,/DELETE FROM public\.|TRUNCATE|DROP TABLE/i);
 assert.match(read('sql/V34_6_2_RELAY_HANGAR_ROLLBACK.sql'),/relay_module_legacy_category_v3462/);
});
test('atomic slot replacement returns existing module to inventory before equipping new module',()=>{
 const sql=read('sql/V34_6_2_RELAY_HANGAR_TYPED_MODULES.sql');
 assert.match(sql,/Equipar em um slot ocupado faz troca atomica/);
 assert.match(sql,/WHERE map_id=p_map_id AND node_id=p_node_id AND slot=p_slot AND id<>mod.id AND clan_id=cid/);
 assert.match(sql,/UPDATE public.stellar_relay_modules_v346 SET map_id=p_map_id,node_id=p_node_id,slot=p_slot/);
});
test('fresh refresh waits for in-flight read and rerenders inventory on the same chosen slot',()=>{
 const code=read('public/game.js');
 assert.match(code,/await relayWorkshopRuntime.inflight.catch/);
 assert.match(code,/return refreshRelayWorkshop\(true\)/);
 assert.match(code,/relayHangarRuntime\.selectedSlot/);
 assert.match(code,/renderRelayHangar\(\)/);
});
test('clan menu exposes inventory even when the clan has no relay, while equipped slots require ownership',()=>{
 const html=read('public/index.html'),game=read('public/game.js');
 assert.match(html,/id="clanRelayInventoryBtn"/);
 assert.match(game,/clanRelayInventoryBtn\.onclick=async/);
 assert.match(game,/\['equip','unequip'\]\.includes\(action\)/);
 assert.match(game,/openRelayHangar\(owned\?\.map_id\|\|'b41'/);
});
test('no release version shown in the new relay hangar UI',()=>{
 const html=read('public/index.html'),src=read('public/game.js');
 assert.match(html,/OFICINA TERRITORIAL • INVENTÁRIO DO CLÃ/);
 assert.doesNotMatch(html.slice(html.indexOf('id="relayHangarModal"'),html.indexOf('id="galaxyEventModal"')),/V34\.6\.2/);
 assert.match(src,/relayModuleActionOnline\(body\)/);
});
