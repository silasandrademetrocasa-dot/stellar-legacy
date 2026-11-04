/** V125: durable economic intent identity, not client authorization. */
import {createHash} from 'node:crypto';
export function stableJsonV125(obj){
 if(Array.isArray(obj))return '['+obj.map(stableJsonV125).join(',')+']';
 if(obj&&typeof obj==='object')return '{'+Object.keys(obj).sort().map(k=>JSON.stringify(k)+':'+stableJsonV125(obj[k])).join(',')+'}';
 return JSON.stringify(obj)??'null';
}
export function operationDigestV125(op,payload){
 return createHash('sha256').update(stableJsonV125({op,payload})).digest('hex');
}
export function requestIdValidV125(value){return typeof value==='string'&&/^[a-zA-Z0-9_-]{10,90}$/.test(value);}
export function decodeEconomyReceiptV125(data,error){
 if(error)return {ok:false,code:String(error.code||'ECONOMY_RPC_UNAVAILABLE')};
 if(!data||data.ok!==true)return {ok:false,code:String(data?.code||'ECONOMY_ACK_UNKNOWN')};
 return {ok:true,state:data.state,receipt:data.receipt,updatedAt:data.updated_at,replayed:data.replayed===true};
}
export function replayValidV125(row,operation,hash){
 return row&&row.operation===operation&&row.request_hash===hash;
}
