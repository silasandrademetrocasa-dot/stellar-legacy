#!/usr/bin/env node
// V47.7.6: economy/UI stability update. Strict anchors; no data/schema mutation.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='47.7.5',NEW='47.7.6';let modified=0;
const read=f=>readFileSync(resolve(root,f),'utf8');
function edit(file,fn){const old=read(file),now=fn(old);if(old!==now){writeFileSync(resolve(root,file),now);modified++;}}
function once(s,needle,replacement,label){if(s.includes(replacement))return s;const count=s.split(needle).length-1;if(count!==1)throw Error(`V47.7.6 ${label}: expected 1 anchor, got ${count}`);return s.replace(needle,replacement);}
function all(dir){return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?all(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);}
if(JSON.parse(read('package.json')).version!==NEW)throw Error('Use V47.7.6 incremental patch over 47.7.5');
if(!read('public/modules/sale-policy-v4776.js').includes('saleQuoteV4776'))throw Error('Missing resale policy');
if(!read('public/modules/stellar-dialog-v4776.js').includes('stellarConfirmV4776'))throw Error('Missing modal module');
edit('server/index.js',s=>{
 if(!s.includes("from '../public/modules/sale-policy-v4776.js'"))s="import {saleQuoteV4776} from '../public/modules/sale-policy-v4776.js';\n"+s;
 const oldInv="const unit=Math.max(1,Math.floor((Number(row.price)||0)*.5)),total=unit*qty,currency=String(row.currency)==='uridium'?'uridium':'credits';";
 const newInv="const quote=saleQuoteV4776(row);if(!quote.available)throw Object.assign(new Error('Item sem cotação de revenda no catálogo.'),{status:409});const unit=quote.unit,total=unit*qty,currency=quote.currency;";
 s=once(s,oldInv,newInv,'authoritative inventory sale');
 const oldDrone="const refund=Math.max(1,Math.floor((Number(row.price)||0)*.5)),currency=String(row.currency)==='uridium'?'uridium':'credits';";
 const newDrone="const quote=saleQuoteV4776(row);if(!quote.available)throw Object.assign(new Error('Drone sem cotação de revenda.'),{status:409});const refund=quote.unit,currency=quote.currency;";
 s=once(s,oldDrone,newDrone,'authoritative drone sale');
 return once(s,`const RELEASE_VERSION = '${OLD}'`,`const RELEASE_VERSION = '${NEW}'`,'server version');
});
edit('public/game.js',s=>{
 if(!s.includes("from './modules/sale-policy-v4776.js?v="+NEW+"'"))s="import {saleQuoteV4776} from './modules/sale-policy-v4776.js?v="+NEW+"';\nimport {stellarConfirmV4776,stellarPromptV4776} from './modules/stellar-dialog-v4776.js?v="+NEW+"';\n"+s;
 s=once(s,
   "function itemSellValue(item){if(!item)return 0;const key=item.type==='drone'?`drone:${item.id}`:`item:${item.id}`,row=liveCatalog(key);return row?Math.max(1,Math.floor((Number(row.price)||0)*.5)):0;}",
   "function itemSellQuoteV4776(item){if(!item)return saleQuoteV4776(null);const key=item.type==='drone'?`drone:${item.id}`:`item:${item.id}`;return saleQuoteV4776(liveCatalog(key));}\nfunction itemSellValue(item){return itemSellQuoteV4776(item).unit;}\nfunction itemSellCaptionV4776(item){const q=itemSellQuoteV4776(item);return !q.available?'VENDA INDISPONÍVEL':q.elite?'Vender Elite':'Vender 50%';}",
   'shared storefront sale preview');
 s=once(s,
  "  const total=itemSellValue(item)*qty;\n  openSaleConfirm({title:'Vender equipamento?'",
  "  const total=itemSellValue(item)*qty;if(total<=0){showToast('Este item não tem cotação de revenda publicada no ADM.');return;}\n  openSaleConfirm({title:'Vender equipamento?'",
  'safe missing-price inventory guard');
 s=once(s,
  "  const d=progress.drones.find(x=>x.id===droneId);if(!d)return;const model=ITEMS[d.type],refund=itemSellValue(model);\n  openSaleConfirm({title:'Vender drone?'",
  "  const d=progress.drones.find(x=>x.id===droneId);if(!d)return;const model=ITEMS[d.type],refund=itemSellValue(model);if(!refund){showToast('Drone sem cotação de revenda publicada.');return;}\n  openSaleConfirm({title:'Vender drone?'",
  'safe missing-price drone guard');
 s=once(s,
  "  const item=id?ITEMS[id]:null;if(!item)return;const refund=itemSellValue(item);\n  openSaleConfirm({title:'Vender equipamento equipado?'",
  "  const item=id?ITEMS[id]:null;if(!item)return;const refund=itemSellValue(item);if(!refund){showToast('Este extra/equipamento não tem cotação de revenda no ADM.');return;}\n  openSaleConfirm({title:'Vender equipamento equipado?'",
  'safe equipped item quote');
 s=once(s,
  "  const list=kind==='laser'?progress.pet?.lasers:progress.pet?.shields;const id=list?.[index],item=id?ITEMS[id]:null;if(!item)return;const refund=itemSellValue(item);\n  openSaleConfirm({title:'Vender equipamento do AUX-9?'",
  "  const list=kind==='laser'?progress.pet?.lasers:progress.pet?.shields;const id=list?.[index],item=id?ITEMS[id]:null;if(!item)return;const refund=itemSellValue(item);if(!refund){showToast('Item sem cotação de revenda no ADM.');return;}\n  openSaleConfirm({title:'Vender equipamento do AUX-9?'",
  'safe pet item quote');
 // Only selling previews change; no shop checkout currency is touched.
 const currencyOld='currency:item.currency,onConfirm:';const currencyCount=s.split(currencyOld).length-1;
 if(currencyCount!==3 && (currencyCount!==0||s.split("currency:'credits',onConfirm:").length-1<3))throw Error(`Expected 3 item sale previews; got ${currencyCount}`);
 if(currencyCount===3)s=s.replaceAll(currencyOld,'currency:\'credits\',onConfirm:');
 const modelOld='currency:model.currency,onConfirm:';
 if(s.split(modelOld).length-1!==1&&!s.includes("currency:'credits',onConfirm:()=>performSellDrone"))throw Error('Expected 1 drone sale preview');
 if(s.includes(modelOld))s=s.replace(modelOld,"currency:'credits',onConfirm:");
 s=s.replaceAll('O item será removido do slot e vendido por 50% do valor base.','O item será removido do slot e vendido conforme a política de revenda (Elite em créditos).');
 s=s.replaceAll('vendido por 50% do valor base.','vendido conforme a política de revenda (Elite em créditos).');
 const sellTitle='sell.textContent=`Vender 50% • ${fmt(itemSellValue(item))} ${item.currency===\'uridium\'?\'STL\':\'CR\'}`;';
 s=once(s,sellTitle,'sell.textContent=`${itemSellCaptionV4776(item)} • ${fmt(itemSellValue(item))} CR`;sell.disabled=itemSellValue(item)<=0;sell.title=sell.disabled?\'Sem preço publicado pelo ADM\':\'Venda paga somente créditos\';','inventory selling label');
 const slotText='sell.textContent=`Vender 50%`;sell.title=`${fmt(itemSellValue(item))} ${item.currency===\'uridium\'?\'STL\':\'CR\'}`;';
 s=once(s,slotText,'sell.textContent=itemSellCaptionV4776(item);sell.title=`${fmt(itemSellValue(item))} CR`;sell.disabled=itemSellValue(item)<=0;','slot selling label');
 // Replace native blocking confirms in UI actions with non-blocking game-styled dialogs.
 // All of the call sites below are inside async functions or the event handlers upgraded next.
 for(const [needle,value] of [
  ['function applyBattlePresetV3030(kind){','async function applyBattlePresetV3030(kind){'],
  ['function deleteBattlePresetV3040(kind){','async function deleteBattlePresetV3040(kind){'],
  ["  b.onclick=()=>{if(!canChangeEquipment()){showToast('Somente na base X-1');return;}if(window.confirm(","  b.onclick=async()=>{if(!canChangeEquipment()){showToast('Somente na base X-1');return;}if(window.confirm("],
  ['if(ui.warfrontContent)ui.warfrontContent.onclick=e=>{','if(ui.warfrontContent)ui.warfrontContent.onclick=async e=>{'],
  ['if(ui.adminRuntimeEventsGrid)ui.adminRuntimeEventsGrid.onclick=e=>{','if(ui.adminRuntimeEventsGrid)ui.adminRuntimeEventsGrid.onclick=async e=>{']
 ])s=once(s,needle,value,`async wrapper ${needle.slice(0,28)}`);
 let total=0;
 s=s.replace(/\b(?:window\.)?confirm\s*\(/g,()=>{total++;return 'await stellarConfirmV4776('});
 s=s.replace(/\b(?:window\.)?prompt\s*\(/g,()=>{total++;return 'await stellarPromptV4776('});
 if((total<20||total>40) && !(total===0&&s.includes('stellarConfirmV4776(')&&s.includes('stellarPromptV4776(')))throw Error(`Expected approx 27 native confirmation prompts in game, found ${total}`);
 // Restore target info visibility at 176px when collapsed: user explicitly prefers old mini-panel.
 s=once(s,
   "  const anyExpanded=visible.some(el=>!el.classList.contains('collapsed'));",
   "  // Compact Target Lock still needs room for the name and expand button.\n  const anyExpanded=visible.some(el=>el===ui.targetLockHud||!el.classList.contains('collapsed'));",
   'restored Target Lock width logic');
 // World-boss focus HUD can always be minimized, including Fury phases.
 const bossMarker='function updateBossHud(){';
 const bossAddon=`const BOSS_HUD_MINI_KEY_V4776='stellar_boss_hud_mini_v4776';
let bossHudMiniV4776=false;
try{bossHudMiniV4776=localStorage.getItem(BOSS_HUD_MINI_KEY_V4776)==='1'}catch{}
function setBossHudMiniV4776(value){bossHudMiniV4776=!!value;try{localStorage.setItem(BOSS_HUD_MINI_KEY_V4776,bossHudMiniV4776?'1':'0')}catch{}
 ui.bossPhaseHud?.classList.toggle('collapsed',bossHudMiniV4776);
 const button=document.getElementById('bossPhaseToggleV4776');if(button){button.textContent=bossHudMiniV4776?'▸':'▾';button.setAttribute('aria-expanded',String(!bossHudMiniV4776));button.setAttribute('aria-label',bossHudMiniV4776?'Expandir painel de Boss':'Minimizar painel de Boss');}
}
document.getElementById('bossPhaseToggleV4776')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setBossHudMiniV4776(!bossHudMiniV4776)});
setBossHudMiniV4776(bossHudMiniV4776);
`;
 s=once(s,bossMarker,bossAddon+bossMarker,'boss hud collapse');
 // Do not hard reload after a SQL RPC: refresh local economy snapshot while keeping position, game and websocket.
 s=once(s,'async function runEconomyAction(action,payload={},options={}){',
 `window.stellarEconomySyncBeforeV4776=async()=>{if(authenticated&&progress)await syncBeforeEconomy()};
window.stellarEconomySyncAfterV4776=async()=>{
 if(!authenticated||!progress)return;
 await waitCloudIdle();const remote=await loadCloudSave();if(remote?.state)installEconomyState(remote.state);
};
async function runEconomyAction(action,payload={},options={}){`,'economy sync bridge');
 return s;
});
edit('public/index.html',s=>{
 return once(s,
 `<div class="boss-phase-top"><span id="bossPhaseName">BOSS</span><b id="bossPhaseLabel">FASE I</b></div>`,
 `<div class="boss-phase-top"><span id="bossPhaseName">BOSS</span><b id="bossPhaseLabel">FASE I</b><button type="button" class="tactical-collapse-btn" id="bossPhaseToggleV4776" aria-label="Minimizar painel de Boss" aria-expanded="true" title="Ocultar/expandir informações do Boss">▾</button></div>`,
 'boss toggle button');
});
const css=`
/* V47.7.6 — restore the previous readable collapsed NPC target panel. */
#rightHudStack > #targetLockHud.collapsed{
  box-sizing:border-box!important;width:176px!important;min-width:176px!important;max-width:176px!important;
  height:auto!important;min-height:65px!important;max-height:90px!important;
  padding:6px 8px!important;margin:0!important;overflow:hidden!important;align-self:flex-end!important;
}
#rightHudStack > #targetLockHud.collapsed .target-lock-head{
  display:flex!important;width:100%!important;min-width:0!important;max-width:none!important;
  height:auto!important;min-height:28px!important;justify-content:space-between!important;gap:4px!important;
}
#rightHudStack > #targetLockHud.collapsed .target-lock-head>span:first-child{display:inline!important;font-size:8px!important;}
#rightHudStack > #targetLockHud.collapsed .target-lock-head-actions{width:auto!important;max-width:none!important;min-width:0!important;height:auto!important;gap:3px!important;}
#rightHudStack > #targetLockHud.collapsed .target-lock-head-actions>b{display:inline!important;}
#rightHudStack > #targetLockHud.collapsed #targetLockToggle{
  width:28px!important;height:28px!important;min-width:28px!important;flex:0 0 28px!important;
  border:1px solid rgba(95,210,245,.3)!important;border-radius:6px!important;
}
#rightHudStack > #targetLockHud.collapsed .target-lock-main{display:block!important;overflow:hidden!important;max-height:30px!important;}
#rightHudStack > #targetLockHud.collapsed .target-lock-name{display:block!important;font-size:10px!important;margin:2px 0!important;}
#rightHudStack > #targetLockHud.collapsed .target-lock-detail,
#rightHudStack > #targetLockHud.collapsed #nextNpcTargetV32,
#rightHudStack > #targetLockHud.collapsed .target-lock-portrait-wrap{display:none!important;}
body.mobile-landscape-pro #rightHudStack > #targetLockHud.collapsed{width:176px!important;min-width:176px!important;max-width:176px!important;max-height:90px!important;}
body.mobile-landscape-pro .right-hud-stack:has(> #targetLockHud.collapsed:not(.hidden)){width:176px!important;max-width:176px!important;}
/* Fury and normal bosses can hide behind a single reachable control. */
#bossPhaseToggleV4776{display:grid!important;place-items:center;flex:0 0 28px;width:28px;height:28px;pointer-events:auto!important;touch-action:manipulation;z-index:2;}
.boss-phase-hud{pointer-events:none;}
.boss-phase-hud #bossPhaseToggleV4776{pointer-events:auto;}
.boss-phase-hud.collapsed{
  box-sizing:border-box!important;position:fixed!important;left:auto!important;right:calc(env(safe-area-inset-right,0px) + 54px)!important;
  top:calc(env(safe-area-inset-top,0px) + 58px)!important;bottom:auto!important;transform:none!important;
  width:42px!important;min-width:42px!important;max-width:42px!important;
  height:42px!important;min-height:42px!important;max-height:42px!important;
  padding:5px!important;border-radius:10px!important;overflow:hidden!important;pointer-events:none!important;
}
.boss-phase-hud.collapsed .boss-phase-top{display:flex!important;width:30px!important;height:30px!important;align-items:center!important;justify-content:center!important;margin:0!important;}
.boss-phase-hud.collapsed .boss-phase-top>span,
.boss-phase-hud.collapsed .boss-phase-top>b,
.boss-phase-hud.collapsed .boss-phase-values,
.boss-phase-hud.collapsed .boss-phase-track,
.boss-phase-hud.collapsed #bossPhaseStatus{display:none!important;}
.boss-phase-hud.collapsed #bossPhaseToggleV4776{display:grid!important;width:30px!important;height:30px!important;pointer-events:auto!important;}
body.mobile-landscape-pro .boss-phase-hud.collapsed{left:auto!important;right:calc(env(safe-area-inset-right,0px) + 54px)!important;top:calc(env(safe-area-inset-top,0px) + 58px)!important;max-width:42px!important;}
`;
edit('public/style.css',s=>s.includes('/* V47.7.6 — restore the previous readable')?s:s+css);
edit('public/modules/unified-expansion-v42.js',s=>{
 if(!s.includes("from './stellar-dialog-v4776.js?v="+NEW+"'"))s="import {stellarConfirmV4776,stellarNoticeV4776} from './stellar-dialog-v4776.js?v="+NEW+"';\n"+s;
 s=once(s,"if(action==='donate'&&!confirm('Contribuir materiais ao projeto? Esta ação é permanente.'))return;","if(action==='donate'&&!await stellarConfirmV4776('Contribuir materiais ao projeto? Esta ação é permanente.',{title:'Contribuir materiais',danger:true}))return;",'unified action confirm');
 s=once(s," working=true;b.disabled=true;b.textContent='PROCESSANDO…';"," await window.stellarEconomySyncBeforeV4776?.();\n working=true;b.disabled=true;b.textContent='PROCESSANDO…';",'unified preflight sync');
 s=once(s,"   // Não manter saldos desatualizados no navegador; nova carga obrigatória.\n   if(['forge','donate','expedition_start'].includes(action)){\n     alert('Operação concluída! O jogo será reiniciado para atualizar seus recursos.');\n     location.reload();return;\n   }\n   await refresh();",
 "   // SQL operation is complete: reconcile remote save without reloading/disconnecting the pilot.\n   if(['forge','donate','expedition_start','expedition_claim'].includes(action)){\n     await window.stellarEconomySyncAfterV4776?.();\n   }\n   await refresh();",'unified no disconnect');
 s=once(s," }catch(e){alert('Não foi possível concluir esta ação. Confira os requisitos e tente novamente.');}"," }catch(e){await stellarNoticeV4776(e?.message||'Não foi possível concluir esta ação. Confira os requisitos e tente novamente.',{title:'Operação não concluída'});}",'unified errors');
 s=s.replaceAll('alert(err?.message||String(err));',"await stellarNoticeV4776(err?.message||String(err));");
 return s;
});
edit('public/modules/stage-b-v426.js',s=>{
 if(!s.includes("from './stellar-dialog-v4776.js?v="+NEW+"'"))s="import {stellarConfirmV4776,stellarNoticeV4776} from './stellar-dialog-v4776.js?v="+NEW+"';\n"+s;
 s=s.replace(/\bconfirm\s*\(/g,'await stellarConfirmV4776(');
 s=once(s,"try{await cb();}catch(e){alert('Não foi possível concluir esta ação. Tente novamente.')}finally{b.disabled=false;}","try{await cb();}catch(e){await stellarNoticeV4776(e?.message||'Não foi possível concluir esta ação. Tente novamente.')}finally{b.disabled=false;}",'stage-b custom errors');
 s=once(s,'await buyMarketV426(x.id);location.reload();','await window.stellarEconomySyncBeforeV4776?.();await buyMarketV426(x.id);await window.stellarEconomySyncAfterV4776?.();await drawCivil(p,root,n);','stage-b market no disconnect');
 return s;
});
edit('public/modules/stage-a-v423.js',s=>{
 if(!s.includes("from './stellar-dialog-v4776.js?v="+NEW+"'"))s="import {stellarNoticeV4776} from './stellar-dialog-v4776.js?v="+NEW+"';\n"+s;
 return once(s,"function alertError(e){console.warn('[equipamentos]',e);alert('Não foi possível concluir esta ação. Tente novamente.');}","function alertError(e){console.warn('[equipamentos]',e);void stellarNoticeV4776(e?.message||'Não foi possível concluir esta ação. Tente novamente.');}",'unified stage A notice');
});
edit('public/modules/astral-rewards-v381.js',s=>{
 if(!s.includes("from './stellar-dialog-v4776.js?v="+NEW+"'"))s="import {stellarNoticeV4776} from './stellar-dialog-v4776.js?v="+NEW+"';\n"+s;
 const alerts=(s.match(/\balert\s*\(/g)||[]).length;
 if(alerts!==4 && !s.includes('stellarNoticeV4776('))throw Error(`Expected 4 astral alert dialogs, got ${alerts}`);
 s=s.replace(/\balert\s*\(/g,'await stellarNoticeV4776(');
 s=s.replace('Reinicie o jogo para conferir seus novos itens.','Os itens estão sendo sincronizados no jogo.');
 s=once(s,'location.reload();','await window.stellarEconomySyncAfterV4776?.();await refresh();','astral rewards no reload');
 s=once(s,'try{const r=await claimAstralRewardV381(key);','try{await window.stellarEconomySyncBeforeV4776?.();const r=await claimAstralRewardV381(key);','astral reward preflight sync');
 return s;
});
// Lightweight asset busting; other module names are unchanged.
for(const f of all('public').filter(x=>['.js','.mjs','.html','.css','.webmanifest'].includes(extname(x)))){
 if(f.includes('stellar-dialog-v4776.js')||f.includes('sale-policy-v4776.js'))continue;
 edit(f,s=>s.replaceAll('?v='+OLD,'?v='+NEW));
}
for(const f of all('tests').filter(x=>x.endsWith('.test.mjs')&&!x.includes('stability-economy-v4776.test.mjs'))){
 edit(f,s=>s.replaceAll(OLD,NEW).replaceAll(OLD.replaceAll('.','\\.'),NEW.replaceAll('.','\\.')).replaceAll('v4775-apply-patch','v4776-apply-patch'));
}
for(const [f,token] of [
 ['server/index.js','saleQuoteV4776(row)'],
 ['public/game.js','bossHudMiniV4776'],
 ['public/game.js','itemSellCaptionV4776'],
 ['public/modules/unified-expansion-v42.js','window.stellarEconomySyncAfterV4776'],
 ['public/modules/stage-b-v426.js','stellarConfirmV4776'],
 ['public/index.html','id="bossPhaseToggleV4776"']
])if(!read(f).includes(token))throw Error(`V47.7.6 patch incomplete: ${f}: ${token}`);
// Assert new imports use release cache-busting, and do not accidentally double-register.
const gameAfter=read('public/game.js');
for(const module of ['sale-policy-v4776','stellar-dialog-v4776']){
 const wanted=`from './modules/${module}.js?v=${NEW}'`;
 if(gameAfter.split(wanted).length!==2)throw Error(`V47.7.6 invalid or duplicated versioned import: ${module}`);
}
for(const file of ['public/modules/unified-expansion-v42.js','public/modules/stage-b-v426.js','public/modules/stage-a-v423.js','public/modules/astral-rewards-v381.js']){
 if(!read(file).includes(`from './stellar-dialog-v4776.js?v=${NEW}'`))throw Error(`V47.7.6 stale dialog import: ${file}`);
}
console.log(`V47.7.6 economy, confirmations, HUD and exploration integration ready. ${modified} files modified; no SQL, saves or map changes.`);
// V47.7.6 FIX3: the legacy Hangar test must assert the new async modal rather
// than requiring window.confirm, which was intentionally retired.
const hangarTest=read('tests/hangar-pro-v3040.test.mjs');
if(!hangarTest.includes('presets incompletos exigem confirmação visual')||
   !hangarTest.includes('exchange>guard')||
   !hangarTest.includes('stellarConfirmV4776')){
  throw Error('V47.7.6 FIX3: legacy Hangar regression test was not updated');
}
