import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHudNumberV482,parsePilotLevelV482} from '../public/modules/pilot-ship-hud-v482.js';
for(const [raw,expected] of [['1.234.567',1234567],['0',0],['75.000',75000],['1,5',1.5]]){
 test(`formata número HUD pt-BR: ${raw}`,()=>assert.equal(parseHudNumberV482(raw),expected));
}
test('reconhece nivel e XP informado pelo jogo',()=>{
 assert.deepEqual(parsePilotLevelV482('7 • 1.234.567 XP'),{level:7,xp:1234567});
 assert.equal(parsePilotLevelV482('n/a'),null);
});
test('painéis usam IDs originais de piloto e nave, com XP/HP/ESC/Cargo',()=>{
 const source=fs.readFileSync(new URL('../public/modules/pilot-ship-hud-v482.js',import.meta.url),'utf8');
 for(const anchor of ['playerPanel','leftStats','rankChip','credits','uridium','lvl','hp','maxHp','shield','maxShield','cargoUsed','cargoMax','speed','battleConfigToolbar'])assert.ok(source.includes(anchor),anchor);
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.equal(html.split('/modules/pilot-ship-hud-v482.css').length-1,1);
 assert.equal(html.split('/modules/pilot-ship-hud-v482.js').length-1,1);
});
test('game.js consome curva nova sem substituir marcadores anti-fraude',()=>{
 const code=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.ok(code.includes('function levelXpThreshold(level){return xpThresholdV482(level);}'));
 assert.ok(code.includes('migratePlayerXpCurveV482();'));
 for(const key of ['serverNpcRewardRevision','serverOreRevision'])assert.ok(code.includes(key));
});

test('V48.2 mantém import da curva de XP no cache-busting obrigatório da release',()=>{
 const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 const game=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.ok(game.includes(`from './level-curve-v482.js?v=${pkg.version}'`));
 assert.ok(!game.includes("from './level-curve-v482.js?v=48.2.0'"));
});
