import {shipArtV138} from './entity-art-v138.js';
const npcIds=new Set(['natalFloco','natalNevasca','natalGlacial','natalRei']);
// Stateless paths shared by all imports. No duplicate atlas caches or runtime crops.
export async function prepareChristmasArt(){}
export const shipChristmasArt=(ship,designId=null)=>shipArtV138(ship,designId,{detail:true});
export const npcChristmasArt=type=>npcIds.has(type)?`/assets/v138/map/natal/${type}.webp`:null;
export const boxChristmasArt=()=>'/assets/v138/map/natal/box.webp';
export const fireworkChristmasArt=()=>'/assets/v138/map/natal/firework.webp';
