// V18.1.9.1: valida o comportamento do código REAL da Loja, sem precisar de login ou saldo real.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../public/game.js', import.meta.url),'utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a!==-1&&b>a,`Trecho não encontrado: ${start}`);return source.slice(a,b);}
const modalSection=section('let pendingConfirmAction=null;', 'async function performSellInventoryItem');
const itemSection=section('function buyItem(itemId)', 'function buyDrone(');
const cardSection=section('function commonShopProductCard(row)', 'function renderShop(');
const classList=(hidden)=>({state:new Set(hidden?['hidden']:[]),add(k){this.state.add(k);},remove(k){this.state.delete(k);},contains(k){return this.state.has(k);}});
const shopModal={classList:classList(false)},confirmModal={classList:classList(true)};
const ui={saleConfirmModal:confirmModal,saleConfirmEyebrow:{},saleConfirmTitle:{},saleConfirmItem:{},saleConfirmCopy:{},saleConfirmValueLabel:{},saleConfirmValue:{},saleConfirmAccept:{className:''},shopModal};
let purchases=0,toast=[];
const items={laser_demo:{id:'laser_demo',type:'laser',name:'Laser de teste',damage:100,description:'Laser.'},gen_demo:{id:'gen_demo',type:'generator',subtype:'shield',name:'Gerador de teste',description:'Gerador.'},extra_demo:{id:'extra_demo',type:'extra',name:'Extra de teste',description:'Extra.'},drone_demo:{id:'drone_demo',type:'drone',name:'Drone de teste',description:'Drone.'}};
const ctx={
  ui,ITEMS:items,progress:{profile:{credits:999999,uridium:999999,level:20},ownedShips:[],inventory:{},shipLoadout:{extras:[]},drones:[],pet:{owned:false}},
  dismissibleModals:()=>[confirmModal,shopModal],fmt:(v)=>String(v),showToast:(v)=>toast.push(v),
  liveQuote:(key)=>({catalog_key:key,kind:key.split(':')[0],price:200,basePrice:200,currency:'credits',shop_visible:true}),
  ensureShopLevel:()=>true,canAfford:()=>true,ownsExtraItem:()=>false,
  applyAuthoritativePurchase:()=>{purchases++;},
  assetForProduct:()=>'',productIcon:()=>'',priceText:()=>'',
  shopRowLocked:()=>false,shopRowMinLevel:()=>1,shopRowDisplayName:(r,f)=>f,shopRowDescription:(r,f)=>f,shopRowQty:(r,n)=>n,
  SHIPS:{ship_demo:{id:'ship_demo',name:'Nave teste',role:'',hp:100,lasers:2,generators:2,extras:1,speed:100}},
  LASER_AMMO:{ammo_demo:{name:'Munição teste',pack:100,mult:1}},ROCKETS:{rocket_demo:{name:'Míssil teste',pack:100,damage:30}},PET_GEARS:{gear_demo:{name:'Módulo teste',description:'Módulo'}},PET_MAX_LEVEL:15,
  ammoQty:()=>10,rocketQty:()=>10,
  buyDrone:()=>{purchases++;},buyShip:()=>{purchases++;},buyAmmo:()=>{purchases++;},buyRockets:()=>{purchases++;},buyPetUnit:()=>{purchases++;},buyPetGear:()=>{purchases++;},
  makeProductCard:(data)=>data
};
vm.createContext(ctx);
vm.runInContext(modalSection+'\n'+itemSection+'\n'+cardSection,ctx);
for(const [kind,id] of [['laser','laser_demo'],['generator','gen_demo'],['extra','extra_demo']]){
  const card=vm.runInContext(`commonShopProductCard(${JSON.stringify({kind,ref_id:id,catalog_key:'item:'+id,enabled:true,shop_visible:true})})`,ctx);
  assert.equal(typeof card.onBuy,'function',`${kind} sem callback`);
  card.onBuy();
  assert.equal(confirmModal.classList.contains('hidden'),false,`${kind}: modal não abriu`);
  assert.equal(shopModal.classList.contains('hidden'),true,`${kind}: loja anterior não foi ocultada`);
  assert.equal(ui.saleConfirmEyebrow.textContent,'CONFIRMAÇÃO DE COMPRA');
  assert.equal(purchases,0,`${kind}: o saldo foi consumido antes da confirmação`);
  vm.runInContext('closeSaleConfirm()',ctx);
  assert.equal(confirmModal.classList.contains('hidden'),true,`${kind}: cancelar não fechou modal`);
  assert.equal(shopModal.classList.contains('hidden'),false,`${kind}: loja não reabriu`);
  assert.equal(purchases,0,`${kind}: cancelar produziu compra`);
}
const card=vm.runInContext(`commonShopProductCard(${JSON.stringify({kind:'laser',ref_id:'laser_demo',catalog_key:'item:laser_demo',enabled:true,shop_visible:true})})`,ctx);
card.onBuy();
vm.runInContext('confirmSaleNow()',ctx);
assert.equal(purchases,1,'confirmar compra não chamou servidor');
assert.equal(shopModal.classList.contains('hidden'),false,'loja não voltou depois da confirmação');
assert.equal(confirmModal.classList.contains('hidden'),true,'confirmação não fechou');
// Garantia para a categoria drone: deve continuar usando sua própria validação de limite.
const drone=vm.runInContext(`commonShopProductCard(${JSON.stringify({kind:'drone',ref_id:'drone_demo',catalog_key:'drone:drone_demo',enabled:true,shop_visible:true})})`,ctx);
drone.onBuy();assert.equal(purchases,2,'caminho do drone foi alterado');
assert.equal(toast.length,0,`Avisos inesperados: ${toast.join(', ')}`);
console.log('PASSOU: lasers, geradores, extras, cancelar/confirmar, retomada da loja e caminho do drone.');
