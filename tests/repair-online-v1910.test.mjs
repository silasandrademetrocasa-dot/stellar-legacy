import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repairPulseSettings} from '../public/repair-balance.js';

const standard={id:'rep2',repairRate:.01,repairTick:5000,shieldRepairTick:10000,repairDelay:5};
const elite={id:'repElite',repairRate:.02,repairTick:10000,shieldRepairTick:15000,repairDelay:5};

const pulse=(repairBot,secondsWithoutDamage=6,more={})=>repairPulseSettings({repairBot,secondsWithoutDamage,...more});
test('sem robô, fora da base: somente escudo recupera após 5 segundos',()=>{
  assert.deepEqual(pulse(null,4),{hpTick:5000,shieldTick:10000,delaySeconds:5,hpReady:false,shieldReady:false});
  assert.deepEqual(pulse(null,6),{hpTick:5000,shieldTick:10000,delaySeconds:5,hpReady:false,shieldReady:true});
});
test('base sem robô mantém +5k HP / +10k ESC imediatamente',()=>{
  const r=pulse(null,0,{baseSafe:true});
  assert.deepEqual(r,{hpTick:5000,shieldTick:10000,delaySeconds:5,hpReady:true,shieldReady:true});
});
test('comum e Elite reproduzem regeneração padrão; somente após 5s',()=>{
  assert.deepEqual(pulse(standard,5),{hpTick:5000,shieldTick:10000,delaySeconds:5,hpReady:true,shieldReady:true});
  assert.deepEqual(pulse(elite,5),{hpTick:10000,shieldTick:15000,delaySeconds:5,hpReady:true,shieldReady:true});
  assert.equal(pulse(standard,4).hpReady,false);
  assert.equal(pulse(elite,4).shieldReady,false);
});
test('edições ao vivo alteram os dois pulsos e seu delay sem novo deploy',()=>{
  const changed={...elite,repairTick:13000,shieldRepairTick:19000,repairDelay:8};
  assert.deepEqual(pulse(changed,7),{hpTick:13000,shieldTick:19000,delaySeconds:8,hpReady:false,shieldReady:false});
  assert.deepEqual(pulse(changed,8),{hpTick:13000,shieldTick:19000,delaySeconds:8,hpReady:true,shieldReady:true});
});
test('valores 0 são edições válidas: sem pulso ou sem espera',()=>{
  assert.deepEqual(pulse({...standard,repairTick:0,shieldRepairTick:0,repairDelay:0},0),{hpTick:0,shieldTick:0,delaySeconds:0,hpReady:true,shieldReady:true});
});
test('Premium x2 e designer multiplicam sem alterar a configuração base',()=>{
  assert.deepEqual(pulse(elite,7,{premium:true,designerMultiplier:1.25}),{hpTick:25000,shieldTick:37500,delaySeconds:5,hpReady:true,shieldReady:true});
  assert.equal(elite.repairTick,10000);
});
test('compatibilidade com saves antigos, sem fields dinâmicos',()=>{
  assert.equal(pulse({id:'rep2',repairRate:.01}).hpTick,5000);
  assert.equal(pulse({id:'repElite',repairRate:.02}).shieldTick,15000);
  assert.equal(pulse({id:'repElite',repairRate:.02}).delaySeconds,5);
});
test('valores malformados recebem fallback e não ultrapassam limites do ADM',()=>{
  const bad=pulse({...elite,repairTick:Infinity,shieldRepairTick:999999999,repairDelay:-4});
  assert.equal(bad.hpTick,10000);
  assert.equal(bad.shieldTick,1000000);
  assert.equal(bad.delaySeconds,0);
});
test('regra está conectada à execução de regeneração real no game.js',()=>{
  const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(game,/const repair=repairPulseSettings\(\{/);
  assert.match(game,/player\.shield\+repair\.shieldTick/);
  assert.match(game,/player\.hp\+repair\.hpTick/);
  assert.doesNotMatch(game,/repairBot\?\.id==='repElite'\?15000:10000/);
  assert.doesNotMatch(game,/repairBot\?\.id==='repElite'\?10000:5000/);
});
