import {operationDigestV125} from './economy-receipts-v125.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const transient=new Set(['PLAYER_RETRY','ECONOMY_STALE','SAVE_REVISION_CONFLICT','COLLECTION_STALE','COLLECTION_BUSY','COLLECTION_POSITION_STALE','OUTBOX_SEQUENCE_CONFLICT']);
export function createEconomicBatchV146({getDb,scope,handlers,guard,collectionArrival}={}){
 return async(req,res)=>{
  const events=req.body?.events;
  if(!Array.isArray(events)||events.length<1||events.length>40||JSON.stringify(events).length>150000)return res.status(400).json({code:'OUTBOX_BATCH_INVALID'});
  let last=0,device;for(const e of events){
   if(!e||!uuid.test(e.id)||!uuid.test(e.device)||!Number.isSafeInteger(e.sequence)||e.sequence<1||e.sequence<=last||device&&device!==e.device||!Object.hasOwn(handlers,e.kind)||typeof handlers[e.kind]!=='function'||!e.body||typeof e.body!=='object'||Array.isArray(e.body)||!Number.isSafeInteger(e.resetEpoch)||e.resetEpoch<0||e.expected&&(!Number.isSafeInteger(e.expected.price)||e.expected.price<1||!['credits','uridium'].includes(e.expected.currency)))return res.status(400).json({code:'OUTBOX_EVENT_INVALID'});
   if(e.kind==='economy'&&!['auto_buy','sell_cargo','sell_inventory'].includes(e.body.action))return res.status(400).json({code:'OUTBOX_ACTION_UNSUPPORTED'});
   device=e.device;last=e.sequence;
  }
  const db=await getDb(),results=[];let state,token;
  const priorRead=await db.from('stellar_localfirst_events_v146').select('event_id,device_id,sequence,request_hash,status,receipt,code').eq('user_id',req.user.id).in('event_id',events.map(e=>e.id));
  if(priorRead.error)return res.status(503).json({code:'OUTBOX_STORAGE_UNAVAILABLE'});
  const priors=new Map((priorRead.data||[]).map(r=>[r.event_id,r]));
  for(const e of events){
   const hash=operationDigestV125('localfirst-v146',{id:e.id,device:e.device,sequence:e.sequence,kind:e.kind,body:e.body,expected:e.expected||null,resetEpoch:Number(e.resetEpoch)||0});
   const meta={...e,hash,owner:req.user.id},old=priors.get(e.id);
   if(old){
    if(old.request_hash!==hash)return res.status(409).json({code:'OUTBOX_ID_REUSED'});
    results.push({id:e.id,device:e.device,sequence:e.sequence,status:old.status,receipt:old.receipt,code:old.code});continue;
   }
   const child=Object.create(req);child.body={...e.body,request_id:e.id};child.query={};
   let status=200,body;
   const response={status(n){status=n;return this;},set(){return this;},setHeader(){return this;},json(v){body=v;return this;},send(v){body=v;return this;}};
   try{
    if(e.kind==='collection')child.collectionArrivalV146=collectionArrival?.(req,e.body);
    await guard?.(child,e);
    await scope.run(meta,()=>handlers[e.kind](child,response));
    if(status>=400||body?.ok===false)throw Object.assign(Error(body?.error||body?.message||'Operação recusada.'),{status,code:body?.code});
    if(!body?.state)throw Object.assign(Error('Confirmação incompleta.'),{status:503,code:'OUTBOX_ACK_UNKNOWN'});
    // The scoped commit already wrote the receipt and cursor atomically. Avoid a second SQL ACK.
    if(Number(body.state.serverEconomicAckV146?.[e.device]||0)>=e.sequence){
     state=body.state;token=body.save_token;
     results.push({id:e.id,device:e.device,sequence:e.sequence,status:'confirmed',receipt:body.receipt||body.purchase||body.info||{}});continue;
    }
    const finished=await db.rpc('stellar_localfirst_finish_v146',{p_user_id:req.user.id,p_event_id:e.id,p_device_id:e.device,p_sequence:e.sequence,p_event_hash:hash,p_status:'confirmed',p_receipt:body.receipt||body.purchase||body.info||{},p_code:null});
    if(finished.error)throw Object.assign(Error(finished.error.message),{status:503,code:finished.error.code});
    state=finished.data.state;token=finished.data.save_token;
    results.push({id:e.id,device:e.device,sequence:e.sequence,status:finished.data.status||'confirmed',receipt:finished.data.receipt||body.receipt||body.purchase||body.info||{}});
   }catch(error){
    const code=String(error.code||'OUTBOX_REJECTED'),http=Number(error.status)||500;
    if(http>=500||http===401||http===429||transient.has(code))break;
    const finished=await db.rpc('stellar_localfirst_finish_v146',{p_user_id:req.user.id,p_event_id:e.id,p_device_id:e.device,p_sequence:e.sequence,p_event_hash:hash,p_status:'rejected',p_receipt:{message:String(error.message).slice(0,180)},p_code:code});
    if(finished.error)break;state=finished.data.state;token=finished.data.save_token;
    results.push({id:e.id,device:e.device,sequence:e.sequence,status:finished.data.status||'rejected',receipt:finished.data.receipt,code:finished.data.code||code,message:String(error.message).slice(0,180)});
   }
  }
  // Replay-only batches still return the latest canonical state, never the old receipt snapshot.
  if(!state&&results.length){const read=await db.rpc('stellar_player_read',{p_user_id:req.user.id,p_token:null,p_checkpoint_ids:null});if(read.error)return res.status(503).json({code:'OUTBOX_READ_UNAVAILABLE'});state=read.data.state;token=read.data.save_token;}
  return res.set('Cache-Control','no-store').json({ok:true,results,state,save_token:token});
 };
}
