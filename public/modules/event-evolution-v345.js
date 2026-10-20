// V34.5.0 — Event phases are derived from authoritative schedule timestamps.
// Stage progression changes encounter composition, NEVER personal goals or SQL rewards.
const LIMIT=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Math.floor(Number(n)))):fallback;
export const EVENT_STAGE_NAMES=Object.freeze(['RECONHECIMENTO','REFORÇOS','ELITE','CONFRONTO FINAL']);
export function eventStage(event,now=Date.now(),count=4){
  const stages=LIMIT(count,1,4,4),start=Number(event?.start),end=Number(event?.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return {index:0,number:1,total:stages,label:EVENT_STAGE_NAMES[0],progress:0};
  const t=Math.max(0,Math.min(1,(now-start)/(end-start)));
  const index=Math.min(stages-1,Math.floor(t*stages));
  return {index,number:index+1,total:stages,label:EVENT_STAGE_NAMES[index===0?0:index===stages-1?3:Math.min(2,Math.floor(index*4/stages))],progress:Math.round(t*100)};
}
export function eventStageTuning(profile,stage){
  const i=LIMIT(stage?.index,0,3,0);
  return {
    waveTarget:Math.min(12,Math.max(1,Number(profile?.waveCount)||6)+i*LIMIT(profile?.waveGrowth,0,3,1)),
    oreTarget:Math.min(28,Math.max(1,Number(profile?.oreCount)||12)+i*LIMIT(profile?.oreGrowth,0,8,2)),
    eliteCount:i>=1?Math.min(2,LIMIT(profile?.elitePatrols,0,2,1)):0,
    convoySpeedScale:1+i*(LIMIT(profile?.convoySpeedPct,80,140,110)-100)/300,
    bossEscortCount:Math.min(3,LIMIT(profile?.bossEscorts,0,3,2)),
    stageIndex:i
  };
}
export function bossCombatTuning(eventId,phase){
 const stage=LIMIT(phase,0,2,0),titan=String(eventId||'').includes('titan');
 return {speed:titan?[1,1.10,1.24][stage]:[1,1.16,1.36][stage],damage:titan?[1,1.28,1.55][stage]:[1,1.20,1.48][stage],attackDelay:titan?[1,.92,.78][stage]:[1,.88,.70][stage]};
}
