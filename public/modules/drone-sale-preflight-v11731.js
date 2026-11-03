/* V117.3.1 — Venda de drone baseada no save oficial. Nenhuma alteração de moedas no cliente. */
export function validateDroneSalePreflightV11731({localState,officialState,droneId,layoutSignature}={}){
  const id=String(droneId||'').trim();
  if(!id||typeof layoutSignature!=='function')return {ok:false,reason:'INVALID_INPUT'};
  if(!officialState||!Array.isArray(officialState.drones))return {ok:false,reason:'OFFICIAL_UNAVAILABLE'};
  const remote=officialState.drones.find(d=>String(d?.id||'')===id);
  if(!remote)return {ok:false,reason:'NOT_IN_SERVER'};
  const local=Array.isArray(localState?.drones)?localState.drones.find(d=>String(d?.id||'')===id):null;
  if(!local)return {ok:false,reason:'NOT_LOCAL'};
  if(String(local.type||'')!==String(remote.type||''))return {ok:false,reason:'LAYOUT_DIFFERENT'};
  const localLayout=layoutSignature(localState),officialLayout=layoutSignature(officialState);
  if(typeof localLayout!=='string'||typeof officialLayout!=='string'||localLayout!==officialLayout)
    return {ok:false,reason:'LAYOUT_DIFFERENT'};
  return {ok:true,reason:'VERIFIED',droneId:id,droneType:String(remote.type||'')};
}
