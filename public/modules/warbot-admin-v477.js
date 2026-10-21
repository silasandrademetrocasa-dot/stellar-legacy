// V47.7 — isolated ADM panel. Uses the existing authenticated game session.
const MAPS=[['b41','4-1'],['b42','4-2'],['b43','4-3']];
const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createWarbotAdminV477({root,credentials,notify=()=>{}}){
  let loaded=false,busy=false;
  async function request(path,method='GET',body=null){
    const auth=credentials();if(!auth?.accessToken)throw Error('Sessão expirada.');
    const res=await fetch(path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth.accessToken}`,'X-Game-Session-Id':auth.gameSessionId||''},body:body?JSON.stringify(body):undefined,cache:'no-store'});
    const out=await res.json().catch(()=>({}));if(!res.ok)throw Error(out.error||`Erro ${res.status}`);return out;
  }
  function message(s){const el=root?.querySelector('#warbotAdmMessage');if(el)el.textContent=s;}
  function markup(rows){return `
  <section class="warbot-adm-section">
    <div class="settings-title"><div><b>⚔️ GALACTIC BOT WARS</b><small>Batalhas artificiais nos mapas 4-X • Configuração segura por mapa e duração</small></div><button type="button" class="small-btn" id="warbotAdmReload">RECARREGAR</button></div>
    <p class="muted">DESLIGADO POR PADRÃO. TREINO: dano simulado, sem gastar HP real nem conceder prêmios. CONQUISTA: bots lutam junto aos relés, porém não alteram a posse oficial A/B/C. Pilotos podem atacar bots sem farmar XP/créditos.</p>
    <div class="warbot-adm-grid">${MAPS.map(([id,label])=>{
      const row=rows.find(x=>x.map_id===id)||{};
      const active=row.enabled===true&&Date.parse(row.ends_at||'')>Date.now();
      const mode=row.mode==='conquest'?'conquest':'training';
      const count=Math.max(1,Math.min(4,Number(row.bots_per_faction)||2));
      const tier=Math.max(1,Math.min(3,Number(row.tier)||1));
      return `<section class="warbot-adm-card" data-warbot-map="${id}">
        <div class="warbot-adm-card-head"><b>MAPA ${label}</b><span class="${active?'warbot-on':'warbot-off'}">${active?'ATIVO':'DESLIGADO'}</span></div>
        <div class="warbot-adm-controls">
          <label>Modalidade<select data-field="mode"><option value="training" ${mode==='training'?'selected':''}>TREINAMENTO</option><option value="conquest" ${mode==='conquest'?'selected':''}>EVENTO DE CONQUISTA</option></select></label>
          <label>Bots por facção<select data-field="bots_per_faction">${[1,2,3,4].map(v=>`<option value="${v}" ${v===count?'selected':''}>${v} (total ${v*3})</option>`).join('')}</select></label>
          <label>Dificuldade<select data-field="tier">${[1,2,3].map(v=>`<option value="${v}" ${tier===v?'selected':''}>${['','Padrão','Veterano','Elite'][v]}</option>`).join('')}</select></label>
          <label>Duração<select data-field="duration_minutes">${[5,15,30,60,90,120].map(v=>`<option value="${v}" ${v===30?'selected':''}>${v} min</option>`).join('')}</select></label>
          <label class="warbot-adm-check"><input type="checkbox" data-field="attack_players" ${row.attack_players&&mode==='conquest'?'checked':''}/> Bots atacam pilotos no evento (dano real)</label>
        </div>
        <div class="warbot-adm-actions"><button type="button" class="small-btn gold" data-warbot-action="start">▶ ATIVAR</button><button type="button" class="small-btn" data-warbot-action="stop">■ DESLIGAR</button></div>
        <small class="muted">${active?'Encerra automaticamente: '+escapeText(new Date(row.ends_at).toLocaleString('pt-BR')):'Sem bots ativos nesse mapa.'}</small>
      </section>`;
    }).join('')}</div><div id="warbotAdmMessage" class="muted" role="status">Pronto para administrar.</div>
  </section>`;}
  async function load(force=false){if(!root||busy)return;if(loaded&&!force)return;busy=true;
    try{const result=await request('/api/admin/warbots');root.innerHTML=markup(result.maps||[]);loaded=true;root.querySelector('#warbotAdmReload')?.addEventListener('click',()=>load(true));}
    catch(e){root.textContent='Não foi possível carregar Galactic Bot Wars: '+String(e.message||e);}
    finally{busy=false;}
  }
  root?.addEventListener('click',async e=>{
    const button=e.target.closest('[data-warbot-action]');if(!button||busy)return;
    const card=button.closest('[data-warbot-map]');if(!card)return;
    busy=true;const v=k=>card.querySelector(`[data-field="${k}"]`);
    const action=button.dataset.warbotAction,map_id=card.dataset.warbotMap;
    const mode=v('mode').value;
    const body={map_id,enabled:action==='start',mode,bots_per_faction:Number(v('bots_per_faction').value),tier:Number(v('tier').value),duration_minutes:Number(v('duration_minutes').value),attack_players:mode==='conquest'&&v('attack_players').checked};
    button.disabled=true;
    try{await request('/api/admin/warbots','POST',body);notify(action==='start'?'Frotas iniciadas no '+map_id:'Frotas encerradas no '+map_id);loaded=false;busy=false;await load(true);}
    catch(err){busy=false;button.disabled=false;message('Falha ao salvar: '+String(err.message||err));}
  });
  return {load};
}
