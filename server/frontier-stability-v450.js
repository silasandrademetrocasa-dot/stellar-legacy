// Frontier validity cannot assume all map rooms are owned by a faction.
// U-1/U-2/U-3 are neutral graph nodes but remain isolated by authenticated faction.
import {frontierBossSetupV440} from '../public/modules/frontier-boss-v440.js';
const IS_U=/^u[1-3]$/;
export function sectorEntryAllowedV450(mapId,territorial,sector,territory){
 if(!territorial)return true;
 if(IS_U.test(String(mapId)))return !!sector&&sector.enabled!==false&&(sector.territory_faction==null||sector.territory_faction==='');
 return !sector||String(sector.territory_faction||'')===String(territory||'');
}
export function frontierEliteRespawnV450(mapId,npcType,liveNpcs){
 if(String(mapId)!=='u3'||String(npcType)!=='bossAstralReaper')return null;
 if([...liveNpcs].some(e=>e?.hp>0&&e?.name==='GUARDIÃO DO VAZIO'&&!e?.eventNpc))return null;
 return frontierBossSetupV440(mapId,npcType,0);
}
