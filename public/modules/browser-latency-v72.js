// V72 — diagnóstico OPT-IN das pausas FORA do draw()/update().
// Long Tasks são reportadas apenas em navegadores compatíveis; ausência ≠ nenhuma tarefa.
const WINDOW=120;
const pct=(values,p)=>{
  if(!values.length)return null;
  const copy=[...values].sort((a,b)=>a-b);
  return copy[Math.min(copy.length-1,Math.ceil(copy.length*p)-1)];
};
export function createBrowserLatencyDiagnostics({
  now=()=>performance.now(),
  setIntervalFn=(fn,ms)=>setInterval(fn,ms),
  clearIntervalFn=id=>clearInterval(id),
  observerFactory=(cb)=>typeof PerformanceObserver==='function'?new PerformanceObserver(cb):null,
  isVisible=()=>typeof document==='undefined'||document.visibilityState==='visible'
}={}){
  let timer=null,observer=null,enabled=false,expected=null,longTaskSupported=false;
  const drifts=[],tasks=[];
  function push(a,value){a.push(value);if(a.length>WINDOW)a.shift();}
  function stop(){
    enabled=false;
    if(timer!==null)clearIntervalFn(timer);
    timer=null;expected=null;
    if(observer){try{observer.disconnect();}catch{}}
    observer=null;
  }
  function clear(){drifts.length=0;tasks.length=0;expected=null;}
  function noteLongTask(duration){if(enabled&&Number.isFinite(duration)&&duration>=50)push(tasks,duration);}
  function noteClock(at=now()){
    if(!enabled)return;
    if(!isVisible()){expected=at+500;return;}
    if(expected!==null){
      const drift=at-expected;
      if(drift>=0&&drift<2000)push(drifts,drift);
    }
    expected=at+500;
  }
  function start(){
    if(enabled)return;
    enabled=true;clear();
    const at=now();expected=at+500;
    timer=setIntervalFn(()=>noteClock(),500);
    try{
      observer=observerFactory(list=>{
        if(!enabled||!isVisible())return;
        for(const entry of list.getEntries())noteLongTask(entry.duration);
      });
      if(observer){
        observer.observe({entryTypes:['longtask']});
        longTaskSupported=true;
      }
    }catch{observer=null;longTaskSupported=false;}
  }
  return {
    start,stop,clear,noteClock,noteLongTask,isEnabled:()=>enabled,
    snapshot:()=>({enabled,longTaskSupported,longTaskCount:tasks.length,longTaskP95Ms:pct(tasks,.95),longTaskMaxMs:tasks.length?Math.max(...tasks):null,driftCount:drifts.length,driftP95Ms:pct(drifts,.95),driftMaxMs:drifts.length?Math.max(...drifts):null})
  };
}
