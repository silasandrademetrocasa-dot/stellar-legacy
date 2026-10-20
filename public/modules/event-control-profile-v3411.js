// Limites defensivos dos parâmetros editáveis de ondas/recursos, sem mexer em drops.
const limits={wave_count:[1,12],min_alive:[1,12],ore_count:[1,20],wave_interval_ms:[3000,120000],phase_count:[1,4],wave_growth:[0,3],elite_patrols:[0,2],boss_escorts:[0,3],ore_growth:[0,8],convoy_speed_pct:[80,140]};
export function eventControlProfile(base,controls={},client=false){
  const result={...base};
  if(!controls||typeof controls!=='object'||Array.isArray(controls))return result;
  const known={wave_count:'waveCount',min_alive:'minAlive',ore_count:'oreCount',wave_interval_ms:'waveRespawnMs',phase_count:'phaseCount',wave_growth:'waveGrowth',elite_patrols:'elitePatrols',boss_escorts:'bossEscorts',ore_growth:'oreGrowth',convoy_speed_pct:'convoySpeedPct'};
  for(const [id,key] of Object.entries(known)){
    if(controls[id]===undefined)continue;
    const n=Number(controls[id]),[min,max]=limits[id];
    if(!Number.isInteger(n)||n<min||n>max)continue;
    result[key]=id==='wave_interval_ms'&&client?n/1000:n;
  }
  return result;
}
