/**
 * Stellar Legacy V122 — foreground orchestration, NOT a second save writer.
 * The V106 single-flight coordinator owns HTTP saves, Render owns economic state.
 * Only dirty, authenticated, foreground clients attempt a remote sync.
 */
export function createForegroundSyncV122({
  flushLocal, flushRemote, hasPending,
  enabled=()=>true, online=()=>true, visible=()=>true, eligible=()=>true,
  intervalMs=5000, minRetryMs=5000, maxRetryMs=60000,
  now=()=>Date.now(), schedule=(fn,ms)=>setInterval(fn,ms), cancel=id=>clearInterval(id),
  events=null
}={}){
  const pollMs=Math.max(1000,Number(intervalMs)||5000);
  let timer=null,busy=false,nextRetry=0,failures=0,closed=true;
  const listeners=[];
  async function tick(){
    if(closed||!enabled()||!eligible())return {status:'disabled'};
    if(busy)return {status:'busy'};
    if(!online())return {status:'offline'};
    if(!visible())return {status:'hidden'};
    if(now()<nextRetry)return {status:'backoff',nextRetry};
    busy=true;
    try{
      // IndexedDB flush is best-effort; localStorage fallback persists independently.
      if(typeof flushLocal==='function')await flushLocal();
      if(typeof hasPending!=='function'||!hasPending())return {status:'idle'};
      const result=await flushRemote();
      if(result===false||result==='error'||result?.ok===false)throw Error('REMOTE_SAVE_NOT_CONFIRMED');
      failures=0;nextRetry=0;
      return {status:'confirmed'};
    }catch(error){
      failures=Math.min(8,failures+1);
      nextRetry=now()+Math.min(maxRetryMs,Math.max(minRetryMs,minRetryMs*2**(failures-1)));
      return {status:'retry',nextRetry,reason:String(error?.code||error?.message||'SAVE_FAILED').slice(0,60)};
    }finally{busy=false;}
  }
  const onResume=()=>{if(closed)return;nextRetry=0;void tick();};
  return {
    start(){
      if(timer!==null)return;
      closed=false;
      timer=schedule(()=>{void tick();},pollMs);
      if(events?.addEventListener){
        events.addEventListener('online',onResume);
        listeners.push(['online',onResume]);
      }
      // Call resume() from document visibility handler rather than touching window globals.
    },
    stop(){closed=true;if(timer!==null){cancel(timer);timer=null;}if(events?.removeEventListener)for(const [name,fn] of listeners.splice(0))events.removeEventListener(name,fn);},
    resume:onResume,tick,
    status(){return {active:!closed,busy,failures,nextRetry,intervalMs:pollMs};}
  };
}
