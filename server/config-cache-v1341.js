// Shared configuration only. Never cache wallet, collection ownership or command receipts.
export function createConfigCacheV1341(load,{ttlMs=5000,now=Date.now}={}){
 let value,expires=0,pending;
 return async()=>{
  if(value!==undefined&&now()<expires)return value;
  if(pending)return pending;
  pending=Promise.resolve().then(load).then(result=>{value=result;expires=now()+ttlMs;return result;}).finally(()=>pending=null);
  return pending;
 };
}
