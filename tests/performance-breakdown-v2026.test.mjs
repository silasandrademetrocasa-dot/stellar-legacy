import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceMonitor,formatPerformanceReport} from '../public/modules/performance-monitor.js';

test('p95 simulação e desenho aparecem separados quando diagnóstico ligado',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 m.record(0,8,30,{updateMs:3,drawMs:5});
 for(let i=1;i<=30;i++)m.record(i*33.33,8,30,{updateMs:3,drawMs:5});
 const s=m.snapshot();
 assert.equal(s.updateP95Ms,3);
 assert.equal(s.drawP95Ms,5);
 assert.equal(s.workP95Ms,8);
 assert.match(formatPerformanceReport(s),/Tempo atualização JS p95: 3 ms/);
 assert.match(formatPerformanceReport(s),/Tempo desenho Canvas p95: 5 ms/);
});
test('formato anterior de record continua válido',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 m.record(0,5,30);m.record(33,5,30);
 const s=m.snapshot();
 assert.equal(s.samples,1);
 assert.equal(s.workP95Ms,5);
 assert.equal(s.updateP95Ms,null);
 assert.equal(s.drawP95Ms,null);
});
test('valores inválidos de etapas são ignorados sem corromper amostras',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 m.record(0,8,30);m.record(33,8,30,{updateMs:-1,drawMs:NaN});
 const s=m.snapshot();assert.equal(s.samples,1);
 assert.equal(s.updateP95Ms,null);assert.equal(s.drawP95Ms,null);
});
