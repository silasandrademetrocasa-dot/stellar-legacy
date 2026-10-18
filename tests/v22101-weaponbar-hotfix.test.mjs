import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../public/',import.meta.url);
const css=readFileSync(new URL('style.css',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
const fixes=css.split('V22.10.1 — HOTFIX REAL DO PAINEL DE MUNICOES')[1];

test('hotfix força toolbar e arsenal em duas linhas, nunca lado a lado com largura zero',()=>{
 assert.ok(fixes,'missing hotfix');
 assert.match(fixes,/#bottomHudDock #weaponBar/);
 assert.match(fixes,/flex-direction:column!important/);
 assert.match(fixes,/#bottomHudDock #weaponBar #weaponBarContent/);
 assert.match(fixes,/width:100%!important;min-width:0!important/);
 assert.match(fixes,/grid-template-columns:minmax\(0,1fr\) 50px!important/);
});
test('laser, misseis e habilidade continuam tocáveis sem sacrificar o aux',()=>{
 for(const id of ['laserAmmoButtons','rocketAmmoButtons','shipAbilityBtn','weaponBarToggle'])assert.ok(html.includes(`id="${id}"`));
 assert.match(fixes,/#bottomHudDock #weaponBar \.ammo-bubbles/);
 assert.match(fixes,/overflow-x:auto!important/);
 assert.match(fixes,/#bottomHudDock #weaponBar \.aux-only-action\{display:none!important/);
});
test('munições recolhidas ocupam 40px e não retêm elementos invisíveis',()=>{
 assert.match(fixes,/#bottomHudDock #weaponBar\.collapsed/);
 assert.match(fixes,/height:40px!important;min-height:40px!important;max-height:40px!important/);
 assert.match(fixes,/#bottomHudDock #weaponBar\.collapsed #weaponBarContent/);
});
