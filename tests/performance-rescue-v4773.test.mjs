import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUALITY_PROFILES,initialAutoQualityForDevice} from '../public/modules/quality-profiles.js';
import {createWarbotEngine,warbotTarget,cleanWarbotConfig,WARBOT_DEFAULT} from '../server/warbot-engine-v477.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function setup(){
 const sent=[],ws={identity:{user:{id:'pilot1'}},player:{userId:'pilot1',faction:'mars',x:3200,y:1800,hp:9900},send:v=>sent.push(JSON.parse(v))};
 const room={mapId:'b41',map:{world:{w:9600,h:7600}},warfrontControl:{nodes:[{id:'A',x:3500,y:1850},{id:'B',x:5400,y:3100}]},clients:new Set([ws]),playerFresh:()=>true,playerSafe:()=>false,playerPortalNeutral:()=>false,broadcast:x=>sent.push(x)};
 return {room,ws,sent,engine:createWarbotEngine(room)};
}
const active=(mode='training')=>({enabled:true,mode,attack_players:mode==='conquest',bots_per_faction:2,tier:1,ends_at:new Date(Date.now()+600000).toISOString()});
test('BAIXA is no longer throttled at 30fps; GPU budgets remain low',()=>{
 assert.equal(QUALITY_PROFILES.low.fps,120);
 assert.equal(QUALITY_PROFILES.low.particles,6);
 assert.equal(QUALITY_PROFILES.low.dpr,1);
 assert.equal(QUALITY_PROFILES.low.assetCap,24);
 assert.equal(QUALITY_PROFILES.medium.fps,45);
 assert.equal(QUALITY_PROFILES.high.fps,60);
 assert.equal(initialAutoQualityForDevice({mobile:true,memory:2},470),'low');
});
test('Warbots update and publish at <= 150ms while keeping reward and attack limits',()=>{
 const w=read('server/warbot-engine-v477.js');
 assert.match(w,/NPC_CADENCE_MS=150/);assert.match(w,/lastPublishedAt>=150/);
 assert.match(w,/choice\.kind==='pilot'\?1300/);
 assert.match(w,/BOT_RESPAWN_MS=22000/);
 assert.match(w,/credits:0,uridium:0,xp:0/);
 assert.match(w,/TARGET_RADIUS=1450/);
});
test('Warbots do not persist player damage or change conquest and friendly-fire rules',()=>{
 const f=setup();f.engine.configure(active('conquest'));assert.equal(f.engine.bots.size,6);
 const other=[...f.engine.bots.values()].find(b=>b.faction==='earth');
 f.ws.player.x=other.x;f.ws.player.y=other.y;
 assert.equal(warbotTarget(other,f.engine.bots.values(),[f.ws],f.room,cleanWarbotConfig(active('conquest'))).kind,'pilot');
 f.engine.configure({...active('conquest'),enabled:false});assert.equal(f.engine.bots.size,0);
 assert.equal(WARBOT_DEFAULT.enabled,false);
});
test('U-X authorization refreshed only for authenticated admin and client never elevates itself',()=>{
 const game=read('public/game.js');
 assert.match(game,/PERF_RESCUE_FRONTIER_ADMIN_V4773/);
 assert.match(game,/await refreshAdminStatus\(true\)/);
 assert.match(game,/const beforeId=String\(getUser\(\)\?\.id\|\|''\)/);
 assert.match(game,/await verifiedFrontierTravelAccessV4773\(label\)/);
 assert.match(game,/async function jumpThroughPortal\(portal\)/);
 assert.doesNotMatch(game,/isAdminPilot\(\)\|\|true/);
});
test('U-X NPC recovery is isolated to frontier and preserves official level guard',()=>{
 const world=read('server/world.js');
 assert.match(world,/rows\.length>0\|\|!\/\^u\[1-3\]\$\//);
 assert.match(world,/U-X maps: reconcile NPC population/);
 assert.match(world,/r\.applyNpcRuntimeConfig\(\)/);
 assert.match(world,/!admin&&level<required/);
});
test('prior HUD, FX culling, SQL, saves, and economy stay untouched',()=>{
 const g=read('public/game.js'),h=read('public/index.html'),pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'47.7.3');assert.match(pkg.scripts.check,/v4773-apply-patch/);
 assert.match(g,/if\(!onScreenWorld\(Number\(a\.x\),Number\(a\.y\),160\)\&\&!onScreenWorld/);
 assert.match(h,/id="minimapMapLabelV4771"/);assert.match(h,/id="frontierExpansionBtnV42"/);
 assert.match(h,/\/game\.js\?v=47\.7\.3/);
 const files=read('scripts/v4773-apply-patch.mjs');
 assert.doesNotMatch(files,/DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+public\.game_saves/i);
});
