import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 AUX_ADVANCED_V110,AUX_ADVANCED_TIERS_V110,auxAdvancedSlotsV110,
 auxAdvancedEffectsV110,auxAdvancedLootQuantityV110,normalizeAuxAdvancedEquippedV110,applyAuxAdvancedActionV110,
 validateAuxAdvancedSaveV110
} from '../public/modules/aux-advanced-protocols-v110.js';
import {captureCombatBuildV2013,exchangeCombatBuildV2013} from '../public/combat-config-v2013.js';
import {validateEquipmentWriteV1062,equipmentLayoutSignatureV1062} from '../public/modules/hangar-write-guard-v1062.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const clone=x=>structuredClone(x);
const old=()=>({mapId:'x1',profile:{credits:100000000,uridium:20000,faction:'terra'},territoryFaction:'terra',cargo:{Prometid:500,Duranium:400,Promerium:40,Xenomit:40},pet:{owned:true,level:20,lasers:['lf4'],shields:['sg3'],protocols:{guard:2},gearsOwned:{guard:true},advancedProtocolOwnedV110:{},advancedProtocolEquippedV110:{}},combatConfigsV2013:{active:1,profiles:{1:{petLoadout:{lasers:['lf4'],shields:['sg3'],protocols:{guard:2}}},2:{petLoadout:{lasers:[],shields:[],protocols:{box:1}}}}}});
const buy=(st,id)=>applyAuxAdvancedActionV110(st,'aux_protocol_buy',{id});
const craft=(st,id)=>applyAuxAdvancedActionV110(st,'aux_protocol_craft',{id});
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
test('N1: purchase server credits once, no duplicate purchase and correct rank',()=>{
 const st=old(),before=st.profile.uridium,price=AUX_ADVANCED_TIERS_V110[1].cost;
 const info=buy(st,'dano');assert.equal(info.level,1);
 assert.equal(st.profile.uridium,before-price);
 assert.throws(()=>buy(st,'dano'),/Método/);
 assert.equal(st.profile.uridium,before-price);
});
test('N2 crafting consumes only known ingredients, validates ALL before debit',()=>{
 const st=old();buy(st,'hp');
 const before=clone(st);st.cargo.Promerium=0;
 assert.throws(()=>craft(st,'hp'),/Recursos insuficientes/);
 assert.equal(st.profile.credits,before.profile.credits);
 st.cargo.Promerium=before.cargo.Promerium;
 const info=craft(st,'hp');assert.equal(info.level,2);
 assert.equal(st.profile.credits,before.profile.credits-AUX_ADVANCED_TIERS_V110[2].cost);
 assert.equal(st.cargo.Promerium,before.cargo.Promerium-AUX_ADVANCED_TIERS_V110[2].ingredients.Promerium);
});
test('N3 requires Universe and tier II, consuming resources without changing unrelated resources',()=>{
 const st=old();buy(st,'escudo');craft(st,'escudo');
 const before=clone(st);
 assert.throws(()=>craft(st,'escudo'),/Universo/);
 assert.deepEqual(st.cargo,before.cargo);
 st.mapId='u2';const info=craft(st,'escudo');assert.equal(info.level,3);
 assert.equal(st.pet.advancedProtocolOwnedV110.escudo,3);
 assert.equal(st.profile.credits,before.profile.credits-AUX_ADVANCED_TIERS_V110[3].cost);
 assert.equal(st.cargo.Xenomit,before.cargo.Xenomit-8);
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
 assert.match(server,/applyAuxAdvancedActionV110\(state,action,payload\)/);
 assert.match(server,/withPurchaseLock\(req\.user\.id,\(\)=>withEconomySaveRetryV102/);
});
test('UI and styles are available, owned does not equal equipped, and legacy specialization stays',()=>{
 const game=readFileSync(resolve(root,'public/game.js'),'utf8'),html=readFileSync(resolve(root,'public/index.html'),'utf8');
 for(const text of ['PROTOCOLOS AVANÇADOS','mutateAuxProtocolV110','auxAdvancedBonusV110(\'porao\')','auxAdvancedBonusV110(\'hp\')','auxAdvancedBonusV110(\'loot\')','changePetProtocol(def.id,delta)','canCraftAuxProtocolV110'])assert(game.includes(text),text);
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
