import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {economyServerFirstV130,shouldRetrySaleV130,createEconomyTimingsV130} from '../public/modules/economy-sale-v130.js';
import {quoteCargoSaleV130} from '../server/cargo-sale-v130.js';
const text=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const prices=[{resource_key:'Prometium',sell_price:1000,enabled:true},{resource_key:'Duranium',sell_price:15000,enabled:true},{resource_key:'Xenomit',sell_price:0,enabled:true},{resource_key:'Terbium',sell_price:2500,enabled:false}];
test('V130 cargo: only server-confirmed sellable stock credited once; input not mutated',()=>{
 const cargo={Prometium:12,Duranium:2,Xenomit:200,Terbium:100};
 const q=quoteCargoSaleV130(cargo,{worldResources:prices});
 assert.equal(q.total,42000);assert.equal(q.sold.Prometium.qty,12);assert.equal(q.sold.Duranium.qty,2);
 assert.deepEqual(Object.keys(q.sold).sort(),['Duranium','Prometium']);assert.equal(cargo.Prometium,12);
});
test('V130 sale by resource and disabled resource stay safe',()=>{
 assert.equal(quoteCargoSaleV130({Duranium:2,Prometium:3},{resourceId:'Duranium',worldResources:prices}).total,30000);
 assert.equal(quoteCargoSaleV130({Terbium:3},{worldResources:prices}).total,0);
 assert.equal(quoteCargoSaleV130({Xenomit:99},{worldResources:prices}).total,0);
});
test('V130 fallback prices only for missing runtime keys',()=>{
 const catalog=[{ref_id:'Prometium',enabled:true,price:1900,meta:{mode:'sell'}}];
 assert.equal(quoteCargoSaleV130({Prometium:2},{catalog}).total,3800);
 assert.equal(quoteCargoSaleV130({Prometium:2},{worldResources:prices,catalog}).total,2000);
});
test('V130 economy receipts: no retry on definitive conflict; transient retry uses durable ID',()=>{
 assert.equal(economyServerFirstV130('sell_cargo'),true);
 assert.equal(economyServerFirstV130('sell_inventory'),true);
 assert.equal(economyServerFirstV130('sell_drone'),false);
 assert.equal(shouldRetrySaleV130({status:409,code:'ECONOMY_STALE'}),false);
 assert.equal(shouldRetrySaleV130({status:503,code:'ECONOMY_RPC_UNAVAILABLE'}),true);
 assert.equal(shouldRetrySaleV130({code:'NETWORK_TIMEOUT'}),true);
});
test('V130 diagnostic buffer bounded and does not collect identity, currency or item IDs',()=>{
 let t=100;const d=createEconomyTimingsV130({now:()=>t,max:2});const start=d.start();t+=24;
 d.finish(start,{action:'sell_cargo',ok:true,serverMs:18});d.finish(start,{action:'sell_inventory',ok:false,code:'CARGO_NOT_CONFIRMED'});d.finish(start,{action:'buy_quantum_cores',ok:true});
 assert.equal(d.snapshot().length,2);
 assert.ok(!JSON.stringify(d.snapshot()).includes('Prometium'));
});
test('V130 wiring: authoritative server settlement and UI safe preflight',()=>{
 const game=text('../public/game.js');const server=text('../server/index.js');
 assert.match(game,/economyServerFirstV130\(action\)/);assert.match(game,/runEconomyAction\('sell_cargo',payload,\{flush:false,applyState:true\}\)/);
 assert.match(server,/quoteCargoSaleV130\(state\.cargo/);assert.match(server,/stellar_commit_economy_operation_v125/);
 assert.match(game,/scheduleMissionPanelRenderV130\(\)/);
});
