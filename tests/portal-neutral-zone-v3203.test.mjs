import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js=readFileSync(new URL('../public/game.js', import.meta.url),'utf8');

test('V32.1.8: portal safety excludes PvP maps and PvP destinations',()=>{
  assert.match(js,/function portalHasNeutralSafety\(portal,map=state\.currentMap\)\{/);
  assert.match(js,/if\(map\.battle\|\|isPublicPvpSector\(map\.id\)\)return false;/);
  assert.match(js,/if\(to\.startsWith\('b4'\)\|\|to\.includes\('battle'\)\)return false;/);
  assert.match(js,/if\(dest\?\.battle\|\|isPublicPvpSector\(dest\?\.mapId\)\)return false;/);
  assert.match(js,/resolvedPortals\(\)\.some\(p=>portalHasNeutralSafety\(p,state\.currentMap\)&&Math\.hypot\(x-p\.x,y-p\.y\)<=PORTAL_NEUTRAL_RADIUS\)/);
});

test('V32.1.8: only safe portals draw the neutral ring and it is more subtle',()=>{
  assert.match(js,/if\(portalHasNeutralSafety\(portal,state\.currentMap\)\)\{/);
  assert.match(js,/setLineDash\(\[12,16\]\).*?hexToRgba\(c\.main,.045\).*?lineWidth=.9/s);
});
