import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldRefreshWorldRuntimeV108 as needs} from '../server/idle-world-refresh-v108.js';
test('V108: ocupado atualiza a configuração do mundo sem esperar janela de repouso',()=>{
 for(const ms of [0,50,1000,10000,59000])assert.equal(needs({hasPlayers:true,now:ms,lastIdleCheckAt:0}),true);
});
test('V108: zero jogadores - limite de 60 segundos, nunca cancela eventos',()=>{
 assert.equal(needs({hasPlayers:false,now:90000,lastIdleCheckAt:50000}),false);
 assert.equal(needs({hasPlayers:false,now:110000,lastIdleCheckAt:50000}),true);
 assert.equal(needs({hasPlayers:false,now:1000,lastIdleCheckAt:50000}),true);
});
test('V108: servidor preserva loop 50ms, eventos, salas e consulta no primeiro jogador',()=>{
 const s=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
 assert.match(s,/if\(shouldRefreshWorldRuntimeV108\(/);
 assert.match(s,/intervalMs:60000/);
 assert.match(s,/const timer=setInterval\(/);
 assert.match(s,/world\.broadcastGlobalEventStatus\(false\)/);
 assert.match(s,/if\(r\.clients\.size>0\)\{r\.lastUsedAt=n;r\.tick\(dt\)/);
 assert.match(s,/\},50\)/);
});
