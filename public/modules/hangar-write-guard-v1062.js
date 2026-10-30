/* V106.2 - blindagem de equipamento. Apenas mudancas EXPLICITAS do hangar
 * podem alterar a distribuicao na persistencia; o resto do save e economico. */
const list = items => Array.isArray(items) ? items.filter(Boolean).map(String) : [];
const build = b => ({
  lasers:list(b?.lasers),generators:list(b?.generators),extras:list(b?.extras)
});
const droneSlots = slots => Object.fromEntries(Object.entries(slots||{}).sort(([a],[b])=>a.localeCompare(b)).map(([id,items])=>[id,list(items)]));
const petBuild = p => ({lasers:list(p?.lasers),shields:list(p?.shields)});
const battleProfile = p => ({shipLoadout:build(p?.shipLoadout),droneSlots:droneSlots(p?.droneSlots),petLoadout:petBuild(p?.petLoadout)});
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
    configs:[battleProfile(c.profiles?.[1]),battleProfile(c.profiles?.[2])]
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
