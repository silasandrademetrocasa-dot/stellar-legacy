import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tradeRequestIdV1164,findTradeReceiptV1164,rememberTradeReceiptV1164} from '../server/autotrade-idempotency-v1164.js';
import {makeAutoTradeRequestV1164,clearAutoTradeRequestV1164,autoTradeRecoveryDelayV1164,autoLaserReserveV1164} from '../public/modules/stellar-autotrade-v1164.js';
import {materializerProductNameV1164} from '../public/modules/materializer-product-names-v1164.js';
import {chooseAutopilotAction} from '../public/modules/stellar-autopilot-v48.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const id='at_abc1234567890123456';
test('V116.4: recibo de venda é persistido no save e reconsulta nunca cobra duas vezes',()=>{
 const save={profile:{credits:5000},cargo:{},serverPurchaseRevision:1};
 const info={action:'sell_cargo',total:3000,sold:{Prometium:{qty:3,unit:1000}}};
 assert.equal(tradeRequestIdV1164(id),id);
 assert.equal(findTradeReceiptV1164(save,id,'sell_cargo',{resource_id:'all'}),null);
 rememberTradeReceiptV1164(save,id,'sell_cargo',{resource_id:'all'},info);
 assert.deepEqual(findTradeReceiptV1164(structuredClone(save),id,'sell_cargo',{resource_id:'all'}),info);
 assert.equal(save.profile.credits,5000);
 assert.throws(()=>findTradeReceiptV1164(save,id,'auto_buy',{catalog_key:'ammo:mcb25'}),/diferente/);
});
test('V116.4: compra com mesmo request_id após falha recebe a confirmação original',()=>{
 const save={};const info={action:'auto_buy',catalog_key:'ammo:mcb25',id:'mcb25',qty:5000,price:600000};
 rememberTradeReceiptV1164(save,id,'auto_buy',{catalog_key:'ammo:mcb25'},info);
 const replay=findTradeReceiptV1164(JSON.parse(JSON.stringify(save)),id,'auto_buy',{catalog_key:'ammo:mcb25'});
 assert.equal(replay.price,600000);
 assert.deepEqual(replay,info);
});
test('V116.4: rejeita IDs inválidos e colisão entre produtos',()=>{
 assert.throws(()=>tradeRequestIdV1164('x'),/inválido/);
 assert.throws(()=>tradeRequestIdV1164('<script>nothing</script>'),/inválido/);
 const s={};rememberTradeReceiptV1164(s,id,'auto_buy',{catalog_key:'ammo:mcb25'},{qty:100});
 assert.throws(()=>findTradeReceiptV1164(s,id,'auto_buy',{catalog_key:'ammo:lcb10'}),/diferente/);
});
test('V116.4: recibos têm limite para não inflar o save',()=>{
 const s={};for(let i=0;i<80;i++)rememberTradeReceiptV1164(s,'at_123456789'+i,'auto_buy',{catalog_key:'ammo:mcb25'},{qty:100});
 assert.equal(s.autoTradeReceiptsV1164.length,64);
});
test('V116.4: solicitação de retry mantém ID no armazenamento até ACK',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const args={storage,identity:'user-1',kind:'buy',key:'ammo:mcb25',randomId:()=>id};
 const a=makeAutoTradeRequestV1164(args),b=makeAutoTradeRequestV1164({...args,randomId:()=>id+'different'});
 assert.equal(a.id,b.id);clearAutoTradeRequestV1164(storage,a);
 assert.equal(storage.getItem(a.slot),undefined);
});
test('V116.4: cooldown regressivo limitado não bloqueia compras para sempre',()=>{
 assert.equal(autoTradeRecoveryDelayV1164(1),30000);
 assert.equal(autoTradeRecoveryDelayV1164(2),60000);
 assert.equal(autoTradeRecoveryDelayV1164(4),240000);
 assert.ok(autoTradeRecoveryDelayV1164(99)<=300000);
});
test('V116.4: reserva usa lasers equipados e limita valores absurdos',()=>{
 assert.equal(autoLaserReserveV1164(2500,14),35000);
 assert.equal(autoLaserReserveV1164(2500,1),2500);
 assert.equal(autoLaserReserveV1164(1000000,999),1000000);
});
test('V116.4: exige compra real quando estoque abaixo da reserva proporcional',()=>{
 const state={online:true,ready:true,map:'x3',player:{x:0,y:0,hp:100,maxHp:100},atBase:false,buyPermitted:true,credits:25000000,purchaseBudgetRemaining:25000000,laserCount:14,
   ammoStock:20000,ammoQuote:{catalog_key:'ammo:mcb25',currency:'credits',price:600000,shop_visible:true},rocketStock:200,rocketQuote:null,
   cargoUsed:0,cargoCapacity:100,base:{x:0,y:0},enemies:[],loot:[],bonusBoxes:[],ores:[]};
 assert.equal(chooseAutopilotAction(state,{map:'x3',ammoMin:2500,autoSell:false}).type,'trade');
 assert.notEqual(chooseAutopilotAction({...state,laserCount:1},{map:'x3',ammoMin:2500,autoSell:false}).type,'trade');
});
test('V116.4: Materializador traduz nome interno para o nome do produto',()=>{
 assert.equal(materializerProductNameV1164({kind:'rocket',id:'plt2026',qty:20,label:'plt2026 +20'}),'CMT-2 +20');
 assert.equal(materializerProductNameV1164({kind:'ammo',id:'mcb25',qty:200,label:'mcb25 +200'}),'PLS-2 +200');
 assert.equal(materializerProductNameV1164({kind:'item',id:'lf4',qty:1,label:'lf4 +1'},()=>({display_name:'Laser Elite ARC-4'})),'Laser Elite ARC-4 +1');
 assert.equal(materializerProductNameV1164({kind:'logdisk',qty:3,label:'id_log_disk'}),'Núcleos Quânticos +3');
 assert.equal(materializerProductNameV1164({kind:'jump',label:'jump'}),'Bônus de Salto +1');
});
test('V116.4: apenas nomes visuais mudam, sem alterar ID, quantidade ou chance',()=>{
 const reward={kind:'rocket',id:'plt2021',qty:42,label:'plt2021 +42'};const old=structuredClone(reward);
 assert.equal(materializerProductNameV1164(reward),'CMT-3 +42');assert.deepEqual(reward,old);
});
test('V116.4: o PUT cliente nunca apaga ou forja recibos econômicos',()=>{
 const server=read('server/index.js');
 assert.match(server,/state\.autoTradeReceiptsV1164=structuredClone\(serverSave\.state\.autoTradeReceiptsV1164\)/);
 assert.match(server,/findTradeReceiptV1164\(state,legacyTradeId,action,payload\)/);
 assert.match(server,/rememberTradeReceiptV1164\(state,legacyTradeId,action,payload,info\)/);
 assert.match(server,/if\(previous\)return \{state,updated_at:null,info:previous,deduplicated:true\}/);
});
test('V116.4: cliente não aplica moedas/munição por cálculo local após compra',()=>{
 const game=read('public/game.js');const begin=game.indexOf('async function runAutoBuy('),end=game.indexOf('// ===================== V10 PILOT BIO',begin);
 const fn=game.slice(begin,end);
 assert.match(fn,/request_id:request\.id/);assert.match(fn,/flush:true,applyState:true/);
 assert.doesNotMatch(fn,/progress\.ammo\[info\.id\]|progress\.profile\[cur\]/);
 assert.match(game,/runEconomyAction\('sell_cargo',payload,\{flush:true,applyState:true\}\)/);
});

test('V116.4: compra presencial funciona sem CPU, venda remota segue protegida',()=>{
 const src=read('server/index.js');
 assert.match(src,/if\(!extras\.includes\('ammoAutoBuyCpu'\)\&\&!buyAtBase\)/);
 assert.match(src,/if\(!atBase\&\&!remoteEnabled\)/);
});
