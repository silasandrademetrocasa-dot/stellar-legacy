/** HUD Inteligente: apresentações locais, não altera estado econômico nem saves do servidor. */
const STORAGE='stellar_hud_intelligence_v1';
const PANEL_CONTROLS=Object.freeze({
  playerPanel:'playerPanelToggle',leftStats:'statsToggle',activeMissionPanel:'activeMissionToggle',
  petFloatPanel:'petFloatToggle',activityPanel:'activityToggle',chatDock:'chatToggle',
  minimapPanel:'minimapToggle',weaponBar:'weaponBarToggle',gateHud:'gateHudToggle',
  targetLockHud:'targetLockToggle',galaxyEventHud:'galaxyEventToggle'
});
const GROUPS=Object.freeze({
  pve:{label:'PvE',visible:['player','ship','pet','missions','weapons','minimap','activity','gate']},
  pvp:{label:'PvP',visible:['player','ship','pet','weapons','minimap','chat','gate']},
  mine:{label:'Mineração',visible:['player','ship','pet','missions','minimap','activity','gate']},
  explore:{label:'Imersivo',visible:['ship','minimap','weapons','gate']}
});
const MODAL_CONTENT=Object.freeze(['missionContent','hangarContent','clanContent','passContent','petContent','adminModal']);
const bool=v=>v===true;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const ss=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));}catch{}};
const ls=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const el=id=>document.getElementById(id);
const paneVisible=p=>!!p&&!p.classList.contains('hidden')&&!p.classList.contains('hud-user-hidden')&&!p.classList.contains('hud-user-disabled')&&getComputedStyle(p).display!=='none';
export function profileForMap(mapId){return /^(?:b4[123]|4-[123]|battle)/i.test(String(mapId||''))?'pvp':'pve';}
export function safePosition(pos,w,h,vw,vh){
  const x=Number(pos?.x),y=Number(pos?.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  return {left:clamp(x*vw,4,Math.max(4,vw-w-4)),top:clamp(y*vh,47,Math.max(47,vh-h-54))};
}
export function createHudIntelligence({getMap=()=>null,inCombat=()=>false,setVisibility=()=>{},getVisibility=()=>({})}={}){
  if(typeof document==='undefined')return null;
  const state={profile:'pve',autoProfile:false,quiet:false,placements:{},editing:false,globalCollapsed:false,snapshot:null,positionsEnabled:false,folded:{},...ls(STORAGE)};
  if(!GROUPS[state.profile])state.profile='pve';
  if(!state.placements||typeof state.placements!=='object')state.placements={};
  if(!state.folded||typeof state.folded!=='object')state.folded={};
  if(!state.savedVisibility||typeof state.savedVisibility!=='object')state.savedVisibility={};
  if(!state.savedCollapse||typeof state.savedCollapse!=='object')state.savedCollapse={};
  state.editing=false;
  state.globalCollapsed=false;
  state.snapshot=null;
  const root=el('app'),button=el('hudIntelligenceQuick'),panel=el('hudIntelligenceSection'),editor=el('hudEditorBar');
  if(!root||!panel||!button||!editor)return null;
  const persist=()=>ss(STORAGE,{profile:state.profile,autoProfile:state.autoProfile,quiet:state.quiet,placements:state.placements,positionsEnabled:state.positionsEnabled,folded:state.folded,savedVisibility:state.savedVisibility,savedCollapse:state.savedCollapse});
  const currentPositions=()=>state.placements[state.profile]||{};
  const togglePanel=(id,collapse)=>{
    const p=el(id),b=el(PANEL_CONTROLS[id]);if(!p||!b||!paneVisible(p)||p.classList.contains('collapsed')===collapse)return;
    b.click();
  };
  const snapshotPanels=()=>Object.fromEntries(Object.keys(PANEL_CONTROLS).map(id=>[id,!!el(id)?.classList.contains('collapsed')]));
  function collapseAll(){
    if(state.globalCollapsed){
      const snapshot=state.snapshot||{};
      state.globalCollapsed=false;state.snapshot=null;
      for(const [id,value] of Object.entries(snapshot))togglePanel(id,value);
    }else{
      state.snapshot=snapshotPanels();state.globalCollapsed=true;
      for(const id of Object.keys(PANEL_CONTROLS))togglePanel(id,true);
    }
    updateControls();
  }
  let applyingPreset=false;
  function applyPreset(name){
    const definition=GROUPS[name];if(!definition)return;
    applyingPreset=true;
    try{
      const saved=state.savedVisibility[name];
      for(const key of Object.keys(getVisibility())){
        if(key==='gate')continue; // Portais contextuais não devem desaparecer durante combate.
        setVisibility(key,saved&&typeof saved[key]==='boolean'?saved[key]:definition.visible.includes(key));
      }
      const expanded=state.savedCollapse[name];
      if(expanded&&!state.globalCollapsed)for(const [id,collapsed] of Object.entries(expanded))togglePanel(id,collapsed);
    }finally{applyingPreset=false;}
  }
  function coords(p){
    const rect=p.getBoundingClientRect();
    return {x:clamp(rect.left/Math.max(1,innerWidth),0,1),y:clamp(rect.top/Math.max(1,innerHeight),0,1)};
  }
  function clearPlacement(p){
    p.classList.remove('stellar-user-placed');
    for(const k of ['position','top','left','right','bottom','transform','margin','z-index'])p.style.removeProperty(k);
  }
  function positionPanel(p,where){
    const rect=p.getBoundingClientRect(),res=safePosition(where,rect.width,rect.height,innerWidth,innerHeight);
    if(!res)return;
    p.classList.add('stellar-user-placed');
    for(const [k,v] of Object.entries({position:'fixed',left:`${Math.round(res.left)}px`,top:`${Math.round(res.top)}px`,right:'auto',bottom:'auto',transform:'none',margin:'0', 'z-index':'29'}))p.style.setProperty(k,v,'important');
  }
  function applyPlacements(){
    const positions=currentPositions();
    for(const id of Object.keys(PANEL_CONTROLS)){
      const p=el(id);if(!p)continue;
      if((state.positionsEnabled||state.editing)&&positions[id])positionPanel(p,positions[id]);
      else if(!state.editing)clearPlacement(p);
    }
  }
  function profileChange(next,{apply=true}={}){
    if(!GROUPS[next])return;
    if(state.editing)endEdit();
    if(state.profile!==next&&!applyingPreset){
      state.savedVisibility[state.profile]={...getVisibility()};
      state.savedCollapse[state.profile]=snapshotPanels();
    }
    state.profile=next;
    if(apply)applyPreset(next);
    applyPlacements();
    persist();updateControls();
  }
  function updateControls(){
    const selector=el('hudProfileSelect');if(selector)selector.value=state.profile;
    const auto=el('hudAutoProfile');if(auto)auto.checked=state.autoProfile;
    const quiet=el('hudQuietMode');if(quiet)quiet.checked=state.quiet;
    const custom=el('hudCustomPositions');if(custom)custom.checked=state.positionsEnabled;
    button.textContent=state.globalCollapsed?'▣ RESTAURAR HUD':'▤ HUD −';
    button.setAttribute('aria-pressed',String(state.globalCollapsed));
    editor.classList.toggle('hidden',!state.editing);
    document.body.classList.toggle('stellar-edit-hud',state.editing);
    el('hudStartEdit')?.setAttribute('aria-pressed',String(state.editing));
  }
  const handles=new Map();
  for(const [id] of Object.entries(PANEL_CONTROLS)){
    const p=el(id);if(!p)continue;
    const handle=document.createElement('span');handle.className='stellar-hud-drag-handle';handle.setAttribute('role','button');handle.tabIndex=0;handle.textContent='⠿';handle.title=`Arrastar ${id}`;
    handle.setAttribute('aria-label',`Reposicionar ${id}`);
    handle.style.display='none'; // A classe de edição substitui esta prioridade.
    p.appendChild(handle);handles.set(id,handle);
    handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
    handle.addEventListener('keydown',e=>{
      if(!state.editing||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      const rect=p.getBoundingClientRect(),dx=e.key==='ArrowRight'?8:e.key==='ArrowLeft'?-8:0,dy=e.key==='ArrowDown'?8:e.key==='ArrowUp'?-8:0;
      positionPanel(p,{x:(rect.left+dx)/innerWidth,y:(rect.top+dy)/innerHeight});
      const next=state.placements[state.profile]||{};next[id]=coords(p);state.placements[state.profile]=next;persist();
    });
    handle.addEventListener('pointerdown',e=>{
      if(!state.editing)return;
      e.preventDefault();e.stopPropagation();
      const r=p.getBoundingClientRect();let startX=e.clientX,startY=e.clientY,left=r.left,top=r.top;
      handle.setPointerCapture(e.pointerId);
      const move=event=>{
        if(event.pointerId!==e.pointerId)return;
        event.preventDefault();event.stopPropagation();
        const candidate={x:(left+event.clientX-startX)/innerWidth,y:(top+event.clientY-startY)/innerHeight};
        positionPanel(p,candidate);
      };
      const end=event=>{
        if(event.pointerId!==e.pointerId)return;
        handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);
        if(event.type==='pointerup'){
          const rect=p.getBoundingClientRect();
          const x=Math.round(rect.left/8)*8,y=Math.round(rect.top/8)*8;
          const coord={x:x/innerWidth,y:y/innerHeight};
          positionPanel(p,coord);
          const next=state.placements[state.profile]||{};
          next[id]=coords(p);state.placements[state.profile]=next;persist();
        }
      };
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    });
  }
  let editingSnapshot=null;
  function startEdit(){
    if(state.editing)return;
    const config=el('configModal');config?.classList.add('hidden');
    if(state.globalCollapsed)collapseAll();
    editingSnapshot=snapshotPanels();
    state.editing=true;
    for(const id of Object.keys(PANEL_CONTROLS))togglePanel(id,true);
    const next={...currentPositions()};
    for(const id of Object.keys(PANEL_CONTROLS)){
      const p=el(id);if(p&&paneVisible(p)&&!next[id])next[id]=coords(p);
    }
    state.placements[state.profile]=next;
    applyPlacements();
    updateControls();
  }
  function endEdit(){
    if(!state.editing)return;
    state.editing=false;
    state.positionsEnabled=true;
    for(const [id,value] of Object.entries(editingSnapshot||{}))togglePanel(id,value);
    editingSnapshot=null;
    applyPlacements();persist();updateControls();
  }
  function resetPositions(){
    delete state.placements[state.profile];
    state.positionsEnabled=false;
    applyPlacements();persist();updateControls();
  }
  button.addEventListener('click',collapseAll);
  el('hudSettingsGrid')?.addEventListener('change',e=>{
    if(applyingPreset||!e.target?.matches?.('[data-hud-key]'))return;
    // Handler do jogo atualiza hudVisibility no mesmo evento; persistir após a propagação.
    queueMicrotask(()=>{state.savedVisibility[state.profile]={...getVisibility()};persist();});
  });
  for(const [id,toggleId] of Object.entries(PANEL_CONTROLS)){
    el(toggleId)?.addEventListener('click',()=>{
      if(applyingPreset||state.globalCollapsed||state.editing)return;
      queueMicrotask(()=>{state.savedCollapse[state.profile]=snapshotPanels();persist();});
    });
  }
  el('hudProfileSelect')?.addEventListener('change',e=>profileChange(e.target.value));
  el('hudAutoProfile')?.addEventListener('change',e=>{state.autoProfile=bool(e.target.checked);persist();if(state.autoProfile)profileChange(profileForMap(getMap()));updateControls();});
  el('hudQuietMode')?.addEventListener('change',e=>{state.quiet=bool(e.target.checked);persist();syncContext(true);});
  el('hudCustomPositions')?.addEventListener('change',e=>{state.positionsEnabled=bool(e.target.checked);applyPlacements();persist();});
  el('hudStartEdit')?.addEventListener('click',startEdit);
  el('hudFinishEdit')?.addEventListener('click',endEdit);
  el('hudResetPositions')?.addEventListener('click',resetPositions);
  el('hudResetAll')?.addEventListener('click',()=>{
    if(state.editing)endEdit();
    state.positionsEnabled=false;state.quiet=false;state.autoProfile=false;state.profile='pve';state.placements={};state.savedVisibility={};state.savedCollapse={};
    for(const key of Object.keys(getVisibility()))setVisibility(key,true);
    applyPlacements();persist();syncContext(true);updateControls();
  });
  let lastMap='',lastCombat=0;
  function syncContext(force=false){
    const map=getMap()||'';
    if(state.autoProfile&&map&&(map!==lastMap||force)&&!state.editing)profileChange(profileForMap(map));
    lastMap=map;
    const combat=bool(inCombat());if(combat)lastCombat=Date.now();
    const quieter=state.quiet&&!state.editing&&!combat&&Date.now()-lastCombat>4500;
    document.body.classList.toggle('stellar-hud-quiet',quieter);
  }
  // Modal phase: disclosure buttons inside actual content sections, without moving their children
  // (important for event delegation and live-rendered Hangar/Clã/ADM).
  function foldId(modal,element,i){return `${modal}:${element.id||element.dataset.stellarFoldId||i}`;}
  const foldObservers=[];
  function setupModal(modalId){
    const root=el(modalId);if(!root)return;
    const content=modalId==='adminModal'?root.querySelector('.modal-card'):root;
    if(!content)return;
    const parentModal=root.closest('.modal')||root;
    const modalName=parentModal.id||modalId;
    const toolbar=document.createElement('div');toolbar.className='stellar-modal-fold-tools';
    const all=document.createElement('button');all.type='button';all.textContent='RECOLHER SEÇÕES';
    toolbar.appendChild(all);
    if(modalId==='adminModal'){
      const head=content.querySelector('.modal-header');head?.insertAdjacentElement('afterend',toolbar);
    }else root.insertAdjacentElement('beforebegin',toolbar);
    const targets=()=>{
      let list=[...content.children].filter(node=>node instanceof HTMLElement && (
        node.tagName==='SECTION'||node.classList.contains('section-box')||node.classList.contains('settings-section')||node.classList.contains('hangar-column')||node.classList.contains('account-card')));
      if(modalId==='adminModal')list=list.filter(n=>n!==toolbar && !n.classList.contains('admin-kpis'));
      if(!list.length&&modalId!=='adminModal'){
        list=[...content.querySelectorAll(':scope > .hangar-layout > .hangar-column,:scope > .section-box,:scope > .pet-hero,:scope > .mission-group')];
      }
      if(!list.length&&content instanceof HTMLElement)list=[content];
      return list;
    };
    let guard=false;
    function decorate(){
      if(guard)return;guard=true;
      try{
        targets().forEach((section,i)=>{
          if(section.querySelector(':scope > .stellar-fold-toggle'))return;
          const key=foldId(modalName,section,i);
          const title=section.querySelector(':scope > h2,:scope > h3,:scope > .panel-title,:scope > .settings-title b,:scope > .eyebrow')?.textContent?.trim()?.slice(0,42)||section.getAttribute('aria-label')||({missionContent:'MISSÕES',hangarContent:'HANGAR',clanContent:'CLÃ',passContent:'PASSE',petContent:'AUX-9',adminModal:'ADMINISTRAÇÃO'}[modalId]||'CONTEÚDO');
          const btn=document.createElement('button');btn.type='button';btn.className='stellar-fold-toggle';btn.textContent=`▾ ${title}`;
          btn.setAttribute('aria-expanded','true');section.classList.add('stellar-fold-ready');section.insertBefore(btn,section.firstChild);
          const setFold=collapsed=>{section.classList.toggle('stellar-fold-closed',collapsed);btn.textContent=`${collapsed?'▸':'▾'} ${title}`;btn.setAttribute('aria-expanded',String(!collapsed));};
          setFold(!!state.folded[key]);
          btn.addEventListener('click',()=>{state.folded[key]=!section.classList.contains('stellar-fold-closed');setFold(state.folded[key]);persist();});
        });
      }finally{guard=false;}
    }
    all.addEventListener('click',()=>{
      decorate();const sections=targets(),closing=sections.some(n=>!n.classList.contains('stellar-fold-closed'));
      sections.forEach((section,i)=>{
        const key=foldId(modalName,section,i);state.folded[key]=closing;
        section.classList.toggle('stellar-fold-closed',closing);
        const btn=section.querySelector(':scope > .stellar-fold-toggle');if(btn){const label=btn.textContent.slice(2);btn.textContent=`${closing?'▸':'▾'} ${label}`;btn.setAttribute('aria-expanded',String(!closing));}
      });
      all.textContent=closing?'EXPANDIR SEÇÕES':'RECOLHER SEÇÕES';persist();
    });
    decorate();
    const obs=new MutationObserver(()=>{if(!guard)decorate();});
    obs.observe(content,{childList:true});foldObservers.push(obs);
  }
  MODAL_CONTENT.forEach(setupModal);
  const timer=setInterval(()=>{if(document.visibilityState!=='hidden')syncContext();},900);
  const resized=()=>{if(state.positionsEnabled&&!state.editing)applyPlacements();};
  window.addEventListener('resize',resized);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.editing){endEdit();e.preventDefault();e.stopImmediatePropagation();}},true);
  updateControls();if(state.positionsEnabled)applyPlacements();syncContext(true);
  return {collapseAll,profileChange,startEdit,endEdit,resetPositions,getState:()=>({...state}),destroy(){clearInterval(timer);window.removeEventListener('resize',resized);foldObservers.forEach(o=>o.disconnect());}};
}
