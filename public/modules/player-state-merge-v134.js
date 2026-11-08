// Three-way merge of validated state. Server authentication/validation remains mandatory.
const additive=/^(profile\.(credits|uridium|xp|aliensKilled)|cargo\.[^.]+|ammo\.[^.]+|rockets\.[^.]+|inventory\.[^.]+|stellarDust|pilotBio\.logDisks|galaxyGate\.(repairBonus|jumpBonus|lifeBonus)|server(Purchase|NpcReward|Ore|Elite)Revision)$/;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b), object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function mergePlayerStateV134(base,next,current,path=[]){
 if(same(next,base))return structuredClone(current);
 if(same(current,base))return structuredClone(next);
 if(object(next)&&(!base||object(base))&&(!current||object(current))){
  const result=structuredClone(current||{});
  for(const k of new Set([...Object.keys(base||{}),...Object.keys(next)])){
   const v=mergePlayerStateV134(base?.[k],next[k],current?.[k],[...path,k]);
   if(v===undefined)delete result[k];else result[k]=v;
  }return result;
 }
 if(additive.test(path.join('.'))&&[base,next,current].every(v=>v===undefined||Number.isSafeInteger(v))){
  const v=(current||0)+(next||0)-(base||0);
  if(!Number.isSafeInteger(v)||v<0)throw Object.assign(Error('PLAYER_BALANCE_CONFLICT'),{code:'PLAYER_RETRY',status:409});
  return next===undefined&&v===0?undefined:v;
 }
 if(same(next,current))return structuredClone(current);
 throw Object.assign(Error('PLAYER_FIELD_CONFLICT:'+path.join('.')),{code:'PLAYER_RETRY',status:409});
}
