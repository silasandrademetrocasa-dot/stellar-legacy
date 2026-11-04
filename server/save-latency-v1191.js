/** Monitor somente de tempo HTTP; nunca persiste dados privados nem retém saldos. */
export function createSaveLatencyMonitorV1191(limit=120){
 const buckets={GET:[],PUT:[]};
 const max=Math.max(20,Math.min(500,Math.trunc(Number(limit)||120)));
 function record(method,durationMs){
  const key=String(method||'').toUpperCase();
  if(!(key in buckets))return;
  const v=Math.max(0,Math.min(120000,Number(durationMs)||0));
  buckets[key].push(v);
  if(buckets[key].length>max)buckets[key].splice(0,buckets[key].length-max);
 }
 function summary(method){
  const arr=[...buckets[method]].sort((a,b)=>a-b);
  if(!arr.length)return {samples:0,avgMs:null,p95Ms:null,p99Ms:null};
  const pick=p=>Math.round(arr[Math.max(0,Math.ceil(p*arr.length)-1)]);
  return {samples:arr.length,avgMs:Math.round(arr.reduce((s,v)=>s+v,0)/arr.length),
   p95Ms:pick(.95),p99Ms:pick(.99)};
 }
 return {record,snapshot:()=>({read:summary('GET'),write:summary('PUT')})};
}
