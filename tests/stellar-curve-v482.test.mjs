import test from 'node:test';
import assert from 'node:assert/strict';
import {xpThresholdV482,xpRequiredForNextLevelV482,migratePilotXpV482,pilotXpProgressV482,PILOT_LEVEL_MAX_V482} from '../public/level-curve-v482.js';
import {xpThresholdV460} from '../public/level-curve-v460.js';
const acc=[0,10000,30000,70000,150000,310000,630000,1270000,2170000,3420000,5120000,7320000,10120000,13620000,17920000,23120000,29320000,36620000,45120000,54920000];
test('curva aprovada LV1-LV20: incremento dobrado inicialmente e suavizado após LV7',()=>{
 assert.equal(PILOT_LEVEL_MAX_V482,44);
 for(let lv=1;lv<=20;lv++)assert.equal(xpThresholdV482(lv),acc[lv-1],`XP LV${lv}`);
 assert.deepEqual([1,2,3,4,5,6,7].map(xpRequiredForNextLevelV482),[10000,20000,40000,80000,160000,320000,640000]);
});
test('LV21..LV44 cresce estritamente sem explosão de duplicação eterna',()=>{
 let prev=xpThresholdV482(20);
 for(let lv=21;lv<=44;lv++){const next=xpThresholdV482(lv);assert.ok(next>prev,`LV ${lv}`);prev=next;}
 assert.ok(xpThresholdV482(44)<1_500_000_000);
});
test('migração preserva todos os 44 níveis e progresso relativo, sem saltos',()=>{
 for(let level=1;level<=44;level++){
  const oldBase=xpThresholdV460(level),oldNext=xpThresholdV460(Math.min(44,level+1));
  for(const frac of [0,0.25,0.5,0.85,0.999]){
   const xp=level===44?oldBase:Math.floor(oldBase+frac*(oldNext-oldBase));
   const pilot={level,xp,credits:43210,uridium:1234,levelRewards:{claimed:{2:true}},battlePass:{points:700}};
   assert.equal(migratePilotXpV482(pilot),true,`migrated LV ${level}`);
   assert.equal(pilot.level,level);assert.equal(pilot.credits,43210);assert.equal(pilot.uridium,1234);
   assert.equal(pilot.levelRewards.claimed[2],true);assert.equal(pilot.battlePass.points,700);
   assert.ok(pilot.xp>=xpThresholdV482(level));
   if(level<44)assert.ok(pilot.xp<xpThresholdV482(level+1));
   assert.equal(migratePilotXpV482(pilot),false,'idempotent');
  }
 }
});
test('progresso numérico mostra total acumulado/para próximo e percentual',()=>{
 const s=pilotXpProgressV482(2,27000);
 assert.equal(s.next,30000);assert.equal(s.earned,17000);assert.equal(s.needed,20000);assert.equal(s.remaining,3000);assert.equal(s.percent,85);
 const max=pilotXpProgressV482(44,xpThresholdV482(44));assert.equal(max.maxed,true);assert.equal(max.percent,100);
});
