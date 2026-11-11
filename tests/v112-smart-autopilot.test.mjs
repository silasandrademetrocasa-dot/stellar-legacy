import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseAutopilotAction,chooseAutopilotCollectV112,orbitAutopilotWaypointV112,cleanAutopilotConfig} from '../public/modules/stellar-autopilot-v48.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const npc={id:'scavenger',x:360,y:300,hp:1200,shield:80,type:'scavenger',credits:200};
const state=()=>({online:true,ready:true,map:'x3',player:{x:150,y:300,hp:5000,maxHp:5000},
 enemies:[npc],laserRange:760,rocketRange:760,rocketReady:true,loot:[],bonusBoxes:[],ores:[],
 cargoUsed:100,cargoCapacity:1000,cargoFree:900,timeSec:1000,credits:90000000,ammoStock:500,rocketStock:50,
 mapWidth:2800,mapHeight:2800,atBase:false,remoteTraderEquipped:true,canSell:true,buyPermitted:true});
const cfg=cleanAutopilotConfig({map:'x3',autoBuy:false,autoSell:false});
test('V112: box bônus é coletada durante a caçada mantendo lock do alvo',()=>{
 const s=state();s.bonusBoxes=[{id:'bonus_1',x:240,y:360}];
 const action=chooseAutopilotAction(s,cfg);
 assert.equal(action.type,'move');assert.equal(action.collectKind,'box');
 assert.equal(action.combatTargetId,npc.id);
 assert.equal(action.targetId,'bonus_1');
 assert.match(action.reason,/Box bônus/);
});
test('V112: loot do NPC também é coletado disparando',()=>{
 const s=state();s.loot=[{id:'loot_1',x:230,y:350,expiresAt:1050}];
 const action=chooseAutopilotAction(s,cfg);
 assert.equal(action.type,'move');assert.equal(action.collectKind,'drop');assert.equal(action.combatTargetId,npc.id);
});
test('V112: caixa bônus é retomada após intervalo e não desvia sem necessidade',()=>{
 const s=state();s.bonusBoxes=[{id:'bonus_1',x:230,y:340}];s.bonusDue=false;
 assert.equal(chooseAutopilotAction(s,cfg).type,'hunt');
 s.bonusDue=true;assert.equal(chooseAutopilotAction(s,cfg).collectKind,'box');
});
test('V112: combate nunca persegue caixa longe demais do inimigo',()=>{
 const s=state();s.bonusBoxes=[{id:'bonus_far',x:1300,y:300}];
 assert.equal(chooseAutopilotAction(s,cfg).type,'hunt');
});
test('V112: bônus não ocupa porão e pode ser recolhida cheio',()=>{
 const s=state();s.cargoFree=0;s.bonusBoxes=[{id:'bonus_2',x:240,y:330}];
 s.loot=[{id:'loot_2',x:230,y:340,expiresAt:1050}];
 assert.equal(chooseAutopilotAction(s,cfg).collectKind,'box');
});
test('V112: move-and-fire não inventa alvos quando nenhum NPC está dentro de alcance',()=>{
 const s=state();s.enemies=[{...npc,x:1400}];s.bonusBoxes=[{id:'bonus',x:190,y:310}];
 assert.equal(chooseAutopilotAction(s,cfg).type,'hunt');
 assert.equal(chooseAutopilotAction(s,cfg).targetId,npc.id);
});
test('V112: órbita calcula destino diferente da posição inicial sem ficar estacionada',()=>{
 const p={x:700,y:500},t={id:'a',x:500,y:500,hp:500};
 const w=orbitAutopilotWaypointV112({player:p,target:t,enemies:[t],laserRange:800,mapWidth:2200,mapHeight:2200});
 assert.ok(w&&Number.isFinite(w.x)&&Number.isFinite(w.y));
 assert.ok(Math.hypot(w.x-p.x,w.y-p.y)>15);
 assert.ok(w.y!==p.y);
});
test('V112: órbita evita concentração de NPCs e respeita limites do mapa',()=>{
 const p={x:200,y:220},t={id:'a',x:130,y:180,hp:500};
 const threats=[t,{id:'b',x:350,y:320,hp:800},{id:'c',x:330,y:310,hp:800}];
 const w=orbitAutopilotWaypointV112({player:p,target:t,enemies:threats,laserRange:850,mapWidth:700,mapHeight:600,avoidCrowd:true});
 const plain=orbitAutopilotWaypointV112({player:p,target:t,enemies:threats,laserRange:850,mapWidth:700,mapHeight:600,avoidCrowd:false});
 assert.ok(w.x>=40&&w.x<=660&&w.y>=40&&w.y<=560);
 assert.ok(Number.isFinite(w.x)&&Number.isFinite(w.y));
 assert.notDeepEqual({x:w.x,y:w.y},{x:plain.x,y:plain.y});
});
test('V112: comércio remoto é autorizado e pode ocorrer sem abandonar NPC',()=>{
 const s=state();s.cargoUsed=900;
 assert.equal(chooseAutopilotAction(s,{...cfg,autoSell:true}).type,'sell');
 assert.equal(chooseAutopilotAction(s,{...cfg,autoSell:false}).type,'hunt');
 const off={...s,remoteTraderEquipped:false};assert.notEqual(chooseAutopilotAction(off,{...cfg,autoSell:true}).type,'sell');
});
test('V112: compra remota retorna tarefa econômica e não exige parar a nave',()=>{
 const s=state();s.ammoStock=0;s.ammoQuote={catalog_key:'ammo:mcb25',price:600000,currency:'credits',shop_visible:true};s.purchaseBudgetRemaining=2000000;
 assert.equal(chooseAutopilotAction(s,{...cfg,autoBuy:true,budget:2000000}).type,'trade');
 assert.equal(chooseAutopilotAction(s,{...cfg,autoBuy:false}).type,'hunt');
 assert.equal(chooseAutopilotAction({...s,buyPermitted:false},{...cfg,autoBuy:true}).type,'route');
});
test('V112: HP crítico ainda recua; mapa PvP continua proibido e sem ganhos inventados',()=>{
 const s=state();s.player.hp=200;
 assert.equal(chooseAutopilotAction(s,cfg).type,'route');
 assert.equal(chooseAutopilotAction({...s,map:'b41',player:{...s.player,hp:5000}},cfg).type,'pause');
});
test('V112: integração mantém CPU e venda oficiais sem bloquear o tick de combate',()=>{
 const src=read('public/modules/stellar-autopilot-v48.js');const game=read('public/game.js');
 assert.match(src,/let tradeBusy=false,tradeHoldBuy=false,tradeHoldSell=false/);
 assert.match(src,/action\.type==='sell'/);assert.match(src,/action=chooseAutopilotAction\(s,\{\.\.\.config,autoSell:false/);
 assert.match(src,/action\.type==='trade'/);assert.match(src,/if\(tradeBusy\|\|tradeHoldBuy\|\|busy/);
 assert.match(src,/fireRocketRateLimitedV87\(ts\)/);
 assert.match(game,/sellCargo:\(\)=>sellAllCargo\(\{automatic:true\}\)/);
 assert.match(game,/autoBuyEnabled\(\)/);
 assert.match(src,/recordCollect\(kind\)/);
 assert.match(read('public/modules/stellar-autopilot-v126.js'),/stellar-autopilot-v48\.js\?v=126\.0/);
});
test('V112: compra presencial espera na base e compra remota continua combate',()=>{
 const src=read('public/modules/stellar-autopilot-v48.js'),game=read('public/game.js');
 assert.match(src,/baseCommerceWaitV116\(\{atBase:s\.atBase,remote:s\.remoteBuyEquipped/);
 assert.match(src,/tradeHoldBuy/);
 assert.match(src,/if\(action\.type==='idle'&&action\.reason\?\.startsWith\('Terminal remoto indisponível'\)\)/);
 assert.match(game,/remoteBuyEquipped:!!progress&&autoBuyEnabled\(\)/);
});

test('V112: busca boxes distantes em setor sem NPC e prioriza loot próximo antes de viagem longa',()=>{
 const st=state();st.enemies=[];st.bonusBoxes=[{id:'bonus_long',x:2500,y:2200}];
 let action=chooseAutopilotAction(st,cfg);
 assert.equal(action.collectKind,'box');assert.equal(action.targetId,'bonus_long');
 st.loot=[{id:'real_drop',x:220,y:325,expiresAt:1050}];
 action=chooseAutopilotAction(st,cfg);
 assert.equal(action.collectKind,'drop');assert.equal(action.targetId,'real_drop');
});
test('V112: reposição proativa de laser/míssil tem limites de orçamento explícitos',()=>{
 const cfg=cleanAutopilotConfig();
 assert.equal(cfg.ammoMin,2500);assert.equal(cfg.rocketMin,100);
 assert.equal(cfg.budget,25000000);
 assert.equal(cleanAutopilotConfig({budget:500000000}).budget,250000000);
});
