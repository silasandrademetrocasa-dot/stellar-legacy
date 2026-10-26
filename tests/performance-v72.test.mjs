import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createDeferredHudScheduler} from '../public/modules/deferred-hud-v72.js';
import {createBrowserLatencyDiagnostics} from '../public/modules/browser-latency-v72.js';
const root=resolve(import.meta.dirname,'..');

test('V72: HUD completo usa fila visual única, cancelável e mede custo',()=>{
  const idle=new Map();let counter=0,clock=0;
  const scheduler=createDeferredHudScheduler({
    requestIdle:cb=>{const id=++counter;idle.set(id,cb);return {kind:'timer',id};},
    cancelIdle:h=>idle.delete(h.id),now:()=>clock
  });
  let count=0;
  assert.equal(scheduler.schedule(()=>{count++;clock=12;}),true);
  assert.equal(scheduler.schedule(()=>count++),false);
  idle.get(1)();
  assert.equal(count,1);
  assert.equal(scheduler.snapshot().latestMs,12);
  assert.equal(scheduler.snapshot().count,1);
  assert.equal(scheduler.schedule(()=>count++),true);
  scheduler.cancel();
  assert.equal(idle.has(2),false);
  assert.equal(count,1);
});

test('V72: dados de latência são locais, opcionais e identificam tarefas longas',()=>{
  let pulse=null,observer=null,now=0;
  const monitor=createBrowserLatencyDiagnostics({now:()=>now,
    setIntervalFn:fn=>{pulse=fn;return 1;},clearIntervalFn:()=>{pulse=null;},
    observerFactory:cb=>{observer={observe(){},disconnect(){},notify(ms){cb({getEntries:()=>[{duration:ms}]});}};return observer;},
    isVisible:()=>true});
  assert.equal(monitor.snapshot().enabled,false);
  monitor.start();
  now=585;pulse();
  observer.notify(83);
  const s=monitor.snapshot();
  assert.equal(s.longTaskCount,1);
  assert.equal(s.longTaskP95Ms,83);
  assert.equal(s.driftP95Ms,85);
  monitor.stop();
  assert.equal(pulse,null);
  monitor.noteLongTask(100);
  assert.equal(monitor.snapshot().longTaskCount,1);
});

test('V72: mudanças limitadas a renderização/diagnóstico, sem mover loop da simulação',()=>{
  const game=readFileSync(join(root,'public/game.js'),'utf8');
  assert.match(game,/createDeferredHudScheduler/);
  assert.match(game,/HUD_DEFERRED_V72\.schedule/);
  assert.match(game,/if\(!periodicHudCall\)HUD_DEFERRED_V72\.cancel\(\)/);
  assert.match(game,/updatePlayer\(dt\);updateSharedUniverseInterpolation\(dt\);updateEnemies\(dt\);updatePet\(dt\)/);
  assert.match(game,/const dt=Math\.min\(Math\.max\(0,frameInterval\/1000\),\.05\)/);
  assert.match(game,/BROWSER_LATENCY_V72\.start\(\)/);
  assert.match(game,new RegExp(JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version.replaceAll('.','\\.')));
});
