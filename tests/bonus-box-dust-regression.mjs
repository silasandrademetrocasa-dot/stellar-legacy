import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const game=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server/index.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const manifest=fs.readFileSync(path.join(root,'public/assets/v17/manifest.js'),'utf8');
const begin=game.indexOf('// V18.2.4 — BOX BONUS');
const end=game.indexOf('function createOres(){',begin);
assert.ok(begin>0&&end>begin,'Implementação da caixa presente');
const source=game.slice(begin,end);
const events=[];
let seed=0.02;
const ctx={
 Math:Object.create(Math),
 progress:{mapId:'x1',profile:{credits:100,uridium:10},ammo:{lcb10:0,mcb25:0,mcb50:0,sab50:0},stellarDust:0,bonusBoxesByMap:{}},
 state:{bonusBoxes:[],currentMap:{id:'x1',world:{w:6000,h:4500},gate:false}},
 locationStorageKey:()=>ctx.mapKey||'x1:earth',randomMapPosition:()=>({x:2500,y:2200}),
 cloudDirty:false,Date,nowSec:()=>1000, fmt:n=>String(n), resolvedQualityMode:()=> 'low',
 saveGame:()=>events.push('save'),playSfx:()=>{},spawnParticle:()=>{},pushActivity:()=>{},
 telemetryCounter:()=>{},telemetryEconomy:()=>{},titleStatAdd:()=>{},battlePassEvent:()=>{},
 refreshAmmoCounters:()=>{},updateUI:()=>{},addPetXp:()=>{},
 ui:{gateModal:{classList:{contains:()=>true}}},renderGalaxyGate:()=>{}
};
ctx.Math.random=()=>seed;
vm.createContext(ctx);
vm.runInContext(`${source};this.actions={createBonusBoxes,collectBonusBox,updateBonusBoxes,bonusBoxTargetForMap};`,ctx);
function setMap(mapId){
  ctx.mapKey=['x1','x2','x3','x4'].includes(mapId)?`${mapId}:earth`:mapId;
  ctx.progress.mapId=mapId;
  ctx.state.currentMap={id:mapId,world:{w:6000,h:4500},gate:/^gg/.test(mapId)};
  ctx.actions.createBonusBoxes();
}
setMap('x1');
assert.equal(ctx.state.bonusBoxes.length,20,'X-1 nasce com 20 BOX');
assert.equal(ctx.progress.bonusBoxesByMap['x1:earth'].initialized,true);
assert.equal(ctx.cloudDirty,true);
const all=['lcb10','mcb25','mcb50','sab50','credits','uridium','stellarDust'];
for(let kind=0;kind<7;kind++){
  seed=(kind+0.05)/7;
  const box=ctx.state.bonusBoxes[0];
  const before={profile:{...ctx.progress.profile},ammo:{...ctx.progress.ammo},dust:ctx.progress.stellarDust};
  assert.equal(ctx.actions.collectBonusBox(box,kind%2===0),true,`${all[kind]} concedido`);
  assert.equal(ctx.actions.collectBonusBox(box),false,'BOX não pode ser coletada novamente');
  const diffs=[...['lcb10','mcb25','mcb50','sab50'].map(k=>ctx.progress.ammo[k]-before.ammo[k]),
    ctx.progress.profile.credits-before.profile.credits,
    ctx.progress.profile.uridium-before.profile.uridium,
    ctx.progress.stellarDust-before.dust];
  assert.equal(diffs.filter(v=>v>0).length,1,'cada caixa entrega exatamente um prêmio');
  assert.ok(diffs[kind]>0,`recompensa correta: ${all[kind]}`);
  ctx.progress.bonusBoxesByMap['x1:earth'].respawns[0]=Date.now()-100;
  ctx.actions.updateBonusBoxes();
  assert.equal(ctx.state.bonusBoxes.length,20,'reaparecimento após cooldown mantém exatamente 20');
}
// Coleta pendente não reaparece instantaneamente ao relogar.
const box=ctx.state.bonusBoxes[0];
seed=0.99;
ctx.actions.collectBonusBox(box);
assert.equal(ctx.state.bonusBoxes.length,19);
const saved=JSON.parse(JSON.stringify(ctx.progress));
ctx.progress=saved;ctx.state.bonusBoxes=[];
ctx.actions.createBonusBoxes();
assert.equal(ctx.state.bonusBoxes.length,19,'relog não gera caixas extras');
assert.equal(ctx.progress.bonusBoxesByMap['x1:earth'].respawns.length,1);
ctx.progress.bonusBoxesByMap['x1:earth'].respawns[0]=Date.now()-100;
ctx.actions.updateBonusBoxes();
assert.equal(ctx.state.bonusBoxes.length,20,'volta ao limite após cooldown');
// Todos os setores comuns e setores 4-X.
for(const id of ['x1','x2','x3','x4']){
 setMap(id);assert.equal(ctx.state.bonusBoxes.length,20,`${id}: 20 BOX`);
}
for(const id of ['b41','b42','b43']){
 setMap(id);assert.equal(ctx.state.bonusBoxes.length,30,`${id}: 30 BOX`);
}
// Save V18.2.3: setor X com 12 BOX, com uma BOX em cooldown -> 19 ativas até respawn.
ctx.progress.bonusBoxesByMap['x2:earth']={initialized:true,boxes:Array.from({length:11},(_,i)=>({id:`bonus_legacy_x2_${i}`,x:900,y:900})),respawns:[Date.now()+60000]};
setMap('x2');
assert.equal(ctx.state.bonusBoxes.length,19,'migração 12→20 não duplica BOX com cooldown');
assert.equal(ctx.progress.bonusBoxesByMap['x2:earth'].respawns.length,1);
ctx.progress.bonusBoxesByMap['x2:earth'].respawns[0]=Date.now()-100;
ctx.actions.updateBonusBoxes();
assert.equal(ctx.state.bonusBoxes.length,20,'migração mantém o teto de 20 após respawn');
// Battle Maps com save antigo 12 BOX e cooldown -> preenche até 30 respeitando cooldown.
ctx.progress.bonusBoxesByMap.b41={initialized:true,boxes:Array.from({length:10},(_,i)=>({id:`bonus_legacy_b41_${i}`,x:900,y:900})),respawns:[Date.now()+60000,Date.now()+60000]};
setMap('b41');
assert.equal(ctx.state.bonusBoxes.length,28,'migração Battle 12→30 respeita as duas BOX em cooldown');
ctx.progress.bonusBoxesByMap.b41.respawns=[Date.now()-100,Date.now()-100];
ctx.actions.updateBonusBoxes();
assert.equal(ctx.state.bonusBoxes.length,30);
// Portais não podem gerar caixas, nem no update, nem premiar caches antigos.
for(const id of ['ggAlpha','ggBeta','ggGamma']){
 ctx.progress.bonusBoxesByMap[id]={initialized:true,boxes:[{id:`bonus_legacy_${id}`,x:1000,y:1000}],respawns:[Date.now()-100]};
 setMap(id);
 assert.equal(ctx.actions.bonusBoxTargetForMap(),0,`${id} não suporta BOX`);
 assert.equal(ctx.state.bonusBoxes.length,0,`${id} não possui BOX`);
 assert.equal(ctx.progress.bonusBoxesByMap[id],undefined,`${id}: cache antigo removido`);
 assert.equal(ctx.actions.collectBonusBox({id:`bonus_legacy_${id}`}),false,`${id}: prêmio proibido`);
 ctx.actions.updateBonusBoxes();
 assert.equal(ctx.state.bonusBoxes.length,0,`${id}: nunca respawn`);
}
setMap('futureSpaceMap');
assert.equal(ctx.state.bonusBoxes.length,0,'outros mapas sem regra explícita também não criam BOX');
for(const file of ['bonus-box.webp','stellar-dust.webp']){
 assert.ok(fs.existsSync(path.join(root,'public/assets/v18/bonus',file)));
 assert.ok(manifest.includes(file));
}
assert.match(html,/id="gateDustSpinButtons"/);
assert.match(html,/id="gateDustText"/);
assert.match(game,/petLockedCollectionTarget\(\[\.\.\.state\.loot,\.\.\.\(state\.bonusBoxes\|\|\[\]\)\]/);
assert.match(game,/collectBonusBox\(task,true\)/);
assert.match(game,/for\(const box of \[\.\.\.\(state\.bonusBoxes\|\|\[\]\)\]\)/);
assert.match(server,/payment=String\(payload\.payment\|\|'uridium'\)/);
assert.match(server,/const baseUnit=100,unit=payment==='dust'\?1:\(premium\?90:100\)/);
assert.match(server,/state\.stellarDust=balance-cost/);
assert.match(game,/smartVersion:'18\.2\.2'/,'Smart Missions preservadas');
console.log('PASSOU: 20 BOX X1-X4, 30 BOX 4-X, zero em Aurora/Nexus/Eclipse, migração de saves, cooldown sem duplicação, PET, recompensas, giro STL/Poeira, Smart Missions.');
