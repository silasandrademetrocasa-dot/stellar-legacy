import {AsyncLocalStorage} from 'node:async_hooks';
export function createEconomicScopeV146(){
 const storage=new AsyncLocalStorage();
 return {run:(context,fn)=>storage.run(context,fn),wrap(db){
  if(!db)return db;
  return new Proxy(db,{get(target,key){
   if(key==='rpc')return (name,args,...rest)=>{
    const event=storage.getStore();
    if(name==='stellar_player_commit'&&event&&args.p_user_id===event.owner){
     return Promise.resolve(target.rpc('stellar_localfirst_commit_v146',{...args,p_event_id:event.id,p_device_id:event.device,p_sequence:event.sequence,p_event_hash:event.hash,p_expected_price:event.expected?.price??null,p_expected_currency:event.expected?.currency??null,p_reset_epoch:Number(event.resetEpoch)||0},...rest)).then(result=>{
      if(['OUTBOX_QUOTE_CHANGED','OUTBOX_RESET_STALE'].includes(result.data?.code))throw Object.assign(Error('Cotação alterada; compra não debitada.'),{status:409,code:result.data.code});
      if(result.error&&/OUTBOX_SEQUENCE_CONFLICT/.test(result.error.message||''))throw Object.assign(Error('Sequência pendente.'),{status:409,code:'OUTBOX_SEQUENCE_CONFLICT'});
      return result;
     });
    }
    return target.rpc(name,args,...rest);
   };
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
 }};
}
