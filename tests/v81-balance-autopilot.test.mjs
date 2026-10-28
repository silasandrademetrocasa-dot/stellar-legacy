import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {NPC_TYPES,MAPS} from '../public/data.js';
import {chooseAutopilotAction,cleanAutopilotConfig,AUTOPILOT_ALLOWED_MAPS} from '../public/modules/stellar-autopilot-v48.js';
const read=p=>readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const balance=JSON.parse(read('docs/balance/v81/npc-values.json'));
const gates=JSON.parse(read('docs/balance/v81/gate-config.json'));
test('V81 NPC: 34 espécies e catálogos numéricos válidos; lendário de 6M HP',()=>{
 assert.equal(Object.keys(balance).length,34);
 assert.equal(NPC_TYPES.apexOverlord.hp,6000000);
 assert.equal(NPC_TYPES.apexOverlord.shield,4200000);
 for(const [key,c] of Object.entries(balance)){
  assert.ok(NPC_TYPES[key],key);
  assert.ok(Number.isFinite(c.xp)&&c.xp>0&&c.stl>0&&c.credits>0,key);
  assert.ok(Object.values(c.resources).every(n=>n>0),key);
 }
});
test('V81: X-7 tem exatamente 2 Apex; Battle Map não tem lendário',()=>{
 assert.equal(MAPS.x7.enemyGroups.find(e=>e.type==='apexOverlord')?.count,2);
 assert.equal(MAPS.b43.enemyGroups.find(e=>e.type==='apexOverlord'),undefined);
});
test('V81: Portal Astral não insere lendário e tem diversidade, limite de 240 por protocolo',()=>{
 const monsters=new Set(Object.keys(balance));
 for(const [key,d] of Object.entries(gates)){
  assert.ok(d.rounds.length>=6,key);
  const waves=d.rounds.flatMap(x=>x.waves);
  assert.ok(waves.every(x=>monsters.has(x.type)&&x.type!=='apexOverlord'&&x.count>=1&&x.count<=15),key);
  assert.ok(waves.reduce((n,x)=>n+x.count,0)<=240,key);
  assert.ok(d.finalReward.credits>d.roundReward.credits,key);
 }
 assert.ok(gates.beta.rounds.some(r=>r.waves.some(w=>w.type==='ironWasp')));
 assert.ok(gates.gamma.rounds.some(r=>r.waves.some(w=>w.type==='bossAstralReaper')));
});
test('V81: opção astral não é ativada por padrão nem permite viagem a mapas especiais',()=>{
 const c=cleanAutopilotConfig();assert.equal(c.astralAssist,false);
 assert.equal(AUTOPILOT_ALLOWED_MAPS.includes('ggAlpha'),false);
 assert.equal(cleanAutopilotConfig({astralBudget:99999999}).astralBudget,1000000);
});
test('V81: combate assistido no gate exige opt-in, pode caçar guardião real, sem premiar',()=>{
 const s={online:true,ready:true,map:'ggBeta',astralActive:true,player:{x:0,y:0,hp:1000,maxHp:1000},
  enemies:[{id:'npc1',type:'bossIronWasp',name:'Prime',x:100,y:100,hp:10000,shield:5000}],
  laserRange:800,rocketRange:800,ammoStock:500,rocketStock:20,cargoCapacity:100,cargoUsed:0,cargoFree:100};
 assert.equal(chooseAutopilotAction(s,cleanAutopilotConfig()).type,'pause');
 assert.equal(chooseAutopilotAction(s,cleanAutopilotConfig({astralAssist:true})).type,'hunt');
 assert.equal(chooseAutopilotAction({...s,player:{x:0,y:0,hp:20,maxHp:1000}},cleanAutopilotConfig({astralAssist:true})).type,'pause');
});
test('V81: migração da curva de XP preservada; economia e saves jamais são escritos pelo patch SQL',()=>{
 const sql=read('sql/STELLAR_V81_BALANCEAMENTO_SQL_APLICAR.sql');
 assert.match(sql,/game_npc_config_v1811/);
 assert.match(sql,/game_map_npc_spawns_v1811/);
 assert.match(sql,/game_mission_custom_v1815/);
 assert.match(sql,/galaxy_gate_config_v1906/);
 assert.ok(!/\b(?:UPDATE|DELETE\s+FROM|TRUNCATE)\s+public\.(?:game_saves|profiles|player_level_milestones)/i.test(sql));
 const curve=read('public/level-curve-v482.js');assert.match(curve,/PILOT_LEVEL_MAX_V482=44/);
});

test('V81: montagem astral usa apenas lotes de giro permitidos no backend',()=>{const game=read('public/game.js');assert.match(game,/affordable>=requestedBatch\?requestedBatch:affordable>=10\?10:affordable>=5\?5:affordable>=1\?1:0/);});
