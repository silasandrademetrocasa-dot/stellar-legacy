import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createPeriodicHudBudgetV73} from '../public/modules/periodic-hud-v73.js';
import {createRenderPhaseProfilerV73} from '../public/modules/render-phase-profiler-v73.js';
const root=resolve(import.meta.dirname,'..');
test('V73 limita ciclos periódicos de HUD sem bloquear updates explícitos',()=>{
  const gate=createPeriodicHudBudgetV73({intervalMs:1250});
  assert.equal(gate.shouldSchedule(0),true);
  assert.equal(gate.shouldSchedule(550),false);
  assert.equal(gate.shouldSchedule(1249),false);
  assert.equal(gate.shouldSchedule(1250),true);
  assert.equal(gate.snapshot().accepted,2);
});
test('V73 calcula P95 de fases desenhadas com amostras locais',()=>{
  const profiler=createRenderPhaseProfilerV73({capacity:4});
  for(let i=1;i<=5;i++)profiler.record({background:i,structures:i*2,actors:i*3,effects:i*4,minimap:i*5});
  const s=profiler.snapshot();assert.equal(s.samples,5);
  assert.equal(s.backgroundP95Ms,5);assert.equal(s.actorsP95Ms,15);
  profiler.clear();assert.equal(profiler.snapshot().backgroundP95Ms,null);
});
test('V73 evita chamar updateUI() completo nos callbacks periódicos',()=>{
  const source=readFileSync(join(root,'public/game.js'),'utf8');
  const a=source.indexOf('function updateFrameHudV2024(');
  const b=source.indexOf('// V20.2.8',a);
  const section=source.slice(a,b);
  assert.match(section,/updatePeriodicHudV73\(\)/);
  assert.doesNotMatch(section,/^[ \t]*updateUI\(\)/m);
  assert.match(source,/function updateUI\(\)/);
  assert.match(source,/updatePlayer\(dt\);updateSharedUniverseInterpolation\(dt\);updateEnemies\(dt\);updatePet\(dt\)/);
});
