// Combate Astral: somente bônus de dano PvE, desde que a configuração
// esteja confirmada e o ADM tenha liberado a arma para testes.
const within=(n,min,max)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):min;
export function verifiedAstralPveBonusV431(snapshot,config=1){
  if(!snapshot||![1,2].includes(Number(config)))return 0;
  const weapon=(snapshot.equipped||[]).find(row=>Number(row.config)===Number(config)&&row.slot==='weapon'&&row.code==='eclipse_lance');
  const def=(snapshot.definitions||[]).find(row=>row.code==='eclipse_lance'&&row.slot==='weapon');
  const owned=(snapshot.items||[]).find(row=>row.code==='eclipse_lance');
  if(!weapon||!def||def.combatEnabled!==true||Number(owned?.qty||0)<1)return 0;
  return within(def.proposal?.npcDamagePercent,0,4);
}
