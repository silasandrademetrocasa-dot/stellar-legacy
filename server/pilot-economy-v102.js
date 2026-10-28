// V102: pilot skill changes occur only on verified server saves.
// Keep this catalogue in sync with PILOT_SKILLS in public/game.js.
export const PILOT_SKILLS_SERVER_V102=Object.freeze({
  hull1: {max:2,creditBase:2000000,requires:null},
  engineering: {max:5,creditBase:3000000,requires:'hull1'},
  shieldEngineering: {max:5,creditBase:5000000,requires:'engineering'},
  evasive1: {max:2,creditBase:10000000,requires:'shieldEngineering'},
  hull2: {max:3,creditBase:20000000,requires:'evasive1'},
  shieldMechanics: {max:5,creditBase:40000000,requires:'hull2'},
  evasive2: {max:3,creditBase:80000000,requires:'shieldMechanics'},
  tactics: {max:5,creditBase:2000000,requires:null},
  logistics: {max:5,creditBase:4000000,requires:'tactics'},
  luck1: {max:2,creditBase:10000000,requires:'logistics'},
  cruelty1: {max:2,creditBase:15000000,requires:'luck1'},
  tractor1: {max:2,creditBase:20000000,requires:'cruelty1'},
  greed: {max:5,creditBase:35000000,requires:'tractor1'},
  tractor2: {max:3,creditBase:60000000,requires:'greed'},
  cruelty2: {max:3,creditBase:80000000,requires:'tractor2'},
  luck2: {max:3,creditBase:100000000,requires:'cruelty2'},
  detonation1: {max:2,creditBase:2000000,requires:null},
  explosives: {max:5,creditBase:4000000,requires:'detonation1'},
  heatSeeking: {max:5,creditBase:8000000,requires:'explosives'},
  bounty1: {max:2,creditBase:15000000,requires:'heatSeeking'},
  rocketFusion: {max:5,creditBase:25000000,requires:'bounty1'},
  alienHunter: {max:5,creditBase:40000000,requires:'rocketFusion'},
  detonation2: {max:3,creditBase:60000000,requires:'alienHunter'},
  electroOptics: {max:5,creditBase:80000000,requires:'detonation2'},
  bounty2: {max:3,creditBase:120000000,requires:'electroOptics'}
});

const safeInt=v=>Math.max(0,Math.floor(Number(v)||0));
function reject(message,status=409){throw Object.assign(new Error(message),{status});}
export function applyPilotSkillUpgradeV102(state,skillId){
  const skill=PILOT_SKILLS_SERVER_V102[String(skillId||'')];
  if(!skill)reject('Habilidade de piloto desconhecida.',400);
  const p=state.pilotBio&&typeof state.pilotBio==='object'?state.pilotBio:(state.pilotBio={});
  p.skills=p.skills&&typeof p.skills==='object'&&!Array.isArray(p.skills)?p.skills:{};
  const current=safeInt(p.skills[skillId]);
  if(current>=skill.max)reject('Habilidade já está no nível máximo.');
  if(skill.requires){
    const required=PILOT_SKILLS_SERVER_V102[skill.requires];
    const needed=required.max===5?3:required.max;
    if(safeInt(p.skills[skill.requires])<needed)reject(`Pré-requisito de ${skill.requires} insuficiente.`);
  }
  const spent=Object.entries(PILOT_SKILLS_SERVER_V102).reduce((sum,[id,definition])=>sum+Math.min(definition.max,safeInt(p.skills[id])),0);
  if(safeInt(p.totalPoints)<=spent)reject('Nenhum Ponto de Pesquisa disponível.');
  const next=current+1,cost=skill.creditBase*next;
  state.profile ||= {};
  if(safeInt(state.profile.credits)<cost)reject(`Créditos insuficientes: requer ${cost} CR.`);
  state.profile.credits=safeInt(state.profile.credits)-cost;
  p.skills[skillId]=next;
  return {action:'pilot_skill_upgrade',skill_id:skillId,level:next,cost,currency:'credits'};
}
export function applyPilotSkillResetV102(state){
  const p=state.pilotBio&&typeof state.pilotBio==='object'?state.pilotBio:(state.pilotBio={});
  p.skills=p.skills&&typeof p.skills==='object'&&!Array.isArray(p.skills)?p.skills:{};
  const spent=Object.entries(PILOT_SKILLS_SERVER_V102).reduce((sum,[id,definition])=>sum+Math.min(definition.max,safeInt(p.skills[id])),0);
  if(spent===0)reject('Nenhum ponto investido para resetar.');
  p.resetCount=safeInt(p.resetCount);
  if(p.resetCount>=40)reject('Limite de reconfigurações atingido; procure suporte.');
  const cost=1000*2**p.resetCount;
  state.profile ||= {};
  if(safeInt(state.profile.uridium)<cost)reject(`Stellarium insuficiente: requer ${cost} STL.`);
  state.profile.uridium=safeInt(state.profile.uridium)-cost;
  for(const id of Object.keys(PILOT_SKILLS_SERVER_V102))p.skills[id]=0;
  p.resetCount++;
  return {action:'pilot_skill_reset',cost,currency:'uridium',reset_count:p.resetCount};
}

const STALE_CODES=/\bSAVE_(?:NPC|ORE|ELITE|COUPON|EVENT|ECONOMY)_STALE\b/;
export function retryableEconomySaveConflictV102(error){
  return STALE_CODES.test(String(error?.message||''));
}
export async function withEconomySaveRetryV102(operation,{maxAttempts=3,delay=async()=>{}}={}){
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    try{return await operation(attempt)}
    catch(error){
      if(attempt===maxAttempts||!retryableEconomySaveConflictV102(error))throw error;
      await delay(attempt);
    }
  }
  throw new Error('Falha de sincronização econômica.');
}
