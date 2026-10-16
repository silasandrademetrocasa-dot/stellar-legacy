import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {xpThresholdV1770,xpThresholdV1915,XP_ANCHORS_V1915,migratePilotXpV1915} from '../public/level-curve-v1915.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../sql/STELLAR_V19_0_15_PROGRESSAO_PILOTO_150H.sql',import.meta.url),'utf8');
const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const milestones=[{level:10,xp:10099480},{level:18,xp:49299480},{level:22,xp:158299480},{level:27,xp:397249480},{level:32,xp:741049480}];
test('a mesma curva original vale do LV1 ao LV10; passa a crescer gradualmente depois',()=>{
 for(let lv=1;lv<=10;lv++)assert.equal(xpThresholdV1915(lv),xpThresholdV1770(lv));
 for(let lv=2;lv<=44;lv++){
  assert(xpThresholdV1915(lv)>xpThresholdV1915(lv-1),`nível ${lv}`);
  assert(Number.isSafeInteger(xpThresholdV1915(lv)));
 }
});
test('todos os marcos LV10,18,22,27,32 correspondem a 4/20/45/90/150h estimadas',()=>{
 assert.deepEqual(XP_ANCHORS_V1915,milestones);
 for(const p of milestones)assert.equal(xpThresholdV1915(p.level),p.xp);
 // Nossas taxas de referência após LV10: 2.45/4.36/5.31/5.73 mi XP/h.
 const rates=[2.45e6,4.36e6,5.31e6,5.73e6],hours=[16,25,45,60];
 for(let i=1;i<milestones.length;i++){
  const delta=milestones[i].xp-milestones[i-1].xp;
  assert(Math.abs(delta/rates[i-1]-hours[i-1])<.02);
 }
 assert.equal(packageJson.version,'20.1.1');
});
test('saves novos já usam V1915, antigos migram apenas uma vez preservando lv e percentual',()=>{
 for(const level of [1,3,7,10,11,14,17,18,20,22,26,27,30,32,38,43]){
  for(const percentage of [0,.1,.5,.9,.999]){
   const from=xpThresholdV1770(level),to=xpThresholdV1770(level+1);
   const profile={level,xp:Math.round(from+(to-from)*percentage),xpModelV1770:true};
   const changed=migratePilotXpV1915(profile,44);
   assert.equal(changed,true);assert.equal(profile.level,level);
   const newBase=xpThresholdV1915(level),newNext=xpThresholdV1915(level+1);
   assert(profile.xp>=newBase&&profile.xp<newNext);
   const newRatio=(profile.xp-newBase)/(newNext-newBase);
   assert(Math.abs(newRatio-percentage)<.0001,`${level} ${percentage}: ${newRatio}`);
   assert.equal(profile.xpModelV1915,true);
   const state=structuredClone(profile);
   assert.equal(migratePilotXpV1915(state,44),false);
   assert.equal(state.xp,profile.xp);
  }
 }
});
test('nivel maximo 44 preserva a conta e o excesso acumulado; evita salto para um nivel menor',()=>{
 const profile={level:44,xp:xpThresholdV1770(44)+1234567};
 assert(migratePilotXpV1915(profile,44));
 assert.equal(profile.level,44);assert(profile.xp>=xpThresholdV1915(44));
});
test('codigo usa nova curva para nivel, HUD, arenas, save e recompensa',()=>{
 assert.match(game,/import \{ xpThresholdV1770, xpThresholdV1915, migratePilotXpV1915 \}/);
 assert.match(game,/function levelXpThreshold\(level\)\{return xpThresholdV1915\(level\);\}/);
 assert.match(game,/migratePlayerXpCurveV1770\(\);\s*migratePlayerXpCurveV1915\(\);\s*progress\.profile\.level=levelFromXp/);
 assert.match(game,/xpModelV1915:true/);
 assert.match(game,/const nextBase=xpThresholdV1770\(level\),nextTarget=xpThresholdV1770\(level\+1\)/);
 assert.match(game,/const computedArenaLevel=levelFromXp\(progress\.profile\.xp,PLAYER_MAX_LEVEL\)/);
 assert.match(game,/cloudDirty=true/);
});
test('migration SQL suporta saves antigos e novos na Arena e cla; nao modifica saves',()=>{
 for(const item of ['player_xp_threshold_v1770','player_xp_threshold_v1915','clan_check_entry_level_v19','claim_arena_daily_reward','xpModelV1915'])assert(sql.includes(item),item);
 assert.match(sql,/v_threshold:=public\.player_xp_threshold_v1915\(v_i,NOT v_new_model\)/);
 assert.match(sql,/EXECUTE replace\(fn,old_line,new_line\)/);
 assert.doesNotMatch(sql,/UPDATE public\.game_saves|UPDATE public\.profiles/i);
});
