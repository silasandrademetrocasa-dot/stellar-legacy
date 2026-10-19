// V32.1.8 • Landscape-first is a presentation preference, not a forced browser lock.
// No render-loop, authentication, save or gameplay dependencies.
export function isMobileLandscape(width,height,mobile){
  return !!mobile && Number(width)>Number(height) && Number(height)<=650;
}

export function setupMobileLandscape({win=window,doc=document,mobile=false,onLayoutChange=()=>{}}={}){
  const hint=doc.getElementById('mobileLandscapeHint');
  const rotate=doc.getElementById('mobileLandscapeLaunch');
  const close=doc.getElementById('mobileLandscapeDismiss');
  if(!doc.body||!hint||!rotate||!close)return ()=>{};
  let dismissed=false,disposed=false;
  const sync=()=>{
    if(disposed)return;
    const landscape=isMobileLandscape(win.innerWidth,win.innerHeight,mobile);
    doc.body.classList.toggle('mobile-landscape-pro',landscape);
    const show=!!mobile && !landscape && !dismissed && win.innerWidth<=650;
    hint.classList.toggle('hidden',!show);
    hint.setAttribute('aria-hidden',String(!show));
    try{win.requestAnimationFrame(()=>{if(!disposed)onLayoutChange();});}catch{}
  };
  const dismiss=()=>{dismissed=true;sync();};
  const launch=async()=>{
    // screen.orientation.lock() generally requires a user gesture and fullscreen.
    // Browser may deny either: provide manual rotation instead of crashing boot.
    const root=doc.documentElement;
    try{
      if(root?.requestFullscreen&&!doc.fullscreenElement)await root.requestFullscreen();
      if(win.screen?.orientation?.lock)await win.screen.orientation.lock('landscape');
    }catch{
      const status=hint.querySelector('[data-landscape-status]');
      if(status)status.textContent='Gire o celular manualmente se o navegador não permitir.';
    }
    sync();
  };
  close.addEventListener('click',dismiss);
  rotate.addEventListener('click',launch);
  win.addEventListener('resize',sync,{passive:true});
  win.addEventListener('orientationchange',sync,{passive:true});
  sync();
  return ()=>{disposed=true;win.removeEventListener('resize',sync);win.removeEventListener('orientationchange',sync);close.removeEventListener('click',dismiss);rotate.removeEventListener('click',launch);};
}
