/**
 * V123 — one reusable request id PER pending server purchase.
 * Local storage is retry coordination ONLY, never proof of payment or ownership.
 * If response is lost, retry with same id; a successful response clears it.
 */
const REQ_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function purchaseKey(owner,catalogKey){
 const o=String(owner||''),k=String(catalogKey||'');
 if(!/^[0-9a-f-]{36}$/i.test(o)||!/^[A-Za-z0-9:_.-]{2,120}$/.test(k))throw Error('PURCHASE_KEY_INVALID');
 return `stellar-v123-purchase:${o}:${k}`;
}
export function createPurchaseRequestV123({storage=globalThis.localStorage,legacyStorage=globalThis.sessionStorage,uuid=()=>globalThis.crypto.randomUUID()}={}){
 return {
  id(owner,catalogKey){
   const key=purchaseKey(owner,catalogKey),old=storage?.getItem(key)||legacyStorage?.getItem(key);
   if(old&&REQ_RE.test(old)){storage?.setItem(key,old);return old;}
   const fresh=uuid();if(!REQ_RE.test(fresh))throw Error('PURCHASE_ID_INVALID');
   storage?.setItem(key,fresh);return fresh;
  },
  confirmed(owner,catalogKey,id){
   const key=purchaseKey(owner,catalogKey);
   if(storage?.getItem(key)===id)storage.removeItem(key);
   if(legacyStorage?.getItem(key)===id)legacyStorage.removeItem(key);
  },
  rejected(owner,catalogKey,id){
   const key=purchaseKey(owner,catalogKey);
   if(storage?.getItem(key)===id)storage.removeItem(key);
   if(legacyStorage?.getItem(key)===id)legacyStorage.removeItem(key);
  }
 };
}
export function purchaseFailureIsDefinitiveV123(err){
 const code=String(err?.code||'');
 // Stale data / timeouts / 5xx may have committed in the database.
 if(['NETWORK_OFFLINE','NETWORK_TIMEOUT','ECONOMY_STALE','PURCHASE_CONFIRMATION_UNKNOWN'].includes(code))return false;
 const status=Number(err?.status||0);
 return status>=400&&status<500&&status!==408&&status!==429&&status!==409;
}
