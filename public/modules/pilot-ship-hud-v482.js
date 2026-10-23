// V48.2 • Upgrade DOM nodes in place; preserves all original IDs, listeners and live HUD updates.
// Never writes saves or manipulates balances. Refresh only text/width when changed.
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
const $=id=>document.getElementById(id);
function ensureBarRow(row,type){
  if(!row)return null;
  row.classList.add('v482-gauge-row',`v482-${type}-row`);
  if(!row.querySelector('.v482-gauge-track')){
    const outer=document.createElement('div');outer.className='v482-gauge-track';outer.setAttribute('role','progressbar');
    outer.setAttribute('aria-label',type==='hp'?'HP':type==='shield'?'Escudo':'Porão');
    outer.setAttribute('aria-valuemin','0');outer.setAttribute('aria-valuemax','100');
    outer.innerHTML='<i class="v482-gauge-fill"></i>';row.appendChild(outer);
  }
  return row.querySelector('.v482-gauge-track');
}
function updateGauge(track,current,max){
  if(!track)return;
  const pct=max>0?Math.min(100,Math.max(0,100*current/max)):0;
  const width=`${pct.toFixed(1)}%`;
  const fill=track.firstElementChild;if(fill&&fill.style.width!==width)fill.style.width=width;
  if(track.getAttribute('aria-valuenow')!==String(Math.round(pct)))track.setAttribute('aria-valuenow',String(Math.round(pct)));
}
export function setupPilotShipHudV482(doc=document){
  const player=doc.getElementById('playerPanel'),ship=doc.getElementById('leftStats');
  if(!player||!ship||player.dataset.v482Ready==='1')return null;
  const head=player.querySelector('.player-float-head');head?.querySelector('span')?.remove();
  const name=head?.querySelector('#userLabel');if(name)name.title='Nome do piloto';
  const body=doc.getElementById('playerPanelContent');
  const rank=doc.getElementById('rankChip')?.closest('div');
  const cr=doc.getElementById('credits')?.closest('div');
  const stl=doc.getElementById('uridium')?.closest('div');
  const level=doc.getElementById('lvl')?.closest('div');
  for(const row of [rank,cr,stl,level])if(row&&row.parentElement===body)body.appendChild(row);
  if(level&&!level.querySelector('.v482-pilot-level')){
    level.classList.add('v482-level-row');
    level.insertAdjacentHTML('beforeend',`<div class="v482-pilot-level"><div class="v482-xp-numbers"><strong id="v482LevelText">LV 1</strong><small id="v482XpValues">0 / 10.000 XP</small></div><div class="v482-xp-track" role="progressbar" aria-label="Experiência até o próximo nível" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="v482-xp-footer"><small id="v482XpMissing">Faltam 10.000 XP</small><small id="v482XpPercent">0%</small></div></div>`);
  }
  const stats=doc.getElementById('leftStatsContent');
  const hp=doc.getElementById('hp')?.closest('div');
  const shield=doc.getElementById('shield')?.closest('div');
  const cargo=doc.getElementById('cargoUsed')?.closest('div');
  const speed=doc.getElementById('speed')?.closest('div');
  const controls=doc.getElementById('battleConfigToolbar');
  for(const row of [hp,shield,cargo,speed,controls])if(row&&row.parentElement===stats)stats.appendChild(row);
  if(hp)ensureBarRow(hp,'hp');
  if(shield)ensureBarRow(shield,'shield');
  if(cargo)ensureBarRow(cargo,'cargo');
  speed?.classList.add('v482-ship-speed');
  const toolbar=doc.getElementById('statsHeader');
  if(toolbar&&!doc.getElementById('v482ShipName')){
    const sub=doc.createElement('small');sub.id='v482ShipName';sub.className='v482-ship-name';sub.textContent='—';toolbar.appendChild(sub);
  }
  player.dataset.v482Ready='1';ship.dataset.v482Ready='1';
  let cache='';
  const update=()=>{
    if(!doc.contains(player)||!doc.contains(ship))return;
    const lv=parsePilotLevelV482(doc.getElementById('lvl')?.textContent);
    const vals=[lv?.level,lv?.xp,doc.getElementById('hp')?.textContent,doc.getElementById('maxHp')?.textContent,doc.getElementById('shield')?.textContent,doc.getElementById('maxShield')?.textContent,doc.getElementById('cargoUsed')?.textContent,doc.getElementById('cargoMax')?.textContent,doc.getElementById('shipLabel')?.textContent].join('|');
    if(vals===cache)return;cache=vals;
    if(lv){
      const p=pilotXpProgressV482(lv.level,lv.xp),bar=level?.querySelector('.v482-xp-track');
      const title=doc.getElementById('v482LevelText'),nums=doc.getElementById('v482XpValues');
      const missing=doc.getElementById('v482XpMissing'),percent=doc.getElementById('v482XpPercent');
      if(title)title.textContent=`NÍVEL ${p.level}`;
      if(nums)nums.textContent=p.maxed?`${nf.format(p.current)} XP • MÁXIMO`:`${nf.format(p.current)} / ${nf.format(p.next)} XP`;
      if(missing)missing.textContent=p.maxed?'Nível máximo':`Faltam ${nf.format(p.remaining)} XP`;
      if(percent)percent.textContent=`${p.percent}%`;
      if(bar){bar.firstElementChild.style.width=`${p.percent}%`;bar.setAttribute('aria-valuenow',String(p.percent));}
    }
    updateGauge(hp?.querySelector('.v482-gauge-track'),parseHudNumberV482($('hp')?.textContent),parseHudNumberV482($('maxHp')?.textContent));
    updateGauge(shield?.querySelector('.v482-gauge-track'),parseHudNumberV482($('shield')?.textContent),parseHudNumberV482($('maxShield')?.textContent));
    updateGauge(cargo?.querySelector('.v482-gauge-track'),parseHudNumberV482($('cargoUsed')?.textContent),parseHudNumberV482($('cargoMax')?.textContent));
    const s=doc.getElementById('v482ShipName');if(s)s.textContent=doc.getElementById('shipLabel')?.textContent||'NAVE';
  };
  update();
  const interval=setInterval(update,450);
  return ()=>clearInterval(interval);
}
function boot(){setupPilotShipHudV482();}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
