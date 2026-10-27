import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createAdaptiveResolution,effectiveCanvasDpr} from '../public/modules/adaptive-resolution-v70.js';
import {createPreviewScheduler} from '../public/modules/preview-scheduler-v70.js';
import {versionedAssetUrl} from '../public/modules/asset-cache.js';
import {mapLayoutPath} from '../public/modules/modular-map-v2.js';
import {createPerformanceMonitor} from '../public/modules/performance-monitor.js';
const root=new URL('../',import.meta.url);
const path=p=>join(root.pathname,p);

test('Ajuste de DPR não altera coordenadas e tem limites por qualidade',()=>{
 const scaler=createAdaptiveResolution({mobile:true,cooldownMs:1,windowMs:200});
 scaler.setMode('high');assert.equal(scaler.scale(),.85);
 let t=0;
 for(let x=0;x<30;x++){t+=250;scaler.observe(t,45,50);}
 assert.ok(scaler.scale()>=.70&&scaler.scale()<.85,scaler.scale());
 assert.ok(effectiveCanvasDpr(3,2,scaler.scale())<=2);
 scaler.setMode('medium');assert.equal(scaler.scale(),.9);
 scaler.setMode('low');assert.equal(scaler.scale(),1);
});
test('Pré-visualizações compartilham um único agendamento e removem canvas desconectados',()=>{
 const tasks=[];const scheduler=createPreviewScheduler({fps:10,requestFrame:fn=>tasks.push(fn),visible:()=>true});
 const a={isConnected:true},b={isConnected:true};let ac=0,bc=0;
 scheduler.register(a,()=>ac++);scheduler.register(b,()=>bc++);
 assert.equal(tasks.length,1);
 tasks.shift()(120);assert.equal(ac,1);assert.equal(bc,1);
 a.isConnected=false;tasks.shift()(240);assert.equal(scheduler.count(),1);
 b.isConnected=false;tasks.shift()(360);assert.equal(scheduler.count(),0);
});
test('Diretórios imutáveis das animações não baixam novamente por revisão global',()=>{
 const p='/assets/animations/v69/Portais/Portal_Comum/base.webp';assert.equal(versionedAssetUrl(p),p);
 assert.match(versionedAssetUrl('/assets/v67/npcs/streuner.webp'),/asset=/);
});
test('V80: 30 mapas possuem imagens individuais em Baixo e Alto',()=>{
 const keys=[...['1','2','3'].flatMap(f=>Array.from({length:8},(_,i)=>`${f}-${i+1}`)), '4-1','4-2','4-3','U-1','U-2','U-3'];
 const bg=new Set();for(const key of keys){
  const layout=JSON.parse(readFileSync(path('public'+mapLayoutPath(key)),'utf8'));
  assert.equal(layout.mapId,key);
  assert.match(layout.background.low,/\/V80_Fundos_Distintos\/.*\.webp$/);
  assert.ok(existsSync(path('public'+layout.background.low)));
  assert.match(layout.background.high,/\/V80_Fundos_Distintos\/.*\.webp$/);
  assert.ok(existsSync(path('public'+layout.background.high)));
  bg.add(layout.background.low);
 }
 assert.equal(bg.size,30);
});
test('Diagnóstico registra P95 e P99 sem dados pessoais',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 for(let i=0;i<50;i++)m.record(i*20,12,60,{drawMs:8,updateMs:4});
 const s=m.snapshot();assert.ok(s.frameP99Ms!==null&&s.drawP99Ms!==null);
});
