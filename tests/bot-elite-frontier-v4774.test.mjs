import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {warbotTacticalMove,createWarbotEngine,WARBOT_DEFAULT} from '../server/warbot-engine-v477.js';
import {WARBOT_SHIP_ASSETS,drawWarbotShipV477} from '../public/modules/warbot-visual-v477.js';
import {sectorEntryAllowedV450} from '../server/frontier-stability-v450.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const world={w:9000,h:7000};
const goal={x:3500,y:3000};
function movement(role){const b={x:2000,y:3000,role,index:0,hp:100000,maxHp:100000,shield:100000,maxShield:100000,speed:160,angle:0};
 let d0=Math.hypot(goal.x-b.x,goal.y-b.y);for(let i=0;i<85;i++)Object.assign(b,warbotTacticalMove(b,goal,true,.15,world));return {start:d0,end:Math.hypot(goal.x-b.x,goal.y-b.y),b};}
for(const role of ['interceptor','assault','guardian','support'])test(`V47.7.5 ${role} closes distance without permanently fleeing`,()=>{
 const r=movement(role);assert.ok(r.end<r.start*.38,`${role} end distance ${r.end}`);
 assert.ok(Number.isFinite(r.b.angle));assert.ok(r.b.x>=95&&r.b.x<=world.w-95);
});
test('V47.7.5 heavily damaged ship retreats gently, healthy one pressures target',()=>{
 const b={x:1100,y:3000,role:'assault',index:1,hp:70000,maxHp:100000,shield:10000,maxShield:100000,speed:150};
 const normal=warbotTacticalMove(b,{x:1280,y:3000},true,.15,world);
 assert.ok(normal.x>=b.x,'healthy ship must not flee');
 const hurt={...b,hp:20000,shield:1000};
 const damaged=warbotTacticalMove(hurt,{x:1280,y:3000},true,.15,world);
 assert.ok(damaged.x<b.x,'critical ship may retreat a little');
 assert.ok(Math.abs(damaged.x-b.x)<40,'retreat cannot look like teleportation');
});
test('V47.7.5 Warbot retains 150ms synchronization, damage and reward protections',()=>{
 const src=read('server/warbot-engine-v477.js');
 for(const needle of ['NPC_CADENCE_MS=150','lastPublishedAt>=150',"choice.kind==='pilot'?1300",'credits:0,uridium:0,xp:0','BOT_RESPAWN_MS=22000'])assert.ok(src.includes(needle),needle);
 assert.match(src,/speed:\(role==='interceptor'\?182:/);
 assert.ok(WARBOT_DEFAULT.enabled===false);
});
test('V47.7.5 reuses production NPC Elite/Prime art, no new downloads or extra atlas',()=>{
 const expected=['colossar-prime.webp','dreadnox-prime.webp','kharon-prime.webp'];
 assert.deepEqual(Object.keys(WARBOT_SHIP_ASSETS),['earth','mars','jupiter']);
 assert.deepEqual(Object.values(WARBOT_SHIP_ASSETS).map(x=>x.split('/').at(-1)),expected);
 for(const src of Object.values(WARBOT_SHIP_ASSETS))assert.match(src,/^\/assets\/v17\/npcs\/[\w-]+\.webp$/);
});
test('V47.7.5 sprite rotation matches NPC renderer and draws 1 ship with low FX',()=>{
 const angles=[],images=[];
 const ctx={save(){},restore(){},translate(){},rotate(a){angles.push(a)},drawImage(...args){images.push(args)},beginPath(){},arc(){},stroke(){},setLineDash(){},scale(){},fill(){},moveTo(){},lineTo(){},closePath(){}};
 const image={naturalWidth:180,naturalHeight:160};
 drawWarbotShipV477(ctx,{x:100,y:200,angle:Math.PI/2,faction:'earth',role:'assault',spriteImage:image},false,'low',0);
 assert.equal(images.length,1);assert.ok(Math.abs(angles[0])<1e-9,`north-facing rotation offset mismatch ${angles[0]}`);
});
test('V47.7.5 U rooms require a neutral enabled SQL sector even during startup',()=>{
 assert.equal(sectorEntryAllowedV450('u1',true,null,'earth'),false);
 assert.equal(sectorEntryAllowedV450('u2',true,{enabled:true,territory_faction:null},'mars'),true);
 assert.equal(sectorEntryAllowedV450('u3',true,{enabled:false,territory_faction:null},'jupiter'),false);
 assert.equal(sectorEntryAllowedV450('u1',true,{enabled:true,territory_faction:'mars'},'earth'),false);
 assert.equal(sectorEntryAllowedV450('x7',true,null,'earth'),true);
});
test('V47.7.5 new U-X entrance checks signed-in server RPC, not display name',()=>{
 const api=read('public/api.js'),server=read('server/index.js'),game=read('public/game.js');
 assert.match(api,/export async function frontierAdminAccessV4774/);
 assert.match(server,/app\.get\('\/api\/frontier\/admin-entry',requireUser/);
 assert.match(server,/\.rpc\('is_game_admin_v1763',\{p_uid:req\.user\.id\}\)/);
 assert.match(game,/frontierAdminAccessV4774\(sectorDestinationV435/);
 assert.doesNotMatch(game,/isAdminPilot\(\)\s*\|\|\s*isVerifiedAdminNavigator/);
});
test('V47.7.5 NPC hydration is limited to U rooms, safe from repeated spawning',()=>{
 const s=read('server/world.js');assert.match(s,/world\.refreshNpcConfig\(false\)/);
 assert.match(s,/await world\.refreshWorldConfig\(true\)/);
 assert.match(s,/if\(ws\.room!==r\|\|r\.npcs\.size>0\)return/);
 assert.match(s,/r\.applyNpcRuntimeConfig\(\)/);
 assert.match(s,/!admin&&level<required/);
});
test('V47.7.5 does not change FPS, SQL schema, economy, saves or relay ownership',()=>{
 const patch=read('scripts/v4775-apply-patch.mjs');
 assert.doesNotMatch(patch,/DROP\s+TABLE|UPDATE\s+game_saves|DELETE\s+FROM|\.credits\s*\+=/i);
 assert.match(read('package.json'),/"version": "47\.7\.5"/);
 assert.match(read('public/game.js'),/frontierAdminAccessV4774/);
 assert.match(read('public/modules/warbot-visual-v477.js'),/Math\.PI\/2/);
});
