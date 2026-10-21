// Combat bonuses are bounded and derived from the saved equipment snapshot.
// The game uses these values only if the administrator enabled each technology.
const BONUS_LIMITS=Object.freeze({npcDamagePercent:4,shieldPercent:6,speedPercent:5});
const SLOT_FOR=Object.freeze({astral_guard:'defense',eclipse_lance:'weapon',nexus_drive:'engine',trinity_matrix:'utility'});
export function astralEquipmentBonusesV435(snapshot,config=1){
  const result={npcDamagePercent:0,shieldPercent:0,speedPercent:0};
  if(!snapshot||![1,2].includes(Number(config)))return result;
  const rows=Array.isArray(snapshot.equipped)?snapshot.equipped:[];
  const defs=Array.isArray(snapshot.definitions)?snapshot.definitions:[];
  const items=Array.isArray(snapshot.items)?snapshot.items:[];
  for(const [code,slot] of Object.entries(SLOT_FOR)){
    if(!rows.some(r=>Number(r.config)===Number(config)&&r.code===code&&r.slot===slot))continue;
    if(!items.some(i=>i.code===code&&Number(i.qty)>=1))continue;
    const def=defs.find(d=>d.code===code&&d.slot===slot&&d.combatEnabled===true);
    if(!def)continue;
    const bonus=def.proposal||{};
    for(const [key,limit] of Object.entries(BONUS_LIMITS)){
      const value=Number(bonus[key]);
      if(Number.isFinite(value)&&value>0)result[key]=Math.min(limit,result[key]+Math.min(limit,value));
    }
  }
  return result;
}
export const astralModuleCodesV435=Object.freeze(Object.keys(SLOT_FOR));
