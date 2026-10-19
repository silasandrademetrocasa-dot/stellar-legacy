import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');

test('V32.1.3 landscape mobile enlarges chat/minimap and moves HUD quick toggle to top',()=>{
  assert.match(css,/body\.mobile-landscape-pro \.hud-intelligence-quick\{[\s\S]*top:calc\(env\(safe-area-inset-top,0px\) \+ 7px\)!important;[\s\S]*right:calc\(env\(safe-area-inset-right,0px\) \+ 46px\)!important;/);
  assert.match(css,/#bottomHudDock\.bottom-hud-dock\{[\s\S]*max-height:126px!important;/);
  assert.match(css,/#bottomHudDock\.bottom-hud-dock #chatDock\{[\s\S]*height:116px!important;/);
  assert.match(css,/#chatDock \.chat-feed\{height:46px!important;max-height:46px!important;min-height:46px!important;/);
  assert.match(css,/#bottomHudDock\.bottom-hud-dock #minimapPanel\{[\s\S]*height:116px!important;/);
  assert.match(css,/#bottomHudDock #minimapPanel #minimap\{[\s\S]*height:82px!important;max-height:82px!important;min-height:82px!important;/);
});
