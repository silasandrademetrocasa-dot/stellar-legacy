/** V119.2: runtime observability only. Never stores player, balance, payload, token or item identifiers. */
const MODULES=new Set(['save','economia','leilao','farm','missoes','hangar','combate']);
export function createSaveOperationMonitorV1192(windowSize=120){
  const max=Math.max(10,Math.min(500,Number(windowSize)||120));
  const buckets=new Map();
  const normalize=module=>MODULES.has(String(module))?String(module):'save';
  function record(module,ms,ok){
    const name=normalize(module),b=buckets.get(name)||[];
    b.push({ms:Math.max(0,Math.min(120000,Number(ms)||0)),ok:!!ok});
    if(b.length>max)b.splice(0,b.length-max);
    buckets.set(name,b);
  }
  async function measure(module,fn){
    const start=performance.now();
    try{
      const response=await fn();
      const success=!response?.error && response?.data?.ok!==false;
      record(module,performance.now()-start,success);
      return response;
    }catch(err){record(module,performance.now()-start,false);throw err;}
  }
  function snapshot(){
    const result={};
    for(const [module,rows] of buckets){
      const values=rows.map(x=>x.ms).sort((a,b)=>a-b);
      const pct=n=>Math.round(values[Math.max(0,Math.ceil(values.length*n)-1)]);
      result[module]={samples:rows.length,failures:rows.filter(x=>!x.ok).length,
        avgMs:Math.round(values.reduce((a,b)=>a+b,0)/values.length),p95Ms:pct(.95),p99Ms:pct(.99)};
    }
    return result;
  }
  return {record,measure,snapshot};
}
