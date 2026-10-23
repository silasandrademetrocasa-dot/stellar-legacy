// Stellar Legacy V48.2.3 — HUD ultra-compacto sem mudar IDs, listeners, saves ou sistema de combate.
// Os valores exibidos vêm dos elementos atualizados pelo game.js; este módulo só acrescenta barras visuais.
import {pilotXpProgressV482} from '../level-curve-v482.js';
export function parseHudNumberV482(text){
  const s=String(text??'').replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
  const n=Number(s);return Number.isFinite(n)?n:0;
}
export function parsePilotLevelV482(text){
  const result=/^\s*(\d+)\s*•\s*([\d.,]+)\s*XP/i.exec(String(text??''));
  return result?{level:Number(result[1]),xp:parseHudNumberV482(result[2])}:null;
}
const nf=new Intl.NumberFormat('pt-BR');
const shortName=s=>String(s||'—').split(' • ')[0].trim().toLocaleUpperCase('pt-BR');
function ensureBarRow(row,type){
  if(!row)return null;
  row.classList.add('v482-gauge-row',`v482-${type}-row`);
  let track=row.querySelector('.v482-gauge-track');
  if(!track){
    track=document.createElement('div');track.className='v482-gauge-track';
    track.setAttribute('role','progressbar');
    track.setAttribute('aria-label',type==='hp'?'HP':type==='shield'?'Escudo':'Porão');
    track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
    row.appendChild(track);
  }
  if(!track.querySelector('.v482-gauge-fill'))track.insertAdjacentHTML('afterbegin','<i class="v482-gauge-fill"></i>');
  if(!track.querySelector('.v482-gauge-overlay')){
    track.insertAdjacentHTML('beforeend',`<span class="v482-gauge-overlay"><strong>${type==='hp'?'HP':type==='shield'?'ESC':'PORÃO'}</strong><span class="v482-gauge-numbers">0 / 0</span></span>`);
  }
  return track;
}
function updateGauge(track,current,max){
  if(!track)return;
  const pct=max>0?Math.min(100,Math.max(0,100*current/max)):0;
  const width=`${pct.toFixed(1)}%`,fill=track.querySelector('.v482-gauge-fill');
  if(fill&&fill.style.width!==width)fill.style.width=width;
  const values=track.querySelector('.v482-gauge-numbers');
  const text=`${nf.format(current)} / ${nf.format(max)}`;
  if(values&&values.textContent!==text)values.textContent=text;
  if(track.getAttribute('aria-valuenow')!==String(Math.round(pct)))track.setAttribute('aria-valuenow',String(Math.round(pct)));
  track.title=text;
}
export function setupPilotShipHudV482(doc=document){
  const player=doc.getElementById('playerPanel'),ship=doc.getElementById('leftStats');
  if(!player||!ship||player.dataset.v482Ready==='1')return null;
  const head=player.querySelector('.player-float-head');
  head?.querySelector('span')?.remove(); // Somente nome do piloto, sem JOGADOR
  const name=head?.querySelector('#userLabel');if(name)name.title='Nome do piloto';
  const body=doc.getElementById('playerPanelContent');
  const rank=doc.getElementById('rankChip')?.closest('div');
  const cr=doc.getElementById('credits')?.closest('div');
  const stl=doc.getElementById('uridium')?.closest('div');
  const level=doc.getElementById('lvl')?.closest('div');
  for(const row of [rank,cr,stl,level])if(row&&row.parentElement===body)body.appendChild(row);
  if(level){
    level.classList.add('v482-level-row');
    let progress=level.querySelector('.v482-pilot-level');
    if(!progress){progress=doc.createElement('div');progress.className='v482-pilot-level';level.appendChild(progress);}
    progress.innerHTML='<div class="v482-xp-track" role="progressbar" aria-label="Experiência até o próximo nível" aria-valuemin="0" aria-valuemax="100"><i></i><div class="v482-xp-overlay"><strong id="v482LevelText">LV 1</strong><span class="v482-xp-colon">:</span><span id="v482XpValues">0 / 10.000 XP</span></div></div>';
  }
  const stats=doc.getElementById('leftStatsContent');
  const hp=doc.getElementById('hp')?.closest('div');
  const shield=doc.getElementById('shield')?.closest('div');
  const cargo=doc.getElementById('cargoUsed')?.closest('div');
  const speed=doc.getElementById('speed')?.closest('div');
  const controls=doc.getElementById('battleConfigToolbar');
  for(const row of [hp,shield,cargo,speed])if(row&&row.parentElement===stats)stats.appendChild(row);
  const gauges=[
    [ensureBarRow(hp,'hp'),'hp','maxHp'],
    [ensureBarRow(shield,'shield'),'shield','maxShield']
  ];
  let meta=doc.getElementById('v482ShipMeta');
  if(stats && !meta){
    meta=doc.createElement('div');
    meta.id='v482ShipMeta';
    meta.className='v482-ship-meta';
    meta.innerHTML='<span class="v482-ship-meta-item"><strong>PORÃO</strong><span class="v482-ship-meta-value" id="v482CargoText">0 / 0</span></span><span class="v482-ship-meta-sep">•</span><span class="v482-ship-meta-item"><strong>VEL</strong><span class="v482-ship-meta-value" id="v482SpeedText">0</span></span>';
    stats.appendChild(meta);
  }
  cargo?.classList.add('v482-hidden-source');
  speed?.classList.add('v482-hidden-source');
  const toolbar=doc.getElementById('statsHeader'),left=toolbar?.querySelector('.stats-toolbar-left');
  toolbar?.querySelector('.stats-toolbar-label')?.remove(); // Sem titulo NAVE / NAVE ATUAL
  let shipName=doc.getElementById('v482ShipName');
  if(left&&!shipName){
    shipName=doc.createElement('strong');shipName.id='v482ShipName';shipName.className='v482-ship-name';
    left.appendChild(shipName);
  }
  if(toolbar&&controls){
    toolbar.appendChild(controls); // Mover os MESMOS botões existentes, sem perder os event listeners do jogo.
    controls.classList.add('v482-inline-config');
    // O cabeçalho original recolhe o painel ao clicar; CONF 1/2 não podem acionar esse click.
    controls.addEventListener('click',event=>event.stopPropagation());
    controls.addEventListener('pointerdown',event=>event.stopPropagation());
    controls.addEventListener('touchstart',event=>event.stopPropagation(),{passive:true});
  }
  player.dataset.v482Ready='1';ship.dataset.v482Ready='1';
  let cache='';
  const update=()=>{
    if(!doc.contains(player)||!doc.contains(ship))return;
    const lv=parsePilotLevelV482(doc.getElementById('lvl')?.textContent);
    const values=[lv?.level,lv?.xp,...['hp','maxHp','shield','maxShield','cargoUsed','cargoMax','shipLabel'].map(k=>doc.getElementById(k)?.textContent)].join('|');
    if(values===cache)return;cache=values;
    if(lv){
      const p=pilotXpProgressV482(lv.level,lv.xp),bar=level?.querySelector('.v482-xp-track');
      const title=doc.getElementById('v482LevelText'),nums=doc.getElementById('v482XpValues');
      if(title)title.textContent=`LV ${p.level}`;
      if(nums)nums.textContent=p.maxed?`${nf.format(p.current)} XP • MÁX`:`${nf.format(p.current)} / ${nf.format(p.next)} XP`;
      if(bar){const fill=bar.querySelector('i');if(fill)fill.style.width=`${p.percent}%`;bar.setAttribute('aria-valuenow',String(p.percent));bar.title=p.maxed?'Nível máximo':`Faltam ${nf.format(p.remaining)} XP • ${p.percent}%`;}
    }
    for(const [track,currentId,maxId] of gauges){
      updateGauge(track,parseHudNumberV482(doc.getElementById(currentId)?.textContent),parseHudNumberV482(doc.getElementById(maxId)?.textContent));
    }
    if(shipName){const label=shortName(doc.getElementById('shipLabel')?.textContent);const view=label&&label!=='—'?`(${label})`:'(—)';if(shipName.textContent!==view)shipName.textContent=view;shipName.title=label||'—';}
    const cargoCurrent=parseHudNumberV482(doc.getElementById('cargoUsed')?.textContent),cargoMax=parseHudNumberV482(doc.getElementById('cargoMax')?.textContent);
    const cargoText=doc.getElementById('v482CargoText'); if(cargoText){const t=`${nf.format(cargoCurrent)} / ${nf.format(cargoMax)}`; if(cargoText.textContent!==t)cargoText.textContent=t;}
    const speedText=doc.getElementById('v482SpeedText'); if(speedText){const t=nf.format(parseHudNumberV482(doc.getElementById('speed')?.textContent)); if(speedText.textContent!==t)speedText.textContent=t;}
  };
  update();
  const interval=setInterval(update,450);
  return ()=>clearInterval(interval);
}

function boot(){setupPilotShipHudV482();}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
