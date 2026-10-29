import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldPollPvpInboxV106 as allowed} from '../public/modules/pvp-inbox-policy-v106.js';
const opts={hasSession:true,now:20000,lastReadAt:0};

test('V106: PvE nao consulta inbox de PvP em nenhum ciclo sem transicao',()=>{
  for(let i=0;i<10000;i++)assert.equal(allowed({...opts,inPvp:false,now:20000+i*100}),false);
});

test('V106: PvP preserva intervalo de 450ms, inclusive ao entrar',()=>{
  assert.equal(allowed({...opts,inPvp:true,now:10000,lastReadAt:9999}),false);
  assert.equal(allowed({...opts,inPvp:true,now:10449,lastReadAt:10000}),false);
  assert.equal(allowed({...opts,inPvp:true,now:10450,lastReadAt:10000}),true);
  assert.equal(allowed({...opts,inPvp:true,now:10000,lastReadAt:0}),true);
});

test('V106: ao sair do PvP, faz exatamente uma drenagem, sem dano e sem polling repetido',()=>{
  assert.equal(allowed({...opts,inPvp:false,drainPending:true}),true);
  assert.equal(allowed({...opts,inPvp:false,drainPending:false}),false);
  assert.equal(allowed({...opts,inPvp:false,drainPending:true,now:34500,lastReadAt:20000}),false);
  assert.equal(allowed({...opts,inPvp:false,drainPending:true,now:35000,lastReadAt:20000}),true);
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(game,/if\(!isPublicPvpSector\(\)\)continue;/);
  assert.match(game,/if\(exitDrain\)pvpExitDrainPendingV106=false/);
  assert.match(game,/if\(exitDrain\)pvpExitDrainPendingV106=true/);
});

test('V106: nao consulta enquanto ocupado, desconectado ou em mapa privativo',()=>{
  assert.equal(allowed({...opts,inPvp:true,busy:true}),false);
  assert.equal(allowed({...opts,inPvp:true,hasSession:false}),false);
  assert.equal(allowed({...opts,inPvp:false,drainPending:true,privateMap:true}),false);
});

test('V106: cliente atualizado usa politica nova sem modificar API econômica',()=>{
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(game,/from '\.\/modules\/pvp-inbox-policy-v106\.js\?v=47\.7\.60'/);
  assert.match(game,/shouldPollPvpInboxV106\(\{/);
  assert.match(html,/\/game\.js\?v=47\.7\.60-missionfix3/);
  assert.match(game,/mergeUnsavedMissionProgressV105/);
});
