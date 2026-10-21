import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWarbotEngine,warbotTarget,warbotRole,warbotTacticalMove,warbotPlayerEligible,WARBOT_DEFAULT} from '../server/warbot-engine-v477.js';
import {drawWarbotShipV477,WARBOT_SHIP_ASSETS} from '../public/modules/warbot-visual-v477.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const conf=(mode='training',extra={})=>({enabled:true,mode,bots_per_faction:2,tier:1,attack_players:false,ends_at:new Date(Date.now()+1800000).toISOString(),...extra});
function setup(protection={}){
 const events=[],received=[];
 const pilot={userId:'player-01',faction:'mars',hp:100000,maxHp:100000,shield:80000,x:3000,y:2000};
 const ws={player:pilot,identity:{user:{id:'player-01'},isAdmin:false},send:x=>received.push(JSON.parse(x))};
 const room={mapId:'b41',map:{world:{w:9000,h:7000}},warfrontControl:{nodes:[{id:'A',x:3000,y:2000},{id:'B',x:4500,y:3500},{id:'C',x:6500,y:5000}]},clients:new Set([ws]),playerFresh:()=>true,playerSafe:()=>!!protection.safe,playerPortalNeutral:()=>!!protection.portal,broadcast:m=>events.push(m)};
 return {pilot,ws,room,events,received,engine:createWarbotEngine(room)};
}
test('roles and three preexisting faction sprite paths',()=>{
 assert.equal(WARBOT_DEFAULT.enabled,false);
 assert.deepEqual([0,1,2,3].map(warbotRole),['interceptor','assault','guardian','support']);
 for(const f of ['earth','mars','jupiter'])assert.equal(WARBOT_SHIP_ASSETS[f],`/assets/v2212/ships/${f}-map.webp`);
});
test('authorized pilot outranks NPC bot when ADM allows attacks',()=>{
 const f=setup();f.engine.configure(conf('conquest',{attack_players:true}));
 const b=[...f.engine.bots.values()].find(x=>x.faction==='earth');f.pilot.x=b.x+200;f.pilot.y=b.y+50;
 assert.equal(warbotTarget(b,f.engine.bots.values(),[f.ws],f.room,conf('conquest',{attack_players:true})).kind,'pilot');
 assert.equal(warbotTarget(b,f.engine.bots.values(),[f.ws],f.room,conf('conquest',{attack_players:false})).kind,'bot');
});
test('conquest actually sends server attack to enemy pilot when enabled',()=>{
 const f=setup();f.engine.configure(conf('conquest',{attack_players:true}));
 const b=[...f.engine.bots.values()].find(x=>x.faction==='earth');f.pilot.x=b.x+110;f.pilot.y=b.y+40;
 const start=Date.now();for(let i=0;i<9;i++)f.engine.tick(.35,start+i*340);
 assert.ok(f.received.some(x=>x.type==='npc_attack'&&x.entityId===b.id));
 assert.ok(f.events.some(x=>x.type==='warbot_fire'&&x.target==='pilot'));
});
test('safe zone and portal protection prohibit bot attack',()=>{
 for(const protection of [{safe:true},{portal:true}]){
  const f=setup(protection);f.engine.configure(conf('conquest',{attack_players:true}));
  const b=[...f.engine.bots.values()].find(x=>x.faction==='earth');f.pilot.x=b.x+100;f.pilot.y=b.y+40;
  const start=Date.now();for(let i=0;i<7;i++)f.engine.tick(.35,start+i*340);
  assert.equal(f.received.filter(x=>x.type==='npc_attack').length,0);
 }
});
test('provoked training bot retaliates without touching real HP',()=>{
 const f=setup();f.engine.configure(conf('training'));
 const b=[...f.engine.bots.values()].find(x=>x.faction==='earth');f.pilot.x=b.x+100;f.pilot.y=b.y+50;
 f.engine.handleHit(f.ws,{entityId:b.id,mode:'damage',damage:500},()=>({allowed:true}));
 const start=Date.now();for(let i=0;i<9;i++)f.engine.tick(.35,start+i*340);
 assert.ok(f.received.some(x=>x.type==='warbot_spar_hit'));
 assert.equal(f.received.some(x=>x.type==='npc_attack'),false);
 assert.equal(f.pilot.hp,100000);
});
test('friendly pilots protected from conquest fire; training allows deliberate spar',()=>{
 const f=setup(),b={id:'x',faction:'mars',aggroPilotId:f.pilot.userId,aggroPilotUntil:Date.now()+10000};
 assert.equal(warbotPlayerEligible(f.room,b,f.ws,conf('conquest',{attack_players:true})),false);
 assert.equal(warbotPlayerEligible(f.room,b,f.ws,conf('training')),true);
});
test('tactical movement flanks, retreats, and respects bounds',()=>{
 const b={x:400,y:400,role:'interceptor',index:0,hp:100,maxHp:400,shield:0,maxShield:700,speed:230};
 const t={x:750,y:750};const p=warbotTacticalMove(b,t,true,.3,{w:6000,h:4000});
 assert.ok(Math.hypot(p.x-b.x,p.y-b.y)>1);
 assert.ok(p.x>=95&&p.y>=95&&p.x<=5905&&p.y<=3905);
});
test('faction WebP renders using cached image, no shadow performance cost',()=>{
 const calls=[];const ctx={save(){calls.push('save')},restore(){calls.push('restore')},rotate(){},translate(){},drawImage(){calls.push('drawImage')},setLineDash(){},beginPath(){},arc(){},stroke(){}};
 drawWarbotShipV477(ctx,{x:0,y:0,faction:'mars',role:'interceptor',spriteImage:{naturalWidth:140,naturalHeight:90}},true,'low');
 assert.deepEqual(calls,['save','save','drawImage','restore','restore']);
});
test('HUD and minimap use exact current map and remove floating UNIVERSO button',()=>{
 const game=read('public/game.js'),html=read('public/index.html'),pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'47.7.2');assert.match(pkg.scripts.check,/v4772-apply-patch/);
 assert.match(game,/spriteImage:assetImage\(WARBOT_SHIP_ASSETS\[e\.faction\]\)/);
 assert.match(game,/MAPA '\+displayMapLabel\(progress\.mapId,currentTerritoryFaction\(\)\)/);
 assert.match(html,/id="minimapMapLabelV4771"/);
 assert.equal((html.match(/id="frontierExpansionBtnV42"/g)||[]).length,1);
 assert.match(html,/<nav class="top-actions command-actions"[\s\S]*?id="frontierExpansionBtnV42"[\s\S]*?<\/nav>/);
 assert.match(html,/\/game\.js\?v=47\.7\.2/);
});
test('authoritative ephemeral gameplay never rewards bot combat or persists captures',()=>{
 const g=read('server/warbot-engine-v477.js');
 assert.match(g,/room\.playerSafe/);assert.match(g,/room\.playerPortalNeutral/);
 assert.doesNotMatch(g,/grantNpcReward|persistCapture\(|battlePassEvent|saveGame\(/);
 assert.match(read('server/world.js'),/this\.warbotEngine\.handleHit/);
 assert.match(read('server/index.js'),/loadWarbotConfig/);
});
