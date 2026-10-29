/* V105 — recupera apenas aceites e progresso NÃO recompensado após uma revisão
 * econômica do servidor. Nunca mistura saldos, inventário ou missões finalizadas. */
const CATEGORIES=['daily','weekly','monthly','special'];
const copy=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const finiteProgress=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;

export function mergeUnsavedMissionProgressV105(remoteMissions, localMissions, periodForCategory){
  const next=remoteMissions&&typeof remoteMissions==='object'?copy(remoteMissions):{active:{},completed:{}};
  next.active ||= {};
  next.completed ||= {};
  const local=localMissions&&typeof localMissions==='object'?localMissions:{};
  let changed=false;
  for(const category of CATEGORIES){
    const candidate=local.active?.[category];
    if(!candidate||!candidate.id||!candidate.period||!Array.isArray(candidate.definition?.tasks))continue;
    // V107: uma conclusão 100% que AINDA não recebeu prêmio precisa sobreviver
    // à reconciliação SAVE_NPC_STALE. Conclusões antigas/pagas permanecem bloqueadas.
    const pendingComplete=candidate.complete===true&&candidate.awaitingCloudAckV107===true&&
      candidate.definition.tasks.length>0&&candidate.definition.tasks.every(t=>finiteProgress(candidate.taskProgress?.[t.id])>=Number(t.target));
    if(candidate.complete&&!pendingComplete)continue;
    if(typeof periodForCategory==='function'&&candidate.period!==periodForCategory(category))continue;
    // Se o banco já confirmou a conclusão, jamais recrie a missão nem conceda prêmio.
    if(next.completed[`${category}:${candidate.period}:${candidate.id}`])continue;
    const server=next.active[category];
    if(!server){
      // A aceitação existe só na memória do jogador: retém até confirmar no SQL.
      next.active[category]=copy(candidate);
      changed=true;
      continue;
    }
    if(server.id!==candidate.id||server.period!==candidate.period||server.complete)continue;
    const tasks=new Set(server.definition?.tasks?.map(t=>String(t.id))||[]);
    if(!tasks.size)continue;
    const mergedProgress={...(server.taskProgress||{})};
    let advanced=false;
    for(const [id,value] of Object.entries(candidate.taskProgress||{})){
      if(!tasks.has(String(id)))continue;
      const previous=finiteProgress(mergedProgress[id]);
      const current=finiteProgress(value);
      if(current>previous){mergedProgress[id]=current;advanced=true;}
    }
    if(advanced){
      server.taskProgress=mergedProgress;
      // Bônus parciais ainda não creditados: não adiciona ao saldo, só preserva o acumulador.
      const remoteBonus=server.bonus||{},localBonus=candidate.bonus||{};
      server.bonus=Object.fromEntries(['credits','uridium','xp'].map(k=>[k,Math.max(finiteProgress(remoteBonus[k]),finiteProgress(localBonus[k]))]));
      changed=true;
    }
    if(pendingComplete&&!server.complete&&
       server.definition.tasks.every(t=>finiteProgress(server.taskProgress?.[t.id])>=Number(t.target))){
      server.complete=true;server.awaitingCloudAckV107=true;changed=true;
    }
  }
  return {missions:next,changed};
}
