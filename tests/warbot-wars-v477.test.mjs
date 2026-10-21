import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWarbotEngine,cleanWarbotConfig,WARBOT_DEFAULT,WARBOT_MAPS} from '../server/warbot-engine-v477.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function makeRoom(mapId='b41'){
 const messages=[],sent=[];
 const player={userId:'pilot1',faction:'mars',x:3000,y:2000,hp:100000,shield:150000,updatedAt:Date.now()};
 const ws={player,identity:{user:{id:'pilot1'},isAdmin:false},send:s=>sent.push(JSON.parse(s))};
 const room={mapId,map:{world:{w:9000,h:7000}},clients:new Set([ws]),warfrontControl:{nodes:[{id:'A',x:3000,y:2000},{id:'B',x:4500,y:3500},{id:'C',x:6500,y:5000}]},
  playerFresh:()=>true,broadcast:p=>messages.push(p)};
 const engine=createWarbotEngine(room);return {engine,room,ws,player,messages,sent};
}
const on=(mode='training',overrides={})=>({enabled:true,mode,bots_per_faction:2,tier:1,attack_players:false,ends_at:new Date(Date.now()+30*60000).toISOString(),...overrides});
test('V47.7 defaults OFF, has exactly three PvP maps',()=>{
 assert.equal(WARBOT_DEFAULT.enabled,false);assert.deepEqual(WARBOT_MAPS,['b41','b42','b43']);
 const {engine}=makeRoom();engine.configure();assert.equal(engine.bots.size,0);
});
test('V47.7 three factions spawn server-owned entities; each has zero economy',()=>{
 const {engine}=makeRoom();engine.configure(on());assert.equal(engine.bots.size,6);
 assert.deepEqual(new Set([...engine.bots.values()].map(x=>x.faction)),new Set(['earth','mars','jupiter']));
 for(const bot of engine.bots.values()){const p=engine.publicBot(bot);assert.equal(p.credits,0);assert.equal(p.uridium,0);assert.equal(p.xp,0);assert.equal(p.warBot,true);}
});
test('V47.7 per-map bot count limited to 4 per faction and disabling wipes all',()=>{
 const {engine,messages}=makeRoom();engine.configure(on('conquest',{bots_per_faction:99}));assert.equal(engine.bots.size,12);
 engine.configure({...on(),enabled:false});assert.equal(engine.bots.size,0);assert.ok(messages.some(x=>x.type==='warbot_clear'));
});
test('V47.7 expired configuration cannot produce active bots',()=>{
 const {engine}=makeRoom();engine.configure(on('training',{ends_at:new Date(Date.now()-1000).toISOString()}));assert.equal(engine.bots.size,0);
 assert.equal(cleanWarbotConfig(on('training',{attack_players:true})).attack_players,false);
});
test('V47.7 server-authorized hits never produce a kill reward',()=>{
 const {engine,ws,sent,messages}=makeRoom();engine.configure(on());
 const b=[...engine.bots.values()].find(x=>x.faction==='earth');ws.player.x=b.x;ws.player.y=b.y;
 engine.handleHit(ws,{entityId:b.id,damage:10000000,mode:'damage'},()=>({allowed:true}));
 assert.ok(sent.some(x=>x.type==='warbot_damage_result'&&x.actual<=2000000));
 assert.equal(messages.some(x=>['npc_death','npc_kill_reward','npc_rewards','warfront_capture_result'].includes(x.type)),false);
});
test('V47.7 malicious hits rejected by guard, and out-of-range shots have no effect',()=>{
 const {engine,ws,sent}=makeRoom();engine.configure(on());const b=[...engine.bots.values()][0];
 const hp=b.hp,shield=b.shield;
 engine.handleHit(ws,{entityId:b.id,damage:99999},()=>({allowed:false,reason:'rate'}));
 assert.equal(b.hp,hp);assert.equal(b.shield,shield);assert.equal(sent.at(-1).rejected,'rate');
 ws.player.x=9000;ws.player.y=7000;
 engine.handleHit(ws,{entityId:b.id,damage:1000},()=>({allowed:true}));assert.equal(b.hp,hp);
});
test('V47.7 bot-versus-bot produces visual combat but not SQL capture or pilot rewards',()=>{
 const {engine,messages}=makeRoom();engine.configure(on('conquest'));
 for(let i=0;i<13;i++)engine.tick(.45,Date.now()+i*480);
 assert.ok(messages.some(m=>m.type==='warbot_state'));
 assert.ok(messages.some(m=>m.type==='warbot_fire'));
 assert.equal(messages.some(m=>/capture|reward|loot|mission|xp/i.test(m.type)),false);
});
test('V47.7 SQL grants only service_role and blocks clients',()=>{
 const sql=read('sql/STELLAR_V47_7_GALACTIC_BOT_WARS.sql');
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/i);assert.match(sql,/REVOKE ALL .*anon, authenticated/i);assert.match(sql,/TO service_role/i);
 assert.doesNotMatch(sql,/(?:DELETE\s+FROM|UPDATE)\s+public\.(?:game_saves|profiles|stellar_warfront_nodes)/i);
});
test('V47.7 installer wires server, client, ADM, and test references',()=>{
 const patch=read('scripts/v477-apply-patch.mjs');
 for(const part of ['warbot_damage_result','warbot_state','handleWarbotMessageV477','createWarbotAdminV477','refreshWarbotSettings','admitNpcDamage'])assert.ok(patch.includes(part),part);
 assert.match(patch,/v477-apply-patch/);assert.ok(patch.includes('id=\"warbotAdminRoot\"'));
});
