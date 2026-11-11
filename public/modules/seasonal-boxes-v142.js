// Shared density policy; rewards and ownership are always decided by the server.
export function boxTargetV142(config,mapId,{gate=false,seasonActive=false}={}){
 if(gate||! /^(?:x[1-8]|u[1-3]|b4[1-3])$/.test(String(mapId)))return 0;
 const n=Math.max(0,Math.min(100,Math.floor(Number(config?.map_counts?.[mapId])||0)));
 return seasonActive?(n||20):n;
}
export function christmasCoresV142(rng){const roll=rng();return roll<.01?2:roll<.05?1:0;}
