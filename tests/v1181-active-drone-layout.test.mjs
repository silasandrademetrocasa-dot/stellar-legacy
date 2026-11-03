import test from 'node:test';
import assert from 'node:assert/strict';
import {pruneOrphanedDroneLayoutsV118} from '../server/unified-fleet-snapshot-v118.js';
import {equipmentLayoutSignatureV1062,validateEquipmentWriteV1062} from '../public/modules/hangar-write-guard-v1062.js';

function oldSnapshot(){
 return {
  activeShipId:'vengeance',ownedShips:['vengeance'],
  shipLoadout:{lasers:['lf2'],generators:[],extras:[]},
  inventory:{lf2:13},profile:{credits:10000000,uridium:5000},
  drones:[{id:'nova-1',type:'iris',slots:['lf2',null]},{id:'halo-2',type:'flax',slots:[null]}],
  pet:{owned:false,lasers:[],shields:[],protocols:{}},
  combatConfigsV2013:{active:2,shipId:'vengeance',profiles:{
   1:{shipLoadout:{lasers:['lf2'],generators:[],extras:[]},droneSlots:{'sold-drone':['lf2'],'nova-1':['lf2','lf4'],'halo-2':['lf2']},petLoadout:{lasers:[],shields:[],protocols:{}}},
   2:{shipLoadout:{lasers:['lf2'],generators:[],extras:[]},droneSlots:{'sold-drone':['lf2'],'nova-1':[null,null],'halo-2':['lf2']},petLoadout:{lasers:[],shields:[],protocols:{}}}
  }}
 };
}

test('V118.1: hidratação saneia os drones vendidos e a configuração ativa sem tocar em itens',()=>{
 const server=oldSnapshot(),originalInventory=structuredClone(server.inventory),originalPhysical=structuredClone(server.drones),originalCredits=structuredClone(server.profile);
 assert.equal(pruneOrphanedDroneLayoutsV118(server),3);
 assert.deepEqual(server.inventory,originalInventory);
 assert.deepEqual(server.drones,originalPhysical);
 assert.deepEqual(server.profile,originalCredits);
 assert.deepEqual(server.combatConfigsV2013.profiles[1].droneSlots,{'nova-1':['lf2','lf4'],'halo-2':['lf2']});
 assert.deepEqual(server.combatConfigsV2013.profiles[2].droneSlots,{'nova-1':['lf2',null],'halo-2':[null]});
 assert.equal(pruneOrphanedDroneLayoutsV118(server),0);
 const hydrated=structuredClone(server);
 hydrated.combatConfigsV2013.profiles[2].droneSlots=Object.fromEntries(hydrated.drones.map(d=>[d.id,[...d.slots]]));
 assert.equal(equipmentLayoutSignatureV1062(server),equipmentLayoutSignatureV1062(hydrated));
 assert.equal(validateEquipmentWriteV1062(server,hydrated,null).ok,true);
});

test('V118.1: mudança real exige intenção e baseline correto',()=>{
 const server=oldSnapshot();pruneOrphanedDroneLayoutsV118(server);
 const equip=structuredClone(server);equip.drones[0].slots[1]='lf2';equip.combatConfigsV2013.profiles[2].droneSlots['nova-1'][1]='lf2';
 pruneOrphanedDroneLayoutsV118(equip);
 assert.deepEqual(validateEquipmentWriteV1062(server,equip,null),{ok:false,code:'SAVE_EQUIPMENT_INTENT_REQUIRED'});
 assert.deepEqual(validateEquipmentWriteV1062(server,equip,{intent:'hangar',baseline:'stale'}),{ok:false,code:'SAVE_EQUIPMENT_STALE'});
 assert.equal(validateEquipmentWriteV1062(server,equip,{intent:'hangar',baseline:equipmentLayoutSignatureV1062(server)}).ok,true);
});

test('V118.1: nunca normaliza conta com IDs de drone repetidos',()=>{
 const s=oldSnapshot();s.drones[1].id=s.drones[0].id;
 assert.equal(pruneOrphanedDroneLayoutsV118(s)>=0,true);
 assert.deepEqual(s.combatConfigsV2013.profiles[2].droneSlots['nova-1'],[null,null]);
});
