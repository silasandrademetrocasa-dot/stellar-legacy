/**
 * Real-money-like shared economy needs a server receipt and SQL serialization.
 * Client-generated UUIDs are idempotency identifiers, not authorization.
 */
export const PURCHASE_ID_RE_V123=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validPurchaseIdV123(id){return PURCHASE_ID_RE_V123.test(String(id||''));}
export function samePurchaseV123(row,key){return row&&row.catalog_key===key;}
export function interpretPurchaseCommitV123(data,error){
 if(error)return {ok:false,code:String(error.code||'ECONOMY_RPC_ERROR'),message:String(error.message||'Falha ao confirmar compra.')};
 if(!data||data.ok!==true)return {ok:false,code:String(data?.code||'PURCHASE_CONFIRMATION_UNKNOWN'),message:String(data?.message||'Compra ainda não confirmada.')};
 return {ok:true,replayed:data.replayed===true,receipt:data.receipt,state:data.state,updatedAt:data.updated_at};
}
