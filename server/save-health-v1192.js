/** Read-only consistency inspection. Does NOT reconcile, write, auto-fix or restore progress. */
const int=x=>{const n=Number(x);return Number.isSafeInteger(n)?n:null;};
const safeObject=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
export function inspectSaveHealthV1192({state,profile,ownerId,head,checkpoints=[],farm,verified,mode='observe'}){
 const issues=[];
 const add=(code,severity='warning')=>issues.push({code,severity});
 if(!state||!profile)return {ok:false,issues:[{code:'CANONICAL_READ_UNAVAILABLE',severity:'error'}],readonly:true};
 if(String(state.accountOwnerId||'')!==String(ownerId||''))add('SAVE_OWNER_MISMATCH','error');
 const wallet=safeObject(state.profile);
 for(const [prop,column,label] of [['credits','credits','CREDITS'],['uridium','uridium','STL'],['xp','xp','XP'],['aliensKilled','aliens_killed','KILLS']]){
   const a=int(wallet[prop]),b=int(profile[column]);
   if(a===null||b===null||a!==b)add('PROFILE_'+label+'_DESYNC','error');
 }
 const drones=Array.isArray(state.drones)?state.drones:[];
 const ids=drones.map(d=>String(d?.id||''));
 if(new Set(ids).size!==ids.length||ids.some(id=>!id))add('DRONE_IDS_INVALID','error');
 if(drones.length>8)add('DRONE_LIMIT_EXCEEDED','error');
 const valid=new Set(ids);
 const configs=safeObject(safeObject(state.combatConfigsV2013).profiles);
 for(const conf of ['1','2']){
   const slots=safeObject(safeObject(configs[conf]).droneSlots);
   if(Object.keys(slots).some(id=>!valid.has(id)))add('CONF'+conf+'_ORPHAN_DRONES','warning');
 }
 if(verified===false)add('REVISION_HASH_BEHIND',mode==='enforce'?'error':'warning');
 if(!head||head.revision==null)add('REVISION_NOT_PREPARED','warning');
 const slots=checkpoints.map(x=>String(x.slot||'')).filter(x=>['A','B','C'].includes(x));
 if(!slots.includes('A'))add('CHECKPOINT_A_MISSING','warning');
 const severe=issues.some(x=>x.severity==='error');
 return {
   ok:!severe,readonly:true,mode,
   revision:head?.revision??null,
   checkpoints:slots,
   drones:drones.length,
   farmStatus:String(farm?.status||'none'),
   issues
 };
}
