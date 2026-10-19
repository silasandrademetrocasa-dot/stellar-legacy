import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isMobileLandscape} from '../public/modules/mobile-landscape.js';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');

test('landscape-first somente em mobile horizontal; retrato e desktop permanecem intactos',()=>{
  assert.equal(isMobileLandscape(844,390,true),true);
  assert.equal(isMobileLandscape(390,844,true),false);
  assert.equal(isMobileLandscape(1440,900,false),false);
  assert.equal(isMobileLandscape(0,0,true),false);
});
test('não altera inicialização de contas e mantém aviso opcional',()=>{
  assert.match(game,/setupMobileLandscape\(\{mobile:DEVICE_CAPS.mobile,onLayoutChange:requestHudLayoutV2024\}\)/);
  assert.match(html,/id="mobileLandscapeHint"/);
  assert.match(html,/id="mobileLandscapeDismiss"/);
  assert.match(html,/id="mobileLandscapeLaunch"/);
  assert.match(css,/body\.mobile-landscape-pro #bottomHudDock\.bottom-hud-dock/);
  assert.match(css,/grid-template-columns:minmax\(92px,clamp\(105px,18vw,152px\)\) minmax\(0,1fr\) minmax\(95px,clamp\(104px,17vw,146px\)\)/);
});
test('alternativa manual quando bloqueio de orientação não disponível',()=>{
  const mod=readFileSync(new URL('../public/modules/mobile-landscape.js',import.meta.url),'utf8');
  assert.match(mod,/root\?\.requestFullscreen/);
  assert.match(mod,/win\.screen\?\.orientation\?\.lock/);
  assert.match(mod,/catch\{/);
  assert.match(css,/body\.mobile-landscape-pro #hangarModal \.hangar-equipment-split/);
});
