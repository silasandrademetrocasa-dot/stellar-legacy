// V108: mantém config do mundo atualizada quando ocupada; em repouso reduz leituras no banco.
// Não altera o tick NPC, temporizadores de evento ou lógica econômica.
export function shouldRefreshWorldRuntimeV108({hasPlayers,now,lastIdleCheckAt,intervalMs=60000}={}){
 const time=Number(now), last=Number(lastIdleCheckAt),limit=Math.max(1000,Number(intervalMs)||60000);
 return hasPlayers===true || !Number.isFinite(time)||!Number.isFinite(last)||time-last>=limit || time<last;
}
