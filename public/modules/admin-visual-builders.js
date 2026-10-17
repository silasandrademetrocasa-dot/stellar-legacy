// V20.3.3 — Funções puras dos editores visuais (nenhuma ação de rede ou save).
export const ECONOMY_EFFECTS=Object.freeze([
 {key:'laser_damage_pct',label:'Dano laser (%)'},
 {key:'shield_pct',label:'Escudo (%)'},
 {key:'cargo_flat',label:'Carga (+)'},
 {key:'speed_flat',label:'Velocidade (+)'}
]);
export const CRAFT_OUTPUT_KINDS=Object.freeze([
 {key:'resource',label:'Recurso'}, {key:'ammo',label:'Munição'},
 {key:'rocket',label:'Míssil'}, {key:'repair',label:'Bônus de reparo'}
]);
const effectKeys=new Set(ECONOMY_EFFECTS.map(x=>x.key));
const outputKeys=new Set(CRAFT_OUTPUT_KINDS.map(x=>x.key));
export function normalizeEconomyEffects(entries){
 if(!Array.isArray(entries)||entries.length===0||entries.length>4)throw new Error('Escolha de 1 a 4 efeitos.');
 const result={};
 for(const {key,value} of entries){
  if(!effectKeys.has(key)||Object.hasOwn(result,key))throw new Error('Efeito inválido ou repetido.');
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>10000||String(value).trim()==='')throw new Error('Valor do efeito deve ficar entre 0 e 10.000.');
  result[key]=n;
 }
 return result;
}
export function normalizeCraftIngredients(entries,knownIds){
 if(!Array.isArray(entries)||entries.length===0||entries.length>12)throw new Error('Informe até 12 ingredientes.');
 const allowed=new Set(knownIds);const result={};
 for(const {id,qty} of entries){
  if(!id)continue;
  if(!allowed.has(id)||Object.hasOwn(result,id))throw new Error('Ingrediente inválido ou duplicado.');
  const n=Number(qty);
  if(!Number.isInteger(n)||n<1||n>1000000)throw new Error('Quantidade de ingrediente deve ser de 1 a 1.000.000.');
  result[id]=n;
 }
 if(!Object.keys(result).length)throw new Error('Adicione pelo menos um ingrediente válido.');
 return result;
}
export function normalizeCraftOutput(kind,id,qty,{resources=[],ammo=[],rockets=[]}={}){
 if(!outputKeys.has(kind))throw new Error('Tipo de recompensa inválido.');
 const allowed=kind==='resource'?resources:kind==='ammo'?ammo:kind==='rocket'?rockets:['repair'];
 const product=kind==='repair'?'repair':String(id||'');
 if(!allowed.includes(product))throw new Error('Selecione um produto existente.');
 const n=Number(qty);
 if(!Number.isInteger(n)||n<1||n>10000000)throw new Error('Quantidade produzida deve ser de 1 a 10.000.000.');
 return {kind,id:product,qty:n};
}
export function createVisualCloneId(){return '';}
export function formatCraftPreview({name='',ingredients={},grant_payload={},cost=0,currency='credits'}={},catalogs={}){
 const names={...catalogs.resources,...catalogs.ammo,...catalogs.rockets};
 const inputs=Object.entries(ingredients||{}).map(([id,qty])=>`${qty} × ${names[id]||id}`);
 const grant=grant_payload||{};
 return {title:name||'Nova receita',ingredients:inputs,output:`${grant.qty||0} × ${grant.kind==='repair'?'Bônus de reparo':names[grant.id]||grant.id||'Produto'}`,price:`${Number(cost)||0} ${currency==='uridium'?'STL':'CR'}`};
}
