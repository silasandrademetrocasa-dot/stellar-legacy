import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {AUX_ADVANCED_TIERS_V110,normalizeAuxAdvancedEquippedV110} from '../public/modules/aux-advanced-protocols-v110.js';
import {dailyPassTargetV113} from '../public/modules/pass-targets-v113.js';
import {summarizeCombatProgressionV113,npcPressureV113,classifyNpcV113} from '../server/progression-balance-v113.js';
const root=resolve(import.meta.dirname,'..');
const src=path=>readFileSync(resolve(root,path),'utf8');
test('V113: escala suavemente objetivos FREE até LV44 sem bloqueios',()=>{
 assert.equal(dailyPassTargetV113(15,50,1),15);
 assert.equal(dailyPassTargetV113(15,50,15),50);
 assert.ok(dailyPassTargetV113(15,50,44)>=60);
 assert.ok(dailyPassTargetV113(15,50,44)<=62);
 assert.equal(dailyPassTargetV113(8,35,1),8);
 assert.ok(dailyPassTargetV113(8,35,30)>35);
 assert.ok(dailyPassTargetV113(8,35,44)<50);
 for(let l=2;l<=44;l++)assert.ok(dailyPassTargetV113(15,50,l)>=dailyPassTargetV113(15,50,l-1));
});
test('V113: calcula pressão efetiva de NPC sem multiplicar recompensas',()=>{
 const r=npcPressureV113({npc_key:'bossTest',hp:500000,shield:500000,damage:500,credits:1200000,stl:900,xp:12000});
 assert.equal(r.rank,'boss');assert.equal(r.hull,1000000);assert.equal(r.creditsPerMillionHull,1200000);
 assert.equal(classifyNpcV113({npc_key:'apexOverlord'}),'legendary');
});
test('V113: relatório separa chefes e não edita saves',()=>{
 const r=summarizeCombatProgressionV113({
 npcs:[{npc_key:'bossA',name:'Prime',hp:300000,shield:300000,credits:500000,stl:500,xp:1000},{npc_key:'basic',hp:10000,shield:5000,credits:20000,stl:20,xp:60}],
 ships:[{kind:'ship',item_id:'starter',params:{hp:100000,lasers:1,speed:320}}],
 items:[{kind:'item',params:{equipment_type:'drone',slots:1}}],
 seasons:[{season_key:'2026-11',enabled:true,tier_count:30,points_per_tier:450,daily_points:100}],
 tiers:Array.from({length:30},(_,i)=>({season_key:'2026-11',tier_no:i+1}))
 });
 assert.equal(r.readOnly,true);assert.equal(r.counts.npcs,2);assert.equal(r.counts.bosses,1);
 assert.equal(r.pass.nominalDaysToFinish,19.29);assert.equal(r.pass.rewardsConfigured,30);
});
test('V113: sem redução de slots de nave/drone, proteção Farm e Autopilot preservadas',()=>{
 const sql=src('sql/STELLAR_V113_BALANCEAMENTO_CUMULATIVO.sql');
 assert.ok(sql.includes('game_npc_config_v1811'));
 assert.ok(sql.includes('game_balance_entries_v1909'));
 assert.ok(sql.includes('game_mission_category_v1815'));
 assert.ok(sql.includes('game_battle_pass_seasons_v1817b'));
 assert.doesNotMatch(sql,/\b(?:UPDATE|DELETE FROM|TRUNCATE)\s+(?:public\.)?(?:game_saves|profiles|stellar_offline_farm_v484|player_level_milestones)/i);
 assert.doesNotMatch(sql,/\b(lasers|generators|extras|slots)\s*=/i);
 const game=src('public/game.js');assert.match(game,/dailyPassTargetV113\(min,max,level\)/);
 const server=src('server/index.js');assert.match(server,/installCombatProgressionAuditV113\(/);
 assert.match(src('public/modules/stellar-autopilot-v48.js'),/chooseAutopilotAction/);
 assert.match(src('server/offline-farm-v484.js'),/stellar_offline_farm_claim_v1111/);
});

test('V113: evolução AUX é conquista sem alterar os protocolos já adquiridos',()=>{
 assert.equal(AUX_ADVANCED_TIERS_V110[2].cost,250000);
 assert.equal(AUX_ADVANCED_TIERS_V110[3].cost,500000);
 assert.equal(AUX_ADVANCED_TIERS_V110[3].creditsCost,180000000);
 assert.equal(AUX_ADVANCED_TIERS_V110[2].minLevel,8);
 assert.equal(AUX_ADVANCED_TIERS_V110[3].universe,true);
 assert.equal(normalizeAuxAdvancedEquippedV110({dano:2,hp:1},{dano:2,hp:1},9).dano,2);
});
