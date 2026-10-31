/* V106.9 — entrega NPC determinística. A fila ordena eventos de um mesmo
 * primeiro atacante; a recuperação refaz o mesmo kill_key idempotente. */
export function createNpcDeathSequenceV1069(){
  const tails=new Map();
  return {
    run(ownerId,work){
      if(typeof work!=='function')throw new TypeError('NPC_SEQUENCE_WORK_REQUIRED');
      const key=String(ownerId||'').trim();
      if(!key)throw new TypeError('NPC_SEQUENCE_OWNER_REQUIRED');
      const previous=tails.get(key)||Promise.resolve();
      const result=previous.catch(()=>{}).then(work);
      const tail=result.catch(()=>{});
      tails.set(key,tail);
      void tail.then(()=>{if(tails.get(key)===tail)tails.delete(key);});
      return result;
    },
    get pendingOwners(){return tails.size;}
  };
}
const transient=/statement timeout|timed out|timeout|econnreset|etimedout|fetch failed|network error|connection terminated|socket hang up|connection closed|gateway timeout/i;
export function isTransientNpcRewardFailureV1069(error){
  const message=String(error?.message||error||'');
  return transient.test(message)&&!/(?:NPC_REWARD_INVALID|NPC_REWARD_BALANCE_LIMIT|OFFLINE_FARM|permission denied|forbidden)/i.test(message);
}
export async function grantNpcRewardSafelyV1069({grant,readReceipt,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
  if(typeof grant!=='function'||typeof readReceipt!=='function')throw new TypeError('NPC_REWARD_RETRY_INVALID');
  try{return await grant();}
  catch(error){
    if(!isTransientNpcRewardFailureV1069(error))throw error;
    await sleep(220);
    // The underlying SQL enforces UNIQUE(user_id,kill_key). Retrying cannot
    // pay a second time, even when the first RPC committed before timeout.
    const retried=await grant();
    if(retried?.granted!==false)return retried;
    // A lost ACK still means the SAME event was paid. Return the original
    // ledger values to the in-memory client, never 0 or an invented amount.
    const receipt=await readReceipt();
    const credits=Number(receipt?.credits),stl=Number(receipt?.stl);
    if(!Number.isSafeInteger(credits)||!Number.isSafeInteger(stl)||credits<0||stl<0)
      throw new Error('NPC_REWARD_RECOVERY_RECEIPT_MISSING');
    return {...retried,granted:true,credits,stl,recoveredAfterTimeout:true};
  }
}
