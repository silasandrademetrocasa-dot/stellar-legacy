/* STELLAR_V49_COCKPIT — history, independent permissions, NPC economics & real push opt-in.
 * No writes to saves. All financial values originate from backend reports / projections.
 */
const format=n=>Math.round(Number(n)||0).toLocaleString('pt-BR');
const explain=s=>String(s||'').slice(0,180);
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
const STRATEGIES=[['auto:weakest','Automático: NPC mais fraco'],['auto:credits','Automático: maior crédito líquido/min'],['auto:xp','Automático: mais XP/min'],['auto:stl','Automático: mais STL/min'],['auto:balanced','Automático: eficiência equilibrada']];
export function mountFarmV49({shell,request,root=document}){
 const container=el('div','v49-aux');container.id='v49-tools';container.innerHTML='<details id="v49-compare"><summary>🎯 COMPARAR NPCs E MUNIÇÕES</summary><p id="v49-strategy-note">Estimativas com munição selecionada. NPCs especiais excluídos.</p><button id="v49-compare-btn" type="button">CALCULAR MELHORES NPCs</button><div id="v49-strategy-list"></div></details><details id="v49-history"><summary>📊 HISTÓRICO E EFICIÊNCIA DO FARM</summary><button id="v49-history-btn" type="button">ATUALIZAR HISTÓRICO</button><div id="v49-history-list"></div></details>';
 const settings=shell.querySelector('#v484-settings');settings?.after(container);
 const style=el('style');style.textContent=`
 #v49-tools{padding:8px 0;color:#e1f5ff}#v49-tools details,#v49-admin-control{margin:8px 0;border:1px solid #295c76;border-radius:10px;padding:10px;background:#0c2232}
 #v49-tools summary,#v49-admin-control summary{cursor:pointer;font-weight:800}#v49-tools button,#v49-admin-control button,#v49-admin-control select,#v49-admin-control input{padding:8px;background:#1b4b62;border:1px solid #39748d;border-radius:8px;color:#eefaff;margin:5px 0;max-width:100%}
 .v49-activity{border-bottom:1px solid #24475c;padding:7px 0;line-height:1.55;font:12px system-ui}.v49-muted{font:12px system-ui;color:#aac9d8}#v49-admin-control label{display:block;margin:8px 0}#v49-admin-control select{width:100%}#v49-history-list,#v49-strategy-list{max-height:245px;overflow-y:auto}
 `;document.head.appendChild(style);
 const get=id=>shell.querySelector('#'+id)||root.querySelector('#'+id);
 let currentOptions=null,adminData=null;
 function syncOptions(options){
  currentOptions=options;
  const npc=get('v484-npc');if(npc){const previous=npc.value;for(const [id,label] of STRATEGIES){const option=el('option','',label);option.value=id;npc.appendChild(option);}if([...npc.options].some(o=>o.value===previous))npc.value=previous;}
  const start=get('v484-start');if(start){start.disabled=!options.allowed;start.dataset.v49PermissionBlocked=options.allowed?'false':'true';start.title=options.allowed?'':'O ADM precisa liberar o Farm Offline';}
  const note=get('v49-strategy-note');if(note)note.textContent=options.allowed?`Limite individual: ${options.maxMinutes} min. Compare usando munição real e NPCs do ${String(options.map).toUpperCase()}.`:'Farm bloqueado: aguarde liberação exclusiva do ADM. Resgates antigos continuam disponíveis.';
 }
 async function history(){const target=get('v49-history-list');target.textContent='Consultando histórico...';try{
  const data=await request('v49/history');target.replaceChildren();
  if(!data.sessions?.length){target.textContent='Nenhuma sessão anterior.';return;}
  for(const f of data.sessions){const div=el('div','v49-activity');const dt=new Date(f.startedAt).toLocaleString('pt-BR');div.textContent=`${dt} • ${f.npcName} • ${String(f.map).toUpperCase()} • ${f.status}\n${format(f.kills)} NPCs • ${format(f.xp)} XP • ${format(f.stl)} STL • ${format(f.creditsNet)} CR líquidos\n${format(f.killsPerHour)} NPC/h • ${format(f.creditsPerHour)} CR/h • ${format(f.stlPerHour)} STL/h`;div.style.whiteSpace='pre-line';target.appendChild(div);}
 }catch(e){target.textContent=explain(e.message);}}
 async function compare(){const target=get('v49-strategy-list');target.textContent='Calculando rendimento...';try{
  const ammo=get('v485-ammo')?.value||'lcb10';const out=await request('v49/strategies?ammo='+encodeURIComponent(ammo));target.replaceChildren();
  for(const [key,title] of [['credits','CR líquidos/min'],['xp','XP/min'],['stl','STL/min'],['balanced','equilibrado']]){
   const top=out.strategies?.[key]?.[0];if(!top)continue;
   const div=el('div','v49-activity',`${title}: ${top.name} • ${format(top.perHourCredits)} CR/h • ${format(top.perHourXp)} XP/h • ${format(top.perHourStl)} STL/h • ${format(top.ammoPerKill)} munições/NPC`);target.appendChild(div);
  }
  target.appendChild(el('p','v49-muted','Projeções não são ganhos pagos. O NPC escolhido é validado novamente ao iniciar o farm.'));
 }catch(e){target.textContent=explain(e.message);}}
 get('v49-history-btn').onclick=()=>void history();get('v49-compare-btn').onclick=()=>void compare();
 get('v49-history').addEventListener('toggle',e=>{if(e.target.open)void history();});
 async function notificationEnable(){const message=get('v484-error');if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){message.textContent='Push em segundo plano indisponível neste aparelho. Mantenha alertas locais ou use os avisos do ChatGPT.';return;}
  try{const perm=await Notification.requestPermission();if(perm!=='granted'){message.textContent='Permissão de notificação não concedida.';return;}
   const cfg=await request('v49/push-config');if(!cfg.configured||!cfg.publicKey){message.textContent='Push ainda não configurado no servidor. Falta ativar VAPID e cron do Supabase.';return;}
   const reg=await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();
   if(!sub){const base64=cfg.publicKey.replace(/-/g,'+').replace(/_/g,'/');const bytes=Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')),c=>c.charCodeAt(0));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});}
   await request('v49/push-subscribe',{subscription:sub.toJSON()});message.textContent='🔔 Push registrado! Quando o agendador estiver ativado, o alerta chegará mesmo com o app fechado.';
  }catch(e){message.textContent=explain(e.message);}
 }
 const btn=get('v485-notify');if(btn){btn.textContent='🔔 ATIVAR PUSH NO ANDROID';btn.onclick=()=>void notificationEnable();}
 // Existing ADM panel is already access protected server-side. Keep its separate management controls.
 const anchor=root.querySelector('#v485-adm-farm');
 if(anchor&&!root.querySelector('#v49-admin-control')){
  const adm=el('details');adm.id='v49-admin-control';adm.innerHTML='<summary>🛡️ V49 • AUTORIZAÇÕES E AUDITORIA</summary><p class="v49-muted">Permissões exclusivas do Farm Offline. O check do Autopilot fica independente.</p><button id="v49-adm-load">CARREGAR JOGADORES / RELATÓRIOS</button><p id="v49-adm-info"></p><label>Piloto<select id="v49-adm-user"></select></label><label><input type="checkbox" id="v49-adm-grant"> Liberar Farm Offline</label><label>Limite de duração (min; vazio = global)<input type="number" id="v49-adm-max" min="30" max="720" step="30"></label><button id="v49-adm-save">SALVAR PERMISSÃO</button><div id="v49-adm-audit"></div>';
  anchor.after(adm);
  const load=async()=>{const msg=adm.querySelector('#v49-adm-info');msg.textContent='Consultando...';try{
    adminData=await request('v49/admin/audit');const select=adm.querySelector('#v49-adm-user'),old=select.value;select.replaceChildren();for(const p of adminData.players){const o=el('option','',p.callsign);o.value=p.id;select.appendChild(o);}if(adminData.players.some(p=>p.id===old))select.value=old;
    const summary=adminData.summary;msg.textContent=`${summary.sessions} sessões • ${summary.active} ativas • ${summary.settled} resgates • ${format(summary.creditsNet)} CR • ${format(summary.stl)} STL`;
    const list=adm.querySelector('#v49-adm-audit');list.replaceChildren();for(const f of adminData.sessions.slice(0,35)){list.appendChild(el('div','v49-activity',`${f.callsign} • ${f.npcName} • ${f.status} • ${format(f.creditsNet)} CR • ${format(f.stl)} STL`));}
    select.onchange=()=>{const player=adminData.players.find(p=>p.id===select.value);adm.querySelector('#v49-adm-grant').checked=!!player?.offline?.enabled;adm.querySelector('#v49-adm-max').value=player?.offline?.max_minutes||'';};select.onchange();
   }catch(e){msg.textContent=explain(e.message);}};
  adm.querySelector('#v49-adm-load').onclick=()=>void load();adm.addEventListener('toggle',()=>{if(adm.open)void load();});
  adm.querySelector('#v49-adm-save').onclick=async()=>{const userId=adm.querySelector('#v49-adm-user').value,maxText=adm.querySelector('#v49-adm-max').value;try{await request('v49/admin/access',{userId,enabled:adm.querySelector('#v49-adm-grant').checked,maxMinutes:maxText?Number(maxText):null},'PUT');await load();}catch(e){adm.querySelector('#v49-adm-info').textContent=explain(e.message);}};
 }
 return {syncOptions,history,compare};
}
