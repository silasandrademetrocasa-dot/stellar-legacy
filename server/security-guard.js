// Antifraude: sinais objetivos, sem confiar em valores enviados pelo navegador.
// Heurísticas deliberadamente conservadoras: uma divergência pequena não é prova de trapaça.
export const SECURITY_LIMITS=Object.freeze({creditsPerSave:100_000_000,stlPerSave:1_000_000,creditsAbsolute:1_000_000_000_000,stlAbsolute:10_000_000_000,itemQuantity:1_000_000_000});
const entries=Object.freeze({inventory:SECURITY_LIMITS.itemQuantity,ammo:1_000_000_000_000,rockets:SECURITY_LIMITS.itemQuantity,cargo:SECURITY_LIMITS.itemQuantity,materials:SECURITY_LIMITS.itemQuantity});
function numberField(value){if(value===null||value===undefined)return 0;if(typeof value==='boolean'||typeof value==='object')return NaN;return Number(value);}
function currency(state,key){return numberField(state?.profile?.[key]);}
function issue(code,severity='warn',summary='Validação de integridade recusada.',evidence={}){return {code,severity,summary,evidence};}
export function validatePlayerSave(incoming,stored,{userId,isAdmin=false}={}){
 if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))return issue('SAVE_INVALID','warn');
 if(incoming.accountOwnerId && String(incoming.accountOwnerId)!==String(userId))return issue('SAVE_OWNER_FORGED','critical','Save com proprietário divergente.');
 if(stored?.accountOwnerId&&String(stored.accountOwnerId)!==String(userId))return issue('SAVE_EXISTING_OWNER_MISMATCH','warn','Save existente com proprietário divergente.');
 for(const [key,max] of [['credits',SECURITY_LIMITS.creditsAbsolute],['uridium',SECURITY_LIMITS.stlAbsolute]]){
  const v=currency(incoming,key);if(!Number.isSafeInteger(v)||v<0||v>max)return issue('SAVE_INVALID_CURRENCY','critical',`Saldo ${key} fora dos limites financeiros.`,{field:key});
  const prior=currency(stored,key);const delta=v-(Number.isFinite(prior)?prior:0);
  if(!isAdmin&&stored&&delta>(key==='credits'?SECURITY_LIMITS.creditsPerSave:SECURITY_LIMITS.stlPerSave))return issue('SAVE_UNEXPLAINED_BALANCE','warn','Aumento de saldo acima do limite por save.',{field:key,increment:Math.round(delta)});
 }
 for(const [group,max] of Object.entries(entries)){
  const bucket=incoming[group];if(bucket==null)continue;
  if(typeof bucket!=='object'||Array.isArray(bucket))return issue('SAVE_INVALID_INVENTORY','warn','Inventário com formato inválido.',{group});
  for(const [item,quantity] of Object.entries(bucket)){
    if(typeof quantity==='object')continue; // receitas legadas com metadados complexos continuam funcionando.
    if(!Number.isSafeInteger(Number(quantity))||Number(quantity)<0||Number(quantity)>max)return issue('SAVE_ITEM_OVERFLOW','critical','Quantidade de itens inválida.',{group,item:String(item).slice(0,48)});
  }
 }
 if(stored&&!isAdmin){
  const oldPurchase=Number(stored.serverPurchaseRevision)||0;const newPurchase=Number(incoming.serverPurchaseRevision)||0;
  if(newPurchase>oldPurchase)return issue('SAVE_PURCHASE_REVISION_FORGED','critical','Revisao de compra alterada pelo navegador.');
  const oldElite=Number(stored.serverEliteRevision)||0;const newElite=Number(incoming.serverEliteRevision)||0;
  if(newElite>oldElite)return issue('SAVE_RESERVED_REVISION','critical','Tentativa de avançar revisão controlada pelo servidor.',{field:'serverEliteRevision'});
  const oldCoupon=Number(stored.serverCouponRevision)||0;const newCoupon=Number(incoming.serverCouponRevision)||0;
  if(newCoupon>oldCoupon)return issue('SAVE_RESERVED_REVISION','critical','Revisão de cupom controlada pelo servidor.',{field:'serverCouponRevision'});
 }
 return null;
}
export function invalidShopArguments(body,allowedKeys){
 if(!body||typeof body!=='object'||Array.isArray(body))return issue('SHOP_INVALID_PAYLOAD','warn');
 const extras=Object.keys(body).filter(k=>!allowedKeys.includes(k));
 if(extras.some(k=>/(price|cost|discount|balance|currency|qty|amount|reward|item|grant|premium|product_id)/i.test(k)))return issue('SHOP_PRICE_MANIPULATION','critical','Parâmetros econômicos não autorizados enviados à compra.',{extraFields:extras.slice(0,8)});
 return null;
}
