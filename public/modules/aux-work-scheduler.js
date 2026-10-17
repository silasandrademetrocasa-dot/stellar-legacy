// V20.2.7 — auxiliar; nunca cadencia combate, movimento, HP/ESC ou controles.
// Sem DOM, banco ou rede. Testável de forma determinística.
export function createAuxiliaryWorkScheduler({now=()=>performance.now()}={}){
  const last=new Map();
  function due(key,intervalMs){
    const name=String(key),value=Number(intervalMs),interval=Number.isFinite(value)?Math.max(0,value):0;
    const t=Number(now());
    if(!Number.isFinite(t))return true;
    const prior=last.get(name);
    if(interval>0&&prior!==undefined&&t>=prior&&t-prior<interval)return false;
    last.set(name,t);
    return true;
  }
  function reset(){last.clear();}
  return {due,reset};
}
