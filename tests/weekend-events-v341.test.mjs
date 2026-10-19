import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeWeekendSlot,upcomingWeekendSlots,weekendSlotSignature,weekendRotationRows} from '../public/modules/weekend-events-v341.js';
import {resolveLiveEvent} from '../server/live-event-scheduler-v341.js';
const names=['invasion','prime','mining','convoy','battle'];
const rows=names.map((id,i)=>({event_key:id,name:id,priority:(i+1)*10,enabled:true,schedule_mode:'interval',duration_minutes:120,rules:{weekend_rotation:true}}));
const t=x=>Date.parse(x);
test('fim de semana São Paulo: quatro eventos de duas horas com pausas de uma hora',()=>{
  assert.equal(activeWeekendSlot(rows,t('2026-10-24T13:59:59Z')),null);
  assert.equal(activeWeekendSlot(rows,t('2026-10-24T14:00:00Z'))?.event_key,'invasion');
  assert.equal(activeWeekendSlot(rows,t('2026-10-24T15:59:59Z'))?.event_key,'invasion');
  assert.equal(activeWeekendSlot(rows,t('2026-10-24T16:00:00Z')),null);
  assert.equal(activeWeekendSlot(rows,t('2026-10-24T17:00:00Z'))?.event_key,'prime');
  assert.equal(activeWeekendSlot(rows,t('2026-10-24T20:00:00Z'))?.event_key,'mining');
  assert.equal(activeWeekendSlot(rows,t('2026-10-24T23:00:00Z'))?.event_key,'convoy');
  assert.equal(activeWeekendSlot(rows,t('2026-10-25T14:00:00Z'))?.event_key,'battle');
  assert.equal(activeWeekendSlot(rows,t('2026-10-26T14:00:00Z')),null);
});

test('a rotação continua no fim de semana seguinte sem reiniciar no Rift',()=>{
  assert.equal(activeWeekendSlot(rows,t('2026-10-31T14:00:00Z'))?.event_key,'convoy');
  assert.equal(activeWeekendSlot(rows,t('2026-11-01T23:00:00Z'))?.event_key,'invasion');
  assert.equal(weekendSlotSignature(activeWeekendSlot(rows,t('2026-10-24T14:00:00Z'))),'v1817:invasion:1792850400000');
});
test('não cria eventos entre slots e omite evento desativado na fila',()=>{
  const shorter=rows.map(r=>r.event_key==='prime'?{...r,enabled:false}:r);
  assert.equal(weekendRotationRows(shorter).length,4);
  assert.equal(activeWeekendSlot(shorter,t('2026-10-24T17:00:00Z'))?.event_key,'mining');
  assert.equal(activeWeekendSlot(rows,t('2026-10-25T01:00:00Z')),null); // sábado 22h local
});
test('agenda futura lista oito horários com intervalos e sábado/domingo',()=>{
  const upcoming=upcomingWeekendSlots(rows,t('2026-10-19T20:00:00Z'),8);
  assert.equal(upcoming.length,8);
  assert.deepEqual(upcoming.map(x=>x.event_key),['invasion','prime','mining','convoy','battle','invasion','prime','mining']);
  assert.ok(upcoming.every(x=>x.end-x.start===7200000));
  assert.equal(upcoming[1].start-upcoming[0].end,3600000);
});
test('migration mantém recompensa protegida e preserva ordem dos 5 tipos',()=>{
  const sql=readFileSync(new URL('../sql/V34_1_0_GALACTIC_WEEKEND_EVENTS.sql',import.meta.url),'utf8');
  assert.match(sql,/weekend_event_slot_v341/);
  assert.match(sql,/record_my_galaxy_event_progress_v1826/);
  assert.match(sql,/weekend_key<>k/);
  assert.match(sql,/weekend_rotation/);
  assert.match(sql,/COMMIT;/);
});

test('o servidor usa o mesmo slot do calendário e mantém eventId para o validador',()=>{
  const utc=t('2026-10-24T14:33:00Z');
  const ev=resolveLiveEvent(rows,utc),slot=activeWeekendSlot(rows,utc);
  assert.equal(ev.eventId,weekendSlotSignature(slot));
  assert.equal(ev.start,slot.start);
  assert.equal(ev.end,slot.end);
  assert.equal(ev.id,'invasion');
  assert.equal(resolveLiveEvent(rows,t('2026-10-26T14:00:00Z')),null);
  assert.equal(resolveLiveEvent(rows,t('2026-10-24T16:44:00Z')),null);
});
test('evento único manual tem precedência sobre rotação e não modifica eventos ativos',()=>{
  const manual={event_key:'special_manual',name:'ESPECIAL',priority:1,enabled:true,schedule_mode:'once',starts_at:'2026-10-24T14:00:00Z',duration_minutes:30,reward:{credits:1},rules:{}};
  assert.equal(resolveLiveEvent([...rows,manual],t('2026-10-24T14:20:00Z'))?.id,'special_manual');
  assert.equal(resolveLiveEvent([...rows,manual],t('2026-10-24T14:40:00Z'))?.id,'invasion');
});
