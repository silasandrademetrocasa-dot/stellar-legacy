import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');

test('diagnóstico aparece na central de configuração com ativação inicialmente desligada',()=>{
  assert.match(html,/id="settingsGamePanel"[\s\S]*?id="perfDiagnosticsSection"/);
  assert.match(html,/id="perfDiagEnabled"\s*\/>/); // sem atributo checked
  assert.match(html,/id="perfDiagShowHud" disabled/);
  assert.match(html,/id="perfDiagOverlay"/);
  assert.match(html,/id="perfDiagCopy" disabled/);
});
test('captura do FPS é opt-in e não altera a ordem update/draw/qualidade automática',()=>{
  assert.match(game,/if\(PERF_MONITOR\.isEnabled\(\)\)\{\s*const start=performance\.now\(\),phases=\{\};update\(dt,phases\);\s*const renderStart=performance\.now\(\);draw\(\);const end=performance\.now\(\);\s*PERF_MONITOR\.record/);
  assert.match(game,/\}else\{update\(dt\);draw\(\);\}\s*monitorAutoPerformance\(t\)/);
  assert.match(game,/PERF_MONITOR\.pause\(\);requestAnimationFrame\(loop\)/);
});
test('copiar relatório exige clique e não transmite dados automaticamente',()=>{
  assert.match(game,/getElementById\('perfDiagCopy'\)\?\.addEventListener\('click',async/);
  assert.match(game,/navigator\.clipboard\.writeText\(report\)/);
  assert.doesNotMatch(game.slice(game.indexOf('// Diagnóstico opt-in:'),game.indexOf("if(ui.hudSettingsGrid)")),/pushTelemetryBatch|fetch\(|saveCloudSave|saveGame\(/);
});
test('módulo tem import com versão atual e HUD não intercepta toques no mobile',()=>{
  assert.ok(game.includes(`from './modules/performance-monitor.js?v=${version}';`));
  assert.match(css,/\.perf-diag-overlay\{[^}]+pointer-events:none/);
  assert.match(css,/@media\(max-width:680px\)\{\.perf-diag-grid/);
});
