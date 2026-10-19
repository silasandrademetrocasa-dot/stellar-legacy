import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('HUD rápido tolera botões removidos no HTML',()=>{
  assert.doesNotMatch(html,/id="laserToggle"|id="rocketCd"/);
  const body=js.match(/function updateCriticalHudV2024\(\)\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(body);
  assert.match(body,/if\(ui\.laserToggle\)ui\.laserToggle\.classList\.toggle/);
  assert.match(body,/if\(ui\.rocketCd\)HUD_CONTENT_CACHE\.text/);
  assert.equal(body.match(/ui\.laserToggle\.classList/g)?.length,1);
});
