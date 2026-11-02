/** Persistent request IDs for retries. Do not clear on timeout: a transaction may have committed. */
export function makeAutoTradeRequestV1164({storage,identity,kind,key,randomId}={}){
 if(!identity||!['buy','sale'].includes(kind))return null;
 const suffix=encodeURIComponent(String(key||'all')).slice(0,120);
 const slot='stellar_autotrade_v1164:'+String(identity)+':'+kind+':'+suffix;
 try{
   const current=String(storage?.getItem(slot)||'');
   if(/^[A-Za-z0-9_-]{10,90}$/.test(current))return {id:current,slot};
   const candidate=String(randomId?.()||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,90);
   if(candidate.length<10)return null;
   storage?.setItem(slot,candidate);
   return {id:candidate,slot};
 }catch{return null;}
}
export function clearAutoTradeRequestV1164(storage,request){if(!request)return;try{if(storage?.getItem(request.slot)===request.id)storage.removeItem(request.slot)}catch{}}
export function autoTradeRecoveryDelayV1164(failures=1){return Math.min(300000,30000*Math.pow(2,Math.min(3,Math.max(0,Number(failures)||1)-1)));}
export function autoLaserReserveV1164(minimum,lasers=1){return Math.max(0,Math.min(1000000,Math.floor(Number(minimum)||0)*Math.max(1,Math.min(30,Math.floor(Number(lasers)||1)))));}
