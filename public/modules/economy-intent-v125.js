/** Browser retry coordination; the server validates all spending and inventory. */
function stable(value){
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
 return JSON.stringify(value)??'null';
}
const VALID=/^[a-zA-Z0-9_-]{10,90}$/;
export function createEconomyIntentV125({storage=globalThis.localStorage,uuid=()=>globalThis.crypto.randomUUID()}={}){
 function key(owner,action,payload){
  if(!/^[a-f0-9-]{36}$/i.test(String(owner||''))||!/^[a-z_]{3,45}$/.test(String(action||'')))throw Error('ECONOMY_IDENTITY_INVALID');
  return `stellar-v125-economy:${owner}:${action}:${stable(payload||{})}`;
 }
 return {
  id(owner,action,payload={}){
   const k=key(owner,action,payload),old=storage?.getItem(k);
   if(old&&VALID.test(old))return old;
   const id=uuid();if(!VALID.test(id))throw Error('ECONOMY_REQUEST_ID_INVALID');
   storage?.setItem(k,id);return id;
  },
  done(owner,action,payload,id){const k=key(owner,action,payload);if(storage?.getItem(k)===id)storage.removeItem(k);},
  pending(owner,action,payload){return storage?.getItem(key(owner,action,payload))||null;}
 };
}
