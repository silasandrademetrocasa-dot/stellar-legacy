/** V145: event-driven orchestration of the existing single save writer. No idle polling. */
export function createForegroundSyncV122({
 flushLocal,flushRemote,hasPending,enabled=()=>true,online=()=>true,visible=()=>true,eligible=()=>true,
 intervalMs=4000,minRetryMs=5000,maxRetryMs=60000,
 now=()=>Date.now(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),events=null
}={}){
 const windowMs=Math.max(1000,Number(intervalMs)||4000);
 let timer=null,busy=false,failures=0,nextRetry=0,closed=true,dirty=false;
 function arm(delay=windowMs){
  if(closed||timer!==null||!enabled()||!eligible()||!online()||!visible())return;
  timer=schedule(()=>{timer=null;void tick();},Math.max(delay,nextRetry-now(),0));
 }
 async function tick(){
  if(closed||!enabled()||!eligible())return {status:'disabled'};
  if(busy)return {status:'busy'};
  if(!online())return {status:'offline'};
  if(!visible())return {status:'hidden'};
  if(now()<nextRetry){arm(nextRetry-now());return {status:'backoff',nextRetry};}
  if(timer!==null){cancel(timer);timer=null;}
  busy=true;dirty=false;
  try{
   if(typeof flushLocal==='function')await flushLocal();
   if(!hasPending?.())return {status:'idle'};
   const result=await flushRemote();
   if(result===false||result==='error'||result?.ok===false)throw Error('REMOTE_SAVE_NOT_CONFIRMED');
   failures=0;nextRetry=0;return {status:'confirmed'};
  }catch(error){
   failures=Math.min(8,failures+1);
   nextRetry=now()+Math.min(maxRetryMs,minRetryMs*2**(failures-1));
   dirty=true;return {status:'retry',nextRetry,reason:String(error?.code||error?.message||'SAVE_FAILED').slice(0,60)};
  }finally{busy=false;if(dirty||hasPending?.())arm();}
 }
 const resume=()=>{if(closed)return;nextRetry=0;if(hasPending?.()||dirty)arm(0);};
 return {
  start(){if(!closed)return;closed=false;events?.addEventListener?.('online',resume);if(hasPending?.())arm();},
  stop(){closed=true;if(timer!==null){cancel(timer);timer=null;}events?.removeEventListener?.('online',resume);},
  notify(){dirty=true;arm();},resume,tick,
  status:()=>({active:!closed,busy,failures,nextRetry,intervalMs:windowMs,scheduled:timer!==null})
 };
}
