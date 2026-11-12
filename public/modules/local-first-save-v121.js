/**
 * Stellar Legacy V121 — Local-first journal. No privileged economy operations.
 * Purely local persistence, separate from multiplayer authority / receipts.
 * IndexedDB persists one canonical client state, 3 recovery snapshots and outbox.
 */
export const STELLAR_LOCAL_DB_V121='stellar-legacy-local-v121';
export const STELLAR_LOCAL_SCHEMA_V121=1;
const STORE='saves', CHECKS='checkpoints', OUTBOX='outbox';
const OWNER_RE=/^[0-9a-f-]{8,64}$/i;
const PRIVATE_FIELDS=new Set(['access_token','refresh_token','password','service_role','secret_key','api_key']);

function onRequest(request){return new Promise((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('INDEXEDDB_REQUEST_ERROR'));
});}
function onTransaction(tx){return new Promise((resolve,reject)=>{
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('INDEXEDDB_ABORT'));
  tx.onerror=()=>reject(tx.error||new Error('INDEXEDDB_TRANSACTION_ERROR'));
});}
function ensureOwner(owner){const s=String(owner||'');if(!OWNER_RE.test(s))throw Error('LOCAL_SAVE_OWNER_INVALID');return s;}
export function stablePublicSnapshotV121(state){
  if(!state||typeof state!=='object'||Array.isArray(state))throw Error('LOCAL_SAVE_STATE_INVALID');
  // Current game state is data, not a token container. Refuse accidental credential persistence.
  const clone=typeof structuredClone==='function'?structuredClone(state):JSON.parse(JSON.stringify(state));
  for(const key of Object.keys(clone))if(PRIVATE_FIELDS.has(key.toLowerCase()))delete clone[key];
  return clone;
}
export async function hashLocalStateV121(state){
 const bytes=new TextEncoder().encode(JSON.stringify(state));
 if(!globalThis.crypto?.subtle)throw Error('LOCAL_CRYPTO_UNAVAILABLE');
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function openLocalSaveV121({indexedDBFactory=globalThis.indexedDB,name=STELLAR_LOCAL_DB_V121}={}){
 if(!indexedDBFactory)throw Error('INDEXEDDB_NOT_SUPPORTED');
 const req=indexedDBFactory.open(name,STELLAR_LOCAL_SCHEMA_V121);
 req.onupgradeneeded=()=>{
  const db=req.result;
  if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'owner'});
  if(!db.objectStoreNames.contains(CHECKS))db.createObjectStore(CHECKS,{keyPath:'key'});
  if(!db.objectStoreNames.contains(OUTBOX)){
    const store=db.createObjectStore(OUTBOX,{keyPath:'id'});
    store.createIndex('owner','owner',{unique:false});
  }
 };
 const db=await onRequest(req);
 db.onversionchange=()=>db.close();
 return {
  close:()=>db.close(),
  async read(owner,{verify=true}={}){
   owner=ensureOwner(owner);
   const value=await onRequest(db.transaction(STORE,'readonly').objectStore(STORE).get(owner));
   if(!value)return null;
   if(verify&&value.hash!==await hashLocalStateV121(value.state))throw Error('LOCAL_SAVE_HASH_MISMATCH');
   return value;
  },
  async readRecovering(owner){
    try{const current=await this.read(owner);if(current)return current;}
    catch(error){if(error.message!=='LOCAL_SAVE_HASH_MISMATCH')throw error;}
    for(const slot of ['A','B','C']){
      try{const backup=await this.checkpoint(owner,slot);if(backup)return {...backup,recoveredFrom:slot};}
      catch(error){if(error.message!=='LOCAL_CHECKPOINT_HASH_MISMATCH')throw error;}
    }
    return null;
  },
  async checkpoint(owner,slot='A'){
    owner=ensureOwner(owner);if(!['A','B','C'].includes(slot))throw Error('CHECKPOINT_SLOT_INVALID');
    const value=await onRequest(db.transaction(CHECKS,'readonly').objectStore(CHECKS).get(owner+':'+slot));
    if(value&&value.hash!==await hashLocalStateV121(value.state))throw Error('LOCAL_CHECKPOINT_HASH_MISMATCH');
    return value||null;
  },
  async commit(owner,state,{intent=null,forceCheckpoint=false}={}){
   owner=ensureOwner(owner);
   const safeState=stablePublicSnapshotV121(state);
   if(safeState.accountOwnerId&&String(safeState.accountOwnerId)!==owner)throw Error('LOCAL_SAVE_OWNER_MISMATCH');
   const hash=await hashLocalStateV121(safeState);
   // Validate a command BEFORE opening the transaction: an invalid intent must never persist a save.
   const preparedIntent=intent?normalizeLocalIntentV121(owner,intent,0,Date.now()):null;
   const now=Date.now();
   const tx=db.transaction([STORE,CHECKS,OUTBOX],'readwrite');
   const done=onTransaction(tx);
   const saves=tx.objectStore(STORE), checks=tx.objectStore(CHECKS), outbox=tx.objectStore(OUTBOX);
   let revision=0;
   saves.get(owner).onsuccess=e=>{
     const prior=e.target.result;
     revision=Number(prior?.revision||0)+1;
     const value={owner,revision,hash,state:safeState,createdAt:now,resetEpoch:Number(safeState.adminResetEpoch)||0};
     saves.put(value);
     // A is the most recent checkpoint; B and C retain older generations.
     // Rotating on every save would triple IndexedDB writes during combat.
     const rotate=forceCheckpoint||revision===1||revision%12===0;
     if(rotate){
       checks.get(owner+':A').onsuccess=eventA=>{
         const oldA=eventA.target.result;
         checks.get(owner+':B').onsuccess=eventB=>{
           const oldB=eventB.target.result;
           if(oldB&&oldA&&revision%60===0)checks.put({...oldB,key:owner+':C',slot:'C'});
           if(oldA)checks.put({...oldA,key:owner+':B',slot:'B'});
           checks.put({...value,key:owner+':A',slot:'A'});
         };
       };
     }
     if(preparedIntent){
       // Only one pending hangar build per owner is meaningful. Preserve older
       // history as superseded (never ACK it as a server-confirmed operation).
       outbox.index('owner').getAll(owner).onsuccess=e=>{
         for(const priorIntent of (e.target.result||[])){
           if(preparedIntent.module==='hangar'&&priorIntent.module==='hangar'&&priorIntent.status==='pending'&&priorIntent.id!==preparedIntent.id)
             outbox.put({...priorIntent,status:'superseded',supersededAt:now});
         }
         outbox.get(preparedIntent.id).onsuccess=event=>{
           const existing=event.target.result;
           if(existing){
             if(existing.owner!==owner||existing.module!==preparedIntent.module||existing.action!==preparedIntent.action||JSON.stringify(existing.payload)!==JSON.stringify(preparedIntent.payload)){tx.abort();}
           }else outbox.add({...preparedIntent,revision,sequence:revision,createdAt:now});
         };
       };
     }
   };
   await done;
   return {owner,revision,hash};
  },
  async pending(owner,limit=50){
    owner=ensureOwner(owner);
    const all=await onRequest(db.transaction(OUTBOX,'readonly').objectStore(OUTBOX).index('owner').getAll(owner));
    return all.filter(r=>r.status==='pending').sort((a,b)=>a.revision-b.revision).slice(0,Math.max(1,Math.min(100,limit)));
  },
  async acknowledge(ids=[]){
    if(!Array.isArray(ids)||ids.length===0)return 0;
    const tx=db.transaction(OUTBOX,'readwrite');const done=onTransaction(tx);
    for(const id of ids){
      const store=tx.objectStore(OUTBOX);
      store.get(String(id)).onsuccess=e=>{
        const entry=e.target.result;if(entry&&entry.status==='pending')store.put({...entry,status:'acked',ackedAt:Date.now()});
      };
    }
    await done;return ids.length;
  },
  async restore(owner,slot='A'){
    const backup=await this.checkpoint(owner,slot);
    if(!backup)return null;
    // Recovery is a *new* commit, preserving the journal's monotonic revision.
    await this.commit(owner,backup.state,{forceCheckpoint:false});
    return backup.state;
  }
 };
}
function normalizeLocalIntentV121(owner,intent,revision,createdAt){
 const module=String(intent.module||'unknown').slice(0,64);
 const action=String(intent.action||'unknown').slice(0,64);
 const id=String(intent.id||crypto.randomUUID());
 if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('LOCAL_INTENT_ID_INVALID');
 // Client pending events are NEVER server economic receipts.
 return {id,owner,module,action,revision,createdAt,status:'pending',payload:stablePublicSnapshotV121(intent.payload||{}),requiresServer:!!intent.requiresServer};
}
/** 5s foreground polling; never sends whole saves or financial operations by itself. */
export function createLocalSyncLoopV121({store,owner,sendBatch,intervalMs=5000,online=()=>navigator.onLine}={}){
 let timer=null,busy=false,closed=false;
 async function tick(){
  if(busy||closed||!online()||typeof sendBatch!=='function')return {status:'skipped'};
  busy=true;
  try{
    const pending=await store.pending(owner,40);
    if(!pending.length)return {status:'empty'};
    // ACK only confirmed IDs. Server must authenticate and validate economic commands.
    const answer=await sendBatch(pending);
    const acked=Array.isArray(answer?.acceptedIds)?answer.acceptedIds.filter(id=>pending.some(p=>p.id===id)):[];
    if(acked.length)await store.acknowledge(acked);
    return {status:'sent',attempted:pending.length,accepted:acked.length};
  }finally{busy=false;}
 }
 return {start(){if(timer!==null)return;closed=false;timer=setInterval(()=>{void tick().catch(()=>{});},Math.max(1000,intervalMs));},
  stop(){closed=true;if(timer!==null){clearInterval(timer);timer=null;}},tick};
}
