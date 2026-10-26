// V72 — executa apenas o HUD completo fora da etapa crítica do requestAnimationFrame.
// Leituras rápidas de HP/escudo/alvo continuam síncronas no loop principal.
// Nunca adia atualizações explícitas disparadas por compra, combate, login ou menu.
export function createDeferredHudScheduler({
  requestIdle=(cb)=>typeof requestIdleCallback==='function'
    ? {kind:'idle',id:requestIdleCallback(cb,{timeout:350})}
    : {kind:'timer',id:setTimeout(cb,60)},
  cancelIdle=handle=>{
    if(!handle)return;
    if(handle.kind==='idle'&&typeof cancelIdleCallback==='function')cancelIdleCallback(handle.id);
    else clearTimeout(handle.id);
  },
  now=()=>performance.now(),
  onError=()=>{}
}={}){
  let handle=null, pending=false, generation=0, count=0, latestMs=null, maximumMs=0;
  function cancel(){
    generation++;
    if(handle)cancelIdle(handle);
    handle=null;pending=false;
  }
  function schedule(task){
    if(pending||typeof task!=='function')return false;
    pending=true;
    const thisGeneration=++generation;
    try{
      handle=requestIdle(()=>{
        if(thisGeneration!==generation)return;
        pending=false;handle=null;
        const start=now();
        try{task();}
        catch(error){onError(error);}
        finally{
          latestMs=Math.max(0,now()-start);
          maximumMs=Math.max(maximumMs,latestMs);
          count++;
        }
      });
      return true;
    }catch(error){pending=false;handle=null;onError(error);return false;}
  }
  return {schedule,cancel,isPending:()=>pending,snapshot:()=>({count,latestMs,maximumMs,pending})};
}
