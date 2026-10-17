import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceMonitor,formatPerformanceReport} from '../public/modules/performance-monitor.js';
import {readFileSync} from 'node:fs';

test('diagnóstico HUD completo, crítico e munições sem dados pessoais',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 m.record(0,20,30,{updateMs:15,drawMs:5,phases:{hudMs:12,hudFullMs:12,hudAmmoMs:.3}});
 m.record(100,20,30,{updateMs:15,drawMs:5,phases:{hudMs:12,hudFullMs:12,hudAmmoMs:.3}});
 m.record(200,10,30,{updateMs:6,drawMs:4,phases:{hudMs:1,hudCriticalMs:1}});
 const v=m.snapshot();
 assert.equal(v.hudFullP95Ms,12);
 assert.equal(v.hudCriticalP95Ms,1);
 assert.equal(v.hudAmmoP95Ms,.3);
 assert.equal(v.hudFullSamples,1);
 const txt=formatPerformanceReport(v,{version:'20.2.8'});
 assert.match(txt,/HUD completo p95: 12 ms \(1 amostras\)/);
 assert.match(txt,/HUD crítico p95: 1 ms/);
 assert.match(txt,/HUD munições p95: 0.3 ms/);
 assert.doesNotMatch(txt,/token|email|identidade|user agent/i);
});
test('HUD diagnóstico opcional integra DOM e mantém contador desligado por padrão',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 for(const id of ['perfDiagHudFull','perfDiagHudCritical','perfDiagHudAmmo']){
  assert.match(html,new RegExp('id="'+id+'"'));
  assert.ok(game.includes("value('"+id+"'"),id);
 }
 assert.match(game,/const PERF_MONITOR=createPerformanceMonitor\(\)/);
 assert.match(game,/if\(PERF_MONITOR\.isEnabled\(\)\)/);
});
