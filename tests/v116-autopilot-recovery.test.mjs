import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseAutopilotAction,cleanAutopilotConfig,createStellarAutopilotV48} from '../public/modules/stellar-autopilot-v48.js';
import {baseCommerceWaitV116,nextRouteCooldownV116,baseTradeVisibleV116,routeWatchdogExpiredV116} from '../public/modules/stellar-autopilot-recovery-v116.js';
const src=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const basic=(extra={})=>({online:true,ready:true,map:'x3',player:{x:240,y:260,hp:150000,maxHp:150000},
  base:{x:6580,y:3888},cargoUsed:900,cargoCapacity:1000,sellableCargoValue:540000,
  remoteTraderEquipped:false,atBase:false,canSell:false,ammoStock:9000,rocketStock:999,
  enemies:[],bonusBoxes:[],loot:[],ores:[],credits:90000000,laserRange:900,...extra});

test('V116: CPU ausente volta ao X-1 com porão cheio, mas não inventa venda remota',()=>{
  const result=chooseAutopilotAction(basic(),{map:'x3',autoSell:true,autoBuy:false});
  assert.equal(result.type,'route');assert.equal(result.map,'x1');
});
test('V116: sem CPU no X-1 aproxima base e só vende dentro do posto',()=>{
  const cfg={map:'x3',autoSell:true,autoBuy:false};
  const outside=chooseAutopilotAction(basic({map:'x1',atBase:false,canSell:false}),cfg);
  assert.equal(outside.type,'move');assert.deepEqual([outside.x,outside.y],[6580,3888]);
  const inside=chooseAutopilotAction(basic({map:'x1',atBase:true,canSell:true}),cfg);
  assert.equal(inside.type,'sell');assert.match(inside.reason,/presencial/);
});
test('V116: CPU remoto permite venda no combate, mas não contorna confirmação do posto',()=>{
  assert.equal(chooseAutopilotAction(basic({remoteTraderEquipped:true,canSell:true}),{map:'x3',autoSell:true,autoBuy:false}).type,'sell');
  const no=chooseAutopilotAction(basic({remoteTraderEquipped:true,canSell:false}),{map:'x3',autoSell:true,autoBuy:false});
  assert.equal(no.type,'idle');
});
test('V116: recurso não vendável não inicia viagem ou venda',()=>{
  const x=chooseAutopilotAction(basic({sellableCargoValue:0}),{map:'x3',autoSell:true,autoBuy:false});
  assert.notEqual(x.type,'sell');assert.notEqual(x.type,'route');
});
test('V116: espera comercial tem limite e não é confundida com oito tentativas de rota',()=>{
  const x={atBase:true,remote:false,busy:true,startedAt:100,now:30099,hold:false};
  assert.equal(baseCommerceWaitV116(x),true);
  assert.equal(baseCommerceWaitV116({...x,now:30100}),false);
  assert.equal(baseCommerceWaitV116({...x,hold:true}),false);
  assert.equal(baseCommerceWaitV116({...x,remote:true}),false);
  assert.equal(baseCommerceWaitV116({...x,atBase:false}),false);
  assert.equal(nextRouteCooldownV116(1),2400);
  assert.equal(nextRouteCooldownV116(8),10000);
  assert.ok(nextRouteCooldownV116(15)<=60000);
});
test('V116: após oito rotas falhas, o bot espera e tenta de novo sem desistir do mapa',()=>{
  const a=src('public/modules/stellar-autopilot-v48.js');
  assert.match(a,/routeMisses\+\+;nextRouteSearch=ts\+nextRouteCooldownV116\(routeMisses\)/);
  assert.doesNotMatch(a,/routeMisses>=8\)\{stop\(/);
});
test('V116: watchdog só reage se a nave não progrediu de mapa ou posição',()=>{
  const x={map:'x1',goal:'x3',lastMovementAt:1000,now:121000};
  assert.equal(routeWatchdogExpiredV116(x),true);
  assert.equal(routeWatchdogExpiredV116({...x,now:120999}),false);
  assert.equal(routeWatchdogExpiredV116({...x,map:'x3'}),false);
  assert.equal(routeWatchdogExpiredV116({...x,enabled:false}),false);
});
test('V116: botão do posto mostra/esconde no mesmo ritmo da nave, sem liberar outra facção',()=>{
  const b={connected:true,map:'x1',ownTerritory:true,safeZone:true,jumping:false,astral:false};
  assert.equal(baseTradeVisibleV116(b),true);
  assert.equal(baseTradeVisibleV116({...b,map:'x8'}),true);
  for(const x of [{map:'x3'},{safeZone:false},{ownTerritory:false},{jumping:true},{connected:false},{astral:true}])
    assert.equal(baseTradeVisibleV116({...b,...x}),false);
  const g=src('public/game.js'),css=src('public/style.css');
  assert.match(g,/updateCriticalHudV2024\(\);\s*updateBaseTradePrompt\(\)/);
  assert.doesNotMatch(g,/const visible=active&&!baseNavigationV140/);
});
test('V116: suporta até doze horas sem transformar tempo esgotado em falha de rede',()=>{
  assert.equal(cleanAutopilotConfig({minutes:480}).minutes,480);
  assert.equal(cleanAutopilotConfig({minutes:1000}).minutes,720);
});
test('V116: recompensa preserva ID capturado antes da RPC e não depende de c.player após await',()=>{
  const w=src('server/world.js');const a=w.indexOf('async commitNpcDeathV1069('),b=w.indexOf('// A BOX nunca é compartilhada.',a);
  const block=w.slice(a,b);
  assert.match(block,/const recipientUserId=String\(c\.player\?\.userId\|\|''\)/);
  assert.match(block,/this\.world\.grantNpcReward\(recipientUserId/);
  assert.match(block,/this\.world\.recordEliteEvent\?\.\(recipientUserId/);
  assert.doesNotMatch(block,/this\.world\.grantNpcReward\(c\.player\.userId/);
});
test('V116: logs do Autopilot exigem identidade autenticada, evento permitido e limite por piloto',()=>{
  const server=src('server/index.js');
  assert.match(server,/app\.post\('\/api\/autopilot\/v116\/diagnostics',requireUser/);
  assert.match(server,/autopilotDiagThrottleV116/);
  assert.match(server,/route_watchdog/);
  assert.doesNotMatch(server,/service_role.*diagnostics/);
});

async function withLiveBot(mode){
  // Teste do motor real: simula um servidor que nunca confirma uma operação econômica.
  const oldFetch=globalThis.fetch,oldStorage=globalThis.sessionStorage,oldNow=Date.now;
  let time=1790000000000,buys=0,sales=0;const moves=[],diagnostics=[];
  const user='v116-test-user';
  const storage=new Map([['stellar_autopilot_phase3_v483_resume',JSON.stringify({user,
    config:{map:'x3',autoBuy:mode==='buy',autoSell:mode==='sell',rockets:false,minutes:480,
      ammoMin:2500,rocketMin:100,cargoThreshold:85,budget:5000000},
    started:time-1000,storedAt:time-1000,spent:0,attempts:0,failures:0,boxes:0,drops:0,ores:0})]]);
  globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  globalThis.fetch=async()=>({ok:true,json:async()=>({allowed:true,is_admin:false})});
  Date.now=()=>time;
  const snapshot=()=>({online:true,ready:true,map:'x1',player:{x:600,y:500,hp:100000,maxHp:100000},
    atBase:true,canSell:true,remoteTraderEquipped:false,remoteBuyEquipped:false,buyPermitted:true,
    base:{x:600,y:500},cargoUsed:mode==='sell'?950:50,cargoCapacity:1000,sellableCargoValue:mode==='sell'?320000:100,
    ammoStock:mode==='buy'?0:8000,rocketStock:1000,ammoQuote:{catalog_key:'ammo:lcb10',currency:'credits',price:1000},
    credits:50000000,xp:0,stl:0,level:10,kills:0,boxes:0,jumping:false,enemies:[],loot:[],bonusBoxes:[],ores:[]});
  const bot=createStellarAutopilotV48({getIdentity:()=>user,credentials:()=>({accessToken:'test',gameSessionId:'test'}),getSnapshot:snapshot,
    getGraphLabel:()=> 'J-1',getGoalLabel:()=> 'J-3',getPortals:from=>from==='J-1'?[{targetLabel:'J-2',x:900,y:900}]:from==='J-2'?[{targetLabel:'J-3',x:900,y:900}]:[],
    mayTravel:()=>true,navigate:(x,y)=>moves.push([x,y]),jumpPortal:async()=>true,
    buyPackage:()=>{buys++;return new Promise(()=>{});},sellCargo:()=>{sales++;return new Promise(()=>{});},
    ensureCombatAmmo:()=>true,onDiagnostics:event=>diagnostics.push(event)});
  try{
    assert.equal(await bot.refreshAccess(),true);
    assert.equal(bot.active,true);
    bot.tick();await Promise.resolve();
    assert.equal(mode==='buy'?buys:sales,1,'uma unica operacao em voo');
    assert.equal(moves.length,0,'aguarda confirmacao presencial inicialmente');
    time+=31000;bot.tick();await Promise.resolve();
    assert.equal(mode==='buy'?buys:sales,1,'nunca duplica operacao incerta');
    assert.ok(moves.length>0,'retoma rota mesmo sem resposta em 31 segundos');
    assert.equal(bot.active,true,'nao encerra o bot');
    assert.ok(diagnostics.some(x=>x.event==='trade_timeout'));
  }finally{
    bot.stop('fim teste');globalThis.fetch=oldFetch;globalThis.sessionStorage=oldStorage;Date.now=oldNow;
  }
}
test('V116 integração: compra presencial pendurada não bloqueia retorno ao X-3 e não duplica compra',async()=>withLiveBot('buy'));
test('V116 integração: venda presencial pendurada não bloqueia retorno ao X-3 e não duplica venda',async()=>withLiveBot('sell'));
