/** Opt-in compatibility bridge while old HTTP/SQL writers still exist. */
import {openLocalSaveV121} from './local-first-save-v121.js';
let storePromise=null,pending=null,timeout=null,writing=Promise.resolve();
export function localFirstPilotEnabledV121(){
 try{return new URLSearchParams(location.search).get('localfirst')==='1'||localStorage.getItem('stellar_localfirst_v121')==='on';}
 catch{return false;}
}
function store(){return storePromise??=(openLocalSaveV121().catch(e=>{storePromise=null;throw e;}));}
export function stageLocalFirstSnapshotV121(owner,state){
 if(!localFirstPilotEnabledV121()||!owner||!state)return;
 pending={owner,state};
 if(timeout!==null)return;
 timeout=setTimeout(()=>{timeout=null;void flushLocalFirstSnapshotV121();},400);
}
export async function flushLocalFirstSnapshotV121(){
 if(timeout!==null){clearTimeout(timeout);timeout=null;}
 if(!pending)return writing;
 const task=pending;pending=null;
 writing=writing.catch(()=>{}).then(async()=>{
   const db=await store();await db.commit(task.owner,task.state);
 }).catch(e=>{console.warn('[localfirst-v121] cache local indisponível',e?.message||e);});
 await writing;
 if(pending)return flushLocalFirstSnapshotV121();
}
export async function readLocalFirstSnapshotV121(owner){
 if(!localFirstPilotEnabledV121()||!owner)return null;
 try{return (await (await store()).read(owner))?.state||null;}
 catch(e){console.warn('[localfirst-v121] recuperacao de cache falhou',e?.message||e);return null;}
}
export function installLocalFirstPageFlushV121(){
 if(typeof document==='undefined')return;
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void flushLocalFirstSnapshotV121();});
}
