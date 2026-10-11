import assert from 'node:assert/strict';
import fs from 'node:fs';
const sw=fs.readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const game=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../public/world.js',import.meta.url),'utf8');
const start=sw.indexOf('  handleOreCollect(ws,msg){'),stop=sw.indexOf('\n  addEventProgress(',start);
assert(start>=0&&stop>start,'método de coleta deve existir no servidor');
const sent=[];
const safeJsonSend=(ws,message)=>sent.push({ws:ws?.player?.userId, ...message});
const handler=Function('safeJsonSend','nowMs','rand',`return ({${sw.slice(start,stop)}}).handleOreCollect`)(safeJsonSend,()=>1200,(a,b)=>a);
function context({oreX=400,oreY=500,shipX=80,shipY=500,petX=400,petY=500,petMode='ore',petOwned=true,battle=false,eventOre=false}={}){
 const ore={id:'o1',type:'Prometium',amount:23,x:oreX,y:oreY,eventOre,eventId:'ev1'};
 const broadcast=[],credited=[];
 const room={map:{battle,oreRespawnMinMs:5000,oreRespawnMaxMs:12000},ores:new Map([['o1',ore]]),eventParticipants:new Set(),oreRespawns:[],event:eventOre?{eventId:'ev1'}:null,eventMode:()=>eventOre?'ore':null,broadcast:r=>broadcast.push(r),creditPersonalEvent:(...a)=>credited.push(a)};
 const ws={player:{userId:'player',x:shipX,y:shipY,pet:{owned:petOwned,activeGear:petMode,x:petX,y:petY}}};
 sent.length=0;
 return {room,ws,ore,broadcast,credited};
}
function run(opts={},collector='pet'){
 const x=context(opts);handler.call(x.room,x.ws,{entityId:'o1',collector});return {...x,reply:sent.map(({ws,...v})=>v)};
}
const pet=run();assert.equal(pet.reply[0].type,'ore_collected');assert.equal(pet.reply[0].collector,'pet');assert.equal(pet.room.ores.size,0);assert.equal(pet.room.oreRespawns.length,1);
let x=run({},'ship');assert.equal(x.reply[0].reason,'range');assert.equal(x.room.ores.size,1);
x=run({shipX:370},'ship');assert.equal(x.reply[0].collector,'ship');assert.equal(x.room.ores.size,0);
x=run({petMode:'guard'});assert.equal(x.reply[0].reason,'pet_inactive');
x=run({petOwned:false});assert.equal(x.reply[0].reason,'pet_inactive');
x=run({petX:530});assert.equal(x.reply[0].reason,'pet_range');
x=run({shipX:-700});assert.equal(x.reply[0].reason,'pet_range');
x=run({shipX:100,oreX:1200,petX:1200});assert.equal(x.reply[0].reason,'pet_range');
x=run({shipX:280,oreX:350,petX:350},'ship');assert.equal(x.reply[0].collector,'ship');
x=run({shipX:280,oreX:350,petX:350},'pet');assert.equal(x.reply[0].collector,'pet');
x=run({eventOre:true});assert.equal(x.credited.length,1);assert.equal(x.room.oreRespawns.length,0);handler.call(x.room,x.ws,{entityId:'o1',collector:'pet'});assert.equal(x.credited.length,1);assert.equal(sent.at(-1).reason,'missing');
x=run({battle:true,shipX:80,oreX:1080,petX:1080});assert.equal(x.reply[0].collector,'pet');
assert(client.includes("collectOre(entityId,collector='ship')"));
assert(game.includes("sharedUniverse.collectOre(task.id,'pet')"));
assert(game.includes('syncSharedUniversePlayer(true);\n        sharedUniverseRuntime.pendingOres.add(task.id);'));
assert(game.includes("if(msg.collector==='pet')addPetXp(3)"));
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.equal(pkg.version,'18.2.7');
console.log('OK: 13 cenários AUX EXTRATOR / nave / range / módulo / evento / anti-duplo + integração cliente');
