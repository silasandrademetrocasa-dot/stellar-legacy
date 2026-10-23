/* STELLAR_OFFLINE_COMBAT_V487. The Render backend calculates immutable fight settings
   once, from the authenticated player's *persisted* save and the official catalog.
   It never credits rewards; those remain transactional in SQL on claim. */
import {ITEMS,SHIPS,LASER_AMMO} from '../public/data.js';
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const limit=(v,a,b)=>Math.min(b,Math.max(a,v));
const SKILLS={
 detonation1:[3,6],bounty1:[3,6],alienHunter:[2,4,6,8,12],
 explosives:[2,4,6,8,10],electroOptics:[5,10,15,20,25],logistics:[4,8,12,16,25]
};
function skill(skills,id){const vals=SKILLS[id]||[];const lv=limit(Math.floor(num(skills?.[id])),0,vals.length);return lv?vals[lv-1]:0;}
export function combatProfileV487(state,ammoId){
 if(!state||typeof state!=='object')throw Error('FARM_SAVE_MISSING');
 const ship=SHIPS[state.activeShipId];if(!ship)throw Error('FARM_SHIP_INVALID');
 const ammo=LASER_AMMO[ammoId];if(!ammo||ammo.shieldDrain||!['lcb10','mcb25','mcb50','ucb100'].includes(ammoId))throw Error('FARM_AMMO_INVALID');
 const slots=[...(state.shipLoadout?.lasers||[]),...(Array.isArray(state.drones)?state.drones:[]).flatMap(d=>Array.isArray(d?.slots)?d.slots:[])];
 const lasers=slots.filter(id=>ITEMS[id]?.type==='laser');
 if(!lasers.length||lasers.length>64)throw Error('FARM_LASER_REQUIRED');
 const raw=lasers.reduce((sum,id)=>{const it=ITEMS[id];return sum+num(it.alienDamage??it.damage)*(1+num(it.alienBonus));},0);
 if(raw<=0)throw Error('FARM_LASER_REQUIRED');
 const skills=state.pilotBio?.skills||{};
 const starterMap=['x1','x2','x3','x4'].includes(state.mapId);
 const shipBonus=starterMap?num(ship.bonusLowMaps?.laserMult,1):1;
 const pilotBonus=(1+skill(skills,'alienHunter')/100)*(1+(skill(skills,'detonation1')+skill(skills,'bounty1'))/100);
 const hitChance=limit(.75+skill(skills,'electroOptics')/100,.75,1);
 // Conservative pressure bonus: only the fraction of NPC HP assigned to shields is eligible.
 const shieldPressure=skill(skills,'explosives')/100;
 const damage=limit(Math.floor(raw*shipBonus*pilotBonus*num(ammo.mult)),1,2_000_000);
 const generators=[...(state.shipLoadout?.generators||[]),...(Array.isArray(state.drones)?state.drones:[]).flatMap(d=>Array.isArray(d?.slots)?d.slots:[])].filter(id=>ITEMS[id]?.type==='generator');
 const speed=limit(num(ship.speed)+generators.reduce((n,id)=>n+num(ITEMS[id].speed),0)+ (starterMap?num(ship.bonusLowMaps?.speed):0),100,2000);
 const travelSeconds=limit(Math.ceil(850/(speed*.68))+3,3,45);
 const cargoExtras=(state.shipLoadout?.extras||[]).reduce((n,id)=>n+num(ITEMS[id]?.cargoBonus),0);
 const cargoCapacity=limit(Math.round((num(ship.cargo)+(starterMap?num(ship.bonusLowMaps?.cargo):0)+cargoExtras)*(1+skill(skills,'logistics')/100)),100,15000);
 return {combat_model:'v487',laser_count:lasers.length,damage_per_volley:damage,
  hit_chance:hitChance,shield_pressure:shieldPressure,fire_interval_ms:420,
  ship_speed:speed,move_between_seconds:travelSeconds,cargo_capacity:cargoCapacity,
  model_note:'Lasers reais (nave+drones), munição e habilidades persistidas; bônus temporários/clã/astral não contabilizados'};
}
export function npcCombatCycleV487(snapshot){
 const npc=snapshot?.npc||{};
 const hp=Math.max(1,num(npc.hp)+num(npc.shield)),shieldPart=num(npc.shield)/hp;
 const damage=limit(num(snapshot?.damage_per_volley),1,2_000_000);
 const hit=limit(num(snapshot?.hit_chance,.75),.5,1);
 const adjusted=damage*(1+limit(num(snapshot?.shield_pressure),0,.3)*shieldPart)*hit;
 const volleys=limit(Math.ceil(hp/Math.max(1,adjusted)),1,50000);
 const lasers=limit(Math.floor(num(snapshot?.laser_count)),1,64);
 const travel=limit(Math.ceil(num(snapshot?.move_between_seconds)),3,45);
 const killSeconds=limit(Math.ceil(volleys*.42)+travel,1,30000);
 return {volleys,ammoPerKill:volleys*lasers,killSeconds};
}
