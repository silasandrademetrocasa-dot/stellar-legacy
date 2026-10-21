// Presentation only. Security, rewards, pricing and authority are verified in SQL.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('pt-BR').format(Number(n)||0);
export function dominionUiSnapshot(dom){
 const rules=dom?.rules||{};
 const claims=Array.isArray(dom?.claims)?dom.claims:[];
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(dom?.serverTime||Date.now()));
 const wk=new Date(today+'T12:00:00Z'),offset=(wk.getUTCDay()+6)%7;
 const monday=new Date(wk.getTime()-offset*86400000).toISOString().slice(0,10);
 const claimedDaily=claims.some(c=>c.claim_kind==='daily'&&String(c.period_start).slice(0,10)===today);
 const claimedWeekly=claims.some(c=>c.claim_kind==='weekly'&&String(c.period_start).slice(0,10)===monday);
 const stats=dom?.stats||{};
 return {today,monday,claimedDaily,claimedWeekly,owned:Number(stats.owned)||0,
  actionCount:(Number(stats.captures)||0)+(Number(stats.defenses)||0),target:Number(rules.weeklyTarget)||3,
  dailyEstimated:Math.min(Number(rules.dailyCap)||0,(Number(stats.owned)||0)*(Number(rules.dailyPerNode)||0)),
  warLive:dom?.activeWar===true};
}
export function dominionPanelHtml(dom,{admin=false}={}){
 if(!dom?.ok)return `<section class="dominion-v360"><h3>⚔ DOMÍNIO GALÁCTICO</h3><small>${esc(dom?.error||'Sincronizando... Aguardando SQL V36.')}</small></section>`;
 const m=dominionUiSnapshot(dom),clan=dom.clan,r=dom.rules,rows=dom.ranking||[],war=dom.wars||[];
 const all=dom.clans||[];
 return `<section class="dominion-v360"><div class="section-kicker">DOMÍNIO GALÁCTICO • PAINEL TERRITORIAL</div>
 <h3>⚔ CONTROLE TERRITORIAL E GUERRAS</h3><div class="dominion-summary-v360"><span><b>${m.owned}/9</b><small>RELÉS DO CLÃ</small></span><span><b>${fmt(m.actionCount)}</b><small>AÇÕES SEMANAIS*</small></span><span><b>${fmt(m.dailyEstimated)} CR</b><small>TRIBUTO DIÁRIO</small></span></div>
 ${clan?`<div class="dominion-rewards-v360"><div><b>TRIBUTO TERRITORIAL</b><small>Uma vez por dia por clã • crédito no cofre, não na carteira do piloto</small><button type="button" class="primary-btn" data-dominion-claim="daily" ${m.claimedDaily||m.owned<1?'disabled':''}>${m.claimedDaily?'RESGATADO HOJE':`RESGATAR ${fmt(m.dailyEstimated)} CR`}</button></div>
 <div><b>DESAFIO SEMANAL DE GUERRA</b><small>${fmt(m.actionCount)} ações recentes (apenas ações da semana corrente contam no SQL) • meta ${fmt(m.target)} • prêmio ${fmt(r.weeklyCredits)} CR</small><button type="button" class="ghost-btn" data-dominion-claim="weekly" ${m.claimedWeekly||m.actionCount<m.target?'disabled':''}>${m.claimedWeekly?'RESGATADO NA SEMANA':'RESGATAR DESAFIO'}</button></div></div>`:'<small>Entre em um clã para receber tributos e declarar guerras.</small>'}
 <details class="dominion-wars-v360"><summary>⚔ GUERRAS TERRITORIAIS • ${war.filter(w=>w.active||w.scheduled).length} CONFRONTO(S) EM ANDAMENTO/AGENDADO(S)</summary>
 <small>As declarações duram ${Number(r.warHours)||24} horas, com espera de ${Number(r.warCooldownHours)||24} horas entre guerras do mesmo par. Ataques e defesas usam o combate atual do jogo.</small>
 ${war.length?war.map(w=>`<div class="dominion-war-row-v360"><b>${esc(w.attacker)} × ${esc(w.defender)}</b><small>${w.scheduled?'AGENDADA':w.active?'EM GUERRA':'ENCERRADA'} • até ${esc(new Date(w.ends_at).toLocaleString('pt-BR'))}</small>${!w.active&&!w.scheduled&&!w.prizeClaimed?`<button class="ghost-btn" data-dominion-war-prize="${esc(w.id)}">VERIFICAR PRÊMIO DE VITÓRIA • ${fmt(r.warRewardCredits||0)} CR</button>`:w.prizeClaimed?'<small>PRÊMIO DA GUERRA RESGATADO</small>':''}</div>`).join(''):'<small>Seu clã ainda não possui guerras declaradas nesta versão.</small>'}
 ${clan?.isOwner?`<label>Declarar guerra contra<select id="dominionRivalV360"><option value="">ESCOLHER CLÃ RIVAL</option>${all.map(c=>`<option value="${esc(c.id)}">[${esc(c.tag)}] ${esc(c.name)}</option>`).join('')}</select></label><label>Agendar início (opcional, até 7 dias)<input type="datetime-local" id="dominionScheduleV360" /></label><button class="primary-btn" type="button" data-dominion-declare ${m.warLive||!all.length?'disabled':''}>DECLARAR GUERRA</button>`:''}</details>
 <details class="dominion-rank-v360"><summary>🏆 RANKING DE DOMINAÇÃO • 7 DIAS</summary><small>10 pontos por relé ativo, 5 por conquista e 2 por defesa. Apenas ações registradas no servidor.</small>
 ${rows.length?rows.slice(0,12).map((x,i)=>`<div class="dominion-war-row-v360"><b>${i+1}º [${esc(x.tag)}] ${esc(x.name)}</b><small>${fmt(x.score)} PTS • ${fmt(x.relays)} RELÉS • ${fmt(x.captures)} CONQUISTAS • ${fmt(x.defenses)} DEFESAS</small></div>`).join(''):'<small>Nenhuma conquista registrada.</small>'}</details>
 <div class="dominion-note-v360"><b>REGENERAÇÃO REAL</b><small>Nanobots reforçam o HP e Regeneradores restauram o escudo após ${Number(r.regenIdleSeconds)||60}s sem combate. O servidor calcula a reparação em ciclos de 60s; HP destruído não regenera sozinho.</small></div>
 ${admin?`<details class="dominion-admin-v360"><summary>⚙ ADM • REGRAS DO DOMÍNIO GALÁCTICO</summary><div class="dominion-admin-fields-v360">${[
 ['regen_hp_tick','HP/CICLO',0,50000],['regen_shield_tick','ESCUDO/CICLO',0,50000],['regen_idle_seconds','REPOUSO (SEG)',30,3600],
 ['daily_credits_per_relay','CRÉDITOS/RELÉ DIA',0,100000],['daily_credits_cap','LIMITE DIÁRIO',0,900000],
 ['weekly_war_actions','META SEMANAL',1,100],['weekly_credits','PRÊMIO SEMANAL CR',0,500000],
 ['war_hours','GUERRA (HORAS)',1,72],['war_cooldown_hours','ESPERA GUERRA (HORAS)',1,168]
 ].map(([key,label,min,max])=>`<label>${label}<input type="number" min="${min}" max="${max}" step="1" data-dominion-rule="${key}" value="${Number(dom.adminRules?.[key])||0}"></label>`).join('')}</div>
 <label><input type="checkbox" id="dominionEnabledV360" ${dom.adminRules?.enabled===true?'checked':''}> SISTEMA ATIVO</label>
 <button class="primary-btn" type="button" data-dominion-admin-save>SALVAR REGRAS SQL</button></details>`:''}
 <button type="button" class="ghost-btn" data-dominion-refresh>ATUALIZAR DOMÍNIO</button></section>`;
}
