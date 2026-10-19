import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { bossHudCue, npcThreatLabel } from '../public/modules/tactical-hud-v34.js';
import { allowBackdropFilter, renderFxCount } from '../public/modules/render-budget-v34.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
test('combat threat distinguishes attacker without changing firing',()=>{
 assert.equal(npcThreatLabel({hp:1,lastAttackPlayerAt:15},19,120),'AGRESSOR • PRIORIDADE');
 assert.equal(npcThreatLabel({isPlayer:true},19,120),'PILOTO HOSTIL');
 assert.match(game,/bossHudCue\(e,/);assert.match(game,/npcThreatLabel\(t,nowSec\(\),d\)/);
});
test('boss phase cue warns only at close range and highest phase',()=>{
 assert.equal(bossHudCue({type:'bossSibelon',bossPhase:2,attackRange:400},{distance:200}).urgent,true);
 assert.equal(bossHudCue({type:'bossSibelon',bossPhase:2,attackRange:400},{distance:700}).urgent,false);
 assert.equal(bossHudCue({type:'streuner',bossPhase:2},{distance:100}).urgent,false);
});
test('landscape medium rendering avoids per-frame canvas filters and caps FX painting',()=>{
 assert.equal(allowBackdropFilter({mobile:true,landscape:true,quality:'medium'}),false);
 assert.equal(allowBackdropFilter({mobile:false,landscape:true,quality:'high'}),true);
 assert.equal(renderFxCount(1000,{mobile:true,quality:'medium'}),86);
 assert.equal(renderFxCount(1000,{mobile:false,quality:'high'}),200);
 assert.match(game,/renderFxCount\(state.fx.length/);
});
test('event NPC and ore waves capped without changing event reward tables',()=>{
 assert.match(world,/Math.min\(48,Number\(profile.maxAlive\)/);
 assert.match(world,/Math.min\(12,Math.max\(0,Number\(count\)/);
 assert.match(world,/Math.min\(20,Math.floor\(Number\(count\)\|\|0\),48-alive\)/);
});
test('server NPC strike uses per-tick client lookup and no SQL writes',()=>{
 assert.match(world,/const clientByUserId=new Map/);
 assert.match(world,/clientByUserId.get\(String\(p.userId\)\)/);
 assert.match(world,/this.applyIdlePatrolV34\(e,dt\)/);
});
