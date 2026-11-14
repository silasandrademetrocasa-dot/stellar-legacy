import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';import {IDBFactory} from 'fake-indexeddb';import {parseHTML} from 'linkedom';
import {queueDropAtContactV1461} from '../public/modules/collection-contact-v1461.js';
import {collectionContactV1461} from '../server/collection-contact-v1461.js';
import {createCollectionProofV146} from '../server/collection-proof-v146.js';
import {collectionAccessV1341} from '../public/modules/collection-access-v1341.js';
import {createEconomicManagerV146} from '../public/modules/economic-manager-v146.js';
import {openLocalSaveV121} from '../public/modules/local-first-save-v121.js';
import {baseActionsPositionV1461} from '../public/modules/base-actions-v1461.js';
import {database,uid,state as initial} from './fixtures/localfirst-v146.mjs';
import {supabasePgliteV134} from './fixtures/supabase-pglite-v134.mjs';
import {createEconomicScopeV146} from '../server/localfirst-scope-v146.js';import {createEconomicBatchV146} from '../server/localfirst-batch-v146.js';import {createPlayerRewardsV134} from '../server/player-rewards-v134.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),game=read('public/game.js');
const source=(start,end)=>game.slice(game.indexOf(start),game.indexOf(end,game.indexOf(start)));
const room=()=>({key:'earth:x1',mapId:'x1',map:{world:{w:4000,h:3000}}});
const actor=()=>({x:400,y:400,updatedAt:Date.now(),pet:{owned:true,activeGear:'box',x:500,y:400}});
const petSave=()=>({...initial(),pet:{owned:true,level:4,gearsOwned:{box:true},protocols:{}}});

test('V146.1 contact observation precedes slow IndexedDB; visual queue callback never waits for proof',async()=>{
 let releaseDisk,releaseProof,attached;const calls=[],contact={pet:{owned:true,activeGear:'box',x:500,y:400}};
 const promise=queueDropAtContactV1461({drop:{id:'v1461_drop_one'},collector:'pet',contact,randomId:()=>randomUUID(),observe:p=>{calls.push(['observe',p]);return new Promise(r=>releaseProof=r);},enqueue:async(kind,body,preview)=>{calls.push(['append',preview]);await new Promise(r=>releaseDisk=r);return {id:'event'};},attach:async(id,proof)=>attached={id,proof}});
 assert.deepEqual(calls.map(x=>x[0]),['observe','append']);contact.pet.x=2000;assert.equal(calls[0][1].contact.pet.x,500);assert.equal(calls[1][1].contact.pet.x,500);
 releaseDisk();assert.equal((await promise).id,'event');assert.equal(attached,undefined);releaseProof('signed-contact');await new Promise(r=>setImmediate(r));assert.deepEqual(attached,{id:'event',proof:'signed-contact'});
});

test('V146.1 contact snapshot fixes throttled AUX position but keeps canonical map, gear, radar and tether checks',()=>{
 const p=actor();p.pet.x=200;p.pet.activeGear='off';const contact={pet:{owned:true,activeGear:'box',x:500,y:400}},drop={map_key:'earth:x1',x:500,y:400};
 assert.equal(collectionAccessV1341(petSave(),{room:room(),player:p},drop,'pet').ok,false);
 const frozen=collectionContactV1461(p,contact,room(),'pet');assert.equal(collectionAccessV1341(petSave(),{room:room(),player:frozen},drop,'pet').ok,true);assert.equal(p.pet.x,200);assert.equal(p.pet.activeGear,'off');
 const forged=petSave();forged.pet.gearsOwned.box=false;assert.equal(collectionAccessV1341(forged,{room:room(),player:frozen},drop,'pet').ok,false);
 assert.equal(collectionAccessV1341(petSave(),{room:room(),player:frozen},{...drop,map_key:'earth:x2'},'pet').ok,false);
 const far=collectionContactV1461(p,{pet:{owned:true,activeGear:'box',x:3000,y:400}},room(),'pet');assert.equal(collectionAccessV1341(petSave(),{room:room(),player:far},{...drop,x:3000},'pet').ok,false);
 assert.throws(()=>collectionContactV1461(p,{pet:{owned:true,activeGear:'box',x:NaN,y:400}},room(),'pet'));
 assert.throws(()=>collectionContactV1461(p,{pet:{owned:true,activeGear:'box',x:9000,y:400}},room(),'pet'));
 assert.equal(collectionContactV1461(p,contact,room(),'ship').pet.x,200);
});

