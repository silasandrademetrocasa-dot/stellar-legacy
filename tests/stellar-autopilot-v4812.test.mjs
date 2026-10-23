import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chooseAutopilotAction} from '../public/modules/stellar-autopilot-v48.js';
const pilot={x:200,y:200,hp:950,maxHp:1000};
const npc={id:'npcA',type:'streuner',name:'Streuner',x:350,y:200,hp:100,shield:0};
const base={online:true,ready:true,jumping:false,map:'x1',player:pilot,base:{x:0,y:0},canSell:false,atBase:false,
 cargoUsed:3,cargoCapacity:100,cargoFree:97,ammoStock:300,buyPermitted:true,
 laserRange:800,rocketRange:800,rocketReady:true,enemies:[npc],loot:[],bonusBoxes:[],ores:[],timeSec:100};
const cfg={map:'x1'};
test('NPC em alcance tem prioridade sobre BOX bônus mais próxima',()=>{
 const a=chooseAutopilotAction({...base,bonusBoxes:[{id:'bonus',x:201,y:201}]},cfg);
 assert.equal(a.type,'hunt');assert.equal(a.targetId,'npcA');
});
test('drop real continua sendo coletado enquanto NPC em alcance segue como alvo de tiro',()=>{
 const a=chooseAutopilotAction({...base,loot:[{id:'dropA',x:220,y:220,expiresAt:120}]},cfg);
 assert.equal(a.type,'move');assert.equal(a.targetId,'dropA');assert.equal(a.combatTargetId,'npcA');
});
test('loot fora do alcance de tiro é coletado sem tentar disparar',()=>{
 const farNpc={...npc,x:1500,y:200};
 const a=chooseAutopilotAction({...base,enemies:[farNpc],loot:[{id:'dropA',x:220,y:220}]},cfg);
 assert.equal(a.type,'move');assert.equal(a.combatTargetId,null);
});
test('loot expirada não é coletada',()=>{
 const a=chooseAutopilotAction({...base,loot:[{id:'dropA',x:220,y:220,expiresAt:90}]},cfg);
 assert.equal(a.type,'hunt');
});
test('sem NPC/drop, BOX bônus continua coletável',()=>{
 const a=chooseAutopilotAction({...base,enemies:[],bonusBoxes:[{id:'bonus',x:220,y:230}]},cfg);
 assert.equal(a.type,'move');assert.equal(a.targetId,'bonus');
});
test('sem NPC/drop, mineração opcional continua funcionando',()=>{
 const a=chooseAutopilotAction({...base,enemies:[],ores:[{id:'ore',x:220,y:230}]},{...cfg,ores:true});
 assert.equal(a.type,'move');assert.equal(a.targetId,'ore');
});
test('restrições de segurança continuam dominando qualquer ataque',()=>{
 const a=chooseAutopilotAction({...base,player:{...pilot,hp:100},loot:[{id:'dropA',x:220,y:220}]},cfg);
 assert.equal(a.type,'move');assert.notEqual(a.combatTargetId,'npcA');
});
test('reabertura após expirar permissão exige nova consulta assíncrona',()=>{
 const source=fs.readFileSync(new URL('../public/modules/stellar-autopilot-v48.js',import.meta.url),'utf8');
 assert.match(source,/async function open\(\)/);
 assert.match(source,/if\(!accessReady\(\)\)\{[\s\S]*?const accepted=await refreshAccess\(\)/);
 assert.match(source,/if\(accessPromise\)return accessPromise/);
 assert.match(source,/const collectingWhileFiring=action\.type==='move'&&!!action\.combatTargetId/);
 assert.match(source,/selectNpc\(enemy,true\)/);
});
