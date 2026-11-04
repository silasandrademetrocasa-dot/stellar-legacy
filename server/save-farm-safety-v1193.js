/** V119.3: HTTP guard only. SQL claim v1111 remains the sole economic authority. */
export function createFarmClaimGateV1193(){
  const active = new Set();
  return {
    enter(userId){
      const key=String(userId||'');
      if(!key||active.has(key))return false;
      active.add(key);return true;
    },
    leave(userId){active.delete(String(userId||''));},
    count(){return active.size;}
  };
}
export function isFarmConfirmedV1193(method,data){
  if(!data||data.ok===false||data.error)return false;
  if(method==='claim')return data.ok===true&&data.status==='settled';
  if(method==='cancel')return data.status==='cancelled';
  return method==='start'&&data.status==='running';
}
export function farmCrossesUtcDayV1193(start,end){
  const from=Date.parse(start),to=Date.parse(end);
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<from)return false;
  return new Date(from).toISOString().slice(0,10)!==new Date(to).toISOString().slice(0,10);
}
