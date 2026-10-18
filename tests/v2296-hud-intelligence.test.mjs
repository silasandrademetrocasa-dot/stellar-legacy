import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profileForMap,safePosition} from '../public/modules/hud-intelligence.js';
const base=new URL('../public/',import.meta.url);
const h=readFileSync(new URL('index.html',base),'utf8');
const g=readFileSync(new URL('game.js',base),'utf8');
const c=readFileSync(new URL('style.css',base),'utf8');
const m=readFileSync(new URL('modules/hud-intelligence.js',base),'utf8');
test('fase 1: posicionamento local, arrastar touch e reset por perfil',()=>{
  for(const id of ['hudStartEdit','hudFinishEdit','hudResetPositions','hudCustomPositions'])assert.ok(h.includes(`id="${id}"`));
  for(const phrase of ['pointerdown','pointermove','setPointerCapture','state.placements[state.profile]','stellar-user-placed'])assert.ok(m.includes(phrase));
  assert.deepEqual(safePosition({x:20,y:-10},40,40,390,800),{left:346,top:47});
  assert.equal(safePosition(null,40,40,390,800),null);
});
test('fase 2: perfis salvos por tipo de jogo e troca opcional no PvP',()=>{
  for(const name of ['pve','pvp','mine','explore'])assert.ok(h.includes(`value="${name}"`));
  assert.equal(profileForMap('b41'),'pvp');assert.equal(profileForMap('b43'),'pvp');assert.equal(profileForMap('x4'),'pve');
  assert.ok(m.includes('savedVisibility'));assert.ok(m.includes('savedCollapse'));
  assert.ok(h.includes('id="hudAutoProfile"'));
});
test('fase 3: ocultação somente visual, não interfere na jogabilidade',()=>{
  assert.ok(h.includes('id="hudQuietMode"'));
  assert.match(c,/stellar-hud-quiet/);
  assert.match(g,/inCombat:\(\)=>!!progress/);
  assert.match(m,/Date\.now\(\)-lastCombat>4500/);
});
test('fase 4: recolher tudo com snapshot e restauração individual',()=>{
  assert.ok(h.includes('id="hudIntelligenceQuick"'));
  assert.match(m,/state\.snapshot=snapshotPanels\(\)/);
  assert.match(m,/for\(const \[id,value\] of Object\.entries\(snapshot\)\)togglePanel\(id,value\)/);
  assert.ok(m.includes("state.globalCollapsed=false"));
});
test('fase 5: seções expansíveis de modais preservam DOM dinâmico',()=>{
  for(const id of ['missionContent','hangarContent','clanContent','passContent','petContent','adminModal'])assert.ok(m.includes(id));
  assert.ok(m.includes("new MutationObserver"));
  assert.match(c,/\.stellar-fold-ready\.stellar-fold-closed > :not\(\.stellar-fold-toggle\)/);
  assert.ok(!m.includes('innerHTML='));
});
test('antifraude e kamikaze do aux permanecem inalterados',()=>{
  assert.ok(h.includes('id="laserAmmoButtons"'));assert.ok(h.includes('id="rocketAmmoButtons"'));
  assert.match(c,/#weaponBar \.aux-only-action\{/);
  assert.ok(!m.includes('credits'));
  assert.ok(!m.includes('saveGame()'));
});
