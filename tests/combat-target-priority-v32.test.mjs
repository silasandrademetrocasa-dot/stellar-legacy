import test from 'node:test';
import assert from 'node:assert/strict';
import {rankVisibleNpcTargets} from '../public/modules/combat-target-priority.js';
const e=(id,x,y,extra={})=>({id,x,y,hp:100,...extra});
test('targeting: threat first, then proximity, stable ID ties',()=>{
 const ranked=rankVisibleNpcTargets([e('z',10,0),e('a',10,0),e('threat',120,0,{lastAttackPlayerAt:99})],{x:0,y:0,range:200,now:100});
 assert.deepEqual(ranked.map(x=>x.id),['threat','a','z']);
});
test('targeting excludes pilots, dead targets, invisible NPCs, nonfinite positions and out of range',()=>{
 const ranked=rankVisibleNpcTargets([e('ok',8,0),e('pilot',2,0,{isPlayer:true}),e('dead',1,0,{hp:0}),e('far',200,0),e('nan',NaN,0),e('hidden',4,0)],{range:100,visible:e=>e.id!=='hidden'});
 assert.deepEqual(ranked.map(x=>x.id),['ok']);
});
test('targeting excludes previous target and avoids mutating input',()=>{
 const list=[e('b',20,0),e('a',10,0)];
 const ids=rankVisibleNpcTargets(list,{range:100,excludeId:'a'}).map(x=>x.id);
 assert.deepEqual(ids,['b']);assert.deepEqual(list.map(x=>x.id),['b','a']);
});
