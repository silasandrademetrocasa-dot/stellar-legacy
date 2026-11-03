/**
 * V118 - post-transaction fleet cleanup.
 * Battle configurations are saved layouts, not additional inventory.
 * Selling one drone must remove its stable ID from both layouts, otherwise
 * the client repairs the config on hydrate and a generic save is rejected.
 */
export function syncFleetConfigsAfterDroneSaleV118(state,droneId){
  if(!state || typeof state!=='object' || !droneId)return 0;
  const profiles=state?.combatConfigsV2013?.profiles;
  if(!profiles || typeof profiles!=='object')return 0;
  let removed=0;
  for(const id of ['1','2']){
    const slots=profiles[id]?.droneSlots;
    if(!slots||typeof slots!=='object'||Array.isArray(slots))continue;
    if(Object.hasOwn(slots,String(droneId))){delete slots[String(droneId)];removed++;}
  }
  return removed;
}

/**
 * Removes only references to drone IDs which are no longer owned. Does not
 * touch real lasers, inventory, currencies, or any active drone slot.
 * Legacy sales could leave orphan blueprints in either CONF.
 */
export function pruneOrphanedDroneLayoutsV118(state){
  if(!state || !Array.isArray(state.drones))return 0;
  const owned=new Set(state.drones.map(d=>String(d?.id||'')).filter(Boolean));
  const profiles=state?.combatConfigsV2013?.profiles;
  if(!profiles||typeof profiles!=='object')return 0;
  let removed=0;
  for(const mode of ['1','2']){
    const slots=profiles[mode]?.droneSlots;
    if(!slots||typeof slots!=='object'||Array.isArray(slots))continue;
    for(const id of Object.keys(slots)){
      if(!owned.has(String(id))){delete slots[id];removed++;}
    }
  }
  // A CONF ativa deve representar os equipamentos fisicamente montados.
  // Depois de vender um drone, backups antigos podem manter uma distribuição
  // obsoleta em um drone ainda existente. saveGame() recaptura a montagem ativa,
  // então normalizar somente os IDs órfãos não basta e causa SAVE_EQUIPMENT_INTENT_REQUIRED.
  removed+=alignActiveDroneBlueprintV1181(state);
  return removed;
}

/**
 * Alinha APENAS a planta da configuração ativa com os drones reais do save.
 * Não muda nenhum slot físico, item, inventário, propriedade, moeda ou CONF
 * inativa. É idempotente e permite que o primeiro save após hidratação não
 * seja confundido com uma mutação clandestina de equipamento.
 */
export function alignActiveDroneBlueprintV1181(state){
  const configs=state?.combatConfigsV2013;
  const active=Number(configs?.active);
  const profile=(active===1||active===2)?configs?.profiles?.[active]:null;
  if(!profile||!Array.isArray(state?.drones))return 0;
  const ids=state.drones.map(d=>String(d?.id||''));
  // Um estado com IDs repetidos ou ausentes precisa de investigação, não de reparo.
  if(ids.some(id=>!id)||new Set(ids).size!==ids.length)return 0;
  const canonical=Object.fromEntries(state.drones.map(d=>[
    String(d.id),Array.isArray(d.slots)?d.slots.slice():[]
  ]));
  const current=profile.droneSlots;
  if(current&&typeof current==='object'&&!Array.isArray(current)&&
     Object.keys(canonical).length===Object.keys(current).length&&
     Object.entries(canonical).every(([id,slots])=>
       Array.isArray(current[id])&&JSON.stringify(current[id])===JSON.stringify(slots)))return 0;
  profile.droneSlots=canonical;
  return 1;
}
