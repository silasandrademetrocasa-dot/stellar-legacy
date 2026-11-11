// One top-down sprite per hull/skin. IDs preserve existing ownership and bonuses.
export const SHIP_HULL_ART_V138=Object.freeze({aegis:'seraph',citadel:'bulwark',defcom:'phantom',spearhead:'pathfinder',yamato:'kensei'});
const elite={n132_aegis_solstice:'seraph_solstice',n132_citadel_arctic:'bulwark_arctic',n132_defcom_midnight:'phantom_midnight',n132_spearhead_orion:'pathfinder_orion',n132_spearhead_cristal:'pathfinder_cristal',n132_yamato_crimson:'kensei_crimson',n132_yamato_vulcao:'kensei_vulcao'};
const hulls={leonov:'lynx',vengeance:'valkyrie',goliath:'leviathan',pusat:'striker'};
export const SHIP_SKIN_ART_V138={...elite};
for(const [id,name] of Object.entries(hulls))for(const attr of ['hp','damage','shield','xp','speed'])SHIP_SKIN_ART_V138[`n132_${id}_${attr}`]=`${name}_${attr}`;
for(const country of ['br','us','jp','es','pt'])SHIP_SKIN_ART_V138[`n132_goliath_${country}`]=`leviathan_${country}`;
Object.freeze(SHIP_SKIN_ART_V138);
export function shipArtV138(ship,designId=null,{detail=false}={}){
 const key=String(designId||''),match=key.startsWith(`n132_${ship}_`)&&SHIP_SKIN_ART_V138[key];
 const name=match||SHIP_HULL_ART_V138[ship];
 return name?`/assets/v138/${detail?'hd':'map'}/ships/${name}.webp`:null;
}
export function droneArtV138(id,{detail=false}={}){
 const name=({flax:'drone_common',iris:'drone_elite'})[id]||id;
 return /^drone_(common|elite|[a-e])$/.test(name)?`/assets/v138/${detail?'hd':'map'}/drones/${name}.webp`:null;
}
