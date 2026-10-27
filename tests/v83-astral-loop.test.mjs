import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {cleanAutopilotConfig,createStellarAutopilotV48} from '../public/modules/stellar-autopilot-v48.js';
const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('V83: ciclo não é ativado por padrão; permite 10x/50x e duração ilimitada só no modo astral',()=>{
 const d=cleanAutopilotConfig();
 assert.equal(d.astralLoop,false);assert.equal(d.astralBatch,10);assert.equal(d.astralTotalBudget,50000);
 assert.equal(cleanAutopilotConfig({astralBatch:50,astralLoop:true,minutes:0,astralMaxCycles:0,astralTotalBudget:0}).minutes,0);
 assert.equal(cleanAutopilotConfig({astralBatch:500,astralLoop:false,minutes:0}).astralBatch,10);
 assert.equal(cleanAutopilotConfig({astralLoop:false,minutes:0}).minutes,5);
 assert.equal(cleanAutopilotConfig({astralLoop:true,astralTotalBudget:-50}).astralTotalBudget,0);
});

test('V83: giros oficiais de 10x/50x, o cliente não concede peças, XP nem recompensas diretamente',()=>{
 const game=read('public/game.js'),p=read('public/modules/stellar-autopilot-v48.js'),server=read('server/index.js');
 assert.match(game,/const spins=affordable>=requestedBatch\?requestedBatch:affordable>=10\?10:affordable>=5\?5:affordable>=1\?1:0/);
 assert.match(game,/runEconomyAction\('gate_spin',\{protocol:key,amount:spins,payment:'uridium'\}\)/);
 assert.match(game,/const result=await runEconomyAction\('gate_spin'/);
 assert.match(server,/\[1,5,10,50,100\]\.includes\(amount\)/);
 assert.match(p,/confirmedByPilot:true/);assert.match(p,/astralLoopSpent\+=/);
 assert.doesNotMatch(p,/\.profile\.uridium\s*\+=|\.profile\.xp\s*\+=|\.completed\s*\+\+/);
});

function mockPanel(){
 const controls=new Map();
 const entry=(selector)=>{if(!controls.has(selector))controls.set(selector,{disabled:false,value:'',checked:false,dataset:{},style:{},hidden:false,textContent:'',onclick:null,isConnected:true});return controls.get(selector);};
 const fields={map:'x1',mode:'nearest',cargoThreshold:'85',hpRetreat:'30',minutes:'0',budget:'50000',ammoMin:'250',rocketMin:'15',astralGate:'alpha',astralBudget:'50000',astralBatch:'50',astralTotalBudget:'1000',astralMaxCycles:'2'};
 const checks={boxes:false,drops:false,ores:false,autoSell:false,autoBuy:false,rockets:false,astralAssist:true,astralLoop:true};
 const inputs=[...Object.entries(fields).map(([k,v])=>({dataset:{apField:k},value:v})),...Object.entries(checks).map(([k,v])=>({dataset:{apCheck:k},checked:v}))];
 const panel={hidden:true,dataset:{},innerHTML:'',onclick:null,
  querySelector:entry,addEventListener:()=>{},querySelectorAll:q=>q==='[data-ap-field]'?inputs.filter(x=>x.dataset.apField):q==='[data-ap-check]'?inputs.filter(x=>x.dataset.apCheck):[]};
 // Ensures the select changed by renderUI participates in readConfig's collection.
 const batch=inputs.find(x=>x.dataset.apField==='astralBatch'); controls.set('[data-ap-field="astralBatch"]',batch);
 return {panel,inputs,entry};
}
async function makeHarness({built=false,stl=1500,cycles=2,maxTotal=1000,autoComplete=false}={}){
 const dom=mockPanel(),snapshot={online:true,ready:true,map:'x1',astralActive:false,jumping:false,repairRequired:false,
  atBase:true,stl,player:{x:400,y:500,hp:10000,maxHp:10000},base:{x:400,y:500},enemies:[],loot:[],bonusBoxes:[],ores:[],credits:0};
 const gate={atBase:true,built,runActive:false,completed:0,failed:0,unitCost:100};
 const log={builds:0,enters:0,stop:0,notices:[],confirmations:0,spent:0};
 let currentTime=100000000,hidden='visible';
 const OriginalDateNow=Date.now,originalDocument=globalThis.document,originalWindow=globalThis.window,originalFetch=globalThis.fetch,originalStorage=globalThis.sessionStorage;
 Date.now=()=>currentTime;
 globalThis.document={body:{appendChild:()=>{}},head:{appendChild:()=>{}},get visibilityState(){return hidden;},addEventListener:()=>{},createElement:kind=>kind==='div'?dom.panel:{style:{},appendChild:()=>{},set hidden(v){},get hidden(){return false;}}};
 globalThis.window={addEventListener:()=>{},confirm:()=>{log.confirmations++;return true;}};
 globalThis.sessionStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
 globalThis.fetch=async()=>({ok:true,json:async()=>({allowed:true})});
 const bot=createStellarAutopilotV48({credentials:()=>({accessToken:'test'}),getIdentity:()=>'account-1',getSnapshot:()=>snapshot,
  getAstralState:()=>gate,navigate:(x,y)=>{log.moves=(log.moves||0)+1;},getGraphLabel:()=>null,getGoalLabel:()=>null,getPortals:()=>[],
  onNotice:message=>log.notices.push(message),ensureCombatAmmo:()=>true,selectNpc:()=>{},stopFire:()=>{log.stop++;},
  assembleAstral:async(key,budget,cancel,report,opts)=>{
   log.builds++;assert.equal(opts.batch,50);assert.equal(opts.confirmedByPilot,true);
   if(cancel())return {built:false,spent:0};
   assert.ok(budget<=Math.min(50000,Math.max(0,maxTotal-log.spent)),'Cumulative hard cap');
   gate.built=true;log.spent+=500;snapshot.stl-=500;report('Materializador concluído');return {built:true,spent:500};
  },
  enterAstral:async key=>{log.enters++;assert.equal(key,'alpha');snapshot.map='ggAlpha';snapshot.astralActive=true;gate.runActive=true;return {entered:true};}
 });
 await bot.refreshAccess();
 const batch=dom.inputs.find(x=>x.dataset.apField==='astralBatch');batch.value='50';
 const max=dom.inputs.find(x=>x.dataset.apField==='astralMaxCycles');max.value=String(cycles);
 const total=dom.inputs.find(x=>x.dataset.apField==='astralTotalBudget');total.value=String(maxTotal);
 const advance=async(ms=450)=>{currentTime+=ms;bot.tick();await new Promise(setImmediate);};
 const complete=async()=>{gate.completed++;gate.built=false;gate.runActive=false;snapshot.astralActive=false;snapshot.map='ggAlpha';await advance();snapshot.map='x1';await advance(3000);};
 const cleanup=()=>{bot.stop('end-test');Date.now=OriginalDateNow;globalThis.document=originalDocument;globalThis.window=originalWindow;globalThis.fetch=originalFetch;globalThis.sessionStorage=originalStorage;};
 return {bot,dom,gate,snapshot,log,advance,complete,cleanup,setHidden:value=>hidden=value};
}

test('V83: portal já montado entra sem girar, só uma entrada por transição; termina após 2 conclusões',async()=>{
 const h=await makeHarness({built:true,cycles:2,maxTotal:1000});
 try{
  await h.dom.entry('[data-ap-astral-loop-start]').onclick();
  assert.equal(h.log.confirmations,1);assert.equal(h.bot.active,true);
  await h.advance();assert.equal(h.log.builds,0);assert.equal(h.log.enters,1);
  await h.advance();assert.equal(h.log.enters,1);
  await h.complete();await h.advance();assert.equal(h.log.builds,1);assert.equal(h.log.enters,2);
  await h.complete();assert.equal(h.bot.active,false,'Parar após alcançar 2 conclusões reais');
  assert.equal(h.log.enters,2);assert.equal(h.log.builds,1);
 }finally{h.cleanup();}
});

test('V83: teto total interrompe repetição sem segunda compra, mesmo com STL na carteira',async()=>{
 const h=await makeHarness({built:false,cycles:0,maxTotal:500,stl:3000});
 try{
  await h.dom.entry('[data-ap-astral-loop-start]').onclick();await h.advance();
  assert.equal(h.log.builds,1);assert.equal(h.log.enters,1);
  await h.complete();await h.advance();
  assert.equal(h.bot.active,false);assert.equal(h.log.builds,1);
  assert.match(h.dom.entry('[data-ap-status]').textContent,/Limite total/);
 }finally{h.cleanup();}
});

test('V83: pausa manual bloqueia montagem subsequente e tela oculta interrompe o ciclo',async()=>{
 const h=await makeHarness({built:true});
 try{
  await h.dom.entry('[data-ap-astral-loop-start]').onclick();await h.advance();
  h.bot.stop('Piloto parou');await h.complete();assert.equal(h.log.builds,0);assert.equal(h.bot.active,false);
 }finally{h.cleanup();}
});

test('V83: falha confirmada pelo jogo interrompe novo farm sem esconder derrota',async()=>{
 const h=await makeHarness({built:true});
 try{
  await h.dom.entry('[data-ap-astral-loop-start]').onclick();await h.advance();
  h.gate.failed++;h.snapshot.astralActive=false;h.snapshot.map='x1';await h.advance();
  assert.equal(h.bot.active,false);assert.match(h.dom.entry('[data-ap-status]').textContent,/Portal perdido/);
 }finally{h.cleanup();}
});

test('V83: montagem real usa lote de 50 no servidor e contabiliza custo retornado pelo backend',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=read('public/game.js');let part=source.slice(source.indexOf('  assembleAstral:async('),source.indexOf('  enterAstral:async ')).trim();
 assert.ok(part.startsWith('assembleAstral:async('));part=part.replace(/,\s*$/,'');
 const progress={mapId:'x1',profile:{uridium:15000},galaxyGate:{selected:'alpha',alpha:{built:false,pieces:[]}}};
 const sent=[];let confirmCount=0,saves=0;
 const context={
  authenticated:true,progress,getUser:()=>({id:'a'}),isGalaxyGateMap:()=>false,isAtTrader:()=>true,
  normalizeGalaxyGateState:()=>{},alphaSpinUnitCost:()=>100,fmt:String,renderGalaxyGate:()=>{},saveGame:()=>{saves++;},
  stellarConfirmV4776:async()=>{confirmCount++;return true;},GALAXY_GATE_DEFS:{alpha:{pieces:34,label:'AURORA'}},
  runEconomyAction:async(action,payload)=>{sent.push(payload.amount);assert.equal(action,'gate_spin');assert.equal(payload.payment,'uridium');
   progress.profile.uridium-=payload.amount*100;
   progress.galaxyGate.alpha.pieces=Array.from({length:34},(_,i)=>i+1);progress.galaxyGate.alpha.built=true;
   return {info:{cost:payload.amount*100,results:Array.from({length:payload.amount},()=>({kind:'piece'}))}};
  }
 };
 runInNewContext('this.assemble='+part.slice('assembleAstral:'.length),context);
 const result=await context.assemble('alpha',10000,()=>false,()=>{},{batch:50,confirmedByPilot:true});
 assert.equal(result.built,true);assert.equal(result.spent,5000);assert.deepEqual(sent,[50]);
 assert.equal(confirmCount,0);assert.equal(saves,1);
 assert.equal(progress.profile.uridium,10000);
});

