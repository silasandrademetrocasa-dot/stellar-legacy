// V46 progression unlock announcements and safe two-snapshot telemetry comparison.
export const PROGRESSION_MILESTONES_V460=Object.freeze({
  3:['MAPA X-2'],
  5:['MAPA X-3','MISSÕES DIÁRIAS'],
  6:['PERFIL DE PILOTO'],
  7:['MAPA X-4','MISSÕES SEMANAIS'],
  8:['CLÃ'],
  9:['MAPA X-5'],
  10:['MISSÕES MENSAIS'],
  12:['MAPA X-6','MISSÕES ESPECIAIS'],
  15:['MAPA X-7','BATALHAS GALÁCTICAS'],
  18:['MAPA X-8'],
  20:['UNIVERSO DESCONHECIDO U-1'],
  21:['UNIVERSO DESCONHECIDO U-2'],
  22:['UNIVERSO DESCONHECIDO U-3']
});
export function progressionMilestonesV460(level){
  if(!Number.isInteger(Number(level)))return [];
  return [...(PROGRESSION_MILESTONES_V460[Number(level)]||[])];
}
const METRICS=['play_seconds','kills','missions_completed','deaths','map_jumps','boxes','ore_nodes','credits_earned','credits_spent','stl_earned','stl_spent','xp_earned'];
export function summarizePlaytestV460(before,after){
  if(!before||!after)return {ok:false,reason:'snapshot_missing'};
  const delta={};
  for(const k of METRICS){
    const a=Number(before[k]),b=Number(after[k]);
    if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)return {ok:false,reason:'metric_reset_or_invalid',field:k};
    delta[k]=b-a;
  }
  if(delta.play_seconds===0)return {ok:false,reason:'no_active_playtime'};
  const oldLevel=Number(before.level),newLevel=Number(after.level),oldXp=Number(before.xp),newXp=Number(after.xp);
  if(!Number.isInteger(oldLevel)||!Number.isInteger(newLevel)||newLevel<oldLevel||![oldXp,newXp].every(Number.isFinite)||newXp<oldXp)return {ok:false,reason:'level_or_xp_reset'};
  const hours=delta.play_seconds/3600;
  return {ok:true,levelStart:oldLevel,levelEnd:newLevel,levelsGained:newLevel-oldLevel,xpDelta:newXp-oldXp,
    metrics:delta,activeHours:Math.round(hours*100)/100,
    xpPerHour:Math.round((newXp-oldXp)/hours),killsPerHour:Math.round(delta.kills/hours*10)/10,
    deathsPerHour:Math.round(delta.deaths/hours*10)/10,missionsPerHour:Math.round(delta.missions_completed/hours*10)/10,
    sourceXpGap:(newXp-oldXp)-delta.xp_earned};
}
