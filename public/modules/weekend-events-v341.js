// Stellar Legacy • V34.1.0 • horário oficial America/Sao_Paulo.
// Brasil utiliza UTC-3 sem horário de verão desde 2019. A origem da rotação
// é sábado 24/10/2026; sequências persistem entre fins de semana e restarts.
export const WEEKEND_SLOT_HOURS=Object.freeze([11,14,17,20]);
export const WEEKEND_EVENT_DURATION_MS=120*60*1000;
const HOUR_MS=3600000, DAY_MS=86400000, SP_OFFSET_MS=3*HOUR_MS;
const EPOCH_SATURDAY_DATE=Date.UTC(2026,9,24);
const WEEK_MS=7*DAY_MS;

export function weekendRotationRows(rows){
  return (Array.isArray(rows)?rows:[])
    .filter(row=>row?.enabled!==false && row?.rules?.weekend_rotation===true && row?.schedule_mode==='interval')
    .sort((a,b)=>(Number(a.priority)||100)-(Number(b.priority)||100)||String(a.event_key||'').localeCompare(String(b.event_key||'')));
}
export function weekendRotationEnabled(rows){
  return weekendRotationRows(rows).length>0;
}
function slotForDay(localDay,dayIndex,slotIndex,rows){
  const saturdayDate=localDay-(dayIndex===1?DAY_MS:0);
  const weekIndex=Math.floor((saturdayDate-EPOCH_SATURDAY_DATE)/WEEK_MS);
  if(weekIndex<0)return null;
  const serial=weekIndex*8+dayIndex*4+slotIndex;
  const row=rows[((serial%rows.length)+rows.length)%rows.length];
  const start=localDay+WEEKEND_SLOT_HOURS[slotIndex]*HOUR_MS+SP_OFFSET_MS;
  return {event_key:String(row.event_key),name:String(row.name||row.event_key),icon:String(row.icon||'✦'),start,end:start+WEEKEND_EVENT_DURATION_MS,serial,weekIndex,dayIndex,slotIndex,row};
}
export function activeWeekendSlot(sourceRows,now=Date.now()){
  const rows=weekendRotationRows(sourceRows);if(!rows.length)return null;
  const localNow=now-SP_OFFSET_MS,dayMs=Math.floor(localNow/DAY_MS)*DAY_MS,day=new Date(dayMs).getUTCDay();
  if(day!==6&&day!==0)return null;
  for(let index=0;index<4;index++){
    const slot=slotForDay(dayMs,day===6?0:1,index,rows);
    if(slot&&now>=slot.start&&now<slot.end)return slot;
  }
  return null;
}
export function upcomingWeekendSlots(sourceRows,now=Date.now(),limit=8){
  const rows=weekendRotationRows(sourceRows);if(!rows.length)return [];
  const localNow=now-SP_OFFSET_MS,localDay=Math.floor(localNow/DAY_MS)*DAY_MS;
  const items=[];
  for(let dayOffset=0;dayOffset<=17&&items.length<limit;dayOffset++){
    const dayMs=localDay+dayOffset*DAY_MS,dow=new Date(dayMs).getUTCDay();
    if(dow!==6&&dow!==0)continue;
    for(let index=0;index<4&&items.length<limit;index++){
      const slot=slotForDay(dayMs,dow===6?0:1,index,rows);
      if(slot&&slot.end>now)items.push(slot);
    }
  }
  return items;
}
export function weekendSlotSignature(slot){return slot?`v1817:${slot.event_key}:${slot.start}`:null;}
