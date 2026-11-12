import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {DRONE_FORMATIONS,tacticsFor,formationMultipliers,validateTacticsWrite,rescaleResource} from '../public/modules/combat-tactics-v144.js';
import {createFormationMotion,FORMATION_TRANSITION_SECONDS} from '../public/modules/drone-formation-motion-v144.js';
import {mergePlayerStateV134} from '../public/modules/player-state-merge-v134.js';
import {prepareCombatTactics} from '../server/combat-tactics-v144.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base=()=>({accountOwnerId:'11111111-1111-4111-8111-111111111111',profile:{callsign:'QA144',faction:'earth',level:10,xp:1000,credits:10000,uridium:10},inventory:{lf4:3},ammo:{lcb10:1000,mcb25:300},rockets:{r310:100},hp:500,shield:400,combatConfigsV2013:{active:1},selectedLaserAmmo:'lcb10',selectedRocket:'r310',ownedDroneFormationsV144:Object.keys(DRONE_FORMATIONS)});
const migration='supabase/migrations/'+readdirSync(new URL('../supabase/migrations/',import.meta.url)).find(x=>x.endsWith('_combat_tactics_v144.sql'));
test('all nine formations match the exact approved percentages, without stacking',()=>{
 const expected=[[0,0,0,0],[18,-10,-8,0],[-10,0,-8,18],[-6,0,22,-12],[-12,22,0,-6],[14,-10,-8,14],[14,-6,14,-10],[16,-6,-12,18],[-6,18,18,-12]];
 Object.values(DRONE_FORMATIONS).forEach((f,i)=>{assert.deepEqual([f.damage,f.hp,f.shield,f.speed],expected[i]);const s=base();s.combatHudV144=tacticsFor(s);s.combatHudV144.profiles[1].formation=f.id;const mods=formationMultipliers(s);assert.equal(mods.damage,1+expected[i][0]/100);});
 assert.equal(rescaleResource(0,100,150),0);assert.equal(rescaleResource(50,100,90),45);assert.equal(rescaleResource(45,90,100),50);
});
test('CONF slots are independent and state normalization cannot fabricate ownership',()=>{
 const s=base(),t=tacticsFor(s);assert.equal(t.profiles[1].slots.length,18);assert.equal(t.profiles[2].slots.length,18);t.profiles[1].slots[0]={kind:'formation',id:'furia'};assert.notDeepEqual(t.profiles[1].slots,t.profiles[2].slots);
 s.combatHudV144=t;assert.equal(validateTacticsWrite(base(),s).ok,true);
 const forgery=structuredClone(s);forgery.ownedDroneFormationsV144.push('anything');assert.equal(validateTacticsWrite(s,forgery).code,'FORMATION_OWNERSHIP_RESERVED');
 const unowned=base();delete unowned.ownedDroneFormationsV144;assert.equal(validateTacticsWrite(unowned,s).ok,false);
 const invalid=structuredClone(s);invalid.combatHudV144.profiles[1].slots[0]={kind:'laser',id:'made_up'};assert.equal(validateTacticsWrite(s,invalid).ok,false);
 const stock=structuredClone(s.inventory),ammo=structuredClone(s.ammo);prepareCombatTactics(s,s);assert.deepEqual(s.inventory,stock);assert.deepEqual(s.ammo,ammo);
});
test('motion preserves unique equipped identities at 0, 1, 4, 8, 12, 20 drones; transitions replan without teleport',()=>{
 assert.ok(FORMATION_TRANSITION_SECONDS>=.6&&FORMATION_TRANSITION_SECONDS<=.9);
 for(const n of [0,1,4,8,12,20])for(const f of Object.values(DRONE_FORMATIONS)){
  const m=createFormationMotion(),ids=Array.from({length:n},(_,i)=>'drone-'+i);m.sample(ids,'original',0,0);const before=structuredClone(m.sample(ids,'original',0,1));
  const switched=structuredClone(m.sample(ids,f.id,Math.PI/2,1));assert.equal(switched.length,n);assert.equal(new Set(switched.map(p=>p.id)).size,n);
  for(const p of switched){const b=before.find(b=>b.id===p.id);assert.ok(Math.hypot(p.x-b.x,p.y-b.y)<1e-8);}
  const after=m.sample(ids,f.id,Math.PI/2,2);for(const p of after)assert.ok([p.x,p.y,p.z,p.scale,p.alpha].every(Number.isFinite));
  if(!f.depth)assert.ok(after.every(p=>p.scale===1&&p.z===0));
  const middle=structuredClone(m.sample(ids,'prisma',1,2.3)),again=m.sample(ids,'leviata',1,2.3);for(const p of again){const b=middle.find(b=>b.id===p.id);assert.ok(Math.abs(p.x-b.x)<1e-8);assert.ok(Math.abs(p.y-b.y)<1e-8);}
 }
});
test('single checkpoint SQL: ownership, ratios, replay, CONF independence and concurrent NPC rewards',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 for(const p of ['tests/fixtures/v134-schema.sql','tests/fixtures/sql/STELLAR_V134_SAVE_UNICO.sql','tests/fixtures/sql/STELLAR_V134_1_COLETA_LATENCIA.sql','tests/fixtures/v137-live-commit.sql',migration,migration,'supabase/migrations/'+readdirSync(new URL('../supabase/migrations/',import.meta.url)).find(x=>x.endsWith('_formations_shop_hud18_v1441.sql'))])await db.exec(read(p));
 const s=base(),uid=s.accountOwnerId;s.adminResetEpoch=0;delete s.ownedDroneFormationsV144;s.combatHudV144=tacticsFor(s);
 await db.query('INSERT INTO game_saves(user_id,state) VALUES($1,$2)',[uid,s]);
 const row=async()=>(await db.query('select state from game_saves where user_id=$1',[uid])).rows[0].state;
 await assert.rejects(db.query("UPDATE game_saves SET state=jsonb_set(state,'{ownedDroneFormationsV144}','[\"furia\"]') WHERE user_id=$1",[uid]),/FORMATION_OWNERSHIP_RESERVED/);
 await db.exec('BEGIN');await db.query("SELECT set_config('stellar.formations_admin','on',true)");await db.query("UPDATE game_saves SET state=jsonb_set(state,'{ownedDroneFormationsV144}','[\"furia\",\"prisma\"]') WHERE user_id=$1",[uid]);await db.exec('COMMIT');
 let initial=await row(),draft=structuredClone(initial);draft.combatHudV144.profiles[1].formation='furia';draft.combatHudV144.profiles[1].slots[9]={kind:'formation',id:'furia'};
 const payload={base:initial,state:draft,receipt:{settings:true}};
 const command=async(id,p=payload)=>(await db.query('SELECT stellar_player_commit($1,$2,\'checkpoint\',$3,$4) result',[uid,id,'a'.repeat(64),p])).rows[0].result;
 const first=await command('v144_settings_request_0001');assert.equal(first.ok,true);assert.equal(first.state.hp,450);assert.equal(first.state.shield,368);assert.equal(first.state.combatHudV144.profiles[2].formation,'original');assert.deepEqual(first.state.ammo,s.ammo);assert.deepEqual(first.state.inventory,s.inventory);
 const replay=await command('v144_settings_request_0001');assert.equal(replay.replayed,true);assert.equal(replay.state.hp,450);
 const before=await row();await db.query('SELECT stellar_grant_npc_reward_v228($1,$2,$3,$4,$5)',[uid,'qa144_npc_race_01','streuner',777,2]);
 const desired=structuredClone(before);desired.combatHudV144.profiles[2].slots[0]={kind:'formation',id:'prisma'};
 const merged=await command('v144_settings_request_0002',{base:before,state:desired,receipt:{settings:true}});assert.equal(merged.ok,true);assert.equal(merged.state.profile.credits,10777);assert.equal(merged.state.combatHudV144.profiles[2].slots[0].id,'prisma');
 const evil=await row();evil.combatHudV144.profiles[1].formation='leviata';await assert.rejects(db.query('UPDATE game_saves SET state=$2 WHERE user_id=$1',[uid,evil]),/FORMATION_NOT_OWNED/);
 const legacy=await row();delete legacy.combatHudV144;await db.query('UPDATE game_saves SET state=$2 WHERE user_id=$1',[uid,legacy]);assert.equal((await row()).combatHudV144.profiles[1].formation,'furia');
 const final=await row(),backup=(await db.query("select state from stellar_player_save_abc_v118 where user_id=$1 and slot='A'",[uid])).rows[0].state;assert.deepEqual(backup.combatHudV144,final.combatHudV144);
});