test('V146.1 lost proof response reuses original server observation after movement, without SQL or a new reward',()=>{
 let now=100000;const proof=createCollectionProofV146('secret',{now:()=>now}),body={drop_id:'v1461_drop_one',collector:'pet',request_id:randomUUID()},p=actor();p.updatedAt=now;
 const token=proof.issue(uid,'session',body,{room:room(),player:p});p.x=3000;p.pet.x=3100;now+=6000;
 assert.equal(proof.issue(uid,'session',body,{room:room(),player:p}),token);
 const trusted=proof.verify(uid,{...body,proof:token});assert.equal(collectionAccessV1341(petSave(),trusted,{map_key:'earth:x1',x:500,y:400},'pet',now).ok,true);
 assert.throws(()=>proof.issue(uid,'session',{...body,drop_id:'v1461_other_drop'},{room:room(),player:p}));
 assert.throws(()=>proof.verify(randomUUID(),{...body,proof:token}));
 now+=120001;assert.notEqual(proof.issue(uid,'session',body,{room:room(),player:p}),token);
});

test('V146.1 manager bootstrap leaves saved vitals and location intact and schedules nothing before world restoration',async t=>{
 const store=await openLocalSaveV121({indexedDBFactory:new IDBFactory(),name:randomUUID()});t.after(()=>store.close());
 let local={...initial(),hp:321000,shield:74000,x:2140,y:1820},installed=0,scheduled=0;const manager=createEconomicManagerV146({store,owner:uid,getState:()=>local,applyRemote:()=>{installed++;local.hp=1;local.x=400;},events:null,schedule:()=>++scheduled,cancel(){},online:()=>false});
 await manager.start(local,{available:true,installInitial:false,scheduleInitial:false});assert.equal(installed,0);assert.equal(scheduled,0);assert.equal(local.hp,321000);assert.equal(local.x,2140);manager.stop();
});

test('V146.1 actual save and position snapshot do not promote the old runtime during bootstrap',()=>{
 const progress={...initial(),hp:321000,shield:74000,x:2140,y:1820,locationSavedAt:123,positionByMap:{}};let staged;
 const c={progress,gameBootstrapRuntime:{loading:true},state:{currentMap:{}},player:{x:400,y:1500,hp:1},Number,Date,structuredClone,
 offlineFarmWorldLockedV84:()=>false,getUser:()=>({id:uid}),saveActiveBattleConfigV2013:()=>assert.fail('old runtime shield copied'),isGalaxyGateMap:()=>false,syncRuntimeLocationToProgress:()=>assert.fail('old runtime promoted'),
 stageLocalFirstSnapshotV121:(owner,s)=>staged=structuredClone(s),LEGACY_MIRROR_V122:{stage(){}},saveKey:()=>'',accountResetEpochV478:0,cloudSaveMutationV105:0,LOCAL_FIRST_FOREGROUND_V122:null};
 vm.createContext(c);vm.runInContext(source('function saveGame(){','function readLocalGameState(){')+source('function runtimeLocationSnapshot(){','function restoreRuntimeLocationAfterServerState(')+source('function restoreLatestRuntimeLocationCheckpoint(){','function applyPresenceCheckpoint('),c);
 c.saveGame();assert.equal(staged.hp,321000);assert.equal(staged.shield,74000);assert.equal(staged.x,2140);assert.equal(staged.locationSavedAt,123);assert.equal(c.runtimeLocationSnapshot(),null);
 // An economic timestamp is not a movement checkpoint, even if it is newer.
 c.progress.locationSavedAt=0;c.progress.savedMapId='x1';c.MAPS={x1:{world:{w:4000,h:3000}}};c.locationStorageKey=()=> 'earth:x1';
 c.readLatestPositionCheckpoint=()=>({mapId:'x1',territoryFaction:'earth',x:2150,y:1830,savedAt:100});assert.equal(c.restoreLatestRuntimeLocationCheckpoint(),true);assert.equal(c.progress.x,2150);assert.equal(c.progress.locationSavedAt,100);
 c.gameBootstrapRuntime.loading=false;c.player.x=2150;c.player.y=1830;c.movementPositionRuntime={hasMovedSinceLoad:false};assert.equal(c.runtimeLocationSnapshot().savedAt,100);
 c.movementPositionRuntime.hasMovedSinceLoad=true;c.player.x+=20;assert.ok(c.runtimeLocationSnapshot().savedAt>100);
});

