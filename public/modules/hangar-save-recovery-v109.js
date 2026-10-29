/* V109 — Recuperação conservadora de montagem após save econômico obsoleto.
 * Nenhum item/moeda é criado aqui; apenas reorganizamos itens JÁ possuídos,
 * e só se o multiconjunto de equipamentos não mudou no servidor. */
const copyV109 = value => value == null ? value : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
const serialV109 = value => JSON.stringify(value ?? null);
const loadoutV109 = state => ({
  activeShipId:state?.activeShipId||null,
  ownedShips:[...(state?.ownedShips||[])].sort(),
  shipLoadout:state?.shipLoadout||null,
  inventory:state?.inventory||{},
  drones:(state?.drones||[]).map(d=>({id:String(d.id),type:d.type,slots:d.slots||[]})),
  pet:{lasers:state?.pet?.lasers||[],shields:state?.pet?.shields||[],activeGear:state?.pet?.activeGear||'off'},
  combatConfigs:state?.combatConfigsV2013?{
    shipId:state.combatConfigsV2013.shipId,
    active:state.combatConfigsV2013.active,
    profiles:Object.fromEntries([1,2].map(k=>[k,{
      shipLoadout:state.combatConfigsV2013.profiles?.[k]?.shipLoadout||{},
      droneSlots:state.combatConfigsV2013.profiles?.[k]?.droneSlots||{},
      petLoadout:state.combatConfigsV2013.profiles?.[k]?.petLoadout||{}
    }]))
  }:null
});
export const equipmentFingerprintV109 = state => serialV109(loadoutV109(state));
function countsV109(state){
  const out=new Map();
  function plus(id,n=1){if(!id)return;const key=String(id);const num=Number(n);if(!Number.isInteger(num)||num<0)throw new Error('INVALID_EQUIPMENT_QUANTITY');out.set(key,(out.get(key)||0)+num);}
  for(const [id,n] of Object.entries(state?.inventory||{}))plus(id,n);
  for(const field of ['lasers','generators','extras'])for(const id of state?.shipLoadout?.[field]||[])plus(id);
  for(const drone of state?.drones||[])for(const id of drone.slots||[])plus(id);
  for(const field of ['lasers','shields'])for(const id of state?.pet?.[field]||[])plus(id);
  return JSON.stringify([...out].filter(([,v])=>v>0).sort(([a],[b])=>a.localeCompare(b)));
}
function dronesV109(state){return JSON.stringify((state?.drones||[]).map(d=>[String(d.id),String(d.type||'')]).sort((a,b)=>a[0].localeCompare(b[0])));}
function shipsV109(state){return JSON.stringify([...(state?.ownedShips||[])].sort());}
export function reconcilePendingEquipmentV109(remote,desired,baseline){
  if(!remote||!desired||!baseline)return {ok:false,reason:'BASELINE_UNAVAILABLE'};
  if(equipmentFingerprintV109(remote)===equipmentFingerprintV109(desired))return {ok:true,alreadySaved:true,state:copyV109(remote)};
  if(shipsV109(remote)!==shipsV109(baseline)||shipsV109(desired)!==shipsV109(baseline))return {ok:false,reason:'OWNERSHIP_CHANGED'};
  if(dronesV109(remote)!==dronesV109(baseline)||dronesV109(desired)!==dronesV109(baseline))return {ok:false,reason:'DRONES_CHANGED'};
  if(Boolean(remote.pet?.owned)!==Boolean(desired.pet?.owned)||Boolean(remote.pet?.owned)!==Boolean(baseline.pet?.owned))return {ok:false,reason:'PET_CHANGED'};
  // Se outro dispositivo modificou o hangar, nao sobrescrevemos o trabalho dele.
  if(equipmentFingerprintV109(remote)!==equipmentFingerprintV109(baseline))return {ok:false,reason:'SERVER_EQUIPMENT_CHANGED'};
  if(!desired.ownedShips?.includes(desired.activeShipId))return {ok:false,reason:'SHIP_NOT_OWNED'};
  try{
    const expected=countsV109(remote);
    if(countsV109(desired)!==expected||countsV109(baseline)!==expected)return {ok:false,reason:'ITEM_COUNTS_CHANGED'};
  }catch{return {ok:false,reason:'INVALID_ITEM_QUANTITY'};}
  const merged=copyV109(remote);
  merged.activeShipId=desired.activeShipId;
  merged.inventory=copyV109(desired.inventory||{});
  merged.shipLoadout=copyV109(desired.shipLoadout);
  const desiredDrones=new Map((desired.drones||[]).map(d=>[String(d.id),d]));
  merged.drones=(merged.drones||[]).map(d=>({...d,slots:copyV109(desiredDrones.get(String(d.id))?.slots||[])}));
  if(merged.pet){merged.pet.lasers=copyV109(desired.pet?.lasers||[]);merged.pet.shields=copyV109(desired.pet?.shields||[]);merged.pet.activeGear=desired.pet?.activeGear||'off';}
  if(desired.combatConfigsV2013){
    const current=merged.combatConfigsV2013||{};
    merged.combatConfigsV2013=copyV109(desired.combatConfigsV2013);
    for(const id of [1,2])if(current.profiles?.[id]&&merged.combatConfigsV2013.profiles?.[id]){
      // Escudo nao deve ser regenerado ao restaurar uma configuracao.
      merged.combatConfigsV2013.profiles[id].shield=current.profiles[id].shield;
    }
  }
  return {ok:true,alreadySaved:false,state:merged};
}
