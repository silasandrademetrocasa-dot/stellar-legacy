import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auxProtocolTierQuoteV111,applyAuxAdvancedActionV110,validateAuxAdvancedSaveV110} from '../public/modules/aux-advanced-protocols-v110.js';
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const index=source('server/index.js'),game=source('public/game.js'),api=source('public/api.js'),sql=source('sql/STELLAR_V111_PROTOCOLOS_AUX_LEILAO_APLICADO.sql');
function row(id,price,currency,extra={}){return {catalog_key:`aux_protocol:${id}`,kind:'aux_protocol',ref_id:id,price,currency,enabled:true,shop_visible:true,...extra};}
function state(stl=80000,credits=300000000){return {pet:{owned:true,level:1,advancedProtocolOwnedV110:{},advancedProtocolEquippedV110:{}},mapId:'x1',territoryFaction:'terra',profile:{faction:'terra',uridium:stl,credits},cargo:{}};}
test('V111: família ELITE exige ao menos 50 mil STL, moeda imutável',()=>{
 for(const id of ['dano','hp','escudo']){
  assert.equal(auxProtocolTierQuoteV111(id,1,row(id,50000,'uridium')).cost,50000);
  assert.equal(auxProtocolTierQuoteV111(id,1,row(id,49999,'uridium')),null);
  assert.equal(auxProtocolTierQuoteV111(id,1,row(id,100000000,'credits')),null);
 }
});
test('V111: BOX e PORÃO exigem 100 milhões de créditos, nunca STL',()=>{
 for(const id of ['loot','porao']){
  assert.equal(auxProtocolTierQuoteV111(id,1,row(id,100000000,'credits')).currency,'credits');
  assert.equal(auxProtocolTierQuoteV111(id,1,row(id,99999999,'credits')),null);
  assert.equal(auxProtocolTierQuoteV111(id,1,row(id,50000,'uridium')),null);
 }
});
test('V111: catálogo inexistente, desativado e identidade trocada bloqueiam compra',()=>{
 assert.equal(auxProtocolTierQuoteV111('dano',1,null),null);
 assert.equal(auxProtocolTierQuoteV111('dano',1,row('hp',50000,'uridium')),null);
 assert.equal(auxProtocolTierQuoteV111('dano',1,row('dano',50000,'uridium',{enabled:false})),null);
 assert.equal(auxProtocolTierQuoteV111('dano',1,row('dano',50000,'uridium',{shop_visible:false})),null);
});
test('V111: compra segura de DANO debita 50 mil STL sem alterar CR',()=>{
 const s=state(); const r=applyAuxAdvancedActionV110(s,'aux_protocol_buy',{id:'dano'},{catalog:row('dano',50000,'uridium')});
 assert.equal(r.cost,50000);assert.equal(r.currency,'uridium');assert.equal(s.profile.uridium,30000);assert.equal(s.profile.credits,300000000);assert.equal(s.pet.advancedProtocolOwnedV110.dano,1);
});
test('V111: compra de PORÃO debita CR sem alterar STL',()=>{
 const s=state();const r=applyAuxAdvancedActionV110(s,'aux_protocol_buy',{id:'porao'},{catalog:row('porao',100000000,'credits')});
 assert.equal(r.currency,'credits');assert.equal(s.profile.credits,200000000);assert.equal(s.profile.uridium,80000);assert.equal(s.pet.advancedProtocolOwnedV110.porao,1);
});
test('V111: preço insuficiente ou saldo insuficiente não gera concessões',()=>{
 const s=state(10000,20000000);const initial=structuredClone(s);
 assert.throws(()=>applyAuxAdvancedActionV110(s,'aux_protocol_buy',{id:'loot'},{catalog:row('loot',100000000,'credits')}),/Saldo insuficiente/);
 assert.equal(s.profile.credits,initial.profile.credits);assert.equal(s.pet.advancedProtocolOwnedV110.loot,0);
 assert.throws(()=>applyAuxAdvancedActionV110(s,'aux_protocol_buy',{id:'dano'},{catalog:row('dano',49999,'uridium')}),/Preço do protocolo/);
 assert.equal(s.profile.uridium,initial.profile.uridium);
});
test('V111: especializações antigas dentro de INFORMAÇÕES e N1 exclusivamente em PROTOCOLOS',()=>{
 assert.match(game,/section==='info'[\s\S]*?const cap=petSlotCapacity\('protocol',level\),ranks=normalizeAuxProtocols/);
 assert.match(game,/section==='protocols'[\s\S]*?Protocolos avançados/mi);
 assert.match(game,/auxWorkbenchSectionV1091/);
});
test('V111: leilão de protocolos usa RPC, autenticação e liquidação SQL atômica',()=>{
 assert.match(game,/lot\.kind==='auxProtocol'\?await placeAuctionBidOnline\(bidArgs\):await saveAuctionBidOnline\(bidArgs\)/);
 assert.match(game,/claimAuxProtocolAuctionV111\(\{hourKey:row\.hour_key,lotRef:row\.lot_ref\}\)/);
 assert.match(api,/claim_aux_protocol_auction_v111/);
 assert.match(sql,/FOR UPDATE/);assert.match(sql,/serverPurchaseRevision/);
 assert.match(sql,/status='won'/);
 assert.match(sql,/auction_aux_rpc_only_insert_v111/);
 assert.match(sql,/auction_aux_rpc_only_update_v111/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.claim_aux_protocol_auction_v111/);
});
test('V111: edições do ADM exigem autenticação, classe de moeda fixa e consulta ao banco',()=>{
 assert.match(index,/app\.post\('\/api\/admin\/runtime\/aux-economy',requireUser/);
 assert.match(index,/is_game_admin_v1763/);
 assert.match(index,/row\.currency!==expectedCurrency/);
 assert.match(index,/await loadLiveOpsSnapshot\(true\)/);
 assert.match(game,/function adminAuxPricingPanelV111/);
 assert.match(game,/insertAdjacentHTML\('afterbegin',adminAuxPricingPanelV111\(\)\)/);
});
test('V111: não modifica sistema de recompensas V106.9 nem proteção V108',()=>{
 assert.match(index,/grantNpcRewardSafelyV1069/);
 const world=source('server/world.js');
 assert.match(world,/shouldRefreshWorldRuntimeV108/);
 assert.match(world,/STELLAR_NETWORK_LOGS/);
});
