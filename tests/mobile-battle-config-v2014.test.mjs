import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');

test('as duas configuracoes existem uma so vez e ficam dentro do HUD NAVE',()=>{
 for(const id of ['battleConfigToolbar','battleConf1','battleConf2','battleConfCooldown'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,id);
 const nave=html.split('<section class="hud-panel compact-stats ship-stats-float" id="leftStats">')[1].split('</section>')[0];
 assert.match(nave,/id="battleConfigToolbar"/);
 assert.match(nave,/id="battleConf1"/);
 assert.match(nave,/id="battleConf2"/);
 const municoes=html.split('<section class="hud-panel compact-ammo-ui" id="weaponBar">')[1].split('</section>')[0];
 assert.doesNotMatch(municoes,/battleConf1|battleConf2|battleConfigToolbar/);
});
test('o card NAVE cresce no celular, mas recolhido esconde as configs',()=>{
 assert.match(css,/#topHudDock #leftStats:not\(\.collapsed\)\s*\{[^}]*height:166px!important/);
 assert.match(css,/@media\(max-width:700px\)\s*\{[\s\S]*#topHudDock #leftStats:not\(\.collapsed\)\{height:172px!important/);
 assert.match(css,/#topHudDock #leftStats\.collapsed \.battle-config-ship-v2014\{display:none!important;/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
});
test('botões originais continuam ligados a troca de CONF e ao cooldown de 5s',()=>{
 assert.match(js,/for\(const id of \[1,2\]\)document\.getElementById\(`battleConf\$\{id\}`\)\?\.addEventListener\('click',\(\)=>switchBattleConfigV2013\(id\)\)/);
 assert.match(js,/combatConfigRemainingV2013\(c\.lastSwitchAt\)/);
 assert.match(js,/battleConfHeaderV2014/);
});
