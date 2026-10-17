import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerformanceMonitor,formatPerformanceReport} from '../public/modules/performance-monitor.js';

test('desativado por padrão, não coleta quadros',()=>{
  const m=createPerformanceMonitor();
  assert.equal(m.record(0,2,60),false);
  assert.deepEqual(m.snapshot().samples,0);
  assert.equal(m.snapshot().enabled,false);
});
test('FPS em 30 FPS esperado não registra engasgo artificial',()=>{
  const m=createPerformanceMonitor();m.setEnabled(true);
  for(let i=0;i<=60;i++)m.record(i*(1000/30),4,30);
  const s=m.snapshot();
  assert.equal(s.samples,60);assert.ok(Math.abs(s.fps-30)<.1);
  assert.equal(s.longFrames,0);
  assert.ok(s.workP95Ms>=4);
});
test('detecta quadro longo e p95 sem inflar a memória',()=>{
  const m=createPerformanceMonitor({capacity:20});m.setEnabled(true);
  m.record(0,0,60);
  for(let i=1;i<=18;i++)m.record(i*17,7,60);
  m.record(480,70,60); // atraso de 174 ms
  assert.equal(m.snapshot().longFrames,1);
  assert.equal(m.snapshot().samples,19);
  assert.ok(m.snapshot().frameP95Ms>=17);
  for(let i=1;i<=30;i++)m.record(480+i*17,1,60);
  assert.equal(m.snapshot().samples,20);
  assert.equal(m.snapshot().longFrames,0); // janela deslizante
  assert.equal(m.snapshot().totalLongFrames,1); // total retido desde ativação
});
test('não contabiliza bloqueio de tela ou volta de outra aba',()=>{
  const m=createPerformanceMonitor();m.setEnabled(true);
  m.record(0,1);m.record(16,1);m.pause();m.record(300_000,1);m.record(300_017,1);
  assert.equal(m.snapshot().samples,2);
  assert.equal(m.snapshot().longFrames,0);
  m.record(302_100,1); // lacuna acima do limite, descartada
  assert.equal(m.snapshot().samples,2);
});
test('ignora valores inválidos e limita amostras a 240',()=>{
  const m=createPerformanceMonitor({capacity:999});m.setEnabled(true);
  m.record(0,0);
  assert.equal(m.record(NaN,1),false);
  assert.equal(m.record(12,-2),false);
  for(let i=1;i<900;i++)m.record(i*16,1);
  assert.equal(m.snapshot().samples,240);
  m.setEnabled(false);
  assert.equal(m.snapshot().samples,0);
  assert.equal(m.record(901*16,1),false);
});
test('relatório técnico não contém dados de conta, identidade ou tokens',()=>{
  const m=createPerformanceMonitor();m.setEnabled(true);
  m.record(0,0);m.record(17,5,60);
  const report=formatPerformanceReport(m.snapshot(),{version:'20.2.2',quality:'AUTO',resolution:'640x360',cache:{count:42,failed:1}});
  assert.match(report,/FPS observados/);
  assert.match(report,/Imagens no cache do jogo: 42/);
  assert.doesNotMatch(report,/(token|senha|callsign|email|user.agent|localStorage)/i);
});
test('ativar ou desativar limpa relógio para evitar falsos travamentos',()=>{
  const m=createPerformanceMonitor();m.setEnabled(true);m.record(0,1);m.record(16,1);
  m.setEnabled(false);m.setEnabled(true);m.record(10_000,1);
  assert.equal(m.snapshot().samples,0);
});
