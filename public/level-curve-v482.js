// Stellar Legacy V48.2 • Pilot XP curve. Pilot level is authoritative during migration.
// The V46 curve is used ONLY to map the player's progress on the first login after rollout.
import {xpThresholdV460} from './level-curve-v460.js';

export const PILOT_LEVEL_MAX_V482=44;
export const PILOT_XP_STEPS_V482=Object.freeze([
  10000,20000,40000,80000,160000,320000,640000,
  900000,1250000,1700000,2200000,2800000,3500000,
  4300000,5200000,6200000,7300000,8500000,9800000
]);
export function xpRequiredForNextLevelV482(level){
  const lv=Math.max(1,Math.min(PILOT_LEVEL_MAX_V482-1,Math.floor(Number(level)||1)));
  if(lv<=PILOT_XP_STEPS_V482.length)return PILOT_XP_STEPS_V482[lv-1];
  // 20->21 starts at 11.2m, growing smoothly ~11.5% for each later step.
  return Math.round(11200000*Math.pow(1.115,lv-20)/1000)*1000;
}
const xpTable=[0];
for(let level=1;level<PILOT_LEVEL_MAX_V482;level++){
  xpTable[level]=xpTable[level-1]+xpRequiredForNextLevelV482(level);
}
export const PILOT_XP_THRESHOLDS_V482=Object.freeze([...xpTable]);
export function xpThresholdV482(level){
  const lv=Math.max(1,Math.min(PILOT_LEVEL_MAX_V482,Math.floor(Number(level)||1)));
  return PILOT_XP_THRESHOLDS_V482[lv-1];
}
export function migratePilotXpV482(profile,maxLevel=PILOT_LEVEL_MAX_V482){
  if(!profile||profile.xpModelV482===true)return false;
  const lv=Math.max(1,Math.min(maxLevel,Math.floor(Number(profile.level)||1)));
  const current=Math.max(0,Math.floor(Number(profile.xp)||0));
  const oldBase=xpThresholdV460(lv),newBase=xpThresholdV482(lv);
  if(lv>=maxLevel){
    // Endgame players keep their level and proportional excess above LV44.
    const oldSpan=Math.max(1,oldBase-xpThresholdV460(maxLevel-1));
    const newSpan=Math.max(1,newBase-xpThresholdV482(maxLevel-1));
    profile.xp=newBase+Math.round(Math.max(0,current-oldBase)*newSpan/oldSpan);
  } else {
    const oldSpan=Math.max(1,xpThresholdV460(lv+1)-oldBase);
    const newSpan=Math.max(1,xpThresholdV482(lv+1)-newBase);
    const fraction=Math.max(0,Math.min(0.999999999,(current-oldBase)/oldSpan));
    profile.xp=Math.min(newBase+newSpan-1,Math.max(newBase,Math.round(newBase+fraction*newSpan)));
  }
  profile.level=lv;
  profile.xpModelV482=true;
  return true;
}
export function pilotXpProgressV482(level,xp){
  const lv=Math.max(1,Math.min(PILOT_LEVEL_MAX_V482,Math.floor(Number(level)||1)));
  const current=Math.max(0,Number(xp)||0);
  const base=xpThresholdV482(lv);
  if(lv>=PILOT_LEVEL_MAX_V482)return {level:lv,current,base,next:base,earned:0,needed:0,remaining:0,percent:100,maxed:true};
  const next=xpThresholdV482(lv+1),needed=next-base,earned=Math.max(0,Math.min(needed,current-base));
  return {level:lv,current,base,next,earned,needed,remaining:Math.max(0,next-current),percent:Math.round(100*earned/needed),maxed:false};
}
