import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileQualityProfileV1167,npcVisualIntervalV1167,shouldRefreshNpcVisualV1167,npcLabelQualityV1167,createSharedNpcIndexV1167,copyNpcNetworkPatchV1167} from '../public/modules/mobile-performance-v1167.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('public/game.js'),world=read('server/world.js'),html=read('public/index.html');

test('V116.7: perfil ALTO mobile preserva arte e iluminacao, fixa orcamento real de 30 fps',()=>{
  const p={label:'ALTA',dpr:2,fps:60,sceneLight:1,background:true};
  const r=mobileQualityProfileV1167(p,{mobile:true,memory:2,cores:4},'high');
  assert.equal(r.fps,30);assert.equal(r.dpr,1.4);assert.equal(r.sceneLight,1);
  assert.equal(r.label,p.label);assert.equal(r.background,true);assert.equal(p.fps,60);
});
test('V116.7: mobile 6GB oferece pixels extras sem perder alvo de 30 fps',()=>{
  const r=mobileQualityProfileV1167({dpr:2,fps:60},{mobile:true,memory:6,cores:8},'high');
  assert.equal(r.dpr,1.7);assert.equal(r.fps,30);
});
test('V116.7: mobile com Save-Data recebe orcamento conservador',()=>{
  assert.equal(mobileQualityProfileV1167({dpr:2,fps:60},{mobile:true,saveData:true},'high').dpr,1.4);
});
test('V116.7: MEDIO e BAIXO respeitam limites de quadro mobile',()=>{
  assert.equal(mobileQualityProfileV1167({dpr:1.3,fps:45},{mobile:true,memory:2},'medium').dpr,1.12);
  assert.equal(mobileQualityProfileV1167({dpr:1.3,fps:45},{mobile:true,memory:2},'medium').fps,30);
  assert.equal(mobileQualityProfileV1167({dpr:1,fps:120},{mobile:true},'low').fps,45);
});
test('V116.7: desktop nao sofre alteracao de perfil',()=>{
  const p={dpr:2,fps:60};assert.equal(mobileQualityProfileV1167(p,{mobile:false},'high'),p);
});
test('V116.7: NPC distante fora da tela economiza animacao, preserva os proximos',()=>{
  assert.equal(npcVisualIntervalV1167({mobile:true}),200);
  for(const key of ['visible','selected','boss','eventNpc','near'])assert.equal(npcVisualIntervalV1167({mobile:true,[key]:true}),0,key);
  assert.equal(npcVisualIntervalV1167({mobile:false}),0);
});
test('V116.7: escalonador de NPC nao retrocede relogio e faz refresh a cada 200ms',()=>{
  assert.equal(shouldRefreshNpcVisualV1167({now:1000,lastAt:900,interval:200}),false);
  assert.equal(shouldRefreshNpcVisualV1167({now:1100,lastAt:900,interval:200}),true);
  assert.equal(shouldRefreshNpcVisualV1167({now:900,lastAt:1000,interval:200}),true);
  assert.equal(shouldRefreshNpcVisualV1167({now:1000,lastAt:-Infinity,interval:200}),true);
});
test('V116.7: ALTO mobile omite apenas nomes distantes, nunca sprite, boss ou target',()=>{
  const common={mobile:true,quality:'high',distanceSq:900*900};
  assert.equal(npcLabelQualityV1167(common),'medium');
  for(const key of ['boss','eventNpc','selected'])assert.equal(npcLabelQualityV1167({...common,[key]:true}),'high');
  assert.equal(npcLabelQualityV1167({...common,distanceSq:100}),'high');
  assert.equal(npcLabelQualityV1167({...common,mobile:false}),'high');
});
test('V116.7: indice de NPC separa entidades remotas de entidades locais',()=>{
  const id=createSharedNpcIndexV1167();
  const list=[{id:'a',sharedWorld:true,hp:10},{id:'a-local',sharedWorld:false,hp:20},{id:'b',sharedWorld:true,hp:30}];
  assert.equal(id.find(list,'a'),list[0]);assert.equal(id.find(list,'a-local'),null);
  assert.equal(id.find(list,'b'),list[2]);assert.equal(id.stats().rebuilds,1);
});
test('V116.7: lotes repetidos nao reconstroem indice a cada NPC',()=>{
  const lookup=createSharedNpcIndexV1167(),rows=Array.from({length:300},(_,i)=>({id:`npc_${i}`,sharedWorld:true}));
  for(let n=0;n<500;n++)assert.ok(lookup.find(rows,`npc_${n%300}`));
  assert.equal(lookup.stats().rebuilds,1);
  assert.equal(lookup.stats().size,300);
});
test('V116.7: novo snapshot de mesmo comprimento invalida indice',()=>{
  const lookup=createSharedNpcIndexV1167();const a=[{id:'npc_old',sharedWorld:true}];
  assert.ok(lookup.find(a,'npc_old'));
  const b=[{id:'npc_new',sharedWorld:true}];
  assert.equal(lookup.find(b,'npc_old'),null);
  assert.ok(lookup.find(b,'npc_new'));
});
test('V116.7: morte/remocao com mudanca de quantidade invalida indice',()=>{
  const lookup=createSharedNpcIndexV1167();const list=[{id:'a',sharedWorld:true},{id:'b',sharedWorld:true}];
  lookup.find(list,'a');list.splice(0,1);
  assert.equal(lookup.find(list,'a'),null);assert.equal(lookup.find(list,'b'),list[0]);
  list.push({id:'c',sharedWorld:true});assert.ok(lookup.find(list,'c'));
});
test('V116.7: copia patch de vida/escudo sem sobrescrever posicao visual',()=>{
  const e={x:10,y:20,hp:100,shield:50};
  assert.equal(copyNpcNetworkPatchV1167(e,{x:550,y:580,hp:70,shield:20}),true);
  assert.deepEqual(e,{x:10,y:20,hp:70,shield:20});
});
test('V116.7: campos perigosos nao passam para prototipos',()=>{
  const e={x:2,y:4};const raw=JSON.parse('{"__proto__":{"owned":true},"constructor":7,"hp":30}');
  copyNpcNetworkPatchV1167(e,raw);assert.equal(e.hp,30);assert.equal(e.owned,undefined);assert.equal(e.constructor,Object);
});
test('V116.7: servidor mantem 20Hz de simulacao e defesa de movimentacao',()=>{
  assert.match(world,/\},50\)/);
  assert.match(world,/this\.updateWarfrontControl\(dt,now\)/);
  assert.match(world,/this\.warbotEngine\.tick\(dt,now\)/);
  assert.match(world,/safeJsonSend\(victim,\{type:'npc_attack'/);
});
test('V116.7: evento e limpeza revisados em 500ms, sem dropar eventos e dano',()=>{
  assert.match(world,/lastEventEligibilityCheckV1167>=500/);
  assert.match(world,/lastEventCleanupSweepV1167>=500/);
  assert.match(world,/this\.ensureEvent\(false\)/);
  assert.match(world,/this\.broadcastEvent\(false\)/);
});
test('V116.7: nao mexe nos calculos e recompensas offline',()=>{
  assert.match(source,/offlineFarmWorldLockedV84\(\)/);
  assert.match(source,/createOfflineFarmV484/);
  assert.match(source,/MOBILE_QUALITY_V1167/);
});
test('V116.7: cliente usa indice nos pacotes WebSocket e evita alocacoes por patch',()=>{
  assert.match(source,/createSharedNpcIndexV1167\(\)/);
  assert.match(source,/SHARED_NPC_INDEX_V1167\.find\(state\.enemies,id\)/);
  assert.match(source,/copyNpcNetworkPatchV1167\(e,raw\)/);
  assert.match(source,/msg\.type==='npc_batch'/);
});
test('V116.7: nome e versao do jogo sao preservados e cache HTML atualizado',()=>{
  assert.match(html,/v1167-mobile-ws/);
  assert.match(source,/mobile-performance-v1167\.js\?v=47\.7\.60/);
});
