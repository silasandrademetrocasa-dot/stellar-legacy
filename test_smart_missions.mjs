import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {NPC_TYPES,RESOURCES,MAPS} from './public/data.js';
const code=fs.readFileSync('./public/game.js','utf8');
const start=code.indexOf('const MISSION_NPCS ='),end=code.indexOf('function buildTierMissions(category,steps){',start);
assert(start>0&&end>start);
const block=code.slice(start,end);
const worldMaps=structuredClone(MAPS);for(const [id,map] of Object.entries(worldMaps))map.minLevel={x1:1,x2:3,x3:7,x4:10,b41:15,b42:15,b43:15}[id]||1;
function ctxFor(level,seed='user-a',npcSettings=null){
 const o={NPC_TYPES:structuredClone(NPC_TYPES),RESOURCES:structuredClone(RESOURCES),MAPS:structuredClone(worldMaps),progress:{profile:{level}},npcRuntimeConfig:{source:'fallback',spawns:[]},
     getUser:()=>({id:seed}),systemsMissionCategory:()=>({rewardFactor:.5,config:{}}),missionOrePool:()=>['Prometium','Endurium','Terbium'],console,Math,Date,structuredClone};
 if(npcSettings){o.npcRuntimeConfig={source:'online',spawns:npcSettings};}
 vm.createContext(o);vm.runInContext(block,o);
 return o;
}
for(const lvl of [5,6,7,9,10,14,15,25,44]){
 const c=ctxFor(lvl),missions=vm.runInContext('buildDailyMissions()',c);
 assert.equal(missions.length,3);
 for(const m of missions){
  const playable=vm.runInContext(`smartMissionPlayable(${JSON.stringify(m)},'daily')`,c);
  assert(playable,`Not playable lvl ${lvl}: ${m.id}`);
  for(const task of m.tasks){
   const maps=vm.runInContext(task.type==='kill'?`smartNpcMaps(${JSON.stringify(task.npc)})`:`smartOreMaps(${JSON.stringify(task.resource)})`,c);
   assert(maps.length,`No accessible map for ${task.npc||task.resource}`);
  }
 }
 console.log(`LV ${lvl}: `,missions.map(m=>`${m.id}:${m.tasks.map(t=>`${t.npc||t.resource} ×${t.target}`).join(', ')}`).join(' | '));
}
{
 const c=ctxFor(5,'user-b');
 const impossible={id:'daily_hunt',period:'test',taskProgress:{daily_hunt_target:27},bonus:{credits:999999,uridium:2,xp:3}};
 vm.runInContext(code.slice(code.indexOf('function activeMissionDefinition('),code.indexOf('function freshMissions(){'))+`\nfunction missionFactor(m){return m.rewardFactor||.5;}\nfunction npcKillReward(){return {credits:0,uridium:0,xp:0};}`,c);
 vm.runInContext("const a=buildLegacyDailyMissions(); globalThis.old=a.find(m=>m.id==='daily_hunt')",c);
 impossible.definition={...c.old,tasks:[{...c.old.tasks[0],npc:'sibelon',target:50}]};
 c.active=impossible;
 assert.equal(vm.runInContext('smartMissionPlayable(active.definition,\'daily\')',c),false);
 assert.equal(vm.runInContext('smartRepairDailyActive(active)',c),true);
 assert.equal(vm.runInContext('smartMissionPlayable(active.definition,\'daily\')',c),true);
 assert.equal(impossible.smartAutoReplaced,true);
 assert.equal(impossible.taskProgress.daily_hunt_target??0,0); // invalid NPC's kills not moved to a different target
 console.log('Legacy incompatible target repaired without retaining wrong kills');
}
{
 const c=ctxFor(5,'user-c',[{map_id:'x1',npc_key:'streuner',spawn_count:20},{map_id:'x3',npc_key:'saimon',spawn_count:10},{map_id:'x2',npc_key:'lordakia',spawn_count:11},{map_id:'x1',npc_key:'aiderStreuner',spawn_count:0}]);
 const missions=vm.runInContext('buildDailyMissions()',c);
 assert(missions.flatMap(m=>m.tasks).filter(t=>t.type==='kill').every(t=>['streuner','lordakia'].includes(t.npc)));
 console.log('Dynamic SQL spawns respected');
}
console.log('SMART_MISSIONS_TEST_PASS');
