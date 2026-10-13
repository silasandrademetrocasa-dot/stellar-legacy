import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../public/api.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const start=source.indexOf('const PREMIUM_STAGE_TABS_V18213=');
const end=source.indexOf('async function refreshAndRenderPremium(',start);
assert(start>0&&end>start,'Staging functions present');
const method=source.slice(start,end);
const premiumStageRuntime={state:null,busy:false,buying:false,tab:'subscriptions',error:'',pendingKeys:new Map(),lastOrder:null};
class El {constructor(){this.hidden=true;this.innerHTML='';this.classList={remove(){}};this.textContent='';this.querySelectorAll=()=>[];}}
const ui={premiumProductGrid:new El(),premiumStageTabs:new El(),premiumStageInfo:new El(),premiumModeChip:new El(),premiumModal:{classList:{contains:()=>false}}};
const offers=[
{id:'premium_7d',name:'PREMIUM • 1 SEMANA',category:'premium',billing_mode:'prepaid',price_brl:'14.90',duration_days:7,test_only:true,live_enabled:false},
{id:'premium_30d',name:'PREMIUM • 1 MÊS',category:'premium',billing_mode:'auto_renew',price_brl:'39.90',billing_months:1,test_only:true,live_enabled:false},
{id:'premium_90d',name:'PREMIUM • 3 MESES',category:'premium',billing_mode:'auto_renew',price_brl:'99.90',billing_months:3,test_only:true,live_enabled:false},
{id:'premium_180d',name:'PREMIUM • 6 MESES',category:'premium',billing_mode:'auto_renew',price_brl:'179.90',billing_months:6,test_only:true,live_enabled:false},
{id:'starter_iniciante_v1832',name:'Pacote Iniciante',category:'starter_bundle',billing_mode:'one_time',price_brl:'9.90',test_only:true,live_enabled:false},
{id:'starter_piloto_v1832',name:'Pacote Piloto',category:'starter_bundle',billing_mode:'one_time',price_brl:'24.90',test_only:true,live_enabled:false},
{id:'starter_avancado_v1832',name:'Pacote Avançado',category:'starter_bundle',billing_mode:'one_time',price_brl:'49.90',test_only:true,live_enabled:false},
{id:'battle_pass_monthly',name:'Passe de Temporada',category:'battle_pass',billing_mode:'one_time',price_brl:'19.90',test_only:true,live_enabled:false},
...[1,3,5,10].map((n,i)=>({id:`pass_tiers_${n}_v1832`,name:`Passe +${n}`,category:'pass_tiers',billing_mode:'one_time',tier_quantity:n,price_brl:['2.90','7.90','11.90','19.90'][i],test_only:true,live_enabled:false})),
];
let calls=0,previewCalls=0,confirms=0;
const response={test_mode:true,billing_live:false,rewards_live:false,current_season:{season_key:'2026-10',name:'Temporada Outubro',tier_count:30},offers,test_tiers:null,test_subscription:null};
const ctx={ui,console,Math,Date,Number,String,authenticated:true,premiumRuntime:{state:{is_admin:true}},premiumStageRuntime,
  escHtml:s=>String(s??'').replaceAll('<','&lt;'),fmt:n=>String(n),formatPremiumUntil:s=>String(s||''),
  adminPreviewPremiumStageOnline:async()=>{previewCalls++;return structuredClone(response)},
  adminSimulatePremiumStageOnline:async(id,key)=>{calls++;assert(key.startsWith('stg_'));return {ok:true,duplicate:false,test_only:true,billing_live:false,rewards_live:false,order_id:5,product_id:id}},
  window:{confirm:()=>{confirms++;return true}},showToast:()=>{},renderPremiumShop:()=>ctx.renderPremiumStageV18213(),
};
vm.createContext(ctx);vm.runInContext(`${method}\nthis.renderPremiumStageV18213=renderPremiumStageV18213;this.simulatePremiumStageV18213=simulatePremiumStageV18213;this.loadPremiumStageV18213=loadPremiumStageV18213;`,ctx);
ctx.renderPremiumStageV18213();assert(ui.premiumStageTabs.hidden,'stage must be hidden until verified preview');
await ctx.loadPremiumStageV18213();assert.equal(ui.premiumStageTabs.hidden,false);assert(ui.premiumProductGrid.innerHTML.includes('R$ 39,90'));
assert(ui.premiumProductGrid.innerHTML.includes('R$ 179,90'));
assert(!ui.premiumProductGrid.innerHTML.includes('Pacote Iniciante'));
premiumStageRuntime.tab='bundles';ctx.renderPremiumStageV18213();assert(ui.premiumProductGrid.innerHTML.includes('Pacote Iniciante'));
assert(ui.premiumProductGrid.innerHTML.includes('R$ 49,90'));
premiumStageRuntime.tab='pass';ctx.renderPremiumStageV18213();assert(ui.premiumProductGrid.innerHTML.includes('Passe de Temporada'));
assert(ui.premiumProductGrid.innerHTML.includes('R$ 2,90')); // níveis integrados à aba PASSE
assert(ui.premiumProductGrid.innerHTML.includes('R$ 19,90'));
assert(!ui.premiumStageTabs.innerHTML.includes('LOJA ATUAL'));
response.test_tiers={season_key:'2026-10',purchased_tiers:27};premiumStageRuntime.state=structuredClone(response);ctx.renderPremiumStageV18213();assert(ui.premiumProductGrid.innerHTML.includes('LIMITE DA TEMPORADA'));
response.test_tiers=null;premiumStageRuntime.state=structuredClone(response);premiumStageRuntime.tab='subscriptions';
await ctx.simulatePremiumStageV18213('premium_90d');assert.equal(calls,1);assert.equal(confirms,1);
assert.equal(premiumStageRuntime.lastOrder.id,5);assert.equal(previewCalls,2);
assert(!premiumStageRuntime.pendingKeys.has('premium_90d'));
// Duplicate response omits billing_live and rewards_live in the SQL RPC; must be safely accepted.
ctx.adminSimulatePremiumStageOnline=async()=>({ok:true,duplicate:true,test_only:true,order_id:5});
await ctx.simulatePremiumStageV18213('premium_90d');assert.equal(premiumStageRuntime.lastOrder.duplicate,true);
ctx.premiumRuntime.state={is_admin:false};
const publicPreview={...structuredClone(response),public_preview:true,can_simulate:false,test_tiers:null,test_subscription:null};
premiumStageRuntime.state=publicPreview;ctx.renderPremiumStageV18213();
assert.equal(ui.premiumStageTabs.hidden,false,'authenticated pilots see preview');
assert(ui.premiumProductGrid.innerHTML.includes('EM PREPARAÇÃO'),'readonly button');
assert(ui.premiumProductGrid.innerHTML.includes('disabled'),'readonly disabled');
const priorCalls=calls;await ctx.simulatePremiumStageV18213('premium_30d');assert.equal(calls,priorCalls,'non-admin cannot simulate');
assert(html.includes('id="premiumStageTabs"')&&html.includes('id="premiumStageInfo"'));
assert(api.includes("'/rest/v1/rpc/get_premium_stage_catalog_v1833'"));
assert(api.includes("'/rest/v1/rpc/admin_preview_premium_stage_v1832'"));
assert(api.includes("'/rest/v1/rpc/admin_simulate_premium_checkout_v1832'"));
assert(css.includes('.premium-stage-tab.selected'));
assert(source.includes('renderPremiumStageV18213();'));
assert(source.includes('await loadPremiumStageV18213();'));
console.log('PASS V18.2.13: Stage ADM tabs, pricing, products, tiers, simulation, no duplicate charge, non-admin hidden, no legacy loss');
