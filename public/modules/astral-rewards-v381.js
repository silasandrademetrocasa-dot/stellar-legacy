// V38.1.0 — painel de recompensas da arena e editor no ADM.
// Sem loops de render e sem alterações no motor de combate.
import {loadAstralRewardsV381,lockAstralRewardV381,claimAstralRewardV381,adminSetAstralRewardV381} from '../api.js?v=47.7.2';
const names={alpha:'AURORA',beta:'NEXUS',gamma:'ECLIPSE'};
const order=['alpha','beta','gamma'];
let latest=null,loading=false;
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const $=id=>document.getElementById(id);
const visible=el=>!!el&&!el.classList.contains('hidden');
const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const selected=()=>document.querySelector('#gateProtocolTabs [data-gate-protocol].active')?.dataset.gateProtocol||'alpha';
const formatQuote=q=>q?`${fmt(q.credits)} CR · ${fmt(q.stl)} STL · ${fmt(q.cores)} Núcleos · ${fmt(q.ammoQty)} munições (${escape(q.ammoId)}) · ${fmt(q.rocketQty)} mísseis (${escape(q.rocketId)}) · ${fmt(q.voidite)} Voidite · ${fmt(q.resourceQty)} ${escape(q.resource)}`:'Sem previsão';
function renderPortal(){const box=$('astralRewardV381');if(!box)return;const key=selected(),entry=latest?.gates?.[key];
 if(!entry){box.innerHTML='<small>Carregando recompensas Astral Rewards…</small>';return;}
 const q=entry.quote;box.innerHTML=`<div class="astral-rewards-title">✦ ASTRAL REWARDS · ${names[key]}</div>
 <p>${formatQuote(q)}</p><small>${fmt(q.waves)} ondas · fator real de dificuldade ${fmt(q.difficultyMult)}× · primeira conclusão semanal: ${q.firstWeekly?'ATIVA':'já resgatada'} (${fmt(q.weeklyBonusPct)}% extra em CR, STL, Núcleos e material).</small>
 <div class="astral-rewards-actions"><small>${fmt(entry.pending)} conclusão(ões) aguardando resgate · ${fmt(entry.materialBalance)} ${escape(q.resource)} no inventário</small><button type="button" id="astralClaimV381" class="primary-btn" ${entry.pending<1?'disabled':''}>RESGATAR BÔNUS</button></div>
 <small>Prêmio adicional ao pacote tradicional do portal. Confirme sua vitória e salve o progresso antes de resgatar.</small>`;
 $('astralClaimV381')?.addEventListener('click',async()=>{const b=$('astralClaimV381');b.disabled=true;b.textContent='VALIDANDO...';try{const r=await claimAstralRewardV381(key);if(!r?.claimed)throw Error('Nenhuma nova conclusão disponível.');alert(`BÔNUS ${names[key]} RESGATADO!\n${formatQuote(r.quote)}\nReinicie o jogo para conferir seus novos itens.`);location.reload();}catch(e){alert('Não foi possível concluir esta ação. Tente novamente.');b.disabled=false;b.textContent='RESGATAR BÔNUS';}});
}
// A portal change during a request is queued instead of being silently ignored.
let queuedGate=null;
async function refresh(lockKey=null){
 if(loading){if(lockKey)queuedGate=lockKey;return;}
 loading=true;
 try{
  if(lockKey){try{await lockAstralRewardV381(lockKey);}catch(err){console.warn('[Astral Rewards] preview lock:',err?.message||err);}}
  latest=await loadAstralRewardsV381();
  renderPortal();
  const admin=$('adminModal'),editor=$('astralAdminEditorV381');
  if(visible(admin)&&visible(editor))renderAdmin();
 }catch(e){
  const message=String(e?.message||e);
  if(visible($('gateModal'))){const box=$('astralRewardV381');if(box)box.textContent='Recompensas temporariamente indisponíveis. Tente novamente.';}
  const editor=$('astralAdminEditorV381');
  if(visible($('adminModal'))&&visible(editor))editor.textContent='Não foi possível carregar as recompensas. Tente novamente.';
 }finally{
  loading=false;
  if(queuedGate){const next=queuedGate;queuedGate=null;void refresh(next);}
 }
}
const schema=[['credits','CR'],['stl','STL'],['cores','Núcleos'],['ammoQty','Munições'],['rocketQty','Mísseis'],['voidite','Voidite'],['resourceQty','Material exclusivo'],['weeklyBonusPct','Bônus semanal (%)'],['referenceWaves','Ondas-base']];
function renderAdmin(){const el=$('astralAdminEditorV381');if(!el||!latest?.gates)return;
 el.innerHTML=`<div class="astral-rewards-title">ASTRAL REWARDS · CONTROLE DE RECOMPENSAS</div><p>Personalize os prêmios dos portais. Os valores abaixo são bônus adicionais.</p>
 <div class="astral-adm-grid">${order.map(key=>{const a=latest.gates[key];return `<fieldset data-gate="${key}"><legend>${names[key]} </legend>
 ${schema.map(([k,label])=>`<label>${label}<input data-reward-key="${k}" type="number" min="0" step="1" value="${Number(a.config[k]||0)}"></label>`).join('')}
 <label>Munição<select data-reward-key="ammoId">${['lcb10','mcb25','mcb50','ucb100','sab50'].map(id=>`<option value="${id}" ${id===a.config.ammoId?'selected':''}>${id}</option>`).join('')}</select></label>
 <label>Míssil<select data-reward-key="rocketId">${['r310','plt2026','plt2021','plt3030'].map(id=>`<option value="${id}" ${id===a.config.rocketId?'selected':''}>${id}</option>`).join('')}</select></label>
 <button class="small-btn gold" type="button" data-save-astral="${key}">SALVAR ${names[key]}</button></fieldset>`}).join('')}</div>
 <div class="astral-rewards-history"><strong>Histórico de resgates</strong>${(latest.history||[]).slice(0,10).map(h=>`<div>${names[h.gate]||escape(h.gate)} · #${fmt(h.completion_number)} · ${escape(new Date(h.claimed_at).toLocaleString('pt-BR'))} ${h.first_weekly?'· bônus semanal':''}</div>`).join('')||'<small>Sem resgates nesta conta.</small>'}</div>`;
 el.querySelectorAll('[data-save-astral]').forEach(b=>b.addEventListener('click',async()=>{const key=b.dataset.saveAstral;const parent=b.closest('fieldset');const config={};parent.querySelectorAll('[data-reward-key]').forEach(input=>{config[input.dataset.rewardKey]=input.type==='number'?Number(input.value):input.value;});b.disabled=true;try{await adminSetAstralRewardV381(key,config);await refresh();alert('Recompensas de '+names[key]+' salvas com sucesso.');}catch(e){alert(e.message||String(e));}finally{b.disabled=false;}}));
}
function setup(){
 const modal=$('gateModal');if(!modal)return;
 const select=$('gateProtocolTabs');
 let lastKey=selected(),selectionTimer=null;
 const onSelect=()=>{
  // Wait for game.js to finish toggling the .active tab class.
  clearTimeout(selectionTimer);
  selectionTimer=setTimeout(()=>{
   const key=selected();if(key===lastKey)return;
   lastKey=key;renderPortal();if(visible(modal))void refresh(key);
  },0);
 };
 if(select){
  select.addEventListener('click',onSelect);
  new MutationObserver(onSelect).observe(select,{attributes:true,attributeFilter:['class'],subtree:true,childList:true});
 }
 new MutationObserver(()=>{if(visible(modal)){lastKey=selected();renderPortal();void refresh(lastKey);}})
  .observe(modal,{attributes:true,attributeFilter:['class']});
 const admin=$('adminModal'),open=$('astralAdminOpenV381'),editor=$('astralAdminEditorV381');
 open?.addEventListener('click',()=>{
  if(!editor)return;
  const expanded=editor.classList.toggle('hidden')===false;
  open.setAttribute('aria-expanded',String(expanded));
  if(!expanded)return;
  editor.textContent='Carregando editor de recompensas…';
  if(latest?.gates)renderAdmin();
  void refresh();
 });
 if(admin){
  new MutationObserver(()=>{if(visible(admin)&&!latest)void refresh();})
   .observe(admin,{attributes:true,attributeFilter:['class']});
  // The legacy ADM dynamically renders its Aurora/Nexus/Eclipse buttons. Trigger
  // the existing runtime refresh after selecting a different gate, so form data
  // and wave configuration follow the selected portal without manual reload.
  let adminGateTimer=null;
  admin.addEventListener('click',event=>{
   const button=event.target?.closest?.('button');
   if(!button||!button.closest('.admin-runtime-monitor-section'))return;
   const label=String(button.textContent||'').trim().toUpperCase();
   if(!['AURORA','NEXUS','ECLIPSE'].includes(label))return;
   clearTimeout(adminGateTimer);
   adminGateTimer=setTimeout(()=>{
    const button=$('adminRuntimeMonitorRefresh');
    if(button&&!button.disabled)button.click();
   },100);
  });
 }
 if(visible(modal))void refresh(selected());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
