// Only locally collected NPC loot; authoritative ore receipts are never added here.
export function createPendingCargoV1333(){
 let gains={},markers=new Map();
 const subtract=delta=>{for(const [id,n] of Object.entries(delta)){gains[id]=Math.max(0,(gains[id]||0)-n);if(!gains[id])delete gains[id];}};
 const api={
  add(id,n){if(Number.isSafeInteger(n)&&n>0)gains[id]=(gains[id]||0)+n;},
  submit(at){if(Number.isFinite(Number(at))&&Number(at)>0&&!markers.has(Number(at)))markers.set(Number(at),{...gains});},
  acknowledge(at){const keys=[...markers.keys()].filter(k=>k<=Number(at)).sort((a,b)=>b-a);if(keys.length){const delta=markers.get(keys[0]);subtract(delta);for(const [stamp,pending] of markers)if(stamp>Number(at))for(const [id,n] of Object.entries(delta))pending[id]=Math.max(0,(pending[id]||0)-n);}for(const k of keys)markers.delete(k);},
  reconcile(state){api.acknowledge(state.clientSavedAt);if(!api.pending)return state;const next=structuredClone(state);next.cargo||={};for(const [id,n] of Object.entries(gains))next.cargo[id]=Number(next.cargo[id]||0)+n;return next;},
  reset(){gains={};markers.clear();},get pending(){return Object.keys(gains).length>0;}
 };return api;
}
export function auctionMinuteBidV1333(reserve,finalBid,date=new Date()){
 return Math.max(100000,Math.round((reserve+(finalBid-reserve)*(date.getMinutes()/60))/100000)*100000);
}
