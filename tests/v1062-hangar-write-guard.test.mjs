import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equipmentLayoutSignatureV1062,validateEquipmentWriteV1062} from '../public/modules/hangar-write-guard-v1062.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../public/api.js',import.meta.url),'utf8');
const base=()=>({activeShipId:'vengeance',ownedShips:['phoenix','vengeance'],inventory:{remoteTraderCpuElite:0,ammoAutoBuyCpu:0},shipLoadout:{lasers:['lf4','lf3'],generators:['s1','s2'],extras:['autoRocketCpu','remoteTraderCpuElite','ammoAutoBuyCpu']},drones:[{id:'D2',type:'iris',slots:['lf2']},{id:'D1',type:'iris',slots:['lf2']}],pet:{owned:false,lasers:[],shields:[],activeGear:'off'},combatConfigsV2013:{shipId:'vengeance',active:1,profiles:{1:{shipLoadout:{lasers:['lf4','lf3'],generators:['s1','s2'],extras:['autoRocketCpu','remoteTraderCpuElite','ammoAutoBuyCpu']},shield:100,droneSlots:{D2:['lf2'],D1:['lf2']}},2:{shipLoadout:{lasers:['lf4'],generators:[],extras:['autoRocketCpu']},shield:0,droneSlots:{D1:['lf2'],D2:['lf2']}}}},profile:{credits:100,uridium:99},serverNpcRewardRevision:11});
test('V106.2: recompensas, moedas, estoques, HP e escudos nao alteram assinatura do hangar',()=>{
 const a=base(),b=structuredClone(a);b.profile.credits=888;b.profile.uridium=1999;b.serverNpcRewardRevision++;b.ammo={ucb100:5};b.combatConfigsV2013.profiles[1].shield=1;
 assert.equal(equipmentLayoutSignatureV1062(a),equipmentLayoutSignatureV1062(b));
 assert.equal(validateEquipmentWriteV1062(a,b,null).ok,true);
});
test('V106.2: rejeita desmontagem involuntaria de lasers/CPU por save de combate, mesmo com itens no inventario',()=>{
 const a=base(),bad=structuredClone(a);
 bad.shipLoadout.lasers=['lf4',null];bad.shipLoadout.extras=['autoRocketCpu',null,null];
 bad.combatConfigsV2013.profiles[1].shipLoadout=structuredClone(bad.shipLoadout);
 bad.inventory.remoteTraderCpuElite=1;bad.inventory.ammoAutoBuyCpu=1;
 const v=validateEquipmentWriteV1062(a,bad,null);
 assert.equal(v.ok,false);assert.equal(v.code,'SAVE_EQUIPMENT_INTENT_REQUIRED');
});
test('V106.2: rejeita remover extras CONF1 e CONF2 sem acao explicita',()=>{
 const a=base(),bad=structuredClone(a);
 for(const k of [1,2])bad.combatConfigsV2013.profiles[k].shipLoadout.extras=[];
 assert.equal(validateEquipmentWriteV1062(a,bad,null).code,'SAVE_EQUIPMENT_INTENT_REQUIRED');
});
test('V106.2: aceita troca legitima com baseline correto; recusa intencao obsoleta',()=>{
 const a=base(),changed=structuredClone(a);changed.combatConfigsV2013.active=2;
 const intent={intent:'hangar',baseline:equipmentLayoutSignatureV1062(a)};
 assert.equal(validateEquipmentWriteV1062(a,changed,intent).ok,true);
 const later=structuredClone(a);later.shipLoadout.extras.push('extraSlotCpuCommon');
 assert.equal(validateEquipmentWriteV1062(later,changed,intent).code,'SAVE_EQUIPMENT_STALE');
});
test('V106.2: padroniza a ordem de drones e a chave dos drones sem alterar propriedade',()=>{
 const a=base(),b=structuredClone(a);b.drones.reverse();
 b.combatConfigsV2013.profiles[1].droneSlots={D1:['lf2'],D2:['lf2']};
 assert.equal(equipmentLayoutSignatureV1062(a),equipmentLayoutSignatureV1062(b));
});
test('V106.2: slots vazios, compactacao e expansao de capacidade nao sao desmontagem',()=>{
 const a=base(),b=structuredClone(a);b.shipLoadout.extras=[null,'autoRocketCpu',null,'remoteTraderCpuElite','ammoAutoBuyCpu',null];
 b.combatConfigsV2013.profiles[1].shipLoadout.extras=[null,...a.shipLoadout.extras,null];
 assert.equal(equipmentLayoutSignatureV1062(a),equipmentLayoutSignatureV1062(b));
});
test('V106.2: primeiro save de jogador novo nao e bloqueado',()=>{
 assert.equal(validateEquipmentWriteV1062(null,base(),null).initial,true);
});
test('V106.2: cliente envia intencao somente com montagem alterada explicitamente',()=>{
 assert.match(game,/if\(layoutDiffV1062&&!equipmentSavePendingV109\)/);
 assert.match(game,/gearIntentV1062=layoutDiffV1062&&equipmentSavePendingV109/);
 assert.match(game,/saveCloudSave\(snapshot,gearIntentV1062\)/);
 assert.match(api,/equipmentMutationV1062/);
 assert.match(server,/validateEquipmentWriteV1062\(serverSave\?\.state\|\|null,state,req\.body\?\.equipmentMutationV1062\)/);
 assert.match(server,/gearWriteV1062\.code/);
});
test('V106.2: reabertura nao toma timestamp de combate por intencao de desmontar; resgate espera save pendente',()=>{
 assert.match(game,/equipmentLayoutSignatureV1062\(local\)!==equipmentLayoutSignatureV1062\(remote\.state\)/);
 assert.match(game,/gearJournalV1062\.desired===equipmentLayoutSignatureV1062\(local\)/);
 assert.match(game,/clearEquipmentIntentV1062\(\)/);
 assert.match(game,/await waitCloudIdle\(12000\);\s*if\(cloudBusy\)throw Error\('Farm resgatado/);
});
