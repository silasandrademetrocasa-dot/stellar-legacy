import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weekendSchedule,validateWeekendSettings,upcomingWeekendSlots,activeWeekendSlot} from '../public/modules/weekend-events-v341.js';
import {resolveLiveEvent} from '../server/live-event-scheduler-v341.js';
import {eventControlProfile} from '../public/modules/event-control-profile-v3411.js';
import {weekendCenterHtml} from '../public/modules/event-control-ui-v3411.js';
const names=['invasion','prime','mining','convoy','battle'];
const events=names.map((event_key,i)=>({event_key,name:event_key,priority:10*(i+1),enabled:true,schedule_mode:'interval',target:15,reward:{credits:100,xp:10,uridium:2,cores:0},rules:{weekend_rotation:true}}));
const at=x=>Date.parse(x);
test('V34.4.2 mantém oito horários padrão e rotação preexistente',()=>{
 const c=weekendSchedule(); assert.equal(c.slots.length,8);
 assert.equal(activeWeekendSlot(events,at('2026-10-24T14:00:00Z'),c)?.event_key,'invasion');
 assert.equal(activeWeekendSlot(events,at('2026-10-31T14:00:00Z'),c)?.event_key,'convoy');
});
test('ADM muda horários, dias e duração, preservando ordem entre semanas',()=>{
 const config=validateWeekendSettings({enabled:true,slots:[{day:6,start:'10:00',duration:90},{day:6,start:'12:00',duration:60},{day:0,start:'20:00',duration:150}]});
 const future=upcomingWeekendSlots(events,at('2026-10-23T15:00:00Z'),6,config);
 assert.equal(future.length,6);assert.deepEqual(future.slice(0,3).map(e=>e.event_key),['invasion','prime','mining']);
 assert.deepEqual(future.slice(3,6).map(e=>e.event_key),['convoy','battle','invasion']);
 assert.equal(future[0].end-future[0].start,90*60000);
 assert.equal(activeWeekendSlot(events,at('2026-10-24T14:20:00Z'),config)?.event_key,'invasion');
 assert.equal(activeWeekendSlot(events,at('2026-10-24T15:30:00Z'),config)?.event_key,'prime');
 assert.equal(activeWeekendSlot(events,at('2026-10-24T17:30:00Z'),config),null);
});
test('ADM rejeita sobreposição, meia-noite e data fora dos limites',()=>{
 assert.throws(()=>validateWeekendSettings({slots:[{day:6,start:'11:00',duration:120},{day:6,start:'12:00',duration:60}]}),/sobrepor/);
 assert.throws(()=>validateWeekendSettings({slots:[{day:0,start:'23:30',duration:120}]}),/inválidos/);
 assert.throws(()=>validateWeekendSettings({slots:[{day:8,start:'12:00',duration:90}]}),/inválidos/);
});
test('Desligar agenda não revive intervalos legados de 75 min',()=>{
 const config={enabled:false,slots:[{day:6,start:'11:00',duration:120}]};
 assert.equal(resolveLiveEvent(events,at('2026-10-24T14:00:00Z'),config),null);
 assert.equal(resolveLiveEvent(events,at('2026-10-26T14:00:00Z'),config),null);
});
test('Evento manual substitui rotação e devolve agenda após expirar',()=>{
 const c=weekendSchedule(),now=at('2026-10-24T14:10:00Z');
 const manual={event_key:'prime',start_at:new Date(now).toISOString(),end_at:new Date(now+45*60000).toISOString()};
 const during=resolveLiveEvent(events,now+2*60000,c,manual);
 assert.equal(during.id,'prime');assert.equal(during.eventId,`v1817:prime:${now}`);
 assert.equal(resolveLiveEvent(events,now+46*60000,c,manual)?.id,'invasion');
});
test('Ondas aplicam somente os limites seguros, sem mudar drops',()=>{
 const before={mode:'wave',waveCount:8,rewardMult:1.22};
 assert.equal(eventControlProfile(before,{wave_count:4,wave_interval_ms:9000}).waveCount,4);
 assert.equal(eventControlProfile(before,{wave_interval_ms:9000},true).waveRespawnMs,9);
 assert.equal(eventControlProfile(before,{wave_count:100,irrelevant:200}).waveCount,8);
 assert.equal(eventControlProfile(before,{wave_count:5}).rewardMult,1.22);
});
test('Editor apresenta controles, agenda, preview e exceção manual sem inserir HTML cru',()=>{
 const html=weekendCenterHtml({events:[{...events[0],name:'<script>alert(1)</script>'}],weekend_settings:weekendSchedule()});
 assert.match(html,/data-central-save-settings/);assert.match(html,/data-central-preview/);
 assert.match(html,/data-central-manual-start/);assert.match(html,/data-central-save-event/);
 assert.doesNotMatch(html,/<script>/);
});
test('SQL valida administrador, resgates e sincronização entre servidor e banco',()=>{
 const sql=readFileSync(new URL('../sql/V34_1_1_EVENT_CONTROL_CENTER.sql',import.meta.url),'utf8');
 for(const name of ['admin_set_weekend_settings_v3411','admin_set_weekend_event_v3411','admin_set_manual_event_v3411','weekend_event_slot_v341','record_my_galaxy_event_progress_v1826','is_game_admin_v1763'])assert.ok(sql.includes(name),name);
 assert.match(sql,/weekend_key<>k/);assert.match(sql,/row_ev\.rewarded/);assert.match(sql,/COMMIT;/);
 const server=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
 assert.match(server,/world\.liveOps\?\.weekend_settings/);assert.match(server,/world\.liveOps\?\.manual_override/);
});

test('Editor de ondas liga valores editados à espera efetiva de ondas no mundo',()=>{
 const server=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(server,/alive<minimum&&\(!profile\.waveRespawnMs\|\|now>=this\.nextEventWaveAt\)/);
 assert.match(game,/profile\.waveRespawnMs\|\|nowSec\(\)>=galaxyEventRuntime\.nextWaveAt/);
});
