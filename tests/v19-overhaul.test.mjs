import assert from 'node:assert/strict';
import { readFileSync,existsSync,statSync,readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {test} from 'node:test';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=x=>readFileSync(resolve(root,x),'utf8');
const game=read('public/game.js'),html=read('public/index.html'),css=read('public/style.css'),manifest=read('public/assets/v17/manifest.js');
const pkg=JSON.parse(read('package.json'));
function segment(after,before){const a=game.indexOf(after),b=game.indexOf(before,a);assert(a>=0&&b>a,`${after} -> ${before}`);return game.slice(a,b);}

test('V19 identifica a versão e mantém assets, API e backend ativos',()=>{
 assert.equal(pkg.version,'19.0.16');
 assert.match(html,/game\.js\?v=19\.0\.16/);assert.match(html,/style\.css\?v=19\.0\.16/);
 assert.match(read('server/index.js'),/version: '19\.0\.16'/);
 assert.match(game,/login|signInWithGoogle/i);
 assert.match(read('public/api.js'),/oauth/i);
 assert.match(read('public/privacidade.html'),/Privacidade/);
});

test('Loja Premium única e segura; botão legado foi removido da vitrine',()=>{
 const tabs=segment('const PREMIUM_STAGE_TABS_V18213=', 'function premiumStagePriceV18213(');
 assert.doesNotMatch(tabs,/LOJA ATUAL|legacy/);
 assert.match(tabs,/PASSE \+ NÍVEIS/);
 assert.match(tabs,/EQUIPAMENTOS/);
 assert.doesNotMatch(game,/\[data-premium-buy\]/);
 assert.match(game,/Carregando a vitrine Premium segura/);
 assert.match(game,/temporariamente indisponível/);
});

test('Avisos compactos aparecem como rodapé expansível, com cupons preservados',()=>{
 assert.doesNotMatch(html,/class="arena-rule-banner"/);
 assert.doesNotMatch(html,/class="auction-rule-banner"/);
 assert.match(html,/<details class="v19-help-footer"/);
 assert.match(html,/<details class="v19-help-footer v19-arena-help"/);
 assert.match(game,/premium-coupon-panel v19-help-footer/);
 assert.match(game,/id="premiumCouponRedeem"/);
 assert.match(game,/id="premiumCouponInput"/);
 assert.match(css,/V19 • LIMPEZA DE INTERFACE/);
});

test('Sprites da munição separados: SIP-2 diferente de PLS-3; EXTRA equipado tem arte real',()=>{
 const ids=['pls1','pls2','pls3','pls4','sip2','cmt1','cmt2','cmt3','cmt4'];
 for(const id of ids){const p=resolve(root,`public/assets/v19/ammo/${id}.webp`);assert(existsSync(p),id);assert(statSync(p).size>8000,id);assert(manifest.includes(`/assets/v19/ammo/${id}.webp`),id);}
 assert(manifest.includes("sab50: '/assets/v19/ammo/sip2.webp'"));
 assert(manifest.includes("mcb50: '/assets/v19/ammo/pls3.webp'"));
 assert(manifest.includes("remoteTraderCpuElite: '/assets/v19/equipment/terminal-mercante-remoto.webp'"));
 assert(statSync(resolve(root,'public/assets/v19/equipment/terminal-mercante-remoto.webp')).size>50000);
});

test('A árvore ATAQUE usa habilidades reais de nave, mantendo 9 IDs e 50 PP',()=>{
 const offensive=segment("  detonation1:{id:'detonation1'","\n};\nfunction freshPilotBio");
 assert.equal((offensive.match(/branch:'offense'/g)||[]).length,9);
 assert.doesNotMatch(offensive,/Nova Burst|AUX-9/);
 for(const term of ['Potência Laser I','Ruptura de Escudos','Mira de Mísseis','Potência Laser II','Mísseis Potentes','Caçador de Aliens','Precisão Crítica','Eletro-Óptica','Combate entre Pilotos'])assert(offensive.includes(term),term);
 assert.match(game,/const PILOT_POINT_MAX=50/);
 assert.match(game,/function pilotKamikazeDamageBonus\(\)\{return 0;\}/);
 assert.match(game,/function pilotKamikazeRadiusBonus\(\)\{return 0;\}/);
 assert.match(game,/function pvpLaserBase\(/);
});

test('PP investidos em versões antigas continuam contando sem reset automático',()=>{
 const declarations=segment('const PILOT_POINT_MAX=50;', '// ===================== V17.9.3 — CONQUISTAS');
 const sandbox={progress:{pilotBio:{totalPoints:18,logDisks:190,resetCount:1,skills:{detonation1:2,explosives:3,detonation2:1,bounty2:2}}},localStorage:{getItem(){return '{}'},setItem(){}},Math,Number,Object,JSON};
 vm.createContext(sandbox);
 vm.runInContext(declarations,sandbox);
 sandbox.normalizePilotBio();
 assert.equal(sandbox.progress.pilotBio.skills.detonation1,2);
 assert.equal(sandbox.progress.pilotBio.skills.explosives,3);
 assert.equal(sandbox.progress.pilotBio.skills.detonation2,1);
 assert.equal(sandbox.pilotSpentPoints(),8);
 assert.equal(sandbox.pilotAvailablePoints(),10);
 assert.equal(sandbox.pilotLaserPowerBonus(),.06);
 assert.equal(sandbox.pilotShieldPressureBonus(),.06);
 assert.equal(sandbox.pilotBattleLaserBonus(),.04);
 assert.equal(sandbox.pilotKamikazeDamageBonus(),0);
 assert.equal(sandbox.pilotKamikazeRadiusBonus(),0);
});

test('Limpeza de Git não exclui SQL, scripts ou históricos de versões anteriores',()=>{
 assert(existsSync(resolve(root,'sql/CURRENT_BACKEND.sql')));
 assert(existsSync(resolve(root,'.github')));
 assert(existsSync(resolve(root,'docs/historico-v18/V18_2_16_GOOGLE_OAUTH.md')));
 assert(existsSync(resolve(root,'docs/historico-v18/LEIA_PRIMEIRO_V18_2_15.txt')));
 assert(existsSync(resolve(root,'tests/google-oauth-v18216.test.mjs')));
 assert(existsSync(resolve(root,'public/termos.html')));
});
