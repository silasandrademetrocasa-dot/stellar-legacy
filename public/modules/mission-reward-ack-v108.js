/* V108 — conclusão anunciada uma única vez, depois do ACK da recompensa.
 * O mapa pendente NÃO é fonte de autoridade: apenas o game_saves confirmado pelo
 * servidor pode liberar os efeitos visuais e os contadores de telemetria.
 */
export function createMissionRewardAckV108(){
  const pending=new Map();
  const announced=new Set();
  return {
    stage(key,makeDraft){
      if(typeof key!=='string'||!key||announced.has(key))return null;
      if(!pending.has(key))pending.set(key,makeDraft());
      return pending.get(key);
    },
    isPendingCategory(category){
      return [...pending.keys()].some(k=>k.startsWith(`${category}:`));
    },
    acknowledge(missions){
      const completed=missions?.completed||{};
      const accepted=[];
      for(const [key,draft] of pending){
        if(!completed[key]||announced.has(key))continue;
        pending.delete(key);announced.add(key);accepted.push(draft);
      }
      return accepted;
    },
    hasPending(key){return pending.has(key);},
    reset(){pending.clear();announced.clear();}
  };
}
