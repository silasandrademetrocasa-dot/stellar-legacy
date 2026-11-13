/** Purchases use canonical server stock. A whole gameplay save is not a purchase precondition. */
export function purchaseNeedsPreflightV1451({kind,pendingEquipment=false}={}){
 // A new hull, drone or AUX ownership can invalidate an unsaved equipment layout.
 return pendingEquipment&&['ship','drone','pet'].includes(String(kind||''));
}
export function createPurchaseSingleFlightV1451(){
 const pending=new Map();
 return {
  run(key,work){
   if(pending.has(key))return pending.get(key);
   const task=Promise.resolve().then(work);pending.set(key,task);
   const clear=()=>{if(pending.get(key)===task)pending.delete(key);};task.then(clear,clear);return task;
  },
  has:key=>pending.has(key)
 };
}
export function createPurchaseMetricsV1451({now=()=>performance.now(),max=40}={}){
 let entries=[];
 return {start:()=>now(),finish(start,{kind,ok,serverMs,context}={}){
   entries.push({kind:kind==='bulk'?'bulk':'catalog',ok:ok===true,clientMs:Math.max(0,Math.round(now()-start)),serverMs:Number.isFinite(serverMs)?Math.max(0,Math.round(serverMs)):null,context:context==='consolidated'?'consolidated':context==='legacy'?'legacy':'unknown'});
   entries=entries.slice(-max);
  },snapshot:()=>entries.map(x=>({...x})),clear(){entries=[];}};
}
