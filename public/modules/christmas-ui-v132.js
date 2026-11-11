import {DESIGNS,MISSIONS,isChristmas,compatibleDesign} from './christmas-v132.js';
import {shipChristmasArt,boxChristmasArt,fireworkChristmasArt} from './christmas-art-v132.js?v=47.7.70';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
export function createChristmasUI(bridge){
 let lastAccount=null,seenGoals=null,autoCelebration=false,lastAnnouncement='',statusBusy=false;
 let status=null,boxes=[],effects=[],lastCollect=0,busy=false,panel=null,lastStatus=0,fireRequest=null,lastFire=0;
 const button=document.createElement('button');button.className='natal-launch';button.textContent='❄ NATAL';button.hidden=true;document.body.append(button);
 const fire=document.createElement('button');fire.className='natal-fire';fire.textContent='🎆';fire.title='Soltar fogo festivo';fire.hidden=true;document.body.append(fire);
 let hiddenFx=false;try{hiddenFx=localStorage.getItem('natalHideFx')==='1';}catch{}
 const badge=()=>status?.claims?.includes('global:3')?'Guardião do Natal 2026':null;
 async function refresh(){if(!bridge.ready()||statusBusy)return;statusBusy=true;lastStatus=Date.now();try{status=await bridge.status();
 const now=Date.now(),next=status.upcoming?.find(e=>e.start>now&&e.start-now<=300000);
 if(next&&lastAnnouncement!==next.eventId){lastAnnouncement=next.eventId;bridge.toast(`${next.name} começa em ${Math.ceil((next.start-now)/60000)} min`);}
 const counts=status.counts||[],goals=status.config?.goals||{},f=status.player?.faction||bridge.faction(),reached=[];
 for(const scope of ['faction','global'])for(let i=0;i<3;i++){
  const g=scope==='faction'?[goals[f]]:Object.values(goals);if(g.some(x=>!x))continue;
  const target=k=>g.reduce((n,x)=>n+Number(x[k]?.[i]||0),0),sum=k=>counts.filter(c=>c.kind===k&&(scope==='global'||c.faction===f)).reduce((n,c)=>n+Number(c.qty),0);
  if(target('npc')>0&&sum('npc')>=target('npc')&&sum('box')>=target('box'))reached.push(`${scope}:${i}`);
 }
 if(seenGoals&&reached.some(k=>!seenGoals.includes(k))){autoCelebration=true;bridge.toast('Meta coletiva conquistada! Confira a Central Natal.');}seenGoals=reached;
 button.textContent=reached.length?'❄ NATAL ★':'❄ NATAL';if(panel?.open)render();
 }catch(e){if(panel?.open){panel.innerHTML='<p>Não foi possível consultar o Natal. Feche e abra novamente após reconectar.</p><button data-close>FECHAR</button>';panel.querySelector('[data-close]').onclick=()=>panel.close();bridge.toast(e.message);}}finally{statusBusy=false;}}
 async function claim(key){if(busy)return;busy=true;try{await bridge.claim(key);await refresh();bridge.toast('Recompensa confirmada no servidor');}catch(e){bridge.toast(e.message);}finally{busy=false;}}
 function render(){
  const p=status?.player||{},claims=status?.claims||[],counts=status?.counts||[],cfg=status?.config||{},f=p.faction||bridge.faction();
  const sum=(kind,faction)=>counts.filter(c=>c.kind===kind&&(!faction||c.faction===faction)).reduce((n,c)=>n+Number(c.qty),0);
  const reward=r=>`${fmt(r.credits)} CR • ${fmt(r.uridium)} STL • ${r.cores} núcleos • ${r.fireworks} fogos`;
  const claimButton=(key,disabled=false)=>`<button data-claim="${esc(key)}" ${claims.includes(key)||disabled?'disabled':''}>${claims.includes(key)?'RESGATADO':'RESGATAR'}</button>`;
  const date=t=>new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'});
  let html=`<header><h2>❄ NATAL ESTELAR</h2><button data-close>✕</button></header><p>NPCs: ${fmt(p.npc)} • Boxes: ${fmt(p.box)} • Chefes: ${fmt(p.boss)} • Fogos: ${fmt(p.fireworks)}</p>`;
  html+=`<p>${status?.current?esc(status.current.name)+' • até '+date(status.current.end):'Preparando a próxima rodada'}</p><details><summary>Próximos eventos • Brasília</summary>${(status?.upcoming||[]).map(e=>`<p>${date(e.start)}–${date(e.end)} • ${esc(e.name)} ${e.rules?.map?esc(e.rules.map==='x4'?'X-4':e.rules.map.replace('b4','4-')):''}</p>`).join('')}</details>`;
  html+='<h3>Missões natalinas</h3>'+MISSIONS.map(m=>`<article><b>${esc(m.name)}</b><p>${Math.min(p.npc||0,m.npc)}/${m.npc} NPCs • ${Math.min(p.box||0,m.box)}/${m.box} boxes${m.boss?' • '+Math.min(p.boss||0,m.boss)+'/'+m.boss+' chefe':''}</p><small>${reward(m.reward)}</small>${claimButton('mission:'+m.id,(p.npc||0)<m.npc||(p.box||0)<m.box||(p.boss||0)<m.boss)}</article>`).join('');
  for(const scope of ['faction','global']){const goals=scope==='faction'?(cfg.goals?.[f]||{}):Object.values(cfg.goals||{}).reduce((o,g)=>({npc:[0,1,2].map(i=>o.npc[i]+g.npc[i]),box:[0,1,2].map(i=>o.box[i]+g.box[i])}),{npc:[0,0,0],box:[0,0,0]});const n=sum('npc',scope==='faction'?f:null),b=sum('box',scope==='faction'?f:null);
   html+=`<h3>${scope==='faction'?'Sua facção':'Servidor inteiro'}</h3><p>${fmt(n)} NPCs • ${fmt(b)} boxes</p>`;
   for(let i=0;i<3;i++)html+=`<article><b>Etapa ${i+1}</b><p>Meta: ${fmt(goals.npc?.[i])} NPCs e ${fmt(goals.box?.[i])} boxes</p><small>${reward({credits:(i+1)*2000000,uridium:(i+1)*1500,cores:i+1,fireworks:(i+1)*3})}</small>${claimButton(scope+':'+(i+1),!goals.npc?.[i]||n<goals.npc[i]||b<goals.box[i]||((p.npc||0)<20&&(p.box||0)<10))}</article>`;
  }
  html+=`<h3>Presente de abertura</h3><p>NATALESTELAR • 10 milhões CR, 10.000 STL, 5 núcleos e 10 fogos</p>${claimButton('coupon:NATALESTELAR')}`;
  html+=`<h3>Passe de dezembro • trilha gratuita</h3><p>Os designs exclusivos desbloqueiam nos tiers 15 e 30 do passe de dezembro.</p><p>Pathfinder Cristal • tier 15 ${claimButton('pass:cristal')}</p><p>Kensei Vulcão Natalino • tier 30 ${claimButton('pass:vulcao')}</p>`;
  html+=`<h3>Designs da sua nave</h3><div class="natal-designs">${DESIGNS.filter(d=>compatibleDesign(d,bridge.ship())).map(d=>`<article><img src="${esc(shipChristmasArt(bridge.ship(),d.design_id)||'')}" alt="${esc(d.name)}"><b>${esc(d.name)}</b><p>${Object.entries(d.bonuses).map(([k,v])=>`${esc(k)} +${Math.round(v*100)}%`).join(' • ')}</p>${d.eligibility.source==='shop'?`<p>${fmt(d.price)} STL</p><button data-buy="design:${esc(d.design_id)}">${bridge.owned(d.design_id)?'ADQUIRIDO':'COMPRAR'}</button>`:'Exclusivo do passe de dezembro'}</article>`).join('')}</div>`;
  html+=`<h3>Fogos manuais</h3><p>Um por vez • arma em 2s • intervalo de 5s • sem dano</p><select data-style><option value="gold">Estrela dourada</option><option value="snow">Floco branco</option><option value="red">Explosão vermelha</option></select><button data-fire>🎆 SOLTAR (${fmt(p.fireworks)})</button><label><input type="checkbox" data-hide ${hiddenFx?'checked':''}> Ocultar explosões de fogos</label><p>${badge()||''}</p><button data-refresh>ATUALIZAR</button>`;
  panel.innerHTML=html;
  panel.querySelector('[data-close]').onclick=()=>panel.close();panel.querySelector('[data-refresh]').onclick=refresh;
  panel.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.claim));
  panel.querySelectorAll('[data-buy]').forEach(b=>{b.disabled=bridge.owned(b.dataset.buy.slice(7));b.onclick=()=>{if(confirm('Confirmar compra deste design com STL?'))claim(b.dataset.buy);};});
  panel.querySelector('[data-fire]').onclick=()=>launch(panel.querySelector('[data-style]').value);
  panel.querySelector('[data-hide]').onchange=e=>{hiddenFx=e.target.checked;try{localStorage.setItem('natalHideFx',hiddenFx?'1':'0');}catch{}};
 }
 async function launch(style='gold'){
  if(Date.now()-lastFire<5000)return bridge.toast('Aguarde o fogo anterior');
  fireRequest ||= crypto.randomUUID();const id=fireRequest;lastFire=Date.now();
  bridge.send({type:'natal_fire',id,style});
 }
 button.onclick=async()=>{if(!panel){panel=document.createElement('dialog');panel.className='natal-panel';document.body.append(panel);}panel.innerHTML='<p>Consultando progresso…</p><button>FECHAR</button>';panel.querySelector('button').onclick=()=>panel.close();panel.showModal();await refresh();};fire.onclick=()=>launch();
 return {
  message(msg){
   if(msg.type==='world_snapshot'){boxes=msg.natalBoxes||[];effects=[];}
   if(msg.type==='natal_boxes')boxes=msg.boxes||[];
   if(msg.type==='natal_error'){bridge.toast(msg.message);busy=false;}
   if(msg.type==='natal_fire_ack'){if(msg.id===fireRequest)fireRequest=null;if(status?.player)status.player.fireworks=msg.fireworks;}
   if(msg.type==='natal_firework'&&Date.now()-msg.start<5000){effects=effects.filter(e=>e.userId!==msg.userId);effects.push(msg);effects=effects.slice(-8);}
  },
  draw(ctx,screen,img,now,low){
   if(!bridge.ready())return;
   const ready=isChristmas(now)&&status?.config?.enabled!==false;button.hidden=!ready;fire.hidden=!ready;
   document.body.classList.toggle('natal-theme',ready);
   for(const b of boxes){const p=screen(b.x,b.y);const art=img(boxChristmasArt());if(art?.complete&&art.naturalWidth)ctx.drawImage(art,p.x-20,p.y-20,40,40);else{ctx.fillStyle='#e94f65';ctx.fillRect(p.x-9,p.y-9,18,18);}}
   effects=effects.filter(e=>now-e.start<5000);
   if(hiddenFx)return;
   for(const e of effects.slice(-(low?2:4))){const p=screen(e.x,e.y),t=now-e.start;ctx.save();
    if(t<2000){const art=img(fireworkChristmasArt());if(art?.complete&&art.naturalWidth)ctx.drawImage(art,p.x-12,p.y-12,24,24);}
    else{const age=(t-2000)/3000;ctx.globalAlpha=1-age;ctx.strokeStyle=e.style==='snow'?'#fff':e.style==='red'?'#ff4567':'#ffd86a';ctx.lineWidth=2;for(let i=0;i<(low?8:16);i++){const a=i*Math.PI*2/(low?8:16),r=10+age*85;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r*.7,p.y+Math.sin(a)*r*.7);ctx.lineTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);ctx.stroke();}}
    ctx.restore();
   }
  },
  tick(){
   if(!bridge.ready()){button.hidden=true;fire.hidden=true;boxes=[];effects=[];return;}
   if(lastAccount!==bridge.account()){lastAccount=bridge.account();status=null;seenGoals=null;lastStatus=0;fireRequest=null;}
   if(Date.now()-lastStatus>60000)void refresh();
   if(autoCelebration&&!bridge.combat()){autoCelebration=false;effects.push({userId:'celebration',...bridge.position(),start:Date.now()-2000,style:'gold'});}
   if(!bridge.ready()||busy||Date.now()-lastCollect<250)return;
   const p=bridge.position(),b=boxes.find(b=>Math.hypot(p.x-b.x,p.y-b.y)<65);
   if(b){busy=true;lastCollect=Date.now();bridge.collect(b.id).catch(e=>bridge.toast(e.message)).finally(()=>{busy=false;});}
   if(panel?.open&&Date.now()-lastStatus>15000)void refresh();
  }
 };
}
