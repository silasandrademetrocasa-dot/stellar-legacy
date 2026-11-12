import {createHash} from 'node:crypto';
import {applyStateDeltaV145,stateDeltaV145} from '../public/modules/state-delta-v145.js';
/** Bounded transport cache; eviction/restart requires a full retransmission, never a guessed base. */
export function createSaveDeltaTransportV145({maxBytes=16*1024*1024,maxEntries=128,ttlMs=300000,now=Date.now}={}){
 const entries=new Map();let bytes=0;
 function drop(key){const entry=entries.get(key);if(entry){bytes-=entry.bytes;entries.delete(key);}}
 function scope(req){return JSON.stringify([req.user?.id,req.gameSessionId||req.headers?.['x-game-session-id']||'']);}
 function remember(req,state){
  const raw=JSON.stringify(state),size=Buffer.byteLength(raw);
  if(size>1024*1024)return null;
  const id=createHash('sha256').update(raw).digest('hex'),key=scope(req)+id;
  for(const [k,v] of entries)if(now()-v.at>ttlMs)drop(k);
  drop(key);entries.set(key,{raw,bytes:size,at:now()});bytes+=size;
  while(bytes>maxBytes||entries.size>maxEntries)drop(entries.keys().next().value);
  return id;
 }
 return {
  middleware(req,res,next){
   if(!req.user?.id)return res.status(401).json({code:'SESSION_REQUIRED',error:'Sessão necessária.'});
   let reconstructed=null;
   if(req.method==='PUT'&&req.body?.delta_v145){
    const delta=req.body.delta_v145,key=scope(req)+String(delta.base||''),entry=entries.get(key);
    if(!entry||now()-entry.at>ttlMs){drop(key);return res.status(409).json({code:'DELTA_BASE_MISSING',error:'Reenvie o mesmo pedido com o snapshot completo.'});}
    // Reconstruct before normalization, hashing, and ALL original business validators.
    try{reconstructed=applyStateDeltaV145(JSON.parse(entry.raw),delta.changes);if(Buffer.byteLength(JSON.stringify(reconstructed))>1024*1024)throw Error('DELTA_TOO_LARGE');}
    catch(e){return res.status(400).json({code:'DELTA_INVALID',error:'Delta inválido.'});}
    req.body={...req.body,state:reconstructed};delete req.body.delta_v145;
   }
   const json=res.json.bind(res);
   res.json=body=>{
    if(res.statusCode<400&&body?.state&&typeof body.state==='object'){
     const id=remember(req,body.state);
     if(id){
      body={...body,delta_base_v145:id};
      if(req.method==='PUT'&&req.headers?.['x-stellar-delta']==='1'&&req.body?.state){
       const changes=stateDeltaV145(req.body.state,body.state);
       if(JSON.stringify(changes).length<JSON.stringify(body.state).length*.8){body={...body,state_delta_v145:changes};delete body.state;}
      }
     }
    }
    return json(body);
   };
   next();
  },
  metrics:()=>({entries:entries.size,bytes}),clear(){entries.clear();bytes=0;}
 };
}
