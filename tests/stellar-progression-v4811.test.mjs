import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {NAV_LEVELS_V481,mayOpenUniverseV481} from '../public/modules/topbar-navigation-v481.js';
const text=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../sql/STELLAR_V48_1_1_MISSOES_PASSE_NIVEIS.sql',import.meta.url),'utf8');
test('menu Missões abre desde o nível 1',()=>{
 assert.equal(NAV_LEVELS_V481.missions,1);
 assert.ok(text.includes('const PROGRESSION_UNLOCKS={missions:1,pilot:6,clan:8}'));
 assert.ok(text.includes("if(['missions_menu','missions','pass'].includes(key))return 1"));
});
test('tutorial mantém etapa LV5 com novo objetivo',()=>{
 assert.ok(text.includes('Alcance o nível 5 e desbloqueie as missões semanais.'));
 assert.ok(!text.includes('Alcance o nível 5 e libere o Controle de Missões.'));
});
test('Passe mostra recompensas LV2+ mas só pontua depois do nível 1',()=>{
 assert.ok(text.includes('if(!progress||(Number(progress.profile?.level)||1)<2||amount<=0||!battlePassSeasonActive())return;'));
 assert.ok(text.includes('objetivos e pontos do Passe começam no nível 2'));
 assert.ok(text.includes('const levels=Array.from({length:PLAYER_MAX_LEVEL-1},(_,i)=>i+2)'));
});
test('categorias seguem diária 3, semanal 5, mensal 7, especial 10',()=>{
 assert.ok(text.includes('daily:3,weekly:5,monthly:7,special:10'));
 for(const [name,level] of [['daily',3],['weekly',5],['monthly',7],['special',10]]) assert.ok(sql.includes(`WHEN '${name}' THEN ${level}`));
});
test('Universo continua liberando no LV10 e ADM tem acesso',()=>{
 assert.equal(mayOpenUniverseV481(9),false);assert.equal(mayOpenUniverseV481(10),true);assert.equal(mayOpenUniverseV481(1,true),true);
});
test('SQL altera somente níveis de UI e categorias, não dados de jogadores',()=>{
 assert.ok(sql.includes('UPDATE public.game_mission_category_v1815'));
 assert.ok(sql.includes('UPDATE public.game_ui_modules_v1810'));
 assert.ok(!/update\s+public\.(?:game_saves|profiles|auth)/i.test(sql));
});
