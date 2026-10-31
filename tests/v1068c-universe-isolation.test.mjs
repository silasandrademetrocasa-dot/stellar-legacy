import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const html=read('public/index.html');
const nav=read('public/modules/topbar-navigation-v481.js');
const server=read('server/index.js');
test('V1068C remove main HTML import of Unified Expansion V42',()=>{
  assert.doesNotMatch(html,/<script[^>]+src="\/modules\/unified-expansion-v42\.js/);
  assert.doesNotMatch(html,/id="frontierExpansionBtnV42"/);
  assert.doesNotMatch(html,/id="frontierExpansionModalV42"/);
  assert.match(html,/stellarIsolationMarkerV1068C/);
});
test('V1068C nav does not create universe entry and guards absent control',()=>{
  assert.doesNotMatch(nav,/data-v481-action="universe"/);
  assert.match(nav,/if\(universe\)universe\.textContent/);
  assert.match(nav,/if\(!button\)continue/);
});
test('V1068C server detaches frontier API and returns controlled 503',()=>{
  assert.doesNotMatch(server,/^import \{attachFrontierUnifiedV42\}/m);
  assert.doesNotMatch(server,/^attachFrontierUnifiedV42\(/m);
  assert.match(server,/UNIVERSE_V42_DISABLED_V1068C/);
  assert.match(server,/app\.use\('\/api\/frontier\/v42'/);
});
test('V1068C keeps primary game, WebSocket and farm untouched',()=>{
  assert.match(html,/src="\/game\.js\?/);
  assert.match(server,/attachSharedUniverse\(/);
  assert.match(server,/attachStageAV423\(/);
  assert.match(server,/attachStageBV426\(/);
  assert.match(html,/stellar-boot-splash/);
});
