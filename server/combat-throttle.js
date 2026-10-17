// Barreira contra flooding de dano NPC: todos os valores de dano ainda passam
// pela simulação da sala, não pelo cliente. Não atribui ban por jitter/lag.
export const NPC_DAMAGE_THROTTLE=Object.freeze({minIntervalMs:75,burst:18_000_000,refillPerSecond:18_000_000,hitIdWindowMs:45_000,maxHitIds:1024});
export function admitNpcDamage(ws,{hitId,damage},now=Date.now()){
 const d=Number(damage);
 if(!Number.isFinite(d)||d<=0)return {allowed:false,reason:'damage_invalid'};
 const state=ws._npcDamageThrottle||(ws._npcDamageThrottle={at:now,lastHitAt:0,budget:NPC_DAMAGE_THROTTLE.burst,seen:new Map()});
 const elapsed=Math.max(0,Math.min(30,(now-state.at)/1000));
 state.budget=Math.min(NPC_DAMAGE_THROTTLE.burst,state.budget+elapsed*NPC_DAMAGE_THROTTLE.refillPerSecond);state.at=now;
 const key=String(hitId||'');
 // Disparo identificavel: o cliente oficial sempre envia hitId (laser/SAB/foguetes).
 if(!/^[a-zA-Z0-9_-]{1,120}$/.test(key))return {allowed:false,reason:'hit_id_invalid'};
 if(state.seen.has(key))return {allowed:false,reason:'replay'};
 if(now-state.lastHitAt<NPC_DAMAGE_THROTTLE.minIntervalMs)return {allowed:false,reason:'rate'};
 const cost=Math.min(5_000_000,d);
 if(state.budget<cost)return {allowed:false,reason:'budget'};
 state.budget-=cost;state.lastHitAt=now;
 if(key){state.seen.set(key,now);if(state.seen.size>NPC_DAMAGE_THROTTLE.maxHitIds){for(const [id,t] of state.seen){if(now-t>NPC_DAMAGE_THROTTLE.hitIdWindowMs||state.seen.size>NPC_DAMAGE_THROTTLE.maxHitIds/2)state.seen.delete(id);else break;}}}
 return {allowed:true};
}
