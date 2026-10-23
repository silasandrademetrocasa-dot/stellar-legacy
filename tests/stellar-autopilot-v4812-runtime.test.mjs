import test from 'node:test';
import assert from 'node:assert/strict';
import {createStellarAutopilotV48} from '../public/modules/stellar-autopilot-v48.js';

function mockDocument(){
  const elements=[];
  function createElement(tag){
    const q=new Map();
    return {tag,hidden:false,style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,
      appendChild(){},addEventListener(){},
      querySelector(selector){if(!q.has(selector))q.set(selector,createElement('stub'));return q.get(selector);},
      querySelectorAll(){return [];}};
  }
  return {elements,body:{appendChild(x){elements.push(x);}},head:{appendChild(){}},createElement};
}
test('após pausar e fechar, reabre mesmo depois que a autorização venceu',async()=>{
  const previousDate=Date.now,previousFetch=globalThis.fetch,previousDocument=globalThis.document;
  let clock=1700000000000,requests=0;
  const document=mockDocument();
  Date.now=()=>clock;
  globalThis.document=document;
  globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({allowed:true,is_admin:true})};};
  try{
    let moving=[],firing=[],stops=0;
    const npc={id:'npc-1',x:240,y:200,hp:900,type:'streuner'};
    const snap={online:true,ready:true,jumping:false,map:'x1',base:{x:0,y:0},atBase:true,
      player:{x:200,y:200,hp:1000,maxHp:1000},cargoUsed:2,cargoCapacity:100,cargoFree:90,
      ammoStock:1000,buyPermitted:true,rocketReady:false,laserRange:800,rocketRange:800,
      loot:[{id:'drop-1',x:210,y:220}],enemies:[npc],bonusBoxes:[{id:'bonus-1',x:201,y:201}],timeSec:100};
    const ctrl=createStellarAutopilotV48({credentials:()=>({accessToken:'testing'}),getIdentity:()=> 'pilot-1',getSnapshot:()=>snap,
      npcTypes:[{id:'streuner',label:'Streuner'}],getPortals:()=>[],getGraphLabel:()=> 'X-1',getGoalLabel:()=> 'X-1',
      mayTravel:()=>true,navigate:(x,y)=>{moving.push({x,y})},jumpPortal:async()=>{},
      selectNpc:(enemy,fire)=>{firing.push({id:enemy.id,fire})},stopFire:()=>stops++,fireRocket:()=>{},
      sellCargo:async()=>{},buyPackage:async()=>false});
    assert.equal(await ctrl.refreshAccess(),true);
    await ctrl.open();
    const panel=document.elements.find(x=>x.id==='autopilotPanelV48');
    assert.equal(panel.hidden,false);
    ctrl.start();
    clock+=500;ctrl.tick();
    assert.equal(moving.at(-1)?.x,210,'drop should be collected');
    assert.deepEqual(firing.at(-1),{id:'npc-1',fire:true},'NPC must keep being attacked during loot');
    assert.equal(stops,0,'must not stop fire for loot');
    ctrl.stop('Pausa manual');
    panel.querySelector('[data-ap-close]').onclick();
    assert.equal(panel.hidden,true);
    clock+=80000; // Expires 75s authorization
    await ctrl.open();
    assert.equal(panel.hidden,false);
    assert.equal(requests,2,'reopened tab revalidates backend access');
  }finally{
    Date.now=previousDate;
    if(previousFetch===undefined)delete globalThis.fetch;else globalThis.fetch=previousFetch;
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  }
});
