import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAPS} from '../public/data.js';
import {movementSpeed,followShipCamera,PVP_MAP_DIMENSIONS,PVP_CRUISE_FACTOR} from '../public/modules/ship-navigation.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../sql/V21_5_3_CAMERA_MAPA_BALANCEADO.sql',import.meta.url),'utf8');
test('camera cola no piloto em FPS baixo sem gerar distorcao/olhar adiante',()=>{
  const result=followShipCamera({x:0,y:0},{x:1250,y:750},.05);
  assert.ok(Math.hypot(result.x-1250,result.y-750)<=14.00001);
  assert.equal(followShipCamera({x:250,y:300},{x:250,y:300},.05).x,250);
  assert.deepEqual(followShipCamera({x:100,y:100},{x:900,y:900},.05,{maxLag:0}),{x:900,y:900});
  assert.deepEqual(followShipCamera({x:4,y:5},{x:Infinity,y:1},.05),{x:4,y:5});
});
test('camera e movementSpeed estao no loop principal',()=>{
  assert.match(game,/followShipCamera\(state\.camera,player,dt\)/);
  assert.match(game,/movementSpeed\(player\.speed,progress\?\.mapId,shipAbilitySpeedMultiplier\(\)\)\*dt/);
  assert.doesNotMatch(game,/state\.camera\.x\+=\(player\.x-state\.camera\.x\)\*\.08/);
});
test('nave local e remota preservam proporcoes dos sprites e continuam girando',()=>{
  const local=game.match(/function drawPlayer\(\)\{[\s\S]*?function drawWarfront/)?.[0]||game.slice(game.indexOf('function drawPlayer()'),game.indexOf('function drawPlayer()')+2500);
  const online=game.slice(game.indexOf('function drawOnlinePlayers()'),game.indexOf('function drawLocalShipVitals('));
  assert.ok(local.includes('ctx.rotate(a+Math.PI/2)'));
  assert.ok(online.includes('ctx.rotate((rp.angle||0)+Math.PI/2)'));
  assert.doesNotMatch(local,/ctx\.transform\(1,0,bank/);
  assert.doesNotMatch(online,/ctx\.transform\(1,0,bank/);
  assert.doesNotMatch(local,/ctx\.scale\(1\+Math\.abs\(bank/);
});
test('mapas PvP 20% maiores com IDs e pontos preservados, sem afetar PvE',()=>{
  for(const [key,expected] of Object.entries(PVP_MAP_DIMENSIONS))assert.deepEqual(MAPS[key].world,expected);
  assert.equal(MAPS.x1.world.w,6000);
  assert.equal(MAPS.x2.world.h,4800);
  assert.match(sql,/UPDATE public\.game_map_config_v1814/);
  assert.doesNotMatch(sql,/UPDATE public\.stellar_warfront_nodes/);
  assert.match(sql,/world_w=9800/);
});
test('CONF corrida continua proporcionalmente mais veloz que CONF escudos',()=>{
  const slow=movementSpeed(420,'b41');const fast=movementSpeed(730,'b41');
  assert.ok(fast>slow*1.7);
  assert.equal(fast,730*PVP_CRUISE_FACTOR);
  assert.equal(movementSpeed(730,'x1'),730);
  assert.equal(movementSpeed(730,'b41',1.2),730*1.2*PVP_CRUISE_FACTOR);
});
