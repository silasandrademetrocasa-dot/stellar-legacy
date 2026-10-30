/* V108 — progressão de missão é monotônica no save.
 * Não cria moeda nem altera o ledger econômico; bloqueia rollback de abate,
 * apagamento de comprovantes e a emissão de recompensa ainda não confirmada.
 */
const categories=['daily','weekly','monthly','special'];
const keyFor=(category,active)=>active?.id&&active?.period?`${category}:${active.period}:${active.id}`:null;
const complete=(mission)=>{
  const tasks=mission?.definition?.tasks;
  return Array.isArray(tasks)&&tasks.length>0&&tasks.every(task=>{
    const target=Number(task.target),value=Number(mission.taskProgress?.[task.id]);
    return Number.isFinite(target)&&target>0&&Number.isFinite(value)&&value>=target;
  });
};
export function missionSaveGuardV108(previous,next){
  // A primeira gravação do personagem não tem estado anterior para comparar.
  if(!previous||!next)return null;
  const before=previous.missions||{},after=next.missions||{};
  const oldCompleted=before.completed||{},newCompleted=after.completed||{};
  for(const [key,receipt] of Object.entries(oldCompleted)){
    if(!Object.prototype.hasOwnProperty.call(newCompleted,key)||String(newCompleted[key])!==String(receipt))return 'SAVE_MISSION_STALE';
  }
  for(const category of categories){
    const old=before.active?.[category],latest=after.active?.[category];
    const oldKey=keyFor(category,old),newKey=keyFor(category,latest);
    if(oldKey&&oldKey===newKey){
      for(const task of old.definition?.tasks||[]){
        const was=Math.max(0,Number(old.taskProgress?.[task.id])||0),is=Math.max(0,Number(latest.taskProgress?.[task.id])||0);
        if(is<was)return 'SAVE_MISSION_STALE';
      }
      if(old.complete===true&&complete(old)&&!complete(latest))return 'SAVE_MISSION_STALE';
    }
    if(oldKey&&old.complete===true&&complete(old)&&oldKey!==newKey&&!newCompleted[oldKey])return 'SAVE_MISSION_STALE';
  }
  for(const key of Object.keys(newCompleted)){
    if(oldCompleted[key])continue;
    const category=key.split(':',1)[0];
    if(!categories.includes(category))return 'SAVE_MISSION_UNVERIFIED';
    const old=before.active?.[category];
    if(!old||keyFor(category,old)!==key||old.complete!==true||old.awaitingCloudAckV107!==true||!complete(old))return 'SAVE_MISSION_UNVERIFIED';
  }
  return null;
}
