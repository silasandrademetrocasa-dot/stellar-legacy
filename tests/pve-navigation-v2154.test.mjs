import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAPS} from '../public/data.js';
import {movementSpeed,nominalMovementSpeed,FLIGHT_PACING_FACTOR,followShipCamera,PVE_MAP_DIMENSIONS,PVE_CRUISE_FACTOR,PVP_MAP_DIMENSIONS,PVP_CRUISE_FACTOR} from '../public/modules/ship-navigation.js';
const sql=readFileSync(new URL('../sql/V21_5_4_EQUILIBRIO_MAPAS_PVE.sql',import.meta.url),'utf8');
test('todos os oito mapas PvE crescem e correspondem ao modulo de dimensoes',()=>{
 assert.equal(Object.keys(PVE_MAP_DIMENSIONS).length,8);
 for(const [id,dimension] of Object.entries(PVE_MAP_DIMENSIONS)){
  assert.deepEqual(MAPS[id].world,dimension,id);
  assert.ok(dimension.w>=7200&&dimension.h>=5400,id);
  assert.match(sql,new RegExp(`'${id}'\\s*,`));
 }
});
test('CONF corrida continua mais rapida e ambos os modos usam mesmo equilibrio',()=>{
 for(const id of [...Object.keys(PVE_MAP_DIMENSIONS),...Object.keys(PVP_MAP_DIMENSIONS)]){
  const factor=id.startsWith('x')?PVE_CRUISE_FACTOR:PVP_CRUISE_FACTOR;
  assert.equal(movementSpeed(400,id),400*factor*FLIGHT_PACING_FACTOR);
  assert.ok(movementSpeed(700,id)>movementSpeed(400,id));
  assert.equal(movementSpeed(700,id,1.3),700*1.3*factor*FLIGHT_PACING_FACTOR);
 }
});
test('arenas temporizadas nao sofrem alteracao de velocidade ou escala',()=>{
 for(const id of ['ggAlpha','ggBeta','ggGamma']) assert.equal(movementSpeed(700,id),700);
 assert.equal(MAPS.ggAlpha.world.w,7200);
 assert.doesNotMatch(sql,/UPDATE public\.game_saves|UPDATE public\.stellar_warfront_nodes/);
 assert.match(sql,/m\.battle = false AND m\.gate = false/);
});
test('camera segue centralizada nos mapas PvE e PvP',()=>{
 for(const id of ['x1','x8','b41']){
  assert.ok(MAPS[id]);
  const cam=followShipCamera({x:50,y:50},{x:1000,y:600},.04);
  assert.ok(Math.hypot(1000-cam.x,600-cam.y)<=14.001);
 }
});
test('portais PvE estaticos acompanham as dimensoes, sem extrapolar os limites',()=>{
 for(const id of ['x1','x2','x3','x4']){
  const map=MAPS[id];
  for(const portal of map.portals){assert.ok(portal.x>0&&portal.x<map.world.w);assert.ok(portal.y>0&&portal.y<map.world.h);}
 }
});
