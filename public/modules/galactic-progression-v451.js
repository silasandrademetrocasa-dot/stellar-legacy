// V45.1: shared progression defaults. The live Supabase world catalog can override these tiers.
// All three factions share the same tiers; 4-X is optional PvP and never required for PvE.
export const GALACTIC_PVE_LEVELS_V451=Object.freeze({x1:1,x2:3,x3:5,x4:7,x5:9,x6:12,x7:15,x8:18,u1:20,u2:21,u3:22});
export const GALACTIC_PVP_LEVEL_V451=15;
export const GALACTIC_HOME_PVP_V451=Object.freeze({'1-1':'4-1','2-1':'4-2','3-1':'4-3'});
export function galacticLevelV451(label){
 const value=String(label||'');
 if(/^4-[123]$/.test(value))return GALACTIC_PVP_LEVEL_V451;
 if(/^U-[123]$/.test(value))return GALACTIC_PVE_LEVELS_V451['u'+value.slice(-1)];
 const m=/^([123])-([1-8])$/.exec(value);return m?GALACTIC_PVE_LEVELS_V451['x'+m[2]]:null;
}
export function applyGalacticProgressionV451(maps){
 if(!maps||typeof maps!=='object')return maps;
 for(const [id,level] of Object.entries(GALACTIC_PVE_LEVELS_V451))if(maps[id])maps[id].minLevel=level;
 return maps;
}
export const GALACTIC_CANONICAL_ROUTES_V451=Object.freeze([
 ['1-1','4-1'],['2-1','4-2'],['3-1','4-3'],
 ...['1','2','3'].map(f=>[`${f}-4`,`${f}-5`]),
]);
