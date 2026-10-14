import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {MAPS} from '../public/data.js';
const client=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const allowed=['Prometium','Endurium','Terbium'];

test('Mapas 4-X carregam zero pedras mesmo após reiniciar a sala',()=>{
 for(const id of ['b41','b42','b43']){
  assert.equal(MAPS[id].oreCount,0,id);
  assert.deepEqual(MAPS[id].ores,[],id);
 }
 assert.match(world,/const raw=Number\(this\.map\.oreCount\);const oreCount=Number\.isFinite\(raw\)\?Math\.max\(0,Math\.round\(raw\)\):0;/);
 assert.doesNotMatch(world,/this\.map\.oreCount\|\|\(this\.map\.battle\?72:48\)/);
 assert.match(client,/const raw=Number\(state\.currentMap\.oreCount\);const count=Number\.isFinite\(raw\)\?Math\.max\(0,Math\.round\(raw\)\):0;/);
});

test('Mapas X-5..X-8 geram apenas os três recursos básicos',()=>{
 for(const id of ['x5','x6','x7','x8']) assert.deepEqual(MAPS[id].ores,allowed);
 assert.match(world,/if\(this\.mapDefinition\(id\)\?\.battle\)return \[\];/);
});

test('Atualização online remove pedras inválidas sem tocar recursos de evento',()=>{
 assert.match(world,/!ore\.eventOre&&!allowedOres\.has\(ore\.type\)/);
 assert.match(world,/reason:'resource_pool_changed'/);
 assert.match(world,/r\.eventOre/);
 assert.match(world,/this\.spawnEventOres/);
});

test('Boxes bônus nos mapas X-5..X-8 igualam 20 dos X-1..X-4',()=>{
 assert.match(client,/map_counts:\{x1:20,x2:20,x3:20,x4:20,x5:20,x6:20,x7:20,x8:20,b41:30,b42:30,b43:30\}/);
 assert.match(client,/map_counts:\{\.\.\.BONUS_CONFIG_DEFAULT\.map_counts,\.\.\.c\.map_counts\}/);
 assert.match(client,/const goal=bonusBoxTargetForMap\(\);/);
 assert.match(client,/bonusBoxMapKey\(\)\{return locationStorageKey\(\)/);
});

test('Portal X-8 fica longe da base nas três facções e mantém retorno determinístico',()=>{
 const start=client.indexOf('function graphNode(label){');
 const end=client.indexOf('\nfunction resolvedPortals(',start);
 assert(start!==-1&&end>start);
 const maps={x8:MAPS.x8,x7:MAPS.x7};
 const cases=[['earth','1-8','1-7',{x:620,y:3700}],['mars','2-8','2-7',{x:9380,y:2072}],['jupiter','3-8','3-7',{x:9380,y:5328}]];
 for(const [f,label,target,base] of cases){
  const ctx={MAPS:maps,MAP_GRAPH_NODES:[{id:label,x:25,y:25},{id:target,x:15,y:15}],MAP_GRAPH_LINKS:[[label,target,true]],progress:{profile:{faction:f}},isVerifiedAdminNavigator:()=>false,basePointForFaction:()=>base,graphDestination:(x)=>({mapId:x===label?'x8':'x7',territoryFaction:f,battle:false}),Math,Number,String};
  vm.createContext(ctx);vm.runInContext(client.slice(start,end),ctx);
  const p=ctx.portalsForGraphLabel(label)[0];
  const dist=Math.hypot(p.x-base.x,p.y-base.y);
  assert(dist>7500,`portal X8 da facção ${f} está muito próximo: ${dist}`);
  assert.equal(p.targetLabel,target);
  assert(p.x>200&&p.x<MAPS.x8.world.w-200);
  assert(p.y>200&&p.y<MAPS.x8.world.h-200);
  assert.match(world,/if\(mapId==='x8'\)/);
  assert.match(world,/pos\.x=base\.x<w\/2\?w-420:420;pos\.y=Math\.round\(base\.y<h\/2\?h\*\.74:h\*\.26\)/);
 }
});
