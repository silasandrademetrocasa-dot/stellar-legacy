import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js=readFileSync(new URL('../public/game.js', import.meta.url),'utf8');

test('V32.0.2: portal neutral zone is larger and more subtle visually',()=>{
  assert.match(js,/const PORTAL_NEUTRAL_RADIUS = 240;/);
  assert.match(js,/setLineDash\(\[10,14\]\).*?strokeStyle=hexToRgba\(c\.main,.07\).*?lineWidth=1.*?PORTAL_NEUTRAL_RADIUS/s);
});
