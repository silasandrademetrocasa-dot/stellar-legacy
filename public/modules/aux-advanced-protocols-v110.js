/**
 * V110 • Protocolos avançados AUX-9. Contrato único para Render e Web.
 * Propriedade e custos são SEMPRE confirmados pelo Render; o cliente só apresenta.
 * Especializações gratuitas (guard/ore/box/repair/kami) não são substituídas.
 */
export const AUX_ADVANCED_V110=Object.freeze([
  {id:'dano',label:'DANO',description:'Amplificação dos lasers do AUX-9',bonus:[0,.01,.02,.03]},
  {id:'hp',label:'HP',description:'Suporte estrutural à nave',bonus:[0,.01,.025,.05]},
  {id:'escudo',label:'ESCUDO',description:'Amplificação do escudo gerado pelo AUX',bonus:[0,.02,.04,.07]},
  {id:'loot',label:'BOX / LOOT',description:'Rendimento das caixas bônus',bonus:[0,.01,.04,.07]},
  {id:'porao',label:'PORÃO',description:'Amplificação da capacidade de carga',bonus:[0,.05,.10,.15]},
]);
export const AUX_ADVANCED_IDS_V110=Object.freeze(AUX_ADVANCED_V110.map(x=>x.id));
// V113.1: a montagem usa 4 COPIAS do tier anterior e 10 fragmentos
// da origem certa. N2 = STL, N3 = STL + CREDITOS.
export const AUX_ADVANCED_TIERS_V110=Object.freeze({
  1:{method:'buy',minLevel:1,cost:50000,currency:'uridium',ingredients:{}},
  2:{method:'craft',minLevel:8,cost:250000,currency:'uridium',creditsCost:0,ingredients:{},protocols:4,fragmentKind:'apex',fragments:10},
  3:{method:'craft',minLevel:15,cost:500000,currency:'uridium',creditsCost:180000000,ingredients:{},protocols:4,fragmentKind:'universo',fragments:10,universe:true}
});
export const AUX_FRAGMENT_KINDS_V1131=Object.freeze(['apex','universo']);
const validStackV1131=(n,cap=80)=>Number.isSafeInteger(n)&&n>=0&&n<=cap?n:0;
export function auxProtocolFragmentsV1131(raw){
  return Object.fromEntries(AUX_FRAGMENT_KINDS_V1131.map(k=>[k,validStackV1131(Number(raw?.[k]),1000000)]));
}
// Suporta propriedades antigas com apenas o maior nivel, sem dar copies extras.
export function auxProtocolStockV1131(pet){
  const previous=normalizeAuxAdvancedOwnedV110(pet?.advancedProtocolOwnedV110),raw=pet?.advancedProtocolStockV1131;
  return Object.fromEntries(AUX_ADVANCED_IDS_V110.map(id=>{
    const oldRank=previous[id],record=raw?.[id];
    return [id,Object.fromEntries([1,2,3].map(level=>[
      level,raw===undefined?(oldRank===level?1:0):validStackV1131(Number(record?.[level]??0))
    ]))];
  }));
}
export function auxProtocolMaxTierV1131(stock,id){
  return [3,2,1].find(n=>(Number(stock?.[id]?.[n])||0)>0)||0;
}
// V111: o preço N1 é POR FAMÍLIA, publicado no LIVE OPS pelo ADM.
// NUNCA aceitar valor, moeda ou classe enviados no corpo da compra.
export function auxProtocolTierQuoteV111(id,level,row){
  if(!AUX_ADVANCED_IDS_V110.includes(id))return null;
  if(level===2||level===3){
    const rule=AUX_ADVANCED_TIERS_V110[level];
    const meta=row?.kind==='aux_protocol'&&row.ref_id===id?row.meta||{}:{};
    const priceKey=level===2?'craft_n2_stl':'craft_n3_stl';
    const price=Number(meta[priceKey]);
    const validPrice=Number.isSafeInteger(price)&&price>=rule.cost&&price<=1000000000000;
    const cr=Number(meta.craft_n3_credits);
    const validCr=Number.isSafeInteger(cr)&&cr>=rule.creditsCost&&cr<=1000000000000;
    return {...rule,cost:validPrice?price:rule.cost,creditsCost:level===3&&validCr?cr:rule.creditsCost};
  }
  if(level!==1)return null;
  if(!row||row.catalog_key!==`aux_protocol:${id}`||row.kind!=='aux_protocol'||row.ref_id!==id||row.enabled===false||row.shop_visible===false)return null;
  const currency=['dano','hp','escudo'].includes(id)?'uridium':'credits';
  const price=Number(row.price),floor=currency==='uridium'?50000:100000000;
  if(row.currency!==currency||!Number.isSafeInteger(price)||price<floor||price>1000000000000)return null;
  return {method:'buy',minLevel:1,cost:price,currency,ingredients:{}};
}
export function auxAdvancedSlotsV110(level){
  const lv=Math.max(1,Math.min(20,Math.trunc(Number(level)||1)));
  return Math.min(5,1+Math.floor((lv-1)/4)); // 1/5/9/13/17: 1/2/3/4/5 slots
}
export function normalizeAuxAdvancedOwnedV110(raw){
  return Object.fromEntries(AUX_ADVANCED_IDS_V110.map(id=>{
    const n=Number(raw?.[id]);return [id,Number.isInteger(n)&&n>=0&&n<=3?n:0];
  }));
}
export function normalizeAuxAdvancedEquippedV110(raw,owned={},level=1){
  const stock=normalizeAuxAdvancedOwnedV110(owned),slots=auxAdvancedSlotsV110(level),out={};let used=0;
  for(const id of AUX_ADVANCED_IDS_V110){
    const rank=Number(raw?.[id]);
    const accepted=Number.isInteger(rank)&&rank>0&&rank<=stock[id]&&used<slots?rank:0;
    out[id]=accepted;if(accepted)used++;
  }
  return out;
}
export function auxAdvancedEffectsV110(pet){
  if(!pet?.owned)return {dano:0,hp:0,escudo:0,loot:0,porao:0};
  const ranks=normalizeAuxAdvancedEquippedV110(pet.advancedProtocolEquippedV110,pet.advancedProtocolOwnedV110,pet.level);
  return Object.fromEntries(AUX_ADVANCED_V110.map(def=>[def.id,def.bonus[ranks[def.id]]||0]));
}
// Arredondamento estocástico: nos BOX pequenos a porcentagem funciona na média,
// sem conceder 1 item garantido por cada coleta de 1 unidade.
export function auxAdvancedLootQuantityV110(amount,bonus,roll=0){
  const base=Math.max(0,Math.floor(Number(amount)||0));
  const pct=Math.max(0,Math.min(.07,Number(bonus)||0));
  const extra=Math.round(base*pct*1e9)/1e9,whole=Math.floor(extra),fraction=extra-whole;
  const r=Math.max(0,Math.min(.999999999999,Number(roll)||0));
  return base+whole+(r<fraction?1:0);
}
export function auxAdvancedSlotCountV110(pet){
  return Object.values(normalizeAuxAdvancedEquippedV110(pet?.advancedProtocolEquippedV110,pet?.advancedProtocolOwnedV110,pet?.level)).filter(Boolean).length;
}
const fail=(message,status=409)=>{const e=new Error(message);e.status=status;throw e;};
const mapAllowsUniverse=map=>['u1','u2','u3','u-1','u-2','u-3'].includes(String(map||'').toLowerCase());
export function applyAuxAdvancedActionV110(state,action,payload={},options={}){
  const pet=state?.pet;
  if(!pet?.owned)fail('Compre o AUX-9 antes de usar protocolos.');
  const id=String(payload.id||''),def=AUX_ADVANCED_V110.find(x=>x.id===id);
  if(!def)fail('Família de protocolo inválida.',400);
  // Inventario N1/N2/N3 preserva unidades individuais, sem trocar o contrato
  // antigo de maior nivel equipado entre CONF 1/2.
  const stock=auxProtocolStockV1131(pet),frags=auxProtocolFragmentsV1131(pet.advancedProtocolFragmentsV1131);
  const owned=normalizeAuxAdvancedOwnedV110(pet.advancedProtocolOwnedV110);
  pet.advancedProtocolOwnedV110=owned;
  pet.advancedProtocolEquippedV110=normalizeAuxAdvancedEquippedV110(pet.advancedProtocolEquippedV110,owned,pet.level);
  const current=auxProtocolMaxTierV1131(stock,id);
  const conf=state.combatConfigsV2013?.active===2?2:1;
  const inHomeBase=['x1','x8'].includes(String(state.mapId||'').toLowerCase())&&(!state.territoryFaction||String(state.territoryFaction)===String(state.profile?.faction||state.territoryFaction));
  if(action==='aux_protocol_equip'){
    if(!inHomeBase)fail('Equipe protocolos apenas na sua base X-1 ou X-8.');
    const level=Number(payload.level);
    if(!Number.isInteger(level)||level<0||level>current)fail('Protocolo não possuído ou nível inválido.',400);
    const equipped=normalizeAuxAdvancedEquippedV110(pet.advancedProtocolEquippedV110,owned,pet.level);
    const next={...equipped,[id]:level};
    if(Object.values(next).filter(Number).length>auxAdvancedSlotsV110(pet.level))fail('Todos os slots de protocolo estao ocupados.');
    pet.advancedProtocolEquippedV110=normalizeAuxAdvancedEquippedV110(next,owned,pet.level);
    if(state.combatConfigsV2013?.profiles?.[conf]?.petLoadout)
      state.combatConfigsV2013.profiles[conf].petLoadout.advancedProtocolsV110={...pet.advancedProtocolEquippedV110};
    return {action,id,level,conf,cost:0,slots:auxAdvancedSlotsV110(pet.level)};
  }
  if(!['aux_protocol_buy','aux_protocol_craft'].includes(action))fail('Operacao invalida.',400);
  const target=action==='aux_protocol_buy'?1:Number(payload.level??Math.min(3,current+1));
  if(!Number.isInteger(target)||target<1||target>3)fail('Nivel de fabricacao invalido.',400);
  const rule=auxProtocolTierQuoteV111(id,target,options.catalog);
  if(!rule)fail('Preço do protocolo ou regra indisponível no servidor.');
  if((action==='aux_protocol_buy')!==(rule.method==='buy'))fail('Metodo de aquisicao nao corresponde ao nivel.',400);
  if((Number(pet.level)||1)<rule.minLevel)fail(`AUX-9 precisa estar no nivel ${rule.minLevel}.`);
  if(rule.universe&&!mapAllowsUniverse(state.mapId))fail('Nivel III exige fabricacao no Universo U-1/U-2/U-3.');
  if(!rule.universe&&!inHomeBase)fail('Compre ou fabrique protocolos I/II na sua base.');
  if(stock[id][target]>=80)fail('Limite de estoque atingido para este protocolo.');
  if(target>1){
    const previous=target-1;
    if(stock[id][previous]!==Math.trunc(stock[id][previous])||stock[id][previous]<rule.protocols)
      fail(`Fabricacao N${target}: requer ${rule.protocols} protocolos N${previous} da familia ${def.label}.`);
    if(frags[rule.fragmentKind]<rule.fragments)
      fail(`Fabricacao N${target}: requer ${rule.fragments} fragmentos ${rule.fragmentKind==='apex'?'APEX':'UNIVERSO'}.`);
  }
  const wallet=Number(state.profile?.[rule.currency]),creditWallet=Number(state.profile?.credits);
  if(!Number.isSafeInteger(wallet)||wallet<rule.cost)fail('Saldo insuficiente em STL/CR para fabricar o protocolo.');
  if(rule.creditsCost&&(!Number.isSafeInteger(creditWallet)||creditWallet<rule.creditsCost))
    fail(`Fabricacao N${target}: requer ${rule.creditsCost} creditos.`);
  // Todas as verificacoes acima precedem a unica transacao de save do servidor.
  state.profile[rule.currency]=wallet-rule.cost;
  if(rule.creditsCost)state.profile.credits=creditWallet-rule.creditsCost;
  if(target>1){stock[id][target-1]-=rule.protocols;frags[rule.fragmentKind]-=rule.fragments;}
  stock[id][target]++;
  pet.advancedProtocolStockV1131=stock;
  pet.advancedProtocolFragmentsV1131=frags;
  const nextRank=auxProtocolMaxTierV1131(stock,id);
  pet.advancedProtocolOwnedV110={...owned,[id]:nextRank};
  const selected=normalizeAuxAdvancedEquippedV110(pet.advancedProtocolEquippedV110,owned,pet.level);
  if(selected[id]>0){
    selected[id]=Math.max(0,Math.min(nextRank,Math.max(selected[id],target)));
    pet.advancedProtocolEquippedV110=normalizeAuxAdvancedEquippedV110(selected,pet.advancedProtocolOwnedV110,pet.level);
    if(state.combatConfigsV2013?.profiles?.[conf]?.petLoadout)
      state.combatConfigsV2013.profiles[conf].petLoadout.advancedProtocolsV110={...pet.advancedProtocolEquippedV110};
  }
  return {action,id,level:target,conf,cost:rule.cost,currency:rule.currency,creditsCost:rule.creditsCost||0,consumed:target>1?{tier:target-1,protocols:rule.protocols,fragmentKind:rule.fragmentKind,fragments:rule.fragments}:null,stock:stock[id],fragmentsBalance:frags};
}
/** Protege a progressão paga contra falsificação no PUT /api/save.
 * O primeiro save legado só pode começar com propriedade/slots zerados.
 */
