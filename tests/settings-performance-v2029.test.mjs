import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPerformanceMonitor,formatPerformanceReport} from '../public/modules/performance-monitor.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');

test('diagnóstico separa amostras de jogo e configurações sem misturar transição',()=>{
 const m=createPerformanceMonitor({capacity:30});m.setEnabled(true);
 m.record(0,10,30,{context:'game'});
 m.record(40,10,30,{context:'game'});
 m.record(80,10,30,{context:'game'});
 m.record(900,1,30,{context:'settings'}); // primeira amostra pós-troca é ignorada
 m.record(950,1,30,{context:'settings'});
 m.record(990,1,30,{context:'settings'});
 assert.equal(m.snapshot('game').samples,2);
 assert.equal(m.snapshot('settings').samples,2);
 assert.equal(m.snapshot().samples,4);
 assert.equal(m.snapshot('game').fps,25);
 assert.equal(m.snapshot('settings').fps,22.2);
 assert.equal(m.snapshot('settings').longFrames,0);
});
test('relatório mostra FPS jogando e FPS em configurações sem informações pessoais',()=>{
 const m=createPerformanceMonitor();m.setEnabled(true);
 m.record(0,3,30,{context:'game'});m.record(40,3,30,{context:'game'});
 m.record(80,0,30,{context:'settings'});m.record(130,0,30,{context:'settings'});
 const report=formatPerformanceReport(m.snapshot(),{version:'20.2.9',scenes:{game:m.snapshot('game'),settings:m.snapshot('settings')}});
 assert.match(report,/FPS jogando: 25/);
 assert.match(report,/FPS em configurações: 20/);
 assert.doesNotMatch(report,/(token|senha|email|callsign|user.agent)/i);
});
test('CONF mantém update e suspende draw; jogo recomeça draw no fechamento',()=>{
 assert.match(game,/const inSettings=isSettingsOpenV2029\(\)/);
 assert.match(game,/update\(dt,phases\);[\s\S]{0,180}if\(!inSettings\)draw\(\)/);
 assert.match(game,/else\{update\(dt\);if\(!inSettings\)draw\(\);\}/);
});
test('rankings pesados são renderizados apenas com aba ranking ativa',()=>{
 assert.match(game,/function renderRankings\(\)\{[\s\S]{0,200}if\(!isSettingsOpenV2029\(\)\)/);
 assert.match(game,/if\(settingsTab!=='ranking'\)/);
 assert.match(game,/function openSettings\(\)\{[\s\S]{0,220}settingsTab==='ranking'/);
});
