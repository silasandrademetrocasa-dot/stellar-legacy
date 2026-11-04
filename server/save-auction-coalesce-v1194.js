/** In-process single-flight for the same auction settlement request. */
export function createAuctionSingleFlightV1194(){
 const pending=new Map();
 return {
  run(key,task){
   const k=String(key||'');
   if(!k||typeof task!=='function')throw Error('AUCTION_SETTLEMENT_KEY_INVALID');
   if(pending.has(k))return pending.get(k);
   // Queue via microtask to store the Promise before task starts.
   const result=Promise.resolve().then(task);
   const tracked=result.finally(()=>{if(pending.get(k)===tracked)pending.delete(k);});
   pending.set(k,tracked);
   return tracked;
  },
  size(){return pending.size;}
 };
}
export function auctionSettlementKeyV1194(userId,hourKey,lotRef){
 if(!userId||!hourKey||!lotRef)throw Error('AUCTION_SETTLEMENT_KEY_INVALID');
 return JSON.stringify([String(userId),String(hourKey),String(lotRef)]);
}
