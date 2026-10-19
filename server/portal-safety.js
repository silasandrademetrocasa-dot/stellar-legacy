// V33 — mesma regra defensiva no servidor e no navegador:
// portais de/para PvP não criam uma zona de invulnerabilidade.
export const PORTAL_NEUTRAL_RADIUS = 240;
export function portalGrantsNpcProtection(portal,{mapId='',battle=false}={}){
  if(!portal || battle || /^b4[123]$/.test(String(mapId)))return false;
  const to=String(portal.to||'').toLowerCase();
  if(portal.battle===true || /^b4[123]$/.test(to) || to.includes('battle'))return false;
  const dest=String(portal.targetLabel||'');
  if(/^4-[123]$/.test(dest))return false;
  return Number.isFinite(Number(portal.x))&&Number.isFinite(Number(portal.y));
}
export function playerInNeutralPortalRange(player,portals,options={}){
  if(!player || !Number.isFinite(Number(player.x)) || !Number.isFinite(Number(player.y)))return false;
  return (Array.isArray(portals)?portals:[]).some(portal=>
    portalGrantsNpcProtection(portal,options) &&
    (Number(player.x)-Number(portal.x))**2+(Number(player.y)-Number(portal.y))**2<=PORTAL_NEUTRAL_RADIUS**2);
}
