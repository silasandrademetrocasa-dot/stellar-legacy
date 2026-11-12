/** Immutable session-scoped configuration cache. Never stores balances, saves or permissions. */
export function createRuntimeReadCacheV145({ttlMs=300000,now=Date.now}={}){
 const values=new Map(),pending=new Map();let generation=0;
 return {
  async read(key,fetcher,{refresh=false}={}){
   const cached=values.get(key);
   if(!refresh&&cached&&now()-cached.at<ttlMs)return structuredClone(cached.value);
   if(pending.has(key))return structuredClone(await pending.get(key));
   const epoch=generation;
   const promise=Promise.resolve().then(fetcher);pending.set(key,promise);
   try{const value=await promise;if(epoch===generation)values.set(key,{value:structuredClone(value),at:now()});return structuredClone(value);}
   finally{if(pending.get(key)===promise)pending.delete(key);}
  },
  clear(){generation++;values.clear();pending.clear();},size:()=>values.size
 };
}
