import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseAutopilotAction,findAutopilotPortalPath,cleanAutopilotConfig} from '../public/modules/stellar-autopilot-v48.js';
const p=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const player={x:200,y:200,hp:800,maxHp:1000};
const base={x:620,y:1000};
const snapshot={online:true,ready:true,jumping:false,map:'x2',player,base,atBase:false,canSell:false,cargoUsed:10,cargoCapacity:100,cargoFree:90,enemies:[],loot:[],ores:[],bonusBoxes:[],timeSec:10};

test('config whitelist restricts maps, target keys, time and spend',()=>{
 const c=cleanAutopilotConfig({map:'b41',minutes:9000,budget:-5,npcTypes:['mordon','mordon','evil;DROP']});
 assert.equal(c.map,'x1');assert.equal(c.minutes,360);assert.equal(c.budget,0);assert.deepEqual(c.npcTypes,['mordon']);
});
test('does not farm without active authenticated universe',()=>{
 assert.equal(chooseAutopilotAction({...snapshot,online:false},{map:'x2'}).type,'idle');
 assert.equal(chooseAutopilotAction({...snapshot,map:'b41'},{map:'x2'}).type,'pause');
 assert.equal(chooseAutopilotAction({...snapshot,repairRequired:true},{map:'x2'}).type,'pause');
});
test('retreat and trading have priority over attacking',()=>{
 const danger={...snapshot,player:{...player,hp:150},enemies:[{id:'n1',type:'mordon',x:270,y:200,hp:100}]};
 assert.deepEqual(chooseAutopilotAction(danger,{map:'x2'}).type,'route');
 assert.equal(chooseAutopilotAction({...snapshot,cargoUsed:94},{map:'x2',cargoThreshold:85}).map,'x1');
 assert.equal(chooseAutopilotAction({...snapshot,map:'x1',cargoUsed:94,canSell:true},{map:'x2'}).type,'sell');
});
test('collects real map drops before hunting but never invents awards',()=>{
 const s={...snapshot,enemies:[{id:'n1',type:'mordon',name:'Mordon',x:500,y:500,hp:100}],bonusBoxes:[{id:'b1',x:240,y:205}]};
 assert.equal(chooseAutopilotAction(s,{map:'x2'}).type,'move');
 assert.equal(chooseAutopilotAction({...s,bonusBoxes:[]},{map:'x2'}).type,'hunt');
 assert.equal(chooseAutopilotAction({...s,bonusBoxes:[],enemies:[{...s.enemies[0],type:'bossSibelon'}]},{map:'x2'}).type,'idle');
});
test('selected NPC types only, no pilots and no warbots',()=>{
 const enemies=[{id:'p',isPlayer:true,type:'mordon',hp:10,x:203,y:201},{id:'w',warBot:true,type:'mordon',hp:10,x:204,y:202},{id:'a',type:'streuner',hp:10,x:300,y:300},{id:'b',type:'mordon',hp:10,x:350,y:200}];
 assert.equal(chooseAutopilotAction({...snapshot,enemies},{map:'x2',npcTypes:['mordon']}).targetId,'b');
});
test('portal route uses existing graph edges and cannot bypass access',()=>{
 const edges={'X-1':[{targetLabel:'X-2',x:1,y:2}],'X-2':[{targetLabel:'X-3',x:3,y:4}],'X-3':[]};
 assert.deepEqual(findAutopilotPortalPath('X-1','X-3',x=>edges[x]).map(x=>x.targetLabel),['X-2','X-3']);
 assert.equal(findAutopilotPortalPath('X-1','X-3',x=>edges[x],x=>x!=='X-2'),null);
});
test('admin grants require server status and real backend; no Premium unlock',()=>{
 const server=p('scripts/v48-autopilot-patch.mjs');
 assert.match(server,/\/api\/admin\/autopilot\/v48\/grants/);
 assert.match(server,/admin_status_v1763/);
 assert.match(server,/source:'admin'/);
 assert.doesNotMatch(server,/\/api\/premium\/autopilot\/purchase/);
});
