import {mountFarmV49} from './stellar-offline-v49-ui.js';
import {LASER_AMMO} from '../data.js';
/* STELLAR_OFFLINE_FARM_V485 • HUD & admin editor. Projeções são APENAS estimativas. */
export function createOfflineFarmV484({credentials,saveBeforeStart,onPauseWorld,onFinish}={}){
 const css=`
 #v484-panel{position:fixed;inset:0;z-index:99996;background:#020c14dc;display:grid;place-items:center;padding:12px}
 #v484-panel[hidden]{display:none!important}
 #v484-panel section{box-sizing:border-box;background:#102337;border:1px solid #39788c;box-shadow:0 10px 50px #000c;border-radius:16px;color:#d8f2fc;width:min(95vw,490px);max-height:86vh;overflow:auto;padding:17px;font:14px system-ui}
 #v484-panel h3{margin:0 0 6px;font-size:19px}#v484-panel p{line-height:1.45}
 #v484-panel button,#v484-panel select,#v484-panel input[type=number],#v485-adm-farm input{padding:9px 10px;margin:4px;background:#20485c;color:white;border:1px solid #377d95;border-radius:9px;max-width:100%;box-sizing:border-box}
 #v484-panel button:disabled{opacity:.5}#v484-panel label{display:block;margin:9px 0}#v484-panel pre{white-space:pre-wrap;line-height:1.55;font:12px system-ui;background:#091522;border-radius:8px;padding:10px}
 #v484-panel select{max-width:100%;min-width:0;width:min(100%,350px)}
 #v484-panel label{overflow-wrap:anywhere}
 #v484-panel section{overscroll-behavior:contain}
 #v484-panel .v484-actions{display:flex;flex-wrap:wrap;gap:4px}#v484-panel .v484-error{color:#ffc4bc}#v484-panel .v485-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:9px 0}
 #v484-panel .v485-kpis div{background:#09192b;border:1px solid #234967;border-radius:10px;padding:10px}#v484-panel .v485-kpis b{display:block;font-size:19px;margin-top:3px;color:#a9f0ff}#v484-panel .v485-kpis small{color:#9db7c8}
 #v484-panel .v485-progress{height:7px;overflow:hidden;border-radius:8px;background:#244258;margin:9px 0}#v484-panel .v485-progress span{display:block;height:100%;width:0;background:#49d8bc;transition:width .5s}
 /* V85: the world shield is INSIDE #app (isolation:isolate), behind #topbar.
    The older full-screen BODY overlay intercepted clicks on Android even though
    the topbar had an enormous z-index. No full-screen pointer interceptor now. */
 #v485-world-lock{display:none;position:absolute;inset:0;z-index:2;pointer-events:none;
  background:radial-gradient(ellipse at 45% 55%,#103047 0%,#07182a 52%,#020815 100%)}
 .stellar-offline-active-v485 #v485-world-lock{display:block}
 .stellar-offline-active-v485 canvas#game{visibility:hidden!important;pointer-events:none!important}
 /* Hide gameplay HUD and location while keeping the top menu and HTML panels. */
 .stellar-offline-active-v485 :is(#topHudDock,#rightHudStack,#weaponBar,#minimapPanel,#minimap,
   #targetLockHud,#combatStateHud,#combatFlash,#gateHud,#bossPhaseHud,#portalPrompt,
   #hudEditorBar,#hudIntelligenceQuick,#hint,#mobileCombatModeBtn){display:none!important}
 .stellar-offline-active-v485 :is(#mapLabel,#sectorName,#minimapMapLabelV4771){visibility:hidden!important}
 .stellar-offline-active-v485 #mapModal{display:none!important}
 .stellar-offline-active-v485 #topbar{pointer-events:auto!important;z-index:10050!important;overflow:visible!important}
 .stellar-offline-active-v485 #topbar :is(.top-actions,.menu-group,.menu-dropdown){pointer-events:auto!important}
 .stellar-offline-active-v485 .modal:not(.hidden){pointer-events:auto!important;z-index:10060!important}
 .stellar-offline-active-v485 #topbarDockToggle{pointer-events:auto!important;z-index:10051!important}
 /* Only the small restore badge accepts a click; background never steals menu events. */
 #v485-world-indicator{position:absolute;top:clamp(145px,26vh,280px);left:50%;
  transform:translateX(-50%);width:min(90vw,365px);padding:15px 18px;
  pointer-events:auto;cursor:pointer;touch-action:manipulation;text-align:center;
  background:#082032f5;border:1px solid #318d9b;border-radius:14px;color:#d9faff;
  box-shadow:0 8px 36px #000a}
 #v485-world-indicator strong{font-size:16px;display:block}
 #v485-world-indicator small{color:#9dc7d8;display:block;margin-top:8px}
 #v485-adm-farm{border:1px solid #357a90;background:#0d1e2d;padding:13px;border-radius:12px;margin:12px 0;color:#e0f5ff;font:13px system-ui}
 #v485-adm-farm summary{cursor:pointer;font-weight:800}#v485-adm-farm label{display:inline-flex;flex-direction:column;gap:4px;margin:7px 12px 7px 0}
 #v485-adm-farm input{width:130px}#v485-adm-farm button{border-radius:8px;background:#22546b;color:#f0ffff;padding:9px;border:1px solid #45889d}
 #v485-adm-farm .v485-adm-session{border-bottom:1px solid #2b5067;padding:6px 0}
 `;
 const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const fmt=n=>Math.round(Number(n)||0).toLocaleString('pt-BR');
 const ammoName=id=>LASER_AMMO[String(id||'')]?.name||String(id||'');
 const shell=document.createElement('div');shell.id='v484-panel';shell.hidden=true;
 shell.innerHTML=`<section role="dialog" aria-label="Farm Offline">
 <h3>🌙 FARM OFFLINE <small>V49.5</small></h3>
 <p style="color:#afcbd7;font-size:12px">Farm econômico com acerto no retorno. Os ganhos durante a sessão são <b>estimativas</b>, não saldo já creditado.</p>
 <div id="v484-status" role="status">Consultando...</div><div class="v485-progress"><span id="v485-progress-bar"></span></div><div id="v485-countdown" style="font-size:12px;color:#a9d0df"></div>
 <div id="v484-settings">
  <label>🎯 NPC comum <select id="v484-npc"><option value="">Automático (mais fraco)</option></select></label>
  <label>🔫 Munição <select id="v485-ammo"><option value="">Munição equipada</option></select></label>
  <label>⏱ Duração <select id="v484-minutes"><option value="60">1 hora</option><option value="120">2 horas</option><option value="240">4 horas</option></select></label>
  <label><input id="v484-sell" type="checkbox" checked> Vender recursos quando encher o porão</label>
  <label><input id="v484-buy" type="checkbox" checked> Comprar munição automaticamente (somente créditos)</label>
  <label><input id="v484-mine" type="checkbox" checked> Minerar durante o farm</label>
  <small style="color:#a9cadb">Dano calculado a partir dos lasers equipados, munição e habilidades persistidas. Simulação de tempo e acerto; sem bônus temporários. Bosses e especiais excluídos.</small>
 </div>
 <div id="v485-live" hidden><p style="font-weight:700">📊 PROJEÇÃO DO FARM • NÃO CREDITADA</p><div class="v485-kpis" id="v485-kpis"></div><pre id="v485-details"></pre></div>
 <div id="v86-economy-box" hidden style="background:#081a29;border:1px solid #32647a;border-radius:10px;padding:10px;margin-top:9px"><b>💰 SALDO NO SERVIDOR • SOMENTE LEITURA</b><p id="v86-economy-info" style="font-size:12px">Confira seu saldo sem encerrar o farm.</p><button type="button" id="v86-economy-refresh">CONSULTAR SALDO REAL</button><small style="display:block;color:#a1becd">Projeções do farm não estão creditadas. Lances do Leilão são registrados separadamente.</small></div>
 <pre id="v484-report" hidden></pre><p class="v484-error" id="v484-error" role="alert"></p>
 <div class="v484-actions"><button id="v484-start">INICIAR FARM</button><button id="v484-settle">RESGATAR / TERMINAR</button><button id="v484-cancel">CANCELAR SEM GANHOS</button><button id="v484-refresh">ATUALIZAR</button><button id="v485-notify">🔔 ALERTA NO CELULAR</button><button id="v484-close">FECHAR</button></div>
 </section>`;document.body.appendChild(shell);
 const $=id=>shell.querySelector('#'+id);let status='none',busy=false,authorized=false,latest=null,preview=null,hasNotified=new Set(),loop=null,menu=null,adminReady=false,v49Tools=null;
 const lock=document.createElement('div');lock.id='v485-world-lock';lock.innerHTML='<div id="v485-world-indicator"><strong>🌙 FARM OFFLINE ATIVO</strong><small>MAPA PAUSADO • MENUS LIBERADOS<br>TOQUE AQUI PARA CONSULTAR / RESGATAR</small></div>';
 const gameCanvas=document.getElementById('game');const gameApp=document.getElementById('app');
 if(gameCanvas&&gameApp)gameCanvas.after(lock);else (gameApp||document.body).appendChild(lock);
 const farmRescueIndicator=lock.querySelector('#v485-world-indicator');
 farmRescueIndicator.setAttribute('role','button');farmRescueIndicator.setAttribute('tabindex','0');
 farmRescueIndicator.setAttribute('aria-label','Abrir Farm Offline para consultar e resgatar');
 // V85: background never captures pointerdown; Canvas and map handlers guard the world.
 // The badge is the ONLY clickable point on the world shield.
 farmRescueIndicator.addEventListener('click',e=>{e.stopPropagation();open();});
 farmRescueIndicator.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
 async function request(path,body,method){const c=credentials?.()||{};if(!c.accessToken||!c.gameSessionId)throw Error('Faça login no jogo novamente.');const res=await fetch('/api/offline-farm/v484/'+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.accessToken,'X-Game-Session-Id':c.gameSessionId},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(22000)});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Erro '+res.status);return data;}
 function installMenu(){if(menu)return;const pilot=document.querySelector('[data-menu-group="pilot"] > .menu-dropdown');if(!pilot)return;menu=document.createElement('button');menu.id='v485FarmMenuEntry';menu.className='menu-item';menu.type='button';menu.textContent='🌙 FARM OFFLINE';const auto=document.getElementById('v481AutopilotEntry');if(auto)auto.after(menu);else pilot.append(menu);menu.addEventListener('click',()=>{open();document.querySelectorAll('.menu-group.open').forEach(g=>g.classList.remove('open'));});}
 function active(yes){const was=document.body.classList.contains('stellar-offline-active-v485');document.body.classList.toggle('stellar-offline-active-v485',yes);
  if(yes&&!was)void onPauseWorld?.();
  // Once settled, all world visuals and controls return automatically.
 }
 function showStats(r){const k=$('v485-kpis');k.innerHTML=[['NPCs',r.kills],['XP',r.xp],['Créditos NPC',r.npc_credits],['STL',r.stl],['BOX',r.boxes_collected],['Minérios',r.mined_units],['CR líquido',r.credits_net],['Compras munição',r.ammo_bought]].map(([label,v])=>`<div><small>${label}</small><b>${fmt(v)}</b></div>`).join('');$('v485-details').textContent=`Vendas: ${fmt(r.sales)} • Crédito de venda: ${fmt(r.sale_credits)}${Number.isFinite(Number(r.starting_cargo_sale_credits))?`\nCR de porão anterior: ${fmt(r.starting_cargo_sale_credits)} • CR gerados no farm: ${fmt(r.farm_generated_sale_credits)}`:''}\nMunição restante: ${fmt(r.ammo_remaining)} • Gasto: ${fmt(r.ammo_spent)} CR\n${preview?.damagePerSecond?`DPS efetivo estimado: ${fmt(preview.damagePerSecond)}\n`:''}${r.laser_count?`Lasers: ${fmt(r.laser_count)} • Munições por NPC: ${fmt(r.ammo_per_kill)}\nDeslocamento por NPC: ${fmt(r.travel_per_kill)}s\n`:''}Os números são recalculados quando o app está aberto.\nO saldo só muda ao resgatar.`;}
 function tick(){if(!authorized)return;const isRunning=status==='running';if(isRunning&&latest?.ends_at){const now=Date.now(),start=new Date(latest.started_at||now).getTime(),end=new Date(latest.ends_at).getTime();const left=Math.max(0,Math.ceil((end-now)/1000));const pct=Math.max(0,Math.min(100,100*(now-start)/Math.max(1,end-start)));$('v485-progress-bar').style.width=pct+'%';$('v485-countdown').textContent=left?`Tempo restante: ${Math.floor(left/3600)}h ${String(Math.floor(left%3600/60)).padStart(2,'0')}m ${String(left%60).padStart(2,'0')}s • ${pct.toFixed(1)}%`:'⏰ Tempo previsto concluído • retorne para resgatar';const title=lock.querySelector('strong');title.textContent=left?'🌙 SYSTEM OFF • FARM ATIVO':'🌙 FARM CONCLUÍDO • RESGATAR';if(left===0&&latest.id&&!hasNotified.has(latest.id)){hasNotified.add(latest.id);void alertFinished();}}
  clearTimeout(loop);loop=setTimeout(tick,1000);
 }
 async function alertFinished(){if(typeof Notification==='undefined'||Notification.permission!=='granted')return;try{const reg=await navigator.serviceWorker?.ready;if(reg?.showNotification)await reg.showNotification('Stellar Legacy • Farm concluído',{body:'O tempo terminou. Entre no jogo para verificar e resgatar seus ganhos.',tag:'stellar-farm-v485',icon:'/icons/stellar-192.png',data:{url:'/'}});else new Notification('Farm concluído',{body:'Entre no Stellar Legacy para resgatar.'});}catch{}}
 function render(x){latest=x||{status:'none'};status=latest.status||'none';const running=status==='running';active(running);$('v484-status').textContent=running?`FARM ATIVO • ${String(x.map||'').toUpperCase()} • ${x.npc_name||x.npc} • ${x.minutes} min • ${ammoName(x.ammo)}`:status==='settled'?'✅ FARM FINALIZADO':status==='conflict'?'⚠️ ATIVIDADE ONLINE DETECTADA — SEM RECOMPENSAS':status==='cancelled'?'FARM CANCELADO':'SEM SESSÃO ATIVA';$('v86-economy-box').hidden=!running;$('v484-settings').hidden=running;$('v484-start').hidden=running;$('v484-settle').hidden=!running;$('v484-cancel').hidden=!running;$('v485-live').hidden=!running;$('v484-report').hidden=!['settled','conflict'].includes(status);$('v485-progress-bar').style.width=running?'0%':'0%';$('v485-countdown').textContent='';if(status==='settled'){const r=x.report||{};$('v484-report').textContent=`RECOMPENSAS CONFIRMADAS\nNPCs ${fmt(r.kills)} • BOX ${fmt(r.boxes_collected)} • XP ${fmt(r.xp)} • STL ${fmt(r.stl)}\nCréditos NPC ${fmt(r.npc_credits)} • Venda ${fmt(r.sale_credits)}${r.starting_cargo_sale_credits!=null?`\nVendas (porão anterior): ${fmt(r.starting_cargo_sale_credits)} • recursos obtidos no farm: ${fmt(r.farm_generated_sale_credits)}`:''}\nCompras ${fmt(r.ammo_bought)} • Custo ${fmt(r.ammo_spent)} • Crédito líquido ${fmt(r.credits_net)}`;}else if(status==='conflict')$('v484-report').textContent=String(x.report?.message||'Sessão invalidada');if(!running)preview=null;tick();}
 async function refresh(){if(!authorized)return;try{const x=await request('status');render(x);$('v484-error').textContent='';if(x.status==='running'){preview=await request('preview');if(preview?.report)showStats(preview.report);return;}
 const options=await request('options');const sel=$('v484-npc'),old=sel.value;sel.innerHTML='<option value="">Automático (mais fraco)</option>'+(options.choices||[]).map(c=>`<option value="${escape(c.id)}">${escape(c.name||c.id)} • ${fmt(c.credits)} CR</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old;
 const ammo=$('v485-ammo'),oldAmmo=ammo.value;ammo.innerHTML=(options.ammunition||[]).map(a=>`<option value="${escape(a.id)}">${escape(ammoName(a.id))} • ${fmt(a.qty)} un / ${fmt(a.price)} ${escape(a.currency==='credits'?'CR':'STL')}</option>`).join('');if([...ammo.options].some(o=>o.value===oldAmmo))ammo.value=oldAmmo;else ammo.value=options.selectedAmmo||'lcb10';
 const mins=$('v484-minutes'),prior=mins.value;const allowed=[30,60,90,120,180,240,360,480,600,720].filter(n=>n<=(options.maxMinutes||240));mins.innerHTML=allowed.map(n=>`<option value="${n}">${n%60===0?n/60+' hora'+(n===60?'':'s'):n+' minutos'}</option>`).join('');if(allowed.includes(Number(prior)))mins.value=prior;
 v49Tools?.syncOptions(options);
 }catch(e){$('v484-error').textContent=e.message;}}
 async function operation(fn){if(busy)return;busy=true;for(const btn of shell.querySelectorAll('button'))btn.disabled=true;$('v484-error').textContent='';try{await fn();}catch(e){$('v484-error').textContent=e.message;}finally{busy=false;for(const btn of shell.querySelectorAll('button'))btn.disabled=(btn.id==='v484-start'&&btn.dataset.v49PermissionBlocked==='true');}}
 $('v484-start').onclick=()=>operation(async()=>{await saveBeforeStart?.();const x=await request('start',{minutes:Number($('v484-minutes').value),autoSell:$('v484-sell').checked,autoBuy:$('v484-buy').checked,mine:$('v484-mine').checked,npc:$('v484-npc').value||null,ammo:$('v485-ammo').value||null});render(x);await refresh();});
 $('v484-settle').onclick=()=>operation(async()=>{const x=await request('settle',{});render(x);if(['settled','conflict'].includes(x.status))await onFinish?.();});
 $('v484-cancel').onclick=()=>operation(async()=>{if(!confirm('Cancelar sem qualquer ganho desta sessão?'))return;const x=await request('cancel',{});render(x);await onFinish?.();});
 async function readConfirmedEconomyV86(){const out=$('v86-economy-info');out.textContent='Consultando saldo real no servidor...';
   try{const d=await request('v86/economy');const e=d.economy||{};
    out.textContent=`SALDO CONFIRMADO • ${fmt(e.credits)} CR • ${fmt(e.stl)} STL • LV ${fmt(e.level)} • ${fmt(e.xp)} XP • save ${e.updatedAt?new Date(e.updatedAt).toLocaleString('pt-BR'):'sem data'}`;
   }catch(err){out.textContent='Saldo não confirmado: '+String(err?.message||'falha de conexão');}}
 $('v86-economy-refresh').onclick=()=>void readConfirmedEconomyV86();
 $('v484-refresh').onclick=()=>operation(refresh);$('v484-close').onclick=()=>shell.hidden=true;
 $('v485-notify').onclick=async()=>{if(typeof Notification==='undefined'||!('serviceWorker' in navigator)){$('v484-error').textContent='Notificações não suportadas neste navegador.';return;}const answer=await Notification.requestPermission();$('v484-error').textContent=answer==='granted'?'Alerta autorizado enquanto o aplicativo estiver em execução. Para tela fechada, será necessário Web Push com agendador externo.':'Permissão não concedida.';};
 function open(){installMenu();shell.hidden=false;void operation(refresh);}
 const admin=document.querySelector('#adminModal .admin-runtime-monitor-section');if(admin&&!document.getElementById('v485-adm-farm')){
  const details=document.createElement('details');details.id='v485-adm-farm';details.innerHTML=`<summary>🌙 FARM OFFLINE • ADM</summary><p>Configuração global para novas sessões; sessões existentes preservam os valores da ativação.</p>
   <label>Tempo máximo (min)<input id="v485-adm-max" type="number" min="30" max="720" step="30"></label>
   <label>Dano médio (%)<input id="v485-adm-damage" type="number" min="50" max="150"></label>
   <label>Máx. NPCs por sessão<input id="v485-adm-kills" type="number" min="20" max="2000"></label>
   <label>Viagem/reabastecimento (seg)<input id="v485-adm-trip" type="number" min="45" max="600"></label>
   <label>Limite de vendas por hora (CR)<input id="v49-adm-sale" type="number" min="0" max="1000000000" step="100000"></label>
   <div><button type="button" id="v485-adm-save">SALVAR REGRAS</button><button type="button" id="v485-adm-refresh">ATUALIZAR</button></div><p id="v485-adm-info"></p><div id="v485-adm-sessions"></div>`;
  admin.prepend(details);const a=id=>details.querySelector('#'+id);
  async function loadAdmin(){try{const r=await request('admin/settings');const st=r.settings||{};a('v485-adm-max').value=st.max_minutes||240;a('v485-adm-damage').value=st.damage_percent||100;a('v485-adm-kills').value=st.max_kills||550;a('v485-adm-trip').value=st.travel_seconds||125;a('v49-adm-sale').value=st.max_sale_credits??30000000;a('v485-adm-info').textContent=`${r.sessions?.length||0} sessões ativas`;const dest=a('v485-adm-sessions');dest.replaceChildren();for(const row of r.sessions||[]){const el=document.createElement('div');el.className='v485-adm-session';el.textContent=`${row.user_id.slice(0,8)} • ${row.map_id?.toUpperCase()} • ${row.npc_name||row.npc_key} • até ${new Date(row.ends_at).toLocaleString('pt-BR')} `;const stop=document.createElement('button');stop.textContent='CANCELAR';stop.type='button';stop.onclick=async()=>{if(!confirm('Cancelar farm do piloto sem conceder recompensas?'))return;await request('admin/cancel',{userId:row.user_id});await loadAdmin();};el.append(stop);dest.append(el);}}catch(e){a('v485-adm-info').textContent=e.message;}}
  details.addEventListener('toggle',()=>{if(details.open)void loadAdmin();});a('v485-adm-refresh').onclick=()=>loadAdmin();a('v485-adm-save').onclick=async()=>{try{const values={max_minutes:Number(a('v485-adm-max').value),damage_percent:Number(a('v485-adm-damage').value),max_kills:Number(a('v485-adm-kills').value),travel_seconds:Number(a('v485-adm-trip').value),max_sale_credits:Number(a('v49-adm-sale').value)};await request('admin/settings',values,'PUT');a('v485-adm-info').textContent='Configuração salva no servidor.';await loadAdmin();}catch(e){a('v485-adm-info').textContent=e.message;}};
 }
 v49Tools=mountFarmV49({shell,request});
 let lastPreviewAt=0;
 async function loopPreview(){if(authorized&&status==='running'&&!shell.hidden&&Date.now()-lastPreviewAt>15000){lastPreviewAt=Date.now();try{preview=await request('preview');if(preview?.report)showStats(preview.report);}catch{}}setTimeout(loopPreview,5000);}
 void loopPreview();
 return {async enable(){authorized=true;installMenu();await refresh();},disable(){authorized=false;if(menu)menu.hidden=true;shell.hidden=true;active(false);},open};
}
