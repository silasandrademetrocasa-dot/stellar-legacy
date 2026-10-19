// Pure render-only budget. Physics, damage, NPC ticks, reward and HUD data unchanged.
export function allowBackdropFilter({mobile=false,landscape=false,quality='medium'}={}){
 return quality!=='low' && !(mobile&&landscape&&quality==='medium');
}
export function renderFxCount(size,{mobile=false,quality='medium'}={}){
 const n=Math.max(0,Math.floor(Number(size)||0));
 const max=quality==='low'?48:mobile?(quality==='high'?120:86):200;
 return Math.min(n,max);
}
