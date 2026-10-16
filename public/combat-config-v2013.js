// Stellar Legacy V20.1.3 — two battle loadouts, no materialised duplicate items.
export const COMBAT_CONFIG_COOLDOWN_MS_V2013=5000;
export function captureCombatBuildV2013(shipLoadout,drones,shield=0){
  return {shipLoadout:{lasers:[...(shipLoadout?.lasers||[])],generators:[...(shipLoadout?.generators||[])],extras:[...(shipLoadout?.extras||[])]},droneSlots:Object.fromEntries((drones||[]).map(d=>[String(d.id),[...(d.slots||[])]])),shield:Math.max(0,Math.floor(Number(shield)||0))};
}
export function freshBattleConfigsV2013(loadout,drones,shield){
  const build=captureCombatBuildV2013(loadout,drones,shield);
  return {version:1,active:1,lastSwitchAt:0,profiles:{1:build,2:{...captureCombatBuildV2013(loadout,drones,0)}}};
}
export function combatConfigRemainingV2013(lastSwitchAt,now=Date.now()){
  return Math.max(0,COMBAT_CONFIG_COOLDOWN_MS_V2013-Math.max(0,now-Math.max(0,Number(lastSwitchAt)||0)));
}
export function clampStoredShieldV2013(stored,maxShield){
  return Math.min(Math.max(0,Number(maxShield)||0),Math.max(0,Math.floor(Number(stored)||0)));
}
// Only active configuration materialises items. Returning to inventory before applying the
// target lets both configurations reference the SAME owned item without duplicating it.
export function exchangeCombatBuildV2013({inventory,shipLoadout,drones,target,ship,items}){
  const stock={...(inventory||{})};
  const add=id=>{if(id)stock[id]=(stock[id]||0)+1;};
  const take=(id,predicate)=>{if(!id||!items[id]||!predicate(items[id])||(stock[id]||0)<1)return null;stock[id]--;if(!stock[id])delete stock[id];return id;};
  for(const list of [shipLoadout?.lasers,shipLoadout?.generators,shipLoadout?.extras,...(drones||[]).map(d=>d.slots)])for(const id of list||[])add(id);
  const saved=target?.shipLoadout||{};
  const result={lasers:Array(Math.max(0,ship.lasers||0)).fill(null),generators:Array(Math.max(0,ship.generators||0)).fill(null),extras:[]};
  for(const [key,predicate] of [['lasers',it=>it.type==='laser'],['generators',it=>it.type==='generator']]){
    const source=Array.isArray(saved[key])?saved[key]:[];
    result[key]=result[key].map((_,i)=>take(source[i],predicate));
  }
  // Extra slot CPU must be placed before assessing expanded capacity.
  const extraSource=Array.isArray(saved.extras)?saved.extras:[];
  let extraBonus=0,extraGroups=new Set();
  for(const id of extraSource.slice(0,Math.max(0,(ship.extras||0)+24))){
    const it=items[id];if(!it||it.type!=='extra')continue;
    if(it.exclusiveGroup&&extraGroups.has(it.exclusiveGroup))continue;
    const accepted=take(id,i=>i.type==='extra');if(!accepted)continue;
    result.extras.push(accepted);if(it.exclusiveGroup)extraGroups.add(it.exclusiveGroup);
    extraBonus=Math.max(extraBonus,Number(it.slotBonus)||0);
  }
  const capacity=Math.max(0,(ship.extras||0)+extraBonus);
  for(const id of result.extras.splice(capacity))add(id);
  while(result.extras.length<capacity)result.extras.push(null);
  const resultDrones=(drones||[]).map(d=>{
    const targetSlots=target?.droneSlots?.[String(d.id)]||[];
    return {...d,slots:(d.slots||[]).map((_,i)=>take(targetSlots[i],it=>it.type==='laser'||(it.type==='generator'&&it.subtype==='shield')))};
  });
  return {inventory:stock,shipLoadout:result,drones:resultDrones};
}
