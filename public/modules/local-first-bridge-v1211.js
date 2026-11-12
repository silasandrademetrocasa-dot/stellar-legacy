/**
 * Stellar Legacy V121.1 — migração gradual do save cliente para IndexedDB.
 * Um unico escritor LOCAL por owner. A economia continua 100% autoritativa no Render.
 * LocalStorage permanece apenas para compatibilidade/recuperacao de rotas legadas.
 */
import {openLocalSaveV121} from './local-first-save-v121.js';
let storePromise=null,timeout=null,writing=Promise.resolve();
const staged=new Map();
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function numberOrZero(v){return Math.max(0,Number(v)||0);}
export function localFirstPilotEnabledV121(){
 try{
   const param=new URLSearchParams(location.search).get('localfirst');
   if(param==='1')return true;
   if(param==='0')return false;
   return localStorage.getItem('stellar_localfirst_v121')!=='off'; // V121.1 ativo por padrao, opt-out de emergencia
 }catch{return true;}
}
function store(){return storePromise??=(openLocalSaveV121().catch(e=>{storePromise=null;throw e;}));}
function usable(owner,state,resetEpoch=null){
 if(!isObject(state)||!isObject(state.profile))return false;
 if(state.accountOwnerId&&String(state.accountOwnerId)!==String(owner))return false;
 if(resetEpoch!==null&&numberOrZero(state.adminResetEpoch)!==numberOrZero(resetEpoch))return false;
 const stamp=Number(state.clientSavedAt)||0;
 return stamp>=0&&stamp<=Date.now()+300000;
}
/** Cache verificado por SHA-256. Nunca promove estado local sobre uma revisao economica remota. */
export async function readBestLocalSnapshotV1211(owner,legacy=null,{resetEpoch=null,readIndexed=null}={}){
 if(!owner)return usable(owner,legacy,resetEpoch)?legacy:null;
 const fallback=usable(owner,legacy,resetEpoch)?legacy:null;
 if(!localFirstPilotEnabledV121())return fallback;
 let indexed=null;
 try{indexed=readIndexed?await readIndexed(owner):(await (await store()).readRecovering(owner))?.state||null;}
 catch(e){console.warn('[localfirst-v121.1] leitura IndexedDB',e?.message||e);}
 if(!usable(owner,indexed,resetEpoch))return fallback;
 if(!fallback)return indexed;
 return numberOrZero(indexed.clientSavedAt)>=numberOrZero(fallback.clientSavedAt)?indexed:fallback;
}
/**
 * Coalesce saves do mesmo jogador; o ultimo snapshot e o ultimo desejo de Hangar
 * substituem os anteriores ANTES do envio. Nao concede moedas/itens no cliente.
 */
export function stageLocalFirstSnapshotV121(owner,state,{intent=null}={}){
 if(!localFirstPilotEnabledV121()||!owner||!isObject(state))return;
 if(state.accountOwnerId&&String(state.accountOwnerId)!==String(owner))return;
 const prior=staged.get(owner);
 const next={owner,state,intent:intent||prior?.intent||null};
 staged.set(owner,next);
 if(timeout!==null)return;
 timeout=setTimeout(()=>{timeout=null;void flushLocalFirstSnapshotV121();},250);
}
export function stageLocalFirstHangarIntentV1211(owner,state,signature){
 if(!owner||!state)return;
 // O recibo remoto e o saveCloudSave existente, nao este ID local.
 stageLocalFirstSnapshotV121(owner,state,{intent:{
   id:crypto.randomUUID(),module:'hangar',action:'montagem_pendente',requiresServer:true,
   payload:{signature:String(signature||''),clientSavedAt:numberOrZero(state.clientSavedAt)}
 }});
}
export async function flushLocalFirstSnapshotV121(){
 if(timeout!==null){clearTimeout(timeout);timeout=null;}
 if(staged.size===0)return writing;
 const tasks=[...staged.values()];staged.clear();
 let failed=false;
 writing=writing.catch(()=>{}).then(async()=>{
   const db=await store();
   for(const item of tasks){await db.commit(item.owner,item.state,{intent:item.intent});}
 }).catch(e=>{
   failed=true;
   // Never discard a staged intent on quota/storage failure. Keep newer state if present.
   for(const item of tasks){const newer=staged.get(item.owner);staged.set(item.owner,newer?{...newer,intent:newer.intent||item.intent}:item);}
   console.warn('[localfirst-v121.1] escrita local pendente',e?.message||e);
 });
 await writing;
 // Do not recursively spin when storage is unavailable; next mutation/lifecycle event retries.
 if(!failed&&staged.size)return flushLocalFirstSnapshotV121();
}
/** Recebemos ACK somente DEPOIS do PUT legado ser confirmado no servidor. */
export function localHangarAckEligibleV1211(e,confirmedAt,signature){
 return e?.module==='hangar'&&e.action==='montagem_pendente'&&e.requiresServer===true&&
  numberOrZero(e.payload?.clientSavedAt)<=numberOrZero(confirmedAt)&&String(e.payload?.signature)===String(signature);
}
export async function acknowledgeConfirmedHangarV1211(owner,confirmedAt,signature){
 if(!localFirstPilotEnabledV121()||!owner)return 0;
 await flushLocalFirstSnapshotV121();
 try{
   const db=await store();const entries=await db.pending(owner,100);
   const ids=entries.filter(e=>localHangarAckEligibleV1211(e,confirmedAt,signature)).map(e=>e.id);
   if(ids.length)await db.acknowledge(ids);
   return ids.length;
 }catch(e){console.warn('[localfirst-v121.1] falha ao confirmar hangar local',e?.message||e);return 0;}
}
export async function readLocalFirstSnapshotV121(owner){
 return readBestLocalSnapshotV1211(owner,null);
}
export function installLocalFirstPageFlushV121(){
 if(typeof document==='undefined')return;
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void flushLocalFirstSnapshotV121();});
 window.addEventListener('pagehide',()=>{void flushLocalFirstSnapshotV121();});
}
