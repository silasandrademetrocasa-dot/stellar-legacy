import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseAutopilotAction,findAutopilotPortalPath} from '../public/modules/stellar-autopilot-v48.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ammo={catalog_key:'ammo:lcb10',price:1500,currency:'credits',shop_visible:true};
const player={x:400,y:400,hp:900,maxHp:1000};
const s={online:true,ready:true,jumping:false,repairRequired:false,map:'x3',player,base:{x:100,y:120},
  atBase:false,canSell:false,buyPermitted:false,credits:50000,purchaseBudgetRemaining:10000,
  cargoUsed:0,cargoCapacity:100,cargoFree:100,ammoStock:1200,ammoQuote:ammo,rocketStock:100,
  enemies:[],loot:[],bonusBoxes:[],ores:[],laserRange:650,rocketRange:700,timeSec:100};
const cfg={map:'x3',ammoMin:250,rocketMin:15};
test('cargo cheio em X-3 obriga ir para X-1 e vender com autorização',()=>{
  assert.deepEqual(chooseAutopilotAction({...s,cargoUsed:90},{...cfg,autoSell:true}).map,'x1');
  assert.equal(chooseAutopilotAction({...s,map:'x1',cargoUsed:90,canSell:true},{...cfg,autoSell:true}).type,'sell');
});
test('depois de vender em X-1, volta para o setor escolhido em vez de ficar na base',()=>{
  const action=chooseAutopilotAction({...s,map:'x1',cargoUsed:0},{...cfg,map:'x3'});
  assert.equal(action.type,'route');assert.equal(action.map,'x3');
});
test('laser em baixa sem CPU retorna a X-1; na base aguarda compra oficial',()=>{
  const depleted={...s,ammoStock:0};
  const route=chooseAutopilotAction(depleted,{...cfg,autoBuy:true});
  assert.equal(route.type,'route');assert.equal(route.map,'x1');
  const atShop=chooseAutopilotAction({...depleted,map:'x1',buyPermitted:true,atBase:true},{...cfg,autoBuy:true});
  assert.equal(atShop.type,'idle');assert.match(atShop.reason,/Reabastecendo/);
});
test('com CPU autorizada e estoque baixo não atravessa portal para comprar',()=>{
  assert.equal(chooseAutopilotAction({...s,ammoStock:2,buyPermitted:true},cfg).type,'idle');
});
test('munição suficiente, retorna ao combate ou mineração permitida',()=>{
  const enemy={id:'npc1',x:480,y:450,type:'streuner',hp:100,name:'Streuner'};
  assert.equal(chooseAutopilotAction({...s,enemies:[enemy]},cfg).type,'hunt');
  assert.equal(chooseAutopilotAction({...s,ores:[{id:'ore1',x:460,y:450}]},{...cfg,ores:true}).type,'move');
});
test('não inventa atalhos nos mapas e não viola bloqueio de rota',()=>{
  const edges={'X-3':[{x:0,y:0,targetLabel:'X-2'}],'X-2':[{x:100,y:100,targetLabel:'X-1'}]};
  assert.deepEqual(findAutopilotPortalPath('X-3','X-1',k=>edges[k]||[]).map(x=>x.targetLabel),['X-2','X-1']);
  assert.equal(findAutopilotPortalPath('X-3','X-1',k=>edges[k]||[],label=>label!=='X-2'),null);
});
test('não duplica controlador, preserva autorização e bloqueia salto repetido',()=>{
  const game=read('public/game.js'),module=read('public/modules/stellar-autopilot-v48.js');
  assert.equal((game.match(/\bconst\s+AUTOPILOT_V48\s*=\s*createStellarAutopilotV48\s*\(/g)||[]).length,1);
  assert.match(module,/STELLAR_AUTOPILOT_PHASE3_V483/);
  assert.match(game,/STELLAR_AUTOPILOT_PHASE3_V483/);
  assert.match(module,/if\(!accessReady\(\)\)/);
  assert.match(module,/pendingJump/);
  assert.match(module,/sessionStorage/);
  assert.match(module,/saved\.user!==user/);
  assert.match(module,/if\(allowed&&!running\)restoreCheckpoint\(\)/);
  assert.match(module,/lastPortalAttempt/);
  assert.match(module,/sellCargo\(\)/);
  assert.match(module,/await buyPackage\(/);
  assert.match(module,/if\(busy\)return;\s*const action=chooseAutopilotAction/);
});
test('hotfix nave também é instalado: CONF ocultos e botão N recuperável',()=>{
  const css=read('public/modules/pilot-ship-hud-v482.css'),js=read('public/modules/pilot-ship-hud-v482.js');
  assert.match(css,/STELLAR-SHIP-RECOVERY-V4827/);
  assert.match(css,/#topHudDock #leftStats\.collapsed #statsToggle/);
  assert.match(js,/v482ShipRecoveryBtn/);
});
