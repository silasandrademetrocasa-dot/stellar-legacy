import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceMonitor,formatPerformanceReport} from '../public/modules/performance-monitor.js';

test('medição p95 separa gameplay, serviços, HUD e espera entre quadros',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 m.record(0,12,30,{updateMs:9,drawMs:3,phases:{prepMs:1,gameplayMs:4,servicesMs:3,hudMs:1}});
 m.record(100,12,30,{updateMs:9,drawMs:3,phases:{prepMs:1,gameplayMs:4,servicesMs:3,hudMs:1}});
 const s=m.snapshot();
 assert.equal(s.samples,1);assert.equal(s.waitP95Ms,88);
 assert.equal(s.prepP95Ms,1);assert.equal(s.gameplayP95Ms,4);
 assert.equal(s.servicesP95Ms,3);assert.equal(s.hudP95Ms,1);
 const report=formatPerformanceReport(s);
 assert.match(report,/Espera entre quadros p95 \(estimativa\): 88 ms/);
 assert.match(report,/Jogabilidade JS p95: 4 ms/);
 assert.match(report,/Serviços e eventos JS p95: 3 ms/);
 assert.match(report,/Interface HUD JS p95: 1 ms/);
});
test('compatibilidade com relatórios antigos e pausa sem gap gigante',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 m.record(0,5,30);m.record(33,6,30);
 assert.equal(m.snapshot().gameplayP95Ms,null);
 m.pause();m.record(20000,8,30);m.record(20033,8,30);
 assert.equal(m.snapshot().samples,2);
 assert.equal(m.snapshot().waitP95Ms,28);
});
test('intervalo inválido não dá valor negativo de espera',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 m.record(0,60,30);m.record(30,60,30);
 assert.equal(m.snapshot().waitP95Ms,0);
});
