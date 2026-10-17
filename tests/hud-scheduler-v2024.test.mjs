import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHudUpdateScheduler} from '../public/modules/hud-update-scheduler.js';

test('primeiro frame faz render completo',()=>{
  const schedule=createHudUpdateScheduler();
  assert.deepEqual(schedule.next('low',0),{full:true,fast:true,ammo:true});
});
test('perfil baixo atualiza informacoes criticas antes das secundarias',()=>{
  const s=createHudUpdateScheduler();s.next('low',0);
  assert.deepEqual(s.next('low',80),{full:false,fast:false,ammo:false});
  assert.deepEqual(s.next('low',145),{full:false,fast:true,ammo:false});
  assert.deepEqual(s.next('low',390),{full:false,fast:true,ammo:true});
  assert.deepEqual(s.next('low',855),{full:true,fast:true,ammo:true});
});
test('modo alto exige render completo com menos atraso',()=>{
  const s=createHudUpdateScheduler();s.next('high',0);
  assert.deepEqual(s.next('high',110),{full:false,fast:true,ammo:false});
  assert.deepEqual(s.next('high',560),{full:true,fast:true,ammo:true});
});
test('updateUI explicito pausa o render periodico sem bloquear controles',()=>{
  const s=createHudUpdateScheduler();s.next('low',0);s.markFull(120);
  assert.deepEqual(s.next('low',200),{full:false,fast:false,ammo:false});
  assert.equal(s.next('low',980).full,true);
});
test('motor preserva simulacao e disponibiliza HUD critico',()=>{
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(game,/function updateCriticalHudV2024\(\)/);
  for(const name of ['updatePlayer(dt)','updateEnemies(dt)','updatePet(dt)','updateOnlineWorld(dt)','updateFrameHudV2024(profile)'])assert.ok(game.includes(name),name);
  assert.match(game,/function updateUI\(\)\{\s*HUD_SCHEDULER\.markFull/);
  assert.ok(!game.includes('lastLowHudUpdateAt'));
});
test('layout otimiza leituras de geometria e agrupa pedidos em um frame',()=>{
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(game,/let hudLayoutPendingV2024=false/);
  assert.match(game,/function updateHudLayoutVariableV2024/);
  assert.ok(!game.includes('requestAnimationFrame(layoutHudPanels)'));
});
