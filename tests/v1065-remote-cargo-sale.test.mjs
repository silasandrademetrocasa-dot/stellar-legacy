import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasRemoteTraderCpuV1065,eligibleAutoCargoSaleV1065} from '../public/modules/remote-cargo-auto-sale-v1065.js';
import {chooseAutopilotAction} from '../public/modules/stellar-autopilot-v48.js';
const state={shipLoadout:{extras:['autoRocketCpu','remoteTraderCpuElite',null]}};
const basic={mode:'manual',enabled:true,state,cargoUsed:850,cargoCapacity:1000,sellValue:45000,online:true};
test('V106.5: a venda automática exige CPU EQUIPADO, não basta existir no inventário',()=>{
  assert.equal(hasRemoteTraderCpuV1065(state),true);
  assert.equal(hasRemoteTraderCpuV1065({shipLoadout:{extras:[null]},inventory:{remoteTraderCpuElite:1}}),false);
  assert.equal(eligibleAutoCargoSaleV1065({...basic,state:{inventory:{remoteTraderCpuElite:1},shipLoadout:{extras:[]}}}),false);
});
test('V106.5: manual fica desligado sem consentimento e desliga com CPU ausente',()=>{
  assert.equal(eligibleAutoCargoSaleV1065({...basic,enabled:false}),false);
  assert.equal(eligibleAutoCargoSaleV1065({...basic,state:null}),false);
  assert.equal(eligibleAutoCargoSaleV1065(basic),true);
});
test('V106.5: a venda manual ocorre a partir de 85% e só com recursos vendáveis',()=>{
  assert.equal(eligibleAutoCargoSaleV1065({...basic,cargoUsed:849}),false);
  assert.equal(eligibleAutoCargoSaleV1065({...basic,sellValue:0}),false);
  assert.equal(eligibleAutoCargoSaleV1065({...basic,online:false}),false);
  assert.equal(eligibleAutoCargoSaleV1065({...basic,blocked:true}),false);
});
test('V106.5: o modo online/offline também exige extra e estoque mínimo',()=>{
  for(const mode of ['offline','autopilot']){
    assert.equal(eligibleAutoCargoSaleV1065({...basic,mode}),true);
    assert.equal(eligibleAutoCargoSaleV1065({...basic,mode,state:{shipLoadout:{extras:[]}}}),false);
    assert.equal(eligibleAutoCargoSaleV1065({...basic,mode,cargoUsed:0}),false);
  }
});
test('V106.5: Autopilot pode vender remotamente em X-3 sem viajar até X-1',()=>{
  const s={online:true,ready:true,map:'x3',player:{hp:100,maxHp:100},base:{x:0,y:0},atBase:false,canSell:true,remoteTraderEquipped:true,cargoUsed:90,cargoCapacity:100,enemies:[],loot:[],bonusBoxes:[],ores:[],credits:1000000};
  assert.equal(chooseAutopilotAction(s,{map:'x3',cargoThreshold:85}).type,'sell');
  const noCpu=chooseAutopilotAction({...s,remoteTraderEquipped:false},{map:'x3',cargoThreshold:85});
  assert.notEqual(noCpu.type,'sell');
  const switchedOff=chooseAutopilotAction(s,{map:'x3',cargoThreshold:85,autoSell:false});
  assert.notEqual(switchedOff.type,'sell');
});
test('V106.5: o Autopilot não vende remotamente se o servidor não habilita comércio',()=>{
  const s={online:true,ready:true,map:'x3',player:{hp:100,maxHp:100},base:{x:0,y:0},canSell:false,remoteTraderEquipped:true,cargoUsed:100,cargoCapacity:100};
  assert.equal(chooseAutopilotAction(s,{map:'x3',cargoThreshold:85}).type,'idle');
});
test('V106.5: o endpoint de farm valida a montagem em save oficial e devolve flag nas opções',()=>{
  const server=readFileSync(new URL('../server/offline-farm-v484.js',import.meta.url),'utf8');
  assert.match(server,/if\(args\.p_auto_sell===true&&!hasRemoteTraderCpuV1065\(save\.state\)\)/);
  assert.match(server,/remoteTraderEquipped=hasRemoteTraderCpuV1065\(save\.data\?\.state\)/);
  assert.match(server,/map,remoteTraderEquipped,allowed:/);
});
test('V106.5: SQL bloqueia venda offline automática sem terminal equipado',()=>{
  const sql=readFileSync(new URL('../sql/STELLAR_V106_5_CPU_VENDA_AUTO.sql',import.meta.url),'utf8');
  assert.match(sql,/BEFORE INSERT OR UPDATE OF auto_sell/);
  assert.match(sql,/shipLoadout.*extras/);
  assert.match(sql,/remoteTraderCpuElite/);
  assert.doesNotMatch(sql,/UPDATE\s+public\.game_saves/i);
});
test('V106.5: manual fica bloqueado no farm offline e no Autopilot sem PUT por frame',()=>{
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(game,/autoCargoSale:false/);
  assert.match(game,/AUTOPILOT_V48\.active\|\|offlineFarmWorldLockedV84\(\)/);
  assert.match(game,/AUX_WORK_V2027\.due\('manualAutoSellV1065',4500\)/);
  assert.match(game,/runEconomyAction\('sell_cargo',\{resource_id:'all'\}\)/);
  assert.match(game,/sellCargo:\(\)=>sellAllCargo\(\{automatic:true\}\)/);
});
test('V106.5: interface Autopilot bloqueia checkbox de venda sem CPU',()=>{
  const src=readFileSync(new URL('../public/modules/stellar-autopilot-v48.js',import.meta.url),'utf8');
  assert.match(src,/sellToggle\.disabled=!cpuReady/);
  assert.match(src,/s\.remoteTraderEquipped===true&&cargoRatio/);
});
