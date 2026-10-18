import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../public/style.css', import.meta.url),'utf8');
const js=readFileSync(new URL('../public/game.js', import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html', import.meta.url),'utf8');
const patch=css.split('HUD COMPACTO • JANELAS RECOLHIDAS')[1];
test('painéis superior recolhidos têm tamanho fixo de ícone',()=>{
 for(const id of ['playerPanel','leftStats','activeMissionPanel','petFloatPanel'])assert.match(patch,new RegExp(`#topHudDock #${id}\\.collapsed`));
 assert.match(patch,/width:40px!important;min-width:40px!important;max-width:40px!important/);
 assert.match(patch,/height:40px!important;min-height:40px!important;max-height:40px!important/);
});
test('corpos recolhidos realmente escondidos, sem elementos clicáveis sobrepostos',()=>{
 for(const cls of ['player-float-content','left-stats-content','active-mission-body','pet-float-body'])assert.ok(patch.includes(cls));
 assert.match(patch,/#topHudDock #activeMissionPanel\.collapsed #activeMissionOpen,/);
 assert.match(patch,/#topHudDock #petFloatPanel\.collapsed #petFloatLevel\{display:none!important/);
});
test('quatro botões reabrem seus cartões no mesmo fluxo persistente',()=>{
 for(const name of ['togglePlayerUi','toggleStatsUi','toggleMissionUi','togglePetUi'])assert.match(js,new RegExp(`function ${name}\\(`));
 for(const id of ['playerPanelToggle','statsToggle','activeMissionToggle','petFloatToggle'])assert.ok(html.includes(`id="${id}"`));
});
test('alvo e evento colapsados deixam só o botão de 40px',()=>{
 for(const cls of ['galaxy-event-hud','target-lock-hud'])assert.ok(patch.includes(`.${cls}.collapsed`));
 assert.match(patch,/\.galaxy-event-copy,\s*#rightHudStack > \.galaxy-event-hud\.collapsed \.galaxy-event-side\{display:none!important/);
 assert.match(patch,/\.target-lock-main\{display:none!important/);
});
test('dock superior ocupa o espaço livre quando direita está recolhida ou vazia',()=>{
 assert.match(js,/function syncHudRightCompactV2293\(/);
 assert.match(js,/new MutationObserver\(syncHudRightCompactV2293\)/);
 assert.match(patch,/html\.hud-right-mini #topHudDock\{right:56px!important/);
 assert.match(patch,/html\.hud-right-empty #topHudDock\{right:8px!important/);
});
test('indicadores ocultos permanecem realmente ocultos mesmo no modo compacto',()=>{
 assert.match(css,/#topHudDock #activeMissionPanel\.hidden,/);
 assert.match(css,/#rightHudStack > \.galaxy-event-hud\.hidden,/);
});
test('evento recolhido reabre ao toque, sem abrir modal antes',()=>{
 assert.match(js,/ui\.galaxyEventHud\.onclick=\(\)=>state\.galaxyEventUiExpanded\?openGalaxyEvent\(\):toggleGalaxyEventUi\(\)/);
 assert.match(js,/Expandir evento galáctico/);
});
