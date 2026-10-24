/* Stellar Legacy V53: strictly presentational registry — no changes to saves or bonuses. */
export const ASTRAL53 = Object.freeze({
  alpha: 'astral_aurora', beta: 'astral_nexus', gamma: 'astral_eclipse'
});
export const SPRITE53 = id=>`/assets/v53/sprites/${id}.webp`;
export function baseIdV53(faction){return ({earth:'base_earth',mars:'base_mars',jupiter:'base_jupiter'})[String(faction||'').toLowerCase()]||'base_earth';}
export function portalIdV53(portal){
 const to=String(portal?.to||'').toLowerCase();
 const label=String(portal?.targetLabel||'').toLowerCase();
 if(to.includes('battle')||/^b4/.test(to)||/^4-[1234]/.test(label))return 'portal_pvp';
 if(/^(u[123]|u-[123])/.test(to)||/u-[123]/.test(label)||/universe|universo/.test(to+label))return 'portal_universe';
 return 'portal_normal';
}
export function visualDroneV53(type,designer){
 if(!designer)return type==='iris'?'drone_elite':'drone_common';
 const b=designer.bonuses||{};
 const damage=Number(b.damage_per_drone||b.damage||b.full_set_damage||0);
 const hp=Number(b.hp_per_drone||b.hp||b.full_set_hp||0);
 const shield=Number(b.shield_per_drone||b.shield||b.full_set_shield||0);
 const xp=Number(b.xp||b.exp||b.experience||0);
 if((hp>0&&shield>0)||(hp>0&&damage>0)||(shield>0&&damage>0))return 'drone_e';
 if(xp>0)return 'drone_d';if(damage>0)return 'drone_c';if(shield>0)return 'drone_b';if(hp>0)return 'drone_a';
 return type==='iris'?'drone_elite':'drone_common';
}
/* Visual pivot only. Physics, damage, equipment and map coordinates do not change. */
export function shipPivotV53(id){return /^(phoenix|leonov|liberator|piranha|vengeance|bigboy|goliath|citadel|aegis|spearhead|defcom|yamato|nostromo)$/.test(String(id)) ? 0.24 : 0;}
