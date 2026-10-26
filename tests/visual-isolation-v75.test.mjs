import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVisualIsolationV75,VISUAL_TEST_MODES_V75} from '../public/modules/visual-isolation-v75.js';

const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const frame=(m,now,more={})=>m.frame(now,{mapId:'x1',quality:'medium',width:440,height:650,intervalMs:30,workMs:12,updateMs:5,drawMs:7,...more});

test('V75: diagnóstico é opt-in, inicia apenas após sair de Configurações',()=>{
  const m=createVisualIsolationV75({durationMs:100,warmupMs:5});
  assert.equal(m.mode(),'normal');
  assert.equal(m.start('relay'),true);
  assert.equal(m.mode(),'normal');
  frame(m,100,{inSettings:true});
  assert.equal(m.snapshot().pending,true);
  assert.equal(frame(m,110),'started');
  assert.equal(m.mode(),'relay');
  assert.equal(frame(m,120),null);
  frame(m,140);frame(m,160);frame(m,180);
  assert.equal(m.snapshot().active,true);
  assert.equal(frame(m,215),'completed');
  assert.equal(m.mode(),'normal');
  const s=m.snapshot();
  assert.equal(s.results.length,1);
  assert.equal(s.results[0].mode,'relay');
  assert.ok(s.results[0].fps>20);
  assert.match(m.report(),/TESTE A\/B LOCAL/);
});

test('V75: visual restaura ao mudar mapa, resolução, qualidade ou ao ocultar a aba',()=>{
  for(const change of [{mapId:'x2'},{quality:'low'},{width:500},{visible:false}]){
    const m=createVisualIsolationV75();m.start('scenery');frame(m,10);
    assert.equal(frame(m,30,change),'cancelled');
    assert.equal(m.mode(),'normal');
    assert.equal(m.snapshot().results.length,0);
  }
});

test('V75: modo inválido não é aceito, retorno manual imediato, sem persistência',()=>{
  const m=createVisualIsolationV75();
  assert.equal(m.start('disable-gameplay'),false);
  assert.equal(m.mode(),'normal');
  assert.equal(Object.keys(VISUAL_TEST_MODES_V75).length,7);
  m.start('hud');frame(m,0);
  assert.equal(m.mode(),'hud');
  assert.equal(m.stop(),true);
  assert.equal(m.mode(),'normal');
  assert.equal(m.report().includes('Sem testes concluídos'),true);
});

test('V75: comparação exige mapa, qualidade e resolução coincidentes',()=>{
  const m=createVisualIsolationV75({durationMs:50,warmupMs:0});
  m.start('normal');frame(m,1);frame(m,22);frame(m,43);frame(m,52);
  m.start('relay');frame(m,53,{mapId:'x2'});frame(m,74,{mapId:'x2'});frame(m,96,{mapId:'x2'});frame(m,110,{mapId:'x2'});
  assert.equal(m.snapshot().results.length,2);
  assert.ok(!m.report().includes('Comparação Sem desenho dos relés com controle'));
});

test('V75: apenas renderização, diagnóstico e CSS secundário mudam; regras preservadas',()=>{
  assert.match(game,/updatePlayer\(dt\);updateSharedUniverseInterpolation\(dt\);updateEnemies\(dt\);updatePet\(dt\)/);
  assert.match(game,/VISUAL_ISOLATION_V75\.mode\(\)/);
  assert.match(game,/visualTestV75!=='relay'\)drawWarfrontControlWorld\(\)/);
  assert.match(game,/visualTestV75!=='minimap'&&minimapIsVisibleForCanvasV2025\(\)/);
  assert.match(game,/VISUAL_ISOLATION_V75\.report\(\)/);
  for(const id of ['visualDiagSectionV75','visualDiagSelectV75','visualDiagStartV75','visualDiagStopV75','visualDiagFloatingV75'])assert.ok(html.includes(`id="${id}"`));
  assert.match(css,/body\[data-visual-test-v75="hud"\]/);
  assert.match(css,/#weaponBar/); // defined in the original CSS; not hidden by diagnostic
  assert.doesNotMatch(css,/data-visual-test-v75="hud"[^\n]*#weaponBar/);
});
