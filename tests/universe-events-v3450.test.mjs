import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eventStage,eventStageTuning,bossCombatTuning} from '../public/modules/event-evolution-v345.js';
import {eventControlProfile} from '../public/modules/event-control-profile-v3411.js';
import {weekendSchedule,activeWeekendSlot} from '../public/modules/weekend-events-v341.js';
import {weekendCenterHtml} from '../public/modules/event-control-ui-v3411.js';

const root=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const event={start:Date.parse('2026-10-24T14:00:00Z'),end:Date.parse('2026-10-24T16:00:00Z')};
test('V34.5: quatro etapas dividem 120 min sem ultrapassar o evento',()=>{
 const base=event.start;
 assert.deepEqual([0,29,30,59,60,89,90,119].map(m=>eventStage(event,base+m*60000).number),[1,1,2,2,3,3,4,4]);
 assert.equal(eventStage(event,event.end).number,4);
 assert.equal(eventStage(event,event.start-1).number,1);
 assert.equal(eventStage(event,event.start+5000).total,4);
 assert.equal(eventStage(event,event.start+5000,2).total,2);
 assert.equal(eventStage(event,event.start+5000,2).label,'RECONHECIMENTO');
});
test('V34.5: duração variável e evento manual recebem os mesmos estágios',()=>{
 const short={start:1000,end:61000};
 assert.equal(eventStage(short,31000).number,3);
 assert.equal(eventStage(short,31000,1).number,1);
 assert.equal(eventStage({start:10,end:10},10).number,1);
 assert.equal(eventStage({start:'bad'},Date.now()).number,1);
});
test('V34.5: limites seguros para ondas, elites, minérios e comboios',()=>{
 const profile=eventControlProfile({waveCount:10,oreCount:18},{phase_count:4,wave_growth:3,elite_patrols:2,boss_escorts:3,ore_growth:8,convoy_speed_pct:140});
 assert.deepEqual([0,1,2,3].map(index=>eventStageTuning(profile,{index}).waveTarget),[10,12,12,12]);
 assert.deepEqual([0,1,2,3].map(index=>eventStageTuning(profile,{index}).oreTarget),[18,26,28,28]);
 assert.equal(eventStageTuning(profile,{index:0}).eliteCount,0);
 assert.equal(eventStageTuning(profile,{index:1}).eliteCount,2);
 assert.equal(eventStageTuning(profile,{index:3}).bossEscortCount,3);
 assert.equal(eventStageTuning(profile,{index:3}).convoySpeedScale,1.4);
 assert.equal(eventStageTuning({waveCount:99,oreCount:99,waveGrowth:99,oreGrowth:99},{index:99}).waveTarget,12);
});
test('V34.5: controles inválidos não alteram o perfil salvo nem drops',()=>{
 const base={waveCount:6,oreCount:12,rewardMult:1.22};
 const p=eventControlProfile(base,{phase_count:0,wave_growth:10,boss_escorts:9,ore_growth:-1,convoy_speed_pct:300});
 assert.equal(p.phaseCount,undefined);assert.equal(p.waveGrowth,undefined);assert.equal(p.rewardMult,1.22);
 assert.equal(eventStageTuning(p,{index:3}).waveTarget,9);
 assert.equal(eventStageTuning(p,{index:3}).oreTarget,18);
});
test('V34.5: boss RIFT e TITAN possuem progressão diferente',()=>{
 assert.deepEqual(bossCombatTuning('prime',0),{speed:1,damage:1,attackDelay:1});
 assert.ok(bossCombatTuning('prime',2).speed>bossCombatTuning('titan_assault',2).speed);
 assert.ok(bossCombatTuning('titan_assault',2).damage>bossCombatTuning('prime',2).damage);
});
test('V34.5: rotação de fim de semana permanece intacta',()=>{
 const events=['invasion','prime','mining','convoy','battle'].map((event_key,i)=>({event_key,name:event_key,priority:i+1,enabled:true,schedule_mode:'interval',rules:{weekend_rotation:true}}));
 const slot=activeWeekendSlot(events,Date.parse('2026-10-24T14:30:00Z'),weekendSchedule());
 assert.equal(slot.event_key,'invasion');assert.equal(slot.start,Date.parse('2026-10-24T14:00:00Z'));
 assert.equal(activeWeekendSlot(events,Date.parse('2026-10-26T14:30:00Z'),weekendSchedule()),null);
});
test('V34.5: ADM expõe campos de evolução e é protegido por is_game_admin',()=>{
 const ev={event_key:'prime',enabled:true,priority:20,target:1,name:'Anomalia Prime',rules:{weekend_rotation:true},reward:{credits:1,xp:1,uridium:1,cores:0}};
 const html=weekendCenterHtml({events:[ev],weekend_settings:weekendSchedule()});
 for(const key of ['phase_count','wave_growth','elite_patrols','boss_escorts','ore_growth','convoy_speed_pct'])assert.match(html,new RegExp('data-central-event-field="'+key+'"'));
 const game=root('public/game.js'),sql=root('sql/V34_5_0_EVENT_EVOLUTION_ADMIN.sql');
 for(const key of ['phase_count','wave_growth','elite_patrols','boss_escorts','ore_growth','convoy_speed_pct']){
  assert.ok(game.includes('v(\''+key+'\')'),key);
  assert.ok(sql.includes("'"+key+"'"),key);
 }
 assert.match(sql,/is_game_admin_v1763/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.admin_set_weekend_event_v3411/);
 assert.match(sql,/\bCOMMIT;/);
 assert.doesNotMatch(sql,/\bUPDATE\s+public\.game_saves\b/i);
});
test('V34.5: servidor limita reforços e conserva validação de dano',()=>{
 const world=root('server/world.js');
 assert.match(world,/stage\.index!==this\.lastEventStageIndex/);
 assert.match(world,/Math\.min\(3,wanted-alive\)/);
 assert.match(world,/bossPhase/);
 assert.match(world,/admitNpcDamage/);
 assert.match(world,/this\.event\?\.eventId===e\.eventId/);
 assert.match(world,/rarePatrol/);
 assert.match(world,/PATRULHA RARA/);
 assert.match(world,/this\.world\.grantNpcReward/);
});
