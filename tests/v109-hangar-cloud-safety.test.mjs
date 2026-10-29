import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { equipmentFingerprintV109,reconcilePendingEquipmentV109 } from '../public/modules/hangar-save-recovery-v109.js';
const root=new URL('../public/game.js',import.meta.url);
const code=fs.readFileSync(root,'utf8');
const mk=()=>({activeShipId:'vengeance',ownedShips:['vengeance','phoenix'],inventory:{lf4:1,lf3:1},shipLoadout:{lasers:['lf4',null],generators:[],extras:[]},drones:[{id:'d1',type:'iris',slots:['lf3',null],xp:2}],pet:{owned:false,lasers:[],shields:[],activeGear:'off'},combatConfigsV2013:{shipId:'vengeance',active:1,profiles:{1:{shipLoadout:{lasers:['lf4',null],generators:[],extras:[]},droneSlots:{d1:['lf3',null]},petLoadout:{lasers:[],shields:[]},shield:10},2:{shipLoadout:{lasers:['lf4'],generators:[],extras:[]},droneSlots:{d1:['lf3']},petLoadout:{lasers:[],shields:[]},shield:77}}},profile:{credits:100},serverNpcRewardRevision:1});
test('V109: preserva montagem local quando o SQL apenas mudou economia NPC',()=>{
 const baseline=mk(),remote=structuredClone(baseline),desired=structuredClone(baseline);
 remote.serverNpcRewardRevision=2;remote.profile.credits=200;
 desired.inventory.lf4=0;desired.shipLoadout.lasers[1]='lf4';desired.combatConfigsV2013.profiles[1].shipLoadout.lasers[1]='lf4';
 const out=reconcilePendingEquipmentV109(remote,desired,baseline);
 assert.equal(out.ok,true);assert.equal(out.alreadySaved,false);
 assert.equal(out.state.shipLoadout.lasers[1],'lf4');assert.equal(out.state.inventory.lf4,0);
 assert.equal(out.state.profile.credits,200);assert.equal(out.state.serverNpcRewardRevision,2);
 assert.equal(out.state.combatConfigsV2013.profiles[2].shield,77);
});
test('V109: não duplica itens recebidos/revendidos no meio da reconciliação',()=>{
 const base=mk(),remote=mk(),local=mk();local.shipLoadout.lasers[1]='lf4';local.inventory.lf4=1;
 assert.equal(reconcilePendingEquipmentV109(remote,local,base).reason,'ITEM_COUNTS_CHANGED');
});
test('V109: recusa sobrescrever configuração alterada em outro dispositivo',()=>{
 const base=mk(),remote=mk(),local=mk();remote.shipLoadout.lasers[0]=null;remote.inventory.lf4=2;
 assert.equal(reconcilePendingEquipmentV109(remote,local,base).reason,'SERVER_EQUIPMENT_CHANGED');
});
test('V109: recusa ignorar nova propriedade ou novo drone entregue pelo servidor',()=>{
 const base=mk(),remote=mk(),local=mk();remote.ownedShips.push('goliath');
 assert.equal(reconcilePendingEquipmentV109(remote,local,base).reason,'OWNERSHIP_CHANGED');
 const other=mk();other.drones.push({id:'d2',type:'flax',slots:[]});
 assert.equal(reconcilePendingEquipmentV109(other,local,base).reason,'DRONES_CHANGED');
});
test('V109: já gravado no servidor não precisa ressuscitar o save local',()=>{
 const base=mk(),remote=mk(),local=mk();remote.serverNpcRewardRevision=20;
 assert.equal(reconcilePendingEquipmentV109(remote,local,base).alreadySaved,true);
 assert.equal(equipmentFingerprintV109(remote),equipmentFingerprintV109(local));
});
test('V109: alterações de nave, drones, AUX e presets pedem save prioritário',()=>{
 for(const name of ['equipShipItem','unequipShipSlot','equipDroneItem','unequipDroneSlot','equipPetItem','unequipPetSlot','copyBattleConfigV2013','switchBattleConfigV2013','switchShip','emptyAllEquippedV2013','applyBattlePresetV3030']){
  const i=code.search(new RegExp('(?:async )?function '+name+'\\('));assert.ok(i>0,`falta ${name}`);
  const j=code.indexOf('\nfunction ',i+20);const piece=code.slice(i,j>i?j:i+3000);
  assert.match(piece,/saveGame\(\);rememberEquipmentChangeV109\(\);/,`sem prioridade ${name}`);
 }
 assert.match(code,/equipmentSaveBaselineV109=structuredClone\(remote.state\)/);
 assert.match(code,/reconcilePendingEquipmentV109\(remote.state,desiredGear,equipmentSaveBaselineV109\)/);
});
