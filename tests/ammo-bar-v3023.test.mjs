import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));

test('V30.4.0: barra de armas remove controles visuais redundantes do topo',()=>{
  const html=readFileSync(resolve(root,'public/index.html'),'utf8');
  assert.ok(!html.includes('id="laserToggle"'));
  assert.ok(!html.includes('id="rocketFire"'));
  assert.ok(!html.includes('id="rocketCd"'));
});

test('V30.4.0: game.js tolera ausência dos controles visuais removidos',()=>{
  const js=readFileSync(resolve(root,'public/game.js'),'utf8');
  assert.ok(js.includes('if(ui.laserToggle)ui.laserToggle.classList.toggle'));
  assert.ok(js.includes('if(ui.rocketCd)HUD_CONTENT_CACHE.text(ui.rocketCd'));
  assert.ok(js.includes('if(ui.laserToggle)ui.laserToggle.onclick'));
  assert.ok(js.includes('if(ui.rocketFire)ui.rocketFire.onclick'));
});
