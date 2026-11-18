// Passive saves carry confirmed equipment; only explicit hangar intents may replace it.
import {equipmentLayoutSignatureV1062} from './hangar-write-guard-v1062.js';
export function passiveCheckpointV1465(local, baseline){
  const state=structuredClone(local);
  if(!baseline)return {state,changed:false};
  for(const k of ['accountOwnerId','adminResetEpoch']){
    if((local[k]??(k==='adminResetEpoch'?0:null))!==(baseline[k]??(k==='adminResetEpoch'?0:null)))throw Object.assign(new Error('Checkpoint de outra conta ou época.'),{code:'SAVE_SESSION_CHANGED'});
  }
  if(equipmentLayoutSignatureV1062(local)===equipmentLayoutSignatureV1062(baseline))return {state,changed:false};
  const replace=(target,key,source)=>{if(Object.hasOwn(source,key))target[key]=structuredClone(source[key]);else delete target[key];};
  for(const key of ['activeShipId','ownedShips','inventory','shipLoadout','drones','combatConfigsV2013'])replace(state,key,baseline);
  // Shield damage in each existing configuration belongs to combat, not equipment.
  for(const id of [1,2]){
    const current=local.combatConfigsV2013?.profiles?.[id],confirmed=state.combatConfigsV2013?.profiles?.[id];
    if(confirmed&&current&&Object.hasOwn(current,'shield'))confirmed.shield=current.shield;
  }
  state.pet=structuredClone(local.pet||{});
  for(const key of ['owned','lasers','shields','protocols','advancedProtocolEquippedV110','advancedProtocolsV110'])replace(state.pet,key,baseline.pet||{});
  if(equipmentLayoutSignatureV1062(state)!==equipmentLayoutSignatureV1062(baseline))throw new Error('Montagem canônica inconsistente.');
  return {state,changed:true};
}
