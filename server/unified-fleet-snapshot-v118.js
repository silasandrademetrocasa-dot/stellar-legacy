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
  return removed;
}
