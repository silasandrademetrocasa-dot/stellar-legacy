// V38.1.0 — painel de recompensas da arena e editor no ADM.
// Sem loops de render e sem alterações no motor de combate.
import {loadAstralRewardsV381,lockAstralRewardV381,claimAstralRewardV381,adminSetAstralRewardV381} from '../api.js';
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
 $('astralClaimV381')?.addEventListener('click',async()=>{const b=$('astralClaimV381');b.disabled=true;b.textContent='VALIDANDO...';try{const r=await claimAstralRewardV381(key);if(!r?.claimed)throw Error('Nenhuma nova conclusão disponível.');alert(`BÔNUS ${names[key]} RESGATADO!\n${formatQuote(r.quote)}\nO jogo será recarregado para sincronizar seu inventário.`);location.reload();}catch(e){alert(e.message||String(e));b.disabled=false;b.textContent='RESGATAR BÔNUS';}});
}
async function refresh(lockKey=null){if(loading)return;loading=true;try{if(lockKey)await lockAstralRewardV381(lockKey);latest=await loadAstralRewardsV381();renderPortal();if(visible($('adminModal')))renderAdmin();}catch(e){const el=$('astralRewardV381');if(el)el.textContent='Astral Rewards indisponível: '+e.message;}finally{loading=false}}
const schema=[['credits','CR'],['stl','STL'],['cores','Núcleos'],['ammoQty','Munições'],['rocketQty','Mísseis'],['voidite','Voidite'],['resourceQty','Material exclusivo'],['weeklyBonusPct','Bônus semanal (%)'],['referenceWaves','Ondas-base']];
function renderAdmin(){const el=$('astralAdminEditorV381');if(!el||!latest?.gates)return;
 el.innerHTML=`<div class="astral-rewards-title">ASTRAL REWARDS · CONTROLE DE RECOMPENSAS</div><p>Altere os valores sem editar código ou SQL. Os valores abaixo são bônus adicionais.</p>
 <div class="astral-adm-grid">${order.map(key=>{const a=latest.gates[key];return `<fieldset data-gate="${key}"><legend>${names[key]} (rev. ${fmt(a.revision)})</legend>
 ${schema.map(([k,label])=>`<label>${label}<input data-reward-key="${k}" type="number" min="0" step="1" value="${Number(a.config[k]||0)}"></label>`).join('')}
 <label>Munição<select data-reward-key="ammoId">${['lcb10','mcb25','mcb50','ucb100','sab50'].map(id=>`<option value="${id}" ${id===a.config.ammoId?'selected':''}>${id}</option>`).join('')}</select></label>
 <label>Míssil<select data-reward-key="rocketId">${['r310','plt2026','plt2021','plt3030'].map(id=>`<option value="${id}" ${id===a.config.rocketId?'selected':''}>${id}</option>`).join('')}</select></label>
 <button class="small-btn gold" type="button" data-save-astral="${key}">SALVAR ${names[key]}</button></fieldset>`}).join('')}</div>
 <div class="astral-rewards-history"><strong>Histórico de resgates</strong>${(latest.history||[]).slice(0,10).map(h=>`<div>${names[h.gate]||escape(h.gate)} · #${fmt(h.completion_number)} · ${escape(new Date(h.claimed_at).toLocaleString('pt-BR'))} ${h.first_weekly?'· bônus semanal':''}</div>`).join('')||'<small>Sem resgates nesta conta.</small>'}</div>`;
 el.querySelectorAll('[data-save-astral]').forEach(b=>b.addEventListener('click',async()=>{const key=b.dataset.saveAstral;const parent=b.closest('fieldset');const config={};parent.querySelectorAll('[data-reward-key]').forEach(input=>{config[input.dataset.rewardKey]=input.type==='number'?Number(input.value):input.value;});b.disabled=true;try{latest=await adminSetAstralRewardV381(key,config);alert('Recompensas '+names[key]+' atualizadas no Supabase.');renderAdmin();renderPortal();}catch(e){alert(e.message||String(e));}finally{b.disabled=false;}}));
}
function setup(){const modal=$('gateModal');if(!modal)return;
 const watch=new MutationObserver(()=>{if(visible(modal))refresh(selected());});
 watch.observe(modal,{attributes:true,attributeFilter:['class']});
 $('gateProtocolTabs')?.addEventListener('click',()=>queueMicrotask(()=>refresh(selected())));
 const admin=$('adminModal'),open=$('astralAdminOpenV381'),editor=$('astralAdminEditorV381');
 open?.addEventListener('click',()=>{editor?.classList.toggle('hidden');if(!editor?.classList.contains('hidden'))refresh();});
 if(admin)new MutationObserver(()=>{if(visible(admin)&&!latest)refresh();}).observe(admin,{attributes:true,attributeFilter:['class']});
 if(visible(modal))refresh(selected());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
