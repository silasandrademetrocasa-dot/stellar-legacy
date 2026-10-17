import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MAPS,FACTIONS} from '../public/data.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const wsSource=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const start=game.indexOf('function graphDestination(label){'),stop=game.indexOf('function mapArtFor(label){',start);
assert(start>=0&&stop>start);
function client(faction='earth',level=15,admin=false){
 const c={authenticated:true,adminRuntime:{enabled:admin},progress:{profile:{faction,level},mapId:'x4',territoryFaction:faction,galaxyGate:{jumpBonus:2}},MAPS,FACTIONS,worldRuntimeConfig:{sectorDestinations:new Map(),sectorInfo:new Map()},factionFromPrefix:(prefix)=>Object.values(FACTIONS).find(x=>String(x.prefix)===String(prefix))||null};
 vm.createContext(c);vm.runInContext(`function isVerifiedAdminNavigator(){return !!authenticated&&adminRuntime.enabled===true;}\n${game.slice(start,stop)}`,c);return c;
}
for(const [fac,name] of [['earth','Terra'],['mars','Marte'],['jupiter','Júpiter']]){
 test(`${name} pode entrar nas três arenas 4-X a partir do nível 15`,()=>{
  const c=client(fac,15);for(const b of ['4-1','4-2','4-3'])assert.equal(c.canTravelGraphLabel(b).ok,true,`${fac} -> ${b}`);
 });
 test(`${name} abaixo do nível 15 não pode entrar em nenhuma arena`,()=>{
  const c=client(fac,14);for(const b of ['4-1','4-2','4-3']){const r=c.canTravelGraphLabel(b);assert.equal(r.ok,false,`${fac} -> ${b}`);assert.match(r.reason,/15/);}
 });
 test(`${name} não pode entrar em território X de outra facção mesmo no nível 99`,()=>{
  const c=client(fac,99);for(const other of ['1','2','3']){if(FACTIONS[fac].prefix!==other)assert.equal(c.canTravelGraphLabel(`${other}-5`).ok,false);}
 });
}
test('mapa estelar exibe 4-1, 4-2 e 4-3 para piloto normal, mas oculta os setores X estrangeiros',()=>{
 const c=client('earth',15,false);c.MAP_GRAPH_NODES=[{id:'1-4',x:8,y:8},{id:'2-4',x:11,y:12},{id:'1-5',x:15,y:15},{id:'2-5',x:16,y:16},{id:'4-1',x:30,y:30},{id:'4-2',x:40,y:40},{id:'4-3',x:50,y:50}];c.MAP_GRAPH_LINKS=[['4-1','4-2'],['4-1','4-3']];
 c.ui={mapNetwork:{innerHTML:'',querySelectorAll:()=>[]}};c.normalizeGalaxyGateState=()=>{};c.currentGraphMapLabel=()=> '1-4';c.mapArtFor=()=> 'none';c.fmt=String;
 vm.runInContext(game.slice(game.indexOf('function renderMapModal(){'),game.indexOf('function openMapModal(){')),c);c.renderMapModal();
 for(const b of ['4-1','4-2','4-3'])assert(c.ui.mapNetwork.innerHTML.includes(`data-map-label="${b}"`),b);
 for(const b of ['2-4','2-5'])assert(!c.ui.mapNetwork.innerHTML.includes(`data-map-label="${b}"`),b);
});
const blockStart=wsSource.indexOf("      if(msg.type==='join_map'){");const blockStop=wsSource.indexOf("      if(msg.type==='player_state')",blockStart);assert(blockStart>=0&&blockStop>blockStart);
const join=new (Object.getPrototypeOf(async function(){}).constructor)('msg','ws','authorizeJoin','world','safeJsonSend','shortText','nowMs',wsSource.slice(blockStart,blockStop));
async function joinCase({faction='earth',level=15,mapId='b41',territoryFaction='earth',isAdmin=false,spoofLevel=99}){
 const added=[],sent=[];const ws={identity:{faction,level:1,isAdmin:false,user:{id:'test'},accessToken:'token',callsign:'Pilot'},isAuthed:true,room:null};
 const world={mapDefinition:(id)=>({enabled:true,gate:false,minLevel:/^b4[123]$/.test(id)?15:18}),sectorForRoom:(id,terr)=>/^x/.test(id)?{territory_faction:terr,min_level:18}:{min_level:15},room:(id,terr)=>({addClient(_ws,p){added.push({id,terr,level:p.level,faction:p.faction})}})};
 await join({type:'join_map',mapId,territoryFaction,faction,level:spoofLevel,isAdmin:true},ws,async()=>({faction,level,isAdmin}),world,(_ws,val)=>sent.push(val),String,()=>Date.now());return {added,sent};
}
for(const fac of ['earth','mars','jupiter'])for(const mapId of ['b41','b42','b43']){
 test(`servidor permite ${fac} no mapa PvP ${mapId} a partir do nível 15`,async()=>{
  const out=await joinCase({faction:fac,level:15,mapId});assert.equal(out.added.length,1,JSON.stringify(out));assert.equal(out.added[0].terr,null);
 });
 test(`servidor bloqueia ${fac} em ${mapId} no nível 14, mesmo forjando nível 99`,async()=>{
  const out=await joinCase({faction:fac,level:14,mapId});assert.equal(out.added.length,0,JSON.stringify(out));assert.match(out.sent[0]?.reason||'',/nível mínimo/);
 });
}
test('servidor bloqueia invasão para mapas X-5 de outra facção',async()=>{
 const out=await joinCase({faction:'earth',level:99,mapId:'x5',territoryFaction:'mars'});assert.equal(out.added.length,0);assert.match(out.sent[0]?.reason||'',/INVASÕES BLOQUEADAS/);
});
test('servidor permite livre acesso ADM aos territórios mesmo abaixo do nível',async()=>{
 const out=await joinCase({faction:'earth',level:1,mapId:'x5',territoryFaction:'mars',isAdmin:true});assert.equal(out.added.length,1);assert.equal(out.added[0].terr,'mars');
});
test('portais físicos entre as arenas 4-X aparecem na sala do servidor',()=>{
 const a=wsSource.indexOf('    portalsForRoom(mapId,territoryFaction){'),b=wsSource.indexOf('    loadBattleGroup:',a);assert(a>=0&&b>a);
 const source=wsSource.slice(a,b).trim().replace(/,$/,'');const fn=vm.runInNewContext(`({${source}}).portalsForRoom`,{MAPS});
 const s=new Map([['4-1',{sector_label:'4-1',map_id:'b41',territory_faction:null}],['4-2',{sector_label:'4-2',map_id:'b42',territory_faction:null}],['4-3',{sector_label:'4-3',map_id:'b43',territory_faction:null}],['1-5',{sector_label:'1-5',map_id:'x5',territory_faction:'earth'}],['2-5',{sector_label:'2-5',map_id:'x5',territory_faction:'mars'}]]);
 const fakeWorld={worldRuntime:{sectors:s,portals:[{from_sector:'4-1',to_sector:'4-2',bidirectional:true},{from_sector:'4-1',to_sector:'4-3',bidirectional:true},{from_sector:'4-1',to_sector:'1-5',bidirectional:true},{from_sector:'4-1',to_sector:'2-5',bidirectional:true}]},sectorForRoom:(_id)=>s.get('4-1'),mapDefinition:(id)=>MAPS[id],portalEdgePoint:()=>({x:200,y:200})};
 const ports=fn.call(fakeWorld,'b41',null);const labels=ports.map(x=>x.targetLabel);
 assert(labels.includes('4-2'));assert(labels.includes('4-3'));assert(labels.includes('1-5'));assert(!labels.includes('2-5'));
});
