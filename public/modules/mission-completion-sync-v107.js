/* V107 — Pagamento de missão somente DEPOIS do ACK de progresso salvo.
 * Essas funções só selecionam contratos. Não alteram moedas nem o banco. */
const CATEGORIES=['daily','weekly','monthly','special'];
function isPending(active,completed,category){
  if(!active||active.complete!==true||active.awaitingCloudAckV107!==true||!active.id||!active.period)return false;
  if(completed?.[`${category}:${active.period}:${active.id}`])return false;
  const tasks=active.definition?.tasks;
  return Array.isArray(tasks)&&tasks.length>0&&tasks.every(t=>Number.isFinite(Number(t.target))&&Number(t.target)>0&&
    Number(active.taskProgress?.[t.id])>=Number(t.target));
}
export function pendingMissionCategoriesV107(missions){
  return CATEGORIES.filter(category=>isPending(missions?.active?.[category],missions?.completed,category));
}
export function confirmedMissionCategoriesV107(snapshot,current){
  return pendingMissionCategoriesV107(snapshot).filter(category=>{
    const previous=snapshot?.active?.[category],live=current?.active?.[category];
    return isPending(live,current?.completed,category)&&live.id===previous.id&&live.period===previous.period;
  });
}
