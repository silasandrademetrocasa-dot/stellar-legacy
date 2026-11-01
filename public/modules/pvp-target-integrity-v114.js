/* V114.0 — validação antecipada de disparo PvP, sem substituir a RPC autoritativa. */
export const PVP_PUBLIC_MAPS_V114=Object.freeze(['b41','b42','b43']);
export function pvpShotEligibilityV114({mapId,attackerId,target,groupMember=false,now=Date.now(),maxRange=1450,attackerX,attackerY,checkRange=true}={}){
 if(!PVP_PUBLIC_MAPS_V114.includes(String(mapId||'')))return {allowed:false,reason:'sector'};
 if(!target?.isPlayer||!target.id||String(attackerId||'')===String(target.id))return {allowed:false,reason:'identity'};
 if(groupMember)return {allowed:false,reason:'group'};
 if(!(Number(target.hp)>0))return {allowed:false,reason:'dead'};
 const lastSeen=Math.max(Number(target.lastPresenceSeenAt)||0,Number(target.realtimeUpdatedAt)||0);
 if(lastSeen>0&&Number.isFinite(now)&&now-lastSeen>12000)return {allowed:false,reason:'stale'};
 if(checkRange){
  const coords=[attackerX,attackerY,target.x,target.y];
  if(!coords.every(v=>Number.isFinite(Number(v))))return {allowed:false,reason:'position'};
  const distance=Math.hypot(Number(attackerX)-Number(target.x),Number(attackerY)-Number(target.y));
  if(distance>Math.max(1,Number(maxRange)||1450))return {allowed:false,reason:'range',distance};
 }
 return {allowed:true,reason:null};
}
