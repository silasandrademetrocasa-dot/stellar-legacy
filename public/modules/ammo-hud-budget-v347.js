// Visual-only work budget for ammunition panel. Never delays damage, firing, or inventory state.
export function createAmmoHudBudget({mobileIntervalMs=580,desktopIntervalMs=320}={}) {
  let lastPaint=-Infinity, dirty=true;
  return {
    shouldPaint({visible=true,mobile=false,now=0,force=false}={}) {
      if (!visible) {dirty=true; return false;}
      if (!force && !dirty && now-lastPaint < (mobile?mobileIntervalMs:desktopIntervalMs)) return false;
      lastPaint=now;dirty=false;return true;
    },
    invalidate() {dirty=true;},
    reset() {lastPaint=-Infinity;dirty=true;}
  };
}
// A per-button signature: unchanged ammo never rewrites the corresponding DOM/tooltip.
export function ammoDisplaySignature(qty,selected,laserCount=0,auxCount=0) {
  return `${Math.max(0,Math.floor(Number(qty)||0))}|${selected?'1':'0'}|${laserCount}|${auxCount}`;
}
