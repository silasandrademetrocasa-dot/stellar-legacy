// Persist only unacknowledged consumption, scoped to the account. No rewards originate here.
export function createCombatJournalV134({storage=globalThis.localStorage,key}={}){
 let spent={},markers={};
 try{const old=JSON.parse(storage?.getItem(key)||'null');if(old&&old.spent&&old.markers){spent=old.spent;markers=old.markers;}}catch{}
 const persist=()=>{try{storage?.setItem(key,JSON.stringify({spent,markers}));}catch{}};
 const subtract=delta=>{for(const [k,n] of Object.entries(delta)){spent[k]=Math.max(0,(spent[k]||0)-n);if(!spent[k])delete spent[k];}};
 const api={
  spend(field,id,n){if(!['ammo','rockets'].includes(field)||!Number.isSafeInteger(n)||n<1)return;const k=field+':'+id;spent[k]=(spent[k]||0)+n;persist();},
  submit(id){if(!markers[id]){markers[id]={...spent};persist();}},
  acknowledge(id){const delta=markers[id];if(!delta)return;subtract(delta);delete markers[id];for(const pending of Object.values(markers))for(const [k,n] of Object.entries(delta))pending[k]=Math.max(0,(pending[k]||0)-n);persist();},
  reconcile(state){api.acknowledge(state.serverCheckpointReceiptV134);if(!Object.keys(spent).length)return state;const next=structuredClone(state);for(const [k,n] of Object.entries(spent)){const [field,id]=k.split(':');next[field]||={};next[field][id]=Math.max(0,Number(next[field][id]||0)-n);}return next;},
  reset(){spent={};markers={};persist();},get pending(){return Object.keys(spent).length>0;}
 };return api;
}
