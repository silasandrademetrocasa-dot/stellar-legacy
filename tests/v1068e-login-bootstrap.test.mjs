import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V106.8E: extra check is safe when progress has not loaded',()=>{
 const source=read('public/game.js');
 const match=source.match(/function hasExtra\(itemId\)\{([^}]+)\}/);
 assert.ok(match);
 assert.match(match[1],/progress\?\.shipLoadout\?\.extras\?\.includes/);
 const hasExtra=Function('progress','itemId',`return (function(){return ${match[1].trim().replace(/^return\s*/,'').replace(/;\s*$/,'')};})()`);
 assert.equal(hasExtra(null,'rocketTurboCpu'),false);
 assert.equal(hasExtra({shipLoadout:{extras:['rocketTurboCpu']}},'rocketTurboCpu'),true);
 assert.equal(hasExtra({shipLoadout:{extras:null}},'rocketTurboCpu'),false);
});
test('V106.8E: autoplay snapshot is allowed before auth and login event binds after initialization',()=>{
 const src=read('public/game.js');
 assert.match(src,/const AUTOPILOT_V48=createStellarAutopilotV48/);
 assert.match(src,/window\.STELLAR_LOGIN_FORM_READY_V1068E = true/);
 assert.ok(src.indexOf('window.STELLAR_LOGIN_FORM_READY_V1068E = true')>src.indexOf('ui.loginForm.onsubmit=async e=>'));
});
test('V106.8E: emergency form handler stops GET navigation on a broken login bind',()=>{
 const html=read('public/index.html');
 assert.match(html,/document\.addEventListener\('submit',event=>/);
 assert.match(html,/event\.target\?\.id!=='loginForm'/);
 assert.match(html,/event\.preventDefault\(\)/);
 assert.match(html,/v1068e-login-repair/);
});
test('V106.8E: no mission or account data changed by login repair',()=>{
 const src=read('public/game.js');
 assert.match(src,/TESTE V106\.8D: conclusões de missões pausadas/);
 assert.doesNotMatch(src,/MISSION_REWARD_ACK_V108/);
 assert.match(read('server/index.js'),/validateEquipmentWriteV1062/);
});
