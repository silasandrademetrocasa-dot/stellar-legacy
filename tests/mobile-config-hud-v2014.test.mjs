import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const nave=html.match(/<section class="hud-panel compact-stats ship-stats-float" id="leftStats">([\s\S]*?)<\/section>\s*<section class="hud-panel active-mission-float/);
const weapons=html.match(/<section class="hud-panel compact-ammo-ui" id="weaponBar">([\s\S]*?)<div class="weapon-bar-content"/);
test('CONF 1/2 ficam no painel NAVE, não na barra de munições',()=>{
 assert.ok(nave,'o card NAVE deve existir');
 assert.match(nave[1],/id="battleConfigToolbar"/);
 assert.match(nave[1],/id="battleConf1"/);
 assert.match(nave[1],/id="battleConf2"/);
 assert.match(nave[1],/id="battleConfCooldown"/);
 assert.doesNotMatch(weapons?.[1]||'',/battleConf[12]|battleConfigToolbar/);
});
test('somente uma cópia dos botões: listeners e cooldown continuam usando os mesmos IDs',()=>{
 for(const id of ['battleConf1','battleConf2','battleConfCooldown','battleConfigToolbar'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
 assert.match(js,/getElementById\(`battleConf\$\{target\}`\)/);
 assert.match(js,/for\(const id of \[1,2\]\)document\.getElementById\(`battleConf\$\{id\}`\)\?\.addEventListener\('click',\(\)=>switchBattleConfigV2013\(id\)\)/);
});
test('botões de CONF permanecem clicáveis em telas pequenas e não somem pelo colapso de munições',()=>{
 assert.match(css,/#topHudDock #leftStats \.battle-config-ship-hud-v2014/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(css,/min-height:33px!important/);
 assert.match(css,/#topHudDock #leftStats:not\(\.collapsed\)/);
});
test('nova versão força atualização do cache do HTML, CSS e JS',()=>{
 const release=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
 assert(html.includes(`/style.css?v=${release}`));
 assert(html.includes(`/game.js?v=${release}`));
});
