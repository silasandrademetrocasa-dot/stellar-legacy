import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {ASTRAL_ARENAS,isAstralArena,astralRadarVisible,astralResumePoint,astralBossStage,astralBossLabel,drawAstralRift,drawAstralBossCrest} from '../public/modules/astral-gates-v380.js';
import {movementSpeed,nominalMovementSpeed} from '../public/modules/ship-navigation.js';
import {MAPS} from '../public/data.js';
const read=(f)=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

test('portais têm arenas maiores que antes e compatíveis com as definições de mapa',()=>{
 for(const [id,old] of Object.entries({ggAlpha:[7200,5200],ggBeta:[7800,5600],ggGamma:[8400,6200]})){
  assert.ok(ASTRAL_ARENAS[id].w>old[0]);assert.ok(ASTRAL_ARENAS[id].h>old[1]);
  assert.deepEqual(MAPS[id].world,{w:ASTRAL_ARENAS[id].w,h:ASTRAL_ARENAS[id].h});
  assert.equal(isAstralArena(id),true);assert.equal(MAPS[id].gate,true);
 }
 assert.equal(isAstralArena('b41'),false);
});

test('voo astral tem mesmo pacing nominal e real de X-8, sem alterar PvP',()=>{
 for(const id of Object.keys(ASTRAL_ARENAS)){
  assert.equal(movementSpeed(400,id),movementSpeed(400,'x8'));
  assert.equal(nominalMovementSpeed(400,id),nominalMovementSpeed(400,'x8'));
  assert.equal(movementSpeed(290,id,1.2),movementSpeed(290,'x8',1.2));
 }
 assert.ok(movementSpeed(400,'ggBeta')<nominalMovementSpeed(400,'ggBeta'));
 assert.ok(movementSpeed(400,'b41')>0);
});

test('radar astral mostra NPCs vivos no mapa todo, sem estender o radar de PvE/PvP',()=>{
 const e={hp:100,eventNpc:false};
 for(const id of Object.keys(ASTRAL_ARENAS))assert.equal(astralRadarVisible({mapId:id,enemy:e,dist:100000,radarRange:200}),true);
 assert.equal(astralRadarVisible({mapId:'x8',enemy:e,dist:2201,radarRange:2200}),false);
 assert.equal(astralRadarVisible({mapId:'b41',enemy:e,dist:2201,radarRange:2200}),false);
 assert.equal(astralRadarVisible({mapId:'x8',enemy:{...e,eventNpc:true},dist:9000,radarRange:200}),true);
 assert.equal(astralRadarVisible({mapId:'ggAlpha',enemy:{...e,hp:0},dist:5,radarRange:200}),false);
});

test('checkpoint descarta coordenadas inválidas e mantém piloto dentro da arena',()=>{
 const world={w:11500,h:8500};
 assert.deepEqual(astralResumePoint(null,world),{x:5750,y:4250});
 assert.deepEqual(astralResumePoint({x:2000,y:2600},world),{x:2000,y:2600});
 assert.deepEqual(astralResumePoint({x:-500,y:99999},world),{x:80,y:8420});
 assert.deepEqual(astralResumePoint({x:'oops',y:300},world),{x:5750,y:4250});
});

test('chefes Aurora, Nexus, Eclipse mudam de fase conforme HP+escudo',()=>{
 for(const [key,label] of [['alpha','AURORA FINAL'],['beta','NEXUS INSTÁVEL'],['gamma','ABISMO OMEGA']]){
  const e={astralProtocol:key,type:'bossMordon',hp:100,maxHp:100,shield:0,maxShield:0,size:35};
  assert.equal(astralBossStage(e),1);
  e.hp=55;assert.equal(astralBossStage(e),2);
  e.hp=25;assert.equal(astralBossStage(e),3);assert.equal(astralBossLabel(e),label);
  e.hp=0;assert.equal(astralBossStage(e),0);
 }
 assert.equal(astralBossStage({type:'streuner',hp:100,astralProtocol:'alpha'}),0);
});

test('desenho dos portais preserva o estado do Canvas e respeita perfis de qualidade',()=>{
 const log=[];const ctx={save(){log.push('save')},restore(){log.push('restore')},translate(){},drawImage(){},beginPath(){},arc(){},stroke(){},rotate(){},set lineWidth(v){},set strokeStyle(v){},set globalAlpha(v){}};
 for(const mapId of Object.keys(ASTRAL_ARENAS)){
  for(const quality of ['low','medium','high']){
   assert.equal(drawAstralRift(ctx,{mapId,screenX:100,screenY:100,time:5,quality,mobile:quality==='low',image:{naturalWidth:384}}),true);
  }
 }
 assert.equal(drawAstralRift(ctx,{mapId:'x2',screenX:10,screenY:10}),false);
 assert.equal(log.filter(x=>x==='save').length,log.filter(x=>x==='restore').length);
});

test('contorno dos bosses evita efeitos por frame e restaura o Canvas',()=>{
 let save=0,restore=0;
 const ctx={save(){save++},restore(){restore++},beginPath(){},arc(){},stroke(){},rotate(){},set strokeStyle(v){},set globalAlpha(v){},set lineWidth(v){}};
 for(const quality of ['low','high'])assert.equal(drawAstralBossCrest(ctx,{quality,enemy:{type:'bossSaimon',astralProtocol:'gamma',hp:25,maxHp:100,shield:0,maxShield:0,size:32},time:3}),true);
 assert.equal(save,restore);
});

test('sprite dos três Portais Astrais presente sem assets externos ou dependências adicionais',()=>{
 for(const name of ['alpha','beta','gamma'])assert.equal(existsSync(new URL(`../public/assets/v38/gates/${name}.webp`,import.meta.url)),true);
});

test('integração na cena e na UI, sem alterar regras de recompensa, peças ou giros',()=>{
 const game=read('public/game.js'),server=read('server/index.js'),css=read('public/style.css');
 assert.match(game,/astralRadarVisible\(\{mapId:progress\.mapId,enemy:e,dist,radarRange:state\.radarRange\}\)/);
 assert.match(game,/drawAstralGateArenaV380\(\)/);
 assert.match(game,/run\.enemySnapshots=state\.enemies\.filter/);
 assert.match(game,/respawnPending=true/);
 assert.match(game,/astralShieldRecharged/);
 assert.match(css,/#gateModal\[data-astral-protocol="beta"\]/);
 assert.match(css,/#gateModal\[data-low-fx="true"\]/);
 assert.match(server,/alpha:\{key:'alpha',label:'AURORA',pieces:34/);
 assert.match(server,/beta:\{key:'beta',label:'NEXUS',pieces:48/);
 assert.match(server,/gamma:\{key:'gamma',label:'ECLIPSE',pieces:64/);
});
