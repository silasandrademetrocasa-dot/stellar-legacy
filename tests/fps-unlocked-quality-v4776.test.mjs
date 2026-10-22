import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameGate} from '../public/modules/frame-gate.js';
import {QUALITY_PROFILES} from '../public/modules/quality-profiles.js';

// Perfis preservam suas qualidades e referencias originais da selecao AUTO.
test('Baixa, Media e Alta aceitam todos os frames novos do navegador',()=>{
  for(const quality of ['low','medium','high']){
    const gate=createFrameGate();
    const nominalFps=QUALITY_PROFILES[quality].fps;
    assert.equal(gate.accept(0,nominalFps),true,quality);
    for(let i=1;i<=120;i++){
      assert.equal(gate.accept(i*1000/120,nominalFps),true,`${quality}: frame ${i}`);
    }
  }
});

test('Medições rAF 60/90/120 Hz não são artificialmente cortadas em Media ou Alta',()=>{
  for(const hz of [60,90,120]){
    for(const mode of ['medium','high']){
      const gate=createFrameGate();
      let accepted=0;
      for(let i=0;i<=hz;i++)if(gate.accept(i*1000/hz,QUALITY_PROFILES[mode].fps))accepted++;
      assert.equal(accepted,hz+1,`${mode} @ ${hz} Hz`);
    }
  }
});

test('FPS nominal continua separado da cadencia livre para preservar o AUTO e o visual',()=>{
  assert.equal(QUALITY_PROFILES.low.fps,120);
  assert.equal(QUALITY_PROFILES.medium.fps,45);
  assert.equal(QUALITY_PROFILES.high.fps,60);
  assert.equal(QUALITY_PROFILES.low.dpr,1);
  assert.equal(QUALITY_PROFILES.medium.dpr,1.30);
  assert.equal(QUALITY_PROFILES.high.dpr,2);
});

test('Timestamps invalidos, duplicados ou pausas sao seguros',()=>{
  const gate=createFrameGate();
  assert.equal(gate.accept(NaN,45),false);
  assert.equal(gate.accept(0,45),true);
  assert.equal(gate.accept(0,45),false);
  assert.equal(gate.accept(8,45),true);
  assert.equal(gate.accept(2000,45),true);
  assert.equal(gate.accept(10,45),true);
  gate.reset();
  assert.equal(gate.accept(0,60),true);
});

test('Limitacao explicita opcional preserva a logica de jitter existente',()=>{
  const gate=createFrameGate({enforceCap:true,toleranceMs:0});
  assert.equal(gate.accept(0,45),true);
  assert.equal(gate.accept(8,45),false);
  assert.equal(gate.accept(24,45),true);
  assert.equal(gate.accept(32,45),false);
});
