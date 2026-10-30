/* STELLAR_AUTOPILOT_PHASE3_V483 • Fase 3: rotas, comércio e munição controlados. */
/* Stellar Legacy V48 — Autopilot assistido (sessão aberta).
 * Não credita recompensas, não escreve saves externos e não concede acesso.
 * Todas as ações reais passam pelos métodos normais do jogo e do Render.
 */
export const AUTOPILOT_ALLOWED_MAPS=Object.freeze(['x1','x2','x3','x4','x5','x6','x7','x8','u1','u2','u3']);
export const AUTOPILOT_DEFAULTS=Object.freeze({map:'x1',npcTypes:[],boxes:true,drops:true,ores:false,autoSell:true,autoBuy:true,rockets:true,
  cargoThreshold:85,hpRetreat:30,minutes:120,budget:50000,ammoMin:250,rocketMin:15,combatRange:0.78,mode:'nearest',astralAssist:false,astralGate:'alpha',astralBudget:50000,
  astralBatch:10,astralLoop:false,astralTotalBudget:50000,astralMaxCycles:0});
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
    minutes:number(input.minutes,input.astralLoop===true?0:5,360,120),budget:number(input.budget,0,10000000,50000),
    ammoMin:number(input.ammoMin,0,1000000,250),rocketMin:number(input.rocketMin,0,1000000,15),
    combatRange:number(input.combatRange,0.55,0.93,0.78),mode:['nearest','profit'].includes(input.mode)?input.mode:'nearest',
    astralAssist:input.astralAssist===true,astralGate:['alpha','beta','gamma'].includes(input.astralGate)?input.astralGate:'alpha',
    astralBudget:number(input.astralBudget,0,1000000,50000),
    astralBatch:[10,50].includes(Number(input.astralBatch))?Number(input.astralBatch):10,
    astralLoop:input.astralLoop===true,
    astralTotalBudget:number(input.astralTotalBudget,0,1000000000,50000),
    astralMaxCycles:number(input.astralMaxCycles,0,100000,0),
    preferredTargetId:typeof input.preferredTargetId==='string'&&input.preferredTargetId.length<=90?input.preferredTargetId:null};
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
/** V87: avoid thrashing between similar NPC targets every rAF/WS update. */
export function chooseStableAutopilotTargetV87(sortedEnemies,player,preferredId,leash=1.28){
 const options=Array.isArray(sortedEnemies)?sortedEnemies:[];
 if(!options.length)return null;
 const nearest=options[0];
 if(!preferredId)return nearest;
 const current=options.find(e=>String(e.id)===String(preferredId));
 if(!current)return nearest;
 const distance=(e)=>Math.hypot((e.x||0)-(player?.x||0),(e.y||0)-(player?.y||0));
 return distance(current)<=Math.max(240,distance(nearest)*leash)?current:nearest;
}
export function chooseAutopilotAction(raw,cfg){
  const s=raw||{},c=cleanAutopilotConfig(cfg),player=s.player||{},map=String(s.map||'');
  if(!s.online||!s.ready)return {type:'idle',reason:'Aguardando sessão online'};
  if(s.jumping)return {type:'idle',reason:'Viajando pelo portal'};
  const inAstral=s.astralActive===true&&c.astralAssist===true&&['ggAlpha','ggBeta','ggGamma'].includes(map);
  if(!AUTOPILOT_ALLOWED_MAPS.includes(map)&&!inAstral)return {type:'pause',reason:'Mapa especial/PvP não permitido'};
  if(s.repairRequired||!(player.hp>0))return {type:'pause',reason:'Nave destruída: reparar manualmente'};
  const hpRatio=player.hp/Math.max(1,player.maxHp);
  if(hpRatio<=c.hpRetreat/100){
    if(inAstral)return {type:'pause',reason:'HP crítico no Portal • assistência parada para preservar vidas'};
    if(map!=='x1')return {type:'route',map:'x1',reason:'Retornando para reparação'};
    if(!s.atBase)return {type:'move',x:s.base.x,y:s.base.y,reason:'Reparação na base'};
    if(hpRatio<.80)return {type:'idle',reason:'Aguardando recuperação de HP'};
  }
  const cargoRatio=(Number(s.cargoUsed)||0)/Math.max(1,Number(s.cargoCapacity)||1);
  if(!inAstral&&c.autoSell&&s.remoteTraderEquipped===true&&cargoRatio>=c.cargoThreshold/100){
    return s.canSell?{type:'sell',reason:'Venda remota automática • CPU equipado'}:{type:'idle',reason:'Terminal remoto indisponível • aguardando sincronização'};
  }
  // Reabastecimento fora da base exige o CPU padrão. Sem ele, voltar ao comércio.
  // Uma volta à base deve abastecer munições e mísseis antes de retomar o setor escolhido.
  // Preços e saldos vêm da loja oficial; nenhum item é gerado localmente.
  const affordable=q=>!!q?.catalog_key&&q.currency==='credits'
    &&q.shop_visible!==false&&Number.isFinite(Number(q.price))&&Number(q.price)>0
    &&Number(q.price)<=Number(s.credits)&&Number(q.price)<=Number(s.purchaseBudgetRemaining??c.budget);
  const lowLaser=!inAstral&&c.autoBuy&&Number(s.ammoStock)<c.ammoMin&&affordable(s.ammoQuote);
  const lowRocket=!inAstral&&c.autoBuy&&c.rockets&&Number(s.rocketStock)<c.rocketMin&&affordable(s.rocketQuote);
  if(lowLaser||lowRocket){
    if(!s.buyPermitted){
      if(map!=='x1')return {type:'route',map:'x1',reason:'Repondo munições: retornando à loja'};
      return {type:'move',x:s.base.x,y:s.base.y,reason:'Aproximando do comerciante'};
    }
    // Não atravessar o portal de volta enquanto o servidor ainda compra o próximo pacote.
    return {type:'idle',reason:'Reabastecendo '+(lowLaser?'laser':'mísseis')+' na loja oficial'};
  }
  if(map!==c.map&&!inAstral)return {type:'route',map:c.map,reason:`Rota até ${c.map.toUpperCase()}`};
  // V48.1.2: drops reais de NPC continuam prioritários para coleta, mas NÃO
  // cancelam o combate de NPC já alcançável. BOX BÔNUS/minério ficam atrás da caça.
  const npcs=(s.enemies||[]).filter(e=>e&&!e.isPlayer&&!e.warBot&&!e.isHidden&&e.hp>0&&Number.isFinite(e.x)&&Number.isFinite(e.y)
    &&(inAstral?true:(c.npcTypes.length===0?!String(e.type||'').toLowerCase().startsWith('boss'):c.npcTypes.includes(String(e.type||'')))));
  npcs.sort((a,b)=>{
    if(c.mode==='profit'){
      const as=(Math.max(0,Number(a.credits)||0)+Math.max(0,Number(a.uridium)||0)*100)/Math.max(1,(Number(a.hp)||0)+(Number(a.shield)||0));
      const bs=(Math.max(0,Number(b.credits)||0)+Math.max(0,Number(b.uridium)||0)*100)/Math.max(1,(Number(b.hp)||0)+(Number(b.shield)||0));
      if(Math.abs(bs-as)>0.0001)return bs-as;
    }
    return dist(a,player)-dist(b,player);
  });
  const realDrops=c.drops&&Number(s.cargoFree)>0?(s.loot||[]).filter(drop=>drop&&Number.isFinite(drop.x)&&Number.isFinite(drop.y)
    &&(!Number.isFinite(drop.expiresAt)||drop.expiresAt>s.timeSec)&&dist(drop,player)<=1300):[];
  realDrops.sort((a,b)=>dist(a,player)-dist(b,player));
  const drop=realDrops[0];
  if(drop){
    const laserRange=Math.max(0,Number(s.laserRange)||0);
    // Só atacar um NPC válido que JÁ está no alcance real da arma; nunca dispara fora da distância.
    const inRange=npcs.filter(e=>dist(e,player)<=laserRange).sort((a,b)=>dist(a,player)-dist(b,player))[0];
    return {type:'move',x:drop.x,y:drop.y,reason:inRange?'Coletando drop • combatendo NPC em alcance':'Coletando drop de NPC',
      targetId:drop.id,combatTargetId:inRange?.id||null};
  }
  const npc=chooseStableAutopilotTargetV87(npcs,player,c.preferredTargetId);if(npc)return {type:'hunt',targetId:npc.id,x:npc.x,y:npc.y,reason:'Caçando '+String(npc.name||npc.type)};
  const extras=[];
  if(c.boxes){for(const box of s.bonusBoxes||[])if(box&&Number.isFinite(box.x)&&Number.isFinite(box.y))extras.push({...box,kind:'box',priority:0});}
  if(c.ores&&Number(s.cargoFree)>0){for(const ore of s.ores||[])if(ore&&Number.isFinite(ore.x)&&Number.isFinite(ore.y))extras.push({...ore,kind:'ore',priority:1});}
  const close=extras.filter(e=>dist(e,player)<=1300).sort((a,b)=>a.priority-b.priority||dist(a,player)-dist(b,player))[0];
  if(close)return {type:'move',x:close.x,y:close.y,reason:`Coletando ${close.kind}`,targetId:close.id};
  // Não inventar inimigos ou recompensas quando a sala está vazia.
  return {type:'idle',reason:'Aguardando NPCs e drops'};
}
export function createStellarAutopilotV48({credentials,getIdentity=()=>null,getSnapshot,npcTypes=[],getPortals,getGraphLabel,getGoalLabel,mayTravel,navigate,jumpPortal,selectNpc,stopFire=()=>{},fireRocket,sellCargo,buyPackage,ensureCombatAmmo=()=>true,onNotice=()=>{},getAstralState=()=>null,assembleAstral=async()=>false,enterAstral=async()=>false,confirmAstralLoop=async message=>window.confirm(message)}={}){
  let allowed=false,isAdmin=false,authorizedId=null,running=false,loading=false,busy=false,lastTickAt=0,lastAccessAt=0,nextAccessAt=0,panelOpen=false;
  let config=cleanAutopilotConfig(),started=0,ended=0,spent=0,attempts=0,failures=0,boxes=0,drops=0,ores=0,reason='Desligado',startStats=null,lastProgress=null;
  let panel=null,fab=null,grantCache=new Map(),refreshingAccess=false,lastPurchaseAttempt=0,lastHealthyAt=0,lastMapId=null;
  // V87: target lock and rocket throttling are in-memory, never persisted.
  let preferredTargetId=null,preferredTargetAt=0,lastRocketAt=0;
  function fireRocketRateLimitedV87(ts){if(ts-lastRocketAt<1250)return false;lastRocketAt=ts;fireRocket();return true;}
  let astralBuildBusy=false,astralBuildCancel=false,astralRunSeen=false;
  // V83 • Ciclo contínuo somente após confirmação explícita; estado volátil (nunca retomado depois de refresh).
  let astralLoopSpent=0,astralCycles=0,astralLoopBusy=false,astralLoopEpoch=0;
  let astralLoopPhase='parado',astralLoopNextAt=0,astralLoopEnteredAt=0,astralLoopLastCompleted=0,astralLoopLastFailed=0;
  let astralLoopMapWaitSince=0,astralLoopHealSince=0,astralLoopAmmoWaitSince=0;
  // STELLAR_AUTOPILOT_PHASE3_V483: checkpoints somente em memoria durante a aba conectada.
  let pendingJump=null,lastPortalAttempt=0,nextRouteSearch=0,routeMisses=0,nextSaleAttempt=0,buyFailuresInRow=0,lastCheckpointAt=0;
  const now=()=>Date.now();
  const resumeKey='stellar_autopilot_phase3_v483_resume';
  function clearResume(){try{sessionStorage.removeItem(resumeKey);}catch{}}
  function checkpoint(force=false){
    if(!running||config.astralLoop)return; // Jamais restaurar compras recorrentes após reload.
    const ts=now();if(!force&&ts-lastCheckpointAt<15000)return;
    lastCheckpointAt=ts;
    const user=String(getIdentity()||'');if(!user)return;
    try{sessionStorage.setItem(resumeKey,JSON.stringify({user,config,started,spent,attempts,failures,boxes,drops,ores,storedAt:ts}));}catch{}
  }
  function restoreCheckpoint(){
    if(running||!accessReady())return false;
    let saved;try{saved=JSON.parse(sessionStorage.getItem(resumeKey)||'null');}catch{return false;}
    if(!saved)return false;
    const ts=now(),user=String(getIdentity()||'');
    if(!user||saved.user!==user||!Number.isFinite(saved.storedAt)||ts-saved.storedAt>600000||
        !Number.isFinite(saved.started)||ts-saved.started>360*60000){clearResume();return false;}
    const s=getSnapshot();
    if(!s?.online||!s.ready||!AUTOPILOT_ALLOWED_MAPS.includes(s.map))return false;
    const recovered=cleanAutopilotConfig(saved.config);
    if(recovered.astralLoop){clearResume();return false;} // Exige nova confirmação a cada sessão.
    if(ts-saved.started>recovered.minutes*60000){clearResume();return false;}
    config=recovered;started=saved.started;spent=number(saved.spent,0,recovered.budget,0);
    attempts=number(saved.attempts,0,1000000,0);failures=number(saved.failures,0,1000000,0);
    boxes=number(saved.boxes,0,1000000,0);drops=number(saved.drops,0,1000000,0);ores=number(saved.ores,0,1000000,0);
    ended=0;lastProgress=stats(s);startStats=lastProgress;lastHealthyAt=ts;lastMapId=s.map;
    pendingJump=null;lastPortalAttempt=0;nextRouteSearch=0;routeMisses=0;nextSaleAttempt=0;buyFailuresInRow=0;
    running=true;lastTickAt=0;checkpoint(true);
    notify('Sessão restaurada e acesso validado • retomando '+config.map.toUpperCase());return true;
  }
  function authHeaders(){const v=credentials()||{};if(!v.accessToken)throw Error('Sessão necessária');return {'Content-Type':'application/json',Authorization:`Bearer ${v.accessToken}`,'X-Game-Session-Id':v.gameSessionId||''};}
  // STELLAR_NETWORK_RECOVERY_V4831: all grant lookups terminate, including a stalled response body.
  async function request(url,options={}){
    const controller=new AbortController();let expired=false;
    const timer=setTimeout(()=>{expired=true;controller.abort();},15000);
    try{const res=await fetch(url,{...options,headers:authHeaders(),signal:controller.signal,cache:'no-store'});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){const e=Error(data.error||`Erro ${res.status}`);e.status=res.status;e.code=data.code||null;throw e;}
      return data;
    }catch(e){if(expired){const timeout=Error('Tempo limite na consulta ao Autopilot');timeout.code='NETWORK_TIMEOUT';throw timeout;}throw e;}
    finally{clearTimeout(timer);}
  }
  function accessReady(){return allowed&&authorizedId===String(getIdentity()||'')&&lastAccessAt>0&&now()-lastAccessAt<75000;}
  // V82: recheck a stale entitlement before concluding that it is denied.
  // HTTP 403/no grant is still authoritative: never bypass it for Astral rewards.
  async function ensureAuthorizedV82(){
    if(accessReady())return true;
    const accepted=await refreshAccess();
    if(accepted&&accessReady())return true;
    notify('Autopilot sem permissão para esta conta • solicite ao ADM em JOGADORES → AUTOPILOT ou reentre com a conta autorizada');
    return false;
  }
  let lastRoutineNoticeAt=0,pendingRoutineNotice=null,noticeTimer=null;
  function notify(t){
    if(reason===t)return;
    reason=t;
    const critical=/falha|erro|negad|sem permissão|não foi possível|interrompid|parado|destruíd|HP crítico|revog|sem sincronização|gasto|limite|autorizado|confirmado|concluído/i.test(t);
    const elapsed=now()-lastRoutineNoticeAt;
    if(!critical&&elapsed<1000){
      pendingRoutineNotice=t;
      if(!noticeTimer)noticeTimer=setTimeout(()=>{noticeTimer=null;const last=pendingRoutineNotice;pendingRoutineNotice=null;if(last){lastRoutineNoticeAt=now();onNotice(last);renderStatus();}},1000-elapsed);
      return;
    }
    if(critical&&noticeTimer){clearTimeout(noticeTimer);noticeTimer=null;pendingRoutineNotice=null;}
    lastRoutineNoticeAt=now();onNotice(t);renderStatus();
  }
  function stop(why='Interrompido'){if(noticeTimer){clearTimeout(noticeTimer);noticeTimer=null;pendingRoutineNotice=null;}preferredTargetId=null;lastRocketAt=0;astralBuildCancel=true;astralLoopEpoch++;astralLoopPhase='parado';running=false;busy=false;pendingJump=null;clearResume();stopFire();reason=why;ended=now();try{const s=getSnapshot();if(s)lastProgress=stats(s);}catch{}renderStatus();}
  function stats(s){return {xp:Number(s?.xp)||0,credits:Number(s?.credits)||0,stl:Number(s?.stl)||0,kills:Number(s?.kills)||0,boxes:Number(s?.boxes)||0,level:Number(s?.level)||1};}
  function sessionReport(){const duration=Math.max(1,((running?now():ended||now())-started)/3600000);const last=lastProgress||stats(getSnapshot());const first=startStats||last;
    return {map:config.map,minutes:Math.round(duration*60),hours:duration,boxes,drops,ores,kills:Math.max(0,last.kills-first.kills),xp:Math.max(0,last.xp-first.xp),grossCredits:last.credits-first.credits+spent,creditsNet:last.credits-first.credits,stl:last.stl-first.stl,spent,levelFrom:first.level,levelTo:last.level,attempts,failures,reason,
    astralCycles,astralLoopSpent,astralLoopPhase,astralStlGrossEstimated:(last.stl-first.stl)+astralLoopSpent,
    xpPerHour:Math.max(0,last.xp-first.xp)/duration,crPerHour:(last.credits-first.credits)/duration,stlPerHour:(last.stl-first.stl)/duration};}
  function renderStatus(){if(!panel)return;if(fab)fab.textContent=running?'🤖 AUTO • ON':'🤖 AUTOPILOT';const status=panel.querySelector('[data-ap-status]');if(status)status.textContent=(running?'ATIVO • ':'PARADO • ')+reason;
    const start=panel.querySelector('[data-ap-start]'),stopButton=panel.querySelector('[data-ap-stop]');if(start)start.disabled=!allowed||running||loading;if(stopButton)stopButton.disabled=!running;
    const rep=panel.querySelector('[data-ap-report]');if(rep&&started){const r=sessionReport();rep.textContent=`${r.minutes} min • ${r.kills} NPC • ${fmt(r.xp)} XP • CR líq. ${fmt(r.creditsNet)} • STL ${fmt(r.stl)} • BOX ${r.boxes} • Drop ${r.drops} • Compras ${fmt(r.spent)} CR • Falhas ${r.failures}`;}
    const loopStatus=panel.querySelector('[data-ap-astral-loop-status]');if(loopStatus)loopStatus.textContent=`${config.astralLoop&&running?'♻ CICLO ATIVO':'♻ Ciclo parado'} • ${astralCycles} portal(is) concluído(s) • ${fmt(astralLoopSpent)} STL gastos • ${astralLoopPhase}`;
    const loopStop=panel.querySelector('[data-ap-astral-loop-stop]');if(loopStop)loopStop.disabled=!running||!config.astralLoop;
    const loopStart=panel.querySelector('[data-ap-astral-loop-start]');if(loopStart)loopStart.disabled=running||astralBuildBusy||astralLoopBusy||!accessReady();
    if(fab)fab.textContent=running?'🤖 AUTO • ON':'🤖 AUTOPILOT';if(panel){const state=panel.querySelector('[data-ap-access-v82]');if(state)state.textContent=accessReady()?'✓ Acesso autorizado':'⚠ Acesso não confirmado • verifique a permissão da conta';panel.querySelectorAll('[data-ap-astral-build],[data-ap-astral-enter]').forEach(b=>b.disabled=astralBuildBusy);
      const sellToggle=panel.querySelector('[data-ap-check="autoSell"]'),cpuReady=getSnapshot()?.remoteTraderEquipped===true;
      if(sellToggle){sellToggle.disabled=!cpuReady;sellToggle.title=cpuReady?'Terminal Mercante Remoto equipado':'Equipe o Terminal Mercante Remoto Elite para habilitar venda automática';}
    }
  }
  // Compartilha a mesma consulta entre reabertura manual, login e polling; nunca
  // interpreta uma consulta em andamento como acesso negado ao reabrir a aba.
  let accessPromise=null;
  async function refreshAccess(){
    if(accessPromise)return accessPromise;
    refreshingAccess=true;
    accessPromise=(async()=>{
      const identity=String(getIdentity()||'');
      const hadPreviousGrant=allowed&&authorizedId===identity;
      try{
        const s=await request('/api/autopilot/v48/access');
        if(identity!==String(getIdentity()||'')){allowed=false;authorizedId=null;return false;}
        authorizedId=identity;allowed=s.allowed===true;isAdmin=s.is_admin===true;
        lastAccessAt=now();nextAccessAt=now()+45000;
        if(allowed&&!running)restoreCheckpoint();
        if(!allowed&&running)stop('Permissão retirada pelo ADM');
        if(fab)fab.hidden=false;
        if(panel&&!allowed){panel.querySelectorAll('[data-ap-astral-build],[data-ap-astral-enter],[data-ap-start]').forEach(b=>b.disabled=true);}
        return allowed;
      }catch(e){
        nextAccessAt=now()+12000;
        // STELLAR_NETWORK_RECOVERY_V4831: connection loss pauses the bot, not an explicit revocation.
        if(running&&authorizedId===identity&&identity&&!([401,403].includes(Number(e?.status)))){
          allowed=false;notify('Rede instável • aguardando verificação; rota preservada');
          if(fab)fab.hidden=false;checkpoint(true);return false;
        }
        allowed=false;authorizedId=null;
        if(running)stop('Sem verificação de acesso online');
        if(fab)fab.hidden=!hadPreviousGrant;
        notify('Autopilot: não foi possível revalidar o acesso. Tente novamente.');
        return false;
      }
    })();
    try{return await accessPromise;}
    finally{accessPromise=null;refreshingAccess=false;renderStatus();}
  }
  function exportReport(){const r=sessionReport();return `STELLAR AUTOPILOT • RELATÓRIO V48\nMapa ${r.map.toUpperCase()} • ${r.minutes} min\nNPC ${r.kills} • XP ${r.xp} • Nível ${r.levelFrom} → ${r.levelTo}\nCR líquidos ${r.creditsNet} • STL líquidos ${r.stl} • BOX ${r.boxes} • Drops ${r.drops} • Minérios ${r.ores} • Gastos munição CR ${r.spent}\nXP/h ${Math.round(r.xpPerHour)} • CR líquidos/h ${Math.round(r.crPerHour)} • STL/h ${Math.round(r.stlPerHour)}\nTentativas de compra ${r.attempts} • Falhas ${r.failures}\nPortais concluídos ${r.astralCycles} • STL gastos no materializador ${r.astralLoopSpent} • STL líquidos da sessão ${r.stl} • STL recebidos estimados ${r.astralStlGrossEstimated} • Etapa ${r.astralLoopPhase}\nSituação ${r.reason}`;}
  function controls(){return `<div class="ap-wrap"><header><b>🤖 STELLAR AUTOPILOT</b><button type="button" data-ap-close>FECHAR</button></header>
  <small>Farm assistido pelo piloto conectado • ações e prêmios seguem regras normais • somente enquanto esta aba do jogo estiver ativa.</small>
  <div class="ap-grid"><label>Mapa<select data-ap-field="map">${AUTOPILOT_ALLOWED_MAPS.map(m=>`<option value="${m}" ${m===config.map?'selected':''}>${m.toUpperCase().replace('X','X-').replace('U','U-')}</option>`).join('')}</select></label>
  <label>Seleção NPC<select data-ap-field="mode"><option value="nearest">Mais próximo</option><option value="profit">Melhor lucro estimado</option></select></label></div>
  <details><summary>NPCs permitidos (nenhum marcado = comuns)</summary><div class="ap-npcs">${npcTypes.filter(n=>n?.id&&/^[a-zA-Z0-9_-]+$/.test(n.id)).slice(0,70).map(n=>`<label><input type="checkbox" data-ap-npc="${esc(n.id)}"/>${esc(n.label||n.id)}</label>`).join('')}</div></details>
  <div class="ap-grid ap-checks">${[['boxes','BOX bônus'],['drops','Drops de NPC'],['ores','Mineração'],['autoSell','Venda remota automática (CPU obrigatório)'],['autoBuy','Compra munição'],['rockets','Disparar mísseis']].map(([k,l])=>`<label><input type="checkbox" data-ap-check="${k}" ${config[k]?'checked':''}/> ${l}</label>`).join('')}</div>
  <div class="ap-grid"><label>Venda ao atingir (%)<input data-ap-field="cargoThreshold" type="number" min="50" max="100" value="${config.cargoThreshold}"/></label>
  <label>Recuar HP (%)<input data-ap-field="hpRetreat" type="number" min="10" max="80" value="${config.hpRetreat}"/></label>
  <label>Duração (min • 0 = sem limite no astral)<input data-ap-field="minutes" type="number" min="0" max="360" value="${config.minutes}"/></label>
  <label>Limite compras CR<input data-ap-field="budget" type="number" min="0" value="${config.budget}"/></label>
  <label>Compra quando laser abaixo de<input data-ap-field="ammoMin" type="number" min="0" value="${config.ammoMin}"/></label>
  <label>Compra quando míssil abaixo de<input data-ap-field="rocketMin" type="number" min="0" value="${config.rocketMin}"/></label></div>
  <details><summary>✦ PORTAIS ASTRAIS • assistência opcional</summary>
    <small>Montagem usa os giros oficiais do servidor. O ciclo V83 só é iniciado com confirmação explícita do piloto, e nunca continua com a aba oculta. Nenhuma recompensa é concedida por este painel.</small>
    <div class="ap-grid"><label>Portal<select data-ap-field="astralGate"><option value="alpha">AURORA</option><option value="beta">NEXUS</option><option value="gamma">ECLIPSE</option></select></label><label>Orçamento por montagem (STL)<input data-ap-field="astralBudget" type="number" min="0" max="1000000" value="${config.astralBudget}"/></label></div>
    <div class="ap-grid"><label>Materializador<select data-ap-field="astralBatch"><option value="10">10× giros</option><option value="50">50× giros</option></select></label>
    <label>Limite total STL no ciclo (0 = até acabar saldo)<input data-ap-field="astralTotalBudget" type="number" min="0" max="1000000000" value="${config.astralTotalBudget}"/></label>
    <label>Quantidade de portais (0 = contínuo)<input data-ap-field="astralMaxCycles" type="number" min="0" max="100000" value="${config.astralMaxCycles}"/></label></div>
    <label><input type="checkbox" data-ap-check="astralAssist"/> Ativar combate assistido após entrada no portal</label>
    <label><input type="checkbox" data-ap-check="astralLoop"/> ♻ Farm astral contínuo (montar → saltar → combater → repetir)</label>
    <small>Para rodar até acabar STL, escolha limite total 0 e quantidade 0. Para não ter limite de tempo, use Duração 0 apenas neste modo. Operações já confirmadas pelo servidor não são desfeitas ao parar.</small>
    <div class="ap-actions"><button type="button" data-ap-astral-build>✦ MONTAR COM ORÇAMENTO</button><button type="button" data-ap-astral-enter>↗ ENTRAR NO PORTAL</button><button type="button" data-ap-astral-cancel>PARAR MONTAGEM</button>
    <button type="button" data-ap-astral-loop-start>♻ INICIAR FARM DO PORTAL</button><button type="button" data-ap-astral-loop-stop>■ PARAR CICLO</button></div>
    <div class="ap-status" data-ap-astral-loop-status>♻ Ciclo parado</div>
    </details>
  <div class="ap-actions"><button type="button" data-ap-start>▶ INICIAR BOT</button><button type="button" data-ap-stop>■ PARAR</button><button type="button" data-ap-copy>📋 RELATÓRIO</button></div>
  <div class="ap-status"><span data-ap-access-v82>Verificando autorização...</span> <button type="button" data-ap-check-access-v82>VERIFICAR ACESSO</button><small>Se negado, peça ao ADM habilitar sua conta em JOGADORES → AUTOPILOT. A autorização é individual.</small></div>
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
    .ap-grant-row-v48{display:flex!important;flex-direction:column;align-items:flex-start;gap:5px;margin:12px 0 0;padding:11px;border:1px solid #24627a;border-radius:11px;background:rgba(5,35,54,.8);color:#b6eafc;box-sizing:border-box;width:100%;font-size:12px}
    .ap-grant-control-v48{display:flex!important;align-items:center;gap:9px;cursor:pointer;font-weight:800;color:#c2f5ff}
    .ap-grant-row-v48 input{appearance:auto!important;accent-color:#24c9ee;width:19px!important;height:19px!important;flex-shrink:0}
    .ap-grant-row-v48 small{display:block;font-size:11px;color:#9ec5d4;overflow-wrap:anywhere}
    .ap-grant-row-v48 .ap-grant-retry-v48{border:1px solid #317d9a;color:#c9eefe;background:#103049;border-radius:9px;font-weight:800;padding:7px 10px;cursor:pointer}
    .ap-grant-retry-v48[hidden]{display:none!important}
    `;document.head.appendChild(style);
    fab=document.createElement('button');fab.type='button';fab.id='autopilotFabV48';fab.textContent='🤖 AUTOPILOT';fab.hidden=true;fab.onclick=()=>open();document.body.appendChild(fab);
    panel=document.createElement('div');panel.id='autopilotPanelV48';panel.hidden=true;panel.innerHTML=controls();document.body.appendChild(panel);
    panel.querySelector('[data-ap-close]').onclick=()=>{panel.hidden=true;panelOpen=false;};
    panel.addEventListener('click',e=>{if(e.target===panel){panel.hidden=true;panelOpen=false;}});
    panel.querySelector('[data-ap-field="astralBatch"]').value=String(config.astralBatch);
    // Nunca executar um ciclo econômico com a guia fechada/oculta.
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&running&&config.astralLoop)stop('Aba oculta • ciclo astral interrompido');});
    window.addEventListener('pagehide',()=>{if(running&&config.astralLoop)stop('Página fechada • ciclo astral interrompido');});
    panel.querySelector('[data-ap-check-access-v82]').onclick=async()=>{await refreshAccess();renderStatus();};
    panel.querySelector('[data-ap-start]').onclick=async()=>{if(!await ensureAuthorizedV82())return;config=readConfig();if(config.astralLoop)return notify('Use ♻ INICIAR FARM DO PORTAL para confirmar o gasto automático');start();};
    panel.querySelector('[data-ap-stop]').onclick=()=>stop('Parado pelo piloto');
    panel.querySelector('[data-ap-astral-cancel]').onclick=()=>{astralBuildCancel=true;if(running&&config.astralLoop)stop('Montagem do ciclo interrompida pelo piloto');else notify('Montagem interrompida após a operação em andamento');};
    panel.querySelector('[data-ap-astral-loop-stop]').onclick=()=>stop('Farm astral parado pelo piloto');
    panel.querySelector('[data-ap-astral-loop-start]').onclick=async()=>{
      if(running||astralBuildBusy||astralLoopBusy)return notify('Pare a sessão atual antes de iniciar outro ciclo');
      if(!await ensureAuthorizedV82())return;
      config=readConfig();if(!config.astralAssist||!config.astralLoop)return notify('Marque COMBATE ASSISTIDO e FARM ASTRAL CONTÍNUO');
      const s=getSnapshot(),astral=getAstralState(config.astralGate);
      if(!s?.online||!s?.ready||!astral||s.repairRequired||s.player?.hp<=0)return notify('Entre no jogo com nave íntegra e sessão ativa');
      const limit=config.astralTotalBudget>0?`${fmt(config.astralTotalBudget)} STL no total`:'SEM TETO DEFINIDO (até acabar o STL da conta)';
      const cycles=config.astralMaxCycles>0?`${fmt(config.astralMaxCycles)} conclusões`:'conclusões ilimitadas';
      if(!await confirmAstralLoop(`ATIVAR FARM AUTOMÁTICO ${config.astralGate.toUpperCase()}?\n\nMontagem repetida via servidor, lote ${config.astralBatch}×, ${limit}, orçamento por montagem ${fmt(config.astralBudget)} STL, ${cycles}.\n\nEle poderá gastar STL automaticamente a cada novo portal enquanto você mantiver a aba aberta. Parará com falha, morte, revogação, falta de saldo ou ao tocar PARAR. Confirmar?`))return;
      // Revalidar a sessão depois do modal, pois o jogador pode trocar de conta enquanto decide.
      if(!await ensureAuthorizedV82())return;
      start(true);
      if(running){panel.hidden=true;panelOpen=false;} // Mostrar o mapa e o botão flutuante de controle.
    };
    panel.querySelector('[data-ap-astral-build]').onclick=async()=>{
      if(astralBuildBusy||!await ensureAuthorizedV82())return;
      config=readConfig();if(!(config.astralBudget>0))return notify('Defina um orçamento maior que zero');
      astralBuildBusy=true;astralBuildCancel=false;
      try{await assembleAstral(config.astralGate,config.astralBudget,()=>astralBuildCancel,msg=>notify(msg),{batch:config.astralBatch});}
      catch(e){notify('Montagem: '+String(e?.message||e).slice(0,110));}
      finally{astralBuildBusy=false;renderStatus();}
    };
    panel.querySelector('[data-ap-astral-enter]').onclick=async()=>{
      if(!await ensureAuthorizedV82())return;
      config=readConfig();if(!config.astralAssist)return notify('Marque a assistência astral antes de entrar');
      try{const ok=await enterAstral(config.astralGate);if(ok!==false){notify('Portal iniciado • aguardando transição antes de iniciar a assistência');if(config.astralAssist){const transition=Number(ok?.transitionMs)||1200;setTimeout(()=>{if(accessReady()&&!running&&getSnapshot()?.astralActive)start();else if(!running)notify('Entrada concluída • toque INICIAR BOT para ativar a assistência');},Math.min(5000,Math.max(900,transition)));}}}
      catch(e){notify('Entrada: '+String(e?.message||e).slice(0,110));}
    };
    panel.querySelector('[data-ap-copy]').onclick=()=>{const text=exportReport();navigator.clipboard?.writeText(text).then(()=>notify('Relatório copiado')).catch(()=>notify(text));};
    renderStatus();
  }
  async function open(){
    renderUI();if(!panel)return;
    // Após uma pausa longa, a autorização de 75s expira. Revalida e reabre.
    // Ao falhar por rede ou revogação, não exibe configuração nem inicia o bot.
    if(!accessReady()){
      loading=true;renderStatus();
      const accepted=await refreshAccess();
      loading=false;renderStatus();
      if(!accepted||!accessReady()){panel.hidden=false;panelOpen=true;renderStatus();return;}
    }
    if(!panel.dataset.phase3MapInitialized&&!running){
      const m=getSnapshot()?.map, select=panel.querySelector('[data-ap-field="map"]');
      if(select&&AUTOPILOT_ALLOWED_MAPS.includes(m)){select.value=m;config.map=m;}
      panel.dataset.phase3MapInitialized='1';
    }
    panel.hidden=false;panelOpen=true;renderStatus();
  }
  function start(continuousConfirmed=false){if(!accessReady())return notify('Permissão não confirmada');if(running)return;const s=getSnapshot();if(!s?.online||!s.ready)return notify('Entre no jogo conectado para ativar');
    config=readConfig();
    if(config.astralLoop&&!continuousConfirmed)return notify('Ciclo astral exige confirmação no botão INICIAR FARM DO PORTAL');
    if(s.astralActive&&!config.astralAssist)return notify('Marque a assistência astral para combater dentro do portal');started=now();ended=0;spent=0;attempts=0;failures=0;boxes=0;drops=0;ores=0;startStats=stats(s);lastProgress=startStats;lastTickAt=0;
    lastHealthyAt=now();lastMapId=s.map;preferredTargetId=null;preferredTargetAt=0;lastRocketAt=0;pendingJump=null;lastPortalAttempt=0;nextRouteSearch=0;routeMisses=0;nextSaleAttempt=0;buyFailuresInRow=0;running=true;astralRunSeen=!!s.astralActive;
    astralLoopSpent=0;astralCycles=0;astralLoopBusy=false;astralLoopEpoch++;astralLoopPhase=config.astralLoop?'aguardando':'parado';astralLoopNextAt=0;astralLoopEnteredAt=0;astralLoopMapWaitSince=0;astralLoopHealSince=0;astralLoopAmmoWaitSince=0;
    const gate=getAstralState(config.astralGate);astralLoopLastCompleted=Number(gate?.completed)||0;astralLoopLastFailed=Number(gate?.failed)||0;
    if(config.astralLoop)clearResume();else checkpoint(true);
    notify(config.astralLoop?'♻ Farm astral autorizado • iniciando sequência':astralRunSeen?'Portal Astral • combate assistido iniciado':'Rota '+config.map.toUpperCase()+' iniciada');}
  async function safeBuy(s){if(busy||!config.autoBuy||!s.buyPermitted||s.jumping||!s.ready)return;const opts=[{kind:'ammo',stock:s.ammoStock,min:config.ammoMin,quote:s.ammoQuote},{kind:'rocket',stock:s.rocketStock,min:config.rocketMin,quote:s.rocketQuote}];
    for(const opt of opts){const q=opt.quote;if(!q||!q.catalog_key||q.shop_visible===false||Number(opt.stock)>=opt.min||q.currency!=='credits'||(opt.kind==='rocket'&&!config.rockets))continue;
      const cost=Number(q.price)||0;if(cost<=0||cost>config.budget-spent||cost>Number(s.credits)||!Number.isFinite(cost))continue;
      attempts++;busy=true;try{const ok=await buyPackage(q.catalog_key,opt.kind,{atBase:!!s.atBase,credits:s.credits,budgetRemaining:config.budget-spent});if(ok){spent+=cost;buyFailuresInRow=0;notify('Reabastecimento validado pelo servidor');}
        else{failures++;buyFailuresInRow++;stop('Compra sem confirmação • confira estoque e saldo antes de reiniciar');}}
      catch(e){failures++;buyFailuresInRow++;stop('Compra com resposta perdida • confira estoque e saldo antes de reiniciar');}
      finally{busy=false;}
      if(buyFailuresInRow>=3)stop('Compra não autorizada após 3 tentativas; verifique loja, saldo e CPU');
      break;
    }
  }
  async function routeTo(s,map){
    const ts=now();
    if(ts<nextRouteSearch)return;
    const from=getGraphLabel(),want=getGoalLabel(map);
    if(!from||!want){nextRouteSearch=ts+1800;notify('Aguardando grafo de portais');return;}
    const path=findAutopilotPortalPath(from,want,getPortals,mayTravel);
    if(!path){
      nextRouteSearch=ts+2400;routeMisses++;
      if(routeMisses>=8){stop('Sem rota liberada para '+want+' (8 verificações)');return;}
      notify('Recalculando rota para '+want);return;
    }
    routeMisses=0;
    if(!path.length){pendingJump=null;return;}
    const p=path[0];
    if(pendingJump&&pendingJump.from===from&&pendingJump.to===p.targetLabel){
      if(ts-pendingJump.at<18000){notify('Aguardando confirmação de portal → '+p.targetLabel);return;}
      pendingJump=null;failures++;notify('Portal sem confirmação: recalculando');
    }
    const distance=dist(s.player,p);
    if(distance>43){navigate(p.x,p.y);notify('Portal → '+p.targetLabel);return;}
    if(busy||ts-lastPortalAttempt<4500)return;
    lastPortalAttempt=ts;busy=true;checkpoint(true);
    try{
      const accepted=await jumpPortal(p);
      if(accepted===false)throw Error('Viagem recusada pelo jogo');
      if(!running)return;
      pendingJump={from,to:p.targetLabel,at:now()};
      notify('Transição de mapa → '+p.targetLabel);
    }catch(e){failures++;nextRouteSearch=now()+3500;notify('Portal: '+String(e?.message||e).slice(0,90));}
    finally{busy=false;}
  }
  // V83 • state machine baseada no estado REAL do portal. Não gera recompensas, não simula kills.
  // A montagem é uma chamada assíncrona única por ciclo e só usa giros aceitos pelo servidor.
  function tickAstralLoopOutside(s,ts){
    const a=getAstralState(config.astralGate);
    if(!a){stop('Estado do Portal Astral indisponível');return false;}
    const failed=Number(a.failed)||0,completed=Number(a.completed)||0;
    if(failed>astralLoopLastFailed){stop('Portal perdido • farm interrompido para proteger vidas e recursos');return false;}
    if(completed>astralLoopLastCompleted){
      astralCycles+=completed-astralLoopLastCompleted;astralLoopLastCompleted=completed;
      astralLoopPhase='concluído';astralLoopNextAt=ts+2400;
      notify(`✦ ${fmt(astralCycles)} portal(is) concluído(s) • preparando nova montagem`);
    }
    if(config.astralMaxCycles>0&&astralCycles>=config.astralMaxCycles){stop('Limite de portais concluído');return false;}
    if(astralLoopBusy)return false;
    if(astralLoopPhase==='entrando'){
      if(ts-astralLoopEnteredAt>22000)stop('Entrada sem confirmação • conferir estado antes de tentar novamente');
      else notify('Aguardando carregamento do Portal Astral');
      return false;
    }
    if(ts<astralLoopNextAt)return false;
    if(s.repairRequired||s.player?.hp<=0){stop('Nave destruída/reparo necessário • ciclo interrompido');return false;}
    if(['ggAlpha','ggBeta','ggGamma'].includes(s.map)){
      if(!astralLoopMapWaitSince)astralLoopMapWaitSince=ts;
      if(ts-astralLoopMapWaitSince>22000)stop('Portal terminou, mas retorno ao X-1 não foi confirmado');
      else {astralLoopPhase='aguardando transição de retorno';notify('Aguardando retorno oficial à base X-1');}
      return false;
    }
    astralLoopMapWaitSince=0;
    if(s.map!=='x1'){
      if(!busy)void routeTo(s,'x1');
      astralLoopPhase='retornando à base X-1';return false;
    }
    if(!a.atBase){
      navigate(s.base.x,s.base.y);astralLoopPhase='aproximando da base X-1';
      notify('Retornando à base X-1 para montagem');return false;
    }
    if(s.player?.hp/Math.max(1,s.player?.maxHp)<=config.hpRetreat/100){
      if(!astralLoopHealSince)astralLoopHealSince=ts;
      if(ts-astralLoopHealSince>180000)stop('HP baixo por 3 minutos • requer revisão manual');
      else {astralLoopPhase='aguardando cura na base';notify('HP baixo • aguardando recuperação na base');}
      return false;
    }
    astralLoopHealSince=0;
    const epoch=astralLoopEpoch;
    astralLoopBusy=true;
    const buildAndEnter=async()=>{
      // Se já montado ou com rodada em andamento, saltar sem gastar outra peça.
      if(!a.built&&!a.runActive){
        if(config.astralBudget<=0)throw Error('Orçamento por montagem deve ser maior que zero');
        const remain=config.astralTotalBudget>0?config.astralTotalBudget-astralLoopSpent:Infinity;
        const money=Number(s.stl)||0,unit=Number(a.unitCost)||0;
        if(unit<=0)throw Error('Preço atual do materializador indisponível');
        if(remain<unit)throw Error('Limite total de STL atingido');
        if(money<unit)throw Error('STL insuficiente para outro giro');
        const cap=Math.floor(Math.min(config.astralBudget,remain,money));
        if(cap<unit)throw Error('Orçamento insuficiente para continuar montagem');
        astralLoopPhase='montando';
        const result=await assembleAstral(config.astralGate,cap,()=>!running||epoch!==astralLoopEpoch||!accessReady(),
          msg=>{if(running&&epoch===astralLoopEpoch)notify(msg);}, {batch:config.astralBatch,confirmedByPilot:true});
        astralLoopSpent+=Math.max(0,Number(result?.spent)||0);
        if(!running||epoch!==astralLoopEpoch)return;
        if(!result?.built){
          const newState=getAstralState(config.astralGate);const rem=config.astralTotalBudget>0?config.astralTotalBudget-astralLoopSpent:Infinity;
          if(rem<Number(newState?.unitCost)||Number(getSnapshot()?.stl)<Number(newState?.unitCost))throw Error('Sem STL/orçamento para concluir o próximo portal');
          // Seguir montando em outro lote controlado, sem reenviar uma transação incerta.
          astralLoopPhase='aguardando nova montagem';astralLoopNextAt=Date.now()+1500;return;
        }
      }
      if(!running||epoch!==astralLoopEpoch)return;
      if(!(await ensureAuthorizedV82()))throw Error('Acesso ao Autopilot não confirmado');
      astralLoopPhase='entrando';astralLoopEnteredAt=Date.now();
      const result=await enterAstral(config.astralGate);
      if(result===false)throw Error('Entrada recusada pelo portal');
      astralRunSeen=true;notify('Portal aberto • aguardando arena para combater');
    };
    void buildAndEnter().catch(e=>{if(running&&epoch===astralLoopEpoch){
      astralLoopSpent+=Math.max(0,Number(e?.spent)||0); // Gastos já confirmados antes de erro posterior.
      failures++;stop('Farm astral: '+String(e?.message||e).slice(0,115));}})
      .finally(()=>{if(epoch===astralLoopEpoch)astralLoopBusy=false;});
    return false;
  }
  function tick(){if(!running){if(allowed&&accessReady())restoreCheckpoint();return;}const ts=now();if(ts-lastTickAt<380)return;lastTickAt=ts;
    if(ts>=nextAccessAt&&!refreshingAccess)void refreshAccess();
    if(!accessReady()){
      // Sem permissão atual válida, NENHUMA ação; tenta reconectar sem zerar a sessão.
      if(authorizedId&&authorizedId===String(getIdentity()||'')){
        if(!refreshingAccess&&ts>=nextAccessAt)void refreshAccess();
        notify('Reconectando com segurança • sem ações de economia');return;
      }
      stop('Acesso precisa ser validado');return;
    }
    if((config.minutes>0||!config.astralLoop)&&ts-started>config.minutes*60000){stop('Tempo de farm concluído');return;}
    const s=getSnapshot();
    if(config.astralLoop&&typeof document!=='undefined'&&document.visibilityState==='hidden'){stop('Aba em segundo plano • farm astral interrompido');return;}
    if(s?.jumping){notify('Aguardando transição de setor');return;}
    if(!s||!s.online||!s.ready){
      // Troca entre setores derruba transitoriamente a conexão WS.
      // Nunca trata 1-20s de reconexão como desistência do usuário.
      // No network = no combat and no sales. Resume only with a fresh online snapshot.
      if(String(getIdentity()||'')===authorizedId){notify('Sem sincronização do setor • aguardando servidor');return;}
      stop('Sessão de jogo encerrada');return;
    }
    if(astralRunSeen&&!s.astralActive&&!config.astralLoop){stop('Portal encerrado • assistência finalizada');return;}
    if(s.astralActive&&!config.astralAssist){stop('Portal Astral exige opção explícita');return;}
    if(s.astralActive)astralRunSeen=true;
    lastHealthyAt=ts;checkpoint();
    if(config.astralLoop){
      if(!s.astralActive){
        stopFire();
        // Só continuar depois de confirmar o contador de conclusão real do jogo.
        if(!tickAstralLoopOutside(s,ts))return;
      }else{astralLoopPhase='combatendo';}
    }
    if(lastMapId!==s.map){
      lastMapId=s.map;preferredTargetId=null;preferredTargetAt=0;pendingJump=null;routeMisses=0;nextRouteSearch=0;
      notify('Setor '+String(s.map||'').toUpperCase()+' conectado • retomando rota');
    }
    if(pendingJump){
      if(getGraphLabel()!==pendingJump.from){pendingJump=null;routeMisses=0;}
      else if(ts-pendingJump.at<18000){notify('Confirmando chegada ao próximo mapa');return;}
      else {pendingJump=null;failures++;notify('Portal demorou: nova tentativa controlada');}
    }
    if(ts<nextSaleAttempt&&s.remoteTraderEquipped===true&&config.autoSell&&Number(s.cargoUsed)/Math.max(1,Number(s.cargoCapacity))>=config.cargoThreshold/100){
      notify('Aguardando confirmação da venda no servidor');return;
    }
    s.purchaseBudgetRemaining=Math.max(0,config.budget-spent);
    lastProgress=stats(s);
    if(busy)return;
    if(!s.astralActive&&config.autoBuy&&ts-lastPurchaseAttempt>7000){lastPurchaseAttempt=ts;void safeBuy(s);}
    // A compra oficial pode começar neste mesmo tick; não iniciar salto antes de confirmar.
    if(busy)return;
    const action=chooseAutopilotAction(s,{...config,preferredTargetId:ts-preferredTargetAt<=14000?preferredTargetId:null});
    if(action.type==='pause'){stop(action.reason);return;}
    const collectingWhileFiring=action.type==='move'&&!!action.combatTargetId;
    if(action.type!=='hunt'&&!collectingWhileFiring)stopFire();
    if(action.type==='route'){void routeTo(s,action.map);return;}
    if(action.type==='sell'){
      if(ts<nextSaleAttempt)return;
      nextSaleAttempt=ts+6500;busy=true;
      Promise.resolve().then(()=>sellCargo()).then(ok=>{
        if(ok===false){failures++;stop('Venda sem confirmação • confira o porão antes de reiniciar');}
        else notify('Venda enviada • aguardando sincronização');
      }).catch(e=>{failures++;stop('Venda com resposta perdida • confira o porão antes de reiniciar');})
        .finally(()=>{busy=false;});
      return;
    }
    if((action.type==='hunt'||collectingWhileFiring)&&!ensureCombatAmmo()){
      stopFire();if(config.astralLoop){if(!astralLoopAmmoWaitSince)astralLoopAmmoWaitSince=ts;
        if(ts-astralLoopAmmoWaitSince>30000){stop('Sem munição por 30 s dentro do portal');return;}}
      notify('Sem munição utilizável • aguardando reposição');return;
    }
    astralLoopAmmoWaitSince=0;
    if(action.type==='move'){
      if(collectingWhileFiring){
        const enemy=(s.enemies||[]).find(e=>e?.id===action.combatTargetId&&e.hp>0);
        if(enemy&&dist(s.player,enemy)<=Number(s.laserRange)){
          selectNpc(enemy,true);
          if(config.rockets&&dist(s.player,enemy)<=Number(s.rocketRange)&&s.rocketReady)fireRocketRateLimitedV87(ts);
        }else stopFire();
      }
      navigate(action.x,action.y);notify(action.reason);return;
    }
    if(action.type==='hunt'){
      const enemy=(s.enemies||[]).find(e=>e?.id===action.targetId&&e.hp>0);if(!enemy)return;
      if(preferredTargetId!==String(enemy.id)){preferredTargetId=String(enemy.id);preferredTargetAt=ts;}
      const range=Math.max(180,(Number(s.laserRange)||800)*config.combatRange);const d=dist(s.player,enemy);
      selectNpc(enemy,d<=Number(s.laserRange));
      if(d>range){const ratio=(d-range+35)/Math.max(1,d);navigate(s.player.x+(enemy.x-s.player.x)*ratio,s.player.y+(enemy.y-s.player.y)*ratio);}
      else if(config.rockets&&d<=Number(s.rocketRange)&&s.rocketReady)fireRocketRateLimitedV87(ts);
      notify(action.reason);
    }else notify(action.reason);
  }
  // Chamado EXCLUSIVAMENTE após getAdminStatus confirmar o acesso ao painel ADM.
  // Não depende da requisição /access iniciada em paralelo no login: a V48
  // escondia todos os checks quando refreshAccess ainda estava em andamento.
  // A API continua a exigir permissão ADM para CONSULTAR e SALVAR.
  async function decorateAdminUsers(root,users){
    if(!root||!Array.isArray(users))return;
    const known=new Map(users.map(u=>[String(u.user_id||''),u]));
    const cards=[...root.querySelectorAll('[data-admin-user]')];
    const controls=[];
    for(const card of cards){
      const id=String(card.dataset.adminUser||''),user=known.get(id);
      if(!id||!user||user.is_admin)continue;
      let row=card.querySelector('[data-ap-grant-row]');
      if(!row){
        row=document.createElement('div');row.className='ap-grant-row-v48';row.dataset.apGrantRow=id;
        const label=document.createElement('label');label.className='ap-grant-control-v48';
        const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.apGrant=id;checkbox.disabled=true;
        const name=document.createElement('span');name.textContent='🤖 Liberar AUTOPILOT';
        label.append(checkbox,name);row.appendChild(label);
        const status=document.createElement('small');status.dataset.apGrantStatus=id;status.textContent='Consultando permissão...';row.appendChild(status);
        const retry=document.createElement('button');retry.type='button';retry.className='ap-grant-retry-v48';retry.textContent='TENTAR NOVAMENTE';retry.hidden=true;row.appendChild(retry);
        retry.onclick=()=>{void decorateAdminUsers(root,users);};
        checkbox.onchange=async()=>{
          const desired=checkbox.checked,previous=!desired;
          checkbox.disabled=true;status.textContent='Salvando permissão...';
          try{
            const saved=await request('/api/admin/autopilot/v48/grants/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({enabled:desired})});
            if(saved?.ok!==true||typeof saved?.grant?.enabled!=='boolean')throw Error('Servidor não confirmou a alteração');
            checkbox.checked=saved.grant.enabled===true;
            grantCache.set(id,checkbox.checked);
            status.textContent=checkbox.checked?'LIBERADO • confirmado pelo servidor':'BLOQUEADO • confirmado pelo servidor';
            retry.hidden=true;
          }catch(error){
            checkbox.checked=grantCache.has(id)?grantCache.get(id):previous;
            status.textContent='Falha ao salvar: '+String(error?.message||error).slice(0,120);
            retry.hidden=false;
          }finally{checkbox.disabled=false;}
        };
        card.appendChild(row);
      }
      const checkbox=row.querySelector('[data-ap-grant]');
      const status=row.querySelector('[data-ap-grant-status]');
      const retry=row.querySelector('button');
      if(!checkbox||!status)continue;
      checkbox.disabled=true;status.textContent='Consultando permissão...';
      if(retry)retry.hidden=true;
      controls.push({id,checkbox,status,retry});
    }
    if(!controls.length)return;
    try{
      const result=await request('/api/admin/autopilot/v48/grants');
      if(!Array.isArray(result?.grants))throw Error('Resposta de permissões inválida');
      grantCache=new Map(result.grants.map(entry=>[String(entry.user_id),entry.enabled===true]));
      for(const {id,checkbox,status,retry} of controls){
        // Se o painel foi recarregado, não alterar um controle antigo.
        if(!checkbox.isConnected)continue;
        checkbox.checked=grantCache.get(id)===true;
        checkbox.disabled=false;
        status.textContent=checkbox.checked?'LIBERADO • confirmado pelo servidor':'BLOQUEADO • confirmado pelo servidor';
        if(retry)retry.hidden=true;
      }
    }catch(error){
      const message='Falha ao consultar permissões: '+String(error?.message||error).slice(0,120);
      for(const {checkbox,status,retry} of controls){
        if(!checkbox.isConnected)continue;
        checkbox.disabled=true;status.textContent=message;
        if(retry)retry.hidden=false;
      }
    }
  }
  function recordCollect(kind){if(!running)return;if(kind==='box')boxes++;else if(kind==='drop')drops++;else if(kind==='ore')ores++;}
  renderUI();
  return {open,tick,stop,start,recordCollect,refreshAccess,decorateAdminUsers,get active(){return running;},get allowed(){return allowed;},get isAdmin(){return isAdmin;},get config(){return {...config}}};
}
