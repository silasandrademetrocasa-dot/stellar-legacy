// STELLAR LEGACY • V48.1 — navegação e progressão inicial. Somente interface: não altera saves/economia.
export const UNIVERSE_MIN_LEVEL_V481 = 10;
export const NAV_LEVELS_V481 = Object.freeze({pilot:1,missions:1,research:6,clan:8,universe:10,warfront:15});
export function mayOpenUniverseV481(level,isAdmin=false){
  return isAdmin === true || (Number.isFinite(Number(level)) && Number(level)>=UNIVERSE_MIN_LEVEL_V481);
}
export function navigationUnlockV481(level,minLevel,isAdmin=false){
  return isAdmin === true || (Number.isFinite(Number(level)) && Number(level)>=minLevel);
}
export const TOPBAR_ORDER_V481 = Object.freeze(['pilot','missions','battle','map','more']);

function initializeNavigationV481(){
  if(document.documentElement.dataset.stellarNavV481==='active')return;
  const header=document.getElementById('topbar');
  const nav=header?.querySelector(':scope > .top-actions');
  const pilotMenu=nav?.querySelector('[data-menu-group="pilot"] > .menu-dropdown');
  const mapBtn=document.getElementById('mapBtn');
  if(!header||!nav||!pilotMenu||!mapBtn)return;
  document.documentElement.dataset.stellarNavV481='active';
  document.body.classList.add('stellar-nav-v481');

  // Não movemos os elementos originais de DOM. O runtime usa CSS order e mantém listeners antigos.
  const autopilotEntry=document.createElement('button');
  autopilotEntry.type='button';autopilotEntry.className='menu-item v481-autopilot-entry';
  autopilotEntry.id='v481AutopilotEntry';autopilotEntry.textContent='🤖 AUTOPILOT';autopilotEntry.hidden=true;
  pilotMenu.append(autopilotEntry);

  const more=document.createElement('div');
  more.className='menu-group menu-group-right v481-more-group';
  more.dataset.menuGroup='more';more.id='v481MoreGroup';
  more.innerHTML=`
    <button class="small-btn menu-group-toggle v481-more-toggle" type="button" data-menu-toggle="more" aria-expanded="false">MAIS <span aria-hidden="true">▾</span></button>
    <div class="menu-dropdown menu-dropdown-right v481-more-dropdown">
      <div class="v481-menu-label">ECONOMIA</div>
      <button class="menu-item" type="button" data-v481-action="shop">LOJA</button>
      <button class="menu-item" type="button" data-v481-action="premium">LOJA PREMIUM</button>
      <button class="menu-item" type="button" data-v481-action="auction">LEILÃO</button>
      <div class="v481-menu-label">SOCIAL E EXPLORAÇÃO</div>
      <button class="menu-item" type="button" data-v481-action="clan">CLÃ <span data-v481-gate="clan"></span></button>
      <button class="menu-item" type="button" data-v481-action="universe">✦ UNIVERSO <span data-v481-gate="universe"></span></button>
      <details class="v481-interface-menu">
        <summary>INTERFACE / HUD</summary>
        <div class="v481-interface-actions">
          <button class="menu-item" type="button" data-v481-action="hud">▤ RECOLHER / EXPANDIR HUD</button>
          <button class="menu-item" type="button" data-v481-action="compact">▣ MODO COMPACTO</button>
        </div>
      </details>
      <button class="menu-item" type="button" data-v481-action="config">CONFIGURAÇÕES</button>
      <button class="menu-item v481-admin-entry" type="button" data-v481-action="admin" hidden>ADMINISTRAÇÃO</button>
    </div>`;
  mapBtn.after(more);
  const botStop=document.createElement('button');
  botStop.type='button';botStop.id='v481BotStop';botStop.className='small-btn v481-bot-stop';
  botStop.textContent='🤖 ON';botStop.title='Parar Autopilot agora';botStop.setAttribute('aria-label','Parar Autopilot');botStop.hidden=true;
  more.after(botStop);
  const moreToggle=more.querySelector('[data-menu-toggle="more"]');
  moreToggle.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    const opening=!more.classList.contains('open');
    document.querySelectorAll('.menu-group.open').forEach(g=>g.classList.remove('open'));
    more.classList.toggle('open',opening);moreToggle.setAttribute('aria-expanded',String(opening));
    if(opening)refreshNavigation();
  });
  document.addEventListener('pointerdown',event=>{
    if(!more.contains(event.target)){more.classList.remove('open');moreToggle.setAttribute('aria-expanded','false');}
  });

  const originals={shop:'shopBtn',premium:'premiumBtn',auction:'auctionBtn',clan:'clanBtn',universe:'frontierExpansionBtnV42',hud:'hudIntelligenceQuick',compact:'mobileCombatModeBtn',config:'configBtn',admin:'adminBtn'};
  let lastNoticeTimer;
  const notify=(text)=>{
    let toast=document.getElementById('v481NavigationNotice');
    if(!toast){toast=document.createElement('div');toast.id='v481NavigationNotice';toast.role='status';document.body.append(toast);}
    toast.textContent=text;toast.classList.add('show');clearTimeout(lastNoticeTimer);
    lastNoticeTimer=setTimeout(()=>toast.classList.remove('show'),2600);
  };
  const getLevel=()=>{
    const raw=(document.getElementById('lvl')?.textContent||'').replace(/\./g,'');
    const num=Number.parseInt(raw,10);return Number.isFinite(num)&&num>=1?num:null;
  };
  const adminAllowed=()=>{
    const button=document.getElementById('adminBtn');
    return !!button&&!button.classList.contains('hidden')&&!button.classList.contains('runtime-module-hidden')&&button.getAttribute('aria-disabled')!=='true';
  };
  function refreshNavigation(){
    const lvl=getLevel();const admin=adminAllowed();
    const clan=more.querySelector('[data-v481-gate="clan"]');
    const universe=more.querySelector('[data-v481-gate="universe"]');
    const clanReady=navigationUnlockV481(lvl,NAV_LEVELS_V481.clan);
    const universeReady=mayOpenUniverseV481(lvl,admin);
    clan.textContent=clanReady?'':'LV8';if(universe)universe.textContent=universeReady?'':'LV10';
    for(const [action,ready] of [['clan',clanReady],['universe',universeReady]]){
      const button=more.querySelector(`[data-v481-action="${action}"]`);
      if(!button)continue; // Painel opcional: evitar falha caso não esteja montado.
      button.classList.toggle('v481-locked',!ready);
      button.setAttribute('aria-disabled',String(!ready));
      button.title=ready?'':`Libera no nível ${action==='clan'?8:10}`;
    }
    more.querySelector('.v481-admin-entry').hidden=!admin;
    const fab=document.getElementById('autopilotFabV48');
    const granted=!!fab&&!fab.hidden;
    autopilotEntry.hidden=!granted;
    const running=granted&&/AUTO\s*•\s*ON/.test(fab.textContent||'');
    botStop.hidden=!running;
    // O status no menu principal é curto para não roubar área de combate no celular.
    autopilotEntry.textContent=running?'🤖 AUTOPILOT • ATIVO':'🤖 AUTOPILOT';
  }
  more.addEventListener('click',event=>{
    const button=event.target.closest('[data-v481-action]');if(!button)return;
    const action=button.dataset.v481Action;
    const lvl=getLevel();const admin=adminAllowed();
    if(action==='universe'&&!mayOpenUniverseV481(lvl,admin)){
      notify(`UNIVERSO libera no nível ${UNIVERSE_MIN_LEVEL_V481}`);return;
    }
    if(action==='clan'&&!navigationUnlockV481(lvl,NAV_LEVELS_V481.clan)){
      notify('CLÃ libera no nível 8');return;
    }
    const original=document.getElementById(originals[action]);
    if(!original||original.disabled){notify('Esta função está temporariamente indisponível.');return;}
    more.classList.remove('open');moreToggle.setAttribute('aria-expanded','false');
    original.click();
    refreshNavigation();
  });
  autopilotEntry.addEventListener('click',()=>{
    const fab=document.getElementById('autopilotFabV48');
    if(!fab||fab.hidden)return;
    fab.click();document.querySelectorAll('.menu-group.open').forEach(g=>g.classList.remove('open'));
  });
  botStop.addEventListener('click',()=>{
    const stop=document.querySelector('#autopilotPanelV48 [data-ap-stop]');
    if(stop){stop.click();refreshNavigation();}
    else notify('Autopilot indisponível para parar.');
  });
  // Bloqueia a abertura pelo próprio botão original antes do listener do módulo Universo V42.
  document.getElementById('frontierExpansionBtnV42')?.addEventListener('click',event=>{
    if(mayOpenUniverseV481(getLevel(),adminAllowed()))return;
    event.preventDefault();event.stopImmediatePropagation();notify('UNIVERSO libera no nível 10');
  },true);

  // Atualiza permissões e status usando o estado real do jogo, sem gravar nada no save.
  const pilot=document.getElementById('pilotBtn');
  const adminBtn=document.getElementById('adminBtn');
  if(adminBtn)new MutationObserver(refreshNavigation).observe(adminBtn,{attributes:true,attributeFilter:['class','aria-disabled']});
  if(pilot)pilot.title=pilot.title||'Habilidades de piloto • nível 6';
  const levelEl=document.getElementById('lvl');
  if(levelEl)new MutationObserver(refreshNavigation).observe(levelEl,{childList:true,characterData:true,subtree:true});
  new MutationObserver(mutations=>{
    for(const m of mutations){
      if(m.addedNodes.length && document.getElementById('autopilotFabV48')){attachBotObserver();refreshNavigation();break;}
    }
  }).observe(document.body,{childList:true});
  let botObserved=null;
  function attachBotObserver(){
    const fab=document.getElementById('autopilotFabV48');
    if(!fab||fab===botObserved)return;
    botObserved=fab;
    new MutationObserver(refreshNavigation).observe(fab,{attributes:true,attributeFilter:['hidden'],childList:true,characterData:true,subtree:true});
  }
  attachBotObserver();refreshNavigation();
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeNavigationV481,{once:true});
  else initializeNavigationV481();
}
