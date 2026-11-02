/** V116.4: confirmed trade receipts live in the same authoritative save write.
 * No retry with the same ID can charge or sell twice, including after restart.
 */
export function tradeRequestIdV1164(value){
  const id=String(value||'');
  if(!id)return null;
  if(!/^[A-Za-z0-9_-]{10,90}$/.test(id))throw Object.assign(new Error('Identificador de transação inválido.'),{status:400});
  return id;
}
export function findTradeReceiptV1164(state,id,action,payload={}){
  if(!id)return null;
  const receipt=(Array.isArray(state?.autoTradeReceiptsV1164)?state.autoTradeReceiptsV1164:[]).find(x=>x?.id===id);
  if(!receipt)return null;
  const scope=action==='auto_buy'?String(payload.catalog_key||''):String(payload.resource_id||'all');
  if(receipt.action!==action||receipt.scope!==scope)throw Object.assign(new Error('Identificador reutilizado com operação diferente.'),{status:409});
  return receipt.info;
}
export function rememberTradeReceiptV1164(state,id,action,payload,info){
  if(!id)return;
  const scope=action==='auto_buy'?String(payload.catalog_key||''):String(payload.resource_id||'all');
  const items=(Array.isArray(state.autoTradeReceiptsV1164)?state.autoTradeReceiptsV1164:[]).filter(x=>x?.id!==id);
  state.autoTradeReceiptsV1164=[...items.slice(-63),{id,action,scope,info}];
}
