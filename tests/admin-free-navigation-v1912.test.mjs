import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MAPS,FACTIONS} from '../public/data.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const wsSource=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
const sourceStart=game.indexOf('function graphDestination(label){');
const sourceEnd=game.indexOf('function mapArtFor(label){',sourceStart);
assert(sourceStart>=0&&sourceEnd>sourceStart);
function clientSandbox(isAdmin,level=1){
 const context={
   authenticated:true,adminRuntime:{enabled:isAdmin},
   progress:{profile:{faction:'earth',level},mapId:'x1',territoryFaction:'earth',galaxyGate:{jumpBonus:0}},
   FACTIONS,MAPS,
   worldRuntimeConfig:{sectorDestinations:new Map(),sectorInfo:new Map()},
   factionFromPrefix:(prefix)=>Object.values(FACTIONS).find(f=>String(f.prefix)===String(prefix))||null,
 };
 vm.createContext(context);
 vm.runInContext('function isVerifiedAdminNavigator(){return !!authenticated && adminRuntime.enabled===true;}\n'+game.slice(sourceStart,sourceEnd),context);
 return context;
}
for(const id of ['2-8','3-5','4-2','1-8']){
 test(`ADM acessa ${id} com nível 1`,()=>{
  const c=clientSandbox(true);
  const r=c.canTravelGraphLabel(id);
  assert.equal(r.ok,true,r.reason);
 });
}
test('jogador comum não acessa mapas territoriais estrangeiros mas entra em Battle de outra facção no nível exigido',()=>{
 const c=clientSandbox(false,99);
 assert.equal(c.canTravelGraphLabel('2-8').ok,false);
 assert.equal(c.canTravelGraphLabel('4-2').ok,true);
});
test('jogador comum respeita nível de setor próprio',()=>{
 const c=clientSandbox(false,1);
 assert.equal(c.canTravelGraphLabel('1-8').ok,false);
 c.progress.profile.level=32;
 assert.equal(c.canTravelGraphLabel('1-8').ok,true);
});
test('ADM exige status autenticado mesmo com flag local',()=>{
 const c=clientSandbox(true,1);
 c.authenticated=false;
 assert.equal(c.canTravelGraphLabel('3-8').ok,false);
});
test('mapa visual dá salto livre sem consumo de bônus e mostra setores estrangeiros',()=>{
 const c=clientSandbox(true);
 let fired=null,saved=0;
 c.MAP_GRAPH_NODES=[{id:'1-1',x:10,y:10},{id:'2-8',x:15,y:15}];
 c.MAP_GRAPH_LINKS=[['1-1','2-8']];
 const targets=[];
 c.ui={mapNetwork:{innerHTML:'',querySelectorAll(){return targets; }},mapModal:{classList:{add(){}}}};
 c.normalizeGalaxyGateState=()=>{};c.currentGraphMapLabel=()=> '1-1';
 c.mapArtFor=()=>'none';c.fmt=(x)=>String(x);
 c.showToast=(reason)=>{throw Error(reason)};c.saveGame=()=>saved++;c.renderGalaxyGate=()=>{throw Error('No bonus should be charged');};
 c.runMapTransition=(...args)=>{fired=args;};
 // A visual node is present, so emulate its browser click.
 targets.push({dataset:{mapLabel:'2-8'},addEventListener(type,fn){this.onClick=fn;}});
 const start=game.indexOf('function renderMapModal(){'),end=game.indexOf('function openMapModal(){',start);
 vm.runInContext(game.slice(start,end),c);
 c.renderMapModal();
 assert(c.ui.mapNetwork.innerHTML.includes('data-map-label="2-8"'));
 assert(c.ui.mapNetwork.innerHTML.includes('ADM • SALTO LIVRE'));
 targets[0].onClick();
 assert.equal(c.progress.galaxyGate.jumpBonus,0);
 assert.equal(saved,0);
 assert.equal(fired[0],'x8');assert.equal(fired[3],'mars');
});
test('cliente comum com 0 bônus não teleporta',()=>{
 const c=clientSandbox(false,32);
 c.MAP_GRAPH_NODES=[{id:'1-1',x:10,y:10},{id:'1-8',x:20,y:20},{id:'2-8',x:20,y:30}];c.MAP_GRAPH_LINKS=[];
 const targets=[{dataset:{mapLabel:'1-8'},addEventListener(type,fn){this.onClick=fn;}}];
 c.ui={mapNetwork:{innerHTML:'',querySelectorAll(){return targets;}},mapModal:{classList:{add(){}}}};
 c.normalizeGalaxyGateState=()=>{};c.currentGraphMapLabel=()=> '1-1';c.mapArtFor=()=>'none';c.fmt=(x)=>String(x);
 let warned='',fired=false;c.showToast=(x)=>warned=x;c.runMapTransition=()=>fired=true;
 vm.runInContext(game.slice(game.indexOf('function renderMapModal(){'),game.indexOf('function openMapModal(){')),c);
 c.renderMapModal();
 assert(!c.ui.mapNetwork.innerHTML.includes('data-map-label="2-8"'));
 targets[0].onClick();
 assert.equal(fired,false);assert.match(warned,/Sem Bônus de Salto/);
});

