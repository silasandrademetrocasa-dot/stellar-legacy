import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
import {parseHTML} from 'linkedom';
import {createFormationMotion,FORMATION_ANCHORS} from '../public/modules/drone-formation-motion-v144.js';
import {DRONE_FORMATIONS} from '../public/modules/combat-tactics-v144.js';
import {createLatestSaveCoordinatorV106} from '../public/modules/unified-save-coordinator-v106.js';
import {createTaskClaimRunnerV1462,mergePendingPassV1462} from '../public/modules/task-claims-v1462.js';
import {createChristmasUI} from '../public/modules/christmas-ui-v132.js';
import {createPlayerRewardsV134} from '../server/player-rewards-v134.js';
import {supabasePgliteV134} from './fixtures/supabase-pglite-v134.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const ids=Array.from({length:8},(_,i)=>'D'+(i+1));
test('drawn drone topology: all 72 numbered slots, initial ship heading and no four-slot repetition',()=>{
 assert.equal(Object.keys(FORMATION_ANCHORS).length,9);
 for(const [id,anchors] of Object.entries(FORMATION_ANCHORS)){
  assert.equal(anchors.length,8);assert.equal(new Set(anchors.map(p=>p.join(','))).size,8);
  const points=createFormationMotion().sample(ids,id,-Math.PI/2,0);
  for(let i=0;i<8;i++){
   const p=points.find(p=>p.id===ids[i]),[forward,right]=anchors[i];
   // Existing per-drone animation / depth can displace a slot, but never selects another slot.
   assert.ok(Math.abs(p.x-right)<=10.01,`${id} ${p.id} lateral`);
   assert.ok(Math.abs(p.y+forward)<=31,`${id} ${p.id} forward`);
  }
 }
 assert.ok(FORMATION_ANCHORS.original.slice(0,4).every(p=>p[0]<0));
 assert.deepEqual(FORMATION_ANCHORS.prisma.slice(0,4).map(p=>Math.sign(p[0])||Math.sign(p[1])),[1,-1,1,1]);
 assert.ok(FORMATION_ANCHORS.cacador_supremo.slice(5).every(p=>p[0]<0));
 assert.ok(FORMATION_ANCHORS.leviata.slice(2).every(p=>Math.abs(p[1])===120));
});
test('original layout keeps its 25 degree orbit; rare/common stay flat, epic/legendary keep depth and low quality shadows off',()=>{
 const m=createFormationMotion(),first=structuredClone(m.sample(ids,'original',0,20)),later=m.sample(ids,'original',0,21);
 const a=first.find(p=>p.id==='D5'),b=later.find(p=>p.id==='D5');
 assert.ok(Math.abs(Math.atan2(b.y,b.x)-Math.atan2(a.y,a.x)-25*Math.PI/180)<1e-8);
 for(const def of Object.values(DRONE_FORMATIONS)){
  const samples=createFormationMotion().sample(ids,def.id,.7,3,{quality:'low'});
  assert.ok(samples.every(p=>!p.shadow));
  if(def.depth)assert.ok(samples.some(p=>p.z!==0&&p.scale!==1));else assert.ok(samples.every(p=>p.z===0&&p.scale===1));
 }
});
test('task checkpoint resolves its ACK while combat is still dirty and the next write is in flight',async()=>{
 let revision=4,calls=0,next;const queue=createLatestSaveCoordinatorV106({revision:()=>revision,hasPending:()=>true,blocked:()=>false,maxAttempts:2,send:async()=>{
  calls++;if(calls===1){revision++;return {status:'saved',revision:4};}
  await new Promise(r=>next=r);return {status:'saved',revision:5};
 }});
 assert.equal(await queue.checkpoint(),true);await tick();assert.equal(calls,2);assert.equal(queue.running,true);next();await tick();
});
test('an older in-flight snapshot does not ACK a newer task and errors do not fabricate ACKs',async()=>{
 let revision=1,release,calls=0;
 const queue=createLatestSaveCoordinatorV106({revision:()=>revision,hasPending:()=>true,blocked:()=>false,maxAttempts:2,send:async()=>{calls++;if(calls===1){await new Promise(r=>release=r);return {status:'saved',revision:1};}return 'error';}});
 const flushing=queue.flush();revision=2;let resolved=false;const cp=queue.checkpoint().then(r=>{resolved=true;return r;});
 assert.equal(resolved,false);release();assert.equal(await cp,false);assert.equal(await flushing,false);
});
test('server-ready claims skip global checkpoints; 100 rapid duplicate clicks share one claim',async()=>{
 let sends=0,installs=0,checkpoint=0;
 const runner=createTaskClaimRunnerV1462({context:()=> 'account:1',install:()=>installs++,checkpoint:()=>{checkpoint++;return false;}});
 const send=async()=>{sends++;await tick();return {ok:true,state:{claimed:true}};};
 const results=await Promise.all(Array.from({length:100},()=>runner.run('level:2',send)));
 assert.equal(sends,1);assert.equal(installs,1);assert.equal(checkpoint,0);assert.equal(results.length,100);
});
test('locally unlocked tier waits for its checkpoint only after authoritative not-ready, then succeeds',async()=>{
 let sends=0,checkpoints=0,drains=0,installed=0;
 const runner=createTaskClaimRunnerV1462({context:()=> 'A',drain:async()=>drains++,checkpoint:async()=>{checkpoints++;return true;},install:()=>installed++});
 await runner.run('tier:1',async()=>{if(++sends===1)throw Object.assign(Error('Tier'),{code:'PLAYER_REWARD_NOT_READY',status:409});return {ok:true,state:{}};});
 assert.deepEqual([sends,checkpoints,drains,installed],[2,1,1,1]);
});
test('lost economic response retries stable task, installs once; a definitive rejection never marks completed',async()=>{
 let requests=0,grants=0,installs=0;const receipts=new Set();
 const runner=createTaskClaimRunnerV1462({context:()=> 'A',checkpoint:async()=>true,install:()=>installs++,wait:async()=>{}});
 await runner.run('natal:mission:a',async()=>{requests++;if(!receipts.has('mission:a')){receipts.add('mission:a');grants++;throw Object.assign(Error('lost response'),{code:'NETWORK_TIMEOUT'});}return {ok:true,replayed:true,state:{}};});
 assert.deepEqual([requests,grants,installs],[2,1,1]);
 await assert.rejects(runner.run('blocked',async()=>{throw Object.assign(Error('incomplete'),{status:409});}),/incomplete/);assert.equal(installs,1);
});
test('session change and missing authoritative state never install a reward',async()=>{
 let owner='A',release,installed=0;
 const runner=createTaskClaimRunnerV1462({context:()=>owner,checkpoint:async()=>true,install:()=>installed++,wait:async()=>{}});
 const claim=runner.run('level',()=>new Promise(r=>release=r));await tick();owner='B';release({ok:true,state:{account:'A'}});
 await assert.rejects(claim,e=>e.code==='TASK_SESSION_CHANGED');assert.equal(installed,0);
 await assert.rejects(runner.run('no-state',async()=>({ok:true})),e=>e.code==='TASK_ACK_PENDING');assert.equal(installed,0);
});
test('actual Frontier adapter recovers an already credited contract after readback failure without a second payout',async()=>{
 let grants=0,reads=0,installs=0;
 const runner=createTaskClaimRunnerV1462({context:()=> 'A',checkpoint:async()=>true,install:state=>{installs++;assert.equal(state.profile.credits,777);},wait:async()=>{}});
 const source=read('public/game.js'),start=source.indexOf('async function claimFrontierTaskV1462('),end=source.indexOf('const playerClaimsV134',start);
 const ctx={taskClaimsV1462:runner,claimFrontierContractOnline:async()=>{if(grants)throw Object.assign(Error('FRONTIER_ALREADY_CLAIMED'),{status:409});grants++;return {ok:true,credits:777};},loadCloudSave:async()=>{if(++reads===1)throw Object.assign(Error('lost read'),{code:'NETWORK_TIMEOUT'});return {state:{profile:{credits:777}}};}};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);const result=await ctx.claimFrontierTaskV1462('contract');
 assert.equal(result.already_claimed,true);assert.deepEqual([grants,reads,installs],[1,2,1]);
 // Cursor-based Astral bonus remains single-shot; automatic retries could consume another completion.
 const astral=read('public/modules/astral-rewards-v381.js');assert.match(astral,/stellarTaskCheckpointV1462/);assert.doesNotMatch(astral,/stellarTaskClaimV1462/);
});
test('pending pass objectives survive economic ACK; only server markers are final, reset/season/account boundaries fence local progress',()=>{
 const remote={accountOwnerId:'A',adminResetEpoch:1,battlePass:{season:'2026-11',points:400,claimedTiers:{1:123},premiumClaimedTiers:{},daily:{key:'2026-11-14',progress:{kills:8},completed:{}}}};
 const local=structuredClone(remote);Object.assign(local.battlePass,{points:500,claimedTiers:{2:999}});local.battlePass.daily.progress.kills=15;local.battlePass.daily.completed.kills=100;
 const merged=mergePendingPassV1462(remote,local);assert.equal(merged.points,500);assert.equal(merged.daily.progress.kills,15);assert.deepEqual(merged.claimedTiers,{1:123});assert.deepEqual(remote.battlePass.daily.completed,{});
 for(const changed of [{accountOwnerId:'B'},{adminResetEpoch:2},{battlePass:{season:'2026-12'}}])assert.equal(mergePendingPassV1462({...remote,...changed},local),null);
});
function natalDOM(t,bridge){
 const {document,window}=parseHTML('<html><body><div id="topbar"><div class="top-actions"></div></div></body></html>');
 window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};
 const previous={document:globalThis.document,localStorage:globalThis.localStorage};globalThis.document=document;globalThis.localStorage={getItem:()=>null};
 t.after(()=>{for(const k of Object.keys(previous))if(previous[k]===undefined)delete globalThis[k];else globalThis[k]=previous[k];});
 const ui=createChristmasUI({ready:()=>true,account:()=> 'A',faction:()=> 'earth',ship:()=> 'phoenix',owned:()=>false,toast:()=>{},...bridge});
 return {ui,document,open:()=>document.querySelector('.natal-launch').onclick()};
}
const natalStatus=()=>({config:{enabled:true,goals:{}},player:{npc:10000,box:10000,boss:1000},claims:[],counts:[]});
test('Christmas DOM: claim ACK immediately marks RESGATADO while stale status is still in flight; failed refresh cannot erase it',async t=>{
 let reads=0,oldStatus,newStatus,claimRelease;const {ui,document,open}=natalDOM(t,{status:async()=>{if(++reads===1)return natalStatus();return new Promise(r=>{if(reads===2)oldStatus=r;else newStatus=r;});},claim:()=>new Promise(r=>claimRelease=r)});
 await open();const stale=document.querySelector('[data-refresh]').onclick();await tick();
 const button=()=>document.querySelector('[data-claim="coupon:NATALESTELAR"]');const claiming=button().onclick();assert.equal(button().textContent,'CONFIRMANDO…');
 claimRelease({ok:true,state:{},reward:{credits:10}});await tick();assert.equal(button().textContent,'RESGATADO');
 oldStatus(natalStatus());await stale;await tick();assert.equal(button().textContent,'RESGATADO');
 newStatus(natalStatus());await claiming;assert.equal(button().textContent,'RESGATADO');assert.ok(button().hasAttribute('disabled'));ui.tick();
});
test('Christmas DOM: failed grant stays claimable and account switch fences old claim response',async t=>{
 let owner='A',release;
 const {document,open,ui}=natalDOM(t,{account:()=>owner,status:async()=>natalStatus(),claim:()=>new Promise(r=>release=r)});
 await open();let b=()=>document.querySelector('[data-claim="coupon:NATALESTELAR"]');const fail=b().onclick();release({ok:false});await fail;assert.equal(b().textContent,'RESGATAR');
 const old=b().onclick();owner='B';ui.tick();release({ok:true,state:{}});await old;await tick();assert.notEqual(b().textContent,'RESGATADO');
});
test('real PostgreSQL: level, both pass tracks and Christmas mission grant once with durable completion markers and ABC save',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec(read('tests/fixtures/v134-schema.sql'));await db.exec(read('tests/fixtures/sql/STELLAR_V134_SAVE_UNICO.sql'));
 const uid='11111111-1111-4111-8111-111111111111',initial={accountOwnerId:uid,adminResetEpoch:0,profile:{callsign:'QA1462',faction:'earth',level:10,credits:1000,uridium:100,xp:100000},ammo:{lcb10:100},inventory:{},battlePass:{season:'qa',points:500,claimedTiers:{},premiumClaimedTiers:{}}};
 await db.query('INSERT INTO game_saves(user_id,state) VALUES($1,$2)',[uid,initial]);
 const service=createPlayerRewardsV134({db:supabasePgliteV134(db),readPass:async()=>({seasons:[{season_key:'qa',enabled:true,starts_at:new Date(Date.now()-10000).toISOString(),ends_at:new Date(Date.now()+100000).toISOString(),points_per_tier:500}],tiers:[{season_key:'qa',tier_no:1,free_reward:{credits:100},premium_reward:{credits:200}}]}),readPremium:async()=>({battle_pass_active:true})});
 for(const body of [{kind:'level',level:2},{kind:'pass_free',tier:1,season:'qa'},{kind:'pass_premium',tier:1,season:'qa'}]){
  const first=await service.claim(uid,body,{}),replay=await service.claim(uid,body,{});assert.equal(first.ok,true);assert.equal(replay.replayed,true);assert.equal(replay.state.profile.credits,first.state.profile.credits);
 }
 await db.exec("INSERT INTO stellar_natal_config_v132 VALUES(1,true,clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day','{}');INSERT INTO stellar_natal_rewards_v132 VALUES('mission:qa','{\"npc\":20,\"box\":10,\"boss\":0,\"reward\":{\"credits\":777}}');");
 await db.query("INSERT INTO stellar_natal_players_v132(user_id,faction,npc,box) VALUES($1,'earth',20,10)",[uid]);
 const claim=async()=>(await db.query("SELECT stellar_player_natal_action($1,'mission:qa','mission','{}') r",[uid])).rows[0].r;
 const first=await claim(),replay=await claim();assert.equal(first.ok,true);assert.equal(replay.replayed,true);assert.equal(replay.state.profile.credits,first.state.profile.credits);
 const status=(await db.query('SELECT stellar_natal_status_v132($1) r',[uid])).rows[0].r;assert.ok(status.claims.includes('mission:qa'));
 const state=replay.state;assert.ok(state.levelRewards.claimed[2]);assert.ok(state.battlePass.claimedTiers[1]);assert.ok(state.battlePass.premiumClaimedTiers[1]);
 const backup=(await db.query("SELECT state FROM stellar_player_save_abc_v118 WHERE user_id=$1 AND slot='A'",[uid])).rows[0].state;assert.equal(backup.profile.credits,state.profile.credits);
 await assert.rejects(service.claim(uid,{kind:'level',level:44},{}),e=>e.code==='PLAYER_REWARD_NOT_READY');
});
