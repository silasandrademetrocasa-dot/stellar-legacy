// V135.0: deterministic São Paulo (UTC-3) event director, no DB writes and no client timers.
// 3h regular + 1h Christmas, six cycles/day; 16-22 Nov Christmas Festival all day.
// The currently configured event definitions (names, rewards, rules, enabled) are authoritative.
import {isChristmas,SEASON} from '../public/modules/christmas-v132.js';

const DAY=86400000, HOUR=3600000;
const START=Date.parse('2026-11-09T03:00:00Z'); // Monday 00:00 São Paulo
const FESTIVAL_START=Date.parse('2026-11-16T03:00:00Z');
const FESTIVAL_END=Date.parse('2026-11-23T03:00:00Z');
const ROSTER=['invasion','prime','mining','convoy','battle'];
const NATAL_MAPS=['x4','b41','b42','b43'];

export function manualOverrideActiveV135(v,now=Date.now()){
 if(!v?.event_key)return false;
 const from=Date.parse(v.start_at||''),to=Date.parse(v.end_at||'');
 return Number.isFinite(from)&&Number.isFinite(to)&&now>=from&&now<to;
}
function mainPayload(row,start,end){
 return {id:String(row.event_key),icon:String(row.icon||'✦'),name:String(row.name||row.event_key),
  desc:String(row.description||''),target:Math.max(1,Number(row.target)||1),reward:row.reward&&typeof row.reward==='object'?row.reward:{},
  rules:row.rules&&typeof row.rules==='object'?row.rules:{},start,end,priority:Number(row.priority)||100,
  eventId:`v135:${row.event_key}:${start}`};
}
function natalPayload(start,end,map,festival){
 return {id:festival?'natal_festival_v135':'natal_intervalo_v135',name:festival?'FESTIVAL NATALINO • SEMANA ESPECIAL':'NATAL • INVASÃO DO INVERNO',
  icon:'❄',desc:festival?'Natal especial durante sete dias, 24h por dia • setor rotativo':'Invasão do Inverno nos intervalos dos eventos diários',
  start,end,eventId:`${SEASON}:v135:${festival?'festival':'interval'}:${start}:${map}`,target:999999,reward:{},
  rules:{christmas:true,map,season:SEASON,festival}};
}
export function continuousEventV135(rows,now=Date.now(),{christmasEnabled=true}={}){
 if(!Number.isFinite(now)||now<START)return null;
 const dayIndex=Math.floor((now-START)/DAY),dayStart=START+dayIndex*DAY;
 const slot=Math.floor((now-dayStart)/(4*HOUR)),slotStart=dayStart+slot*4*HOUR;
 const natalReady=!!christmasEnabled&&isChristmas(now);
 const festival=natalReady&&now>=FESTIVAL_START&&now<FESTIVAL_END;
 const enabled=(Array.isArray(rows)?rows:[]).filter(r=>r?.enabled!==false&&ROSTER.includes(String(r?.event_key||'')));
 const roster=ROSTER.map(id=>enabled.find(x=>x.event_key===id)).filter(Boolean);
 if(festival){const map=NATAL_MAPS[(dayIndex*6+slot)%NATAL_MAPS.length];return natalPayload(slotStart,slotStart+4*HOUR,map,true);}
 const mainEnd=slotStart+(natalReady?3:4)*HOUR;
 if(now>=mainEnd&&natalReady){
  const map=NATAL_MAPS[(dayIndex*6+slot)%NATAL_MAPS.length];
  return natalPayload(mainEnd,slotStart+4*HOUR,map,false);
 }
 if(!roster.length)return natalReady?natalPayload(slotStart,mainEnd,'x4',false):null;
 const row=roster[(dayIndex*6+slot)%roster.length];
 return mainPayload(row,slotStart,mainEnd);
}
