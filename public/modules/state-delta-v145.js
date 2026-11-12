/** Transport only. A delta never authorizes money, inventory, rewards or equipment. */
const forbidden=new Set(['__proto__','prototype','constructor']);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const invalid=()=>Object.assign(Error('DELTA_INVALID'),{code:'DELTA_INVALID',status:400});
export function stateDeltaV145(base,next){
 const ops=[];
 function visit(a,b,path){
  if(same(a,b))return;
  if(object(a)&&object(b)){
   for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
    if(forbidden.has(key))throw invalid();
    if(!Object.hasOwn(b,key))ops.push({op:'delete',path:[...path,key]});
    else if(!Object.hasOwn(a,key))ops.push({op:'set',path:[...path,key],value:b[key]});
    else visit(a[key],b[key],[...path,key]);
   }
  }else ops.push({op:'set',path,value:b});
 }
 visit(base,next,[]);return ops;
}
export function applyStateDeltaV145(base,ops){
 if(!Array.isArray(ops)||ops.length>4096)throw invalid();
 let state=structuredClone(base);
 for(const change of ops){
  const p=change?.path;
  if(!['set','delete'].includes(change?.op)||!Array.isArray(p)||p.length>64||p.some(k=>typeof k!=='string'||forbidden.has(k)||k.length>256))throw invalid();
  if(!p.length){if(change.op!=='set'||!object(change.value))throw invalid();state=structuredClone(change.value);continue;}
  let node=state;
  for(const key of p.slice(0,-1)){if(!object(node)||!Object.hasOwn(node,key))throw invalid();node=node[key];}
  if(!object(node))throw invalid();
  const key=p.at(-1);
  if(change.op==='delete')delete node[key];else{
   if(!Object.hasOwn(change,'value'))throw invalid();node[key]=structuredClone(change.value);
  }
 }
 if(!object(state))throw invalid();return state;
}
export function compactSaveV145(baseline,state,metadata={}){
 const full={state,...metadata};
 if(!baseline?.id||!baseline?.state)return full;
 const changes=stateDeltaV145(baseline.state,state);
 const compact={delta_v145:{base:baseline.id,changes},...metadata};
 return JSON.stringify(compact).length<JSON.stringify(full).length*.8?compact:full;
}
