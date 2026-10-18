import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('public/index.html',root),'utf8');
const css=readFileSync(new URL('public/style.css',root),'utf8');

test('barra de munições usa layout reorganizado e compacto',()=>{
  assert.match(html,/weapon-toolbar-actions/);
  assert.match(html,/compact-action/);
  assert.match(html,/compact-square/);
  assert.match(css,/V22\.9\.5 • WEAPON BAR REORGANIZATION/);
  assert.match(css,/grid-template-columns:repeat\(auto-fit,minmax\(var\(--weapon-select-size-v2295\),1fr\)\)/);
});

test('kamikaze sai do rodapé e permanece apenas como ação do AUX-9',()=>{
  assert.match(html,/id="petKamiAbilityBtn"/);
  assert.match(html,/aux-only-action/);
  assert.match(css,/#weaponBar \.aux-only-action\{\s*display:none!important;/);
});

test('estado recolhido do weapon bar continua limpo',()=>{
  assert.match(css,/#weaponBar\.collapsed #weaponBarContent/);
  assert.match(css,/#weaponBar\.compact-ammo-ui\.collapsed #weaponBarContent/);
  assert.match(css,/#weaponBar\.collapsed \.weapon-toolbar-actions/);
});
