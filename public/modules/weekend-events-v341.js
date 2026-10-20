// Stellar Legacy V34.4.3 — Agenda de eventos dirigida pelo Supabase.
// Mantém os oito slots da V34.4.3 como fallback para migração segura.
export const WEEKEND_SLOT_HOURS=Object.freeze([11,14,17,20]);
export const WEEKEND_EVENT_DURATION_MS=120*60*1000;
const HOUR_MS=3600000, DAY_MS=86400000, SP_OFFSET_MS=3*HOUR_MS;
const EPOCH_SATURDAY_DATE=Date.UTC(2026,9,24),WEEK_MS=7*DAY_MS;
const DEFAULT_SLOTS=Object.freeze([6,0].flatMap(day=>WEEKEND_SLOT_HOURS.map(hour=>Object.freeze({day,start:String(hour).padStart(2,'0')+':00',duration:120}))));
export const WEEKEND_DEFAULT_SETTINGS=Object.freeze({enabled:true,timezone:'America/Sao_Paulo',slots:DEFAULT_SLOTS});
const toMinute=value=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value||''));return m?Number(m[1])*60+Number(m[2]):null;};
export function validateWeekendSettings(settings){
  if(!settings||!Array.isArray(settings.slots)||settings.slots.length<1||settings.slots.length>16)throw new Error('A agenda precisa de 1 a 16 horários.');
  const slots=settings.slots.map(raw=>{
    const day=Number(raw?.day),start=String(raw?.start||''),duration=Number(raw?.duration),at=toMinute(start);
    if(!Number.isInteger(day)||day<0||day>6||at==null||!Number.isInteger(duration)||duration<15||duration>360||at+duration>1440)throw new Error('Dia, horário ou duração inválidos. Use 15 a 360 minutos e termine antes da meia-noite.');
    return {day,start,duration,minute:at};
  }).sort((a,b)=>(a.day===6?0:a.day===0?1:a.day+1)-(b.day===6?0:b.day===0?1:b.day+1)||a.minute-b.minute);
  const byDay=new Map();
  for(const s of slots){const last=byDay.get(s.day)||0;if(s.minute<last)throw new Error('Os horários do mesmo dia não podem se sobrepor.');byDay.set(s.day,s.minute+s.duration);}
  return {enabled:settings.enabled!==false,timezone:'America/Sao_Paulo',slots:slots.map(({day,start,duration})=>({day,start,duration}))};
}
export function weekendSchedule(settings){
  try{return validateWeekendSettings(settings||WEEKEND_DEFAULT_SETTINGS);}catch{return validateWeekendSettings(WEEKEND_DEFAULT_SETTINGS);}
}
export function weekendRotationRows(rows){return (Array.isArray(rows)?rows:[]).filter(r=>r?.enabled!==false&&r?.rules?.weekend_rotation===true&&r?.schedule_mode==='interval').sort((a,b)=>(Number(a.priority)||100)-(Number(b.priority)||100)||String(a.event_key||'').localeCompare(String(b.event_key||'')));}
export function weekendRotationEnabled(rows,settings=null){return settings?.enabled!==false&&weekendRotationRows(rows).length>0;}
function slotForDay(localDay,weekIndex,index,rows,config){
  const slot=config.slots[index];
  const weekday=new Date(localDay).getUTCDay();if(weekday!==slot.day)return null;
  const serial=weekIndex*config.slots.length+index,row=rows[((serial%rows.length)+rows.length)%rows.length];
  const start=localDay+toMinute(slot.start)*60000+SP_OFFSET_MS;
  return {event_key:String(row.event_key),name:String(row.name||row.event_key),icon:String(row.icon||'✦'),start,end:start+slot.duration*60000,serial,weekIndex,dayIndex:weekday===6?0:weekday===0?1:weekday+1,slotIndex:index,row};
}
function weekIndexForDay(dayMs){const dow=new Date(dayMs).getUTCDay(),daysSinceSat=(dow+1)%7,sat=dayMs-daysSinceSat*DAY_MS;return Math.floor((sat-EPOCH_SATURDAY_DATE)/WEEK_MS);}
export function activeWeekendSlot(sourceRows,now=Date.now(),settings=null){
  const rows=weekendRotationRows(sourceRows),config=weekendSchedule(settings);if(!rows.length||!config.enabled)return null;
  const localDay=Math.floor((now-SP_OFFSET_MS)/DAY_MS)*DAY_MS,weekIndex=weekIndexForDay(localDay);if(weekIndex<0)return null;
  for(let i=0;i<config.slots.length;i++){const slot=slotForDay(localDay,weekIndex,i,rows,config);if(slot&&now>=slot.start&&now<slot.end)return slot;}return null;
}
export function upcomingWeekendSlots(sourceRows,now=Date.now(),limit=8,settings=null){
  const rows=weekendRotationRows(sourceRows),config=weekendSchedule(settings);if(!rows.length||!config.enabled)return [];
  const localDay=Math.floor((now-SP_OFFSET_MS)/DAY_MS)*DAY_MS,items=[];
  for(let d=0;d<=35&&items.length<limit;d++){const dayMs=localDay+d*DAY_MS,weekIndex=weekIndexForDay(dayMs);if(weekIndex<0)continue;for(let i=0;i<config.slots.length&&items.length<limit;i++){const slot=slotForDay(dayMs,weekIndex,i,rows,config);if(slot&&slot.end>now)items.push(slot);}}
  return items;
}
export function weekendSlotSignature(slot){return slot?`v1817:${slot.event_key}:${slot.start}`:null;}
