import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const js=readFileSync(new URL('public/game.js',root),'utf8');
const html=readFileSync(new URL('public/index.html',root),'utf8');
const css=readFileSync(new URL('public/style.css',root),'utf8');
const mainSource=js.slice(js.indexOf('function battlePassDailyMissions(){'),js.indexOf('function battlePassTier(){'));
function getMissions(level){
 const context={progress:{profile:{level}},normalizeBattlePass(){},battlePassDailyPoints(){return 100}};
 vm.createContext(context);return vm.runInContext(`${mainSource}\nbattlePassDailyMissions()`,context);
}
test('novatos têm missões FREE sem AUX e Premium tem 1 extra',()=>{
 const missions=getMissions(1);assert.equal(missions.length,8);
 assert.equal(missions.filter(m=>!m.premium).length,7);
 assert.equal(missions.filter(m=>m.premium).length,1);
 assert.deepEqual(Array.from(missions.map(m=>m.kind)),['kill','box','bonusBox','sell','ammoUse','damage','dropResource','attack']);
 assert.ok(missions.every(m=>m.target>0));
 for(const m of missions.filter(m=>!m.premium))assert.doesNotMatch(m.desc,/aux-9 obrigatório|somente aux|exige aux/i);
});
test('metas aumentam gradualmente sem penalizar recém-chegados',()=>{
 const fresh=getMissions(1),veteran=getMissions(30);
 const f=Object.fromEntries(fresh.map(m=>[m.id,m.target])),v=Object.fromEntries(veteran.map(m=>[m.id,m.target]));
 assert.equal(f.kills,15);assert.equal(v.kills,50);
 assert.equal(f.bonusBoxes,8);assert.equal(v.bonusBoxes,35);
 for(const key of Object.keys(f))assert.ok(f[key]<=v[key],`difficulty ${key}`);
});
test('progresso premium só recebe pontos com Passe ativo',()=>{
 assert.match(js,/mission\.premium&&!premiumPassActive\(\)/);
 assert.match(js,/mission-locked/);
 assert.match(js,/premium_attacks/);
});
test('contagem de missão usa apenas eventos reais de coleta, venda e disparos',()=>{
 assert.match(js,/battlePassEvent\('bonusBox',1\)/);
 assert.match(js,/battlePassEvent\('sell',qty\)/);
 assert.match(js,/battlePassEvent\('sell',amount\)/);
 assert.match(js,/battlePassEvent\('ammoUse',firingCount\)/);
 assert.match(js,/battlePassEvent\('ammoUse',1\)/);
});
test('tela de carregamento cinematográfica é leve e tem saída segura',()=>{
 assert.match(html,/id="stellarBootSplash"/);
 assert.match(js,/boot\(\)\.finally/);
 assert.match(html,/stellarSplashFinish/);
 assert.match(css,/stellar-battle-loading\.webp/);
 assert.ok(statSync(new URL('public/assets/loading/stellar-battle-loading.webp',root)).size<650_000);
 assert.match(html,/setTimeout\(\(\)=>\{if\(!ended\)window\.stellarSplashFinish\(\)\},9000\)/);
});
test('fluxos de loja não mostram o fornecedor interno ao jogador',()=>{
 assert.match(js,/Preço confirmado/);
 assert.match(js,/function safePilotMessage\(raw\)/);
 assert.match(js,/function showToast\(msg,activityType='system'\)/);
 assert.doesNotMatch(js,/detail:'Preço validado no Supabase/);
});
