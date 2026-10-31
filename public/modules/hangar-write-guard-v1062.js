/* V106.2 - blindagem de equipamento. Apenas mudancas EXPLICITAS do hangar
 * podem alterar a distribuicao na persistencia; o resto do save e economico. */
const list = items => Array.isArray(items) ? items.filter(Boolean).map(String) : [];
const build = b => ({
  lasers:list(b?.lasers),generators:list(b?.generators),extras:list(b?.extras)
});
const droneSlots = slots => Object.fromEntries(Object.entries(slots||{}).sort(([a],[b])=>a.localeCompare(b)).map(([id,items])=>[id,list(items)]));
const protocolKeysV1091 = ['guard','ore','box','repair','kami'];
const protocolRanksV1091 = p => Object.fromEntries(protocolKeysV1091.map(id=>[id,Math.max(0,Math.min(3,Math.trunc(Number(p?.[id])||0)))]));
const petBuild = (p,fallback=null) => ({
  lasers:list(p?.lasers),shields:list(p?.shields),
  // Mode can reset itself automatically (e.g. NOVA BURST); do not require hangar intent for that.
  protocols:protocolRanksV1091(p?.protocols??fallback?.protocols)
});
const battleProfile = (p,pet) => ({shipLoadout:build(p?.shipLoadout),droneSlots:droneSlots(p?.droneSlots),petLoadout:petBuild(p?.petLoadout,pet)});
export function equipmentLayoutSignatureV1062(state){
  if(!state||typeof state!=='object')return null;
  const c=state.combatConfigsV2013||{};
  return JSON.stringify({
    ship:String(state.activeShipId||''),
    ownedShips:[...(state.ownedShips||[])].map(String).sort(),
    shipLoadout:build(state.shipLoadout),
    drones:(state.drones||[]).map(d=>({id:String(d.id),type:String(d.type||''),slots:list(d.slots)})).sort((a,b)=>a.id.localeCompare(b.id)),
    petOwned:Boolean(state.pet?.owned),pet:petBuild(state.pet),
    confShip:String(c.shipId||''),active:Number(c.active)||1,
    configs:[battleProfile(c.profiles?.[1],state.pet),battleProfile(c.profiles?.[2],state.pet)]
  });
}
export function validateEquipmentWriteV1062(serverState,incoming,mutation){
  if(!serverState)return {ok:true,changed:true,initial:true};
  const now=equipmentLayoutSignatureV1062(serverState),next=equipmentLayoutSignatureV1062(incoming);
  if(now===next)return {ok:true,changed:false};
  if(mutation?.intent!=='hangar'||typeof mutation?.baseline!=='string')return {ok:false,code:'SAVE_EQUIPMENT_INTENT_REQUIRED'};
  if(mutation.baseline!==now)return {ok:false,code:'SAVE_EQUIPMENT_STALE'};
  return {ok:true,changed:true};
}
