// Relay damage is calculated on the SERVER from persisted equipment, never from a client damage field.
import {ITEMS,SHIPS,LASER_AMMO,ROCKETS} from '../public/data.js';
export function relayShipLoadoutDamage(state={},ammoId='lcb10',rocketId=null){
 const ship=SHIPS[String(state.activeShipId||'phoenix')]||SHIPS.phoenix;
 const ids=[...(state.shipLoadout?.lasers||[]),...(state.drones||[]).flatMap(d=>Array.isArray(d.slots)?d.slots:[])];
 const ownedLaserIds=ids.filter(id=>ITEMS[id]?.type==='laser').slice(0,ship.lasers+16);
 const pet=(state.pet?.owned&&Array.isArray(state.pet?.lasers)?state.pet.lasers:[]).filter(id=>ITEMS[id]?.type==='laser').slice(0,20);
 const val=id=>{const it=ITEMS[id];return Math.max(0,Number(it?.alienDamage??it?.damage)||0)*(1+Math.max(0,Number(it?.alienBonus)||0));};
 const laserBase=ownedLaserIds.reduce((n,id)=>n+val(id),0),auxBase=pet.reduce((n,id)=>n+val(id),0);
 // Pilot bonuses are part of the same saved ship build; never accept damage modifiers from WS messages.
 const skills=state.pilotBio?.skills||{};
 const skill=(key,vals)=>vals[Math.max(0,Math.min(vals.length,Math.floor(Number(skills[key])||0)))-1]||0;
 const shipPilotMult=(1+skill('alienHunter',[2,4,6,8,12])/100)*(1+(skill('detonation1',[3,6])+skill('bounty1',[3,6]))/100);
 const rocketPilotMult=1+skill('rocketFusion',[2,4,6,8,15])/100;
 const auxLevel=Math.max(1,Math.min(20,Math.floor(Number(state.pet?.level)||1)));
 const auxBonuses=[[2,2],[5,4],[7,6],[10,8],[12,10],[14,12],[16,14],[18,16]];
 const auxDamageBonus=auxBonuses.reduce((v,[lv,pct])=>auxLevel>=lv?pct:v,0)/100;
 const selected=LASER_AMMO[ammoId]&&Number(state.ammo?.[ammoId])>0?LASER_AMMO[ammoId]:LASER_AMMO.lcb10;
 // Never allow a shot with no verified laser equipment or no recorded ammunition.
 const ammoAvailable=Number(state.ammo?.[selected.id])>0;
 const laserCount=Math.min(ownedLaserIds.length,Math.max(0,Math.floor(Number(state.ammo?.[selected.id])||0)));
 const fraction=ownedLaserIds.length?laserCount/ownedLaserIds.length:0;
 const laserDamage=ammoAvailable?Math.max(0,Math.round((laserBase*fraction*shipPilotMult+auxBase*(1+auxDamageBonus))*Number(selected.mult))):0;
 const rocket=ROCKETS[rocketId];
 const rocketDamage=rocket&&Number(state.rockets?.[rocketId])>0?Math.round(rocket.damage*rocketPilotMult):0;
 return {laserDamage,rocketDamage,ammoId:selected.id,laserCount,auxCount:pet.length};
}
export function relayTurretStats(module,rows){
 const level=Math.max(1,Math.min(3,Math.floor(Number(module?.level)||1)));
 const attr=module?.attribute==='missile'||Number(module?.slot)===2?'missile':'laser';
 const entry=(rows||[]).find(r=>r.category==='weapon'&&r.attribute===attr&&Number(r.level)===level);
 return {damage:Math.max(0,Math.min(20000,Math.floor(Number(entry?.damage??(attr==='missile'?1600+1000*level:700+650*level))))),cooldownMs:Math.max(600,Math.min(10000,Math.floor(Number(entry?.cooldown_ms?? (attr==='missile'?3200:1150)))))};
}