test('V83: lote de 10 usa 10x sem tentar 50x, exige confirmação na montagem manual',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=read('public/game.js'),start=source.indexOf('  assembleAstral:async('),end=source.indexOf('  enterAstral:async ',start);
 let part=source.slice(start,end).trim().replace(/,\s*$/,'');
 const progress={mapId:'x1',profile:{uridium:9000},galaxyGate:{selected:'alpha',alpha:{built:false,pieces:[]}}};
 const sent=[];let confirmed=0;
 const ctx={authenticated:true,progress,getUser:()=>({id:'a'}),isGalaxyGateMap:()=>false,isAtTrader:()=>true,
  normalizeGalaxyGateState:()=>{},alphaSpinUnitCost:()=>100,fmt:String,renderGalaxyGate:()=>{},saveGame:()=>{},
  stellarConfirmV4776:async()=>{confirmed++;return true;},GALAXY_GATE_DEFS:{alpha:{pieces:34,label:'AURORA'}},
  runEconomyAction:async(action,payload)=>{sent.push(payload.amount);progress.profile.uridium-=payload.amount*100;
   return {info:{cost:payload.amount*100,results:[{kind:'ammo'}]}};}
 };
 runInNewContext('this.assemble='+part.slice('assembleAstral:'.length),ctx);
 const result=await ctx.assemble('alpha',2500,()=>false,()=>{},{batch:10});
 assert.equal(result.built,false);assert.equal(result.spent,2500);assert.deepEqual(sent,[10,10,5]);assert.equal(confirmed,1);
});
