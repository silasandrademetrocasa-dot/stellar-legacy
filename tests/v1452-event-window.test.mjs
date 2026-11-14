import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
import {continuousEventV135} from '../server/event-rotation-v135.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const keys=['invasion','prime','mining','convoy','battle'];
async function setup(t){
 const db=new PGlite();t.after(()=>db.close());for(const p of ['tests/fixtures/v134-schema.sql','tests/fixtures/sql/STELLAR_V134_SAVE_UNICO.sql','tests/fixtures/sql/STELLAR_V134_1_COLETA_LATENCIA.sql','sql/STELLAR_V145_2_EVENTO_PVP.sql'])await db.exec(read(p));
 await db.exec('delete from live_event_config_v16');
 for(const key of keys)await db.query("insert into live_event_config_v16(event_key,name,enabled,schedule_mode,starts_at,repeat_minutes,duration_minutes,target,reward,rules) values($1,$1,true,'interval','2026-10-04 04:00:00+00',75,120,3,'{\"credits\":100,\"uridium\":1,\"xp\":100}','{\"weekend_rotation\":true}')",[key]);
 await db.exec("insert into stellar_natal_config_v132(id,enabled,starts_at,ends_at) values(1,true,'2026-11-07 03:00:00+00','2027-01-06 03:00:00+00') on conflict(id) do update set enabled=true,starts_at=excluded.starts_at,ends_at=excluded.ends_at");
 return db;
}
test('V145.2 SQL calendar matches actual JS director across Christmas intervals, festival, disabled events and disabled Christmas',async t=>{
 const db=await setup(t),start=Date.parse('2026-11-09T03:00:00Z');
 for(const christmas of [true,false]){
  await db.query('update stellar_natal_config_v132 set enabled=$1 where id=1',[christmas]);
  for(const disabled of [false,true]){
   await db.query("update live_event_config_v16 set enabled=$1 where event_key='prime'",[!disabled]);
   const roster=keys.filter(x=>!(disabled&&x==='prime')).map(event_key=>({event_key,enabled:true}));
   for(let i=0;i<15*24;i++){
    const now=start+i*3600000+12345,expected=continuousEventV135(roster,now,{christmasEnabled:christmas});
    const id=expected.rules.christmas?`v135:battle:${expected.start}`:expected.eventId;
    const result=(await db.query('select * from stellar_event_window_v1452($1,$2)',[id,new Date(now).toISOString()])).rows;
    if(expected.rules.christmas)assert.equal(result.length,0);
    else{assert.equal(result.length,1);assert.equal(result[0].event_key,expected.id);assert.equal(Date.parse(result[0].event_start),expected.start);assert.equal(Date.parse(result[0].event_end),expected.end);}
   }
  }
 }
});
test('V145.2 rejects another event, wrong start, expired period and active manual override',async t=>{
 const db=await setup(t),at='2026-11-14T01:20:00Z';const expected=continuousEventV135(keys.map(event_key=>({event_key,enabled:true})),Date.parse(at));
 assert.ok(!expected.rules.christmas);const call=async id=>(await db.query('select * from stellar_event_window_v1452($1,$2)',[id,at])).rows;
 assert.equal((await call(expected.eventId)).length,1);assert.equal((await call(expected.eventId.replace(/\d{13}$/,'0000000000000'))).length,0);
 assert.equal((await call(expected.eventId.replace(':battle:',':invasion:'))).length,0);
 await db.exec("insert into live_event_manual_override_v3411(id,event_key,start_at,end_at) values(1,'invasion','2026-11-14 01:00:00+00','2026-11-14 02:00:00+00') on conflict(id) do update set event_key=excluded.event_key,start_at=excluded.start_at,end_at=excluded.end_at");
 assert.equal((await call(expected.eventId)).length,0);
});
test('V145.2 actual event RPC accepts v135, persists abates and grants reward only once; anonymous remains denied',async t=>{
 const db=await setup(t),uid='14520000-0000-4000-8000-000000000001';await db.exec('update stellar_natal_config_v132 set enabled=false where id=1');
 const s={accountOwnerId:uid,adminResetEpoch:0,profile:{callsign:'QA1452',faction:'earth',level:1,credits:1000,uridium:10,xp:0},cargo:{},inventory:{},warfront:{skillCores:0}};
 await db.query('insert into game_saves(user_id,state) values($1,$2)',[uid,s]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 const now=(await db.query('select clock_timestamp() at')).rows[0].at;const event=continuousEventV135(keys.map(event_key=>({event_key,enabled:true})),Date.parse(now),{christmasEnabled:false});assert.ok(event);
 const call=async n=>(await db.query('select stellar_player_record_my_galaxy_event_progress($1,$2) r',[event.eventId,n])).rows[0].r;
 const first=await call(1);assert.equal(first.progress,1);assert.equal(first.rewarded,false);
 const reward=await call(2);assert.equal(reward.rewardedNow,true);assert.equal(reward.state.profile.credits,1100);
 const again=await call(1);assert.equal(again.rewardedNow,false);assert.equal(again.rewarded,true);
 const state=(await db.query('select state from game_saves where user_id=$1',[uid])).rows[0].state;assert.equal(state.profile.credits,1100);assert.equal(state.profile.uridium,11);
 await db.exec('SET ROLE anon');try{await assert.rejects(call(1),{code:'42501'});}finally{await db.exec('RESET ROLE');}
});
