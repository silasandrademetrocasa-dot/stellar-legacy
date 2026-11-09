import test from 'node:test';
import assert from 'node:assert/strict';
import {continuousEventV135,manualOverrideActiveV135} from '../server/event-rotation-v135.js';
const h=3600000,start=Date.parse('2026-11-09T03:00:00Z');
const roster=['invasion','prime','mining','convoy','battle'].map(event_key=>({event_key,name:event_key,enabled:true}));
test('V135: seven days have exactly one event every minute and no overlaps',()=>{
 for(let i=0;i<7*24*60;i+=1){const now=start+i*60000,ev=continuousEventV135(roster,now,{christmasEnabled:true});assert.ok(ev,`no event at ${new Date(now)}`);assert.ok(ev.start<=now&&now<ev.end);assert.equal(ev.end-ev.start,ev.rules.christmas?h:3*h);}
});
test('V135: 14-day timeline starts each São Paulo Monday at midnight',()=>{
 assert.equal(continuousEventV135(roster,start-1),null);
 assert.ok(continuousEventV135(roster,start+3*h).rules.christmas);
 const secondWeek=start+7*24*h;
 for(let t=secondWeek;t<secondWeek+7*24*h;t+=h){const ev=continuousEventV135(roster,t);assert.ok(ev.rules.christmas&&ev.rules.festival);}
 assert.ok(!continuousEventV135(roster,secondWeek+7*24*h).rules.festival);
});
test('V135: disabled Christmas fills interval with regular event',()=>{
 assert.ok(!continuousEventV135(roster,start+3.5*h,{christmasEnabled:false}).rules.christmas);
});
test('V135: explicit ADM override window respected',()=>{
 const o={event_key:'invasion',start_at:new Date(start).toISOString(),end_at:new Date(start+h).toISOString()};
 assert.ok(manualOverrideActiveV135(o,start));assert.ok(!manualOverrideActiveV135(o,start+h));
});