test('V146.1 actual loaded-game restoration retains absolute saved hull and last map coordinates',()=>{
 const progress={...initial(),mapId:'x3',territoryFaction:'earth',savedMapId:'x3',savedTerritoryFaction:'earth',locationSavedAt:123,x:2140,y:1820,hp:321000,shield:74000,galaxyGate:{},combatConfigsV2013:{active:1,profiles:{1:{shield:74000}}}};
 const maps={x1:{id:'x1',world:{w:4000,h:3000}},x3:{id:'x3',world:{w:4000,h:3000}}};
 const c={progress,player:{hp:1,shield:0,maxHp:1,maxShield:0,x:400,y:1500},state:{currentMap:maps.x1,camera:{}},MAPS:maps,SHIPS:{phoenix:{hp:4000}},adminRuntime:{status:null},Math,Number,String,console,
 telemetryRuntime:{sessionOpen:true},normalizeGalaxyGateState(){},normalizeCombatAbilities(){},nowSec:()=>1,gateKeyForMap:()=>null,locationStorageKey:()=> 'earth:x3',readPositionCheckpoint:()=>null,mapRadarRange:()=>1650,
 computeStats(){c.player.maxHp=486000;c.player.maxShield=120557;c.player.hp=1;c.progress.hp=1;},clampStoredShieldV2013:(s,max)=>Math.min(s,max),positionCheckpointRuntime:{},authoritativeLocationRuntime:{},movementPositionRuntime:{},isGalaxyGateMap:()=>false,currentBasePoint:()=>({x:620,y:1500}),petRuntime:{},
 createLandmarks(){},galaxyEventRuntime:{},sharedUniverseRuntime:{},createBonusBoxes(){},joinSharedUniverse(){},renderAll(){},preloadActiveGameplayAssets(){}};
 vm.createContext(c);vm.runInContext(source('function savedLocationForCurrentMap(){','// V20.1.3')+source('function startLoadedGame(){','async function afterAuth(){'),c);c.startLoadedGame();
 assert.equal(c.player.hp,321000);assert.equal(c.player.shield,74000);assert.equal(c.player.x,2140);assert.equal(c.player.y,1820);assert.equal(c.progress.mapId,'x3');assert.equal(c.progress.locationSavedAt,123);
});

test('V146.1 actual optimistic purchase callback recalculates stats without healing hull or shield',()=>{
 const start=game.indexOf('applyLocal:(next,event)=>'),end=game.indexOf(',\n       applyRemote:',start),callback=game.slice(start+'applyLocal:'.length,end);let saved;
 const c={owner:uid,getUser:()=>({id:uid}),progress:initial(),player:{hp:125000,shield:34000,maxHp:486000,maxShield:120557},equipmentSavePendingV109:false,gameBootstrapRuntime:{loading:false},structuredClone,Math,hydrateProgress(){},buildAmmoButtons(){},renderShop(){},updateUI(){},saveGame(){saved={hp:c.progress.hp,shield:c.progress.shield};},computeStats(){c.player.hp=486000;c.player.shield=120557;}};
 vm.createContext(c);vm.runInContext(source('function computeStatsAfterEquipmentEditV2013(){','function equipShipItem(')+'\nvar apply='+callback,c);c.apply(initial(),{kind:'catalog'});assert.equal(c.player.hp,125000);assert.equal(c.player.shield,34000);assert.deepEqual(saved,{hp:125000,shield:34000});
});

test('V146.1 ready prefix bypasses later missing BOX proof; collections do not rebuild shop/stats on enqueue',async t=>{
 const store=await openLocalSaveV121({indexedDBFactory:new IDBFactory(),name:randomUUID()});t.after(()=>store.close());let local=initial(),manager,installs=0,prepared=0,releaseProof;const sent=[];
 manager=createEconomicManagerV146({store,owner:uid,getState:()=>local,applyLocal:()=>installs++,applyRemote:s=>local=manager.projectRemote(s),events:null,schedule:()=>1,cancel(){},prepareCollection:async()=>{prepared++;return new Promise(r=>releaseProof=r);},send:async batch=>{sent.push(batch);const s=structuredClone(local);s.serverEconomicAckV146={[batch[0].device]:batch.at(-1).sequence};return {state:s,results:batch.map(e=>({...e,status:'confirmed',receipt:{}}))};}});
 await manager.start(local,{available:true});const a=await manager.enqueue('collection',{drop_id:'v1461_box_one',proof:'ready'}),b=await manager.enqueue('collection',{drop_id:'v1461_box_two',proof:null});
 assert.equal(installs,0);await manager.flush();assert.deepEqual(sent[0].map(x=>x.id),[a.id]);assert.equal(prepared,1);releaseProof('proof');await manager.flush();assert.equal(sent[1][0].id,b.id);assert.equal(prepared,1);assert.equal(manager.count,0);manager.stop();
});

