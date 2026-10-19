import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');

test('V32.1.7 enlarges minimap in mobile landscape',()=>{
  assert.match(css,/body\.mobile-landscape-pro #bottomHudDock\.bottom-hud-dock #minimapPanel\{[^}]*height:176px!important;/);
  assert.match(css,/body\.mobile-landscape-pro #bottomHudDock #minimapPanel #minimap\{[^}]*height:140px!important;/);
  assert.match(css,/body\.mobile-landscape-pro #bottomHudDock #minimapPanel\{[^}]*width:268px!important;/);
});
