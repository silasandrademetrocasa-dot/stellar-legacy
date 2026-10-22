/* Stellar Legacy V48 — Autopilot assistido (sessão aberta).
 * Não credita recompensas, não escreve saves externos e não concede acesso.
 * Todas as ações reais passam pelos métodos normais do jogo e do Render.
 */
export const AUTOPILOT_ALLOWED_MAPS=Object.freeze(['x1','x2','x3','x4','x5','x6','x7','x8','u1','u2','u3']);
export const AUTOPILOT_DEFAULTS=Object.freeze({map:'x1',npcTypes:[],boxes:true,drops:true,ores:false,autoSell:true,autoBuy:true,rockets:true,
  cargoThreshold:85,hpRetreat:30,minutes:120,budget:50000,ammoMin:250,rocketMin:15,combatRange:0.78,mode:'nearest'});
const number=(v,min,max,fallback)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):fallback));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(Math.max(0,Number(n)||0)).toLocaleString('pt-BR');
const dist=(a,b)=>Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0));
export function cleanAutopilotConfig(input={}){
  const map=AUTOPILOT_ALLOWED_MAPS.includes(input.map)?input.map:'x1';
  const raw=Array.isArray(input.npcTypes)?input.npcTypes:[];
  const npcTypes=[...new Set(raw.filter(s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,50}$/.test(s)))].slice(0,60);
  return {map,npcTypes,boxes:input.boxes!==false,drops:input.drops!==false,ores:input.ores===true,
    autoSell:input.autoSell!==false,autoBuy:input.autoBuy!==false,rockets:input.rockets!==false,
    cargoThreshold:number(input.cargoThreshold,50,100,85),hpRetreat:number(input.hpRetreat,10,80,30),
    minutes:number(input.minutes,5,360,120),budget:number(input.budget,0,10000000,50000),
    ammoMin:number(input.ammoMin,0,1000000,250),rocketMin:number(input.rocketMin,0,1000000,15),
    combatRange:number(input.combatRange,0.55,0.93,0.78),mode:['nearest','profit'].includes(input.mode)?input.mode:'nearest'};
}
export function findAutopilotPortalPath(currentLabel,goalLabel,edges,admit=()=>true){
  if(!currentLabel||!goalLabel)return null;
  if(currentLabel===goalLabel)return [];
  const queue=[currentLabel],seen=new Set(queue),parent=new Map();
  while(queue.length){const cur=queue.shift();
    for(const edge of edges(cur)||[]){const to=edge.targetLabel;
      if(!to||seen.has(to)||!admit(to))continue;
      seen.add(to);parent.set(to,{from:cur,edge});
      if(to===goalLabel){const path=[];let q=to;while(q!==currentLabel){const row=parent.get(q);path.unshift(row.edge);q=row.from;}return path;}
      queue.push(to);
    }
  }
  return null;
}
export function chooseAutopilotAction(raw,cfg){
  const s=raw||{},c=cleanAutopilotConfig(cfg),player=s.player||{},map=String(s.map||'');
  if(!s.online||!s.ready)return {type:'idle',reason:'Aguardando sessão online'};
  if(s.jumping)return {type:'idle',reason:'Viajando pelo portal'};
  if(!AUTOPILOT_ALLOWED_MAPS.includes(map))return {type:'pause',reason:'Mapa especial/PvP não permitido'};
  if(s.repairRequired||!(player.hp>0))return {type:'pause',reason:'Nave destruída: reparar manualmente'};
  const hpRatio=player.hp/Math.max(1,player.maxHp);
  if(hpRatio<=c.hpRetreat/100){
    if(map!=='x1')return {type:'route',map:'x1',reason:'Retornando para reparação'};
    if(!s.atBase)return {type:'move',x:s.base.x,y:s.base.y,reason:'Reparação na base'};
    if(hpRatio<.80)return {type:'idle',reason:'Aguardando recuperação de HP'};
  }
  const cargoRatio=(Number(s.cargoUsed)||0)/Math.max(1,Number(s.cargoCapacity)||1);
  if(c.autoSell&&cargoRatio>=c.cargoThreshold/100){
    if(s.canSell)return {type:'sell',reason:'Vendendo recursos no comércio oficial'};
    if(map!=='x1')return {type:'route',map:'x1',reason:'Voltando à base para vender'};
    return {type:'move',x:s.base.x,y:s.base.y,reason:'Aproximando do comerciante'};
  }
  // Reabastecimento fora da base exige o CPU padrão. Sem ele, voltar ao comércio.
  if(c.autoBuy&&Number(s.ammoStock)<=0&&!s.buyPermitted){
    if(map!=='x1')return {type:'route',map:'x1',reason:'Munição esgotada: voltando à loja'};
    return {type:'move',x:s.base.x,y:s.base.y,reason:'Reabastecendo no comerciante'};
  }
  if(map!==c.map)return {type:'route',map:c.map,reason:`Rota até ${c.map.toUpperCase()}`};
  const candidates=[];
  if(c.drops&&s.cargoFree>0){for(const drop of s.loot||[])if(drop&&Number.isFinite(drop.x)&&Number.isFinite(drop.y)&&(!Number.isFinite(drop.expiresAt)||drop.expiresAt>s.timeSec))candidates.push({...drop,kind:'drop',priority:0});}
  if(c.boxes){for(const box of s.bonusBoxes||[])if(box&&Number.isFinite(box.x)&&Number.isFinite(box.y))candidates.push({...box,kind:'box',priority:1});}
  if(c.ores&&s.cargoFree>0){for(const ore of s.ores||[])if(ore&&Number.isFinite(ore.x)&&Number.isFinite(ore.y))candidates.push({...ore,kind:'ore',priority:2});}
  const close=candidates.filter(e=>dist(e,player)<=1300).sort((a,b)=>a.priority-b.priority||dist(a,player)-dist(b,player))[0];
  if(close)return {type:'move',x:close.x,y:close.y,reason:`Coletando ${close.kind}`,targetId:close.id};
  const npcs=(s.enemies||[]).filter(e=>e&&!e.isPlayer&&!e.warBot&&!e.isHidden&&e.hp>0&&Number.isFinite(e.x)&&Number.isFinite(e.y)
    &&(c.npcTypes.length===0?!String(e.type||'').toLowerCase().startsWith('boss'):c.npcTypes.includes(String(e.type||''))));
  npcs.sort((a,b)=>{
    if(c.mode==='profit'){
      const as=(Math.max(0,Number(a.credits)||0)+Math.max(0,Number(a.uridium)||0)*100)/Math.max(1,(Number(a.hp)||0)+(Number(a.shield)||0));
      const bs=(Math.max(0,Number(b.credits)||0)+Math.max(0,Number(b.uridium)||0)*100)/Math.max(1,(Number(b.hp)||0)+(Number(b.shield)||0));
      if(Math.abs(bs-as)>0.0001)return bs-as;
    }
    return dist(a,player)-dist(b,player);
  });
  const npc=npcs[0];if(npc)return {type:'hunt',targetId:npc.id,x:npc.x,y:npc.y,reason:'Caçando '+String(npc.name||npc.type)};
  // Não inventar inimigos ou recompensas quando a sala está vazia.
  return {type:'idle',reason:'Aguardando NPCs e drops'};
}
export function createStellarAutopilotV48({credentials,getIdentity=()=>null,getSnapshot,npcTypes=[],getPortals,getGraphLabel,getGoalLabel,mayTravel,navigate,jumpPortal,selectNpc,stopFire=()=>{},fireRocket,sellCargo,buyPackage,onNotice=()=>{}}={}){
  let allowed=false,isAdmin=false,authorizedId=null,running=false,loading=false,busy=false,lastTickAt=0,lastAccessAt=0,nextAccessAt=0,panelOpen=false;
  let config=cleanAutopilotConfig(),started=0,ended=0,spent=0,attempts=0,failures=0,boxes=0,drops=0,ores=0,reason='Desligado',startStats=null,lastProgress=null;
  let panel=null,fab=null,grantCache=new Map(),refreshingAccess=false,lastPurchaseAttempt=0;
  const now=()=>Date.now();
  function authHeaders(){const v=credentials()||{};if(!v.accessToken)throw Error('Sessão necessária');return {'Content-Type':'application/json',Authorization:`Bearer ${v.accessToken}`,'X-Game-Session-Id':v.gameSessionId||''};}
  async function request(url,options={}){const res=await fetch(url,{...options,headers:authHeaders(),cache:'no-store'});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||`Erro ${res.status}`);return data;}
  function accessReady(){return allowed&&authorizedId===String(getIdentity()||'')&&lastAccessAt>0&&now()-lastAccessAt<75000;}
  function notify(t){reason=t;onNotice(t);renderStatus();}
  function stop(why='Interrompido'){running=false;busy=false;stopFire();reason=why;ended=now();try{const s=getSnapshot();if(s)lastProgress=stats(s);}catch{}renderStatus();}
  function stats(s){return {xp:Number(s?.xp)||0,credits:Number(s?.credits)||0,stl:Number(s?.stl)||0,kills:Number(s?.kills)||0,boxes:Number(s?.boxes)||0,level:Number(s?.level)||1};}
  function sessionReport(){const duration=Math.max(1,((running?now():ended||now())-started)/3600000);const last=lastProgress||stats(getSnapshot());const first=startStats||last;
    return {map:config.map,minutes:Math.round(duration*60),hours:duration,boxes,drops,ores,kills:Math.max(0,last.kills-first.kills),xp:Math.max(0,last.xp-first.xp),grossCredits:last.credits-first.credits+spent,creditsNet:last.credits-first.credits,stl:last.stl-first.stl,spent,levelFrom:first.level,levelTo:last.level,attempts,failures,reason,
    xpPerHour:Math.max(0,last.xp-first.xp)/duration,crPerHour:(last.credits-first.credits)/duration,stlPerHour:(last.stl-first.stl)/duration};}
  function renderStatus(){if(!panel)return;const status=panel.querySelector('[data-ap-status]');if(status)status.textContent=(running?'ATIVO • ':'PARADO • ')+reason;
    const start=panel.querySelector('[data-ap-start]'),stopButton=panel.querySelector('[data-ap-stop]');if(start)start.disabled=!allowed||running||loading;if(stopButton)stopButton.disabled=!running;
    const rep=panel.querySelector('[data-ap-report]');if(rep&&started){const r=sessionReport();rep.textContent=`${r.minutes} min • ${r.kills} NPC • ${fmt(r.xp)} XP • CR líq. ${fmt(r.creditsNet)} • STL ${fmt(r.stl)} • BOX ${r.boxes} • Drop ${r.drops} • Compras ${fmt(r.spent)} CR • Falhas ${r.failures}`;}
    if(fab)fab.textContent=running?'🤖 AUTO • ON':'🤖 AUTOPILOT';
  }
  async function refreshAccess(){if(refreshingAccess)return allowed;refreshingAccess=true;
    try{const identity=String(getIdentity()||'');const s=await request('/api/autopilot/v48/access');if(identity!==String(getIdentity()||'')){allowed=false;return false;}authorizedId=identity;allowed=s.allowed===true;isAdmin=s.is_admin===true;lastAccessAt=now();nextAccessAt=now()+45000;if(!allowed&&running)stop('Permissão retirada pelo ADM');if(fab)fab.hidden=!allowed;if(panel&&!allowed){panel.hidden=true;panelOpen=false;}return allowed;}
    catch(e){allowed=false;authorizedId=null;nextAccessAt=now()+12000;if(running)stop('Sem verificação de acesso online');if(fab)fab.hidden=true;return false;}
    finally{refreshingAccess=false;renderStatus();}
  }
  function exportReport(){const r=sessionReport();return `STELLAR AUTOPILOT • RELATÓRIO V48\nMapa ${r.map.toUpperCase()} • ${r.minutes} min\nNPC ${r.kills} • XP ${r.xp} • Nível ${r.levelFrom} → ${r.levelTo}\nCR líquidos ${r.creditsNet} • STL líquidos ${r.stl} • BOX ${r.boxes} • Drops ${r.drops} • Minérios ${r.ores} • Gastos munição CR ${r.spent}\nXP/h ${Math.round(r.xpPerHour)} • CR líquidos/h ${Math.round(r.crPerHour)} • STL/h ${Math.round(r.stlPerHour)}\nTentativas de compra ${r.attempts} • Falhas ${r.failures}\nSituação ${r.reason}`;}
  function controls(){return `<div class="ap-wrap"><header><b>🤖 STELLAR AUTOPILOT</b><button type="button" data-ap-close>FECHAR</button></header>
  <small>Farm assistido pelo piloto conectado • ações e prêmios seguem regras normais • somente enquanto esta aba do jogo estiver ativa.</small>
  <div class="ap-grid"><label>Mapa<select data-ap-field="map">${AUTOPILOT_ALLOWED_MAPS.map(m=>`<option value="${m}" ${m===config.map?'selected':''}>${m.toUpperCase().replace('X','X-').replace('U','U-')}</option>`).join('')}</select></label>
  <label>Seleção NPC<select data-ap-field="mode"><option value="nearest">Mais próximo</option><option value="profit">Melhor lucro estimado</option></select></label></div>
  <details><summary>NPCs permitidos (nenhum marcado = comuns)</summary><div class="ap-npcs">${npcTypes.filter(n=>n?.id&&/^[a-zA-Z0-9_-]+$/.test(n.id)).slice(0,70).map(n=>`<label><input type="checkbox" data-ap-npc="${esc(n.id)}"/>${esc(n.label||n.id)}</label>`).join('')}</div></details>
  <div class="ap-grid ap-checks">${[['boxes','BOX bônus'],['drops','Drops de NPC'],['ores','Mineração'],['autoSell','Venda automática'],['autoBuy','Compra munição'],['rockets','Disparar mísseis']].map(([k,l])=>`<label><input type="checkbox" data-ap-check="${k}" ${config[k]?'checked':''}/> ${l}</label>`).join('')}</div>
  <div class="ap-grid"><label>Venda ao atingir (%)<input data-ap-field="cargoThreshold" type="number" min="50" max="100" value="${config.cargoThreshold}"/></label>
  <label>Recuar HP (%)<input data-ap-field="hpRetreat" type="number" min="10" max="80" value="${config.hpRetreat}"/></label>
  <label>Duração (min)<input data-ap-field="minutes" type="number" min="5" max="360" value="${config.minutes}"/></label>
  <label>Limite compras CR<input data-ap-field="budget" type="number" min="0" value="${config.budget}"/></label>
  <label>Compra quando laser abaixo de<input data-ap-field="ammoMin" type="number" min="0" value="${config.ammoMin}"/></label>
  <label>Compra quando míssil abaixo de<input data-ap-field="rocketMin" type="number" min="0" value="${config.rocketMin}"/></label></div>
  <div class="ap-actions"><button type="button" data-ap-start>▶ INICIAR BOT</button><button type="button" data-ap-stop>■ PARAR</button><button type="button" data-ap-copy>📋 RELATÓRIO</button></div>
  <div data-ap-status class="ap-status">PARADO</div><div data-ap-report class="ap-status"></div></div>`;}
  function readConfig(){if(!panel)return config;const next={...config};for(const field of panel.querySelectorAll('[data-ap-field]'))next[field.dataset.apField]=field.value;
    for(const field of panel.querySelectorAll('[data-ap-check]'))next[field.dataset.apCheck]=field.checked;
    next.npcTypes=[...panel.querySelectorAll('[data-ap-npc]:checked')].map(x=>x.dataset.apNpc);return cleanAutopilotConfig(next);
  }
  function renderUI(){if(!document.body||panel)return;
    const style=document.createElement('style');style.textContent=`
    #autopilotFabV48{position:fixed;bottom:74px;right:12px;z-index:7900;border:1px solid #48c9ef;border-radius:18px;padding:8px 11px;background:#09243c;color:#c4f5ff;font-weight:800;font-size:11px;box-shadow:0 0 14px #1abfe044}
    #autopilotPanelV48{position:fixed;inset:0;z-index:12000;background:#000b;display:flex;align-items:center;justify-content:center;padding:12px}
    #autopilotPanelV48[hidden],#autopilotFabV48[hidden]{display:none!important}
    #autopilotPanelV48 .ap-wrap{box-sizing:border-box;max-height:90dvh;overflow-y:auto;width:min(510px,100%);border:1px solid #247e9b;border-radius:18px;padding:15px;background:linear-gradient(140deg,#051427,#061e32);color:#dcf8ff;font:13px system-ui,sans-serif}
    #autopilotPanelV48 header{display:flex;align-items:center;justify-content:space-between;gap:9px;font-size:17px;margin-bottom:8px}
    #autopilotPanelV48 button,#autopilotPanelV48 input,#autopilotPanelV48 select{background:#071a2d;border:1px solid #266078;border-radius:10px;color:#ddfaff;padding:9px;max-width:100%;box-sizing:border-box}
    #autopilotPanelV48 button{cursor:pointer;font-weight:800}
    #autopilotPanelV48 .ap-actions button:first-child{background:#073c4b;border-color:#32d9ee}
    #autopilotPanelV48 .ap-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}
    #autopilotPanelV48 .ap-grid label{font-size:12px;display:flex;flex-direction:column;gap:5px;color:#add9e9}
    #autopilotPanelV48 .ap-checks label,#autopilotPanelV48 .ap-npcs label{display:flex;flex-direction:row;align-items:center;gap:7px}
    #autopilotPanelV48 .ap-npcs{display:grid;grid-template-columns:1fr 1fr;gap:4px;max-height:110px;overflow:auto}
    #autopilotPanelV48 details{border:1px solid #21415c;border-radius:9px;padding:9px}
    #autopilotPanelV48 .ap-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
    #autopilotPanelV48 .ap-status{padding:8px;margin-top:9px;border:1px solid #1f445c;border-radius:9px;color:#9edcf4}
    .ap-grant-row-v48{display:flex;align-items:center;gap:9px;margin:8px 0 0;font-size:12px;color:#b6eafc}
    .ap-grant-row-v48 input{accent-color:#24c9ee;width:17px;height:17px}
    `;document.head.appendChild(style);
    fab=document.createElement('button');fab.type='button';fab.id='autopilotFabV48';fab.textContent='🤖 AUTOPILOT';fab.hidden=true;fab.onclick=()=>open();document.body.appendChild(fab);
    panel=document.createElement('div');panel.id='autopilotPanelV48';panel.hidden=true;panel.innerHTML=controls();document.body.appendChild(panel);
    panel.querySelector('[data-ap-close]').onclick=()=>{panel.hidden=true;panelOpen=false;};
    panel.addEventListener('click',e=>{if(e.target===panel){panel.hidden=true;panelOpen=false;}});
    panel.querySelector('[data-ap-start]').onclick=()=>{config=readConfig();start();};
    panel.querySelector('[data-ap-stop]').onclick=()=>stop('Parado pelo piloto');
    panel.querySelector('[data-ap-copy]').onclick=()=>{const text=exportReport();navigator.clipboard?.writeText(text).then(()=>notify('Relatório copiado')).catch(()=>notify(text));};
    renderStatus();
  }
  function open(){renderUI();if(!accessReady())return;panel.hidden=false;panelOpen=true;renderStatus();}
  function start(){if(!accessReady())return notify('Permissão não confirmada');if(running)return;const s=getSnapshot();if(!s?.online||!s.ready)return notify('Entre no universo online para ativar');
    config=readConfig();started=now();ended=0;spent=0;attempts=0;failures=0;boxes=0;drops=0;ores=0;startStats=stats(s);lastProgress=startStats;lastTickAt=0;
    running=true;notify('Rota '+config.map.toUpperCase()+' iniciada');}
  async function safeBuy(s){if(busy||!config.autoBuy||!s.buyPermitted)return;const opts=[{kind:'ammo',stock:s.ammoStock,min:config.ammoMin,quote:s.ammoQuote},{kind:'rocket',stock:s.rocketStock,min:config.rocketMin,quote:s.rocketQuote}];
    for(const opt of opts){const q=opt.quote;if(!q||!q.catalog_key||q.shop_visible===false||Number(opt.stock)>=opt.min||q.currency!=='credits')continue;
      const cost=Number(q.price)||0;if(cost<=0||cost>config.budget-spent||cost>Number(s.credits)||!Number.isFinite(cost))continue;
      attempts++;busy=true;try{const ok=await buyPackage(q.catalog_key,opt.kind);if(ok){spent+=cost;notify('Reabastecimento validado pelo servidor');}else failures++;}catch(e){failures++;notify('Compra recusada: '+e.message);}finally{busy=false;}break;
    }
  }
  async function routeTo(s,map){const want=getGoalLabel(map);const path=findAutopilotPortalPath(getGraphLabel(),want,getPortals,mayTravel);
    if(!path){stop('Sem rota permitida para '+want);return;}
    if(path.length===0)return;
    const p=path[0];const d=dist(s.player,p);if(d>43){navigate(p.x,p.y);notify(`Portal → ${p.targetLabel}`);return;}
    if(busy)return;busy=true;try{await jumpPortal(p);notify('Viajando para '+p.targetLabel);}catch(e){stop('Portal recusado: '+e.message);}finally{busy=false;}
  }
  function tick(){if(!running)return;const ts=now();if(ts-lastTickAt<380)return;lastTickAt=ts;
    if(ts>=nextAccessAt&&!refreshingAccess)void refreshAccess();
    if(!accessReady()){stop('Acesso precisa ser validado');return;}
    if(ts-started>config.minutes*60000){stop('Tempo de farm concluído');return;}
    const s=getSnapshot();if(!s||!s.online||!s.ready){stop('Sessão offline');return;}
    lastProgress=stats(s);
    if(busy)return;
    if(config.autoBuy&&ts-lastPurchaseAttempt>7000){lastPurchaseAttempt=ts;void safeBuy(s);}
    const action=chooseAutopilotAction(s,config);
    if(action.type==='pause'){stop(action.reason);return;}
    if(action.type!=='hunt')stopFire();
    if(action.type==='route'){void routeTo(s,action.map);return;}
    if(action.type==='sell'){busy=true;Promise.resolve(sellCargo()).then(()=>notify('Venda finalizada')).catch(e=>{failures++;notify('Falha na venda: '+e.message);}).finally(()=>{busy=false;});return;}
    if(action.type==='move'){navigate(action.x,action.y);notify(action.reason);return;}
    if(action.type==='hunt'){
      const enemy=(s.enemies||[]).find(e=>e?.id===action.targetId&&e.hp>0);if(!enemy)return;
      const range=Math.max(180,(Number(s.laserRange)||800)*config.combatRange);const d=dist(s.player,enemy);
      selectNpc(enemy,d<=Number(s.laserRange));
      if(d>range){const ratio=(d-range+35)/Math.max(1,d);navigate(s.player.x+(enemy.x-s.player.x)*ratio,s.player.y+(enemy.y-s.player.y)*ratio);}
      else if(config.rockets&&d<=Number(s.rocketRange)&&s.rocketReady)fireRocket();
      notify(action.reason);
    }else notify(action.reason);
  }
  async function decorateAdminUsers(root,users){if(!root)return;if(!isAdmin){await refreshAccess();if(!isAdmin)return;}const seen=[...root.querySelectorAll('[data-admin-user]')];if(!seen.length)return;
    try{const res=await request('/api/admin/autopilot/v48/grants');grantCache=new Map((res.grants||[]).map(x=>[String(x.user_id),x.enabled===true]));}catch{return;}
    for(const card of seen){const id=String(card.dataset.adminUser||'');if(!id||!users.some(u=>String(u.user_id)===id)||card.querySelector('[data-ap-grant]'))continue;
      const u=users.find(x=>String(x.user_id)===id);if(u?.is_admin)continue;
      const wrap=document.createElement('label');wrap.className='ap-grant-row-v48';const input=document.createElement('input');input.type='checkbox';input.dataset.apGrant=id;input.checked=grantCache.get(id)===true;
      const label=document.createElement('span');label.textContent='🤖 AUTOPILOT • acesso individual (ADM)';wrap.append(input,label);card.appendChild(wrap);
      input.onchange=async()=>{input.disabled=true;try{await request('/api/admin/autopilot/v48/grants/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({enabled:input.checked})});notify('Permissão do piloto atualizada');}
        catch(e){input.checked=!input.checked;notify('Falha ao alterar permissão: '+e.message);}finally{input.disabled=false;}};
    }
  }
  function recordCollect(kind){if(!running)return;if(kind==='box')boxes++;else if(kind==='drop')drops++;else if(kind==='ore')ores++;}
  renderUI();
  return {open,tick,stop,start,recordCollect,refreshAccess,decorateAdminUsers,get active(){return running;},get allowed(){return allowed;},get isAdmin(){return isAdmin;},get config(){return {...config}}};
}
