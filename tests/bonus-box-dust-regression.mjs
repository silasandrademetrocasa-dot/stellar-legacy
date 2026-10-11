import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const game=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server/index.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const manifest=fs.readFileSync(path.join(root,'public/assets/v17/manifest.js'),'utf8');
const begin=game.indexOf('// V18.2.3 — BOX BONUS');
const end=game.indexOf('function createOres(){',begin);
assert.ok(begin>0&&end>begin,'Implementação da caixa presente');
const source=game.slice(begin,end);
const events=[];
let seed=0.02;
const ctx={
 Math:Object.create(Math),
 progress:{profile:{credits:100,uridium:10},ammo:{lcb10:0,mcb25:0,mcb50:0,sab50:0},stellarDust:0,bonusBoxesByMap:{}},
 state:{bonusBoxes:[],currentMap:{world:{w:6000,h:4500},gate:false}},
 locationStorageKey:()=>ctx.mapKey||'x1:earth',randomMapPosition:()=>({x:2500,y:2200}),
 cloudDirty:false,Date,nowSec:()=>1000, fmt:n=>String(n), resolvedQualityMode:()=> 'low',
 saveGame:()=>events.push('save'),playSfx:()=>{},spawnParticle:()=>{},pushActivity:()=>{},
 telemetryCounter:()=>{},telemetryEconomy:()=>{},titleStatAdd:()=>{},battlePassEvent:()=>{},
 refreshAmmoCounters:()=>{},updateUI:()=>{},addPetXp:()=>{},
 ui:{gateModal:{classList:{contains:()=>true}}},renderGalaxyGate:()=>{}
};
ctx.Math.random=()=>seed;
vm.createContext(ctx);
vm.runInContext(`${source};this.actions={createBonusBoxes,collectBonusBox,updateBonusBoxes};`,ctx);
ctx.actions.createBonusBoxes();
assert.equal(ctx.state.bonusBoxes.length,12,'12 caixas no setor inicial');
assert.equal(ctx.progress.bonusBoxesByMap['x1:earth'].initialized,true);
assert.equal(ctx.cloudDirty,true);
const all=['lcb10','mcb25','mcb50','sab50','credits','uridium','stellarDust'];
for(let kind=0;kind<7;kind++){
  // premiação e quantidade usam o mesmo Math.random, portanto determinísticos neste teste
  seed=(kind+0.05)/7;
  const box=ctx.state.bonusBoxes[0];
  const before={profile:{...ctx.progress.profile},ammo:{...ctx.progress.ammo},dust:ctx.progress.stellarDust};
  assert.equal(ctx.actions.collectBonusBox(box,kind%2===0),true,`${all[kind]} concedido`);
  assert.equal(ctx.actions.collectBonusBox(box),false,'id de caixa não pode ser coletado novamente');
  const diffs=[...['lcb10','mcb25','mcb50','sab50'].map(k=>ctx.progress.ammo[k]-before.ammo[k]),
    ctx.progress.profile.credits-before.profile.credits,
    ctx.progress.profile.uridium-before.profile.uridium,
    ctx.progress.stellarDust-before.dust];
  assert.equal(diffs.filter(v=>v>0).length,1,'cada caixa entrega exatamente um tipo de prêmio');
  assert.ok(diffs[kind]>0,`recompensa correta: ${all[kind]}`);
  ctx.progress.bonusBoxesByMap['x1:earth'].respawns[0]=Date.now()-100;
  ctx.actions.updateBonusBoxes();
  assert.equal(ctx.state.bonusBoxes.length,12,'reaparecimento após cooldown');
}
const box=ctx.state.bonusBoxes[0];
seed=0.99;
ctx.actions.collectBonusBox(box);
assert.equal(ctx.state.bonusBoxes.length,11);
const saved=JSON.parse(JSON.stringify(ctx.progress));
ctx.progress=saved;ctx.state.bonusBoxes=[];ctx.actions.createBonusBoxes();
assert.equal(ctx.state.bonusBoxes.length,11,'relog não cria caixa adicional');
ctx.mapKey='ggAlpha';ctx.state.currentMap.gate=true;ctx.actions.createBonusBoxes();
assert.equal(ctx.state.bonusBoxes.length,6,'portal recebe 6 caixas');
ctx.mapKey='b41';ctx.state.currentMap.gate=false;ctx.actions.createBonusBoxes();
assert.equal(ctx.state.bonusBoxes.length,12,'battle maps recebem 12 caixas');

for(const [asset,file] of [['bonus-box.webp','bonus-box.webp'],['stellar-dust.webp','stellar-dust.webp']]){
 assert.ok(fs.existsSync(path.join(root,'public/assets/v18/bonus',file)));
 assert.ok(manifest.includes(asset));
}
assert.match(html,/id="gateDustSpinButtons"/);
assert.match(html,/id="gateDustText"/);
assert.match(game,/petLockedCollectionTarget\(\[\.\.\.state\.loot,\.\.\.\(state\.bonusBoxes\|\|\[\]\)\]/);
assert.match(game,/collectBonusBox\(task,true\)/);
assert.match(game,/for\(const box of \[\.\.\.\(state\.bonusBoxes\|\|\[\]\)\]\)/);
assert.match(server,/payment=String\(payload\.payment\|\|'uridium'\)/);
assert.match(server,/const baseUnit=100,unit=payment==='dust'\?1:\(premium\?90:100\)/);
assert.match(server,/state\.stellarDust=balance-cost/);
assert.match(game,/smartVersion:'18\.2\.2'/,'migração das missões permanece inalterada');
console.log('PASSOU: 7 recompensas únicas, coleta exclusiva, respawn, relog, mapas normais e gate, PET, UI, giro Poeira/STL e Smart Missions preservadas.');
