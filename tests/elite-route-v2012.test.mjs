import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECRUIT_LEVEL_BONUSES_V2012,ELITE_ROUTE_TARGETS_V2012,applyRecruitBonusV2012,novaTierPriceV2012,eliteRouteSnapshotV2012,freshEliteRouteJournalV2012} from '../public/progression-plan-v2012.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
function reward(){return {credits:0,uridium:0,ammo:{lcb10:100},rockets:{},items:[],ships:[],repairBonus:0};}
test('recompensas V20.1.2 têm limites e estão vinculadas a níveis reais',()=>{
  const levels=[3,5,7,10,12,15,18,22];
  assert.deepEqual(Object.keys(RECRUIT_LEVEL_BONUSES_V2012).map(Number),levels);
  const sum=levels.reduce((a,l)=>{const r=applyRecruitBonusV2012(reward(),l);a.credits+=r.credits;a.uridium+=r.uridium;return a;},{credits:0,uridium:0});
  assert.deepEqual(sum,{credits:49_000_000,uridium:50_000});
  assert.equal(applyRecruitBonusV2012(reward(),2).credits,0);
  assert.equal(applyRecruitBonusV2012(reward(),23).uridium,0);
  assert.equal(applyRecruitBonusV2012(reward(),5).ammo.mcb25,2000);
  assert.deepEqual(applyRecruitBonusV2012(reward(),10).items,['lf2']);
  assert(!Object.values(RECRUIT_LEVEL_BONUSES_V2012).some(x=>x.drones||x.ships||x.items?.includes('iris')));
});
test('recompensa única não quebra o sistema existente de claims',()=>{
  assert.match(game,/return applyRecruitBonusV2012\(r,level\);/);
  assert.match(game,/if\(progress\.levelRewards\.claimed\[level\]\)/);
  assert.match(game,/progress\.levelRewards\.claimed\[level\]=Date\.now\(\)/);
  assert.match(game,/if\(progress\.levelRewards\.claimed\[level\]\)continue/);
  assert.match(game,/progressionRouteV2012:freshEliteRouteJournalV2012\(1\)/);
  assert.match(game,/progress\.progressionRouteV2012 \|\|= freshEliteRouteJournalV2012\(progress\.profile\.level\)/);
});
test('preços Nova permanecem históricos; Premium desconta 5%, sem Nova gratuita',()=>{
  const base=Array.from({length:8},(_,i)=>novaTierPriceV2012(15000,2,i+1,false));
  assert.deepEqual(base.slice(0,4),[15000,30000,60000,120000]);
  assert.equal(base.reduce((a,b)=>a+b,0),3_825_000);
  assert.equal(base.slice(0,4).reduce((a,b)=>a+b,0),225000);
  assert.equal(novaTierPriceV2012(15000,2,8,true),1_824_000);
  assert.match(server,/state\.dronePurchasesV1829\[String\(row\.ref_id\|\|''\)\]=droneTier\+1/);
});
test('build Full Elite requer nave, 8 Nova, equipamentos colocados e extras',()=>{
 const t=ELITE_ROUTE_TARGETS_V2012;
 const state={activeShipId:'goliath',ownedShips:['phoenix','nostromo','goliath'],inventory:{},
 shipLoadout:{lasers:Array(15).fill('lf4'),generators:[...Array(12).fill('sg3nb02'),...Array(6).fill('g3n7900')],extras:[...t.extras,null]},
 drones:Array.from({length:8},()=>({type:'iris',slots:['lf4','lf4']}))};
 const good=eliteRouteSnapshotV2012(state);
 assert.equal(good.fullElite,true);assert.equal(good.fourNova,true);assert.equal(good.firstCommon,true);
 assert.equal(good.progress,62);assert.equal(good.progressMax,62);
 state.drones[0].slots[0]='lf3';assert.equal(eliteRouteSnapshotV2012(state).fullElite,false);
 state.drones[0].slots[0]='lf4';state.shipLoadout.extras[0]=null;assert.equal(eliteRouteSnapshotV2012(state).fullElite,false);
 state.shipLoadout.extras[0]='repElite';state.activeShipId='nostromo';assert.equal(eliteRouteSnapshotV2012(state).fullElite,false);
 state.activeShipId='goliath';state.drones[0].type='flax';assert.equal(eliteRouteSnapshotV2012(state).fullElite,false);
});
test('telemetria mede apenas tempo ativo visível e não inventa histórico',()=>{
 assert.deepEqual(freshEliteRouteJournalV2012(1),{version:1,trackedFromLevel:1,activeSeconds:0,milestones:{},lastSavedMinute:0});
 assert.equal(freshEliteRouteJournalV2012(25).trackedFromLevel,25);
 assert.match(game,/document\.visibilityState!=='visible'/);
 assert.match(game,/Math\.min\(\.25,Number\(dt\)\|\|0\)/);
 assert.match(game,/lastEliteRouteCheckV2012<5000/);
 assert.match(game,/r\.lastSavedMinute=minute;changed=true/);
 assert.match(game,/eliteRouteTrackV2012\(dt\)/);
 assert.match(game,/Horas antigas não são estimadas como reais/);
});
test('UI mostra os três gargalos e a meta, sem alterar curva e PvP',()=>{
 for(const x of ['ROTA FULL ELITE','NAVE COMUM FORTE','PRIMEIROS 4 NOVA','FULL ELITE','350','450','ARC-4','VSH-5','THR-6'])assert(game.includes(x),x);
 assert(html.includes('/game.js?v=20.1.3'));
 assert.equal(JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version,'20.1.3');
 assert.match(game,/function levelXpThreshold\(level\)\{return xpThresholdV1915\(level\);\}/);
 assert.match(game,/canvas.addEventListener\('pointerdown',pointerAction\)/);
});
