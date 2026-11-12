import {DRONE_FORMATIONS,ownedFormations} from '../public/modules/combat-tactics-v144.js';
// Called only by the existing authoritative catalog purchase route, before its atomic commit.
export function applyFormationGrantV1441(state,row,{requestId}={}){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId||''))throw Object.assign(new Error('Identificador de compra inválido.'),{status:409,code:'FORMATION_REQUEST_INVALID'});
 const id=String(row?.ref_id||''),def=DRONE_FORMATIONS[id],grant=row?.meta?.grant;
 const fail=(message,code)=>{throw Object.assign(new Error(message),{status:409,code});};
 if(row?.kind!=='drone_formation'||!def||id==='original'||grant?.kind!=='drone_formation'||grant.id!==id)fail('Formação inválida.','FORMATION_PRODUCT_INVALID');
 const currency=['common','rare'].includes(def.rarity)?'credits':'uridium';
 if(row.currency!==currency)fail('Moeda da formação inválida.','FORMATION_CURRENCY_INVALID');
 if(ownedFormations(state).has(id))fail('Formação já obtida.','FORMATION_ALREADY_OWNED');
 state.serverFormationPurchaseV1441={id,requestId};
 state.ownedDroneFormationsV144=[...(state.ownedDroneFormationsV144||[]),id];
 // Does not equip automatically, move a drone, grant ammunition or alter any item slot.
 return state;
}
