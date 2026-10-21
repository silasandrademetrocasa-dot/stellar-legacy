import {renderGalacticBalanceV460} from './galactic-balance-panel-v460.js';
import {renderFrontierAuditV450} from './frontier-audit-v450.js';
import {renderAstralOperationsV435} from './astral-operations-v435.js';
import {renderAstralCombatAdminV431} from './astral-combat-admin-v431.js';
import {renderStageBV426} from './stage-b-v426.js';
import {renderStageAV423} from './stage-a-v423.js';
// Stellar Legacy — Unificação V39–V42: telas auxiliares, sem loops de quadro/Canvas.
// Toda alteração de moeda/material depende de RPC transacional do servidor.
import {loadUnifiedExpansionV42,actUnifiedExpansionV42,squadUnifiedExpansionV42,adminUnifiedExpansionV42} from '../api.js?v=46.2.0';
import {loadSquadObjectiveV421,claimSquadObjectiveV421,adminSquadObjectiveV421} from '../api.js?v=46.2.0';
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const fmt=v=>Number(v||0).toLocaleString('pt-BR');
const tabs=[['forge','FORJA'],['war','GUERRA'],['scout','EXPLORAÇÃO'],['civil','CIVILIZAÇÃO'],['admin','ADMIN']];
let snapshot=null,tab='forge',working=false;
const entry=(kind)=>Array.isArray(snapshot?.catalog)?snapshot.catalog.filter(a=>a.kind===kind):[];
const amount=(s,k)=>Math.max(0,Number(s?.[k]||0));
const btn=(act,code,title,qty=1)=>`<button type="button" data-v42-action="${esc(act)}" data-v42-code="${esc(code)}" data-v42-qty="${qty}">${esc(title)}</button>`;
const costText=obj=>Object.entries(obj||{}).map(([k,v])=>`${fmt(v)} ${esc(k)}`).join(' • ');
function forge(){return `<p>FABRICAÇÃO ASTRAL — módulos especiais que não alteram o dano ou escudo nesta temporada.</p>
<p>Materiais: ${['Aurorium','Nexium','Eclipsium'].map(k=>`${esc(k)} <b>${fmt(snapshot.materials?.[k])}</b>`).join(' · ')}</p>
${entry('forge').map(x=>{const count=snapshot.items?.find(i=>i.code===x.code)?.quantity||0;return `<section class="frontier-card-v42"><h4>${esc(x.title)}</h4><small>Necessário: ${costText(x.rule.cost)} • Produzidos: ${fmt(count)}</small><div>${btn('forge',x.code,'FABRICAR 1')}</div></section>`}).join('')}`}
function war(){const scores=(snapshot?.warScores||[]);const squad=snapshot?.squad;
return `<p>GALACTIC SQUADS — equipes de até quatro pilotos da mesma facção. O ranking utiliza abates confirmados no servidor nos últimos sete dias.</p>
<section class="frontier-card-v42"><h4>MEU ESQUADRÃO</h4>${squad&&squad.code?`<p>Código do grupo: <b>${esc(squad.code)}</b> · ${fmt(squad.members)}/4 membros · ${esc(squad.faction)}</p>${btn('leave','squad','SAIR DO GRUPO')}`:
`<p>Você ainda não participa de um esquadrão.</p>${btn('create','squad','CRIAR ESQUADRÃO')} <input id="frontierInviteV42" class="frontier-input-v42" maxlength="8" placeholder="Código de convite" aria-label="Código do esquadrão"/> ${btn('join','squad','ENTRAR')}`}</section>
<section class="frontier-card-v42"><h4>ATIVIDADE DAS FACÇÕES · 7 DIAS</h4>
${scores.length?scores.map((x,i)=>`<div>${i+1}º ${esc(x.faction)} — <strong>${fmt(x.verifiedKills)}</strong> abates confirmados</div>`).join(''):'<small>Ainda não há abates verificados nesta janela.</small>'}
<small>O domínio territorial e novos combates em grupo chegarão em futuras temporadas.</small></section>`}
function scout(){const active=(snapshot.expeditions||[]).find(x=>!x.claimed),research=snapshot.researchPoints;
return `<p>EXPEDIÇÕES — missões cronometradas com custos reais e pontos de pesquisa entregues pelo servidor.</p><p>Pontos de pesquisa: <b>${fmt(research)}</b> · Créditos: <b>${fmt(snapshot.credits)}</b></p>
${active?`<section class="frontier-card-v42"><h4>EXPEDIÇÃO EM ANDAMENTO</h4><div>${esc(active.code)} · ${new Date(active.readyAt).toLocaleString('pt-BR')}</div>${Date.now()>=Date.parse(active.readyAt)?btn('expedition_claim',active.code,'COLETAR PESQUISA'): '<small>Missão ainda em andamento. Volte após a conclusão.</small>'}</section>`:''}
${entry('expedition').map(x=>`<section class="frontier-card-v42"><h4>${esc(x.title)}</h4><small>${fmt(x.rule.credits)} CR · ${fmt(x.rule.minutes)} minutos · ${fmt(x.rule.research)} pontos de pesquisa</small><div>${active?'<small>Conclua a expedição em andamento antes de iniciar outra.</small>':btn('expedition_start',x.code,'INICIAR EXPEDIÇÃO')}</div></section>`).join('')}`}
function civil(){return `<p>PROJETOS DE FACÇÃO — doe materiais para objetivos coletivos persistidos no servidor.</p><p>Sua facção: <b>${esc(snapshot.faction||'não definida')}</b></p>
${entry('project').map(x=>{const s=(snapshot.projects||[]).find(p=>p.faction===snapshot.faction&&p.project===x.code);const total=s?.total||0;return `<section class="frontier-card-v42"><h4>${esc(x.title)}</h4><div>Contribuições da facção: <b>${fmt(total)}</b> / meta ${fmt(x.rule.goal)}</div><small>Cada ponto usa ${fmt(x.rule.perPoint)} ${esc(x.rule.resource)}</small><div><input class="frontier-input-v42" type="number" min="1" max="100" value="1" data-v42-amount="${esc(x.code)}" aria-label="Quantidade para ${esc(x.title)}"/> ${btn('donate',x.code,'CONTRIBUIR')}</div></section>`}).join('')}
<small>Participe dos projetos coletivos e ajude sua facção a alcançar novas metas.</small>`}
function admin(){if(!snapshot?.isAdmin)return '<p>Área administrativa restrita.</p>';
return `<p>ADMIN — ajuste os custos e as recompensas das atividades.</p>
${(snapshot.catalog||[]).map(x=>{const r=x.rule||{};const fields=x.kind==='forge'?Object.entries(r.cost||{}).map(([k,v])=>`<label>${esc(k)} <input type="number" min="0" max="10000" value="${fmt(v).replaceAll('.','')}" class="frontier-input-v42" data-v42-edit="${esc(x.code)}" data-v42-field="${esc(k)}"/></label>`).join(' • '): x.kind==='expedition'?['credits','minutes','research'].map(k=>`<label>${k} <input type="number" min="1" value="${Number(r[k]||0)}" class="frontier-input-v42" data-v42-edit="${esc(x.code)}" data-v42-field="${k}"/></label>`).join(' • '):`<label>Material / ponto <input type="number" min="1" max="100" value="${Number(r.perPoint||1)}" class="frontier-input-v42" data-v42-edit="${esc(x.code)}" data-v42-field="perPoint"/></label>`;
return `<section class="frontier-card-v42"><h4>${esc(x.title)}</h4>${fields}<div>${btn('admin_save',x.code,'SALVAR CONFIGURAÇÃO')}</div></section>`}).join('')}`}
function render(){const root=el('frontierExpansionContentV42');if(!root)return;
if(!snapshot){root.innerHTML='<p>Carregando operações do universo…</p>';return;}
root.innerHTML=`<div class="frontier-tabs-v42">${tabs.filter(x=>x[0]!=='admin'||snapshot.isAdmin).map(([id,label])=>`<button data-v42-tab="${id}" class="${tab===id?'active':''}">${label}</button>`).join('')}</div>${({forge,war,scout,civil,admin}[tab]||forge)()}`;
if(tab==='war')void v421ObjectiveRender(root);
if(tab==='forge'||tab==='war'||tab==='admin')void renderStageAV423(root,tab);
if(tab==='scout'||tab==='civil'||tab==='admin')void renderStageBV426(root,tab);
if(tab==='forge'||tab==='war'||tab==='admin')void renderAstralOperationsV435(root,tab,snapshot.isAdmin);
if(tab==='admin' && snapshot?.isAdmin)void renderFrontierAuditV450(root,tab,snapshot.isAdmin);
if(tab==='admin' && snapshot?.isAdmin){renderGalacticBalanceV460(root,tab,snapshot.isAdmin);void v421AdminRender(root);}
root.querySelectorAll('[data-v42-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.v42Tab;render()}));
root.querySelectorAll('[data-v42-action]').forEach(b=>b.addEventListener('click',async()=>{
 if(working)return;
 const action=b.dataset.v42Action,code=b.dataset.v42Code;
 if(action==='donate'&&!confirm('Contribuir materiais ao projeto? Esta ação é permanente.'))return;
 working=true;b.disabled=true;b.textContent='PROCESSANDO…';
 try{
   let result;
   if(action==='create'||action==='join'||action==='leave')result=await squadUnifiedExpansionV42(action,action==='join'?(el('frontierInviteV42')?.value||'').trim().toLowerCase():'');
   else if(action==='admin_save'){
     const x=snapshot.catalog.find(x=>x.code===code);
     const data={};root.querySelectorAll(`[data-v42-edit="${code}"]`).forEach(i=>data[i.dataset.v42Field]=Number(i.value));
     result=await adminUnifiedExpansionV42(code,x.kind==='forge'?{cost:data}:data);
   }
   else {
     const n=action==='donate'?Math.floor(Number(root.querySelector(`[data-v42-amount="${code}"]`)?.value)||1):Number(b.dataset.v42Qty||1);
     if(n<1||n>100)throw Error('A quantidade deve ser de 1 a 100.');
     result=await actUnifiedExpansionV42(action,code,n,crypto.randomUUID());
   }
   if(!result?.ok)throw Error(result?.error||'Operação não confirmada');
   // Não manter saldos desatualizados no navegador; nova carga obrigatória.
   if(['forge','donate','expedition_start'].includes(action)){
     alert('Operação concluída! O jogo será reiniciado para atualizar seus recursos.');
     location.reload();return;
   }
   await refresh();
 }catch(e){alert('Não foi possível concluir esta ação. Confira os requisitos e tente novamente.');}
 finally{working=false;const now=el('frontierExpansionContentV42');if(now&&!snapshot)now.textContent='Falha ao sincronizar.';}
 }));
}
async function refresh(){const root=el('frontierExpansionContentV42');if(root)root.textContent='Atualizando suas informações…';
 try{snapshot=await loadUnifiedExpansionV42();if(snapshot?.error)throw Error(snapshot.error);render();}
 catch(e){snapshot=null;if(root)root.textContent=`As atividades do universo estão temporariamente indisponíveis. Tente novamente.`;}
}
function boot(){const button=el('frontierExpansionBtnV42'),modal=el('frontierExpansionModalV42');if(!button||!modal)return;
 button.addEventListener('click',()=>{modal.classList.remove('hidden');refresh()});
 el('frontierExpansionCloseV42')?.addEventListener('click',()=>modal.classList.add('hidden'));
 modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

// V42.1: renderização somente sob demanda, fora do loop Canvas.
async function v421ObjectiveRender(root){
 const card=document.createElement('section');card.className='frontier-card-v42 frontier-objective-v421';card.textContent='Carregando objetivo semanal do esquadrão…';root.append(card);
 try{
  const p=await loadSquadObjectiveV421();if(!card.isConnected)return;
  if(!p.inSquad){card.textContent='OBJETIVO SEMANAL — Entre em um esquadrão para participar.';return;}
  const total=Number(p.verifiedKills||0),goal=Number(p.goal||100),mine=Number(p.personalKills||0),min=Number(p.minimumPersonal||10);
  const line=document.createElement('div');line.textContent='OBJETIVO SEMANAL DE ESQUADRÃO';line.style.fontWeight='bold';
  const desc=document.createElement('p');desc.textContent=total+' / '+goal+' abates confirmados · Seus: '+mine+' / '+min+' · Recompensa: '+Number(p.rewardResearch||0)+' pontos de pesquisa.';
  const status=document.createElement('small');status.textContent=p.claimed?'Resgatado nesta semana.':p.eligible?'Missão concluída — resgate disponível.':'Elimine NPCs com seu esquadrão para liberar o resgate.';
  card.replaceChildren(line,desc,status);
  if(Array.isArray(p.team)){for(const member of p.team){const row=document.createElement('div');row.textContent=(member.callsign||'Piloto')+' — '+Number(member.kills||0)+' abates';card.append(row);}}
  if(p.eligible){const button=document.createElement('button');button.type='button';button.textContent='RESGATAR PESQUISA DO ESQUADRÃO';card.append(button);button.addEventListener('click',async()=>{button.disabled=true;try{const claimed=await claimSquadObjectiveV421();if(!claimed?.ok)throw Error('Resgate indisponível.');await refresh();}catch(error){alert(error?.message||String(error));button.disabled=false;}});}
 }catch(err){if(card.isConnected)card.textContent='Objetivo semanal temporariamente indisponível.';}
}
async function v421AdminRender(root){
 const card=document.createElement('section');card.className='frontier-card-v42';card.textContent='Carregando controle da missão semanal…';root.append(card);
 try{const p=await loadSquadObjectiveV421();if(!card.isConnected)return;card.replaceChildren();
 const title=document.createElement('h4');title.textContent='OBJETIVOS DE ESQUADRÃO';card.append(title);
 const fields=[['Abates do esquadrão',p.goal,20,10000],['Abates mínimos por piloto',p.minimumPersonal,1,1000],['Pontos de pesquisa',p.rewardResearch,1,1000]];
 const inputs=[];for(const [name,value,min,max] of fields){const label=document.createElement('label');label.textContent=name+' ';const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.value=value;input.className='frontier-input-v42';label.append(input);card.append(label,document.createElement('div'));inputs.push(input);} 
 const save=document.createElement('button');save.type='button';save.textContent='SALVAR OBJETIVO SEMANAL';card.append(save);
 save.addEventListener('click',async()=>{save.disabled=true;try{const [goal,min,reward]=inputs.map(i=>Number(i.value));const r=await adminSquadObjectiveV421(goal,min,reward);if(!r?.ok)throw Error('Configuração não aceita.');await refresh();}catch(err){alert(err?.message||String(err));save.disabled=false;}});
 }catch(err){if(card.isConnected)card.textContent='Não foi possível carregar os objetivos.';}
}
