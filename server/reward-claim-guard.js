// Proteções contra rollback de resgates já entregues. Não confundir com comprovação
// de progresso: pontos do Passe legados ainda dependem do cliente e serão migrados.
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
function missing(oldMap,newMap){return Object.keys(obj(oldMap)).filter(k=>!Object.prototype.hasOwnProperty.call(obj(newMap),k));}
export function validateRewardClaimContinuity(incoming,stored){
  if(!stored)return null;
  const oldLv=obj(stored.levelRewards),newLv=obj(incoming?.levelRewards);
  if(missing(oldLv.claimed,newLv.claimed).length)return {code:'SAVE_LEVEL_CLAIM_ROLLBACK',reason:'Recompensa de nível já resgatada não pode reaparecer.'};
  const before=obj(stored.battlePass),after=obj(incoming?.battlePass);
  if(before.season&&before.season===after.season){
    if(missing(before.claimedTiers,after.claimedTiers).length)return {code:'SAVE_PASS_FREE_REPLAY',reason:'Resgate Free já confirmado.'};
    if(missing(before.premiumClaimedTiers,after.premiumClaimedTiers).length)return {code:'SAVE_PASS_PREMIUM_REPLAY',reason:'Resgate Premium já confirmado.'};
  }
  // Falha segura de formato: não aceitar listas em vez de mapas de comprovantes.
  for(const r of [newLv.claimed,after.claimedTiers,after.premiumClaimedTiers])
    if(r!==undefined&&(typeof r!=='object'||Array.isArray(r)||r===null))return {code:'SAVE_CLAIM_FORMAT',reason:'Registro de resgate inválido.'};
  return null;
}
