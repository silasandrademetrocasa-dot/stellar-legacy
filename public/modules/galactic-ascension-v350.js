// V35 • Pure, client-only presentation of a server-priced relay tier.
// Never authorises upgrades, prices, HP, shields or rewards.
export const FORTIFICATION_LEVELS=Object.freeze([1,2,3]);
export function fortificationLevel(raw){const n=Number(raw);return Number.isInteger(n)?Math.max(1,Math.min(3,n)):1;}
export function fortificationNextLevel(raw,tiers=[]){
 const next=fortificationLevel(raw)+1;
 if(next>3||!Array.isArray(tiers))return null;
 const t=tiers.find(t=>Number(t?.level)===next);
 if(!t||!['credits','parts_each','min_clan_level','hp_bonus','shield_bonus'].every(k=>Number.isSafeInteger(Number(t[k]))&&Number(t[k])>=0))return null;
 return {...t,level:next};
}
export function fortificationStats(node,tiers=[]){
 const level=fortificationLevel(node?.fortificationLevel??node?.relayLevel);
 const t=(tiers||[]).find(t=>Number(t?.level)===level)||{};
 return {level,hpBonus:Math.max(0,Number(t.hp_bonus)||0),shieldBonus:Math.max(0,Number(t.shield_bonus)||0)};
}
export function fortificationCanAfford(tier,clan,parts=[]){
 if(!tier||!clan?.isOwner||!Array.isArray(parts))return false;
 const qty=key=>Math.max(0,Number(parts.find(p=>p?.part_type===key)?.quantity)||0);
 const needed=Number(tier.parts_each),credits=Number(tier.credits);
 if(!Number.isSafeInteger(needed)||!Number.isSafeInteger(credits)||needed<0||credits<0)return false;
 return Number(clan.level)>=Number(tier.min_clan_level)&&Number(clan.vault_credits)>=credits
  &&qty('hull_parts')>=needed&&qty('shield_parts')>=needed;
}
export function galacticEconomyVitals(balance=[],tierLevels=[]){
 // Lightweight admin observability: no player balances, only price configuration rows.
 const money=[...balance.map(v=>Number(v?.credits)),...tierLevels.map(v=>Number(v?.credits))].filter(Number.isFinite);
 const unsafe=money.some(v=>v<0||!Number.isSafeInteger(v));
 return {pricesConfigured:balance.length===36&&tierLevels.length===3,unsafePrices:unsafe,maxPrice:money.length?Math.max(...money):0};
}
