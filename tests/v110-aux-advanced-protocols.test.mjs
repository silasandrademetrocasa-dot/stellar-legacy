import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 AUX_ADVANCED_V110,AUX_ADVANCED_TIERS_V110,auxAdvancedSlotsV110,
 auxAdvancedEffectsV110,auxAdvancedLootQuantityV110,normalizeAuxAdvancedEquippedV110,applyAuxAdvancedActionV110,
 validateAuxAdvancedSaveV110
} from '../public/modules/aux-advanced-protocols-v1131.js';
import {captureCombatBuildV2013,exchangeCombatBuildV2013} from '../public/combat-config-v2013.js';
import {validateEquipmentWriteV1062,equipmentLayoutSignatureV1062} from '../public/modules/hangar-write-guard-v1062.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const clone=x=>structuredClone(x);
const old=()=>({mapId:'x1',profile:{credits:500000000,uridium:500000,faction:'terra'},territoryFaction:'terra',cargo:{Prometid:500,Duranium:400,Promerium:40,Xenomit:40},pet:{owned:true,level:20,lasers:['lf4'],shields:['sg3'],protocols:{guard:2},gearsOwned:{guard:true},advancedProtocolOwnedV110:{},advancedProtocolEquippedV110:{}},combatConfigsV2013:{active:1,profiles:{1:{petLoadout:{lasers:['lf4'],shields:['sg3'],protocols:{guard:2}}},2:{petLoadout:{lasers:[],shields:[],protocols:{box:1}}}}}});
const buy=(st,id)=>applyAuxAdvancedActionV110(st,'aux_protocol_buy',{id},{catalog:{catalog_key:`aux_protocol:${id}`,kind:'aux_protocol',ref_id:id,enabled:true,shop_visible:true,currency:['dano','hp','escudo'].includes(id)?'uridium':'credits',price:['dano','hp','escudo'].includes(id)?50000:100000000}});
const craft=(st,id,level=2)=>applyAuxAdvancedActionV110(st,'aux_protocol_craft',{id,level});
const equip=(st,id,level)=>applyAuxAdvancedActionV110(st,'aux_protocol_equip',{id,level});
test('15 original protocol assets and declared percentages map exactly to five families/tier',()=>{
 assert.equal(AUX_ADVANCED_V110.length,5);assert.deepEqual(AUX_ADVANCED_V110.map(x=>x.id),['dano','hp','escudo','loot','porao']);
 assert.deepEqual(AUX_ADVANCED_V110.map(x=>x.bonus.slice(1)),[[.01,.02,.03],[.01,.025,.05],[.02,.04,.07],[.01,.04,.07],[.05,.10,.15]]);
 for(const {id} of AUX_ADVANCED_V110)for(let i=1;i<=3;i++)assert(existsSync(resolve(root,`public/assets/v109/aux-protocols/aux_protocol_${id}_n${i}.png`)));
});
test('slots start 1, grow to 5; cannot equip unowned ranks, over capacity or unknown families',()=>{
 assert.deepEqual([1,5,9,13,17,20].map(auxAdvancedSlotsV110),[1,2,3,4,5,5]);
 const st=old();st.pet.level=1;buy(st,'dano');buy(st,'hp');
 equip(st,'dano',1);assert.throws(()=>equip(st,'hp',1),/slots/);
 assert.throws(()=>equip(st,'dano',2),/não possuído/);
 assert.throws(()=>equip(st,'hacker',1),/inválida/);
 assert.equal(st.pet.advancedProtocolEquippedV110.hp,0);
});
test('N1: compras unitarias realmente geram copias e debitam cada uma',()=>{
 const st=old(),before=st.profile.uridium,price=AUX_ADVANCED_TIERS_V110[1].cost;
 buy(st,'dano');buy(st,'dano');
 assert.equal(st.pet.advancedProtocolStockV1131.dano[1],2);
 assert.equal(st.profile.uridium,before-2*price);
 assert.equal(st.pet.advancedProtocolOwnedV110.dano,1);
});
test('N2 exige 4 protocolos N1 + 10 fragmentos APEX + 250k STL, sem minérios',()=>{
 const st=old();st.profile.uridium=1000000;
 for(let i=0;i<4;i++)buy(st,'hp');
 const before=clone(st);
 assert.throws(()=>craft(st,'hp',2),/10 fragmentos/);
 assert.equal(st.profile.uridium,before.profile.uridium);
 st.pet.advancedProtocolFragmentsV1131={apex:10,universo:0};
 const info=craft(st,'hp',2);
 assert.equal(info.level,2);
 assert.equal(st.pet.advancedProtocolStockV1131.hp[1],0);
 assert.equal(st.pet.advancedProtocolStockV1131.hp[2],1);
 assert.equal(st.pet.advancedProtocolFragmentsV1131.apex,0);
 assert.equal(st.profile.uridium,before.profile.uridium-AUX_ADVANCED_TIERS_V110[2].cost);
 assert.deepEqual(st.cargo,before.cargo,'nao consome minérios');
});
test('N3 exige quatro protocolos N2, dez fragmentos UNIVERSO, STL e CR',()=>{
 const st=old();st.profile.uridium=6500000;st.profile.credits=2000000000;
 for(let i=0;i<16;i++)buy(st,'escudo');
 st.pet.advancedProtocolFragmentsV1131={apex:40,universo:10};
 for(let i=0;i<4;i++)craft(st,'escudo',2);
 assert.equal(st.pet.advancedProtocolStockV1131.escudo[2],4);
 const before=clone(st);
 assert.throws(()=>craft(st,'escudo',3),/Universo/);
 st.mapId='u2';const info=craft(st,'escudo',3);
 assert.equal(info.level,3);
 assert.equal(st.pet.advancedProtocolOwnedV110.escudo,3);
 assert.equal(st.pet.advancedProtocolStockV1131.escudo[2],0);
 assert.equal(st.pet.advancedProtocolStockV1131.escudo[3],1);
 assert.equal(st.pet.advancedProtocolFragmentsV1131.universo,0);
 assert.equal(st.profile.uridium,before.profile.uridium-AUX_ADVANCED_TIERS_V110[3].cost);
 assert.equal(st.profile.credits,before.profile.credits-AUX_ADVANCED_TIERS_V110[3].creditsCost);
});
test('buy+equip N1 never creates a duplicate item or changes existing specialization',()=>{
 const st=old();buy(st,'dano');assert.deepEqual(st.pet.protocols,{guard:2});
 assert.equal(st.pet.advancedProtocolEquippedV110.dano,0);
 equip(st,'dano',1);assert.equal(st.combatConfigsV2013.profiles[1].petLoadout.advancedProtocolsV110.dano,1);
 assert.equal(st.combatConfigsV2013.profiles[2].petLoadout.advancedProtocolsV110,undefined);
 assert.equal(auxAdvancedEffectsV110(st.pet).dano,.01);
 assert.equal(auxAdvancedEffectsV110(st.pet).hp,0);
 equip(st,'dano',0);assert.equal(auxAdvancedEffectsV110(st.pet).dano,0);
});
test('DEF/FARM build switches new AUX protocols per CONF without affecting stock',()=>{
 const st=old();buy(st,'dano');buy(st,'hp');equip(st,'dano',1);
 const ship={lasers:1,generators:1,extras:0},items={lf4:{type:'laser'},sg3:{type:'generator',subtype:'shield'}};
 const current={lasers:[],generators:[],extras:[]};
 const target=captureCombatBuildV2013(current,[],0,{...st.pet,advancedProtocolEquippedV110:{hp:1}});
 assert.equal(target.petLoadout.advancedProtocolsV110.hp,1);
 assert.equal(target.petLoadout.protocols.guard,2);
 const result=exchangeCombatBuildV2013({inventory:{lf4:1,sg3:1},shipLoadout:current,drones:[],pet:st.pet,target,ship,items});
 assert.equal(result.petLoadout.advancedProtocolEquippedV110.hp,1);
 assert.equal(result.petLoadout.protocols.guard,2);
});
test('stale/forged save cannot modify purchased rank or equip unowned ranks',()=>{
 const st=old();buy(st,'dano');equip(st,'dano',1);
 const changed=clone(st);changed.pet.advancedProtocolOwnedV110.dano=3;
 assert.equal(validateAuxAdvancedSaveV110(st,changed).code,'SAVE_AUX_PROTOCOL_OWNERSHIP');
 const cheated=clone(st);cheated.pet.advancedProtocolEquippedV110.dano=3;
 assert.equal(validateAuxAdvancedSaveV110(st,cheated).code,'SAVE_AUX_PROTOCOL_INVALID_EQUIP');
 const mismatch=clone(st);mismatch.combatConfigsV2013.profiles[1].petLoadout.advancedProtocolsV110.dano=0;
 assert.equal(validateAuxAdvancedSaveV110(st,mismatch).code,'SAVE_AUX_PROTOCOL_CONF_MISMATCH');
 const valid=clone(st);assert.equal(validateAuxAdvancedSaveV110(st,valid).ok,true);
 assert.equal(equipmentLayoutSignatureV1062(st),equipmentLayoutSignatureV1062(valid));
});
test('new AUX slots require equipment intent on client saves; economy does not expose arbitrary price controls',()=>{
 const a=old(),b=clone(a);b.pet.advancedProtocolEquippedV110={dano:1};
 assert.equal(validateEquipmentWriteV1062(a,b,null).code,'SAVE_EQUIPMENT_INTENT_REQUIRED');
 const server=readFileSync(resolve(root,'server/index.js'),'utf8');
 assert.match(server,/validateAuxAdvancedSaveV110\(serverSave\?\.state\|\|null,state\)/);
 assert.match(server,/applyAuxAdvancedActionV110\(state,action,payload,\{catalog:/);
 assert.match(server,/withPurchaseLock\(req\.user\.id,\(\)=>withEconomySaveRetryV102/);
});
test('UI and styles are available, owned does not equal equipped, and legacy specialization stays',()=>{
 const game=readFileSync(resolve(root,'public/game.js'),'utf8'),html=readFileSync(resolve(root,'public/index.html'),'utf8');
 for(const text of ['PROTOCOLOS AVANÇADOS','mutateAuxProtocolV110','auxAdvancedBonusV110(\'porao\')','auxAdvancedBonusV110(\'hp\')','changePetProtocol(def.id,delta)','canCraftAuxProtocolV110'])assert(game.includes(text),text);
 assert(html.includes('aux-advanced-protocols-v110.css?v=110'));
 assert(existsSync(resolve(root,'public/modules/aux-advanced-protocols-v110.css')));
});

test('DANO protocol multiplies real AUX laser hits against PvE rather than only tooltip',()=>{
 const game=readFileSync(resolve(root,'public/game.js'),'utf8');
 const petShooter=game.slice(game.indexOf('function petFireAt('),game.indexOf('function updatePet('));
 assert.match(petShooter,/laserPveBase\(ids\).*auxAdvancedBonusV110\('dano'\)/);
});
test('LOOT bonus has fair deterministic fractional rounding rather than free guaranteed rewards',()=>{
 assert.equal(auxAdvancedLootQuantityV110(1,.07,.99),1);
 assert.equal(auxAdvancedLootQuantityV110(1,.07,0),2);
 assert.equal(auxAdvancedLootQuantityV110(100,.07,.99),107);
 assert.equal(auxAdvancedLootQuantityV110(100,.07,0),107);
 assert.equal(auxAdvancedLootQuantityV110(100,999,0),107,'bonus from unknown source capped 7%');
});
test('economy-confirmed AUX mutations bypass the ordinary stale-hangar warning only for the three trusted actions',()=>{
 const game=readFileSync(resolve(root,'public/game.js'),'utf8');
 assert.match(game,/serverConfirmedEquipment:\['aux_protocol_buy','aux_protocol_craft','aux_protocol_equip'\]\.includes\(action\)/);
 assert.match(game,/if\(!serverConfirmedEquipment&&!recovery\?\.ok/);
});
