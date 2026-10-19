import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');

test('V32.1.8 refines landscape mobile chat, minimap and collapsed HUD buttons',()=>{
  assert.match(css,/body\.mobile-landscape-pro #bottomHudDock\.bottom-hud-dock\{[\s\S]*minmax\(268px,var\(--minimap-dock-width-current,var\(--minimap-dock-width-expanded\)\)\)!important;/);
  assert.match(css,/#chatDock \.chat-feed\{height:82px!important;max-height:82px!important;min-height:82px!important;/);
  assert.match(css,/#bottomHudDock #minimapPanel #minimap\{[\s\S]*height:140px!important;max-height:140px!important;min-height:140px!important;/);
  assert.match(css,/#topHudDock>\.hud-panel\.collapsed\{[\s\S]*width:38px!important;[\s\S]*height:38px!important;/);
  assert.match(css,/body\.mobile-landscape-pro #chatDock \.chat-compose input\{background:rgba\(7,22,35,.95\)!important;/);
});
