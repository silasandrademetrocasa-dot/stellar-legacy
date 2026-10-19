import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');

test('V32.1.4 removes compact button and increases chat/minimap height in landscape mobile',()=>{
  assert.match(css,/body\.mobile-landscape-pro \.mobile-combat-mode-btn\{display:none!important;\}/);
  assert.match(css,/#bottomHudDock\.bottom-hud-dock\{[\s\S]*max-height:156px!important;/);
  assert.match(css,/#bottomHudDock\.bottom-hud-dock #chatDock\{[\s\S]*height:146px!important;/);
  assert.match(css,/#chatDock \.chat-feed\{height:76px!important;max-height:76px!important;min-height:76px!important;/);
  assert.match(css,/#bottomHudDock\.bottom-hud-dock #minimapPanel\{[\s\S]*height:146px!important;/);
  assert.match(css,/#bottomHudDock #minimapPanel #minimap\{[\s\S]*height:112px!important;max-height:112px!important;min-height:112px!important;/);
});
