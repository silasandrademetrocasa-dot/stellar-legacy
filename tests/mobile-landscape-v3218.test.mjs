import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LASER_AMMO,ROCKETS,RESOURCES} from '../public/data.js';
import {stellarOreName} from '../public/modules/stellar-display-names.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
test('nomenclatura é Stellar Legacy sem alterar os IDs internos',()=>{
 assert.equal(LASER_AMMO.lcb10.name,'PLS-1');assert.equal(ROCKETS.r310.name,'CMT-1');
 assert.match(game,/function shortLaserLabel\(id\)\{return LASER_AMMO\[id\]\?\.name/);
 assert.match(game,/function shortRocketLabel\(id\)\{return ROCKETS\[id\]\?\.name/);
 for(const [id,item] of Object.entries(RESOURCES))assert.equal(stellarOreName(id),item.name);
 assert.equal(stellarOreName('customId','Novo minério'),'Novo minério');
});
test('coleta exibe nomes Stellar em multiplayer, nave e AUX-9',()=>{
 assert.match(game,/RECURSO ONLINE'\} • \+\$\{fmt\(got\)\} \$\{stellarOreName\(o.type\)\}/);
 assert.match(game,/AUX-9 coletou \+\$\{fmt\(got\)\} \$\{stellarOreName\(task.type\)\}/);
 assert.match(game,/Pedra • \+\$\{fmt\(got\)\} \$\{stellarOreName\(o.type\)\}/);
});
test('chat não pode ser limitado a 100px e mantém input visível na horizontal',()=>{
 assert.match(css,/#bottomHudDock\.bottom-hud-dock #chatDock:not\(\.collapsed\),\s*body\.mobile-landscape-pro #bottomHudDock\.bottom-hud-dock #minimapPanel:not\(\.collapsed\)\{[^}]*max-height:200px!important;/);
 assert.match(css,/#bottomHudDock #chatDock:not\(\.collapsed\) \.chat-compose\{[^}]*display:grid!important;/);
});
test('minimapa no celular não é repintado em cada quadro',()=>{
 assert.match(game,/const mapInterval=document\.body\.classList\.contains\('mobile-landscape-pro'\)\?100:/);
});
