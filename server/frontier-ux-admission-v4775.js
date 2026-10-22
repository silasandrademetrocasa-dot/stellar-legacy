// V47.7.5 - Authenticated frontier room routing.
// U-1/U-2/U-3 are neutral SQL sectors, but their multiplayer room must still
// be partitioned by the AUTHENTICATED pilot faction (never user input 'battle').
// No changes to territorial X-1..X-8 access or PvP room security.
const FACTIONS=new Set(['earth','mars','jupiter']);
const U=/^u[1-3]$/;
const X=/^x[1-8]$/;
export function frontierRoomTerritoryV4775(mapId,authenticatedFaction,requestedTerritory,admin=false){
  const map=String(mapId||''),faction=String(authenticatedFaction||''),requested=String(requestedTerritory||'');
  if(!FACTIONS.has(faction))return null;
  if(U.test(map))return faction; // SQL sector neutral; private per authenticated faction.
  if(X.test(map))return admin===true&&FACTIONS.has(requested)?requested:faction;
  return null; // b41/b42/b43 use their existing shared public rooms.
}
export function frontierWrongFactionV4775(mapId,authenticatedFaction,requestedTerritory,admin=false){
  const map=String(mapId||'');
  if(admin===true||!X.test(map))return false; // Neutral U has no foreign owner.
  return String(requestedTerritory||authenticatedFaction||'')!==String(authenticatedFaction||'');
}
export function frontierEntryDenialV4775({dest,validTerritory,sectorValid,wrongFaction,admin,level,required,faction}={}){
  if(wrongFaction)return 'INVASÕES BLOQUEADAS';
  if(!faction||!validTerritory)return 'Facção autenticada inválida';
  if(!dest||dest.enabled===false||dest.gate||!sectorValid)return 'Setor indisponível: cadastro não sincronizado';
  if(!admin&&level<required)return `Requer nível ${required}`;
  return 'Entrada não autorizada';
}
