import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const mod=readFileSync(resolve(root,'public/modules/stellar-offline-farm-v484.js'),'utf8');
const game=readFileSync(resolve(root,'public/game.js'),'utf8');
const html=readFileSync(resolve(root,'public/index.html'),'utf8');
const server=readFileSync(resolve(root,'server/index.js'),'utf8');

const menus=['pilot','missions','battle','shops'];
const actions=['hangarBtn','shopBtn','premiumBtn','auctionBtn','arenaBtn','clanBtn','missionBtn','mapBtn','configBtn','adminBtn'];
test('V84: offline bloqueia canvas, não esconde navegação ou HUD',()=>{
 assert.match(mod,/\.stellar-offline-active-v485 canvas#game\{pointer-events:none!important\}/);
 assert.match(mod,/\.stellar-offline-active-v485 #v485-world-lock\{display:block\}/);
 assert.match(mod,/#v485-world-lock\{display:none;position:fixed;inset:0;z-index:5;/);
 assert.match(mod,/\.stellar-offline-active-v485 #topbar\{z-index:10050!important;pointer-events:auto!important/);
 assert.doesNotMatch(mod,/\.stellar-offline-active-v485 \.hud-panel:not\(#topbar\)/);
 assert.doesNotMatch(mod,/\.stellar-offline-active-v485 #topbar \.top-actions > :not/);
 for(const menu of menus)assert.match(html,new RegExp(`data-menu-group="${menu}"`));
 for(const id of actions)assert.match(html,new RegExp(`id="${id}"`));
});
test('V84: ações de mapa permanecem desligadas no farm mesmo por teclado ou toque',()=>{
 assert.match(game,/function offlineFarmWorldLockedV84\(\)\{return document\.body\.classList\.contains/);
 assert.match(game,/function gameplayPointerAllowed\(\)\{return !offlineFarmWorldLockedV84\(\)/);
 assert.match(game,/minimap\.addEventListener\('pointerdown',e=>\{if\(offlineFarmWorldLockedV84\(\)/);
 assert.match(game,/ui\.portalPrompt\.onclick=\(\)=>\{if\(offlineFarmWorldLockedV84\(\)\)return/);
 assert.match(game,/if\(offlineFarmWorldLockedV84\(\)\&\&\(e\.key==='Control'/);
 assert.match(game,/player\.laserFiring=false;state\.pointerNavActive=false;state\.pointerNavId=null;/);
 assert.match(game,/if\(document\.visibilityState==='hidden'\|\|offlineFarmWorldLockedV84\(\)\)/);
 assert.match(game,/function canChangeEquipment\(\)\{return !offlineFarmWorldLockedV84\(\)/);
 assert.match(game,/function runMapTransition\([\s\S]+?if\(offlineFarmWorldLockedV84\(\)\)/);
});
test('V84: leilão registra lance sem salvar snapshot local durante farm; quitação postergada',()=>{
 assert.match(game,/if\(!offlineFarmWorldLockedV84\(\)\)await flushCloudSave\(true\);/);
 assert.match(game,/await saveAuctionBidOnline\(/);
 assert.match(game,/if\(offlineFarmWorldLockedV84\(\)\)return; \/\/ V84: resgatar lotes/);
 assert.match(game,/if\(!offlineFarmWorldLockedV84\(\)\)saveGame\(\); \/\/ Lance já foi confirmado/);
 assert.match(game,/if\(offlineFarmWorldLockedV84\(\)\)return; \/\/ V84: save online suspenso/);
 assert.match(server,/app\.post\('\/api\/economy\/action', requireUser, OFFLINE_FARM_GUARD_V484/);
 assert.match(server,/app\.put\('\/api\/save', requireUser, OFFLINE_FARM_GUARD_V484/);
});
test('V84: farm não é encerrado quando modal é aberto e continua com encerramento oficial',()=>{
 assert.match(mod,/\$\('v484-close'\)\.onclick=\(\)=>shell\.hidden=true/);
 assert.match(mod,/const running=status==='running';active\(running\)/);
 assert.match(mod,/const x=await request\('settle',\{\}\)/);
 assert.match(mod,/const x=await request\('cancel',\{\}\)/);
});
