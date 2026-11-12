/** Local safety audit for legacy modules that mutate progress without calling saveGame. */
export function createMutationCheckpointV145(){
 let signature=null;
 return function changed(state,vitals){
  if(!state)return false;
  const next=JSON.stringify({...state,clientSavedAt:0},(key,value)=>/^server/.test(key)||['clientSavedAt','locationSavedAt','savedAt'].includes(key)?undefined:value)+'|'+JSON.stringify(vitals);
  if(next===signature)return false;signature=next;return true;
 };
}
