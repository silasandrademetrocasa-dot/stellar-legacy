import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMBAT_REBORN_FEATURES,rebornFxBudgetV470,npcTacticalDriftV470,
  portalSignatureV470,createCombatRebornV470,drawPortalSignatureV470} from '../public/modules/combat-reborn-v470.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('V47 six functional phases have expected independent features',()=>{
  for(const k of ['impact-cues','explosion-rings','boss-telegraphs','npc-flanking','portal-signatures','mobile-fx-budget','player-engine-audio'])assert.ok(COMBAT_REBORN_FEATURES.includes(k),k);
});
test('V47 mobile FX budget is bounded and less than desktop',()=>{
  assert.equal(rebornFxBudgetV470({enabled:false}),0);
  assert.equal(rebornFxBudgetV470({quality:'low',mobile:true}),3);
  assert.ok(rebornFxBudgetV470({quality:'high',mobile:true})<rebornFxBudgetV470({quality:'high',mobile:false}));
});
test('V47 elite flanking is limited, does not touch shared NPCs or safe zones',()=>{
  const elite={id:'boss_01',type:'boss_gamma',speed:400,aggroRange:1000};
  const cfg={dx:350,dy:260,d:460,dt:.016,now:123,safe:false};
  const drift=npcTacticalDriftV470(elite,cfg);
  assert.ok(Number.isFinite(drift.x)&&Number.isFinite(drift.y));
  assert.ok(Math.hypot(drift.x,drift.y)<=1);
  assert.deepEqual(npcTacticalDriftV470({...elite,sharedWorld:true},cfg),{x:0,y:0});
  assert.deepEqual(npcTacticalDriftV470(elite,{...cfg,safe:true}),{x:0,y:0});
  assert.deepEqual(npcTacticalDriftV470({...elite,type:'streuner'},cfg),{x:0,y:0});
  assert.deepEqual(npcTacticalDriftV470(elite,{...cfg,d:1400}),{x:0,y:0});
});
test('V47 portal signatures separate battle, astral and normal routes',()=>{
  assert.equal(portalSignatureV470({targetLabel:'4-1'}),'pvp');
  assert.equal(portalSignatureV470({targetLabel:'NEXUS'}),'astral');
  assert.equal(portalSignatureV470({targetLabel:'1-4'}),'normal');
  assert.equal(portalSignatureV470({targetLabel:'U-2'}),'normal');
});
test('V47 effects do not grow unbounded and respect cooldown/disable',()=>{
  let now=1000;const reborn=createCombatRebornV470({clock:()=>now});
  assert.equal(reborn.emit('hit',100,200,{quality:'low',mobile:true}),true);
  assert.equal(reborn.emit('hit',100,200,{quality:'low',mobile:true}),false);
  now+=150;
  for(let i=0;i<50;i++){now+=160;reborn.emit('hit',100+i*150,200,{quality:'low',mobile:true});}
  assert.ok(reborn.count()<=3);
  assert.equal(reborn.emit('boss',0,0,{enabled:false}),false);
  reborn.tick(1.5);assert.equal(reborn.count(),0);
  reborn.clear();assert.equal(reborn.count(),0);
});
test('V47 draw honors disabled graphics, and canvas state stays balanced',()=>{
  const calls=[];const c={save:()=>calls.push('save'),restore:()=>calls.push('restore'),translate:()=>{},beginPath:()=>{},stroke:()=>{},arc:()=>{},ellipse:()=>{},moveTo:()=>{},lineTo:()=>{},closePath:()=>{},setLineDash:()=>{}};
  let now=0;const reborn=createCombatRebornV470({clock:()=>now});
  reborn.emit('blast',200,300,{quality:'high'});
  reborn.draw(c,(x,y)=>({x,y}),{quality:'high'});
  assert.deepEqual(calls,['save','restore']);
  calls.length=0;reborn.draw(c,(x,y)=>({x,y}),{enabled:false});assert.equal(calls.length,0);
  drawPortalSignatureV470(c,{targetLabel:'4-1'},{quality:'low'});
  assert.deepEqual(calls,['save','restore']);
});
test('V47 patch integrates visuals, sound, safety and settings without touching economic logic',()=>{
  const g=read('public/game.js'),h=read('public/index.html'),s=read('public/modules/stellar-audio-v462.js');
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'47.7.2');assert.match(pkg.scripts.check,/v4772-apply-patch/);
  for(const item of ['createCombatRebornV470','npcTacticalDriftV470','drawPortalSignatureV470','rebornFx.tick(dt)','rebornFx.draw(ctx,screenPos','playWeaponSfxV470','shieldBreak','portalPvp','portalAstral'])assert.ok(g.includes(item),item);
  assert.match(h,/id="combatRebornVisualToggle"/);
  assert.ok(h.includes('/game.js?v='+pkg.version));
  for(const item of ["'engine'","'laserHeavy'","'portalPvp'","'portalAstral'","'shieldBreak'"])assert.ok(s.includes(item),item);
  const patch=read('scripts/v4772-apply-patch.mjs');
  assert.doesNotMatch(patch,/(?:DELETE\s+FROM|DROP\s+TABLE|TRUNCATE\s+TABLE|update\s+public\.game_saves)/i);
  assert.ok(patch.includes('v4772-apply-patch'));
});
test('V47 enforces authoritative shared-universe and PvP target guards',()=>{
  const g=read('public/game.js');
  assert.match(g,/sharedUniverse\.damageNpc\(/);
  assert.match(g,/queuePvpShot\(/);
  assert.match(g,/pvpTargetAllowed\(/);
  assert.match(g,/if\(e\.hp<=0\|\|sharedMode&&e\.sharedWorld\)continue;/);
});
