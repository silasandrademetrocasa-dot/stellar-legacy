import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyPilotSkillUpgradeV102,applyPilotSkillResetV102,PILOT_SKILLS_SERVER_V102,withEconomySaveRetryV102,retryableEconomySaveConflictV102} from '../server/pilot-economy-v102.js';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const fresh=()=>({profile:{credits:500_000_000,uridium:80_000},pilotBio:{skills:{},totalPoints:5,logDisks:300,resetCount:0}});

test('V102: 25 habilidades e valores coincidem com o catálogo usado pelo jogo',()=>{
 const game=read('public/game.js');
 const src=game.match(/const PILOT_SKILLS=\{([\s\S]*?)\n\};/)?.[1]||'';
 const definitions=[...src.matchAll(/^\s+(\w+):\{id:'\w+'.*?max:(\d+).*?creditBase:(\d+).*?requires:(null|'\w+')\}/gm)];
 assert.equal(definitions.length,25);
 for(const [,id,max,price,requires] of definitions){
   const row=PILOT_SKILLS_SERVER_V102[id];assert.ok(row,id);
   assert.equal(row.max,Number(max),id);assert.equal(row.creditBase,Number(price),id);
   assert.equal(row.requires,requires==='null'?null:requires.slice(1,-1),id);
 }
});
test('V102: upgrade desconta uma vez, respeita PP, requisitos e máximo',()=>{
 const s=fresh();const a=applyPilotSkillUpgradeV102(s,'hull1');assert.equal(a.level,1);assert.equal(a.cost,2_000_000);
 assert.equal(s.profile.credits,498_000_000);assert.equal(s.pilotBio.skills.hull1,1);
 assert.throws(()=>applyPilotSkillUpgradeV102(s,'engineering'),/Pr[eé]-requisito/);
 applyPilotSkillUpgradeV102(s,'hull1');assert.throws(()=>applyPilotSkillUpgradeV102(s,'hull1'),/máximo/);
 assert.throws(()=>applyPilotSkillUpgradeV102(s,'inexistent'),/desconhecida/);
 assert.equal(s.profile.credits,494_000_000);
});
test('V102: reset autoritativo preserva PP, desconta STL e recomeça árvore',()=>{
 const s=fresh();applyPilotSkillUpgradeV102(s,'tactics');
 const before=s.profile.uridium;
 const result=applyPilotSkillResetV102(s);
 assert.equal(result.cost,1000);assert.equal(s.profile.uridium,before-1000);
 assert.equal(s.pilotBio.skills.tactics,0);assert.equal(s.pilotBio.totalPoints,5);assert.equal(s.pilotBio.resetCount,1);
 assert.throws(()=>applyPilotSkillResetV102(s),/Nenhum ponto/);
});
test('V102: erro SAVE_NPC_STALE faz reread e recalcula antes de cobrar, uma única cobrança',async()=>{
 let persisted=fresh(),calls=0;
 const output=await withEconomySaveRetryV102(async()=>{
   calls++;const clone=structuredClone(persisted);
   const result=applyPilotSkillUpgradeV102(clone,'hull1');
   if(calls===1){persisted.serverNpcRewardRevision=1;throw new Error('SAVE_NPC_STALE');}
   persisted=clone;return result;
 },{maxAttempts:3});
 assert.equal(calls,2);assert.equal(output.cost,2_000_000);
 assert.equal(persisted.profile.credits,498_000_000);
 assert.equal(persisted.pilotBio.skills.hull1,1);
});
test('V102: falha definitiva não é repetida automaticamente',async()=>{
 let calls=0;
 await assert.rejects(withEconomySaveRetryV102(async()=>{calls++;throw Error('Saldo insuficiente')},{maxAttempts:3}),/Saldo insuficiente/);
 assert.equal(calls,1);assert.equal(retryableEconomySaveConflictV102(new Error('SAVE_NPC_STALE')),true);
 assert.equal(retryableEconomySaveConflictV102(new Error('ECONOMY_CHARGED')),false);
});
test('V102: pesquisa é confirmada no servidor e Arena expõe divergências',()=>{
 const g=read('public/game.js'),server=read('server/index.js');
 assert.match(g,/runEconomyAction\('pilot_skill_upgrade',\{id\}\)/);
 assert.match(g,/runEconomyAction\('pilot_skill_reset',\{\}\)/);
 assert.doesNotMatch(g,/progress\.pilotBio\.skills\[id\]=lv\+1/);
 assert.match(server,/applyPilotSkillUpgradeV102\(state,/);
 assert.match(server,/withEconomySaveRetryV102/);
 assert.match(g,/\[arena-v102\] ataque confirmado, mas contador diário não diminuiu/);
});
