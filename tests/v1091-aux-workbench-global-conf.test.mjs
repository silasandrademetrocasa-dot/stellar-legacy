import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureCombatBuildV2013,exchangeCombatBuildV2013,normalizeAuxTacticalProtocolsV1091} from '../public/combat-config-v2013.js';
import {equipmentLayoutSignatureV1062,validateEquipmentWriteV1062} from '../public/modules/hangar-write-guard-v1062.js';
import {reconcilePendingEquipmentV109,equipmentFingerprintV109} from '../public/modules/hangar-save-recovery-v109.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const game=readFileSync(resolve(root,'public/game.js'),'utf8');
const html=readFileSync(resolve(root,'public/index.html'),'utf8');
const css=readFileSync(resolve(root,'public/modules/aux-workbench-v1091.css'),'utf8');
const pet=(protocols={guard:2,ore:0,box:1,repair:0,kami:0})=>({owned:true,level:10,lasers:['lf4'],shields:['sg3'],gearsOwned:{guard:true,ore:true,box:true,repair:true,kami:false},activeGear:'guard',protocols});
const items={lf4:{type:'laser'},lf3:{type:'laser'},sg3:{type:'generator',subtype:'shield'},g3:{type:'generator',subtype:'shield'},speed:{type:'generator',subtype:'speed'},autoRocket:{type:'extra'}};
const ship={lasers:2,generators:1,extras:1};
const loadout={lasers:['lf3',null],generators:['speed'],extras:['autoRocket']};
const drones=[{id:'d1',type:'iris',slots:['lf4','sg3']}];
test('CONF captures all four systems (ship, drone, AUX, AUX specialization) by value',()=>{
 const aux=pet(),snapshot=captureCombatBuildV2013(loadout,drones,500,aux);
 assert.deepEqual(snapshot.shipLoadout.lasers,['lf3',null]);
 assert.deepEqual(snapshot.droneSlots.d1,['lf4','sg3']);
 assert.deepEqual(snapshot.petLoadout.lasers,['lf4']);
 assert.deepEqual(snapshot.petLoadout.shields,['sg3']);
 assert.deepEqual(snapshot.petLoadout.protocols,aux.protocols);
 aux.protocols.guard=0;
 assert.equal(snapshot.petLoadout.protocols.guard,2,'no aliasing between active and inactive CONF');
});
test('Farm and tank CONF swap all gear without duplication and AUX skills update',()=>{
 const farm=pet({guard:0,ore:1,box:2,repair:0,kami:0});farm.activeGear='box';
 const tank=pet({guard:3,ore:0,box:0,repair:0,kami:0});tank.activeGear='guard';
 const target=captureCombatBuildV2013({lasers:[],generators:['sg3'],extras:[]},[{id:'d1',slots:['sg3',null]}],10,tank);
 const beforeInv={lf4:1,sg3:2,lf3:0};
 const r=exchangeCombatBuildV2013({inventory:beforeInv,shipLoadout:loadout,drones,pet:farm,target,ship,items});
 assert.equal(r.petLoadout.activeGear,'guard');
 assert.deepEqual(r.petLoadout.protocols,{guard:3,ore:0,box:0,repair:0,kami:0});
 const list = s => Object.entries(s).flatMap(([k,v])=>Array(Number(v)||0).fill(k));
 const equipment = values => values.filter(Boolean);
 const original=[...list(beforeInv),...equipment(Object.values(loadout).flat()),...equipment(drones.flatMap(x=>x.slots)),...equipment(farm.lasers),...equipment(farm.shields)];
 const after=[...list(r.inventory),...equipment(Object.values(r.shipLoadout).flat()),...equipment(r.drones.flatMap(x=>x.slots)),...equipment(r.petLoadout.lasers),...equipment(r.petLoadout.shields)];
 const freq=ids=>Object.fromEntries([...new Set(ids)].sort().map(id=>[id,ids.filter(v=>v===id).length]));
 assert.deepEqual(freq(original),freq(after));
});
test('legacy preset without protocols does not wipe the already-equipped specialization',()=>{
 const aux=pet({guard:1,ore:0,box:1,repair:0,kami:0});
 const legacy=captureCombatBuildV2013(loadout,drones,0,aux);delete legacy.petLoadout.protocols;
 const r=exchangeCombatBuildV2013({inventory:{lf4:1,sg3:1},shipLoadout:loadout,drones,pet:aux,target:legacy,ship,items});
 assert.deepEqual(r.petLoadout.protocols,aux.protocols);
});
test('protocol allocation cannot exceed AUX level slots, use ranks of an unowned module or create items',()=>{
 const aux=pet({});aux.level=1;aux.gearsOwned.kami=false;
 const out=normalizeAuxTacticalProtocolsV1091({guard:3,ore:3,box:3,repair:3,kami:3},aux);
 assert.equal(Object.values(out).reduce((x,v)=>x+v,0),3);
 assert.equal(out.kami,0);
});
test('stale saves cannot silently rewrite active AUX protocol allocation',()=>{
 const a={activeShipId:'ship',ownedShips:['ship'],inventory:{},shipLoadout:loadout,drones,pet:pet(),combatConfigsV2013:{shipId:'ship',active:1,profiles:{1:captureCombatBuildV2013(loadout,drones,0,pet()),2:captureCombatBuildV2013(loadout,drones,0,pet())}}};
 const b=structuredClone(a);b.pet.protocols.guard=1;b.combatConfigsV2013.profiles[1].petLoadout.protocols.guard=1;
 assert.notEqual(equipmentLayoutSignatureV1062(a),equipmentLayoutSignatureV1062(b));
 assert.equal(validateEquipmentWriteV1062(a,b,null).code,'SAVE_EQUIPMENT_INTENT_REQUIRED');
 assert.equal(validateEquipmentWriteV1062(a,b,{intent:'hangar',baseline:equipmentLayoutSignatureV1062(a)}).ok,true);
});
test('migrated profile missing AUX proto has same signature as explicit current specialization',()=>{
 const a={activeShipId:'ship',ownedShips:['ship'],shipLoadout:loadout,drones,pet:pet(),combatConfigsV2013:{shipId:'ship',active:1,profiles:{1:captureCombatBuildV2013(loadout,drones,0,pet()),2:captureCombatBuildV2013(loadout,drones,0,pet())}}};
 const b=structuredClone(a);delete b.combatConfigsV2013.profiles[1].petLoadout.protocols;
 assert.equal(equipmentLayoutSignatureV1062(a),equipmentLayoutSignatureV1062(b));
});
test('hangar recovery keeps AUX specialization from desired state without altering shield or item counts',()=>{
 const a={activeShipId:'ship',ownedShips:['ship'],inventory:{lf4:1,sg3:1},shipLoadout:loadout,drones,pet:pet(),combatConfigsV2013:{shipId:'ship',active:1,profiles:{1:captureCombatBuildV2013(loadout,drones,55,pet()),2:captureCombatBuildV2013(loadout,drones,80,pet())}}};
 const desired=structuredClone(a);desired.pet.protocols={guard:1,box:2,ore:0,repair:0,kami:0};desired.combatConfigsV2013.profiles[1].petLoadout.protocols={...desired.pet.protocols};
 const remote=structuredClone(a);
 const res=reconcilePendingEquipmentV109(remote,desired,a);
 assert.equal(res.ok,true);
 assert.deepEqual(res.state.pet.protocols,desired.pet.protocols);
 assert.equal(res.state.combatConfigsV2013.profiles[2].shield,80);
 assert.equal(equipmentFingerprintV109(res.state),equipmentFingerprintV109(desired));
});
test('UI uses a lateral menu and bottom slots, leaves other hangar tabs intact',()=>{
 for(const s of ['aux-workbench-nav-v1091','aux-workbench-bottom-v1091','aux-workbench-preview-v1091','renderHangarPet()','renderHangarDrones()','renderHangarEquipment()','CONF ${conf}','changePetProtocol(def.id,delta)'])assert(game.includes(s),s);
 for(const id of ['info','lasers','shields','protocols','modules'])assert(game.includes(`'${id}'`));
 assert(css.includes('grid-column:1/-1'));
 assert(html.includes('aux-workbench-v1091.css'));
});
test('preview art assets exist for each of five types and three ranks; no purchases activated',()=>{
 for(const type of ['dano','hp','escudo','loot','porao'])for(const rank of [1,2,3]){
  const file=resolve(root,`public/assets/v109/aux-protocols/aux_protocol_${type}_n${rank}.png`);
  assert(existsSync(file));
  assert.equal(readFileSync(file).subarray(1,4).toString(),'PNG');
 }
 assert(!game.includes('purchaseAuxProtocolV1091'));
 assert(game.includes('FUTURO'));
});
import {inspectPresetSafetyV1063,presetWarningV1063} from '../public/modules/battle-preset-guard-v1063.js';
test('preset must warn when it swaps AUX specialization or active mode even with identical equipment',()=>{
 const r=inspectPresetSafetyV1063({currentLoadout:loadout,proposedLoadout:loadout,currentDrones:drones,proposedDrones:drones,
   currentPet:pet({guard:0,ore:1,box:1,repair:0,kami:0}),proposedPet:pet({guard:2,ore:0,box:0,repair:0,kami:0})});
 assert.equal(r.specializationChange,true);
 assert.match(presetWarningV1063('FARM',r),/Especializa/);
});

test('automatic AUX mode reset (e.g. after NOVA BURST) does not block ordinary saves',()=>{
 const a={activeShipId:'ship',ownedShips:['ship'],shipLoadout:loadout,drones,pet:pet(),combatConfigsV2013:{shipId:'ship',active:1,profiles:{1:captureCombatBuildV2013(loadout,drones,0,pet()),2:captureCombatBuildV2013(loadout,drones,0,pet())}}};
 const b=structuredClone(a);b.pet.activeGear='off';b.combatConfigsV2013.profiles[1].petLoadout.activeGear='off';
 assert.equal(equipmentLayoutSignatureV1062(a),equipmentLayoutSignatureV1062(b));
});
