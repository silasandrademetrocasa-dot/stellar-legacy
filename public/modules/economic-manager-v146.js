import {projectEconomicEventV146,reprojectEconomyV146} from './economy-projector-v146.js';
/** One durable outbox over the existing IndexedDB save. No HTTP checkpoint writer here. */
export function createEconomicManagerV146({store,owner,getState,applyLocal,applyRemote,send,readRemote,onStop=()=>{},flushLocal=async()=>{},notice=()=>{},online=()=>globalThis.navigator?.onLine!==false,events=globalThis.window,delayMs=4000,schedule=setTimeout,cancel=clearTimeout,locks=globalThis.navigator?.locks,prepareCollection}={}){
 let pending=[],canonical=null,enabled=false,acceptNew=false,refreshNeeded=false,timer=null,busy=false,closed=false,failures=0,serial=Promise.resolve();
 const projected=new WeakSet();
 const proofTasks=new Map();
 const exclusive=fn=>{const task=serial.then(fn,fn);serial=task.catch(()=>{});return task;};
 function prepareProof(event){
  if(proofTasks.has(event.id))return proofTasks.get(event.id);
  if(!prepareCollection)return Promise.reject(Error('COLLECTION_PROOF_PENDING'));
  const task=Promise.resolve().then(()=>prepareCollection(event)).then(async proof=>{const persisted=await store.attachEconomicProof(owner,event.id,proof);if(!persisted)throw Error('COLLECTION_PROOF_PENDING');event.body.proof=persisted;}).finally(()=>proofTasks.delete(event.id));
  proofTasks.set(event.id,task);return task;
 }
 function arm(ms=delayMs){if(!enabled||closed||timer!==null||!pending.length&&!refreshNeeded||!online())return;timer=schedule(()=>{timer=null;void flush();},ms);}
 function projectRemote(state){
  if(!enabled||projected.has(state))return state;
  if(state.accountOwnerId!==owner)throw Error('OUTBOX_OWNER_MISMATCH');
  if(!canonical||Number(state.serverStateClockV134||0)>=Number(canonical.serverStateClockV134||0))canonical=structuredClone(state);
  const result=reprojectEconomyV146(canonical,pending);projected.add(result.state);return result.state;
 }
 async function flushInner(){
  if(busy||closed||!enabled||!online()||!pending.length&&!refreshNeeded)return false;
  if(timer!==null){cancel(timer);timer=null;}
  busy=true;
  try{
   // Other tabs can have appended operations. Re-read the durable sequence before sending.
   pending=await store.economicPending(owner);
   if(!pending.length){
    // Another tab can have drained this shared outbox. Do not leave its old optimistic UI installed.
    if(readRemote){refreshNeeded=true;const latest=await readRemote();if(!closed)await exclusive(async()=>{await flushLocal();applyRemote(latest);refreshNeeded=false;});}
    return true;
   }
   // Warm up a bounded number of proofs, including queues restored from the older APK.
   // These lightweight WS observations must not delay a ready prefix or flood the socket.
   for(const event of pending.slice(0,40))if(event.kind==='collection'&&!event.body.proof&&!proofTasks.has(event.id)&&proofTasks.size<4)void prepareProof(event).catch(()=>{});
   const batch=[];
   for(const event of pending.slice(0,40)){
    if(event.kind==='collection'&&!event.body.proof){
    // Send a ready prefix instead of holding earlier events behind a later missing proof.
    if(batch.length)break;
    await prepareProof(event);
    }
    batch.push(event);
   }
   const wire=batch.map(({id,device,sequence,kind,body,expected,resetEpoch})=>({id,device,sequence,kind,body,expected,resetEpoch}));
   const answer=await send(wire);
   if(!answer?.state||!Array.isArray(answer.results)||!answer.results.length)throw Error('OUTBOX_ACK_PENDING');
   if(closed)return false;
   const results=answer.results;
   for(const r of results)if(!batch.some(e=>e.id===r.id&&e.device===r.device&&e.sequence===r.sequence)||!['confirmed','rejected'].includes(r.status))throw Error('OUTBOX_ACK_INVALID');
   const ids=new Set(results.map(r=>r.id));pending=pending.filter(e=>!ids.has(e.id));
   await exclusive(async()=>{
    // The game's existing installer preserves current ammo consumption, gear, missions and position.
    await flushLocal();applyRemote(answer.state,{rejected:results.filter(r=>r.status==='rejected').map(r=>batch.find(e=>e.id===r.id))});
    for(const r of results)notice({type:r.status,id:r.id,event:batch.find(e=>e.id===r.id),receipt:r.receipt,message:r.message,code:r.code});
    await store.settleEconomic(owner,results,getState());
   });
   failures=0;
   return true;
  }catch(error){
   pending=await store.economicPending(owner).catch(()=>pending);
   failures=Math.min(6,failures+1);notice({type:'pending',message:error.message});return false;
  }finally{busy=false;arm(failures?Math.min(60000,2000*2**failures):pending[0]?.kind==='collection'?500:delayMs);}
 }
 async function flush(){
  if(locks?.request){const result=await locks.request('stellar-economic-sync:'+owner,{ifAvailable:true},lock=>lock?flushInner():false);if(result===false)arm(1000);return result;}
  return flushInner();
 }
 const resume=()=>{if(timer!==null){cancel(timer);timer=null;}failures=0;arm(0);},leave=()=>{void flush();},hidden=()=>{if(globalThis.document?.visibilityState==='hidden')void flush();};
 return {
  async start(state,{available=false,accepting=available,installInitial=true,scheduleInitial=true}={}){
   enabled=available;acceptNew=accepting;refreshNeeded=false;closed=false;canonical=structuredClone(state);pending=await store.economicPending(owner);
   if(enabled){events?.addEventListener?.('online',resume);events?.addEventListener?.('pagehide',leave);globalThis.document?.addEventListener?.('visibilitychange',hidden);if(installInitial)applyRemote(state);if(scheduleInitial)arm(0);}
  },
  async enqueue(kind,body,preview={},expected=null){
   if(!enabled||closed||!acceptNew)throw Error('OUTBOX_NOT_ENABLED');
   return exclusive(async()=>{
    const event={id:crypto.randomUUID(),resetEpoch:Number(getState().adminResetEpoch)||0,kind,body:structuredClone(body),preview:structuredClone(preview),expected:expected?structuredClone(expected):undefined};
    const next=projectEconomicEventV146(getState(),event);await flushLocal();
    const saved=await store.commit(owner,next,{intent:{id:event.id,module:'economy-v146',action:kind,requiresServer:true,payload:{event}}});
    pending=await store.economicPending(owner);
    // Apply to current memory after local IO: combat may have consumed ammo during the commit.
    if(!closed&&kind!=='collection')applyLocal(projectEconomicEventV146(getState(),saved.event),saved.event);arm();if(kind==='economy'&&body.action==='auto_buy')void flush();return saved.event;
   });
  },
  async attachProof(id,proof){await store.attachEconomicProof(owner,id,proof);pending=await store.economicPending(owner);if(!busy){if(timer!==null){cancel(timer);timer=null;}arm(500);}},
  projectRemote,flush,
  acceptsRemote(state){return !projected.has(state)&&state?.accountOwnerId===owner&&Number(state.serverStateClockV134||0)>=Number(canonical?.serverStateClockV134||0);},
  ownershipConfirmed(kind,id){return kind==='ship'?(canonical?.ownedShips||[]).includes(id):kind==='drone'?(canonical?.drones||[]).some(d=>d.id===id):kind==='pet'?!!canonical?.pet?.owned:false;},
  stop(){closed=true;if(timer!==null){cancel(timer);timer=null;}events?.removeEventListener?.('online',resume);events?.removeEventListener?.('pagehide',leave);globalThis.document?.removeEventListener?.('visibilitychange',hidden);onStop();},
  get accepting(){return enabled&&!closed&&acceptNew;},
  get enabled(){return enabled&&!closed;},get pending(){return enabled&&(pending.length>0||refreshNeeded);},get checkpointBlocked(){return enabled&&(refreshNeeded||pending.some(e=>e.preview?.quote||e.preview?.sold));},get count(){return pending.length;},
  get pendingEvents(){return pending.map(e=>structuredClone(e));}
 };
}
