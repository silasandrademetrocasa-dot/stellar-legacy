// Pure render-only budget. Physics, damage, NPC ticks, reward and HUD data unchanged.
export function allowBackdropFilter({mobile=false,landscape=false,quality='medium'}={}){
 return quality!=='low' && !(mobile&&landscape&&quality==='medium');
}
export function renderFxCount(size,{mobile=false,quality='medium'}={}){
 const n=Math.max(0,Math.floor(Number(size)||0));
 const max=mobile?(quality==='low'?12:quality==='high'?32:24):quality==='low'?32:120; // V79: limite somente para FX cosméticos
 return Math.min(n,max);
}