export function validateAuxAdvancedSaveV110(previous,incoming){
  const owned=normalizeAuxAdvancedOwnedV110(previous?.pet?.advancedProtocolOwnedV110);
  const from=normalizeAuxAdvancedOwnedV110(incoming?.pet?.advancedProtocolOwnedV110);
  for(const id of AUX_ADVANCED_IDS_V110)if(from[id]!==owned[id])return {ok:false,code:'SAVE_AUX_PROTOCOL_OWNERSHIP'};
  // Formato canônico obrigatório: números fracionários/negativos não se normalizam silenciosamente.
  const rawStock=incoming?.pet?.advancedProtocolStockV1131;
  if(rawStock!==undefined){
    if(!rawStock||typeof rawStock!=='object'||Array.isArray(rawStock)||Object.keys(rawStock).some(k=>!AUX_ADVANCED_IDS_V110.includes(k)))
      return {ok:false,code:'SAVE_AUX_PROTOCOL_STOCK_FORMAT'};
    for(const id of AUX_ADVANCED_IDS_V110){
      const bins=rawStock[id];if(bins===undefined)continue;
      if(!bins||typeof bins!=='object'||Array.isArray(bins)||Object.keys(bins).some(k=>!['1','2','3'].includes(k)))
        return {ok:false,code:'SAVE_AUX_PROTOCOL_STOCK_FORMAT'};
      for(const value of Object.values(bins))if(!Number.isSafeInteger(value)||value<0||value>80)
        return {ok:false,code:'SAVE_AUX_PROTOCOL_STOCK_FORMAT'};
    }
  }
  const rawFrags=incoming?.pet?.advancedProtocolFragmentsV1131;
  if(rawFrags!==undefined){
    if(!rawFrags||typeof rawFrags!=='object'||Array.isArray(rawFrags)||Object.keys(rawFrags).some(k=>!AUX_FRAGMENT_KINDS_V1131.includes(k)))
      return {ok:false,code:'SAVE_AUX_FRAGMENT_FORMAT'};
    for(const value of Object.values(rawFrags))if(!Number.isSafeInteger(value)||value<0||value>1000000)
      return {ok:false,code:'SAVE_AUX_FRAGMENT_FORMAT'};
  }
  // O navegador nunca pode inventar copias ou fragmentos de Boss/Universo.
  const expectedStock=auxProtocolStockV1131(previous?.pet),actualStock=auxProtocolStockV1131(incoming?.pet);
  for(const id of AUX_ADVANCED_IDS_V110){
    for(const tier of [1,2,3])if(actualStock[id][tier]!==expectedStock[id][tier])
      return {ok:false,code:'SAVE_AUX_PROTOCOL_STOCK'};
  }
  const expectedFrags=auxProtocolFragmentsV1131(previous?.pet?.advancedProtocolFragmentsV1131);
  const actualFrags=auxProtocolFragmentsV1131(incoming?.pet?.advancedProtocolFragmentsV1131);
  for(const kind of AUX_FRAGMENT_KINDS_V1131)if(actualFrags[kind]!==expectedFrags[kind])
    return {ok:false,code:'SAVE_AUX_FRAGMENT_FORGED'};
  const level=Number(incoming?.pet?.level)||1;
  for(const ranks of [incoming?.pet?.advancedProtocolEquippedV110,
    incoming?.combatConfigsV2013?.profiles?.[1]?.petLoadout?.advancedProtocolsV110,
    incoming?.combatConfigsV2013?.profiles?.[2]?.petLoadout?.advancedProtocolsV110]){
    if(ranks===undefined||ranks===null)continue;
    const safe=normalizeAuxAdvancedEquippedV110(ranks,owned,level);
    for(const id of AUX_ADVANCED_IDS_V110){
      const n=Number(ranks[id]??0);
      if(!Number.isInteger(n)||n!==safe[id])return {ok:false,code:'SAVE_AUX_PROTOCOL_INVALID_EQUIP'};
    }
  }
  const conf=incoming?.combatConfigsV2013?.active===2?2:1;
  const current=incoming?.pet?.advancedProtocolEquippedV110;
  const selected=incoming?.combatConfigsV2013?.profiles?.[conf]?.petLoadout?.advancedProtocolsV110;
  if(current&&selected&&AUX_ADVANCED_IDS_V110.some(id=>Number(current[id]||0)!==Number(selected[id]||0)))return {ok:false,code:'SAVE_AUX_PROTOCOL_CONF_MISMATCH'};
  return {ok:true};
}
