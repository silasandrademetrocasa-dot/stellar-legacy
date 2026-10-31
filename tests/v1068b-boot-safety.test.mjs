import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const game=src('public/game.js');
const farm=src('public/modules/stellar-offline-farm-v484.js');
const html=src('public/index.html');

test('Boot: farm checks status only, without waiting for options and preview before gameplay',()=>{
 assert.match(farm,/async function refresh\(\{startup=false\}=\{\}\)/);
 assert.match(farm,/render\(x\);if\(startup\)return true;/);
 assert.match(farm,/const verified=await refresh\(\{startup:true\}\)/);
 assert.match(farm,/startup\?8500:22000/);
 const refreshBody=farm.slice(farm.indexOf('async function refresh('),farm.indexOf('async function operation('));
 assert.ok(refreshBody.indexOf('if(startup)return true;')<refreshBody.indexOf("const options=await request('options')"));
});
test('Boot: farm fails closed if status is not verified, even on timeout',()=>{
 assert.match(farm,/if\(!verified\)\{await onPauseWorld\?\.\(\);active\(true,false\)/);
 assert.match(game,/catch \(err\) \{\s*console\.error\('\[bootstrap\] farm verification failed closed'/);
 assert.match(game,/document\.body\.classList\.add\('stellar-offline-active-v485'\)/);
});
test('Boot: optional admin read does not block the world',()=>{
 const block=game.slice(game.indexOf('async function afterAuth()'),game.indexOf('async function boot()'));
 assert.ok(block.includes('void refreshAdminStatus(true);'));
 assert.ok(!block.includes('await refreshAdminStatus(true)'));
 assert.match(game,/adminRuntime\.status\?\.is_admin===false/);
});
test('Boot: loading does not vanish silently after nine seconds',()=>{
 assert.doesNotMatch(html,/setTimeout\(\(\)=>\{if\(!ended\)window\.stellarSplashFinish\(\)\},9000\)/);
 assert.match(html,/LOGIN PRONTO · VERIFICANDO SESSÃO/);
 assert.match(html,/MOTOR NÃO INICIOU/);
 assert.match(html,/\.stellarSplashFinish\(\);const info=document\.getElementById\('authMessage'\)/);
});
test('Boot: session replacement aborts pending async bootstrap',()=>{
 assert.match(game,/function forceLogoutBecauseSessionMoved[\s\S]{0,420}\+\+gameBootstrapRuntime\.generation/);
 assert.match(game,/if\(!authenticated\|\|generation!==gameBootstrapRuntime\.generation\)return;/);
});
test('Boot: login recovery surfaces actual errors without deleting saves',()=>{
 assert.match(game,/\[bootstrap\] login\/entrada falhou/);
 assert.match(game,/Sua conta e save foram preservados/);
 assert.match(game,/Falha ao preparar o jogo/);
});
