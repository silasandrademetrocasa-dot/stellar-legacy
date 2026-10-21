import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWarbotEngine, WARBOT_DEFAULT, warbotTarget, warbotPlayerEligible} from '../server/warbot-engine-v477.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=(mode='training',overrides={})=>({enabled:true,mode,bots_per_faction:2,tier:1,attack_players:mode==='conquest',ends_at:new Date(Date.now()+600000).toISOString(),...overrides});
function fixture(zone){
 const incoming=[],events=[];
 const p={userId:'pilot1',faction:'mars',x:3100,y:2500,hp:10000};
 const socket={player:p,identity:{user:{id:'pilot1'},isAdmin:false},send:s=>incoming.push(JSON.parse(s))};
 const room={mapId:'b41',map:{world:{w:9500,h:7000}},warfrontControl:{nodes:[{id:'A',x:3000,y:2500},{id:'B',x:5500,y:4000}]},clients:new Set([socket]),playerFresh:()=>true,playerSafe:()=>zone==='base',playerPortalNeutral:()=>zone==='portal',broadcast:e=>events.push(e)};
 return {incoming,events,p,socket,room,engine:createWarbotEngine(room)};
}
test('all bots stay off when control is disabled',()=>{
 const f=fixture();f.engine.configure(config('training'));assert.ok(f.engine.bots.size>0);
 f.engine.configure({...config(),enabled:false});assert.equal(f.engine.bots.size,0);
 assert.ok(f.events.some(e=>e.type==='warbot_clear'));
 assert.equal(WARBOT_DEFAULT.enabled,false);
});
for(const zone of ['base','portal']){
 test(`protected pilot cannot damage bots from ${zone}`,()=>{
  const f=fixture(zone);f.engine.configure(config('training'));
  const target=[...f.engine.bots.values()].find(b=>b.faction==='earth');f.p.x=target.x+25;f.p.y=target.y+30;
  const before=[target.hp,target.shield];let calls=0;
  f.engine.handleHit(f.socket,{entityId:target.id,mode:'damage',damage:4000},()=>{calls++;return {allowed:true};});
  assert.deepEqual([target.hp,target.shield],before);
  assert.equal(target.aggroPilotId,null);
  assert.equal(calls,0);
  assert.ok(f.incoming.some(x=>x.rejected==='safe_zone'&&x.actual===0));
 });
}
test('eligible pilot outside protected zones can spar without changing real HP',()=>{
 const f=fixture(null);f.engine.configure(config('training'));
 const target=[...f.engine.bots.values()].find(b=>b.faction==='earth');f.p.x=target.x+25;f.p.y=target.y+20;
 f.engine.handleHit(f.socket,{entityId:target.id,damage:1000,mode:'damage'},()=>({allowed:true}));
 assert.equal(target.aggroPilotId,f.p.userId);
 assert.equal(f.p.hp,10000);
 assert.ok(f.incoming.some(x=>x.type==='warbot_damage_result'&&x.actual>0));
});
test('conquest faction guards and player-attack toggle remain intact',()=>{
 const f=fixture();f.engine.configure(config('conquest'));
 const enemy=[...f.engine.bots.values()].find(b=>b.faction==='earth');f.p.x=enemy.x+40;f.p.y=enemy.y+30;
 assert.equal(warbotPlayerEligible(f.room,enemy,f.socket,config('conquest')),true);
 assert.equal(warbotPlayerEligible(f.room,enemy,f.socket,config('conquest',{attack_players:false})),false);
 assert.equal(warbotTarget(enemy,f.engine.bots.values(),[f.socket],f.room,config('conquest')).kind,'pilot');
});
test('offscreen warbot fire is discarded before audio, preserving on-screen effects',()=>{
 const game=read('public/game.js');const cut=game.slice(game.indexOf("if(msg.type==='warbot_fire')"),game.indexOf('function drawWarbotBeamsV477()'));
 assert.ok(cut.includes('if(!onScreenWorld(Number(a.x),Number(a.y),160)&&!onScreenWorld(Number(b.x),Number(b.y),160))return true;'));
 assert.ok(cut.indexOf('if(!onScreenWorld(')<cut.indexOf('warbotBeamsV477.push('));
 assert.ok(cut.indexOf('if(!onScreenWorld(')<cut.indexOf("playSfx('petLaser')"));
});
test('old minimap and topbar remain single-instance and update to current map',()=>{
 const game=read('public/game.js'),html=read('public/index.html');
 assert.equal((html.match(/id="minimapMapLabelV4771"/g)||[]).length,1);
 assert.equal((html.match(/id="frontierExpansionBtnV42"/g)||[]).length,1);
 assert.ok(game.includes("'MAPA '+displayMapLabel(progress.mapId,currentTerritoryFaction())"));
 assert.ok(html.includes('/game.js?v=47.7.2'));
});
test('no changes to reward, drop, capture, saves, or SQL in this release',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'47.7.2');assert.match(pkg.scripts.check,/v4772-apply-patch/);
 const engine=read('server/warbot-engine-v477.js');
 assert.doesNotMatch(engine,/grantNpcReward|persistCapture\(|battlePassEvent|saveGame\(/);
 const patch=read('scripts/v4772-apply-patch.mjs');
 assert.doesNotMatch(patch,/DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+public\.game_saves/i);
 assert.ok(patch.includes('offscreen battle effects'));
});
