// V20.1.2 — milestones de economia do jogador. Puro; sem acesso a browser/rede.
// Os bônus de nível são pontuais e resgatáveis somente 1 vez via levelRewards.claimed.
export const RECRUIT_LEVEL_BONUSES_V2012=Object.freeze({
  3:{credits:1_000_000,items:['lf1']},
  5:{credits:2_000_000,items:['lf1'],ammo:{mcb25:2_000}},
  7:{credits:4_000_000,uridium:1_000,items:['lf1']},
  10:{credits:6_000_000,uridium:3_000,items:['lf2']},
  12:{credits:8_000_000,uridium:6_000},
  15:{credits:6_000_000,uridium:8_000},
  18:{credits:10_000_000,uridium:12_000},
  22:{credits:12_000_000,uridium:20_000}
});
export const ELITE_ROUTE_TARGETS_V2012=Object.freeze({
  activeHoursMin:350,activeHoursMax:450,novas:8,earlyNovas:4,
  ship:'goliath',laser:'lf4',lasers:31,shield:'sg3nb02',shields:12,
  motor:'g3n7900',motors:6,
  extras:['repElite','extraSlotCpuElite','remoteTraderCpuElite','cargoCpuElite']
});
const COMMON_SHIPS=new Set(['nostromo','bigboy','nDiplomat','nEnvoy','nAmbassador']);
export function applyRecruitBonusV2012(reward,level){
  const b=RECRUIT_LEVEL_BONUSES_V2012[Math.floor(Number(level)||0)];if(!b)return reward;
  reward.credits=(Number(reward.credits)||0)+(b.credits||0);
  reward.uridium=(Number(reward.uridium)||0)+(b.uridium||0);
  reward.items=[...(reward.items||[]),...(b.items||[])];
  reward.ammo={...(reward.ammo||{})};
  for(const [k,v] of Object.entries(b.ammo||{}))reward.ammo[k]=(reward.ammo[k]||0)+v;
  return reward;
}
export function novaTierPriceV2012(initial=15000,step=2,tier=1,premium=false){
  const t=Math.max(1,Math.min(8,Math.floor(Number(tier)||1)));
  const base=Math.round(Math.max(1,Number(initial)||15000)*Math.pow(Math.max(1,Number(step)||2),t-1));
  return premium?Math.max(1,Math.floor(base*.95)):base;
}
export function eliteRouteSnapshotV2012(state){
  const owned=new Set(state?.ownedShips||[]),drones=state?.drones||[],inventory=state?.inventory||{};
  const t=ELITE_ROUTE_TARGETS_V2012;
  const equipment=[...(state?.shipLoadout?.lasers||[]),...(state?.shipLoadout?.generators||[]),...(state?.shipLoadout?.extras||[]),...drones.flatMap(d=>Array.isArray(d.slots)?d.slots:[])];
  const equipmentCount=(id)=>equipment.filter(x=>x===id).length;
  const novaCount=drones.filter(d=>d?.type==='iris').length;
  const extrasEquipped=t.extras.filter(x=>equipment.includes(x)).length;
  const firstCommon=[...owned].some(id=>COMMON_SHIPS.has(id));
  const eliteShip=state?.activeShipId===t.ship;
  const fullElite=eliteShip&&novaCount===8&&equipmentCount(t.laser)>=t.lasers&&equipmentCount(t.shield)>=t.shields&&equipmentCount(t.motor)>=t.motors&&extrasEquipped===t.extras.length;
  return {firstCommon,fourNova:novaCount>=4,fullElite,novaCount,eliteShip,
    lasers:equipmentCount(t.laser),shields:equipmentCount(t.shield),motors:equipmentCount(t.motor),extras:extrasEquipped,
    extrasOwned:t.extras.filter(x=>Number(inventory[x]||0)>0||equipment.includes(x)).length,
    progress:[eliteShip?1:0,Math.min(8,novaCount),Math.min(t.lasers,equipmentCount(t.laser)),
      Math.min(t.shields,equipmentCount(t.shield)),Math.min(t.motors,equipmentCount(t.motor)),extrasEquipped].reduce((a,b)=>a+b,0),
    progressMax:1+8+t.lasers+t.shields+t.motors+t.extras.length};
}
export function freshEliteRouteJournalV2012(level=1){return {version:1,trackedFromLevel:Math.max(1,Math.floor(Number(level)||1)),activeSeconds:0,milestones:{},lastSavedMinute:0};}
