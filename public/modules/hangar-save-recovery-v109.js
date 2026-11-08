import {equipmentLayoutSignatureV1062} from './hangar-write-guard-v1062.js';
/* V109 — Recuperação conservadora de montagem após save econômico obsoleto.
 * Nenhum item/moeda é criado aqui; apenas reorganizamos itens JÁ possuídos,
 * e só se o multiconjunto de equipamentos não mudou no servidor. */
const copyV109 = value => value == null ? value : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
const serialV109 = value => JSON.stringify(value ?? null);
// Canonical equipment identity: slot padding, zero inventory entries and key order
// are normalization details, not another device editing the hangar.
export const equipmentFingerprintV109 = state => serialV109({
  layout:equipmentLayoutSignatureV1062(state),
  inventory:Object.entries(state?.inventory||{}).filter(([,n])=>Number(n)!==0).sort(([a],[b])=>a.localeCompare(b)),
  activeGear:state?.pet?.activeGear||'off'
});
export function equipmentRecoveryBaseV1342(state){
  const out={};
  for(const k of ['activeShipId','ownedShips','shipLoadout','inventory','combatConfigsV2013'])out[k]=copyV109(state?.[k]);
  out.drones=(state?.drones||[]).map(({id,type,slots})=>({id,type,slots:copyV109(slots)}));
  out.pet={};
  for(const k of ['owned','lasers','shields','activeGear','protocols','advancedProtocolEquippedV110'])out.pet[k]=copyV109(state?.pet?.[k]);
  return out;
}
export function submittedEquipmentConfirmedV1342(remote,submitted){
  return Boolean(submitted?.id && submitted?.snapshot && remote?.serverCheckpointReceiptV134===submitted.id &&
    equipmentLayoutSignatureV1062(remote)===equipmentLayoutSignatureV1062(submitted.snapshot));
}
// Remove only the local equipment delta before merging an ACK with ongoing combat.
// Equipment is reconciled atomically afterwards; arrays must not enter generic merge.
export function checkpointWithoutEquipmentDeltaV1342(local,submitted){
  const next=copyV109(local);
  for(const key of ['activeShipId','ownedShips','inventory','shipLoadout','combatConfigsV2013'])next[key]=copyV109(submitted[key]);
  const slots=new Map((submitted.drones||[]).map(d=>[String(d.id),d.slots]));
  next.drones=(next.drones||[]).map(d=>({...d,slots:copyV109(slots.get(String(d.id))||[])}));
  if(next.pet)for(const key of ['lasers','shields','activeGear','protocols','advancedProtocolEquippedV110'])next.pet[key]=copyV109(submitted.pet?.[key]);
  return next;
}
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
export function reconcilePendingEquipmentV109(remote,desired,baseline,submitted=null){
  // Only a server receipt plus the exact submitted layout can advance the base.
  // An HTTP success alone, or a matching client snapshot, is insufficient.
  if(submittedEquipmentConfirmedV1342(remote,submitted))baseline=submitted.snapshot;
  if(!remote||!desired||!baseline)return {ok:false,reason:'BASELINE_UNAVAILABLE'};
  if(equipmentFingerprintV109(remote)===equipmentFingerprintV109(desired))return {ok:true,alreadySaved:true,state:copyV109(remote)};
  if(shipsV109(remote)!==shipsV109(baseline)||shipsV109(desired)!==shipsV109(baseline))return {ok:false,reason:'OWNERSHIP_CHANGED'};
  if(dronesV109(remote)!==dronesV109(baseline)||dronesV109(desired)!==dronesV109(baseline))return {ok:false,reason:'DRONES_CHANGED'};
  if(Boolean(remote.pet?.owned)!==Boolean(desired.pet?.owned)||Boolean(remote.pet?.owned)!==Boolean(baseline.pet?.owned))return {ok:false,reason:'PET_CHANGED'};
  // Se outro dispositivo modificou o hangar, nao sobrescrevemos o trabalho dele.
  if(equipmentLayoutSignatureV1062(remote)!==equipmentLayoutSignatureV1062(baseline))return {ok:false,reason:'SERVER_EQUIPMENT_CHANGED'};
  if(!desired.ownedShips?.includes(desired.activeShipId))return {ok:false,reason:'SHIP_NOT_OWNED'};
  try{
    if(countsV109(desired)!==countsV109(baseline))return {ok:false,reason:'ITEM_COUNTS_CHANGED'};
  }catch{return {ok:false,reason:'INVALID_ITEM_QUANTITY'};}
  const merged=copyV109(remote);
  merged.activeShipId=desired.activeShipId;
  // Server-delivered items remain in free inventory; never copy an old total.
  const before=new Map(JSON.parse(countsV109(baseline))),after=new Map(JSON.parse(countsV109(remote)));
  merged.inventory=copyV109(desired.inventory||{});
  for(const id of new Set([...before.keys(),...after.keys()])){
    const n=Number(merged.inventory[id]||0)+(after.get(id)||0)-(before.get(id)||0);
    if(!Number.isSafeInteger(n)||n<0)return {ok:false,reason:'ITEM_COUNTS_CHANGED'};
    if(n||Object.hasOwn(desired.inventory||{},id))merged.inventory[id]=n;else delete merged.inventory[id];
  }
  merged.shipLoadout=copyV109(desired.shipLoadout);
  const desiredDrones=new Map((desired.drones||[]).map(d=>[String(d.id),d]));
  merged.drones=(merged.drones||[]).map(d=>({...d,slots:copyV109(desiredDrones.get(String(d.id))?.slots||[])}));
  if(merged.pet){merged.pet.lasers=copyV109(desired.pet?.lasers||[]);merged.pet.shields=copyV109(desired.pet?.shields||[]);merged.pet.activeGear=desired.pet?.activeGear||'off';merged.pet.protocols=copyV109(desired.pet?.protocols||{});merged.pet.advancedProtocolEquippedV110=copyV109(desired.pet?.advancedProtocolEquippedV110||{});}
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
