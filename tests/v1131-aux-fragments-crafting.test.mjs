import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
 AUX_ADVANCED_TIERS_V110,auxProtocolTierQuoteV111,auxProtocolFragmentsV1131,auxProtocolStockV1131,
 applyAuxAdvancedActionV110,validateAuxAdvancedSaveV110
} from '../public/modules/aux-advanced-protocols-v110.js';
const src=f=>readFileSync(resolve(import.meta.dirname,'..',f),'utf8');
const row=id=>({catalog_key:`aux_protocol:${id}`,kind:'aux_protocol',ref_id:id,enabled:true,shop_visible:true,currency:id==='loot'||id==='porao'?'credits':'uridium',price:id==='loot'||id==='porao'?100000000:50000});
const state=()=>({mapId:'x1',territoryFaction:'earth',profile:{faction:'earth',credits:5000000000,uridium:5000000},pet:{owned:true,level:20,advancedProtocolOwnedV110:{},advancedProtocolEquippedV110:{}},combatConfigsV2013:{active:1,profiles:{1:{petLoadout:{}},2:{petLoadout:{}}}}});
const buy=(s,id)=>applyAuxAdvancedActionV110(s,'aux_protocol_buy',{id,level:1},{catalog:row(id)});
const craft=(s,id,level)=>applyAuxAdvancedActionV110(s,'aux_protocol_craft',{id,level});
test('as duas receitas usam 4 copias e 10 fragmentos da origem exata',()=>{
 for(const tier of [2,3]){
  assert.equal(AUX_ADVANCED_TIERS_V110[tier].protocols,4);
  assert.equal(AUX_ADVANCED_TIERS_V110[tier].fragments,10);
  assert.equal(AUX_ADVANCED_TIERS_V110[tier].currency,'uridium');
 }
 assert.equal(AUX_ADVANCED_TIERS_V110[2].fragmentKind,'apex');
 assert.equal(AUX_ADVANCED_TIERS_V110[3].fragmentKind,'universo');
 assert.equal(AUX_ADVANCED_TIERS_V110[2].creditsCost,0);
 assert.equal(AUX_ADVANCED_TIERS_V110[3].creditsCost,180000000);
});
test('quatro compras N1 sao unidades, nao quatro atualizacoes do mesmo rank',()=>{
 const s=state();for(let i=0;i<4;i++)buy(s,'dano');
 assert.equal(auxProtocolStockV1131(s.pet).dano[1],4);
 assert.equal(s.pet.advancedProtocolOwnedV110.dano,1);
 assert.equal(s.profile.uridium,5000000-200000);
});
test('falhas de craft nao debitam e nem fabricam itens',()=>{
 const s=state();for(let i=0;i<4;i++)buy(s,'dano');
 const snapshot=structuredClone(s);
 assert.throws(()=>craft(s,'dano',2),/10 fragmentos/);
 assert.equal(s.profile.uridium,snapshot.profile.uridium);
 assert.deepEqual(auxProtocolStockV1131(s.pet),auxProtocolStockV1131(snapshot.pet));
 s.pet.advancedProtocolFragmentsV1131={apex:9,universo:20};
 assert.throws(()=>craft(s,'dano',2),/10 fragmentos/);
 assert.equal(auxProtocolStockV1131(s.pet).dano[1],4);
});
test('N3 so fabrica no Universo, e exige 4 N2 reais',()=>{
 const s=state();for(let i=0;i<16;i++)buy(s,'dano');
 s.pet.advancedProtocolFragmentsV1131={apex:40,universo:10};
 for(let i=0;i<4;i++)craft(s,'dano',2);
 assert.throws(()=>craft(s,'dano',3),/Universo/);
 s.mapId='u1'; const out=craft(s,'dano',3);
 assert.equal(out.level,3);assert.equal(s.pet.advancedProtocolFragmentsV1131.universo,0);
 assert.equal(s.pet.advancedProtocolStockV1131.dano[3],1);
 assert.equal(s.pet.advancedProtocolStockV1131.dano[2],0);
});
test('os cinco protocolos preservam os niveis ja adquiridos num save legado',()=>{
 const pet={advancedProtocolOwnedV110:{dano:2,loot:1},advancedProtocolEquippedV110:{dano:2}};
 const inv=auxProtocolStockV1131(pet);
 assert.equal(inv.dano[1],0);assert.equal(inv.dano[2],1);
 assert.equal(inv.loot[1],1);assert.equal(inv.loot[2],0);
});
test('nenhum save pode inventar estoque nem fragmentos',()=>{
 const s=state();buy(s,'hp');
 const hacked=structuredClone(s);hacked.pet.advancedProtocolStockV1131.hp[1]=15;
 assert.equal(validateAuxAdvancedSaveV110(s,hacked).code,'SAVE_AUX_PROTOCOL_STOCK');
 const hacked2=structuredClone(s);hacked2.pet.advancedProtocolFragmentsV1131={apex:10,universo:10};
 assert.equal(validateAuxAdvancedSaveV110(s,hacked2).code,'SAVE_AUX_FRAGMENT_FORGED');
 const forged=structuredClone(s);forged.pet.advancedProtocolFragmentsV1131={apex:1.5};
 assert.equal(validateAuxAdvancedSaveV110(s,forged).code,'SAVE_AUX_FRAGMENT_FORMAT');
 assert.equal(validateAuxAdvancedSaveV110(s,structuredClone(s)).ok,true);
});
test('o drop depende de NPC oficial, ledger, sorteio SQL e de um recibo por abate',()=>{
 const sql=src('sql/STELLAR_V1131_PROTOCOLOS_APEX_UNIVERSO.sql');
 assert.match(sql,/stellar_grant_npc_reward_v228/);
 assert.match(sql,/p_npc_type='apexOverlord'/);
 assert.match(sql,/VALUES\s*\('apex',0\.10/);
 assert.match(sql,/\('universo',0\.10/);
 assert.match(sql,/ON CONFLICT\(user_id,kill_key\) DO NOTHING/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.stellar_grant_npc_reward_v1131/);
 assert.match(sql,/IF NOT p_owner_eligible THEN RETURN v_reward/);
 assert.match(src('server/world.js'),/\),isOwner\);/);
 assert.match(src('server/index.js'),/stellar_(?:grant_npc_reward_v1131|player_grant_npc_reward)/);
});
test('o cliente apresenta os fragmentos e envia apenas o ID e nivel ao servidor',()=>{
 const game=src('public/game.js');
 assert.match(game,/reward\.protocolFragment/);
 assert.match(game,/advancedProtocolFragmentsV1131/);
 assert.match(game,/4× N1 \+ 10 APEX/);
 assert.match(game,/runEconomyAction\(action,\{id,level:/);
});
test('ADM pode aumentar o preço dos tiers sem violar mínimos ou editar inventário',()=>{
 const s=state();for(let i=0;i<4;i++)buy(s,'hp');s.pet.advancedProtocolFragmentsV1131={apex:10,universo:0};
 const meta={craft_n2_stl:400000,craft_n3_stl:950000,craft_n3_credits:300000000};
 const quote={...row('hp'),meta};
 const price=auxProtocolTierQuoteV111('hp',2,quote);
 assert.equal(price.cost,400000);
 assert.equal(auxProtocolTierQuoteV111('hp',3,quote).creditsCost,300000000);
 assert.equal(auxProtocolTierQuoteV111('hp',2,{...row('hp'),meta:{craft_n2_stl:1}}).cost,250000);
 const server=src('server/index.js');assert.match(server,/craft_n2_stl/);assert.match(server,/craft_n3_credits/);
 assert.match(server,/stellar_aux_protocol_drop_rules_v1131/);
 assert.match(src('public/game.js'),/data-aux-drop-save/);
});
test('a compra de N1 da classe de créditos não debita STL e não exige fragmento',()=>{
 const s=state(),stl=s.profile.uridium,cr=s.profile.credits;
 buy(s,'loot');buy(s,'loot');
 assert.equal(s.profile.uridium,stl);
 assert.equal(s.profile.credits,cr-200000000);
 assert.equal(auxProtocolStockV1131(s.pet).loot[1],2);
});
