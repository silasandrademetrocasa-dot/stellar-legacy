// Intent only: rewards and claimed markers always come from authoritative receipts.
export function mergePendingPassV1462(remote,local){
 const r=remote?.battlePass,l=local?.battlePass;
 if(!r||!l||r.season!==l.season||remote.accountOwnerId!==local.accountOwnerId||Number(remote.adminResetEpoch||0)!==Number(local.adminResetEpoch||0))return null;
 const pass=structuredClone(r);
 pass.points=Math.max(Number(r.points)||0,Number(l.points)||0);
 if(l.daily?.key===r.daily?.key){
  pass.daily=structuredClone(r.daily);
  pass.daily.progress||={};pass.daily.completed||={};
  for(const [key,value] of Object.entries(l.daily.progress||{}))pass.daily.progress[key]=Math.max(Number(pass.daily.progress[key])||0,Number(value)||0);
  for(const [key,value] of Object.entries(l.daily.completed||{}))if(!pass.daily.completed[key])pass.daily.completed[key]=value;
 }else if(l.daily?.key&&(!r.daily?.key||l.daily.key>r.daily.key))pass.daily=structuredClone(l.daily);
 // Never copy claimedTiers/premiumClaimedTiers from an unconfirmed device.
 return JSON.stringify(pass)===JSON.stringify(r)?null:pass;
}
export function createTaskClaimRunnerV1462({context,install,checkpoint,drain=async()=>{},changed=()=>{},wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 const pending=new Map();
 function run(key,send,{checkpointFirst=false,requireState=true}={}){
  const owner=context();if(!owner)return Promise.reject(Error('Entre na conta para resgatar.'));
  const id=owner+':'+key;if(pending.has(id))return pending.get(id);
  const current=()=>{if(context()!==owner)throw Object.assign(Error('A sessão mudou. Consulte o resgate na conta original.'),{code:'TASK_SESSION_CHANGED'});};
  const task=Promise.resolve().then(async()=>{
   let prepared=false;
   async function prepare(){await drain();current();const ok=await checkpoint();current();if(!ok)throw Object.assign(Error('Resgate pendente: aguardando o envio do progresso. Tente novamente após reconectar.'),{code:'TASK_CHECKPOINT_PENDING'});prepared=true;}
   if(checkpointFirst)await prepare();
   for(let attempt=0;attempt<3;attempt++){
    current();
    try{
     const result=await send();current();
     if(!result||result.ok===false||(requireState&&!result.state))throw Object.assign(Error('Resgate sem confirmação. Consulte novamente após reconectar.'),{code:'TASK_ACK_PENDING'});
     if(result.state)await install(result.state);current();return result;
    }catch(error){
     current();
     if(error.code==='PLAYER_REWARD_NOT_READY'&&!prepared&&attempt<2){await prepare();continue;}
     const transient=['TASK_ACK_PENDING','PLAYER_RETRY','NETWORK_TIMEOUT','NETWORK_OFFLINE'].includes(error.code)||(!error.status&&!error.code)||error.status>=500||error.status===429;
     if(!transient||attempt===2)throw error;
     await wait(400*2**attempt);
    }
   }
  }).finally(()=>{pending.delete(id);changed(key,false);});
  pending.set(id,task);changed(key,true);return task;
 }
 return {run,pending:key=>!!context()&&pending.has(context()+':'+key)};
}
