import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHudNumberV482,parsePilotLevelV482} from '../public/modules/pilot-ship-hud-v482.js';
const source=readFileSync(new URL('../public/modules/pilot-ship-hud-v482.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/modules/pilot-ship-hud-v482.css',import.meta.url),'utf8');
const patch=readFileSync(new URL('../scripts/v482-hud-xp-patch.mjs',import.meta.url),'utf8');

test('interpreta nivel e XP persistidos com pontuação pt-BR',()=>{
 assert.deepEqual(parsePilotLevelV482('2 • 27.424 XP'),{level:2,xp:27424});
 assert.equal(parseHudNumberV482('140.000'),140000);
});
test('o piloto exibe LV, XP atual e proximo nivel DENTRO da barra',()=>{
 assert.match(source,/v482-xp-track[^`]*v482-xp-overlay/);
 assert.match(source,/id="v482LevelText"/);
 assert.match(source,/id="v482XpValues"/);
 assert.match(css,/#topHudDock #playerPanel \.v482-xp-overlay/);
});
test('nave mostra somente nome e botões originais de configuração no cabeçalho',()=>{
 assert.match(source,/toolbar\?\.querySelector\('\.stats-toolbar-label'\)\?\.remove\(\)/);
 assert.match(source,/toolbar\.appendChild\(controls\)/);
 assert.match(source,/controls\.addEventListener\('click',event=>event\.stopPropagation\(\)\)/);
 assert.match(css,/#topHudDock #leftStats \.stats-toolbar #battleConfigToolbar/);
 assert.doesNotMatch(source,/textContent\s*=\s*['"`]NAVE ATUAL/);
});
test('barras HP e ESC + PORÃO e VEL na mesma linha sem corte',()=>{
 assert.match(source,/v482-gauge-overlay/);
 assert.match(source,/v482-gauge-numbers/);
 assert.match(source,/id='v482ShipMeta'/);
 assert.match(source,/id=\"v482CargoText\"/);
 assert.match(source,/id=\"v482SpeedText\"/);
 assert.match(source,/\[hp,shield,cargo,speed\]/);
 assert.match(css,/#topHudDock #leftStats \.v482-gauge-overlay/);
});
test('nao substitui listeners de troca de configuração nem altera save',()=>{
 assert.doesNotMatch(source,/\.cloneNode\(/);
 assert.doesNotMatch(source,/saveGame\(|localStorage\.|\.rpc\(|\.from\('game_saves'/);
 for(const id of ['battleConfigToolbar','statsHeader','hp','shield','cargoUsed','speed'])assert.ok(source.includes(id),id);
});
test('script usa cache novo, idempotente e mantem versao principal do jogo',()=>{
 assert.match(patch,/pilot-ship-hud-v482\.css','pilot-ship-hud-v482\.js/);
 assert.match(patch,/\?v=48\.2\.6/);
 assert.match(patch,/48\.2\.5/);
 assert.match(patch,/html\.replaceAll\(older,newer\)/);
});