test('remote drone metadata is derived from the canonical save, never from a client bonus or fake count',async()=>{
 const {dronePresentation}=await import('../server/drone-presentation-v144.js');const s=base();s.drones=Array.from({length:8},(_,i)=>({id:'real-'+i,type:'iris',slots:['lf4']}));s.combatHudV144=tacticsFor(s);s.combatHudV144.profiles[1].formation='prisma';
 const p=dronePresentation(s);assert.equal(p.formationId,'prisma');assert.equal(p.drones.length,8);assert.deepEqual(p.drones.map(d=>d.id),s.drones.map(d=>d.id));assert.ok(!JSON.stringify(p).includes('damage'));
 const unowned={...s,ownedDroneFormationsV144:[]};assert.equal(dronePresentation(unowned).formationId,'original');
});
test('formation confirmation ignores pending desires and late older ACKs',async()=>{
 const vm=await import('node:vm');const {formationFor}=await import('../public/modules/combat-tactics-v144.js');
 const game=read('public/game.js');const a=game.indexOf('function confirmCombatStateV144('),b=game.indexOf("window.addEventListener('stellar-combat-confirmed-v144'",a);
 const original=base();original.combatHudV144=tacticsFor(original);original.serverStateClockV134=1;
 const desired=structuredClone(original.combatHudV144);desired.profiles[1].formation='furia';
 const ctx={confirmedCombatStateV144:null,pendingCombatHudV144:{base:original.combatHudV144,desired},formationVitalsPendingV144:false,formationFor,tacticsFor,activeConfig:s=>s?.combatConfigsV2013?.active||1};vm.createContext(ctx);vm.runInContext(game.slice(a,b),ctx);
 ctx.confirmCombatStateV144(original);assert.equal(formationFor(ctx.confirmedCombatStateV144).id,'original');assert.ok(ctx.pendingCombatHudV144);
 const confirmed={...original,serverStateClockV134:2,combatHudV144:desired};ctx.confirmCombatStateV144(confirmed);assert.equal(ctx.pendingCombatHudV144,null);assert.equal(formationFor(ctx.confirmedCombatStateV144).id,'furia');assert.equal(ctx.formationVitalsPendingV144,true);
 ctx.confirmCombatStateV144(original);assert.equal(formationFor(ctx.confirmedCombatStateV144).id,'furia');
});
