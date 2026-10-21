// V36 • server-only domain validations, public-safe clan aggregates.
export const DOMINION_RULE_LIMITS=Object.freeze({
 regen_hp_tick:[0,50000],regen_shield_tick:[0,50000],regen_idle_seconds:[30,3600],
 daily_credits_per_relay:[0,100000],daily_credits_cap:[0,900000],
 weekly_war_actions:[1,100],weekly_credits:[0,500000],war_reward_credits:[0,300000],
 war_hours:[1,72],war_cooldown_hours:[1,168]
});
export const UUID_V360=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function safeDominionRules(input={}){
 const changed={};
 for(const [key,[min,max]] of Object.entries(DOMINION_RULE_LIMITS)){
  if(input[key]===undefined)continue;
  if(!Number.isSafeInteger(input[key])||input[key]<min||input[key]>max)throw new Error(`Parâmetro de guerra inválido: ${key}`);
  changed[key]=input[key];
 }
 if(input.enabled!==undefined){if(typeof input.enabled!=='boolean')throw new Error('Estado da guerra inválido.');changed.enabled=input.enabled;}
 if(!Object.keys(changed).length)throw new Error('Nenhuma configuração alterada.');
 return changed;
}
export function brazilWarWeekStart(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const midday=Date.UTC(parts.year,parts.month-1,parts.day,12); // local calendar arithmetic, not a server locale dependency
 const monday=new Date(midday-((new Date(midday).getUTCDay()+6)%7)*86400000);
 return monday.toISOString().slice(0,10);
}
export function domWeeklyScore(actions=[],clanId='',now=new Date()){
 const start=brazilWarWeekStart(now),startTime=Date.parse(start+'T03:00:00.000Z');
 const weekly=(actions||[]).filter(a=>a.clan_id===clanId&&Date.parse(a.occurred_at)>=startTime);
 return {week:start,captures:weekly.filter(a=>a.kind==='capture').length,
  defenses:weekly.filter(a=>a.kind==='defense').length};
}
export function domLeaderboard(states=[],actions=[],clans=[]){
 const byId=new Map((clans||[]).map(c=>[String(c.id),c]));
 const scores=new Map();
 const ensure=id=>{
  if(!id)return null;const key=String(id);const c=byId.get(key);if(!c)return null;
  if(!scores.has(key))scores.set(key,{clanId:key,tag:c.tag||'CLÃ',name:c.name||'Clã',relays:0,captures:0,defenses:0,score:0});
  return scores.get(key);
 };
 for(const state of states||[]){const row=ensure(state.owner_clan_id);if(row&&Number(state.hp)>0)row.relays++;}
 for(const action of actions||[]){const row=ensure(action.clan_id);if(!row)continue;
  if(action.kind==='capture')row.captures++;
  else if(action.kind==='defense')row.defenses++;
 }
 for(const v of scores.values())v.score=v.relays*10+v.captures*5+v.defenses*2;
 return [...scores.values()].sort((a,b)=>b.score-a.score||a.tag.localeCompare(b.tag)).slice(0,20);
}
export function domRuleSummary(rules){return {
 enabled:rules?.enabled===true,regenHpTick:Number(rules?.regen_hp_tick)||0,
 regenShieldTick:Number(rules?.regen_shield_tick)||0,regenIdleSeconds:Number(rules?.regen_idle_seconds)||60,
 dailyPerNode:Number(rules?.daily_credits_per_relay)||0,dailyCap:Number(rules?.daily_credits_cap)||0,
 weeklyTarget:Number(rules?.weekly_war_actions)||3,weeklyCredits:Number(rules?.weekly_credits)||0,warRewardCredits:Number(rules?.war_reward_credits)||0,
 warHours:Number(rules?.war_hours)||24,warCooldownHours:Number(rules?.war_cooldown_hours)||24
};}
