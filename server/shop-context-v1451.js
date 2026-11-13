/** Read-only purchase context. Never caches balances, receipts or Premium entitlement. */
const missingFunction=error=>['PGRST202','42883'].includes(String(error?.code||''))&&/stellar_shop_context_v1451/i.test(String(error?.message||error?.details||''));
const failed=(message,error)=>Object.assign(Error(message),{code:error?.code||'SHOP_CONTEXT_UNAVAILABLE',status:503});
export function createShopContextV1451({getDb,readSave,readCatalog,premiumEligible,now=Date.now,missingTtlMs=60000}={}){
 let unavailableUntil=0;
 return async(req,{catalogKey,requestId,bulk=false})=>{
  const db=await getDb();
  if(now()>=unavailableUntil){
   const result=await db.rpc('stellar_shop_context_v1451',{p_user_id:req.user.id,p_request_id:requestId,p_catalog_key:catalogKey,p_bulk:bulk});
   if(!result.error){
    if(!result.data?.save?.state)throw Object.assign(Error('Save não encontrado.'),{code:'PLAYER_SAVE_MISSING',status:409});
    return {...result.data,source:'consolidated'};
   }
   // Only an absent, read-only helper permits compatibility fallback. Other errors fail closed.
   if(!missingFunction(result.error))throw failed('Contexto de compra indisponível.',result.error);
   unavailableUntil=now()+missingTtlMs;
  }
  const receiptQuery=db.from(bulk?'stellar_economy_receipts_v125':'stellar_live_purchase_receipts_v123')
   .select(bulk?'operation,request_hash,receipt':'catalog_key,receipt').eq('user_id',req.user.id).eq('request_id',requestId).maybeSingle();
  const results=await Promise.allSettled([readSave(req),receiptQuery,readCatalog(),bulk?Promise.resolve({data:null}):req.sb.rpc('get_premium_shop_v12')]);
  const [save,receipt,catalog,premium]=results;
  if(save.status!=='fulfilled'||save.value?.error)throw failed('Save de compra indisponível.',save.reason||save.value?.error);
  if(!save.value?.data?.state)throw Object.assign(Error('Save não encontrado.'),{code:'PLAYER_SAVE_MISSING',status:409});
  if(receipt.status!=='fulfilled'||receipt.value?.error)throw failed('Recibos de compra indisponíveis.',receipt.reason||receipt.value?.error);
  // A committed purchase remains recoverable even when catalog/Premium are down or disabled.
  const old=receipt.value.data||null;
  if(old)return {save:save.value.data,receipt:old,catalog:null,premium_active:false,source:'legacy'};
  if(catalog.status!=='fulfilled')throw failed('Catálogo de compra indisponível.',catalog.reason);
  const row=(catalog.value?.catalog||[]).find(r=>String(r.catalog_key)===catalogKey)||null;
  if(!bulk&&premiumEligible(row)&&(premium.status!=='fulfilled'||premium.value?.error))throw failed('Não foi possível confirmar seu desconto Premium.',premium.reason||premium.value?.error);
  return {save:save.value.data,receipt:null,catalog:row,premium_active:premium.status==='fulfilled'&&premium.value?.data?.premium_active===true,source:'legacy'};
 };
}
