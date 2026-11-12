import {createFormationMotion} from './drone-formation-motion-v144.js';
import {LASER_AMMO,ROCKETS} from '../data.js';
import {DRONE_FORMATIONS,TACTICS_KEY,tacticsFor,activeConfig,ownedFormations,formationDescription} from './combat-tactics-v144.js';
const glyphs={original:'○',furia:'△',interceptor:'⋈',bastiao:'▣',colosso:'▰',vanguarda:'⋀',prisma:'◇',cacador_supremo:'⌖',leviata:'♜'};
const shortQty=n=>n>=1e6?(n/1e6).toFixed(1)+'m':n>=1e3?(n/1e3).toFixed(1)+'k':String(Math.max(0,n||0));
export function mountCombatHud({root,getState,getConfirmedFormation,onSelect,onAssign,onConfig,getAsset,getCooldown=()=>0,notify=()=>{}}){
 if(!root)return null;
 root.classList.add('combat-hud-v144');
 const toolbar=root.querySelector('.weapon-toolbar');toolbar.innerHTML='<span class="combat-hud-title">ATALHOS</span><button type="button" data-conf="1">CONF 1</button><button type="button" data-conf="2">CONF 2</button><button type="button" class="combat-edit" aria-label="Editar atalhos">⚙</button>';
 const content=root.querySelector('#weaponBarContent'),legacy=content.querySelector('.ammo-clusters');legacy.hidden=true;legacy.setAttribute('aria-hidden','true');
 const grid=document.createElement('div');grid.className='combat-slot-grid';
 const hide=document.createElement('button');hide.id='weaponBarToggle';hide.className='combat-side';hide.type='button';hide.textContent='▾';hide.title='Recolher atalhos';
 const skill=document.createElement('button');skill.className='combat-side combat-skill';skill.type='button';skill.textContent='SKILL ▴';skill.title='Habilidades da nave';
 const ability=root.querySelector('#abilityBar');ability.classList.add('skill-drawer-v144');ability.hidden=true;
 let collapsed=false;hide.onclick=()=>{collapsed=!collapsed;root.classList.toggle('collapsed',collapsed);root.classList.toggle('combat-collapsed',collapsed);hide.textContent=collapsed?'▸':'▾';hide.setAttribute('aria-expanded',String(!collapsed));};
 skill.onclick=()=>{ability.hidden=!ability.hidden;skill.setAttribute('aria-expanded',String(!ability.hidden));};
 const buttons=[];let preview='original',previewMotion=createFormationMotion(),previewIds=[],previewFrame=0;
 let editIndex=0,category='laser',dialog=null,lastSignature='',pending=false,holdTimer=null,suppressClick=false;
 for(let i=0;i<12;i++){
  const b=document.createElement('button');b.type='button';b.className='combat-slot';b.dataset.slot=String(i);b.innerHTML='<span class="slot-number"></span><span class="slot-icon"></span><span class="slot-label"></span><span class="slot-qty"></span>';
  b.querySelector('.slot-number').textContent=String(i+1).padStart(2,'0');
  b.oncontextmenu=e=>{e.preventDefault();openEditor(i);};
  b.onpointerdown=()=>{suppressClick=false;holdTimer=setTimeout(()=>{suppressClick=true;openEditor(i);},500);};
  const release=()=>{clearTimeout(holdTimer);holdTimer=null;};b.onpointerup=release;b.onpointercancel=release;b.onpointerleave=release;
  b.onclick=async()=>{if(suppressClick){suppressClick=false;return;}const ref=tacticsFor(getState()).profiles[activeConfig(getState())].slots[i];if(!ref)return openEditor(i);if(b.classList.contains('unavailable')||pending)return;pending=true;refresh(true);try{await onSelect(ref);}catch(e){notify(e.message||'Seleção não confirmada.');}finally{pending=false;refresh(true);}};
  buttons.push(b);
 }
 grid.append(hide,...buttons.slice(0,6),skill,...buttons.slice(6));content.prepend(grid);
 toolbar.querySelector('.combat-edit').onclick=()=>openEditor(0);
 for(const b of toolbar.querySelectorAll('[data-conf]'))b.onclick=async()=>{if(pending)return;pending=true;refresh(true);try{await onConfig(Number(b.dataset.conf));}catch(e){notify(e.message);}finally{pending=false;refresh(true);}};
 function refresh(force=false){
  const state=getState();if(!state)return;const config=activeConfig(state),profile=tacticsFor(state).profiles[config],formation=getConfirmedFormation();
  const cooldown=Math.ceil(getCooldown()*5)/5;const signature=JSON.stringify([config,profile,formation,pending,state.selectedLaserAmmo,state.selectedRocket,state.ammo,state.rockets,cooldown]);if(!force&&signature===lastSignature)return;lastSignature=signature;
  root.setAttribute('aria-busy',String(pending));
  for(const b of toolbar.querySelectorAll('[data-conf]')){b.classList.toggle('active',Number(b.dataset.conf)===config);b.setAttribute('aria-pressed',String(Number(b.dataset.conf)===config));}
  buttons.forEach((b,i)=>{
   const r=profile.slots[i],def=r&&({laser:LASER_AMMO,rocket:ROCKETS,formation:DRONE_FORMATIONS}[r.kind]?.[r.id]);
   const qty=r?.kind==='laser'?Number(state.ammo?.[r.id]||0):r?.kind==='rocket'?Number(state.rockets?.[r.id]||0):null;
   const active=r&&(r.kind==='formation'?formation===r.id:r.kind==='laser'?state.selectedLaserAmmo===r.id:state.selectedRocket===r.id);
   b.classList.toggle('active',!!active);b.classList.toggle('formation-active',!!active&&r.kind==='formation');b.classList.toggle('unavailable',qty!==null&&qty<=0);
   b.dataset.rarity=r?.kind==='formation'?def?.rarity||'base':'';
   const icon=b.querySelector('.slot-icon');icon.replaceChildren();
   if(r&&r.kind!=='formation'&&getAsset(r.id)){const img=document.createElement('img');img.src=getAsset(r.id);img.alt='';icon.append(img);}else icon.textContent=r?.kind==='formation'?glyphs[r.id]:'+';
   b.querySelector('.slot-label').textContent=def?((def.name||r.id).replace('Caçador Supremo','CAÇADOR').slice(0,10)):'';
   b.querySelector('.slot-qty').textContent=r?.kind==='rocket'&&active&&cooldown>0?cooldown.toFixed(1)+'s':qty===null?'':shortQty(qty);
   b.title=def?(r.kind==='formation'?`${def.name} · ${formationDescription(def)}`:def.name||r.id):'Atribuir atalho';b.setAttribute('aria-label',`Atalho ${i+1}: ${b.title}`);b.setAttribute('aria-pressed',String(!!active));
  });
 }
 function openEditor(index){
  editIndex=index;if(!dialog){dialog=document.createElement('dialog');dialog.className='combat-editor-v144';document.body.append(dialog);}
  drawEditor();if(!dialog.open)dialog.showModal();
 }
 function drawEditor(){
  dialog.replaceChildren();const header=document.createElement('header');const title=document.createElement('h3');title.textContent=`Atalho ${String(editIndex+1).padStart(2,'0')} · CONF ${activeConfig(getState())}`;
  const close=document.createElement('button');close.type='button';close.textContent='Fechar';close.onclick=()=>dialog.close();header.append(title,close);dialog.append(header);
  const slots=document.createElement('div');slots.className='editor-slot-index';for(let i=0;i<12;i++){const b=document.createElement('button');b.type='button';b.textContent=String(i+1);b.classList.toggle('active',i===editIndex);b.onclick=()=>{editIndex=i;drawEditor();};slots.append(b);}dialog.append(slots);
  const tabs=document.createElement('nav');for(const [id,label] of [['laser','Munições'],['rocket','Mísseis'],['formation','Formações']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.classList.toggle('active',category===id);b.onclick=()=>{category=id;drawEditor();};tabs.append(b);}dialog.append(tabs);
  if(category==='formation'){
   const canvas=document.createElement('canvas');canvas.className='formation-preview-v144';canvas.width=330;canvas.height=170;dialog.append(canvas);
   const activate=document.createElement('button');activate.type='button';activate.textContent='Atribuir '+DRONE_FORMATIONS[preview].name;activate.disabled=!ownedFormations(getState()).has(preview);activate.onclick=()=>assign({kind:'formation',id:preview});dialog.append(activate);
   const ids=(getState().drones||[]).map(d=>String(d.id));if(JSON.stringify(ids)!==JSON.stringify(previewIds))previewIds=ids;cancelAnimationFrame(previewFrame);
   let last=0;const paint=ms=>{if(!dialog.open)return;if(ms-last>65){last=ms;const c=canvas.getContext('2d');c.clearRect(0,0,330,170);c.fillStyle='#071d2b';c.fillRect(0,0,330,170);c.fillStyle='#b9edff';c.beginPath();c.moveTo(176,85);c.lineTo(152,77);c.lineTo(156,85);c.lineTo(152,93);c.closePath();c.fill();
    for(const p of previewMotion.sample(previewIds,preview,0,ms/1000,{quality:'low'})){c.fillStyle=p.z<0?'#477b9c':'#76dfff';c.beginPath();c.arc(165+p.x*.62,85+p.y*.62,4*p.scale,0,Math.PI*2);c.fill();}c.font='10px Arial';c.fillStyle='#a7cadd';c.fillText(previewIds.length+' drones equipados · '+DRONE_FORMATIONS[preview].name,9,160);}
    previewFrame=requestAnimationFrame(paint);};previewFrame=requestAnimationFrame(paint);
  }
  const list=document.createElement('div');list.className='combat-choice-list';const owned=ownedFormations(getState());
  for(const def of Object.values({laser:LASER_AMMO,rocket:ROCKETS,formation:DRONE_FORMATIONS}[category])){
   const b=document.createElement('button');b.type='button';b.className='combat-choice';b.dataset.rarity=def.rarity||'';const locked=category==='formation'&&!owned.has(def.id);
   const name=document.createElement('b');name.textContent=(category==='formation'?glyphs[def.id]+' ':'')+(def.name||def.id);
   const note=document.createElement('small');note.textContent=category==='formation'?formationDescription(def)+(locked?' · NÃO OBTIDA':''):shortQty(getState()[category==='laser'?'ammo':'rockets']?.[def.id]||0)+' disponíveis';
   b.append(name,note);b.dataset.locked=String(locked);b.onclick=()=>{if(category==='formation'){preview=def.id;drawEditor();}else assign({kind:category,id:def.id});};list.append(b);
  }
  dialog.append(list);const remove=document.createElement('button');remove.type='button';remove.textContent='Limpar atalho';remove.onclick=()=>assign(null);dialog.append(remove);
 }
 async function assign(ref){if(pending)return;pending=true;try{await onAssign(activeConfig(getState()),editIndex,ref);dialog.close();}catch(e){notify(e.message||'Atalho não confirmado.');}finally{pending=false;refresh(true);}}
 refresh(true);return {refresh,openEditor};
}
