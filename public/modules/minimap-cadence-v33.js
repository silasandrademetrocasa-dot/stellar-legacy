// V33: the radar is independent from combat / movement rendering.
// Throttle only radar repaints on low-power devices; tapping the radar still navigates immediately.
export function minimapPaintInterval({mobile=false,landscape=false,quality='medium',inCombat=false}={}){
  if(!mobile)return quality==='low'?180:0;
  if(!landscape)return quality==='low'?180:100;
  if(quality==='low')return 180;
  if(quality==='medium')return inCombat?140:120;
  return inCombat?120:100;
}
