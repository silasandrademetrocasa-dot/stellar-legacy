// V34.2.0 - pre-carregamento progressivo para reduzir disputa de rede/decodificacao
// durante os primeiros frames. Nenhum carregamento critico passa por esta fila.
// Dependencias injetadas: modulo independente de DOM para testes.
export function createStagedAssetPreloader({request,schedule,batchSize=3}={}){
  if(typeof request!=='function'||typeof schedule!=='function')throw new TypeError('request e schedule obrigatorios');
  const max=Math.max(1,Math.min(8,Math.floor(Number(batchSize)||3)));
  let generation=0,queued=new Set(),pending=[],scheduled=false;
  function scheduleNext(){
    if(scheduled||!pending.length)return;
    scheduled=true;
    const id=generation;
    schedule(()=>{
      if(id!==generation)return;
      scheduled=false;
      let used=0;
      while(used<max&&pending.length){
        const path=pending.shift();queued.delete(path);
        try{request(path);}catch{ /* um sprite nao pode bloquear a fila */ }
        used++;
      }
      if(pending.length)scheduleNext();
    });
  }
  function enqueue(paths){
    for(const path of paths||[]){
      if(typeof path!=='string'||!path||queued.has(path))continue;
      queued.add(path);pending.push(path);
    }
    scheduleNext();
  }
  function clear(){generation++;scheduled=false;pending=[];queued.clear();}
  return {enqueue,clear,get pending(){return pending.length;}};
}
