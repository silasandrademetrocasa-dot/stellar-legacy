// Smoke test sem navegador: garante que a tela vincula o cupom SQL até mesmo
// se o catálogo Premium estiver indisponível e não entrega prêmio localmente.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const start=source.indexOf('function renderPremiumShop(){');
const end=source.indexOf('async function refreshAndRenderPremium(',start);
assert.ok(start>=0&&end>start);
const method=source.slice(start,end);
const input={value:'AUX-SENT-TEST-1234',onkeydown:null};
const button={disabled:false,textContent:'RESGATAR',onclick:null};
const calls={redeem:0,apply:0,legacy:0};
const ctx={
  document:{getElementById(id){return id==='premiumCouponRedeem'?button:input;}},
  ui:{premiumProductGrid:{innerHTML:''},premiumBenefits:{innerHTML:''},premiumModeChip:{classList:{toggle(){}},textContent:''}},
  premiumRuntime:{state:{}},PREMIUM_EVENT_COUPONS:{EVENTO7D:{}},
  premiumCatalogForRender:()=>[],effectivePremiumUntilMs:()=>0,
  premiumActive:()=>false,premiumCanPurchase:()=>false,premiumPassActive:()=>false,
  battlePassSeasonKey:()=>null,escHtml:String,
  formatPremiumUntil:()=>'',
  queueEconomy:async cb=>await cb(),syncBeforeEconomy:async()=>{},
  cloudBusy:false,cloudDirty:false,
  redeemGameCouponOnline:async code=>{calls.redeem++;assert.equal(code,'AUX-SENT-TEST-1234');return {ok:true,title:'AUX-9 + Sentinela',state:{pet:{owned:true,gearsOwned:{guard:true}}}};},
  installEconomyState:state=>{calls.apply++;assert.equal(state.pet.gearsOwned.guard,true);},
  syncSharedUniversePlayer(){},showToast(){},pushActivity(){},
  refreshAndRenderPremium:async()=>{},
  redeemPremiumCouponLocal:()=>{calls.legacy++;},flushCloudSave:async()=>{},
  progress:{profile:{level:1}},
};
vm.createContext(ctx);
vm.runInContext(`${method}\nthis.testRender=renderPremiumShop;`,ctx);
ctx.testRender();
assert.equal(typeof button.onclick,'function','cupom deve funcionar mesmo sem catálogo');
await button.onclick();
assert.equal(calls.redeem,1);
assert.equal(calls.apply,1);
assert.equal(calls.legacy,0);
assert.equal(input.value,'');
console.log('OK — botão SQL ligado, prêmio remoto, catálogo vazio preservado.');
