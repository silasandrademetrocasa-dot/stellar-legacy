/** V86: normalized, read-only economy snapshot. Never credits or changes saves. */
export function safeFarmEconomySnapshot(state,updatedAt=null){
 const p=state?.profile||{};
 const safe=(n)=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
 return Object.freeze({credits:safe(p.credits),stl:safe(p.uridium),xp:safe(p.xp),level:Math.max(1,safe(p.level)),
   serverPurchaseRevision:safe(state?.serverPurchaseRevision),
   serverNpcRewardRevision:safe(state?.serverNpcRewardRevision),updatedAt:updatedAt||null});
}
