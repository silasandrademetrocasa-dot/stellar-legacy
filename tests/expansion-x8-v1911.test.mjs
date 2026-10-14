import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAPS,NPC_TYPES,FACTIONS} from '../public/data.js';
import {repairPulseSettings} from '../public/repair-balance.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../sql/V19_0_11_EXPANSAO_X5_X8.sql',import.meta.url),'utf8');
test('quatro setores elevados com nível crescente, 2ª base e quatro grupos NPCs',()=>{
 for(const [key,level] of [['x5',18],['x6',22],['x7',27],['x8',32]]){
  const m=MAPS[key];assert.equal(m.minLevel,level);assert(m.world.w>=8000);assert.equal(m.enemyGroups.length,4);
  assert.equal(m.enemyMultiplier,1);
 }
 assert(MAPS.x8.structures.includes('Trader'));
 assert(MAPS.x8.structures.includes('Nova Base'));
 assert.deepEqual(Object.keys(FACTIONS).sort(),['earth','jupiter','mars']);
});
test('oito NPCs novos e boss progressivos',()=>{
 const ids=['riftScout','bossRiftScout','voidCorsair','bossVoidCorsair','nexusWarden','bossNexusWarden','astralReaper','bossAstralReaper'];
 for(const id of ids){assert(NPC_TYPES[id],id);assert(NPC_TYPES[id].damage>0,id);}
 assert(NPC_TYPES.bossAstralReaper.hp>NPC_TYPES.bossRiftScout.hp);
});
test('AEG concede bônus real ao pulso de escudo, não ao HP',()=>{
 const base=repairPulseSettings({repairBot:{id:'rep2',repairTick:5000,shieldRepairTick:10000,repairDelay:5},secondsWithoutDamage:6});
 const aeg=repairPulseSettings({repairBot:{id:'rep2',repairTick:5000,shieldRepairTick:10000,repairDelay:5},secondsWithoutDamage:6,shieldRegenBonus:.0625});
 assert.equal(base.shieldTick,10000);assert.equal(aeg.shieldTick,10625);assert.equal(aeg.hpTick,base.hpTick);
 assert.equal(repairPulseSettings({premium:true,shieldRegenBonus:.0625}).shieldTick,21250);
});
test('12 setores adicionais conectam cada batalha 4-X ao próprio X-5 e até X-8',()=>{
 for(const f of ['1','2','3']){
  for(const n of [5,6,7,8])assert(sql.includes(`'${f}-${n}','x${n}'`));
  assert(sql.includes(`'4-${f}','${f}-5'`));
  assert(sql.includes(`'${f}-7','${f}-8'`));
 }
 assert(sql.includes("'3-4','4-3'"));
});
test('invasão bloqueada por facção no cliente e servidor, salas isoladas até X-8',()=>{
 assert(game.includes('TERRITÓRIO INIMIGO • invasões bloqueadas'));
 assert(game.includes('BATTLE DE OUTRA FACÇÃO • invasões bloqueadas'));
 assert(server.includes('return /^x[1-8]$/.test(mapId) ?'));
 assert(server.includes('INVASÕES BLOQUEADAS'));
 assert(server.includes('authorizeJoin'));
});
test('base X-8 permite serviços mas portais astrais permanecem apenas em X-1',()=>{
 assert(game.includes("function isAtTrader(){return ['x1','x8'].includes"));
 assert(game.includes("if(progress.mapId!=='x1'||!isAtTrader())"));
 assert(game.includes("count=a.pieces.length,atBase=progress.mapId==='x1'&&isAtTrader()"));
 assert(server.includes("if(!['x1','x8'].includes(this.mapId)||this.territoryFaction!==p.faction)return false"));
});
