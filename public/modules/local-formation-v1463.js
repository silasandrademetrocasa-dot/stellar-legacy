import {TACTICS_KEY,tacticsFor,activeConfig,validateTacticsWrite,formationFor} from './combat-tactics-v144.js';
import {mergePlayerStateV134} from './player-state-merge-v134.js';
export const LOCAL_TACTICS_INTENT_V1463='clientCombatIntentV1463';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function submittedTacticsV1463(state){
 const t=tacticsFor(state),p=t.profiles[activeConfig(state)];
 p.laser=state.selectedLaserAmmo||p.laser;p.rocket=state.selectedRocket||p.rocket;return t;
}
export function recordTacticsSubmissionV1463(current,intent,snapshot,id){
 return {...structuredClone(intent),desired:submittedTacticsV1463({...current,[TACTICS_KEY]:intent.desired}),
  submitted:{id,tactics:submittedTacticsV1463(snapshot)}};
}
export function editLocalTacticsV1463(state,confirmed,pending,edit){
 const before=submittedTacticsV1463(state),desired=structuredClone(before);edit(desired);
 const stored={...state,ownedDroneFormationsV144:confirmed?.ownedDroneFormationsV144};
 const valid=validateTacticsWrite(stored,{...stored,[TACTICS_KEY]:desired});
 if(!valid.ok)throw Error('Seleção indisponível: '+valid.code);
 if(same(before,desired))return pending;
 return {version:1,owner:state.accountOwnerId,resetEpoch:Number(state.adminResetEpoch)||0,
  base:structuredClone(pending?.base||tacticsFor(confirmed||state)),desired,
  ...(pending?.submitted?{submitted:structuredClone(pending.submitted)}:{})};
}
export function reconcileLocalTacticsV1463(remote,intent){
 if(!intent)return {intent:null,tactics:tacticsFor(remote)};
 const server=tacticsFor(remote);
 if(intent.version!==1||intent.owner!==remote.accountOwnerId||Number(intent.resetEpoch)!==Number(remote.adminResetEpoch||0))return {intent:null,tactics:server,reason:'SESSION_OR_RESET'};
 const check=validateTacticsWrite(remote,{...remote,[TACTICS_KEY]:intent.desired});
 if(!check.ok)return {intent:null,tactics:server,reason:check.code};
 if(same(server,intent.desired))return {intent:null,tactics:server};
 try{
  const ownAck=!!intent.submitted?.id&&intent.submitted.id===remote.serverCheckpointReceiptV134&&same(server,intent.submitted.tactics);
  const base=ownAck?server:intent.base;
  const desired=mergePlayerStateV134(base,intent.desired,server);
  return {intent:{...structuredClone(intent),base:server,desired,...(ownAck?{submitted:null}:{})},tactics:desired};
 }catch{return {intent:null,tactics:server,reason:'OTHER_SESSION_CHANGED'};}
}
export function localFormationIdV1463(state,confirmed,pending){
 // Only presentation/selection use this desire; online combat still uses confirmed authority.
 return formationFor({...state,ownedDroneFormationsV144:confirmed?.ownedDroneFormationsV144,
  [TACTICS_KEY]:pending?.desired||state?.[TACTICS_KEY]}).id;
}
