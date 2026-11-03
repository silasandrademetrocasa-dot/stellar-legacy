import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDroneSalePreflightV11731} from '../public/modules/drone-sale-preflight-v11731.js';

const drone=(id,type='flax',slots=['lf2'])=>({id,type,slots});
const state=(drones,extras={})=>({activeShipId:'phoenix',drones,shipLoadout:{lasers:[],generators:[],extras:[]},...extras});
const sig=s=>JSON.stringify({ship:s.activeShipId,drones:s.drones,loadout:s.shipLoadout});

test('V117.3.1: Halo presente e montagem idêntica permite pedido servidor-autoritativo',()=>{
  const official=state([drone('halo-a'),drone('halo-b')]);
  const local=structuredClone(official);
  const result=validateDroneSalePreflightV11731({localState:local,officialState:official,droneId:'halo-b',layoutSignature:sig});
  assert.deepEqual(result,{ok:true,reason:'VERIFIED',droneId:'halo-b',droneType:'flax'});
  assert.equal(official.drones.length,2);
  assert.equal(local.drones.length,2);
});

test('V117.3.1: nunca vender identificador inexistente no servidor',()=>{
  const local=state([drone('halo-a')]),official=state([]);
  assert.equal(validateDroneSalePreflightV11731({localState:local,officialState:official,droneId:'halo-a',layoutSignature:sig}).reason,'NOT_IN_SERVER');
});

test('V117.3.1: montagem divergente bloqueia venda e exige revisão explícita',()=>{
  const official=state([drone('halo-a')]),local=state([drone('halo-a','flax',[null])]);
  const result=validateDroneSalePreflightV11731({localState:local,officialState:official,droneId:'halo-a',layoutSignature:sig});
  assert.deepEqual(result,{ok:false,reason:'LAYOUT_DIFFERENT'});
  assert.deepEqual(official.drones[0].slots,['lf2']);
});

test('V117.3.1: troca de tipo e estado sem assinatura falham fechado',()=>{
  assert.equal(validateDroneSalePreflightV11731({localState:state([drone('h','iris')]),officialState:state([drone('h')]),droneId:'h',layoutSignature:sig}).ok,false);
  assert.equal(validateDroneSalePreflightV11731({localState:state([drone('h')]),officialState:null,droneId:'h',layoutSignature:sig}).ok,false);
  assert.equal(validateDroneSalePreflightV11731({localState:state([drone('h')]),officialState:state([drone('h')]),droneId:'h'}).ok,false);
});

test('V117.3.1: venda do drone usa somente ID do item e confirmação do servidor, sem preço do cliente',()=>{
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  const server=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
  assert.match(game,/validateDroneSalePreflightV11731\(/);
  assert.match(game,/runEconomyAction\('sell_drone',\{drone_id:droneId\},\{flush:false,applyState:true\}\)/);
  assert.match(game,/serverConfirmedEquipment:\['aux_protocol_buy','aux_protocol_craft','aux_protocol_equip'\]\.includes\(action\)\|\|action==='sell_drone'/);
  assert.match(server,/const droneId=String\(payload\.drone_id\|\|''\)/);
  assert.match(server,/drones\.splice\(idx,1\)/);
  assert.match(server,/creditServer\(state,refund,currency\)/);
  assert.doesNotMatch(game.match(/runEconomyAction\('sell_drone'[^;]+/)[0],/refund|credits|price/);
});
