// V65: compatibilidade de IDs e saves; sem dependência de renderização 3D.
export const ALLOWED_SHIPS_V50 = Object.freeze({
  phoenix:'Aurora',leonov:'Lynx',liberator:'Pioneer',piranha:'Raptor',vengeance:'Valkyrie',
  bigboy:'Bastion',goliath:'Leviathan',citadel:'Bulwark',aegis:'Seraph',
  spearhead:'Pathfinder',defcom:'Phantom',yamato:'Kensei',nostromo:'Meridian'
});
const ALLOWED = new Set(Object.keys(ALLOWED_SHIPS_V50));
export const isShipAllowedV50 = id=>ALLOWED.has(String(id||''));
export function ensureAllowedShipSaveV50(save){
  if(!save||typeof save!=='object')return false;
  if(isShipAllowedV50(save.activeShipId))return false;
  // Ownership, inventory, loadout, configuration builds and previous ship IDs are preserved.
  // The game's own normalizeLoadout() returns equipment exceeding Aurora slots to inventory.
  save.activeShipId='phoenix';
  if(!Array.isArray(save.ownedShips))save.ownedShips=[];
  if(!save.ownedShips.includes('phoenix'))save.ownedShips.push('phoenix');
  if(save.repairRequired && typeof save.repairRequired==='object')save.repairRequired.shipId='phoenix';
  return true;
}

