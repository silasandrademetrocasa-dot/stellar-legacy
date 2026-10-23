import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ui=fs.readFileSync(new URL('../public/modules/stellar-offline-farm-v484.js',import.meta.url),'utf8');
test('V48.5.1: topbar is above the farm input shield',()=>{
  assert.match(ui,/STELLAR_OFFLINE_FARM_MENU_RESCUE_V4851/);
  assert.match(ui,/\.stellar-offline-active-v485 #topbar\{z-index:10050!important;pointer-events:auto!important;overflow:visible!important\}/);
  assert.match(ui,/#v485-world-lock\{display:none;position:fixed;inset:60px 0 0;z-index:5;/);
});
test('V48.5.1: world remains locked but indicator can open farm',()=>{
  assert.match(ui,/farmRescueIndicator\.addEventListener\('click',e=>\{e\.stopPropagation\(\);open\(\);\}\)/);
  assert.match(ui,/if\(e\.target\.closest\?\.\('#v485-world-indicator'\)\)\{e\.stopPropagation\(\);return;\}/);
  assert.match(ui,/function open\(\)\{installMenu\(\);shell\.hidden=false;void operation\(refresh\);\}/);
  assert.match(ui,/function installMenu\(\).*v485FarmMenuEntry/);
});
test('V48.5.1: economic controls untouched',()=>{
  assert.match(ui,/request\('settle',\{\}\)/);
  assert.match(ui,/request\('cancel',\{\}\)/);
  assert.match(ui,/active\(running\)/);
});
