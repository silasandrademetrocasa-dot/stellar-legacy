// Stellar Legacy V46.0 — accumulated, accessible pilot XP curve.
// The previous V19.15 thresholds remain the migration source. No account is reset.
import {xpThresholdV1915} from './level-curve-v1915.js';
export const GALACTIC_XP_ANCHORS_V460=Object.freeze([
 {level:1,xp:0},{level:2,xp:12000},{level:5,xp:420000},{level:7,xp:1400000},
 {level:10,xp:4500000},{level:15,xp:11500000},{level:18,xp:20000000},
 {level:22,xp:39000000},{level:27,xp:85000000},{level:32,xp:155000000}
].map(p=>Object.freeze(p)));
// Piecewise interpolation follows existing V19.15 XP shape inside each segment;
// anchors are monotonic and continuous. LV33..44 remain an increasingly costly endgame.
export function xpThresholdV460(level){
 const lv=Math.max(1,Math.min(44,Math.floor(Number(level)||1)));
 if(lv===1)return 0;
 const points=GALACTIC_XP_ANCHORS_V460;
 for(let i=1;i<points.length;i++){
  const low=points[i-1],high=points[i];if(lv>high.level)continue;
  const oldBase=xpThresholdV1915(low.level),oldTop=xpThresholdV1915(high.level);
  const t=Math.max(0,Math.min(1,(xpThresholdV1915(lv)-oldBase)/Math.max(1,oldTop-oldBase)));
  return Math.round(low.xp+(high.xp-low.xp)*t);
 }
 const oldAt32=xpThresholdV1915(32);
 return Math.round(points.at(-1).xp*xpThresholdV1915(lv)/Math.max(1,oldAt32));
}
// One-time migration retains the pilot's level AND relative progress into next
// level, including veterans above L32. Does not grant cash, items or level prizes.
export function migratePilotXpV460(profile,maxLevel=44){
 if(!profile||profile.xpModelV460===true)return false;
 const level=Math.max(1,Math.min(maxLevel,Math.floor(Number(profile.level)||1)));
 const legacyXP=Math.max(0,Number(profile.xp)||0);
 const oldBase=xpThresholdV1915(level),newBase=xpThresholdV460(level);
 if(level>=maxLevel){
  const excess=Math.max(0,legacyXP-oldBase);
  const oldPrev=xpThresholdV1915(maxLevel-1),newPrev=xpThresholdV460(maxLevel-1);
  const scale=Math.max(0.001,(newBase-newPrev)/Math.max(1,oldBase-oldPrev));
  profile.xp=newBase+Math.round(excess*scale);
 }else{
  const oldNext=xpThresholdV1915(level+1),newNext=xpThresholdV460(level+1);
  const relative=Math.max(0,Math.min(.999999999,(legacyXP-oldBase)/Math.max(1,oldNext-oldBase)));
  profile.xp=Math.min(newNext-1,Math.max(newBase,Math.round(newBase+relative*(newNext-newBase))));
 }
 profile.level=level;profile.xpModelV460=true;return true;
}
