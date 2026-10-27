import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const farm=read('public/modules/stellar-offline-farm-v484.js');
const game=read('public/game.js');
const html=read('public/index.html');
const server=read('server/index.js');

test('V85: world-only shield sits inside isolated #app instead of capturing the entire body',()=>{
 assert.match(farm,/gameCanvas\.after\(lock\)/);
 assert.match(farm,/#v485-world-lock\{display:none;position:absolute;inset:0;z-index:2;pointer-events:none/);
 assert.doesNotMatch(farm,/lock\.addEventListener\('pointerdown'/);
 assert.match(farm,/\.stellar-offline-active-v485 #topbar\{pointer-events:auto!important;z-index:10050!important/);
});

test('V85: running farm visually conceals gameplay, minimap and location without deleting sprites',()=>{
 assert.match(farm,/\.stellar-offline-active-v485 canvas#game\{visibility:hidden!important;pointer-events:none!important\}/);
 assert.match(farm,/#minimapPanel/);
 assert.match(farm,/#rightHudStack/);
 assert.match(farm,/#mapLabel,#sectorName/);
 assert.match(farm,/document\.body\.classList\.toggle\('stellar-offline-active-v485',yes\)/);
 assert.doesNotMatch(farm,/canvas\.width\s*=\s*0|canvas\.height\s*=\s*0/);
});

test('V85: menus and modal surfaces are interactive during farm while world controls stay blocked',()=>{
 assert.match(farm,/\.stellar-offline-active-v485 \.modal:not\(\.hidden\)\{pointer-events:auto!important;z-index:10060!important\}/);
 assert.match(game,/function gameplayPointerAllowed\(\)\{return !offlineFarmWorldLockedV84\(\)/);
 assert.match(game,/function openMapModal\(\)\{if\(offlineFarmWorldLockedV84\(\)\)/);
 assert.match(game,/minimap\.addEventListener\('pointerdown',e=>\{if\(offlineFarmWorldLockedV84\(\)/);
 assert.match(game,/if\(offlineFarmWorldLockedV84\(\)\&\&\(e\.key==='Control'/);
 for(const id of ['hangarBtn','shopBtn','auctionBtn','arenaBtn','missionBtn'])assert.match(html,new RegExp(`id="${id}"`));
});

test('V85: offline settlement stays authoritative; auction does not overwrite its save',()=>{
 assert.match(farm,/const x=await request\('settle',\{\}\)/);
 assert.match(farm,/const x=await request\('cancel',\{\}\)/);
 assert.match(game,/if\(!offlineFarmWorldLockedV84\(\)\)await flushCloudSave\(true\)/);
 assert.match(game,/await saveAuctionBidOnline\(/);
 assert.match(server,/OFFLINE_FARM_GUARD_V484/);
});
