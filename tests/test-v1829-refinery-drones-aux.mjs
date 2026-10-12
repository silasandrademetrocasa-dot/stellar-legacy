import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const client=readFileSync(new URL('../public/game.js', import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.js', import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html', import.meta.url),'utf8');
const items=readFileSync(new URL('../public/data.js', import.meta.url),'utf8');
function between(src,start,end){const s=src.indexOf(start),e=src.indexOf(end,s+start.length);assert(s>=0&&e>s,`Source extraction: ${start}`);return src.slice(s,e);}
// Drone price quotes: first through eighth, saved bought count and Premium.
const quote=between(client,'function droneNextQuote(type){','function buyDrone(type)');
for(const [id,base,currency] of [['flax',1e7,'credits'],['iris',15000,'uridium']]){
 for(let owned=0;owned<8;owned++){
  const context={progress:{drones:Array(owned).fill({type:id}),dronePurchasesV1829:{}},Math,liveQuote:()=>({basePrice:base,currency,meta:{drone_price_multiplier:2}}),premiumActive:()=>false};
  const v=vm.runInNewContext(`${quote};droneNextQuote('${id}')`,context);
  assert.equal(v.price,base*2**owned);assert.equal(v.tier,owned+1);
 }
}
const premium=vm.runInNewContext(`${quote};droneNextQuote('iris')`,{progress:{drones:[{type:'iris'}]},Math,liveQuote:()=>({basePrice:15000,currency:'uridium',meta:{drone_price_multiplier:2}}),premiumActive:()=>true});
assert.equal(premium.price,28500);
const afterSell=vm.runInNewContext(`${quote};droneNextQuote('flax')`,{progress:{drones:[],dronePurchasesV1829:{flax:4}},Math,liveQuote:()=>({basePrice:1e7,currency:'credits',meta:{drone_price_multiplier:2}}),premiumActive:()=>false});
assert.equal(afterSell.price,160000000,'Sell must not reset progression');
// AUX cargo collection must not liquidate resources; leftovers remain.
const collect=between(client,'function collectPetCargoBox(drop){','function petCollectionRange()');
let cargo={Ferron:0},xp=0,credits=500;
const drop={resources:{Ferron:6}},ctx={collectCargoBox(d){let take=Math.min(4-cargo.Ferron,d.resources.Ferron);cargo.Ferron+=take;d.resources.Ferron-=take;if(!d.resources.Ferron)delete d.resources.Ferron;return !Object.keys(d.resources).length;},addPetXp(n){xp+=n;},Math};
assert.equal(vm.runInNewContext(`${collect};collectPetCargoBox(drop)`,{...ctx,drop}),false);
assert.equal(cargo.Ferron,4);assert.equal(drop.resources.Ferron,2);assert.equal(credits,500);assert(xp>0);
assert(!client.includes('sellPetCargoBox('));
// Craft recipe works on X-3, no base gate.
const craft=between(server,'function applyCraftRecipeServer(state,recipeId,runtime){',"app.post('/api/economy/action'");
const state={mapId:'x3',territoryFaction:'red',profile:{level:10,credits:1000},cargo:{Ferron:25}};
const crafter={runtimeCraftDef:()=>({cost:100,currency:'credits',ingredients:{Ferron:10},grant_payload:{kind:'resource',id:'Refined',qty:2},output_label:'2 units'}),debitServer:(st,cost,curr)=>{st.profile[curr]-=cost;},Math,Object,Number,String};
const result=vm.runInNewContext(`${craft};applyCraftRecipeServer(state,'test',null)`,{...crafter,state});
assert.equal(state.cargo.Ferron,15);assert.equal(state.cargo.Refined,2);assert.equal(state.profile.credits,900);
// UX safety: refinery moved to Hangar, server guards remote sale by equipped EXTRA.
assert(html.includes('id="cargoModal"'));assert(!html.includes('id="refineryGrid"'));
assert(client.includes("refinery:'REFINARIA'"));
assert(client.includes('renderHangarRefinery()'));
assert(server.includes("state.shipLoadout.extras.includes('remoteTraderCpuElite')"));
assert(server.includes("if(!atBase&&!remoteEnabled)"));
assert(items.includes("remoteTraderCpuElite"));
assert(server.includes('state.dronePurchasesV1829[type]=droneTier'));
assert(server.includes('state.dronePurchasesV1829[String(row.ref_id||\'\')]=droneTier+1'));
console.log('PASS V18.2.9: drone tiers 1–8, Premium, historical pricing, AUX cargo, remote refinery and trader guards.');
// The actual sell branch is executed with representative online-save values.
const saleBranch=between(server,"    else if(action==='sell_cargo'){","    else if(action==='sell_inventory'){");
const saleBody=saleBranch.slice("    else if(action==='sell_cargo'){".length).replace(/\n    }\n\s*$/, '');
assert.notEqual(saleBody,saleBranch,'Branch end extracted');
const mockedWorld={resources:[{resource_key:'Prometium',enabled:true,sell_price:1000},{resource_key:'Terbium',enabled:true,sell_price:500}]};
async function performSale(state,payload){
 const context={state,payload,action:'sell_cargo',snapshot:{},String,Number,Math,Object,Map,loadWorldRuntimeSnapshot:async()=>mockedWorld,liveCatalogRow:()=>null,creditServer:(st,amount)=>{st.profile.credits+=amount;}};
 return vm.runInNewContext(`(async()=>{let info;${saleBody};return info;})()`,context);
}
const locked={mapId:'x3',territoryFaction:'a',profile:{faction:'a',credits:0},shipLoadout:{extras:[]},cargo:{Prometium:6}};
await assert.rejects(performSale(locked,{resource_id:'all'}),/Terminal Mercante/);
assert.equal(locked.cargo.Prometium,6);
const field={mapId:'x3',territoryFaction:'a',profile:{faction:'a',credits:0},shipLoadout:{extras:['remoteTraderCpuElite']},cargo:{Prometium:6,Terbium:5,Xenomit:1}};
const sale=await performSale(field,{resource_id:'Prometium'});
assert.equal(sale.total,6000);assert.equal(sale.remote,true);assert.equal(field.profile.credits,6000);
assert.equal(field.cargo.Terbium,5);assert.equal(field.cargo.Xenomit,1);
const base={mapId:'x1',territoryFaction:'a',profile:{faction:'a',credits:0},shipLoadout:{extras:[]},cargo:{Terbium:4,Xenomit:3}};
const baseSale=await performSale(base,{resource_id:'all'});
assert.equal(baseSale.total,2000);assert.equal(baseSale.remote,false);assert.equal(base.cargo.Xenomit,3);
console.log('PASS V18.2.9 server: remote selling equipped-only, base selling, non-sellable resource preserved.');
