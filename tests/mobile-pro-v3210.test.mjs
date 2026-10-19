import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('mobile compact combat mode has accessible control and persistent setting',()=>{
 assert.match(read('../public/index.html'),/id="mobileCombatModeBtn".*aria-pressed="false"/);
 const js=read('../public/game.js');
 assert.match(js,/function setMobileCombatCompact\(/);
 assert.match(js,/localStorage\.setItem\(MOBILE_COMBAT_LAYOUT_KEY/);
 assert.match(js,/button\.addEventListener\('click'/);
});
test('mobile mode limits battle dock height without hiding combat controls',()=>{
 const css=read('../public/style.css');
 assert.match(css,/body\.mobile-combat-pro #bottomHudDock #weaponBar/);
 assert.match(css,/max-height:92px!important/);
 assert.match(css,/touch-action:manipulation/);
});
