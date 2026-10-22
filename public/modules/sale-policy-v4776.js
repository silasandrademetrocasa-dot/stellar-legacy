// V47.7.6 — single authoritative resale rule, also used for the Hangar preview.
// A purchase in STL is NEVER refunded in STL. Its nominal price becomes CR,
// while purchases in CR refund 50% in CR. Never trust client-provided prices.
export function saleQuoteV4776(row){
  if(!row || row.enabled === false || !Number.isSafeInteger(Number(row.price)) || Number(row.price) <= 0)
    return {unit:0,currency:'credits',available:false,elite:false};
  const price=Math.floor(Number(row.price));
  const elite=String(row.currency||'credits')==='uridium';
  return {unit:elite?price:Math.max(1,Math.floor(price/2)),currency:'credits',available:true,elite};
}

/* Target HUD / AUX-9 display-only hotfix — does not change combat or resale rules.
   This module is already imported by game.js, so the existing ZIP installer can
   apply the fix without replacing the 1.1 MB game logic or editing index.html. */
if(typeof document!=='undefined' && !document.getElementById('stellar-target-aux-hotfix-20261022')){
  const patch=document.createElement('style');
  patch.id='stellar-target-aux-hotfix-20261022';
  patch.textContent=`
/* Target lock compactado: exibir somente a setinha. */
#rightHudStack > #targetLockHud.collapsed,
body.mobile-landscape-pro #rightHudStack > #targetLockHud.collapsed {
  box-sizing:border-box!important;position:relative!important;align-self:flex-end!important;
  flex:0 0 40px!important;width:40px!important;min-width:40px!important;max-width:40px!important;
  height:40px!important;min-height:40px!important;max-height:40px!important;
  padding:0!important;margin:0!important;overflow:hidden!important;
  pointer-events:auto!important;
}
#rightHudStack > #targetLockHud.collapsed .target-lock-head,
#rightHudStack > #targetLockHud.collapsed .target-lock-head-actions{
  box-sizing:border-box!important;display:flex!important;align-items:center!important;
  justify-content:center!important;flex:0 0 40px!important;
  width:40px!important;min-width:40px!important;max-width:40px!important;
  height:40px!important;min-height:40px!important;max-height:40px!important;
  padding:0!important;margin:0!important;gap:0!important;border:0!important;
}
#rightHudStack > #targetLockHud.collapsed #targetLockToggle{
  display:grid!important;place-items:center!important;flex:0 0 40px!important;
  width:40px!important;min-width:40px!important;max-width:40px!important;
  height:40px!important;min-height:40px!important;max-height:40px!important;
  margin:0!important;padding:0!important;border:0!important;
  background:transparent!important;transform:none!important;
  font-size:18px!important;line-height:1!important;
  cursor:pointer!important;pointer-events:auto!important;touch-action:manipulation;
}
#rightHudStack > #targetLockHud.collapsed .target-lock-head>span:first-child,
#rightHudStack > #targetLockHud.collapsed .target-lock-head-actions>b,
#rightHudStack > #targetLockHud.collapsed .target-lock-main,
#rightHudStack > #targetLockHud.collapsed .target-lock-detail,
#rightHudStack > #targetLockHud.collapsed .target-lock-portrait-wrap,
#rightHudStack > #targetLockHud.collapsed .target-lock-name,
#rightHudStack > #targetLockHud.collapsed #nextNpcTargetV32{
  display:none!important;
}
/* Aberto: remover max-width 180px / max-height 70px impostos pelos layouts antigos. */
#rightHudStack > #targetLockHud:not(.collapsed):not(.hidden){
  box-sizing:border-box!important;position:relative!important;align-self:flex-end!important;
  flex:0 0 auto!important;width:min(255px,calc(100vw - 18px))!important;
  min-width:0!important;max-width:min(255px,calc(100vw - 18px))!important;
  height:auto!important;min-height:0!important;max-height:calc(100dvh - 68px)!important;
  padding:9px 10px!important;overflow-x:hidden!important;overflow-y:auto!important;
  font-size:11px!important;line-height:1.35!important;pointer-events:auto!important;
}
#rightHudStack > #targetLockHud:not(.collapsed) .target-lock-head{
  display:flex!important;align-items:center!important;justify-content:space-between!important;
  width:100%!important;min-height:28px!important;gap:5px!important;
}
#rightHudStack > #targetLockHud:not(.collapsed) .target-lock-main{
  display:grid!important;grid-template-columns:44px minmax(0,1fr)!important;
  align-items:center!important;gap:8px!important;
  height:auto!important;max-height:none!important;overflow:visible!important;
}
#rightHudStack > #targetLockHud:not(.collapsed) .target-lock-portrait-wrap{
  display:flex!important;
}
#rightHudStack > #targetLockHud:not(.collapsed) .target-lock-detail{
  display:block!important;max-height:none!important;overflow:visible!important;
  font-size:11px!important;line-height:1.35!important;
}
#rightHudStack > #targetLockHud:not(.collapsed) .target-lock-name{
  display:block!important;font-size:12px!important;line-height:1.3!important;
  white-space:normal!important;overflow-wrap:anywhere!important;
}
#rightHudStack > #targetLockHud:not(.collapsed) #targetLockToggle{
  pointer-events:auto!important;touch-action:manipulation!important;
}
body.mobile-landscape-pro #rightHudStack > #targetLockHud:not(.collapsed):not(.hidden){
  width:min(255px,44vw)!important;max-width:min(255px,44vw)!important;
  max-height:calc(100dvh - 54px)!important;
}
/* A arte nova substitui somente a apresentação estática no Hangar. Os sprites
   animados de combate, designers equipados e seus bônus continuam intactos. */
.pet-hero .pet-avatar img,
.pet-hangar-panel .pet-avatar img{
  content:url('/assets/v4777/aux9-new.webp?v=20261022')!important;
  width:100%!important;height:100%!important;object-fit:contain!important;
  filter:drop-shadow(0 0 8px rgba(64,203,255,.34))!important;
}
  `;
  (document.head||document.documentElement).appendChild(patch);
}
