import { activeWeekendSlot, weekendRotationEnabled } from '../public/modules/weekend-events-v341.js';

const SAO_PAULO_OFFSET_MS=3*60*60*1000; // America/Sao_Paulo • UTC-3 em 2026.
function saoPauloClock(now=Date.now()){
  const localMs=now-SAO_PAULO_OFFSET_MS,d=new Date(localMs);
  return {localMs,offsetMs:SAO_PAULO_OFFSET_MS,day:d.getUTCDay(),year:d.getUTCFullYear(),month:d.getUTCMonth(),date:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes()};
}
function localTimeMinutes(value){
  const m=String(value||'').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);if(!m)return null;
  const h=Number(m[1]),min=Number(m[2]),sec=Number(m[3]||0);if(h<0||h>23||min<0||min>59||sec<0||sec>59)return null;
  return h*60+min+sec/60;
}
function cappedEventEnd(row,start,duration){
  let end=start+duration;const hardEnd=Date.parse(row?.ends_at||'');if(Number.isFinite(hardEnd))end=Math.min(end,hardEnd);return end;
}
function weeklyEventWindow(row,now,duration){
  const days=[...new Set((Array.isArray(row?.weekdays)?row.weekdays:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))];
  const timeMin=localTimeMinutes(row?.start_local_time);if(!days.length||timeMin==null)return null;
  const clock=saoPauloClock(now);
  for(const dayOffset of [0,-1]){
    const probe=new Date(clock.localMs+dayOffset*86400000),weekday=probe.getUTCDay();if(!days.includes(weekday))continue;
    const localStart=Date.UTC(probe.getUTCFullYear(),probe.getUTCMonth(),probe.getUTCDate())+Math.round(timeMin*60000);
    const start=localStart+clock.offsetMs,end=cappedEventEnd(row,start,duration);
    const hardEnd=Date.parse(row?.ends_at||'');if(Number.isFinite(hardEnd)&&start>=hardEnd)continue;
    if(now>=start&&now<end)return {start,end,slot:Math.floor(start/86400000)};
  }
  return null;
}
function buildEventPayload(row,start,end,slot){
  return {
    id:String(row.event_key||''),
    icon:String(row.icon||'✦'),
    name:String(row.name||row.event_key||'EVENTO'),
    desc:String(row.description||''),
    target:Math.max(1,Number(row.target)||1),
    reward:row.reward&&typeof row.reward==='object'?row.reward:{},
    rules:row.rules&&typeof row.rules==='object'?row.rules:{},
    priority:Number(row.priority)||100,
    start,end,slot,
    eventId:`v1817:${String(row.event_key||'event')}:${start}`
  };
}
export function resolveLiveEvent(rows, now=Date.now(), settings=null, manualOverride=null){
  const weekendMode=weekendRotationEnabled(rows,settings);
  const scheduled=weekendMode?activeWeekendSlot(rows,now,settings):null;
  // Interromper o calendário não pode reativar os ciclos antigos de 75 min.
  const manual=manualOverride&&typeof manualOverride==='object'?manualOverride:null;
  if(manual?.event_key){
    const chosen=(Array.isArray(rows)?rows:[]).find(row=>row.enabled!==false&&row.event_key===manual.event_key);
    const start=Date.parse(manual.start_at||''),end=Date.parse(manual.end_at||'');
    if(chosen&&Number.isFinite(start)&&Number.isFinite(end)&&now>=start&&now<end){
      return buildEventPayload(chosen,start,end,0);
    }
  }
  // Rotação semanal ocupa um único slot; eventos pontuais manuais são exceções.
  const pool=(Array.isArray(rows)?rows:[]).filter(row=>row?.enabled&&!(row.schedule_mode==='interval'&&row?.rules?.weekend_rotation===true)).sort((a,b)=>(Number(a.priority)||100)-(Number(b.priority)||100)||String(a.event_key||'').localeCompare(String(b.event_key||'')));
  const active=[];
  for(const row of pool){
    const duration=Math.max(1,Number(row.duration_minutes)||1)*60000,mode=String(row.schedule_mode||'interval');let window=null;
    if(mode==='weekly')window=weeklyEventWindow(row,now,duration);
    else if(mode==='once'){
      const start=Date.parse(row.starts_at||'');if(Number.isFinite(start)){const end=cappedEventEnd(row,start,duration);if(now>=start&&now<end)window={start,end,slot:0};}
    }else{
      const base=Date.parse(row.starts_at||''),repeat=Math.max(1,Number(row.repeat_minutes)||1)*60000,hardEnd=Date.parse(row?.ends_at||'');
      if(Number.isFinite(base)&&now>=base&&(!Number.isFinite(hardEnd)||now<hardEnd)){
        const cycle=Math.max(0,Math.floor((now-base)/repeat)),start=base+cycle*repeat,end=cappedEventEnd(row,start,duration);
        if(now>=start&&now<end)window={start,end,slot:cycle};
      }
    }
    if(window)active.push(buildEventPayload(row,window.start,window.end,window.slot));
  }
  // Eventos manuais/únicos têm precedência sobre a rotação automática.
  active.sort((a,b)=>a.priority-b.priority||a.start-b.start||a.id.localeCompare(b.id));
  if(active.length)return active[0];
  if(scheduled)return buildEventPayload(scheduled.row,scheduled.start,scheduled.end,scheduled.serial);
  return null;
}

