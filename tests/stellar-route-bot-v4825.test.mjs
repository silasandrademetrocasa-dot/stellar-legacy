import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeMapLayoutV4825,routeViewV4825} from '../public/modules/route-map-layout-v4825.js';
import {chooseAutopilotAction} from '../public/modules/stellar-autopilot-v48.js';
const all=['1','2','3'].flatMap(p=>Array.from({length:8},(_,i)=>({id:`${p}-${i+1}`,x:100,y:100}))).concat(['4-1','4-2','4-3','U-1','U-2','U-3'].map(id=>({id,x:100,y:100})));
test('normal players see same layout regardless of their faction prefix',()=>{
  const a=routeMapLayoutV4825(all,{prefix:'1'}),b=routeMapLayoutV4825(all,{prefix:'3'});
  assert.equal(a.length,14);assert.equal(b.length,14);
  assert.deepEqual(a.find(n=>n.id==='1-1'),{id:'1-1',x:14,y:23});
  assert.deepEqual(b.find(n=>n.id==='3-1'),{id:'3-1',x:14,y:23});
});
test('ADM sees 30 nodes and filters without changing originals',()=>{
 const before=JSON.stringify(all);
 assert.equal(routeMapLayoutV4825(all,{admin:true}).length,30);
 assert.equal(routeMapLayoutV4825(all,{admin:true,view:'2'}).length,14);
 assert.equal(routeViewV4825('1',false),null);
 assert.equal(JSON.stringify(all),before);
});
const s={online:true,ready:true,map:'x2',player:{x:200,y:200,hp:800,maxHp:1000},base:{x:620,y:1000},ammoQuote:{catalog_key:'ammo:lcb10',price:900,currency:'credits'},ammoStock:500,credits:10000,cargoUsed:95,cargoCapacity:100,canSell:false,enemies:[],loot:[]};
test('full cargo returns X1, sale happens, and auto-route resumes original X2 target',()=>{
 assert.equal(chooseAutopilotAction(s,{map:'x2',cargoThreshold:85}).map,'x1');
 assert.equal(chooseAutopilotAction({...s,map:'x1',canSell:true},{map:'x2'}).type,'sell');
 assert.equal(chooseAutopilotAction({...s,map:'x1',cargoUsed:0,canSell:true},{map:'x2'}).map,'x2');
});
test('low ammo causes supply trip only when a real CR shop quote exists',()=>{
 assert.equal(chooseAutopilotAction({...s,ammoStock:100,cargoUsed:0,buyPermitted:false},{map:'x2',ammoMin:250}).map,'x1');
 assert.equal(chooseAutopilotAction({...s,ammoStock:100,cargoUsed:0,buyPermitted:true},{map:'x2',ammoMin:250}).type,'idle');
 assert.equal(chooseAutopilotAction({...s,ammoStock:100,cargoUsed:0,buyPermitted:false,purchaseBudgetRemaining:100},{map:'x2',ammoMin:250}).type,'idle');
});
test('real server shop route and CPU protection both remain in implementation',()=>{
 const patch=fs.readFileSync(new URL('../scripts/v4825-navigation-autopilot-patch.mjs',import.meta.url),'utf8');
 assert.match(patch,/applyAuthoritativePurchase/);
 assert.match(patch,/autoBuyEnabled/);
 assert.match(patch,/routeMapLayoutV4825/);
});

test('rocket shortage also sends bot to X1, and it stays there until the server replenishes',()=>{
  const base={...s,cargoUsed:0,ammoStock:5000,rocketStock:0,rocketQuote:{catalog_key:'rocket:r310',price:500,currency:'credits'}};
  assert.equal(chooseAutopilotAction(base,{map:'x2',rocketMin:15}).map,'x1');
  assert.equal(chooseAutopilotAction({...base,map:'x1',buyPermitted:true},{map:'x2',rocketMin:15}).type,'idle');
  assert.equal(chooseAutopilotAction({...base,map:'x1',buyPermitted:true,rocketStock:50},{map:'x2',rocketMin:15}).map,'x2');
});
