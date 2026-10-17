import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFrameGate} from '../public/modules/frame-gate.js';
import {createPerformanceMonitor,formatPerformanceReport} from '../public/modules/performance-monitor.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');

test('rAF de 16 ms em 30 FPS não cai sistematicamente para a cada 3 callbacks',()=>{
  const gate=createFrameGate();gate.reset(0);
  let accepted=0;
  for(let t=16;t<=3200;t+=16)accepted+=Number(gate.accept(t,30));
  // 100 renderizações em 3,2 s seriam ~31,25 FPS vs 67 / 3,2 s do corte rígido.
  assert.ok(accepted>=90,`Somente ${accepted} quadros aceitos`);
  assert.ok(accepted<=103);
});
test('rAF de 8ms respeita o teto de 30 FPS com tolerância pequena',()=>{
  const gate=createFrameGate();gate.reset(0);
  let accepted=0;
  for(let t=8;t<=3200;t+=8)accepted+=Number(gate.accept(t,30));
  assert.ok(accepted<=105,`Limite exagerado: ${accepted}`);
});
test('rAF real de 70ms não é cortado pelo limitador do jogo',()=>{
  const gate=createFrameGate();gate.reset(0);
  for(let t=70;t<=2100;t+=70)assert.equal(gate.accept(t,30),true);
  assert.equal(gate.accept(Number.NaN,30),false);
  gate.reset(3000);assert.equal(gate.accept(3010,30),false);
  assert.equal(gate.accept(3033,30),true);
});
test('o diagnóstico separa callbacks rAF e quadros processados',()=>{
  const monitor=createPerformanceMonitor({capacity:20});monitor.setEnabled(true);
  monitor.recordTick(0,false);
  monitor.recordTick(16,false);monitor.recordTick(32,true);monitor.recordTick(48,false);monitor.recordTick(64,true);
  monitor.record(32,2,30,{context:'game'});monitor.record(64,2,30,{context:'game'});
  const s=monitor.snapshot();
  assert.equal(s.rafTotal,4);assert.equal(s.rafSkipped,2);assert.equal(s.rafAccepted,2);
  assert.equal(s.rafFps,62.5);assert.equal(s.rafP95Ms,16);
  assert.equal(s.samples,1);
  const report=formatPerformanceReport(s,{version:'20.2.10'});
  assert.match(report,/rAF bruto do navegador \(amostras\): 62\.5 FPS/);
  assert.match(report,/Quadros pulados pelo limitador: 2 de 4/);
  assert.doesNotMatch(report,/(token|senha|email|user\.agent|callsign)/i);
});
test('pausa e reset não misturam contagem rAF de abas ocultas',()=>{
  const monitor=createPerformanceMonitor();monitor.setEnabled(true);
  monitor.recordTick(0,true);monitor.recordTick(16,true);
  monitor.pause();monitor.recordTick(500_000,true);monitor.recordTick(500_016,true);
  assert.equal(monitor.snapshot().rafTotal,2);
  monitor.clear();assert.equal(monitor.snapshot().rafTotal,0);
  monitor.setEnabled(false);monitor.recordTick(500_032,true);
  assert.equal(monitor.snapshot().rafTotal,0);
});
test('loop mantém simulação, dt de segurança, PvP e próximo frame sem mudança',()=>{
  assert.match(game,/FRAME_GATE_V20210\.accept\(t,qualityProfile\(\)\.fps\)/);
  assert.match(game,/PERF_MONITOR\.recordTick\(t,allowed\)/);
  assert.match(game,/const dt=Math\.min\(\(t-last\)\/1000,\.05\);last=t;/);
  assert.match(game,/update\(dt,phases\);[\s\S]*?if\(!inSettings\)draw\(\)/);
  assert.match(game,/monitorAutoPerformance\(t\);requestAnimationFrame\(loop\)/);
});
