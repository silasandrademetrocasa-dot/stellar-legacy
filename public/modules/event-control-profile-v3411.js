// Limites defensivos dos parâmetros editáveis de ondas/recursos, sem mexer em drops.
const limits={wave_count:[1,12],min_alive:[1,12],ore_count:[1,20],wave_interval_ms:[3000,120000]};
export function eventControlProfile(base,controls={},client=false){
  const result={...base};
  if(!controls||typeof controls!=='object'||Array.isArray(controls))return result;
  const known={wave_count:'waveCount',min_alive:'minAlive',ore_count:'oreCount',wave_interval_ms:'waveRespawnMs'};
  for(const [id,key] of Object.entries(known)){
    if(controls[id]===undefined)continue;
    const n=Number(controls[id]),[min,max]=limits[id];
    if(!Number.isInteger(n)||n<min||n>max)continue;
    result[key]=id==='wave_interval_ms'&&client?n/1000:n;
  }
  return result;
}
