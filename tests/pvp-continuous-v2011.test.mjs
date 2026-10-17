import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(ROOT,'public/game.js'),'utf8');
function section(start,end){const at=src.indexOf(start);assert.ok(at>=0,start);const until=src.indexOf(end,at+start.length);assert.ok(until>at,end);return src.slice(at,until);}
const queue=section('async function queuePvpShot(', 'function updateOnlineWorld(');
async function context(message){
 const calls=[];
 const player={laserFiring:true,shield:0,maxShield:1000};
 const state={pvpShotPending:0,pvpRetryUntil:0,pvpErrorLastToastAt:0,pvpReservedAmmo:{}};
 const time={v:0};
 const ctx={player,state,Date,Math,console,progress:{mapId:'b41'},getUser:()=>({id:'A'}),onlineTerritoryKey:()=> 'battle',
  queuePvpAttackOnline:async args=>{calls.push(args);if(message)throw Error(message);return {accepted:true,effective_damage:123,target_callsign:'B'};},
  showToast:()=>{},spawnImpactFx:()=>{},scoreClanWar:()=>{},currentClanTag:()=>'',spawnParticle:()=>{},nowSec:()=>time.v};
 vm.createContext(ctx);vm.runInContext(queue,ctx);
 return {...ctx,calls,time};
}
test('429/cooldown do servidor nao desliga o laser e libera pendencias', async()=>{
 const c=await context('Aguarde o proximo disparo PvP.');
 const t={id:'B',isPlayer:true,x:100,y:100};
 const p=c.queuePvpShot(t,900);assert.equal(c.state.pvpShotPending,1);
 assert.equal(await p,null);assert.equal(c.player.laserFiring,true);assert.equal(c.state.pvpShotPending,0);assert.ok(c.state.pvpRetryUntil>Date.now());
});
test('erro de presenca ou rede nao desliga o laser',async()=>{
 for(const err of ['Alvo offline.','Failed to fetch','Alvo distante: aproxime-se para disparar.']){
  const c=await context(err);await c.queuePvpShot({id:'B',isPlayer:true,x:100,y:100},700);assert.equal(c.player.laserFiring,true,err);
 }
});
test('bloqueio real fora do 4-X interrompe o ataque',async()=>{
 const c=await context('PvP permitido somente em 4-1, 4-2 ou 4-3.');await c.queuePvpShot({id:'B',isPlayer:true},700);
 assert.equal(c.player.laserFiring,false);
});
test('pvp aceita disparos em paralelo ate limite 3',async()=>{
 const c=await context(null),t={id:'B',isPlayer:true,x:20,y:20};
 const sent=[c.queuePvpShot(t,500),c.queuePvpShot(t,600),c.queuePvpShot(t,700),c.queuePvpShot(t,800)];
 const result=await Promise.all(sent);
 assert.equal(c.calls.length,3);assert.equal(result[3],null);assert.equal(c.state.pvpShotPending,0);assert.equal(c.player.laserFiring,true);
});
test('cliente respeita estoque reservado e mira mantida em presenca atrasada',()=>{
 const laser=section('function fireLaserTick(', 'function fireRocket(');
 assert.match(laser,/pvpShotPending\|\|0\)>=3/);
 assert.match(laser,/stock-reserved/);
 assert.match(laser,/state\.pvpReservedAmmo\[shotAmmo\.id\]=reserved\+firingCount/);
 assert.match(laser,/\.finally\(\(\)=>\{/);
 const sync=section('async function syncOnlineWorld(', 'let pvpInboxBusy=');
 assert.match(sync,/lastPresenceSeenAt=Date\.now\(\)/);
 assert.match(sync,/lastPresenceSeenAt\|\|0\)<8000/);
 assert.equal(src.includes('player.laserFiring=false;\n    showToast(String(e?.message||e)'),false);
});
