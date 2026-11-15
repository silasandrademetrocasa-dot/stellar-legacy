/* V106: um PUT por vez. Nao modifica moedas, itens, rewards nem regras SQL.
 * Enquanto uma escrita esta em voo, pedidos adicionais se unem ao mesmo ciclo.
 * Assim que houver ACK, uma nova escrita usa o estado mais recente.
 */
export function createLatestSaveCoordinatorV106({hasPending,blocked,send,onRetry=()=>{},maxAttempts=6,revision=()=>0}={}){
  if(typeof hasPending!=='function'||typeof blocked!=='function'||typeof send!=='function')throw new TypeError('SAVE_COORDINATOR_INVALID');
  let current=null,urgent=false;
  const checkpoints=new Set();
  function acknowledge(value){for(const entry of checkpoints)if(value>=entry.revision){checkpoints.delete(entry);entry.resolve(true);}}
  // A task needs its own snapshot ACK, not a globally idle game. Later changes stay dirty.
  async function checkpoint(){
    if(blocked())return false;
    const target=revision();
    let entry;const result=new Promise(resolve=>{entry={revision:target,resolve};checkpoints.add(entry);});
    const finish=()=>{if(checkpoints.delete(entry))entry.resolve(false);};
    void flush(true).then(finish,finish);
    return result;
  }
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function flush(force=false){
    if(force)urgent=true;
    if(current)return current;
    if(blocked())return false;
    if(!hasPending()&&!urgent)return true;
    const task=(async()=>{
      for(let i=1;i<=maxAttempts;i++){
        if(blocked())return false;
        if(!urgent&&!hasPending())return true;
        urgent=false;
        let status;const sentRevision=revision();
        try{const answer=await send();status=typeof answer==='object'?answer?.status:answer;if(status==='saved')acknowledge(answer?.revision??sentRevision);}catch(error){console.warn('[save-v106] unexpected error',error);return false;}
        if(status==='error'||status===false)return false;
        if(status==='retry'){
          if(i===maxAttempts)return false;
          urgent=true;
          onRetry(i);
          // Backoff curto evita flood no Supabase quando o NPC avanca a revisao.
          await wait(Math.min(900,i*120));
        }
        // ACK confirmado. Se alteracoes novas surgiram durante a gravacao,
        // envia o snapshot MAIS RECENTE no proximo turno.
      }
      return !hasPending()&&!urgent;
    })();
    current=task;
    try{return await task;}finally{if(current===task)current=null;}
  }
  return {flush,checkpoint,get running(){return current!==null;}};
}