const joinStart=wsSource.indexOf("      if(msg.type==='join_map'){");
const joinEnd=wsSource.indexOf("      if(msg.type==='player_state')",joinStart);
assert(joinStart>=0&&joinEnd>joinStart);
const joinBlock=wsSource.slice(joinStart,joinEnd);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const join= new AsyncFunction('msg','ws','authorizeJoin','world','safeJsonSend','shortText','nowMs',joinBlock);
async function joinCase({isAdmin=false,level=1,mapId='x8',territoryFaction='mars',spoof=false}){
 const sent=[],added=[];
 const ws={identity:{faction:'earth',level:1,isAdmin:false,user:{id:'test-user'},accessToken:'tok',callsign:'Pilot'},isAuthed:true,room:null};
 const world={mapDefinition:(id)=>({enabled:true,gate:false,minLevel:id==='x8'?32:15}),sectorForRoom:(id,territory)=> /^x/.test(id)?({territory_faction:territory,min_level:id==='x8'?32:18}):({min_level:15}),room:(id,territory)=>({addClient(_ws,p){added.push({id,territory,level:p.level});}})};
 const msg={type:'join_map',mapId,territoryFaction,faction:'earth',level:99,isAdmin:spoof};
 await join(msg,ws,async()=>({faction:'earth',level,isAdmin}),world,(_ws,p)=>sent.push(p),x=>x,()=>Date.now());
 return {sent,added};
}
test('WebSocket autoriza ADM estrangeiro mesmo abaixo do nível',async()=>{
 const r=await joinCase({isAdmin:true,level:1});
 assert.equal(r.added.length,1);assert.equal(r.added[0].territory,'mars');assert.equal(r.added[0].level,1);
});
test('WebSocket proíbe player normal em território alheio com level 99',async()=>{
 const r=await joinCase({isAdmin:false,level:99});
 assert.equal(r.added.length,0);assert.match(r.sent[0].reason,/INVASÕES BLOQUEADAS/);
});
test('WebSocket rejeita flag admin forjada pelo navegador',async()=>{
 const r=await joinCase({isAdmin:false,level:1,spoof:true});
 assert.equal(r.added.length,0);assert.match(r.sent[0].reason,/INVASÕES BLOQUEADAS/);
});
test('WebSocket aceita player de nível apropriado na própria facção',async()=>{
 const r=await joinCase({isAdmin:false,level:32,territoryFaction:'earth'});
 assert.equal(r.added.length,1);assert.equal(r.added[0].territory,'earth');
});
test('WebSocket bloqueia player próprio de nível insuficiente',async()=>{
 const r=await joinCase({isAdmin:false,level:1,territoryFaction:'earth'});
 assert.equal(r.added.length,0);assert.match(r.sent[0].reason,/nível mínimo/);
});
test('autorização da role ADM é obtida por RPC SQL com UID autenticado em login e salto',()=>{
 assert.ok((server.match(/\.rpc\('is_game_admin_v1763'/g)||[]).length>=2);
 assert(server.includes('p_uid:userId'));assert(server.includes('p_uid:data.user.id'));
 assert(game.includes('await refreshAdminStatus(true)'));
 assert(game.includes("if(!isVerifiedAdminNavigator()&&/^x[1-8]$/.test(progress.mapId)"));
});

test('login e save preservam a facção do ADM mesmo após recarregar',()=>{
 assert(game.includes("if(/^x[1-8]$/.test(progress.mapId))progress.territoryFaction"));
 assert(game.includes("if(!isVerifiedAdminNavigator()&&/^x[1-8]$/.test(progress.mapId)"));
 assert(game.includes("const territory=/^x[1-8]$/.test(best.mapId)"));
 assert(game.includes("const territoryFaction=/^x[1-8]$/.test(mapId)"));
 assert(!game.includes("['x1','x2','x3','x4'].includes(mapId)"));
});
