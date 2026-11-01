/* V116.1: pure safety policies. No account, credit or item mutation here. */
export const BASE_TRADE_TIMEOUT_V116=30000;
export function baseCommerceWaitV116({atBase=false,remote=false,busy=false,startedAt=0,now=0,hold=false}={}){
  if(!atBase||remote||hold||!busy)return false;
  return startedAt>0&&now>=startedAt&&now-startedAt<BASE_TRADE_TIMEOUT_V116;
}
export function nextRouteCooldownV116(misses=0){
  const n=Math.max(0,Math.floor(Number(misses)||0));
  return n<8?2400:Math.min(60000,10000+Math.min(10,n-8)*5000);
}
export function baseTradeVisibleV116({connected=false,map='',ownTerritory=false,safeZone=false,jumping=false,astral=false}={}){
  return connected&&['x1','x8'].includes(map)&&ownTerritory&&safeZone&&!jumping&&!astral;
}
export function routeWatchdogExpiredV116({map='',goal='',lastMovementAt=0,now=0,enabled=true}={}){
  return !!enabled&&!!goal&&map!==goal&&lastMovementAt>0&&now-lastMovementAt>=120000;
}
