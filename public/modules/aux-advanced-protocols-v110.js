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
export const AUX_ADVANCED_TIERS_V110=Object.freeze({
  1:{method:'buy',minLevel:1,cost:1800,currency:'uridium',ingredients:{}},
  2:{method:'craft',minLevel:8,cost:3500000,currency:'credits',ingredients:{Prometid:65,Duranium:45,Promerium:4}},
  3:{method:'craft',minLevel:15,cost:16000000,currency:'credits',ingredients:{Prometid:160,Duranium:120,Promerium:18,Xenomit:8},universe:true}
});
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
export function applyAuxAdvancedActionV110(state,action,payload={}){
  const pet=state?.pet;
  if(!pet?.owned)fail('Compre o AUX-9 antes de usar protocolos.');
  const id=String(payload.id||''),def=AUX_ADVANCED_V110.find(x=>x.id===id);
  if(!def)fail('Família de protocolo inválida.',400);
  pet.advancedProtocolOwnedV110=normalizeAuxAdvancedOwnedV110(pet.advancedProtocolOwnedV110);
  pet.advancedProtocolEquippedV110=normalizeAuxAdvancedEquippedV110(pet.advancedProtocolEquippedV110,pet.advancedProtocolOwnedV110,pet.level);
  const conf=state.combatConfigsV2013?.active===2?2:1;
  const current=pet.advancedProtocolOwnedV110[id];
  const inHomeBase=['x1','x8'].includes(String(state.mapId||'').toLowerCase())&&(!state.territoryFaction||String(state.territoryFaction)===String(state.profile?.faction||state.territoryFaction));
  if(action==='aux_protocol_equip'){
    if(!inHomeBase)fail('Equipe protocolos apenas na sua base X-1 ou X-8.');
    const level=Number(payload.level);
    if(!Number.isInteger(level)||level<0||level>current)fail('Protocolo não possuído ou nível inválido.',400);
    const next={...pet.advancedProtocolEquippedV110,[id]:level};
    const selected=Object.values(next).filter(Number).length;
    if(selected>auxAdvancedSlotsV110(pet.level))fail('Todos os slots de protocolo estão ocupados.');
    pet.advancedProtocolEquippedV110=normalizeAuxAdvancedEquippedV110(next,pet.advancedProtocolOwnedV110,pet.level);
    if(state.combatConfigsV2013?.profiles?.[conf]?.petLoadout)
      state.combatConfigsV2013.profiles[conf].petLoadout.advancedProtocolsV110={...pet.advancedProtocolEquippedV110};
    return {action,id,level,conf,slots:auxAdvancedSlotsV110(pet.level),cost:0};
  }
  if(!['aux_protocol_buy','aux_protocol_craft'].includes(action))fail('Operação inválida.',400);
  if(current>=3)fail('Protocolo já alcançou o nível máximo.');
  const target=current+1,rule=AUX_ADVANCED_TIERS_V110[target];
  if(action==='aux_protocol_buy'&&rule.method!=='buy'||action==='aux_protocol_craft'&&rule.method!=='craft')fail('Método de aquisição não corresponde ao nível.',400);
  if((Number(pet.level)||1)<rule.minLevel)fail(`AUX-9 precisa estar no nível ${rule.minLevel}.`);
  if(rule.universe&&!mapAllowsUniverse(state.mapId))fail('Nível III exige fabricação no Universo U-1/U-2/U-3.');
  if(!rule.universe&&!inHomeBase)fail('Compre ou fabrique os protocolos I/II na sua base.');
  const wallet=Number(state.profile?.[rule.currency]);
  if(!Number.isSafeInteger(wallet)||wallet<rule.cost)fail('Saldo insuficiente para evoluir o protocolo.');
  for(const [res,qty] of Object.entries(rule.ingredients)){
    const have=Number(state.cargo?.[res]);
    if(!Number.isSafeInteger(have)||have<qty)fail(`Recursos insuficientes: ${res} (${qty}).`);
  }
  // Validação integral antes de gastar: nenhum passo pode falhar após iniciar a cobrança.
  state.profile[rule.currency]=wallet-rule.cost;
  for(const [res,qty] of Object.entries(rule.ingredients)){
    state.cargo[res]-=qty;if(!state.cargo[res])delete state.cargo[res];
  }
  pet.advancedProtocolOwnedV110[id]=target;
  // Atualiza a configuração ativa quando já equipado; novas famílias ficam no inventário.
  if(pet.advancedProtocolEquippedV110[id]>0){
    pet.advancedProtocolEquippedV110[id]=target;
    if(state.combatConfigsV2013?.profiles?.[conf]?.petLoadout)
      state.combatConfigsV2013.profiles[conf].petLoadout.advancedProtocolsV110={...pet.advancedProtocolEquippedV110};
  }
  return {action,id,level:target,conf,cost:rule.cost,currency:rule.currency,ingredients:{...rule.ingredients},slots:auxAdvancedSlotsV110(pet.level)};
}
/** Protege a progressão paga contra falsificação no PUT /api/save.
 * O primeiro save legado só pode começar com propriedade/slots zerados.
 */
export function validateAuxAdvancedSaveV110(previous,incoming){
  const owned=normalizeAuxAdvancedOwnedV110(previous?.pet?.advancedProtocolOwnedV110);
  const from=normalizeAuxAdvancedOwnedV110(incoming?.pet?.advancedProtocolOwnedV110);
  for(const id of AUX_ADVANCED_IDS_V110)if(from[id]!==owned[id])return {ok:false,code:'SAVE_AUX_PROTOCOL_OWNERSHIP'};
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
