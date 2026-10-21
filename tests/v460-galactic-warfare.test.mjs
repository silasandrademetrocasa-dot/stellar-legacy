import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {xpThresholdV460,migratePilotXpV460,GALACTIC_XP_ANCHORS_V460} from '../public/level-curve-v460.js';
import {xpThresholdV1915} from '../public/level-curve-v1915.js';
import {progressionMilestonesV460,summarizePlaytestV460} from '../public/modules/galactic-balance-v460.js';
import {GALACTIC_PVE_LEVELS_V451,GALACTIC_PVP_LEVEL_V451} from '../public/modules/galactic-progression-v451.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('pilot experience anchors are accessible without trivializing the endgame',()=>{
 assert.equal(xpThresholdV460(1),0);
 for(let i=2;i<=44;i++)assert.ok(xpThresholdV460(i)>xpThresholdV460(i-1),String(i));
 assert.equal(xpThresholdV460(18),20000000);
 assert.equal(xpThresholdV460(22),39000000);
 assert.ok(xpThresholdV460(22)<xpThresholdV1915(22));
 assert.equal(GALACTIC_XP_ANCHORS_V460.length,10);
});
test('migration preserves level and progress percentage for all pilot levels',()=>{
 for(let level=1;level<44;level++)for(const ratio of [0,.1,.5,.9,.999]){
  const original=xpThresholdV1915(level),next=xpThresholdV1915(level+1);
  const p={level,xp:Math.floor(original+(next-original)*ratio),xpModelV1915:true};
  assert.equal(migratePilotXpV460(p),true);
  assert.equal(p.level,level);
  assert.ok(p.xp>=xpThresholdV460(level)&&p.xp<xpThresholdV460(level+1));
  const actual=(p.xp-xpThresholdV460(level))/Math.max(1,xpThresholdV460(level+1)-xpThresholdV460(level));
  assert.ok(Math.abs(actual-ratio)<.001,'level '+level+' '+ratio);
  const after=p.xp;assert.equal(migratePilotXpV460(p),false);assert.equal(p.xp,after);
 }
});
test('endgame player experience remains beyond the top level without resets',()=>{
 const p={level:44,xp:xpThresholdV1915(44)+1000000};
 migratePilotXpV460(p);assert.equal(p.level,44);assert.ok(p.xp>=xpThresholdV460(44));
});
test('level unlocks reflect all faction progressions and PvP 15',()=>{
 for(const id of ['x1','x2','x3','x4','x5','x6','x7','x8','u1','u2','u3'])assert.ok(Number.isInteger(GALACTIC_PVE_LEVELS_V451[id]));
 assert.equal(GALACTIC_PVP_LEVEL_V451,15);
 for(const [l,needle] of [[3,'X-2'],[5,'X-3'],[7,'X-4'],[9,'X-5'],[12,'X-6'],[15,'GALÁCTICAS'],[18,'X-8'],[20,'U-1'],[21,'U-2'],[22,'U-3']])
  assert.ok(progressionMilestonesV460(l).some(x=>x.includes(needle)),String(l));
});
test('two-hour telemetry snapshot compares deltas, refuses counter resets',()=>{
 const metrics={play_seconds:0,kills:0,missions_completed:0,deaths:0,map_jumps:0,boxes:0,ore_nodes:0,credits_earned:0,credits_spent:0,stl_earned:0,stl_spent:0,xp_earned:0};
 const before={...metrics,level:1,xp:0},after={...metrics,level:8,xp:2500000,play_seconds:7200,kills:110,xp_earned:2500000};
 const result=summarizePlaytestV460(before,after);assert.equal(result.activeHours,2);assert.equal(result.killsPerHour,55);
 assert.equal(summarizePlaytestV460(after,before).ok,false);
});
test('release keeps existing worlds, raids, relays, market and saves untouched',()=>{
 const pkg=JSON.parse(read('package.json'));assert.equal(pkg.version,'47.0.0');
 assert.match(pkg.scripts.check,/v470-apply-patch/);
 const game=read('public/game.js');
 assert.match(game,/migratePlayerXpCurveV460\(\);/);
 assert.match(game,/function levelXpThreshold\(level\)\{return xpThresholdV460\(level\);\}/);
 assert.match(game,/return progressionMilestonesV460\(level\);/);
 assert.match(read('public/modules/unified-expansion-v42.js'),/renderGalacticBalanceV460\(root,tab,snapshot.isAdmin\)/);
 const sql=read('sql/STELLAR_V46_0_GALACTIC_WARFARE.sql');
 assert.match(sql,/ggAlpha/);assert.match(sql,/ggBeta/);assert.match(sql,/ggGamma/);
 assert.doesNotMatch(sql,/\b(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE|UPDATE\s+public\.game_saves|UPDATE\s+public\.profiles)\b/i);
 assert.ok(read('server/world.js').includes('sectorEntryAllowedV450'));
});
