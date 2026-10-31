import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V106.8E fix survives all cumulative upgrades (pre-auth extra is null-safe)',()=>{
 const code=read('public/game.js');
 assert.match(code,/function hasExtra\(itemId\)\{return !!progress\?\.shipLoadout\?\.extras\?\.includes\(itemId\);\}/);
 assert.match(code,/window\.STELLAR_LOGIN_FORM_READY_V1068E = true/);
 assert.ok(code.indexOf('window.STELLAR_LOGIN_FORM_READY_V1068E = true')>code.indexOf('ui.loginForm.onsubmit=async e=>'));
});
test('V108 bootstrap retains safe no-reload fallback without public test logs',()=>{
 const html=read('public/index.html');
 assert.match(html,/event\.target\?\.id!=='loginForm'/);
 assert.match(html,/event\.preventDefault\(\)/);
 assert.match(html,/v108-cumulative-boot-safe/);
 assert.doesNotMatch(html,/TESTE V106\.8D|UNIVERSO\/MISSÕES EM TESTE/);
});