test('V146.1 racing contact replies send the first durably stored proof, so lost ACK replay retains the same hash',async t=>{
 const store=await openLocalSaveV121({indexedDBFactory:new IDBFactory(),name:randomUUID()});t.after(()=>store.close());let local=initial(),manager,wire;
 manager=createEconomicManagerV146({store,owner:uid,getState:()=>local,applyLocal(){},applyRemote:s=>local=manager.projectRemote(s),events:null,schedule:()=>1,cancel(){},prepareCollection:async e=>{assert.equal(await store.attachEconomicProof(uid,e.id,'first-proof'),'first-proof');return 'later-proof';},send:async events=>{wire=events;return {state:local,results:events.map(e=>({...e,status:'confirmed',receipt:{}}))};}});
 await manager.start(local,{available:true});await manager.enqueue('collection',{drop_id:'v1461_proof_race',proof:null});await manager.flush();assert.equal(wire[0].body.proof,'first-proof');manager.stop();
});

test('V146.1 100 AUX pickups remain valid after movement: production session context, signed contact and real SQL commits',async t=>{
 const db=await database(t);await db.exec(read('tests/fixtures/sql/STELLAR_V138_COLETA.sql'));await db.exec(read('sql/STELLAR_V146_OUTBOX.sql'));
 const session=randomUUID(),device=randomUUID();await db.query('insert into game_login_sessions_v1214(user_id,session_id) values($1,$2)',[uid,session]);await db.query('update game_saves set state=$2 where user_id=$1',[uid,petSave()]);
 const scope=createEconomicScopeV146(),adapter=scope.wrap(supabasePgliteV134(db)),proofs=createCollectionProofV146('secret'),rewards=createPlayerRewardsV134({db:adapter,readSystems:async()=>({}),world:()=>({}),secret:'secret'}),events=[];
 for(let i=1;i<=100;i++){
  const drop='v1461_contact_'+i;await db.query("insert into stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload) values($1,$2,'loot','earth:x1',500,400,'{\"resources\":{\"Prometium\":1}}')",[uid,drop]);
  const p=actor();p.pet.x=200;const arrival=collectionContactV1461(p,{pet:{owned:true,activeGear:'box',x:500,y:400}},room(),'pet');
  const body={drop_id:drop,collector:'pet'};body.proof=proofs.issue(uid,session,body,{room:room(),player:arrival});p.x=3000;p.pet.x=3100;
  events.push({id:randomUUID(),device,sequence:i,kind:'collection',resetEpoch:0,body});
 }
 const batch=createEconomicBatchV146({getDb:async()=>adapter,scope,collectionArrival:(req,b)=>proofs.verify(uid,b),handlers:{collection:async(req,res)=>res.json(await rewards.collect(uid,req.body,session,req.collectionArrivalV146))}});
 const send=async events=>{const res={status(n){this.code=n;return this;},set(){return this;},json(r){this.data=r;return this;}};await batch({user:{id:uid},body:{events}},res);return res.data;};
 for(let i=0;i<100;i+=40){const r=await send(events.slice(i,i+40));assert.equal(r.results.length,Math.min(40,100-i));assert.ok(r.results.every(e=>e.status==='confirmed'),JSON.stringify(r));}
 for(let i=0;i<100;i+=40)await send(events.slice(i,i+40));assert.equal((await db.query('select state from game_saves where user_id=$1',[uid])).rows[0].state.cargo.Prometium,100);
});

test('V146.1 base toolbar is above the ship and weapon bar in portrait/tablet/landscape; existing menu dispatch is retained',()=>{
 for(const [width,height,panelWidth,panelHeight] of [[360,800,320,98],[720,1600,320,134],[1280,720,560,80],[800,360,560,80]]){
  const ship={x:width/2,y:height/2},pos=baseActionsPositionV1461({ship,width,height,panelWidth,panelHeight,topInset:40,weaponTop:height-110});
  assert.ok(pos.top+panelHeight<ship.y);assert.ok(pos.top+panelHeight<height-110);assert.ok(pos.left>=12);assert.ok(pos.left+pos.width<=width-12);
 }
 const {document,window}=parseHTML(read('public/index.html')),nav=[],root=document.getElementById('baseModulePromptV140');
 const lines=game.split('\n').filter(line=>line.startsWith("document.getElementById('baseModulePromptV140')?.addEventListener"));vm.runInNewContext(lines.join('\n'),{document,baseNavV140:()=>({select:id=>nav.push(id),activate:()=>nav.push('open')})});
 assert.equal(root.querySelectorAll('[data-base-module]').length,4);
 for(const button of root.querySelectorAll('[data-base-module]'))button.dispatchEvent(new window.Event('click',{bubbles:true}));assert.deepEqual(nav,['missions','commerce','hangar','portals']);
 assert.match(read('public/style.css'),/\.base-module-prompt-v140\{[^}]*z-index:40/);
});
