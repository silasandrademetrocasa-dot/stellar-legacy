import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEconomyEffects,normalizeCraftIngredients,normalizeCraftOutput,formatCraftPreview,createVisualCloneId} from '../public/modules/admin-visual-builders.js';
const catalog={resources:['Prometium','Endurium'],ammo:['lcb10'],rockets:['r310']};
test('serviços aceitam múltiplos efeitos legais',()=>assert.deepEqual(normalizeEconomyEffects([{key:'speed_flat',value:'5'},{key:'shield_pct',value:2}]),{speed_flat:5,shield_pct:2}));
test('serviços rejeitam efeitos duplicados/desconhecidos',()=>{
 assert.throws(()=>normalizeEconomyEffects([{key:'speed_flat',value:1},{key:'speed_flat',value:3}]),/repetido/);
 assert.throws(()=>normalizeEconomyEffects([{key:'sql',value:1}]),/inválido/);
 assert.throws(()=>normalizeEconomyEffects([{key:'speed_flat',value:Infinity}]),/Valor/);
});
test('ingredientes preservam objetos de ids legados',()=>assert.deepEqual(normalizeCraftIngredients([{id:'Prometium',qty:12},{id:'Endurium',qty:5}],catalog.resources),{Prometium:12,Endurium:5}));
test('ingredientes não aceitam valores ou recursos inválidos',()=>{
 assert.throws(()=>normalizeCraftIngredients([{id:'Prometium',qty:0}],catalog.resources),/Quantidade/);
 assert.throws(()=>normalizeCraftIngredients([{id:'Xenomit',qty:1}],catalog.resources),/inválido/);
 assert.throws(()=>normalizeCraftIngredients([{id:'Prometium',qty:2},{id:'Prometium',qty:2}],catalog.resources),/duplicado/);
});
test('saída visual suporta 4 tipos do backend',()=>{
 assert.deepEqual(normalizeCraftOutput('ammo','lcb10','1500',catalog),{kind:'ammo',id:'lcb10',qty:1500});
 assert.deepEqual(normalizeCraftOutput('repair','',1,catalog),{kind:'repair',id:'repair',qty:1});
 assert.throws(()=>normalizeCraftOutput('rocket','lcb10',1,catalog),/produto/);
});
test('prévia não altera dados e exibe recursos legíveis',()=>{
 const draft={name:'Refinaria',ingredients:{Prometium:5},grant_payload:{kind:'resource',id:'Endurium',qty:2},cost:300,currency:'credits'};
 const p=formatCraftPreview(draft,{resources:{Prometium:'Ferron',Endurium:'Cryon'}});
 assert.deepEqual(p.ingredients,['5 × Ferron']);assert.equal(p.output,'2 × Cryon');assert.equal(p.price,'300 CR');
 assert.equal(draft.ingredients.Prometium,5);
});
test('duplicação exige ID novo, nunca herda identificador',()=>assert.equal(createVisualCloneId(),''));
