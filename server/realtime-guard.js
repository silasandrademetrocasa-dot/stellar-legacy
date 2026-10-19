// Lightweight anti-flood policy. Never changes attack damage, inventory or SQL state.
export function socketMessageAllowed(socket, now=Date.now(), maxPerSecond=80){
  if(!socket || !Number.isFinite(now))return false;
  const windowAt=Number(socket._stellarBudgetAt)||0;
  if(now-windowAt>=1000 || now<windowAt){socket._stellarBudgetAt=now;socket._stellarBudgetCount=0;}
  socket._stellarBudgetCount=(Number(socket._stellarBudgetCount)||0)+1;
  return socket._stellarBudgetCount<=maxPerSecond;
}
export function boundedVital(value,{fallback=0,max=1e12,min=0}={}){
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
