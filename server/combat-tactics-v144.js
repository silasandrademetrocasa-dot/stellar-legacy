import {TACTICS_KEY,validateTacticsWrite,activeConfig} from '../public/modules/combat-tactics-v144.js';
export function prepareCombatTactics(stored,next){
 if(next.ownedDroneFormationsV144===undefined&&stored?.ownedDroneFormationsV144!==undefined)next.ownedDroneFormationsV144=structuredClone(stored.ownedDroneFormationsV144);
 if(next[TACTICS_KEY]==null&&stored?.[TACTICS_KEY])next[TACTICS_KEY]=structuredClone(stored[TACTICS_KEY]);
 const check=validateTacticsWrite(stored,next);if(!check.ok)return check;
 // Keep ammo selection in the existing fields; no inventory changes or second authority.
 if(next[TACTICS_KEY]){
  const profile=next[TACTICS_KEY].profiles[activeConfig(next)];
  // The existing ammo picker/autopilot may have changed the selection since the HUD was last edited.
  profile.laser=next.selectedLaserAmmo||profile.laser;profile.rocket=next.selectedRocket||profile.rocket;
 }
 return validateTacticsWrite(stored,next);
}
