/* V117.2: defer only routine PUTs during dense server-confirmed NPC rewards.
 * Critical user actions still use the original forced save coordinator.
 * The local checkpoint is never skipped and the server remains authoritative.
 */
export const COMBAT_CLOUD_SAVE_MAX_AGE_V1172 = 45000;
export const COMBAT_REWARD_QUIET_MS_V1172 = 2200;
export const COMBAT_RECENT_WINDOW_V1172 = 10000;
export const COMBAT_CLOUD_SAVE_MIN_INTERVAL_V1172 = 18000;
export function shouldSendPeriodicCloudSaveV1172({now=0,lastNpcRewardAt=0,lastAttemptAt=0,criticalPending=false,maxAgeMs=COMBAT_CLOUD_SAVE_MAX_AGE_V1172}={}){
  if(criticalPending)return true;
  if(!(Number.isFinite(now)&&now>0))return true;
  // Outside combat, retain the existing 7-second interval. Active combat
  // uses a minimum interval even if one short opening between kills appears.
  if(lastNpcRewardAt<=0||now-lastNpcRewardAt>=COMBAT_RECENT_WINDOW_V1172)return true;
  if(!Number.isFinite(lastAttemptAt)||lastAttemptAt<=0)return true;
  const elapsed=now-lastAttemptAt;
  if(elapsed<COMBAT_CLOUD_SAVE_MIN_INTERVAL_V1172)return false;
  if(now-lastNpcRewardAt>=COMBAT_REWARD_QUIET_MS_V1172)return true;
  return elapsed>=Math.max(COMBAT_CLOUD_SAVE_MIN_INTERVAL_V1172,Number(maxAgeMs)||COMBAT_CLOUD_SAVE_MAX_AGE_V1172);
}
