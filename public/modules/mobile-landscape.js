// V92 • Configurações controla orientação. Nunca pede fullscreen no login.
export function isMobileLandscape(width,height,mobile){
  return !!mobile&&Number(width)>Number(height)&&Number(height)<=650;
}
export async function requestGameOrientation({win=window,doc=document,landscape=true}={}){
  // API nativa: Android WebView não garante suporte ao Screen Orientation Lock.
  if(typeof win.StellarAndroid?.setLandscape==='function'){
    win.StellarAndroid.setLandscape(!!landscape);
    return {ok:true,native:true};
  }
  try{
    if(landscape){
      if(doc.documentElement?.requestFullscreen&&!doc.fullscreenElement)await doc.documentElement.requestFullscreen();
      if(win.screen?.orientation?.lock)await win.screen.orientation.lock('landscape');
      else throw Error('Bloqueio de orientação indisponível');
    }else{
      win.screen?.orientation?.unlock?.();
      if(doc.exitFullscreen&&doc.fullscreenElement)await doc.exitFullscreen();
    }
    return {ok:true,native:false};
  }catch{return {ok:false,native:false};}
}
export function setupMobileLandscape({win=window,doc=document,mobile=false,onLayoutChange=()=>{}}={}){
  if(!doc.body)return ()=>{};
  let disposed=false;
  const status=doc.getElementById('landscapeStatusV92');
  const sync=()=>{
    if(disposed)return;
    const landscape=isMobileLandscape(win.innerWidth,win.innerHeight,mobile);
    doc.body.classList.toggle('mobile-landscape-pro',landscape);
    if(status)status.textContent=landscape?'HORIZONTAL ATIVA':mobile?'VERTICAL • ajuste opcional':'DISPOSITIVO DESKTOP';
    try{win.requestAnimationFrame(()=>{if(!disposed)onLayoutChange();});}catch{}
  };
  async function launch(landscape){
    const result=await requestGameOrientation({win,doc,landscape});
    if(status&&!result.ok)status.textContent='Gire o aparelho manualmente; o navegador bloqueou a orientação.';
    sync();
  }
  const enable=doc.getElementById('landscapeEnableV92'),disable=doc.getElementById('landscapeDisableV92');
  const onEnable=()=>launch(true),onDisable=()=>launch(false);
  enable?.addEventListener('click',onEnable);disable?.addEventListener('click',onDisable);
  win.addEventListener('resize',sync,{passive:true});
  win.addEventListener('orientationchange',sync,{passive:true});
  // A antiga tela de boas-vindas não deve interferir em login ou APK.
  const old=doc.getElementById('mobileLandscapeHint');if(old)old.hidden=true;
  sync();
  return ()=>{disposed=true;enable?.removeEventListener('click',onEnable);disable?.removeEventListener('click',onDisable);win.removeEventListener('resize',sync);win.removeEventListener('orientationchange',sync);};
}
