import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..');
const game=readFileSync(resolve(root,'public/game.js'),'utf8');
const html=readFileSync(resolve(root,'public/index.html'),'utf8');
const css=readFileSync(resolve(root,'public/modules/hangar-workbench-v1092.css'),'utf8');

test('one workbench UI for each entity and a Designer tab on all three',()=>{
 for(const f of ['renderHangarShipWorkbenchV1092','renderHangarDroneWorkbenchV1092','renderHangarPet'])assert.match(game,new RegExp(`function ${f}\\(`));
 for(const kind of ['SHIP_WORKBENCH_TABS_V1092','DRONE_WORKBENCH_TABS_V1092','AUX_TACTICAL_TABS_V1091']){
  const line=game.split('\n').find(s=>s.includes('const '+kind+'='));
  assert.match(line,/\['designers','DESIGNERS'/,`${kind} missing Designers`);
 }
 assert.match(game,/v56EquipTarget==='ship'\?renderHangarShipWorkbenchV1092\(\):v56EquipTarget==='drones'\?renderHangarDroneWorkbenchV1092\(\):renderHangarPet\(\)/);
 assert.match(game,/renderWorkbenchDesignersV1092\(bottom,'pet'\)/);
 assert.match(css,/\.v1092-designer-grid/);
 assert.match(html,/hangar-workbench-v1092\.css\?v=109\.2/);
});
test('Designer equip actions are backed by existing server-validated handlers',()=>{
 for(const val of ['equipShipDesigner(id)','equipPetDesigner(id)','equipDroneDesigner(droneId,id)'])assert(game.includes(val));
 for(const api of ["setDesignLoadoutOnline({kind:'ship'", "setDesignLoadoutOnline({kind:'pet'", "setDesignLoadoutOnline({kind:'drone'"])assert(game.includes(api));
 assert(!game.includes('purchaseFleetDesignerV1092'), 'no unvalidated designer purchases');
});
test('targeted drone equip uses selected drone only, validates inventory and preserves siblings',()=>{
 const begin=game.indexOf('function equipDroneItemForV1092('),end=game.indexOf('function createWorkbenchShellV1092(',begin);
 assert(begin>=0&&end>begin);
 const ctx={
  progress:{drones:[{id:'d1',slots:[null,null]},{id:'d2',slots:[null,null]}]},
  ITEMS:{lf4:{type:'laser'}},
  canChangeEquipment:()=>true,
  equipmentCategory:item=>item?.type==='laser'?'lasers':'other',
  removeInventory:()=>true,showToast:message=>{throw Error(message)},
  computeStatsAfterEquipmentEditV2013:()=>{},saveGame:()=>{},rememberEquipmentChangeV109:()=>{},renderHangar:()=>{},buildAmmoButtons:()=>{},updateUI:()=>{}
 };
 vm.runInNewContext(game.slice(begin,end),ctx);
 ctx.equipDroneItemForV1092('lf4','d2');
 assert.deepEqual(ctx.progress.drones[0].slots,[null,null]);
 assert.deepEqual(ctx.progress.drones[1].slots,['lf4',null]);
});
test('the global CONF selector remains intact and does not claim per-CONF designer switching',()=>{
 assert.match(game,/switchBattleConfigV2013\(n\)/);
 assert.match(game,/A aplicação é validada pelo servidor e não altera os equipamentos salvos nas CONF 1\/2/);
 assert.match(game,/function renderHangarDrones\(\)/); // previous functions left for regression safety
});
