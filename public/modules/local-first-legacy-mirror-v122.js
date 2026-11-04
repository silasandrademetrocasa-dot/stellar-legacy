/**
 * V122 — coalesced synchronous compatibility mirror, never economic authority.
 * IndexedDB (V121) remains the primary local save.
 * A leading write protects fresh accounts; trailing writes reduce frame stalls.
 */
export function createLegacyMirrorV122({
 write=(key,state)=>localStorage.setItem(key,JSON.stringify(state)),
 now=()=>Date.now(), schedule=(fn,ms)=>setTimeout(fn,ms), cancel=id=>clearTimeout(id),
 intervalMs=2000,onError=()=>{}
}={}){
 let nextAllowedAt=0,pending=null,timer=null;
 const interval=Math.max(250,Number(intervalMs)||2000);
 function perform(key,state){
   try{write(key,state);return true;}
   catch(e){onError(e);return false;}
 }
 function drain(){
   if(timer!==null){cancel(timer);timer=null;}
   if(!pending)return false;
   const item=pending;pending=null;
   nextAllowedAt=now()+interval;
   return perform(item.key,item.state);
 }
 function stage(key,state,{urgent=false}={}){
   if(!key||!state)return false;
   if(pending&&pending.key!==key)drain(); // avoid leaking previous account state into next owner
   pending={key,state};
   if(urgent||now()>=nextAllowedAt)return drain();
   if(timer===null)timer=schedule(()=>{timer=null;drain();},Math.max(1,nextAllowedAt-now()));
   return false;
 }
 return {stage,flush:drain,pending:()=>!!pending};
}
