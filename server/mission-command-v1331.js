import {commitEconomyUnifiedV1332} from './unified-command-v1332.js';
import {operationDigestV125} from './economy-receipts-v125.js';
import {ITEMS,LASER_AMMO,ROCKETS} from '../public/data.js';
export function missionCommandId(category,key){return 'mission_'+operationDigestV125('mission',{category,key});}
export function completeMissionStateV1331(before,{category,key,xpMultiplier=1,surprise=null,now=Date.now()}){
 const state=structuredClone(before),active=state.missions?.active?.[category];
 if(!['daily','weekly','monthly','special'].includes(category))throw Error('MISSION_CATEGORY_INVALID');
 if(state.missions?.completed?.[key])return {state,alreadyClaimed:true};
 if(!active||key!==`${category}:${active.period}:${active.id}`||!active.complete||!active.awaitingCloudAckV107)throw Error('MISSION_NOT_CONFIRMED');
 const tasks=active.definition?.tasks;
 if(!Array.isArray(tasks)||!tasks.length||!tasks.every(t=>Number.isFinite(Number(t.target))&&Number(t.target)>0&&Number(active.taskProgress?.[t.id])>=Number(t.target)))throw Error('MISSION_INCOMPLETE');
 const reward={};for(const k of ['credits','uridium','xp']){
  const value=Math.round(Number(active.bonus?.[k]||0))+(!active.flatRewardApplied?Number(active.definition?.flatReward?.[k]||0):0);
  if(!Number.isSafeInteger(value)||value<0||value>1e14)throw Error('MISSION_REWARD_INVALID');reward[k]=value;
 }
 reward.xp=Math.round(reward.xp*xpMultiplier);
 state.profile ||= {};for(const k of ['credits','uridium','xp'])state.profile[k]=Number(state.profile[k]||0)+reward[k];
 if(surprise){const field={ammo:'ammo',rocket:'rockets',inventory:'inventory'}[surprise.kind];if(!field||!({ammo:LASER_AMMO,rocket:ROCKETS,inventory:ITEMS}[surprise.kind]?.[surprise.id])||!Number.isSafeInteger(surprise.qty)||surprise.qty<1)throw Error('MISSION_GIFT_INVALID');state[field]||={};state[field][surprise.id]=Number(state[field][surprise.id]||0)+surprise.qty;}
 state.missions.completed||={};state.missions.completed[key]=now;state.missions.active[category]=null;
 state.titles||={};state.titles.stats||={};state.titles.stats.missions=Number(state.titles.stats.missions||0)+1;
 state.serverPurchaseRevision=Number(state.serverPurchaseRevision||0)+1;
 return {state,reward,surprise,mission:active.definition};
}
export function rollMissionGiftV1331(category,chance,rng=Math.random){
 if(rng()>=chance)return null;const r=rng(),pick=a=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];
 if(r<.55)return pick([{kind:'ammo',id:'mcb25',qty:10000},{kind:'ammo',id:'mcb50',qty:5000},{kind:'ammo',id:'ucb100',qty:2500},{kind:'ammo',id:'sab50',qty:3000},{kind:'rocket',id:'plt2021',qty:200},{kind:'rocket',id:'plt3030',qty:100}]);
 let pool=['lf1','mp1','lf2','sg3na02','sg3na03','fs01','fs02'];
 if(['monthly','special'].includes(category)){if(r>.96)pool=['lf4'];else if(r>.75)pool=['lf3','sg3nb02'];}else if(category==='weekly'&&r>.90)pool=['lf3','sg3nb02'];
 return {kind:'inventory',id:pick(pool),qty:1};
}
export async function claimMissionCommandV1331({db,userId,category,key,loadRules,readDesigns}){
 const id=missionCommandId(category,key),hash=operationDigestV125('mission',{category,key});let surprise;
 for(let attempt=0;attempt<3;attempt++){
  const [saved,receipt]=await Promise.all([db.from('game_saves').select('state,updated_at').eq('user_id',userId).single(),db.from('stellar_economy_receipts_v125').select('receipt').eq('user_id',userId).eq('request_id',id).maybeSingle()]);
  if(saved.error||receipt.error)throw Error('MISSION_STORAGE_UNAVAILABLE');
  if(receipt.data){const replay=await commitEconomyUnifiedV1332(db,{p_user_id:userId,p_request_id:id,p_operation:'economy:mission_claim',p_request_hash:hash,p_expected_updated_at:saved.data.updated_at,p_state:saved.data.state,p_callsign:saved.data.state.profile?.callsign,p_receipt:receipt.data.receipt});if(replay.error||!replay.data?.ok)throw Error(replay.error?.message||replay.data?.code||'MISSION_REPLAY_UNAVAILABLE');return replay.data;}
  const active=saved.data.state.missions?.active?.[category];
  const rules=await loadRules(),rule=rules.mission_categories?.find(r=>r.category===category),cfg=rule?.config||{};
  const chance=category==='daily'&&active?.definition?.group==='ore'?Number(cfg.ore_item_chance??1):Number(rule?.item_chance??({daily:.55,weekly:.60,monthly:.78,special:.88}[category]||0));
  if(surprise===undefined)surprise=rollMissionGiftV1331(category,Math.max(0,Math.min(1,chance)));
  const designs=await readDesigns();const ship=designs?.catalog?.find(d=>d.design_id===designs.loadout?.ship&&d.eligibility?.ship_id===saved.data.state.activeShipId),pet=designs?.catalog?.find(d=>d.design_id===designs.loadout?.pet&&saved.data.state.pet?.owned);
  const command=completeMissionStateV1331(saved.data.state,{category,key,surprise,xpMultiplier:1+Number(ship?.bonuses?.xp||0)+Number(pet?.bonuses?.xp||0)});
  if(command.alreadyClaimed)return {ok:true,replayed:true,state:command.state};
  const info={key,category,reward:command.reward,surprise:command.surprise};
  const {data,error}=await commitEconomyUnifiedV1332(db,{p_user_id:userId,p_request_id:id,p_operation:'economy:mission_claim',p_request_hash:hash,p_expected_updated_at:saved.data.updated_at,p_state:command.state,p_callsign:command.state.profile.callsign,p_receipt:info});
  if(error)throw Error(error.message);if(data?.ok)return data;
  if(data?.code!=='ECONOMY_STALE')throw Error(data?.code||'MISSION_NOT_CONFIRMED');
 }
 throw Error('MISSION_BUSY_RETRY');
}
