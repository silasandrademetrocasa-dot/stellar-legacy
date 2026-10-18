import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('public/index.html',root),'utf8');
const css=readFileSync(new URL('public/style.css',root),'utf8');
const js=readFileSync(new URL('public/game.js',root),'utf8');
const patch=css.split('HUD • RECOLHER TODAS AS JANELAS 40x40')[1];

test('todos os 9 painéis do menu de visibilidade estão contemplados',()=>{
 const ids=['playerPanel','leftStats','petFloatPanel','activeMissionPanel','activityPanel','chatDock','minimapPanel','weaponBar','gateHud'];
 for(const id of ids) assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
 for(const key of ['player','ship','pet','missions','activity','chat','minimap','weapons','gate'])assert.ok(html.includes(`data-hud-key="${key}"`));
});
test('Atividade oferece botão de recolher independente do de limpar',()=>{
 assert.ok(html.includes('id="activityToggle"'));
 assert.match(js,/function toggleExtraHudCollapse\(key\)/);
 assert.match(js,/ui\.activityToggle\.onclick/);
 assert.match(patch,/#topHudDock #activityPanel\.collapsed/);
 assert.match(patch,/#topHudDock #activityPanel\.collapsed #activityClearBtn/);
});
test('Portal Astral recolhe sem alterar dados da onda',()=>{
 assert.ok(html.includes('id="gateHudToggle"'));
 assert.match(js,/ui\.gateHudToggle\.onclick/);
 assert.match(patch,/#gateHud\.collapsed/);
 assert.match(patch,/#gateHud\.collapsed \.gate-hud-row/);
 assert.match(js,/function renderGateHud\(/);
});
test('Chat e minimapa realmente escondem o conteúdo quando recolhidos',()=>{
 for(const id of ['chatDock','minimapPanel']) assert.match(patch,new RegExp(`#${id}\\.collapsed`));
 assert.match(patch,/#chatDock\.collapsed #chatBody/);
 assert.match(patch,/#minimapPanel\.collapsed #minimap/);
 assert.match(patch,/\.bottom-hud-dock #chatDock\.collapsed/);
});
test('Munições compactas não mantém ações e habilidades bloqueando tela',()=>{
 assert.match(patch,/#weaponBar\.collapsed \.section\.actions/);
 assert.match(patch,/#weaponBar\.collapsed \.bottom-combat-abilities/);
 assert.match(patch,/#weaponBar\.collapsed #weaponBarToggle/);
 assert.match(patch,/grid-column:1!important;grid-row:2!important/);
});
test('botões compactos individuais e preferência local persistem',()=>{
 assert.match(js,/const EXTRA_HUD_COLLAPSE_KEY='stellar_extra_hud_collapse_v2294'/);
 assert.match(js,/localStorage\.setItem\(EXTRA_HUD_COLLAPSE_KEY/);
 assert.match(js,/loadExtraHudCollapse\(\);/);
 for(const id of ['activityToggle','gateHudToggle','chatToggle','minimapToggle','weaponBarToggle'])assert.ok(html.includes(`id="${id}"`));
});
test('ocultar um painel por CONF sempre supera modo collapsed',()=>{
 for(const id of ['activityPanel','gateHud','chatDock','weaponBar','minimapPanel'])assert.ok(css.includes(`#${id}.hud-user-`));
 assert.match(css,/#bottomHudDock\.bottom-hud-dock #weaponBar\.hud-user-hidden/);
});
test('o jogo não injeta sufixo de versão nos nomes dos painéis',()=>{
 assert.ok(!html.includes('MUNIÇÕES V22'));
 assert.ok(!html.includes('PORTAL ASTRAL V22'));
});
